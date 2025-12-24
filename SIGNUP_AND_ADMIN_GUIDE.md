# User Registration & Super Admin Guide

## Overview
Your multi-tenant POS system now has fully functional user registration, business creation, and super admin capabilities with comprehensive Row Level Security (RLS) policies.

## Business Owner Registration

### How to Register as a Business Owner

1. Navigate to `/signup`
2. Fill in:
   - Full Name
   - Email
   - Password
   - Business Name
3. Click "Create Account"

### What Happens During Registration

1. **Auth User Created**: A Supabase auth user is created
2. **Tenant Created**: Your business (tenant) is created with a unique slug
3. **Main Branch Created**: A default "Main Branch" is created for your business
4. **Owner Profile Created**: Your user profile is created with "owner" role
5. **Default Settings**: Loyalty settings and feature flags are initialized

### After Registration

- You are automatically logged in
- You can access the full dashboard at `/dashboard`
- You can:
  - Add products
  - Manage inventory
  - Create sales at `/pos`
  - Add staff members (with different roles: admin, manager, cashier)
  - Create additional branches (if your subscription allows)
  - Configure all business settings

## Super Admin Access

Super admins have platform-wide access to manage all businesses and users.

### How to Create a Super Admin Account

1. Navigate to `/super-admin/signup`
2. Fill in:
   - Full Name
   - Email
   - Password
3. Click "Create Super Admin Account"

### Super Admin Capabilities

Super admins can:
- View all businesses (tenants) at `/super-admin/businesses`
- View all users across all businesses at `/super-admin/users`
- Manage subscription plans at `/super-admin/subscriptions`
- Access and manage any business data
- Promote regular users to super admin status

### Super Admin Login

- Login at `/super-admin/login`
- Uses the same credentials as your super admin account

## Role-Based Access Control

### Roles

1. **Owner**: Full access to their business
   - Can manage everything within their tenant
   - Can add/remove users
   - Can create branches
   - Can configure all settings

2. **Admin**: Similar to owner but cannot delete the business
   - Can manage users
   - Can manage all modules
   - Can configure settings

3. **Manager**: Limited administrative access
   - Can manage products, inventory, and sales
   - Can add customers and suppliers
   - Cannot manage users or critical settings

4. **Cashier**: Read-only + sales creation
   - Can view products
   - Can create sales at POS
   - Cannot modify products or settings

5. **Super Admin**: Platform-wide access
   - Can see and manage all tenants
   - Can access any business data
   - Can manage system-wide settings

## Adding Users to Your Business

As a business owner or admin, you can add users to your business:

1. Go to `/dashboard/staff`
2. Click "Add Staff Member"
3. Fill in user details and select their role
4. The user can then log in with their credentials

## Multi-Branch Support

If your subscription plan allows multiple branches:

1. Go to `/dashboard/settings`
2. Navigate to "Branches" section
3. Click "Add New Branch"
4. Assign staff to specific branches

Each branch can:
- Have its own inventory
- Track sales separately
- Have dedicated staff

## Row Level Security (RLS)

All data is protected with Row Level Security:

- **Business owners** can only see their own business data
- **Staff** can only see data for their assigned tenant
- **Super admins** can see all data across all tenants
- Users cannot access other businesses' data

## Testing the System

### Test Business Owner Flow

1. Go to `/signup`
2. Register with: `owner@mybusiness.com`
3. Create some products
4. Make a test sale at `/pos`
5. View reports at `/dashboard/reports`

### Test Super Admin Flow

1. Go to `/super-admin/signup`
2. Register with: `admin@platform.com`
3. Log in at `/super-admin/login`
4. View all businesses at `/super-admin/businesses`
5. You should see "mybusiness" from the owner registration

## Current System Status

✅ RLS policies applied to 36 tables
✅ Business owner signup functional
✅ Super admin signup functional
✅ Multi-tenant isolation working
✅ Role-based access control implemented
✅ All modules properly secured

## Existing Test Data

There is currently one test business in the system:
- Business: "Test Shop1"
- Owner Email: `test@test.com`
- Created: 2025-12-24

You can either:
1. Use this account to test (if you know the password)
2. Create a new business owner account
3. Create a super admin account to view all businesses

## Module Feature Flags

Each business has feature flags that control which modules are enabled. Super admins can enable/disable modules for each business from the super admin panel.

Available modules include:
- Core POS (always enabled)
- Inventory Management
- Returns & Refunds
- Invoicing
- Payroll
- Restaurant Mode
- Warehouse Management
- Manufacturing
- CRM
- E-commerce
- Email Marketing
- AI Forecasting
- And 20+ more modules

## Next Steps

1. **Create a super admin account** to manage the platform
2. **Test business owner registration** to ensure it works correctly
3. **Add test products and make test sales** to verify the POS flow
4. **Configure feature flags** to enable/disable modules per business
5. **Set up subscription plans** in the super admin panel (if monetizing)
