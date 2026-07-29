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
      orderNumber,
      gp,
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
        status,
        order_number,
        gp
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
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
      orderNumber || null,
      Number(gp) || 0,
    ];

    let result;
    try {
      result = await pool.query(query, values);
    } catch (error: unknown) {
      // Existing installations may have the original table before the new
      // Telstra migration. Keep their POS sales flow working until schema.sql
      // has been run, while upgraded databases retain GP and order details.
      if (!(error instanceof Error) || !error.message.includes("order_number"))
        throw error;
      result = await pool.query(
        `INSERT INTO sales_entry (sale_date, channel, customer_name, cac, contact_number, email, category, store_location, staff, notes, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        values.slice(0, 11),
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json({ message: "Database Error" }, { status: 500 });
  }
}