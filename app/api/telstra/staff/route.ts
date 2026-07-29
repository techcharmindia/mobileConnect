import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT id, name, role, store FROM staff_users WHERE is_active = TRUE ORDER BY name",
    );
    return NextResponse.json({ staff: result.rows });
  } catch {
    return NextResponse.json(
      { staff: [], message: "Staff database is unavailable." },
      { status: 503 },
    );
  }
}
