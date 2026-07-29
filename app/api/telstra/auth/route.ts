import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { name, pin } = await request.json();
    if (
      typeof name !== "string" ||
      typeof pin !== "string" ||
      !name.trim() ||
      !pin.trim()
    ) {
      return NextResponse.json(
        { message: "Staff name and PIN are required." },
        { status: 400 },
      );
    }
    const result = await pool.query(
      "SELECT id, name, role, store, pin FROM staff_users WHERE LOWER(name) = LOWER($1) AND is_active = TRUE LIMIT 1",
      [name.trim()],
    );
    const user = result.rows[0];
    if (!user || pin !== user.pin) {
      return NextResponse.json(
        { message: "The staff name or PIN is not correct." },
        { status: 401 },
      );
    }
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        store: user.store,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to verify the Telstra login right now." },
      { status: 503 },
    );
  }
}
