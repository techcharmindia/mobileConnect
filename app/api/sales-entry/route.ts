import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ message: "Please sign in again." }, { status: 401 });
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
      notes,
      status,
      orderNumber,
      gp,
      marketingConsent,
      stockItemUsed,
      quantity,
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
        gp,
        marketing_consent,
        stock_item_used,
        quantity
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
      user.store,
      user.name,
      notes,
      status,
      orderNumber || null,
      Number(gp) || 0,
      marketingConsent || "Opted In",
      stockItemUsed || null,
      Number(quantity) || 1,
    ];

    let result;
    try {
      result = await pool.query(query, values);
    } catch (error: unknown) {
      // Existing installations may have the original table before the new
      // Telstra migration. Keep their POS sales flow working until schema.sql
      // has been run, while upgraded databases retain GP and order details.
      if (!(error instanceof Error) || !/(order_number|marketing_consent|stock_item_used|quantity)/.test(error.message))
        throw error;
      try {
        // Databases that already have GP/order columns but not the newer
        // consent and stock columns must still retain the sale's GP value.
        result = await pool.query(
          `INSERT INTO sales_entry (sale_date, channel, customer_name, cac, contact_number, email, category, store_location, staff, notes, status, order_number, gp)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
          values.slice(0, 13),
        );
      } catch (legacyError: unknown) {
        if (!(legacyError instanceof Error) || !/(order_number|gp)/.test(legacyError.message)) throw legacyError;
        result = await pool.query(
          `INSERT INTO sales_entry (sale_date, channel, customer_name, cac, contact_number, email, category, store_location, staff, notes, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
          values.slice(0, 11),
        );
      }
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json({ message: "Database Error" }, { status: 500 });
  }
}
