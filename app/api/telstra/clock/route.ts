import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.store,
        MAX(c.occurred_at) FILTER (WHERE c.event_type = 'clock_in') AS clocked_in_at,
        (ARRAY_AGG(c.event_type ORDER BY c.occurred_at DESC))[1] AS last_event
      FROM staff_users s
      LEFT JOIN clock_events c ON c.staff_user_id = s.id AND c.occurred_at::date = CURRENT_DATE
      WHERE s.is_active = TRUE AND s.role = 'sales'
      GROUP BY s.id, s.name, s.store ORDER BY s.name`);
    return NextResponse.json({
      staff: result.rows.map((row) => ({
        ...row,
        clocked_in_at: row.last_event === "clock_in" ? row.clocked_in_at : null,
      })),
    });
  } catch {
    return NextResponse.json(
      { message: "Clock status is unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Please sign in again." },
      { status: 401 },
    );
  try {
    const { pin, action } = await request.json();
    if (typeof pin !== "string" || !["clock_in", "clock_out"].includes(action))
      return NextResponse.json(
        { message: "A valid PIN and clock action are required." },
        { status: 400 },
      );
    const verified = await pool.query(
      "SELECT pin FROM staff_users WHERE id = $1 AND is_active = TRUE",
      [user.id],
    );
    if (!verified.rows[0] || verified.rows[0].pin !== pin)
      return NextResponse.json(
        { message: "That PIN does not match your profile." },
        { status: 401 },
      );
    const last = await pool.query(
      "SELECT event_type FROM clock_events WHERE staff_user_id = $1 AND occurred_at::date = CURRENT_DATE ORDER BY occurred_at DESC LIMIT 1",
      [user.id],
    );
    const expected =
      last.rows[0]?.event_type === "clock_in" ? "clock_out" : "clock_in";
    if (action !== expected)
      return NextResponse.json(
        {
          message:
            action === "clock_in"
              ? "You are already clocked in."
              : "You are already clocked out.",
        },
        { status: 409 },
      );
    const saved = await pool.query(
      "INSERT INTO clock_events (staff_user_id, event_type) VALUES ($1, $2) RETURNING occurred_at",
      [user.id, action],
    );
    return NextResponse.json({ event: saved.rows[0] });
  } catch {
    return NextResponse.json(
      { message: "Clock event could not be saved." },
      { status: 503 },
    );
  }
}
