import { NextResponse } from "next/server";
import { telstraPool } from "@/lib/db";

export async function GET() {
  try {
    const result = await telstraPool.query(
      "SELECT id, name, sku, store, quantity, low_stock_threshold FROM inventory_items ORDER BY quantity ASC, name ASC",
    );
    return NextResponse.json({ stock: result.rows });
  } catch {
    return NextResponse.json({ stock: [] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, sku, store, quantity, lowStockThreshold } = await request.json();
    if (!name || !sku || !store || !Number.isInteger(quantity) || !Number.isInteger(lowStockThreshold) || quantity < 0 || lowStockThreshold < 0) {
      return NextResponse.json({ message: "Invalid stock item." }, { status: 400 });
    }
    const result = await telstraPool.query(
      `INSERT INTO inventory_items (name, sku, store, quantity, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, store = EXCLUDED.store, quantity = EXCLUDED.quantity, low_stock_threshold = EXCLUDED.low_stock_threshold, updated_at = NOW()
       RETURNING id, name, sku, store, quantity, low_stock_threshold`,
      [name, sku, store, quantity, lowStockThreshold],
    );
    return NextResponse.json({ stock: result.rows[0] });
  } catch {
    return NextResponse.json({ message: "Could not save stock." }, { status: 503 });
  }
}
