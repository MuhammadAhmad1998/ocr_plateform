# Database Migration for Super Admin Feature

## Required Schema Change

The super admin feature requires adding a `role` column to the `users` table.

### SQL Migration

Run this SQL against your database:

```sql
-- Add role column with default value 'user'
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Create index on role for faster queries (optional but recommended)
CREATE INDEX idx_users_role ON users(role);

-- Verify the migration
SELECT email, role, is_active FROM users;
```

### For Existing Databases

If you already have users in your database:

```sql
-- All existing users will get 'user' role by default
-- Promote a specific user to super admin
UPDATE users SET role = 'super_admin' WHERE email = 'your-admin@email.com';

-- Verify
SELECT email, role FROM users WHERE role = 'super_admin';
```

### Rollback (if needed)

```sql
-- Remove the role column
ALTER TABLE users DROP COLUMN role;

-- Drop the index if created
DROP INDEX IF EXISTS idx_users_role;
```

## Development/Fresh Database

If you're starting fresh or in development:

1. Drop the existing database:
```bash
dropdb ocr_platform  # or use psql/pgAdmin
```

2. Run the setup script:
```bash
bash scripts/setup_postgres.sh
```

3. Start the backend - it will create tables with the new schema:
```bash
cd ocr_platform
uvicorn app.main:app --reload
```

4. The `role` column will be included automatically via SQLAlchemy's `create_all()`

## Production Deployment Checklist

### Before Deploy
- [ ] Backup your database
- [ ] Test migration on staging/dev environment first
- [ ] Review the SQL migration script above
- [ ] Plan maintenance window if needed (migration is fast, but safe to schedule)

### During Deploy
1. Put application in maintenance mode (optional, migration is non-blocking)
2. Run the SQL migration (see above)
3. Verify column was added: `\d users` in psql or check in pgAdmin
4. Deploy new backend code
5. Set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in environment
6. Start backend (super admin will be created on first boot)
7. Verify super admin login at `/admin`

### After Deploy
- [ ] Test super admin login and admin console
- [ ] Test regular user login still works
- [ ] Remove super admin password from environment variables
- [ ] Monitor logs for any role-related errors
- [ ] Verify existing user sessions still work

## Notes

- **Migration is backward compatible**: Adding a column with a default value doesn't break existing rows
- **Zero downtime**: This migration can run while the app is running (column has default value)
- **Safe to re-run**: `ADD COLUMN IF NOT EXISTS` can be used for safety
- **No data loss**: All existing users retain their data, just get `role = 'user'`

## Verification Queries

After migration, verify everything looks good:

```sql
-- Check all users have a role
SELECT COUNT(*) as users_with_role FROM users WHERE role IS NOT NULL;

-- Count users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- List super admins
SELECT email, full_name, role, is_active, created_at 
FROM users 
WHERE role = 'super_admin';

-- Check for any NULL roles (should be 0)
SELECT COUNT(*) as null_roles FROM users WHERE role IS NULL;
```

## Troubleshooting

### Error: column "role" of relation "users" already exists
- Column was already added, safe to ignore
- Or use `ADD COLUMN IF NOT EXISTS` in PostgreSQL 9.6+

### Error: invalid input value for enum
- Not applicable here (we're using VARCHAR, not ENUM)
- If you want to use ENUM in the future:
  ```sql
  CREATE TYPE user_role AS ENUM ('user', 'super_admin');
  ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
  ```

### Existing users can't see their subscription
- This is unrelated to the role migration
- Check `subscription_profiles` table separately

### JWT tokens don't include role
- Old tokens won't have the role claim
- Users need to log out and back in to get new tokens with role
- Or wait for token expiration (15 minutes by default)
