import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const isDate = (value: unknown) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Please sign in again." },
      { status: 401 },
    );
  try {
    const weekStart = new URL(request.url).searchParams.get("weekStart");
    const requestedWeek = isDate(weekStart) ? weekStart : null;
    const week = await pool.query(
      `SELECT id, week_start, status, published_at FROM roster_weeks
       WHERE week_start = COALESCE($1::date, date_trunc('week', CURRENT_DATE)::date) LIMIT 1`,
      [requestedWeek],
    );
    const rosterWeek = week.rows[0];
    const staff = await pool.query(
      "SELECT id, name, store FROM staff_users WHERE is_active = TRUE AND role = 'sales' ORDER BY name",
    );
    if (!rosterWeek)
      return NextResponse.json({
        weekStart: requestedWeek,
        status: "published",
        publishedAt: null,
        staff: staff.rows,
        shifts: [],
      });
    const source =
      user.role === "admin"
        ? "roster_week_shifts"
        : "published_roster_week_shifts";
    const shifts = await pool.query(
      `SELECT staff_user_id, shift_date, shift_label FROM ${source}
       WHERE roster_week_id = $1 ORDER BY shift_date, staff_user_id`,
      [rosterWeek.id],
    );
    return NextResponse.json({
      weekStart: rosterWeek.week_start,
      status: user.role === "admin" ? rosterWeek.status : "published",
      publishedAt: rosterWeek.published_at,
      staff: staff.rows,
      shifts: shifts.rows,
      canManage: user.role === "admin",
    });
  } catch {
    return NextResponse.json(
      { message: "Roster data is unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin")
    return NextResponse.json(
      { message: "Only an admin can change roster settings." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    if (body.action === "assign_store") {
      if (
        !Number.isInteger(body.staffUserId) ||
        typeof body.store !== "string" ||
        !body.store.trim()
      )
        return NextResponse.json(
          { message: "Choose a staff member and store." },
          { status: 400 },
        );
      await pool.query(
        "UPDATE staff_users SET store = $1 WHERE id = $2 AND is_active = TRUE AND role = 'sales'",
        [body.store.trim(), body.staffUserId],
      );
      return NextResponse.json({ ok: true });
    }
    if (body.action === "save_shift") {
      if (
        !Number.isInteger(body.staffUserId) ||
        !isDate(body.weekStart) ||
        !isDate(body.shiftDate) ||
        typeof body.shiftLabel !== "string" ||
        !body.shiftLabel.trim()
      )
        return NextResponse.json(
          { message: "A staff member, date and shift are required." },
          { status: 400 },
        );
      const week = await pool.query(
        `INSERT INTO roster_weeks (week_start, status) VALUES ($1, 'draft') ON CONFLICT (week_start) DO UPDATE SET status = CASE WHEN roster_weeks.status = 'published' THEN 'draft' ELSE roster_weeks.status END RETURNING id`,
        [body.weekStart],
      );
      await pool.query(
        `INSERT INTO roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
        VALUES ($1, $2, $3, $4) ON CONFLICT (roster_week_id, staff_user_id, shift_date)
        DO UPDATE SET shift_label = EXCLUDED.shift_label`,
        [
          week.rows[0].id,
          body.staffUserId,
          body.shiftDate,
          body.shiftLabel.trim(),
        ],
      );
      return NextResponse.json({ ok: true });
    }
    if (body.action === "publish") {
      if (!isDate(body.weekStart))
        return NextResponse.json(
          { message: "A valid roster week is required." },
          { status: 400 },
        );
      const client = await pool.connect();
      let week;
      try {
        await client.query("BEGIN");
        week = await client.query(
          `UPDATE roster_weeks SET status = 'published', published_at = NOW(), published_by = $2 WHERE week_start = $1 RETURNING id, published_at`,
          [body.weekStart, user.id],
        );
        if (!week.rows[0]) throw new Error("missing_week");
        await client.query(
          "DELETE FROM published_roster_week_shifts WHERE roster_week_id = $1",
          [week.rows[0].id],
        );
        await client.query(
          `INSERT INTO published_roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
          SELECT roster_week_id, staff_user_id, shift_date, shift_label FROM roster_week_shifts WHERE roster_week_id = $1`,
          [week.rows[0].id],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return NextResponse.json({
        ok: true,
        publishedAt: week.rows[0].published_at,
      });
    }
    return NextResponse.json(
      { message: "Unknown roster action." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json(
      { message: "Roster change could not be saved." },
      { status: 503 },
    );
  }
}
