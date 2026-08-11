-- MobileConnectOS Telstra database schema
-- Run this file against the database configured as DB_TELSTRA_NAME.

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

-- Published roster weeks keep staff on a read-only, approved schedule. Admins edit
-- the same week's draft and publish it only when it is ready for the team.
CREATE TABLE IF NOT EXISTS roster_weeks (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  published_by INTEGER REFERENCES staff_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS roster_week_shifts (
  id SERIAL PRIMARY KEY,
  roster_week_id INTEGER NOT NULL REFERENCES roster_weeks(id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_label VARCHAR(80) NOT NULL DEFAULT 'Off',
  UNIQUE (roster_week_id, staff_user_id, shift_date)
);

CREATE TABLE IF NOT EXISTS published_roster_week_shifts (
  id SERIAL PRIMARY KEY,
  roster_week_id INTEGER NOT NULL REFERENCES roster_weeks(id) ON DELETE CASCADE,
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift_label VARCHAR(80) NOT NULL DEFAULT 'Off',
  UNIQUE (roster_week_id, staff_user_id, shift_date)
);

CREATE TABLE IF NOT EXISTS clock_events (
  id SERIAL PRIMARY KEY,
  staff_user_id INTEGER NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  event_type VARCHAR(12) NOT NULL CHECK (event_type IN ('clock_in', 'clock_out')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clock_events_staff_time_idx ON clock_events (staff_user_id, occurred_at DESC);

-- One-time data repair: any selected weekday must be stored as that week's
-- Monday. For example, 04-08-2026 becomes 03-08-2026.
UPDATE roster_weeks
SET week_start = date_trunc('week', week_start)::date
WHERE week_start <> date_trunc('week', week_start)::date;

CREATE INDEX IF NOT EXISTS sales_entry_staff_date_idx ON sales_entry (staff, sale_date DESC);
CREATE INDEX IF NOT EXISTS sales_entry_status_idx ON sales_entry (status);

-- Demo staff accounts. Change these PINs before production use.
INSERT INTO staff_users (name, role, store, pin)
VALUES
  ('Vanshika', 'sales', 'Underwood', '1234'),
  ('Ruby', 'sales', 'Sunnybank Hills', '1234'),
  ('Skye', 'sales', 'Underwood', '1234'),
  ('Dhaval Ambaliya', 'sales', 'Underwood', '1234'),
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

-- First-run roster matching the approved weekly roster from the product brief.
INSERT INTO roster_weeks (week_start, status, published_at, published_by)
SELECT date_trunc('week', CURRENT_DATE)::date, 'published', NOW(), id
FROM staff_users WHERE name = 'Demo Admin'
ON CONFLICT (week_start) DO NOTHING;

INSERT INTO roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
SELECT rw.id, su.id, rw.week_start + schedule.day_offset, schedule.shift_label
FROM roster_weeks rw
JOIN (VALUES
  ('Vanshika',0,'9-5'),('Vanshika',1,'9-5'),('Vanshika',2,'Off'),('Vanshika',3,'9-5'),('Vanshika',4,'9-5'),('Vanshika',5,'10-3'),('Vanshika',6,'Off'),
  ('Ruby',0,'Off'),('Ruby',1,'11-7'),('Ruby',2,'11-7'),('Ruby',3,'11-7'),('Ruby',4,'11-7'),('Ruby',5,'Off'),('Ruby',6,'10-3'),
  ('Skye',0,'9-5'),('Skye',1,'Off'),('Skye',2,'9-5'),('Skye',3,'9-5'),('Skye',4,'Off'),('Skye',5,'9-5'),('Skye',6,'9-5'),
  ('Dhaval Ambaliya',0,'9-5'),('Dhaval Ambaliya',1,'9-5'),('Dhaval Ambaliya',2,'9-5'),('Dhaval Ambaliya',3,'Off'),('Dhaval Ambaliya',4,'9-5'),('Dhaval Ambaliya',5,'Off'),('Dhaval Ambaliya',6,'10-3'),
  ('Rizal',0,'11-7'),('Rizal',1,'Off'),('Rizal',2,'11-7'),('Rizal',3,'11-7'),('Rizal',4,'11-7'),('Rizal',5,'9-5'),('Rizal',6,'Off'),
  ('Adrian',0,'Off'),('Adrian',1,'9-5'),('Adrian',2,'9-5'),('Adrian',3,'9-5'),('Adrian',4,'9-5'),('Adrian',5,'10-3'),('Adrian',6,'Off'),
  ('Manish',0,'9-5'),('Manish',1,'9-5'),('Manish',2,'Off'),('Manish',3,'9-5'),('Manish',4,'Off'),('Manish',5,'9-5'),('Manish',6,'9-5'),
  ('Rahul',0,'11-7'),('Rahul',1,'11-7'),('Rahul',2,'11-7'),('Rahul',3,'Off'),('Rahul',4,'11-7'),('Rahul',5,'Off'),('Rahul',6,'10-3'),
  ('Chloe',0,'9-5'),('Chloe',1,'9-5'),('Chloe',2,'9-5'),('Chloe',3,'9-5'),('Chloe',4,'Off'),('Chloe',5,'Off'),('Chloe',6,'10-3')
) AS schedule(staff_name, day_offset, shift_label) ON TRUE
JOIN staff_users su ON su.name = schedule.staff_name
WHERE rw.week_start = date_trunc('week', CURRENT_DATE)::date
ON CONFLICT (roster_week_id, staff_user_id, shift_date) DO NOTHING;

INSERT INTO published_roster_week_shifts (roster_week_id, staff_user_id, shift_date, shift_label)
SELECT roster_week_id, staff_user_id, shift_date, shift_label FROM roster_week_shifts
ON CONFLICT (roster_week_id, staff_user_id, shift_date) DO NOTHING;
