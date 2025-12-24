/*
  # Fix Branches INSERT Policy
  
  ## Changes
  Correct the branches INSERT policy to properly check tenant_id
  instead of comparing up.tenant_id with itself.
*/

DROP POLICY IF EXISTS "Users can insert branches" ON branches;
CREATE POLICY "Users can insert branches"
  ON branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if the tenant was just created by this user (email match)
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = tenant_id
      AND t.email = auth.email()
    )
    OR 
    -- OR user is already owner/admin of this tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.tenant_id = branches.tenant_id
      AND up.role IN ('owner', 'admin')
    )
  );
