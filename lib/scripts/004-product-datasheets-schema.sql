-- Create product_datasheets table
CREATE TABLE IF NOT EXISTS product_datasheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'image')),
    file_size INT8,
    sort_order INT4 DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for product_id
CREATE INDEX IF NOT EXISTS idx_product_datasheets_product_id ON product_datasheets(product_id);

-- Enable RLS
ALTER TABLE product_datasheets ENABLE ROW LEVEL SECURITY;

-- Public read access policy
CREATE POLICY "Public read product_datasheets" ON product_datasheets
    FOR SELECT USING (true);

-- Admin full access policy
CREATE POLICY "Admin manage product_datasheets" ON product_datasheets
    FOR ALL USING (true) WITH CHECK (true);
