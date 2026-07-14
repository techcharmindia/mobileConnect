import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      saleDate,
      channel,
      customerName,
      cac,
      contactNumber,
      email,
      category,
      storeLocation,
      staff,
      notes,
      status,
    } = body;

    const query = `
      INSERT INTO sales_entry (
        sale_date,
        channel,
        customer_name,
        cac,
        contact_number,
        email,
        category,
        store_location,
        staff,
        notes,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *;
    `;

    const values = [
      saleDate,
      channel,
      customerName,
      cac,
      contactNumber,
      email,
      category,
      storeLocation,
      staff,
      notes,
      status,
    ];

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Database Error" },
      { status: 500 }
    );
  }
}