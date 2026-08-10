import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM sales_entry ORDER BY sale_date DESC, id DESC LIMIT 250",
    );
    return NextResponse.json({ sales: result.rows });
  } catch {
    return NextResponse.json({ sales: [] }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (
      !Number.isInteger(id) ||
      ![
        "Submitted",
        "In Progress",
        "Activated",
        "Paid",
        "Pending",
        "Verified",
        "Cancelled",
      ].includes(status)
    ) {
      return NextResponse.json(
        { message: "Invalid order update." },
        { status: 400 },
      );
    }
    const result = await pool.query(
      "UPDATE sales_entry SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );
    if (!result.rows[0])
      return NextResponse.json(
        { message: "Sale was not found." },
        { status: 404 },
      );
    return NextResponse.json({ sale: result.rows[0] });
  } catch {
    return NextResponse.json(
      { message: "Could not update the order." },
      { status: 503 },
    );
  }
}
