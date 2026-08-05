import { NextResponse } from "next/server";
import pool from "@/lib/db";

async function ensureMiscTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS miscellaneous_items (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL DEFAULT 'Miscellaneous',
    name VARCHAR(180) NOT NULL,
    description TEXT,
    is_barcode BOOLEAN NOT NULL DEFAULT false,
    commission BOOLEAN NOT NULL DEFAULT false,
    on_pos BOOLEAN NOT NULL DEFAULT true,
    retail_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    tax_class VARCHAR(50) NOT NULL DEFAULT 'gst',
    tax_inclusive BOOLEAN NOT NULL DEFAULT true,
    image TEXT,
    bulk_discount BOOLEAN NOT NULL DEFAULT false,
    percentage NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
    percentage_calc VARCHAR(30) NOT NULL DEFAULT 'Before Tax',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await pool.query(`
    ALTER TABLE miscellaneous_items
      ADD COLUMN IF NOT EXISTS percentage NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
      ADD COLUMN IF NOT EXISTS percentage_calc VARCHAR(30) NOT NULL DEFAULT 'Before Tax'
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(
    `DROP TRIGGER IF EXISTS set_timestamp_misc ON miscellaneous_items`,
  );

  await pool.query(`
    CREATE TRIGGER set_timestamp_misc
    BEFORE UPDATE ON miscellaneous_items
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp()
  `);
}

const ALLOWED_SORT_COLUMNS = [
  "id",
  "name",
  "retail_price",
  "cost_price",
  "created_at",
];

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

function toBool(value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

export async function GET(request: Request) {
  try {
    await ensureMiscTable();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id")?.trim() || "";
    const name = searchParams.get("name")?.trim() || "";
    const fromDate = searchParams.get("fromDate")?.trim() || "";
    const toDate = searchParams.get("toDate")?.trim() || "";
    const exportAll = searchParams.get("exportAll") === "1";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 25)));
    const sortByRaw = searchParams.get("sortBy") || "id";
    const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";
    const sortBy = ALLOWED_SORT_COLUMNS.includes(sortByRaw)
      ? sortByRaw
      : "id";

    const values: Array<string | number | boolean | Date | null> = [];
    let i = 1;
    const conditions: string[] = [];

    if (id) {
      conditions.push(`id = $${i++}`);
      values.push(Number(id));
    }
    if (name) {
      conditions.push(`name ILIKE '%' || $${i} || '%'`);
      values.push(name);
      i++;
    }
    if (fromDate) {
      conditions.push(`created_at >= $${i++}::timestamptz`);
      values.push(fromDate);
    }
    if (toDate) {
      conditions.push(`created_at < ($${i++}::timestamptz + INTERVAL '1 day')`);
      values.push(toDate);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*)::int AS total FROM miscellaneous_items ${where}`;
    const rowsQuery = `
      SELECT id, type, name, description, is_barcode, commission, on_pos,
             retail_price, cost_price, tax_class, tax_inclusive, image,
             bulk_discount, percentage, percentage_calc, created_at, updated_at
      FROM miscellaneous_items
      ${where}
      ORDER BY ${sortBy} ${sortDir}
      ${exportAll ? "" : `LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`}
    `;

    const [count, rows] = await Promise.all([
      pool.query(countQuery, values),
      pool.query(rowsQuery, values),
    ]);

    return NextResponse.json({
      items: rows.rows,
      total: count.rows[0].total,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not load miscellaneous items." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureMiscTable();
    const body = await request.json();

    const name = String(body.name || "").trim();
    if (!name)
      return NextResponse.json(
        { message: "Item name is required." },
        { status: 400 },
      );

    const retailPrice = Number(body.retailPrice || 0);
    const costPrice = Number(body.costPrice || 0);
    const percentage = Number(body.percentage || 0);

    if (
      !Number.isFinite(retailPrice) ||
      !Number.isFinite(costPrice) ||
      retailPrice < 0 ||
      costPrice < 0
    )
      return NextResponse.json(
        { message: "Enter valid price values." },
        { status: 400 },
      );

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    )
      return NextResponse.json(
        { message: "Enter a valid percentage between 0 and 100." },
        { status: 400 },
      );

    const image = String(body.image || "");
    if (image && image.length > MAX_IMAGE_SIZE)
      return NextResponse.json(
        { message: "Image is too large. Maximum size is 2MB." },
        { status: 400 },
      );

    const result = await pool.query(
      `INSERT INTO miscellaneous_items
        (type, name, description, is_barcode, commission, on_pos,
         retail_price, cost_price, tax_class, tax_inclusive, image,
         bulk_discount, percentage, percentage_calc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        String(body.type || "Miscellaneous").trim(),
        name,
        String(body.description || "").trim() || null,
        toBool(body.isBarcode, false),
        toBool(body.commission, false),
        toBool(body.onPos, true),
        retailPrice,
        costPrice,
        String(body.taxClass || "gst").trim(),
        toBool(body.taxInclusive, true),
        image || null,
        toBool(body.bulkDiscount, false),
        percentage,
        String(body.percentageCalc || "Before Tax").trim(),
      ],
    );

    return NextResponse.json({ item: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not create item." },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await ensureMiscTable();
    const body = await request.json();
    const { id } = body;

    if (!id)
      return NextResponse.json({ message: "ID required" }, { status: 400 });

    const allowedFields = [
      "type",
      "name",
      "description",
      "is_barcode",
      "commission",
      "on_pos",
      "retail_price",
      "cost_price",
      "tax_class",
      "tax_inclusive",
      "image",
      "bulk_discount",
      "percentage",
      "percentage_calc",
    ];

    const booleanFields = new Set([
      "is_barcode",
      "commission",
      "on_pos",
      "tax_inclusive",
      "bulk_discount",
    ]);

    const camelToSnake = (key: string) =>
      key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

    const setClauses: string[] = [];
    const values: Array<string | number | boolean | Date | null> = [];
    let i = 1;

    for (const [key, value] of Object.entries(body)) {
      if (key === "id") continue;
      const snake = camelToSnake(key);
      if (!allowedFields.includes(snake)) continue;

      if (booleanFields.has(snake)) {
        setClauses.push(`${snake} = $${i++}`);
        values.push(toBool(value, false));
      } else {
        setClauses.push(`${snake} = $${i++}`);
        values.push(value as string | number | boolean | Date | null);
      }
    }

    if (!setClauses.length)
      return NextResponse.json(
        { message: "No fields to update." },
        { status: 400 },
      );

    values.push(id);

    const result = await pool.query(
      `UPDATE miscellaneous_items SET ${setClauses.join(", ")} WHERE id = $${i} RETURNING *`,
      values,
    );

    if (!result.rows.length)
      return NextResponse.json(
        { message: "Item not found." },
        { status: 404 },
      );

    return NextResponse.json({ item: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not update item." },
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

    const result = await pool.query(
      `DELETE FROM miscellaneous_items WHERE id = $1 RETURNING id`,
      [id],
    );

    if (!result.rows.length)
      return NextResponse.json(
        { message: "Item not found." },
        { status: 404 },
      );

    return NextResponse.json({ message: "Deleted", id: result.rows[0].id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Could not delete item." },
      { status: 503 },
    );
  }
}
