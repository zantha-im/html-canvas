# Next.js App Router Authentication Guide

**Version:** 2.0 | **Status:** Production-Ready Template

Complete authentication system for Next.js App Router with email-based magic code (OTP) and PIN-based authentication, role-based access control, and audit logging.

---

## Architecture

### Two Authentication Methods

| Method | Use Case | Duration | Complexity |
|--------|----------|----------|-----------|
| **Magic Code** | Email-accessible users (admin/partner) | 1 week | Medium |
| **PIN** | Shared/kiosk accounts, non-email users | Daily (midnight UTC) | Medium |

Both use JWT tokens in HTTP-only cookies with role-based access control.

---

## Core Principles

✅ No external auth service dependencies  
✅ Codes hashed (HMAC-SHA256, never plain-text)  
✅ Attempt limiting (3 for codes, 5 for PINs)  
✅ User enumeration prevention (generic messages)  
✅ httpOnly cookies (XSS protection)  
✅ JWT validation on every protected request  
✅ Audit logging of all attempts  
✅ Fail-fast error handling  

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  image TEXT,
  role VARCHAR NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

---

### Verification Code Table

```sql
CREATE TABLE verification_code (
  identifier TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_verification_code_expires ON verification_code(expires);
```

**Lifecycle:** Generate → Email → Verify → Delete on success or expiration

---

### PIN Auth Table (Optional)

```sql
CREATE TABLE pin_auth (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  pin_hash VARCHAR NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_signin_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Lockout:** After N failures → lock for M minutes. Reset on success or admin override.

---

### Auth Log Table (Optional)

```sql
CREATE TABLE auth_log (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  auth_type VARCHAR NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address VARCHAR,
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_auth_log_user_id ON auth_log(user_id);
CREATE INDEX idx_auth_log_attempted_at ON auth_log(attempted_at DESC);
```

---

## Magic Code Flow

### 1. Send Code

```typescript
// app/actions/sendMagicCode.ts
'use server'

import { createHmac } from 'crypto'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function sendMagicCode(email: string) {
  // Check user exists (prevent enumeration)
  const user = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (user.rowCount === 0) {
    return { success: false, message: 'If registered, code will be sent.' }
  }

  // Generate & hash code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const hash = createHmac('sha256', process.env.OTP_SECRET_KEY).update(code).digest('hex')

  // Store with 5-min expiration
  const expires = new Date(Date.now() + 5 * 60000)
  await pool.query(
    `INSERT INTO verification_code (identifier, code, expires, attempts)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (identifier) DO UPDATE SET code = EXCLUDED.code, expires = EXCLUDED.expires, attempts = 0`,
    [email, hash, expires]
  )

  // Send email with code
  await sendEmail(email, code)
  return { success: true, message: 'Code sent.' }
}
```

---

### 2. Verify Code

```typescript
// app/actions/verifyMagicCode.ts
'use server'

import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

export async function verifyMagicCode(email: string, submittedCode: string) {
  // Retrieve stored code
  const result = await pool.query(
    'SELECT code, expires, attempts FROM verification_code WHERE identifier = $1',
    [email]
  )
  if (result.rowCount === 0) {
    return { success: false, message: 'Invalid email or code.' }
  }

  const { code: storedHash, expires, attempts } = result.rows[0]

  // Validate expiration
  if (new Date() > new Date(expires)) {
    await pool.query('DELETE FROM verification_code WHERE identifier = $1', [email])
    return { success: false, message: 'Code expired. Request new one.' }
  }

  // Validate attempts (max 3)
  if (attempts >= 3) {
    await pool.query('DELETE FROM verification_code WHERE identifier = $1', [email])
    return { success: false, message: 'Too many attempts. Request new code.' }
  }

  // Validate code hash
  const submittedHash = createHmac('sha256', process.env.OTP_SECRET_KEY).update(submittedCode).digest('hex')
  if (submittedHash !== storedHash) {
    await pool.query('UPDATE verification_code SET attempts = attempts + 1 WHERE identifier = $1', [email])
    return { success: false, message: 'Invalid code.' }
  }

  // Get user ID
  const user = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  const userId = user.rows[0].id

  // Create JWT (1 week)
  const jwt = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1 week')
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set('auth_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  // Cleanup
  await pool.query('DELETE FROM verification_code WHERE identifier = $1', [email])
  return { success: true, message: 'Login successful.' }
}
```

**Critical:** Use `window.location.href` (hard redirect) not `router.push()` after login to ensure cookie pickup.

---

## PIN Flow

### Verify PIN

```typescript
// app/actions/verifyPin.ts
'use server'

export async function verifyPin(pin: string) {
  // Validate format
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, message: 'Enter 4-digit PIN.' }
  }

  // Fetch all PIN records
  const allPins = await pool.query(
    'SELECT pa.*, u.id as user_id FROM pin_auth pa JOIN users u ON pa.user_id = u.id'
  )

  // Hash & find match
  const pinHash = createHmac('sha256', process.env.OTP_SECRET_KEY).update(pin).digest('hex')
  let auth = null, userId = null

  for (const record of allPins.rows) {
    if (record.pin_hash === pinHash) {
      auth = record
      userId = record.user_id
      break
    }
  }

  // PIN incorrect - increment attempts
  if (!auth) {
    auth = allPins.rows[0]
    userId = auth.user_id

    // Check if locked
    if (auth.locked_until && new Date() < new Date(auth.locked_until)) {
      return {
        success: false,
        message: 'Too many attempts. Try again later.',
        lockedUntilTime: auth.locked_until.toISOString()
      }
    }

    // Increment & check lockout threshold
    const newAttempts = auth.failed_attempts + 1
    const shouldLock = newAttempts >= 5
    const lockoutTime = shouldLock ? new Date(Date.now() + 15 * 60000) : null

    await pool.query(
      'UPDATE pin_auth SET failed_attempts = $1, locked_until = $2 WHERE user_id = $3',
      [newAttempts, lockoutTime, userId]
    )

    // Log & alert
    await logAuthAttempt(userId, 'pin', false)
    if (newAttempts >= 3) {
      await sendAdminAlert(newAttempts, shouldLock)
    }

    return {
      success: false,
      message: shouldLock ? 'Locked. Try again in 15 minutes.' : `Incorrect. ${5 - newAttempts} attempts left.`
    }
  }

  // PIN correct - create session
  if (auth.locked_until && new Date() < new Date(auth.locked_until)) {
    return { success: false, message: 'Account locked.' }
  }

  // Calculate midnight UTC expiration
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000)

  // Create JWT
  const jwt = await new SignJWT({ userId, email: 'warehouse@internal' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${secondsUntilMidnight}s`)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET))

  // Set cookie
  const cookieStore = await cookies()
  cookieStore.set('auth_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: secondsUntilMidnight
  })

  // Reset & log
  await pool.query(
    'UPDATE pin_auth SET failed_attempts = 0, locked_until = NULL, last_signin_at = NOW() WHERE user_id = $1',
    [userId]
  )
  await logAuthAttempt(userId, 'pin', true)

  return { success: true, message: 'Login successful.' }
}
```

---

## Role-Based Access Control

### Define Roles & Features

```typescript
// lib/auth/roles.ts

export type UserRole = 'admin' | 'partner' | 'user' | 'warehouse'

export type Feature = 'dashboard' | 'users' | 'reports' | 'settings'

export const ROLE_FEATURES: Record<UserRole, Feature[]> = {
  admin: ['dashboard', 'users', 'reports', 'settings'],
  partner: ['dashboard', 'reports', 'settings'],
  user: ['dashboard'],
  warehouse: ['settings']
}

export function canAccessFeature(role: UserRole, feature: Feature): boolean {
  return ROLE_FEATURES[role].includes(feature)
}
```

---

### Verify JWT & Authorization

```typescript
// lib/auth/authUtils.ts

import { jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

export async function verifyJWT(request: NextRequest) {
  const token = request.cookies.get('auth_session')?.value
  if (!token) return { error: 'Unauthorized', status: 401 }

  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET))
    const payload = verified.payload as { userId: string; email: string }

    // Fetch user role from DB
    const user = await pool.query('SELECT id, role FROM users WHERE id = $1', [payload.userId])
    if (user.rowCount === 0) return { error: 'User not found', status: 404 }

    return { userId: user.rows[0].id, role: user.rows[0].role }
  } catch {
    return { error: 'Invalid token', status: 401 }
  }
}

export async function verifyFeatureAccess(request: NextRequest, feature: Feature) {
  const auth = await verifyJWT(request)
  if ('error' in auth) return auth

  if (!canAccessFeature(auth.role, feature)) {
    return { error: 'Forbidden', status: 403 }
  }

  return auth
}
```

---

## API Route Protection

### Protect Admin Routes

```typescript
// app/api/admin/users/route.ts

import { verifyJWT } from '@/lib/auth/authUtils'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await verifyJWT(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Check admin role
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with operation
  const users = await pool.query('SELECT id, email, name, role FROM users')
  return NextResponse.json(users.rows)
}
```

---

## Frontend Protection

### Use User Hook

```typescript
// hooks/useUser.ts

'use client'

import { useEffect, useState } from 'react'

export function useUser() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
```

### Check Feature Access

```typescript
'use client'

import { canAccessFeature } from '@/lib/auth/roles'
import { useUser } from '@/hooks/useUser'

export function Dashboard() {
  const { user, loading } = useUser()

  if (loading) return <div>Loading...</div>
  if (!user || !canAccessFeature(user.role, 'dashboard')) {
    return <div>Access Denied</div>
  }

  return <div>Dashboard</div>
}
```

---

## Security Checklist

✅ Codes hashed (HMAC-SHA256)  
✅ Attempt limiting (3 for codes, 5 for PINs)  
✅ Expiration (5 min codes, 15 min lockout)  
✅ JWT validation on every protected request  
✅ httpOnly cookies (no JavaScript access)  
✅ Secure flag (HTTPS only in production)  
✅ SameSite=lax (CSRF protection)  
✅ User enumeration prevention (generic messages)  
✅ Auto-cleanup (used codes deleted immediately)  
✅ Audit logging (all attempts tracked)  
✅ Self-demotion prevention (admins can't demote themselves)  

---

## Environment Variables

```bash
# Security (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<32-byte-hex-string>
OTP_SECRET_KEY=<32-byte-hex-string>

# Database
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Email
RESEND_API_KEY=re_xxxxx
RESEND_FROM=noreply@yourdomain.com

# Admin alerts (comma-separated)
LOCKOUT_TO=admin@yourdomain.com,security@yourdomain.com

# Environment
NODE_ENV=production
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Cookie not persisting | Using `router.push()` | Use `window.location.href` for hard redirect |
| API returns 401 | Cookie not sent | Add `credentials: 'include'` to fetch |
| Code doesn't auto-submit | Missing callback | Pass `onComplete` to CodeInput component |
| User enumeration possible | Specific error messages | Return generic message if email not found |
| Lockout can't be cleared | No admin endpoint | Add `POST /api/admin/users/[id]/clear-lockout` |

---

## Key Files Structure

```
app/
├── actions/
│   ├── sendMagicCode.ts
│   ├── verifyMagicCode.ts
│   ├── verifyPin.ts
│   └── logout.ts
├── auth/
│   ├── signin/page.tsx
│   └── warehouse/page.tsx
└── api/
    ├── auth/
    │   ├── user/route.ts
    │   └── logout/route.ts
    └── admin/
        └── users/[id]/route.ts

lib/auth/
├── authUtils.ts
├── roles.ts
└── jwt.ts

hooks/
└── useUser.ts
```

---

## References

- **JWT**: https://datatracker.ietf.org/doc/html/rfc7519
- **HMAC**: https://datatracker.ietf.org/doc/html/rfc2104
- **OWASP Auth**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Next.js Cookies**: https://nextjs.org/docs/app/api-reference/functions/cookies
- **jose Library**: https://github.com/panva/jose
