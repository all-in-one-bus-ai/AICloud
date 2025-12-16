/*
  # Add Receipt Barcode to Sales

  1. Changes
    - Add `receipt_barcode` text field to sales table
    - Make it unique for lookups
    - Add index for fast searching

  2. Notes
    - This allows searching sales by barcode from receipts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'receipt_barcode'
  ) THEN
    ALTER TABLE sales ADD COLUMN receipt_barcode text UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_receipt_barcode ON sales(receipt_barcode);