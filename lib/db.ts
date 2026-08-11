import { Pool, types } from "pg";

types.setTypeParser(1082, (val) => val);

function createPool(database: string | undefined, fallback: string): Pool {
  return new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: database || fallback,
  });
}

// One connection pool per application database. Query any of these pools from
// any route, so future cross-database reads (e.g. the POS register reading
// Telstra stock) work without extra setup.
export const posPool = createPool(process.env.DB_POS_NAME, "pos");
export const telstraPool = createPool(process.env.DB_TELSTRA_NAME, "telstra");
export const repairPool = createPool(process.env.DB_REPAIR_NAME, "repair");
