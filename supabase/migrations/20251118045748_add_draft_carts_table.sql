/*
  # Add Draft Carts Table

  1. New Tables
    - `draft_carts`
      - `id` (uuid, primary key) - Unique identifier for the draft
      - `tenant_id` (uuid, foreign key) - Links to tenants table
      - `branch_id` (uuid, foreign key) - Links to branches table
      - `user_id` (uuid, foreign key) - User who created the draft
      - `cart_data` (jsonb) - Stores the cart items and metadata
      - `expires_at` (timestamptz) - Expiration time (24 hours from creation)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `draft_carts` table
    - Add policies for authenticated users to manage their own drafts
    - Add policy to allow users to read drafts from their tenant/branch

  3. Indexes
    - Index on tenant_id and branch_id for fast lookups
    - Index on expires_at for cleanup operations
    - Index on user_id for user-specific queries
*/

CREATE TABLE IF NOT EXISTS draft_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 day'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE draft_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drafts from their tenant"
  ON draft_carts FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own drafts"
  ON draft_carts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own drafts"
  ON draft_carts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts"
  ON draft_carts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_draft_carts_tenant_branch ON draft_carts(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_draft_carts_expires_at ON draft_carts(expires_at);
CREATE INDEX IF NOT EXISTS idx_draft_carts_user_id ON draft_carts(user_id);

CREATE OR REPLACE FUNCTION delete_expired_drafts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM draft_carts WHERE expires_at < now();
END;
$$;