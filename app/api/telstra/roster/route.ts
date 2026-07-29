import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`SELECT r.id, r.shift_date, r.shift_label, s.name, s.store FROM roster_shifts r JOIN staff_users s ON s.id = r.staff_user_id WHERE r.shift_date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY r.shift_date, s.name`);
    return NextResponse.json({ shifts: result.rows });
  } catch { return NextResponse.json({ shifts: [] }, { status: 503 }); }
}
