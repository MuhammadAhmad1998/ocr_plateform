# Super Admin Feature Guide

This guide explains the super admin feature implementation in the OCR Platform.

## Overview

The platform now supports **two types of users**:

1. **Regular Users** (`role: "user"`) - Access the standard product (Advisor, Testing, Dashboard, Docs, Pricing)
2. **Super Admins** (`role: "super_admin"`) - Access the admin console to manage users and monitor platform statistics

## Creating a Super Admin

### Method 1: Environment Variables (Recommended for First Deploy)

Add these variables to your `.env` file:

```bash
SUPER_ADMIN_EMAIL=admin@yourcompany.com
SUPER_ADMIN_PASSWORD=your-secure-password-here
```

On the next application startup, the system will:
- Create a super admin account if it doesn't exist
- Promote an existing user to super admin if the email matches
- This runs during the database seeding phase

**Security Best Practice:** After the super admin account is created and you've logged in successfully, remove or comment out these environment variables from your `.env` file to prevent exposing the password.

### Method 2: Manual Database Update (Emergency/Existing User)

If you need to promote an existing user to super admin:

```sql
UPDATE users SET role = 'super_admin' WHERE email = 'admin@example.com';
```

## Login & Access

### Super Admin Login
1. Visit `/login` (same page as regular users)
2. Enter your super admin credentials
3. You'll be automatically redirected to `/admin` (the admin console)

### Regular User Login
1. Visit `/login`
2. Enter regular user credentials
3. You'll be redirected to `/advisor` (the standard product)

**Note:** The role determines the redirect target - the system checks the user's role after login and routes accordingly.

## Admin Console Features

The admin console is accessible only to users with `role: "super_admin"` and includes:

### 1. Overview Dashboard (`/admin`)

**Platform Statistics:**
- Total users (active/inactive breakdown)
- Recent signups (last 7 days)
- Jobs processed (last 24 hours)
- Pages processed (current month)
- Failed jobs alert

**User Distribution:**
- Direct users vs. platform users
- Users by subscription tier
- Super admin count

### 2. Users List (`/admin/users`)

**Features:**
- Search users by email or name
- Paginated list (20 per page)
- View user details at a glance:
  - Email, name, role
  - Active/inactive status
  - Subscription tier & quota usage
  - API key count
  - Jobs this month
  - Last active date

**Filters:**
- Active/inactive users
- By tier
- Platform vs direct users

### 3. User Detail Page (`/admin/users/[id]`)

**Tabs:**

#### Overview Tab
- **Profile:** Email, name, role, user ID, join date, platform status
- **Subscription:** Tier, quota used/limit, status, Stripe customer link
- **Usage Stats:** Jobs this month, pages this month, total compute seconds

#### API Keys Tab
- List all user's API keys
- See key name, prefix, scopes, active status
- Last used date
- Revoke keys directly from admin console

#### Recent Jobs Tab
- Last 20 OCR jobs
- Status, type, pages processed, compute time
- Error messages for failed jobs

**Admin Actions:**
- Activate/Deactivate user account
- Revoke user's API keys
- View Stripe customer details (if applicable)

## API Endpoints

All admin endpoints are protected with `require_super_admin` dependency and are under `/api/v1/admin/`:

### Platform Stats
```
GET /api/v1/admin/stats/
```
Returns platform-wide statistics and KPIs.

### Users Management
```
GET /api/v1/admin/users/
  ?page=1
  &page_size=20
  &active_only=true
  &tier_slug=pro
  &search=user@example.com
```
List users with filters and pagination.

```
GET /api/v1/admin/users/{user_id}
```
Get detailed user information.

```
PATCH /api/v1/admin/users/{user_id}/activate
```
Activate a user account.

```
PATCH /api/v1/admin/users/{user_id}/deactivate
```
Deactivate a user account (blocks login).

```
PATCH /api/v1/admin/users/{user_id}/quota?quota_limit=1000
```
Update user's quota limit.

```
PATCH /api/v1/admin/users/{user_id}/tier?tier_slug=pro
```
Change user's subscription tier.

```
DELETE /api/v1/admin/users/{user_id}/api-keys/{key_id}
```
Revoke a user's API key.

## Backend Implementation Details

### Database Changes
- Added `role` column to `users` table (String, default: "user")
- Possible values: `"user"` | `"super_admin"`

### JWT Token Updates
- Access and refresh tokens now include `role` claim
- Frontend receives role in `/auth/me/` response

### Authorization
- `require_super_admin()` dependency checks user role
- Returns 403 Forbidden if user is not a super admin
- All `/admin/*` routes are protected

### Seed Process
- Runs on every startup (via `app.main.lifespan`)
- Checks `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` env vars
- Creates or promotes super admin if credentials are set
- Idempotent: safe to run multiple times

## Frontend Implementation Details

### Route Protection
- `/admin/*` routes check user role on mount
- Redirect to `/dashboard` if user is not super admin
- Redirect to `/login` if not authenticated

### Login Flow
1. User submits credentials
2. Backend returns JWT tokens
3. Frontend calls `/auth/me/` to get user details
4. Check `user.role`:
   - If `"super_admin"` → redirect to `/admin`
   - If `"user"` → redirect to `/advisor` or `next` parameter

### Admin Layout
- Separate navigation (Overview, Users)
- Different navbar from regular user interface
- Theme toggle and sign out available

## Security Considerations

1. **Role Enforcement:**
   - All admin endpoints protected by `require_super_admin` dependency
   - Frontend route guards are for UX only; backend enforces access

2. **Super Admin Actions:**
   - Cannot deactivate other super admins
   - Cannot be created via public `/register` endpoint
   - Role field ignored in registration requests (always `"user"`)

3. **Environment Variables:**
   - Remove `SUPER_ADMIN_PASSWORD` from `.env` after first boot
   - Use strong passwords (12+ characters)
   - Consider implementing MFA for super admins in the future

4. **Audit Logging:**
   - Currently admin actions are logged via standard request logging
   - Consider implementing dedicated admin audit log table

## Testing the Feature

### Local Development

1. Add to your `.env`:
```bash
SUPER_ADMIN_EMAIL=admin@test.com
SUPER_ADMIN_PASSWORD=Test123456!
```

2. Restart the backend:
```bash
cd ocr_platform
uvicorn app.main:app --reload
```

3. Check the console for: `Created super admin: admin@test.com`

4. Start the frontend:
```bash
cd frontend
npm run dev
```

5. Login at `http://localhost:3000/login` with super admin credentials

6. You'll be redirected to `http://localhost:3000/admin`

### Production Deployment

1. Set env vars in your deployment platform (Heroku, AWS, etc.)
2. Deploy and start the application
3. Verify super admin was created (check logs)
4. Login and test admin console
5. **Remove or rotate the password** from environment variables
6. Consider using secret management (AWS Secrets Manager, etc.)

## Future Enhancements

Potential v2 features:
- Admin audit log UI
- More granular roles (moderator, support, etc.)
- Promote user to super admin from UI
- Impersonate user functionality
- Email notifications for admin actions
- Dashboard widgets customization
- Export users/usage to CSV
- Advanced analytics and reporting

## Troubleshooting

### Issue: Super admin not created on startup
- Check `.env` file has `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`
- Verify no syntax errors in env vars (no quotes needed)
- Check backend logs for seed process errors
- Try manual database update method

### Issue: Redirected to dashboard instead of admin console
- Verify user role in database: `SELECT email, role FROM users WHERE email = 'admin@test.com';`
- Clear browser localStorage and login again
- Check JWT token includes role claim

### Issue: 403 Forbidden on admin endpoints
- Confirm user has `role = 'super_admin'` in database
- Ensure JWT token is fresh (try logging out/in)
- Check backend logs for authorization errors

### Issue: Can't see admin navigation
- Check browser console for errors
- Verify admin layout is loading
- Confirm route is under `/admin/*`

## Support

For questions or issues with the super admin feature:
1. Check backend logs for error messages
2. Verify database schema includes `role` column
3. Test with fresh JWT tokens
4. Review this guide's security and implementation sections
