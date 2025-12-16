# Testing Guide - CloudPOS System

## Quick Start Testing

### Test 1: Sign Up a New Business

1. Navigate to `/signup`
2. Fill in the form:
   - **Business Name**: Test Store 1
   - **Full Name**: John Doe
   - **Email**: john@teststore1.com
   - **Password**: test123 (or any password 6+ characters)
3. Click "Create account"
4. You should be redirected to `/dashboard`
5. Note: Your tenant status is "pending" (awaiting super admin approval)

### Test 2: Create Super Admin

1. Sign up for another account (or use the one above)
2. Go to your Supabase Dashboard
3. Navigate to: SQL Editor
4. Run this query (replace with your email):
```sql
UPDATE user_profiles
SET is_super_admin = true
WHERE email = 'john@teststore1.com';
```
5. Log out and log back in
6. You should now see a "Super Admin" button in the sidebar

### Test 3: Approve Business

1. Log in as super admin
2. Click "Super Admin" in the sidebar
3. Navigate to "Businesses"
4. You should see businesses with "Pending" status
5. Click "Approve" on a pending business
6. The status should change to "Approved"

### Test 4: View Subscription Packages

1. As super admin, navigate to "Subscriptions"
2. You should see 4 packages:
   - Free Trial ($0)
   - Starter ($29.99)
   - Professional ($79.99) - highlighted
   - Enterprise ($199.99)
3. Each package shows limits and features

### Test 5: POS Functionality (Approved Business)

1. Log out from super admin
2. Log in as an approved business user
3. Navigate to POS (`/pos`)
4. Try scanning/adding products (you'll need to add products first)

### Test 6: Multi-Tenant Isolation

1. Sign up business #1: testbiz1@test.com
2. Sign up business #2: testbiz2@test.com
3. Create super admin, approve both
4. Log into business #1
5. Add some test products
6. Log out, log into business #2
7. Verify you CANNOT see business #1's products
8. Log in as super admin
9. Navigate to Users page
10. Verify you CAN see users from both businesses

## Troubleshooting

### "Row violates row-level security policy"

**Fixed!** The RLS policies have been updated to allow:
- Tenant creation during signup
- Branch creation during onboarding
- User profile creation for new users
- Loyalty settings initialization

If you still see this error:
1. Check you're logged in (have valid session)
2. Try logging out completely and back in
3. Check browser console for specific error details

### "Cannot access super admin"

1. Verify `is_super_admin = true` in database
2. Log out completely (clear session)
3. Log back in
4. Hard refresh the page (Ctrl+Shift+R)

### "Products not showing in POS"

1. Make sure business is approved by super admin
2. Add products via Products page first
3. Set stock levels for your branch
4. Then products will appear in POS

## Testing Checklist

- [ ] Sign up new business successfully
- [ ] Business shows "pending" status in super admin
- [ ] Create super admin account
- [ ] Approve business from super admin dashboard
- [ ] View all subscription packages
- [ ] See users across all tenants (super admin only)
- [ ] Verify tenant isolation (businesses can't see each other's data)
- [ ] Test POS with approved business
- [ ] Suspend a business (should limit access)
- [ ] Reactivate suspended business

## Sample Test Data

### Business 1
- Name: Corner Store
- Email: corner@test.com
- Password: test123

### Business 2
- Name: Downtown Market
- Email: downtown@test.com
- Password: test123

### Super Admin
- Use any business account
- Promote via SQL:
```sql
UPDATE user_profiles
SET is_super_admin = true
WHERE email = 'your-email@test.com';
```

## Next Steps After Testing

1. **Configure First Business**
   - Add products
   - Set up stock levels
   - Create memberships (optional)
   - Configure promotions (optional)

2. **Test POS Flow**
   - Scan products
   - Add to cart
   - Apply member discounts
   - Complete sale

3. **Test Approval Workflow**
   - Create multiple test businesses
   - Approve some, reject others
   - Test suspended status

4. **Configure Production Settings**
   - Set real subscription pricing
   - Configure payment integration (future)
   - Set up email notifications (future)

## Important Notes

- All new businesses start with "pending" status
- Super admin approval required for full access
- Each business has complete data isolation
- Super admins can see all data across tenants
- Default subscription packages are pre-loaded
- RLS policies enforce security at database level

## Security Testing

1. **Test Tenant Isolation**
   - Create 2 businesses
   - Add data to business 1
   - Log into business 2
   - Verify cannot access business 1 data

2. **Test Super Admin Access**
   - Log in as regular user
   - Try accessing `/super-admin` (should fail)
   - Log in as super admin
   - Verify can access all tenant data

3. **Test RLS Policies**
   - Use Supabase table viewer
   - Switch between user contexts
   - Verify correct data visibility

## Common Issues & Solutions

**Issue**: Can't sign up
- **Solution**: Check Supabase auth is enabled, email settings configured

**Issue**: Can't see products in POS
- **Solution**: Add products first, ensure stock > 0

**Issue**: Super admin button not showing
- **Solution**: Log out/in after setting is_super_admin flag

**Issue**: Business stuck in pending
- **Solution**: Use super admin to approve from Businesses page
