import { NextResponse } from "next/server";
import { posPool } from "@/lib/db";

async function ensureProductsTable() {
  await posPool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  await posPool.query(`CREATE TABLE IF NOT EXISTS pos_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    sku VARCHAR(80) NOT NULL UNIQUE,
    upc VARCHAR(80),
    category VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(120),
    imei VARCHAR(80),
    serial VARCHAR(80),
    supplier VARCHAR(120),
    valuation_method VARCHAR(80) NOT NULL DEFAULT 'WAC',
    condition VARCHAR(50) NOT NULL DEFAULT 'New',
    image_url TEXT,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    stock_warning INTEGER NOT NULL DEFAULT 0 CHECK (stock_warning >= 0),
    in_purchase_order INTEGER NOT NULL DEFAULT 0 CHECK (in_purchase_order >= 0),
    retail_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  // Backfill columns for older tables + new "Add New Item" fields
  await posPool.query(`
    ALTER TABLE pos_products
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS stock_warning INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS in_purchase_order INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS item_type VARCHAR(30) NOT NULL DEFAULT 'non-serialized',
      ADD COLUMN IF NOT EXISTS commission BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS display_on_pos BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS manage_inventory BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS tax_class VARCHAR(50) DEFAULT 'gst',
      ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS mark_up NUMERIC(6,3) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS promo_date VARCHAR(120),
      ADD COLUMN IF NOT EXISTS minimum_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS internal_notes TEXT
  `);

  await posPool.query(`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await posPool.query(`DROP TRIGGER IF EXISTS set_timestamp ON pos_products`);

  await posPool.query(`
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON pos_products
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp()
  `);
}

const ALLOWED_SORT_COLUMNS = [
  "id",
  "name",
  "category",
  "quantity",
  "reorder_level",
  "stock_warning",
  "retail_price",
  "cost_price",
  "in_purchase_order",
];

export async function GET(request: Request) {
  try {
    await ensureProductsTable();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const brand = searchParams.get("brand")?.trim() || "";
    const model = searchParams.get("model")?.trim() || "";
    const sku = searchParams.get("sku")?.trim() || "";
    const imei = searchParams.get("imei")?.trim() || "";
    const serial = searchParams.get("serial")?.trim() || "";
    const supplier = searchParams.get("supplier")?.trim() || "";
    const valuationMethod = searchParams.get("valuationMethod")?.trim() || "";
    const criteria = searchParams.get("criteria")?.trim() || "";
    const hideOutOfStock = searchParams.get("hideOutOfStock") === "1";
    const sortByRaw = searchParams.get("sortBy") || "id";
    const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";
    const sortBy = ALLOWED_SORT_COLUMNS.includes(sortByRaw) ? sortByRaw : "id";

    const values: Array<string | number | boolean | Date | null> = [];
    let i = 1;
    const conditions: string[] = [];

    if (id) {
      conditions.push(`id = $${i++}`);
      values.push(Number(id));
    }
    if (search) {
      conditions.push(`(
        name ILIKE '%' || $${i} || '%'
        OR sku ILIKE '%' || $${i} || '%'
        OR COALESCE(upc,'') ILIKE '%' || $${i} || '%'
      )`);
      values.push(search);
      i++;
    }
    if (category) {
      conditions.push(`category = $${i++}`);
      values.push(category);
    }
    if (brand) {
      conditions.push(`brand = $${i++}`);
      values.push(brand);
    }
    if (model) {
      conditions.push(`model = $${i++}`);
      values.push(model);
    }
    if (sku) {
      conditions.push(`(
        sku ILIKE '%' || $${i} || '%'
        OR COALESCE(upc,'') ILIKE '%' || $${i} || '%'
      )`);
      values.push(sku);
      i++;
    }
    if (imei) {
      conditions.push(`imei = $${i++}`);
      values.push(imei);
    }
    if (serial) {
      conditions.push(`serial = $${i++}`);
      values.push(serial);
    }
    if (supplier) {
      conditions.push(`supplier = $${i++}`);
      values.push(supplier);
    }
    if (valuationMethod) {
      conditions.push(`valuation_method = $${i++}`);
      values.push(valuationMethod);
    }
    if (criteria === "In stock") conditions.push(`quantity > 0`);
    else if (criteria === "Low stock")
      conditions.push(`quantity <= reorder_level AND quantity > 0`);
    else if (criteria === "Out of stock") conditions.push(`quantity = 0`);

    if (hideOutOfStock) conditions.push(`quantity > 0`);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const productsQuery = `
      SELECT id, name, sku, upc, category, brand, model, imei, serial,
             supplier, valuation_method, condition, image_url,
             short_description, item_type, commission, display_on_pos,
             manage_inventory, tax_class, tax_inclusive, quantity,
             stock_warning, in_purchase_order, retail_price, cost_price,
             mark_up, promo_price, promo_date, minimum_price,
             reorder_level, internal_notes, created_at, updated_at
      FROM pos_products
      ${where}
      ORDER BY ${sortBy} ${sortDir}
    `;

    const totalsQuery = `
      SELECT
        COALESCE(SUM(quantity),0)::int AS units,
        COALESCE(SUM(quantity * retail_price),0) AS retail_value,
        COALESCE(SUM(quantity * cost_price),0) AS cost_value,
        COALESCE(SUM(CASE WHEN quantity <= reorder_level THEN 1 ELSE 0 END),0)::int AS low_stock,
        COALESCE(SUM(in_purchase_order),0)::int AS in_purchase_order
      FROM pos_products
      ${where}
    `;

    const [products, totals] = await Promise.all([
      posPool.query(productsQuery, values),
      posPool.query(totalsQuery, values),
    ]);

    return NextResponse.json({
      products: products.rows,
      totals: totals.rows[0],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not load products." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureProductsTable();
    const body = await request.json();

    if (
      ["name", "sku", "category"].some(
        (key) => !String(body[key] || "").trim(),
      )
    )
      return NextResponse.json(
        { message: "Name, SKU and category are required." },
        { status: 400 },
      );

    const quantity = Number(body.quantity || 0),
      retailPrice = Number(body.retailPrice || 0),
      costPrice = Number(body.costPrice || 0),
      reorderLevel = Number(body.reorderLevel || 0),
      stockWarning = Number(body.stockWarning || 0),
      inPurchaseOrder = Number(body.inPurchaseOrder || 0),
      markUp = Number(body.markUp || 0),
      promoPrice = Number(body.promoPrice || 0),
      minimumPrice = Number(body.minimumPrice || 0);

    if (
      ![
        quantity,
        retailPrice,
        costPrice,
        reorderLevel,
        stockWarning,
        inPurchaseOrder,
        markUp,
        promoPrice,
        minimumPrice,
      ].every(Number.isFinite) ||
      quantity < 0 ||
      retailPrice < 0 ||
      costPrice < 0 ||
      reorderLevel < 0 ||
      stockWarning < 0 ||
      inPurchaseOrder < 0
    )
      return NextResponse.json(
        { message: "Enter valid inventory values." },
        { status: 400 },
      );

    const commission = body.commission === true || body.commission === "true";
    const displayOnPos =
      body.displayOnPos === undefined
        ? true
        : body.displayOnPos === true || body.displayOnPos === "true";
    const manageInventory =
      body.manageInventory === undefined
        ? true
        : body.manageInventory === true || body.manageInventory === "true";
    const taxInclusive =
      body.taxInclusive === undefined
        ? true
        : body.taxInclusive === true || body.taxInclusive === "true";

    const result = await posPool.query(
      `INSERT INTO pos_products
        (name, sku, upc, category, brand, model, imei, serial, supplier,
         valuation_method, condition, image_url, short_description,
         item_type, commission, display_on_pos, manage_inventory,
         tax_class, tax_inclusive, quantity, stock_warning,
         in_purchase_order, retail_price, cost_price, mark_up,
         promo_price, promo_date, minimum_price, reorder_level,
         internal_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
               $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
       RETURNING *`,
      [
        body.name.trim(),
        body.sku.trim(),
        body.upc?.trim() || null,
        body.category,
        body.brand?.trim() || null,
        body.model?.trim() || null,
        body.imei?.trim() || null,
        body.serial?.trim() || null,
        body.supplier?.trim() || null,
        body.valuationMethod?.trim() || "WAC",
        body.condition || "New",
        body.imageUrl?.trim() || null,
        body.shortDescription?.trim() || null,
        body.itemType?.trim() || "non-serialized",
        commission,
        displayOnPos,
        manageInventory,
        body.taxClass?.trim() || "gst",
        taxInclusive,
        quantity,
        stockWarning,
        inPurchaseOrder,
        retailPrice,
        costPrice,
        markUp,
        promoPrice,
        body.promoDate?.trim() || null,
        minimumPrice,
        reorderLevel,
        body.internalNotes?.trim() || null,
      ],
    );

    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json(
        { message: "This SKU already exists." },
        { status: 409 },
      );
    console.error(error);
    return NextResponse.json(
      { message: "Could not create product." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureProductsTable();
    const body = await request.json();
    const { id, ...fields } = body;

    if (!id)
      return NextResponse.json({ message: "ID required" }, { status: 400 });

    const allowedFields = [
      "name",
      "sku",
      "upc",
      "category",
      "brand",
      "model",
      "imei",
      "serial",
      "supplier",
      "valuation_method",
      "condition",
      "image_url",
      "short_description",
      "item_type",
      "commission",
      "display_on_pos",
      "manage_inventory",
      "tax_class",
      "tax_inclusive",
      "quantity",
      "stock_warning",
      "in_purchase_order",
      "retail_price",
      "cost_price",
      "mark_up",
      "promo_price",
      "promo_date",
      "minimum_price",
      "reorder_level",
      "internal_notes",
    ];

    const setClauses: string[] = [];
    const values: Array<string | number | boolean | Date | null> = [];
    let i = 1;

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        setClauses.push(`${key} = $${i++}`);
        values.push(fields[key]);
      }
    }

    if (!setClauses.length)
      return NextResponse.json(
        { message: "No fields to update." },
        { status: 400 },
      );

    values.push(id);

    const result = await posPool.query(
      `UPDATE pos_products SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );

    if (!result.rows.length)
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 },
      );

    return NextResponse.json({ product: result.rows[0] });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "23505")
      return NextResponse.json(
        { message: "This SKU already exists." },
        { status: 409 },
      );
    console.error(error);
    return NextResponse.json(
      { message: "Could not update product." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ message: "ID required" }, { status: 400 });

    const result = await posPool.query(
      `DELETE FROM pos_products WHERE id = $1 RETURNING id`,
      [id],
    );

    if (!result.rows.length)
      return NextResponse.json(
        { message: "Product not found." },
        { status: 404 },
      );

    return NextResponse.json({ message: "Deleted", id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not delete product." },
      { status: 503 },
    );
  }
}