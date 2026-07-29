-- MobileConnectOS PostgreSQL setup
-- Run this file once against the database configured in .env.local.

CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  role VARCHAR(30) NOT NULL CHECK (role IN ('sales', 'follow_up', 'commission', 'admin')),
  store VARCHAR(120) NOT NULL DEFAULT 'Underwood',
  pin VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility migration for a schema created during the earlier bcrypt setup.
ALTER TABLE staff_users DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS pin VARCHAR(20);
UPDATE staff_users SET pin = '1234' WHERE pin IS NULL;
ALTER TABLE staff_users ALTER COLUMN pin SET NOT NULL;

CREATE TABLE IF NOT EXISTS sales_entry (
  id SERIAL PRIMARY KEY,
  sale_date DATE NOT NULL,
  channel VARCHAR(120) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  cac VARCHAR(120),
  contact_number VARCHAR(50) NOT NULL,
  email VARCHAR(160),
  category VARCHAR(160) NOT NULL,
  store_location VARCHAR(120),
  staff VARCHAR(120),
  notes TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted',
  order_number VARCHAR(80),
  gp NUMERIC(12,2) NOT NULL DEFAULT 0,
  marketing_consent VARCHAR(20) NOT NULL DEFAULT 'Opted In',
  stock_item_used VARCHAR(160),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sales_entry ADD COLUMN IF NOT EXISTS marketing_consent VARCHAR(20) NOT NULL DEFAULT 'Opted In';
ALTER TABLE sales_entry ADD COLUMN IF NOT EXISTS stock_item_used VARCHAR(160);
ALTER TABLE sales_entry ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  store VARCHAR(120) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roster_shifts (
  id SERIAL PRIMARY KEY,
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_label VARCHAR(80) NOT NULL,
  UNIQUE(staff_user_id, shift_date)
);

CREATE INDEX IF NOT EXISTS sales_entry_staff_date_idx ON sales_entry (staff, sale_date DESC);
CREATE INDEX IF NOT EXISTS sales_entry_status_idx ON sales_entry (status);

-- Demo staff accounts. Change these PINs before production use.
INSERT INTO staff_users (name, role, store, pin)
VALUES
  ('Vanshika', 'sales', 'Underwood', '1234'),
  ('Ruby', 'sales', 'Sunnybank Hills', '1234'),
  ('Skye', 'sales', 'Underwood', '1234'),
  ('Rizal', 'sales', 'Underwood', '1234'),
  ('Adrian', 'sales', 'Underwood', '1234'),
  ('Manish', 'sales', 'Underwood', '1234'),
  ('Chloe', 'sales', 'Underwood', '1234'),
  ('Rahul', 'sales', 'Underwood', '1234'),
  ('Follow Up Team', 'follow_up', 'Underwood', '5001'),
  ('Commission Team', 'commission', 'Underwood', '5002'),
  ('Demo Admin', 'admin', 'Underwood', '5003')
ON CONFLICT (name) DO UPDATE SET
  role = EXCLUDED.role,
  store = EXCLUDED.store,
  pin = EXCLUDED.pin,
  is_active = TRUE;
