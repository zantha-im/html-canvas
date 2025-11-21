---
description: Set up Next.js authentication with Magic Code, PIN, and role-based access control
auto_execution_mode: 3
---

# Setup Auth - Next.js App Router Authentication

⛔ **CRITICAL: This workflow has mandatory sequential steps. Do not skip or reorder steps.**

## ⚠️ Windows Command Syntax Reminder

All commands in this workflow must use Windows syntax:
- Prefix all commands with `cmd /c`
- Use backslashes (`\`) for paths, not forward slashes (`/`)
- Quote paths containing spaces
- Example: `cmd /c node .windsurf\tools\schema-query.js --index`

---

## Purpose

This workflow guides implementation of production-ready authentication for Next.js App Router. It supports:
- **Magic Code (OTP)**: Email-based authentication (1 week duration)
- **PIN**: Shared/kiosk accounts (daily expiration at midnight UTC)
- **Role-Based Access Control**: Admin, partner, user, warehouse roles
- **Audit Logging**: Track all authentication attempts

**IMPORTANT: All steps must be completed sequentially. Do not skip steps.**

---

## Step 1: Load Authentication Guide (REQUIRED)

Read the complete implementation guide:

Read `/.windsurf/guides/nextjs-auth-guide.md`

This guide contains:
- Two authentication methods (Magic Code vs PIN)
- Complete database schema (users, verification_code, pin_auth, auth_log)
- Server actions (sendMagicCode, verifyMagicCode, verifyPin)
- API routes (GET /api/auth/user, POST /api/auth/logout, admin endpoints)
- Role-based access control (RBAC) with feature flags
- JWT validation and authorization patterns
- Frontend protection with useUser hook
- Security checklist (hashing, attempt limiting, expiration)
- Environment variables and configuration
- Common issues and solutions
- Key files structure

**⚠️ Wait for Step 1 to complete before proceeding to Step 2.**

---

## Step 2: Check Current Auth System (REQUIRED)

**AI ACTION REQUIRED**: Inspect the current database schema to determine auth status.

Run this command to check for existing auth tables:

```bash
cmd /c node .windsurf\tools\schema-query.js --index
```

Then check for these tables:
- `users` table (indicates existing auth)
- `verification_code` table (indicates Magic Code already implemented)
- `pin_auth` table (indicates PIN auth already implemented)
- `auth_log` table (indicates audit logging already implemented)
- `sessions` table (indicates session-based auth)
- `accounts` table (indicates OAuth/external auth)

**Report findings**:
- ✅ No auth tables found → Proceed to Step 3a (Build from scratch)
- ✅ Magic Code + PIN tables found → Proceed to Step 3b (Already implemented)
- ✅ Other auth system found → Proceed to Step 3c (Migration decision)

**⚠️ Do not proceed to Step 3 until auth system status is determined.**

---

## Step 3a: Build Authentication from Scratch (IF NO AUTH EXISTS)

**Scope**: Implement complete authentication system with Magic Code, PIN, RBAC, and audit logging

**Database setup**:
- [ ] Create `users` table (UUID PK, email, name, image, role)
- [ ] Create `verification_code` table (identifier PK, hashed code, expiration, attempts)
- [ ] Create `pin_auth` table (user_id FK, hashed PIN, failed_attempts, locked_until)
- [ ] Create `auth_log` table (user_id, auth_type, success, ip_address, user_agent, timestamp)
- [ ] Add indexes on email, role, expires, user_id, attempted_at

**Environment variables**:
- [ ] Generate JWT_SECRET (32-byte hex): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Generate OTP_SECRET_KEY (32-byte hex): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Configure DATABASE_URL (PostgreSQL with SSL)
- [ ] Configure RESEND_API_KEY and RESEND_FROM
- [ ] Configure LOCKOUT_TO (admin email for alerts)

**Server actions**:
- [ ] Implement `app/actions/sendMagicCode.ts` (generate, hash, store, send email)
- [ ] Implement `app/actions/verifyMagicCode.ts` (validate, create JWT, set cookie)
- [ ] Implement `app/actions/verifyPin.ts` (validate, lockout logic, create JWT)
- [ ] Implement `app/actions/logout.ts` (clear cookie)

**API routes**:
- [ ] Create `app/api/auth/user/route.ts` (GET: return current user from JWT)
- [ ] Create `app/api/auth/logout/route.ts` (POST: clear auth_session cookie)
- [ ] Create `app/api/admin/users/route.ts` (GET: list all users, requires admin role)
- [ ] Create `app/api/admin/users/[id]/route.ts` (PUT: update user role, DELETE: delete user)

**Authentication utilities**:
- [ ] Create `lib/auth/roles.ts` (UserRole type, ROLE_FEATURES map, canAccessFeature function)
- [ ] Create `lib/auth/authUtils.ts` (verifyJWT, verifyFeatureAccess functions)
- [ ] Create `lib/auth/jwt.ts` (JWT creation and validation helpers)

**Frontend pages & components**:
- [ ] Create `app/auth/signin/page.tsx` (two-stage form: email → code)
- [ ] Create `app/auth/warehouse/page.tsx` (PIN entry page)
- [ ] Create `hooks/useUser.ts` (fetch user from /api/auth/user)
- [ ] Create `components/CodeInput.tsx` (6-digit input with paste support, auto-submit)
- [ ] Create `components/UserHeader.tsx` (profile display with dropdown menu)

**Email template**:
- [ ] Design email with dark theme
- [ ] Include copyable 6-digit code
- [ ] Add expiration time (5 minutes)
- [ ] Include support contact

**Admin management**:
- [ ] Create admin page to list users
- [ ] Add ability to create new users
- [ ] Add ability to update user roles
- [ ] Add ability to clear PIN lockouts
- [ ] Prevent self-demotion (admins can't demote themselves)

**Key implementation details**:
- Use `window.location.href` (hard redirect) not `router.push()` after login for cookie pickup
- Include `credentials: 'include'` in all fetch calls
- Hash codes with HMAC-SHA256 (never store plain)
- Magic Code: max 3 attempts, 5-minute expiration
- PIN: max 5 attempts, 15-minute lockout, expires at midnight UTC
- httpOnly cookies with secure flag (production) and sameSite=lax
- JWT validation on every protected request

**Testing**:
- [ ] Test Magic Code flow end-to-end (send → verify → login)
- [ ] Test PIN flow end-to-end (enter → verify → login)
- [ ] Test attempt limiting (codes and PINs)
- [ ] Test expiration (codes and PINs)
- [ ] Test role-based access (admin vs user features)
- [ ] Test logout (cookie cleared)
- [ ] Test protected routes (redirect to signin)
- [ ] Test audit logging (all attempts tracked)

**⚠️ Do not proceed until all items are complete and tested.**

---

## Step 3b: Verify Authentication Implementation (IF ALREADY IMPLEMENTED)

**Status**: Authentication system is already in place.

**Database verification**:
- [ ] `users` table exists with UUID PK and role column
- [ ] `verification_code` table exists with hashed codes
- [ ] `pin_auth` table exists with lockout logic
- [ ] `auth_log` table exists for audit trail
- [ ] All indexes present and functional

**Server actions verification**:
- [ ] sendMagicCode: generates, hashes, stores, sends email
- [ ] verifyMagicCode: validates hash, checks expiration, creates JWT, sets cookie
- [ ] verifyPin: validates PIN, handles lockout, creates JWT with midnight expiration
- [ ] logout: clears auth_session cookie

**API routes verification**:
- [ ] GET /api/auth/user: returns current user from JWT
- [ ] POST /api/auth/logout: clears cookie
- [ ] GET /api/admin/users: lists users (admin only)
- [ ] Admin endpoints for user management functional

**Frontend verification**:
- [ ] Sign-in page works (email → code flow)
- [ ] PIN page works (4-digit entry)
- [ ] CodeInput component functional (6-digit boxes, paste support)
- [ ] UserHeader component displays correctly
- [ ] useUser hook fetches user data
- [ ] Protected routes redirect to signin

**Security verification**:
- [ ] Codes hashed with HMAC-SHA256
- [ ] Attempt limiting enforced (3 for codes, 5 for PINs)
- [ ] Expiration enforced (5 min codes, midnight UTC for PINs)
- [ ] httpOnly cookies set correctly
- [ ] JWT validated on protected routes
- [ ] User enumeration prevented (generic error messages)
- [ ] Audit logging working

**If all items verified**: Implementation is complete and production-ready.

**If issues found**: Refer to "Common Issues & Solutions" section in nextjs-auth-guide.md.

---

## Step 3c: Migrate from Existing Auth System (IF OTHER AUTH EXISTS)

**Decision**: Determine if migration to new authentication system is necessary.

**Questions to answer**:
1. What is the current auth system? (e.g., NextAuth.js, Neon Auth, custom session-based)
2. Is it working well in production?
3. Do you need Magic Code + PIN + RBAC features?

**If keeping current system**: No action needed. This workflow is complete.

**If migrating to new authentication**:

1. **Plan migration**:
   - Backup current auth tables
   - Create new users, verification_code, pin_auth, auth_log tables
   - Decide on user data migration strategy
   - Plan cutover timing

2. **Implement new authentication**:
   - Follow Step 3a implementation checklist
   - Run database migrations
   - Deploy new auth code

3. **Test thoroughly**:
   - Verify new auth system works
   - Test Magic Code flow
   - Test PIN flow
   - Test role-based access
   - Verify protected routes redirect correctly

4. **Migrate existing users** (if applicable):
   - Copy user data to new users table
   - Invalidate old sessions
   - Notify users of auth system change

5. **Remove old auth system**:
   - Delete old auth tables/code
   - Remove old auth environment variables
   - Update middleware/route protection
   - Remove old auth dependencies from package.json

**⚠️ Do not remove old auth system until new system is fully tested and users are migrated.**

---

## Workflow Completion Checklist

Before considering auth setup complete, verify:
- ✅ Auth system status determined (no auth / new system / other)
- ✅ If building: All database, server actions, API routes, and frontend items complete
- ✅ If already implemented: All verification items confirmed
- ✅ If migrating: Migration plan executed and tested
- ✅ Database schema correct and indexed
- ✅ Environment variables configured (JWT_SECRET, OTP_SECRET_KEY, DATABASE_URL, RESEND_API_KEY)
- ✅ Magic Code flow tested end-to-end
- ✅ PIN flow tested end-to-end (if applicable)
- ✅ Role-based access control working
- ✅ Protected routes redirect correctly
- ✅ Email sending works
- ✅ Admin management functional
- ✅ Audit logging functional
- ✅ All security measures verified (hashing, attempt limiting, expiration, httpOnly cookies)

Only after all items are checked should you consider auth setup complete.

---

## Troubleshooting

**Issue**: Don't know current auth system status  
→ Run `cmd /c node .windsurf\tools\schema-query.js --index` to inspect database tables

**Issue**: Need implementation details  
→ Refer to `/.windsurf/guides/nextjs-auth-guide.md` for complete guide

**Issue**: Cookie not persisting after login  
→ Use `window.location.href` (hard redirect) not `router.push()` to ensure cookie pickup

**Issue**: API returns 401 Unauthorized  
→ Add `credentials: 'include'` to fetch calls to send cookies

**Issue**: Code doesn't auto-submit  
→ Pass `onComplete` callback to CodeInput component

**Issue**: User enumeration possible  
→ Return generic error message if email not found (don't reveal if user exists)

**Issue**: PIN lockout can't be cleared  
→ Add `POST /api/admin/users/[id]/clear-lockout` endpoint

**Issue**: Need to restart workflow  
→ Run `/setup-auth` again from the beginning
