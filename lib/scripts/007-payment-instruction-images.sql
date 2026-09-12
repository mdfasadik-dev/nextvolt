-- Create payment_instruction_images table
CREATE TABLE IF NOT EXISTS payment_instruction_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INT4 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create junction table connecting payment methods to instruction images
CREATE TABLE IF NOT EXISTS payment_method_instruction_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    image_id UUID NOT NULL REFERENCES payment_instruction_images(id) ON DELETE CASCADE,
    sort_order INT4 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(payment_method_id, image_id)
);

-- Add payable_amount_mode column to payment_methods table if not exists
ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS payable_amount_mode TEXT DEFAULT 'total_payable';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pm_instruction_images_pm_id ON payment_method_instruction_images(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_pm_instruction_images_img_id ON payment_method_instruction_images(image_id);

-- Enable RLS
ALTER TABLE payment_instruction_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_instruction_images ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read on payment_instruction_images" ON payment_instruction_images FOR SELECT USING (true);
CREATE POLICY "Allow public read on payment_method_instruction_images" ON payment_method_instruction_images FOR SELECT USING (true);

-- Admin full access policies
CREATE POLICY "Allow admin full access on payment_instruction_images" ON payment_instruction_images FOR ALL USING (true);
CREATE POLICY "Allow admin full access on payment_method_instruction_images" ON payment_method_instruction_images FOR ALL USING (true);
