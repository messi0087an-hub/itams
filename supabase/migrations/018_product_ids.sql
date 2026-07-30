CREATE TABLE IF NOT EXISTS product_ids (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO product_ids (code, category) VALUES
('P001', 'Laptop'), ('P002', 'Desktop'), ('P003', 'Monitor'),
('P004', 'Printer'), ('P005', 'Server'), ('P006', 'Networking'),
('P007', 'Mobile Device'), ('P008', 'Tablet'), ('P009', 'Peripheral'),
('P010', 'Software License'), ('P011', 'Furniture'), ('P012', 'Other')
ON CONFLICT DO NOTHING;

ALTER TABLE product_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product_ids"
  ON product_ids FOR ALL
  USING (true)
  WITH CHECK (true);
