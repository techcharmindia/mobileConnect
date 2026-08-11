-- MobileConnectOS POS database schema
-- Run this file against the database configured as DB_POS_NAME.

-- Extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Main products table
CREATE TABLE IF NOT EXISTS pos_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  upc VARCHAR(80),
  category VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(120),
  imei VARCHAR(80),
  serial VARCHAR(80),
  supplier VARCHAR(120),
  valuation_method VARCHAR(80) NOT NULL DEFAULT 'WAC',
  condition VARCHAR(50) NOT NULL DEFAULT 'New',
  image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  stock_warning INTEGER NOT NULL DEFAULT 0 CHECK (stock_warning >= 0),
  in_purchase_order INTEGER NOT NULL DEFAULT 0 CHECK (in_purchase_order >= 0),
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pos_products
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(30) NOT NULL DEFAULT 'non-serialized',
  ADD COLUMN IF NOT EXISTS commission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_on_pos BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS manage_inventory BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_class VARCHAR(50) DEFAULT 'gst',
  ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mark_up NUMERIC(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_date VARCHAR(120),
  ADD COLUMN IF NOT EXISTS minimum_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Auto update updated_at on every update
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON pos_products;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON pos_products
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pos_products_name
  ON pos_products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pos_products_sku
  ON pos_products (sku);

CREATE INDEX IF NOT EXISTS idx_pos_products_category
  ON pos_products (category);

CREATE INDEX IF NOT EXISTS idx_pos_products_brand
  ON pos_products (brand);

CREATE INDEX IF NOT EXISTS idx_pos_products_quantity
  ON pos_products (quantity);

-- Miscellaneous (non-catalogue) items sold through the register
CREATE TABLE IF NOT EXISTS miscellaneous_items (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL DEFAULT 'Miscellaneous',
  name VARCHAR(180) NOT NULL,
  description TEXT,
  is_barcode BOOLEAN NOT NULL DEFAULT false,
  commission BOOLEAN NOT NULL DEFAULT false,
  on_pos BOOLEAN NOT NULL DEFAULT true,
  retail_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (retail_price >= 0),
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  tax_class VARCHAR(50) NOT NULL DEFAULT 'gst',
  tax_inclusive BOOLEAN NOT NULL DEFAULT true,
  image TEXT,
  bulk_discount BOOLEAN NOT NULL DEFAULT false,
  percentage NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
  percentage_calc VARCHAR(30) NOT NULL DEFAULT 'Before Tax',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibility for tables created before the percentage fields existed.
ALTER TABLE miscellaneous_items
  ADD COLUMN IF NOT EXISTS percentage NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (percentage >= 0),
  ADD COLUMN IF NOT EXISTS percentage_calc VARCHAR(30) NOT NULL DEFAULT 'Before Tax';

DROP TRIGGER IF EXISTS set_timestamp_misc ON miscellaneous_items;

CREATE TRIGGER set_timestamp_misc
BEFORE UPDATE ON miscellaneous_items
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE INDEX IF NOT EXISTS idx_misc_items_name
  ON miscellaneous_items USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_misc_items_created_at
  ON miscellaneous_items (created_at);
