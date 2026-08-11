-- MobileConnectOS database setup
-- Creates the three application databases: pos, telstra and repair.
-- Run this file against the default "postgres" database first (e.g.
-- psql -U postgres -d postgres -f database/setup.sql).
-- Then apply each schema file to its database:
--   psql -U postgres -d pos     -f database/schema_pos.sql
--   psql -U postgres -d telstra -f database/schema_telstra.sql
--   psql -U postgres -d repair  -f database/schema_repair.sql

CREATE DATABASE pos;
CREATE DATABASE telstra;
CREATE DATABASE repair;
