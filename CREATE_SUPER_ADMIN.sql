-- ============================================================================
-- CREATE SUPER ADMIN
-- ============================================================================
--
-- This script promotes an existing user to super admin status.
--
-- SECURITY WARNING:
-- Only run this script if you are a database administrator.
-- Super admins have platform-wide access to all businesses and users.
--
-- ============================================================================

-- INSTRUCTIONS:
-- 1. User must first register normally at /signup
-- 2. Replace 'user@email.com' below with their actual email
-- 3. Run this script in Supabase SQL Editor
-- 4. User can then login at /super-admin/login

-- ============================================================================
-- PROMOTE USER TO SUPER ADMIN
-- ============================================================================

SELECT admin_promote_to_super_admin('user@email.com');

-- Expected output:
-- {
--   "success": true,
--   "message": "User promoted to super admin successfully",
--   "email": "user@email.com"
-- }

-- ============================================================================
-- VERIFY SUPER ADMIN STATUS
-- ============================================================================

-- Check the user is now a super admin
SELECT
  id,
  email,
  full_name,
  role,
  is_super_admin,
  tenant_id,
  branch_id,
  is_active
FROM user_profiles
WHERE email = 'user@email.com';

-- Expected values:
-- is_super_admin: true
-- tenant_id: null
-- branch_id: null
-- is_active: true

-- ============================================================================
-- LIST ALL SUPER ADMINS
-- ============================================================================

-- View all current super admins
SELECT
  id,
  email,
  full_name,
  created_at
FROM user_profiles
WHERE is_super_admin = true
ORDER BY created_at DESC;

-- ============================================================================
-- REMOVE SUPER ADMIN STATUS (IF NEEDED)
-- ============================================================================

-- To demote a super admin back to regular user:
-- (You'll need to manually assign them to a tenant)

-- UPDATE user_profiles
-- SET
--   is_super_admin = false,
--   tenant_id = 'TENANT_ID_HERE',
--   branch_id = 'BRANCH_ID_HERE'
-- WHERE email = 'user@email.com';

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If user doesn't exist, check auth.users table:
-- SELECT id, email, created_at FROM auth.users WHERE email = 'user@email.com';

-- If user exists in auth but not user_profiles, they didn't complete signup.
-- Have them complete the signup process first.
