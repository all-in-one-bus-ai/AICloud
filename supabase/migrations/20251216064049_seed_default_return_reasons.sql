/*
  # Seed Default Return Reasons
  
  ## Purpose
  Populate the return_reasons table with common return reasons for retail businesses
  
  ## Default Reasons
  - Defective/Damaged (no approval needed)
  - Wrong Item (no approval needed)
  - Changed Mind (manager approval required)
  - Not As Described (no approval needed)
  - Arrived Too Late (no approval needed)
  - Better Price Elsewhere (manager approval required)
  - Duplicate Order (no approval needed)
  - No Longer Needed (manager approval required)
  
  ## Notes
  - Uses ON CONFLICT to prevent duplicates
  - Only creates reasons if they don't already exist per tenant
  - Some reasons require manager approval for fraud prevention
*/

-- Insert default return reasons for existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    INSERT INTO return_reasons (tenant_id, reason, requires_manager_approval, is_active)
    VALUES
      (tenant_record.id, 'Defective/Damaged', false, true),
      (tenant_record.id, 'Wrong Item', false, true),
      (tenant_record.id, 'Changed Mind', true, true),
      (tenant_record.id, 'Not As Described', false, true),
      (tenant_record.id, 'Arrived Too Late', false, true),
      (tenant_record.id, 'Better Price Elsewhere', true, true),
      (tenant_record.id, 'Duplicate Order', false, true),
      (tenant_record.id, 'No Longer Needed', true, true)
    ON CONFLICT (tenant_id, reason) DO NOTHING;
  END LOOP;
END $$;
