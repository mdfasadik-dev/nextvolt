-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    note TEXT,
    button_label TEXT DEFAULT 'Place Order',
    instructions TEXT,
    custom_fields JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT4 NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table connecting payment methods to charge options (profiles)
CREATE TABLE IF NOT EXISTS payment_method_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
    charge_option_id UUID NOT NULL REFERENCES charge_options(id) ON DELETE CASCADE,
    sort_order INT4 NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(payment_method_id, charge_option_id)
);

-- Index for fast lookup by payment_method_id
CREATE INDEX IF NOT EXISTS idx_payment_method_charges_pm_id ON payment_method_charges(payment_method_id);

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_charges ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read on payment_methods" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Allow public read on payment_method_charges" ON payment_method_charges FOR SELECT USING (true);

-- Admin manage policies
CREATE POLICY "Allow admin full access on payment_methods" ON payment_methods FOR ALL USING (true);
CREATE POLICY "Allow admin full access on payment_method_charges" ON payment_method_charges FOR ALL USING (true);

-- Seed default payment methods
INSERT INTO payment_methods (key, label, note, button_label, instructions, custom_fields, is_default, sort_order)
VALUES 
  ('cod', 'Cash on delivery', 'Pay with cash upon delivery of your order.', 'Place Order', NULL, '[]'::jsonb, TRUE, 0),
  ('bank_transfer', 'Direct bank transfer', 'Make your payment directly into our bank account.', 'Proceed to Payment Instructions', 'Please transfer total order amount to our bank account:\n\n- **Bank**: City Bank\n- **Account Name**: NextVolt Ltd\n- **Account Number**: 1234567890\n- **Branch**: Gulshan Branch\n\nEnter your Transaction ID below after completing transfer.', '[{"id":"trx_id","label":"Transaction ID / Ref","placeholder":"e.g. 8N7X2P9Q","required":true}]'::jsonb, FALSE, 1),
  ('unipay', 'UniPay', 'Pay securely using UniPay digital wallet or card.', 'Place Order', NULL, '[]'::jsonb, FALSE, 2)
ON CONFLICT (key) DO NOTHING;
