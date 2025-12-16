# Super Admin Setup Guide

## Overview
The super admin system allows platform administrators to manage all businesses, approve registrations, and configure subscription packages.

## Creating the First Super Admin

Since there's no super admin initially, you need to manually create one through the database.

### Method 1: Direct SQL (Recommended)

1. Sign up for a regular account first at `/signup`
2. Log in and note your email address
3. Go to your Supabase dashboard → SQL Editor
4. Run this query (replace with your email):

```sql
-- Update your user profile to be a super admin
UPDATE user_profiles
SET is_super_admin = true
WHERE email = 'your-email@example.com';
```

5. Log out and log back in
6. You should now see the "Super Admin" button in your dashboard sidebar
7. Navigate to `/super-admin` to access the super admin dashboard

### Method 2: Through Supabase Table Editor

1. Sign up for a regular account
2. Go to Supabase Dashboard → Table Editor → user_profiles
3. Find your user record
4. Click to edit
5. Set `is_super_admin` to `true`
6. Save changes
7. Log out and log back in

## Super Admin Features

### 1. Business Management (`/super-admin/businesses`)
- View all registered businesses
- Approve pending business registrations
- Reject inappropriate businesses
- Suspend/reactivate businesses
- Filter by status (pending, approved, rejected, suspended)
- Search businesses by name, email, or slug

### 2. Subscription Packages (`/super-admin/subscriptions`)
- View all subscription plans
- See package details (limits, features, pricing)
- Manage package availability
- 4 default packages included:
  - **Free Trial**: Testing the system (free)
  - **Starter**: Small businesses ($29.99/mo)
  - **Professional**: Growing businesses ($79.99/mo)
  - **Enterprise**: Unlimited ($199.99/mo)

### 3. Dashboard Overview (`/super-admin`)
- Total businesses count
- Pending approvals count
- Active subscriptions count
- System health monitoring

## Business Approval Workflow

1. **User Signs Up**: New business creates account → Status: `pending`
2. **Super Admin Reviews**: Reviews business details in `/super-admin/businesses`
3. **Approval Actions**:
   - **Approve**: Business can access full system
   - **Reject**: Business cannot use the system
   - **Suspend**: Temporarily disable an approved business
   - **Reactivate**: Re-enable a suspended business

## Subscription Package Features

Each package includes:
- **Max Branches**: Number of physical locations
- **Max Users**: Staff members per business
- **Max Products**: Product catalog size
- **Max Sales/Month**: Transaction limits
- **Features List**: Available functionality

## Security Notes

- Super admins can access data from ALL tenants (bypasses RLS)
- Super admin status is indicated by `is_super_admin = true` in user_profiles
- Regular users cannot see or access super admin functionality
- Activity logging tracks all super admin actions

## Testing Super Admin Features

1. Create super admin account (follow steps above)
2. Create 2-3 test businesses via `/signup`
3. Log in as super admin
4. Navigate to `/super-admin/businesses`
5. Approve/reject test businesses
6. View subscription packages at `/super-admin/subscriptions`

## Default Super Admin Credentials

**There are no default credentials.** You must:
1. Create a regular account first
2. Manually promote it to super admin via database

This is intentional for security - prevents unauthorized super admin access.

## Troubleshooting

### "Not seeing Super Admin button"
- Ensure you logged out and back in after setting `is_super_admin = true`
- Check browser cache, try incognito mode
- Verify in database that `is_super_admin` is actually `true`

### "Cannot access super admin pages"
- Verify you're logged in with a super admin account
- Check that user_profiles.is_super_admin is true
- Try refreshing the page

### "Businesses not showing up"
- Check RLS policies in Supabase
- Ensure super admin policies are created (migration should handle this)
- Verify database connection

## Next Steps

After setting up super admin:

1. **Test the approval workflow** with dummy businesses
2. **Review subscription packages** and adjust pricing if needed
3. **Configure business approval criteria** (if needed)
4. **Set up notification system** for new business registrations (future enhancement)
5. **Monitor activity logs** for security auditing (future enhancement)

## Production Recommendations

- Create at least 2 super admin accounts for redundancy
- Use strong passwords for super admin accounts
- Enable 2FA for super admin accounts (when available)
- Regularly audit super admin activity
- Keep super admin credentials secure and separate
