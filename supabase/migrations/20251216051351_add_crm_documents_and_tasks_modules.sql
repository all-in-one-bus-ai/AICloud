/*
  # CRM, Document Management, and Task Management Modules
  
  ## New Tables
  
  ### CRM Module
  - `leads` - Sales leads/prospects
  - `customer_interactions` - Interaction history with customers/leads
  
  ### Document Management Module
  - `document_categories` - Document classification
  - `documents` - Document repository
  
  ### Task & Project Management Module
  - `tasks` - Task tracking
  - `task_comments` - Comments on tasks
  
  ## Security
  - RLS enabled on all tables
  - Multi-tenant isolation enforced
*/

-- =====================================================
-- MODULE 17: CRM
-- =====================================================

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  company text,
  
  source text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  
  estimated_value decimal(10,2),
  probability integer DEFAULT 50,
  
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  notes text,
  
  converted_to_customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  converted_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads in their tenant"
  ON leads FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage leads"
  ON leads FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS customer_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  
  interaction_type text NOT NULL CHECK (interaction_type IN ('call', 'email', 'meeting', 'note', 'task')),
  subject text NOT NULL,
  description text,
  
  interaction_date timestamptz DEFAULT now(),
  
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions in their tenant"
  ON customer_interactions FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage interactions"
  ON customer_interactions FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- MODULE 18: Document Management
-- =====================================================

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, name)
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document categories in their tenant"
  ON document_categories FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage document categories"
  ON document_categories FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  
  document_date date,
  expiry_date date,
  
  tags text[],
  
  version text DEFAULT '1.0',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their tenant"
  ON documents FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Managers can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- =====================================================
-- MODULE 19: Task & Project Management
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  assigned_to uuid REFERENCES staff(id) ON DELETE SET NULL,
  
  due_date timestamptz,
  completed_at timestamptz,
  
  tags text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  comment text NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task comments in their tenant"
  ON task_comments FOR SELECT
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create task comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer ON customer_interactions(customer_id, interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_category ON documents(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(tenant_id, expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(tenant_id, due_date) WHERE status != 'completed';
