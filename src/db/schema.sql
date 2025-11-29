-- Enable CITEXT extension for case-insensitive email
CREATE EXTENSION IF NOT EXISTS citext;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS purchases;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS users_raw;

-- Drop functions
DROP FUNCTION IF EXISTS normalize_email(TEXT);
DROP FUNCTION IF EXISTS create_user(TEXT, DECIMAL);

-- Drop types
DROP TYPE IF EXISTS purchase_status;

-- Create enum for purchase status
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'refunded');

-- Raw users table (stores original email as received)
CREATE TABLE users_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_raw TEXT NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table with optimistic locking (version field)
-- Email here is normalized via create_user() function
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT UNIQUE NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    status purchase_status NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for foreign keys
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_users_raw_user_id ON users_raw(user_id);

-- Function to normalize email (lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_email(email_input TEXT)
RETURNS CITEXT AS $$
BEGIN
    -- Trim whitespace and convert to lowercase
    RETURN LOWER(TRIM(email_input));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create user (normalizes email and stores raw)
CREATE OR REPLACE FUNCTION create_user(
    email_raw_input TEXT,
    balance_input DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    user_id_result UUID;
    email_normalized CITEXT;
BEGIN
    -- Normalize email
    email_normalized := normalize_email(email_raw_input);
    
    -- Insert into users table with normalized email
    INSERT INTO users (email, balance)
    VALUES (email_normalized, balance_input)
    RETURNING id INTO user_id_result;
    
    -- Store raw email in users_raw
    INSERT INTO users_raw (email_raw, user_id)
    VALUES (email_raw_input, user_id_result);
    
    RETURN user_id_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at and version increment
CREATE OR REPLACE FUNCTION update_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_metadata
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_metadata();
