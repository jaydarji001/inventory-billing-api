
-- Inventory & Billing System - Database Schema

DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- products :
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150)    NOT NULL,
    sku             VARCHAR(50)     NOT NULL UNIQUE,
    price           NUMERIC(12, 2)  NOT NULL CHECK (price >= 0),
    cost_price      NUMERIC(12, 2)  NOT NULL CHECK (cost_price >= 0),
    stock_quantity  INTEGER         NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products(sku);


-- customers: 

CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150)  NOT NULL,
    email           VARCHAR(150)  UNIQUE,
    phone           VARCHAR(20),
    address         TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- invoices: 

CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER         NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_amount    NUMERIC(12, 2)  NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status          VARCHAR(20)     NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled')),
    created_by      INTEGER         REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE TABLE invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INTEGER         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      INTEGER         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        INTEGER         NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12, 2)  NOT NULL CHECK (unit_price >= 0),
    subtotal        NUMERIC(12, 2)  NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON invoice_items(product_id);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
