-- Add customer note column to delivery methods table
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS note TEXT;

-- Add customer note column to delivery weight rules table
ALTER TABLE delivery_weight_rules ADD COLUMN IF NOT EXISTS note TEXT;
