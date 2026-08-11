import { NextResponse } from "next/server";
import { telstraPool } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Canonical roster key: the Monday of the selected Monday–Sunday calendar week.
// UTC calendar arithmetic prevents server/browser timezone date shifts.
const weekStartFor = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      { message: "Please sign in again." },
      { status: 401 },
    );
  try {
    const weekStart = new URL(request.url).searchParams.get("weekStart");
    const requestedWeek = isDate(weekStart) ? weekStartFor(weekStart) : null;
    const targetWeek = requestedWeek ?? (await telstraPool.query("SELECT date_trunc('week', CURRENT_DATE)::date AS week_start")).rows[0].week_start;
    const exactWeek = await telstraPool.query(`SELECT id, week_start, status, published_at FROM roster_weeks WHERE week_start = $1::date LIMIT 1`, [targetWeek]);
    const week = exactWeek.rows[0] && (user.role === "admin" || exactWeek.rows[0].status === "published")
      ? exactWeek
      : await telstraPool.query(`SELECT id, week_start, status, published_at FROM roster_weeks WHERE week_start <= $1::date AND status = 'published' ORDER BY week_start DESC LIMIT 1`, [targetWeek]);
    const rosterWeek = week.rows[0];
    const staff = await telstraPool.query(
      "SELECT id, name, store FROM staff_users WHERE is_active = TRUE AND role = 'sales' ORDER BY name",
    );
    if (!rosterWeek)
      return NextResponse.json({
        weekStart: targetWeek,
        status: "published",
        publishedAt: null,
        staff: staff.rows,
        shifts: [],
      });
    const source = user.role === "admin" && rosterWeek.week_start === targetWeek ? "roster_week_shifts" : "published_roster_week_shifts";
    const shifts = await telstraPool.query(
      `SELECT staff_user_id, ($2::date + (shift_date - $3::date))::date AS shift_date, shift_label FROM ${source}
       WHERE roster_week_id = $1 ORDER BY shift_date, staff_user_id`,
      [rosterWeek.id, targetWeek, rosterWeek.week_start],
    );
    return NextResponse.json({
      weekStart: targetWeek,
      status: user.role === "admin" ? rosterWeek.status : "published",
      publishedAt: rosterWeek.published_at,
      inherited: rosterWeek.week_start !== targetWeek,
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
      await telstraPool.query(
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
      const canonicalWeekStart = weekStartFor(body.weekStart);
      if (weekStartFor(body.shiftDate) !== canonicalWeekStart)
        return NextResponse.json(
          { message: "The shift date must be inside the selected Monday–Sunday roster week." },
          { status: 400 },
        );
      const client = await telstraPool.connect();
      try {
        await client.query("BEGIN");
        const created = await client.query(`INSERT INTO roster_weeks (week_start, status) VALUES ($1, 'draft') ON CONFLICT (week_start) DO NOTHING RETURNING id`, [canonicalWeekStart]);
        let rosterWeekId = created.rows[0]?.id;
        if (rosterWeekId) {
          const template = await client.query(`SELECT id, week_start FROM roster_weeks WHERE week_start < $1::date AND status = 'published' ORDER BY week_start DESC LIMIT 1`, [canonicalWeekStart]);
          if (template.rows[0]) await client.query(
            `INSERT INTO roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
             SELECT $1, staff_user_id, ($2::date + (shift_date - $3::date))::date, shift_label
             FROM published_roster_week_shifts WHERE roster_week_id = $4`,
            [rosterWeekId, canonicalWeekStart, template.rows[0].week_start, template.rows[0].id],
          );
        } else {
          const existing = await client.query("SELECT id FROM roster_weeks WHERE week_start = $1", [canonicalWeekStart]);
          rosterWeekId = existing.rows[0].id;
        }
        await client.query("UPDATE roster_weeks SET status = 'draft' WHERE id = $1", [rosterWeekId]);
        await client.query(`INSERT INTO roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
          VALUES ($1, $2, $3, $4) ON CONFLICT (roster_week_id, staff_user_id, shift_date)
          DO UPDATE SET shift_label = EXCLUDED.shift_label`, [rosterWeekId, body.staffUserId, body.shiftDate, body.shiftLabel.trim()]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally { client.release(); }
      return NextResponse.json({ ok: true });
    }
    if (body.action === "publish") {
      if (!isDate(body.weekStart))
        return NextResponse.json(
          { message: "A valid roster week is required." },
          { status: 400 },
        );
      const canonicalWeekStart = weekStartFor(body.weekStart);
      const client = await telstraPool.connect();
      let week;
      try {
        await client.query("BEGIN");
        week = await client.query(
          `UPDATE roster_weeks SET status = 'published', published_at = NOW(), published_by = $2 WHERE week_start = $1 RETURNING id, published_at`,
          [canonicalWeekStart, user.id],
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
