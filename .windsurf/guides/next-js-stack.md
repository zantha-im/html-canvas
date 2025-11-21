# Next.js Stack: App Router Architecture

**All new Next.js projects MUST use App Router. This is the foundational architectural decision.**

---

## ⛔ MANDATORY: App Router Only

**Pages Router is deprecated and not supported. Do not use it under any circumstances.**

### Why App Router is Required

App Router is the modern, supported architecture for Next.js projects. It provides:

- **Server Components by default**: Automatic code splitting, reduced client bundle size
- **Middleware at the edge**: Route protection before app execution
- **Server Actions**: Direct server function calls from client components (no API routes needed)
- **Route Handlers**: Modern API routes with full request/response control
- **Layout-based context**: Efficient session and state propagation
- **Streaming and Suspense**: Progressive rendering for better UX
- **Neon Auth Stack compatibility**: Required for modern authentication

### Why Pages Router is Deprecated

Pages Router lacks critical modern features:
- ❌ No server components; everything is client-side by default
- ❌ No middleware at the edge; limited route protection
- ❌ No server actions; requires separate API routes for every operation
- ❌ Manual session management in `_app.tsx`
- ❌ No streaming or progressive rendering
- ❌ Incompatible with Neon Auth Stack
- ❌ Refactoring from Pages Router to App Router is a massive undertaking

**Starting with Pages Router means a complete app refactor later. Do not do this.**

---

## App Router Project Structure

### Recommended Directory Layout

```
app/
├── layout.tsx                 # Root layout (session, providers)
├── page.tsx                   # Home page
├── middleware.ts              # Edge middleware (route protection)
│
├── (auth)/                    # Auth route group
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   └── actions.ts             # Server actions for auth
│
├── (dashboard)/               # Protected route group
│   ├── layout.tsx             # Dashboard layout
│   ├── page.tsx               # Dashboard home
│   └── [id]/
│       └── page.tsx
│
├── api/                       # API routes (route handlers)
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts
│   └── protected/
│       └── route.ts
│
└── lib/
    ├── auth.ts                # Auth utilities
    ├── session.ts             # Session management
    └── db.ts                  # Database client
```

### Key Principles

- **Route groups** `(name)` organize code without affecting URLs
- **Server actions** in `actions.ts` files for mutations and auth operations
- **Route handlers** in `api/` for external integrations and webhooks
- **Layouts** provide context and shared UI to child routes
- **Middleware** protects routes at the edge before app execution

---

## Core App Router Patterns

### 1. Middleware for Route Protection

Protect routes at the edge before they reach your app:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@neon-auth/stack'

export async function middleware(request: NextRequest) {
  const session = await auth()
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/dashboard/:path*', '/api/protected/:path*'] }
```

### 2. Server Actions for Auth

Use server actions for login, logout, and mutations (no API routes needed):

```typescript
// app/(auth)/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { auth } from '@neon-auth/stack'

export async function loginAction(email: string, password: string) {
  try {
    const session = await auth.login({ email, password })
    if (!session) return { error: 'Invalid credentials' }
    redirect('/dashboard')
  } catch (err) {
    return { error: err.message }
  }
}
```

### 3. Route Handlers for Callbacks

Use route handlers for OAuth callbacks:

```typescript
// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@neon-auth/stack'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  
  try {
    const session = await auth.handleCallback(code)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 })
  }
}
```

### 4. Layout-Based Session Context

Fetch session once in root layout; provide to all children:

```typescript
// app/layout.tsx
import { auth } from '@neon-auth/stack'
import { SessionProvider } from '@/context/session'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html>
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

### 5. Server Components by Default

Keep sensitive logic on the server:

```typescript
// app/(dashboard)/users/page.tsx (Server Component)
import { auth } from '@neon-auth/stack'
import { db } from '@/lib/db'

export default async function UsersPage() {
  const session = await auth()
  if (!session) return <div>Not authenticated</div>
  
  const users = await db.users.findAll() // Never exposed to client
  return <div>{users.map(u => <div key={u.id}>{u.email}</div>)}</div>
}
```

---

## Common Pitfalls to Avoid

### ❌ DO NOT: Use Pages Router
**Pages Router is deprecated. Do not use it under any circumstances.**

### ❌ DO NOT: Fetch Session in Every Component
```typescript
// BAD: Redundant fetches
useEffect(() => { auth().then(setSession) }, [])
```

### ✅ DO: Fetch Session Once in Layout
Session fetched in root layout is available to all children via context.

### ❌ DO NOT: Expose Secrets to Client Components
```typescript
// BAD: Database URL in client code
'use client'
const db = new Database(process.env.DATABASE_URL)
```

### ✅ DO: Keep Secrets on the Server
Database access only in server components/actions.

---

## Testing

Mock Neon Auth; use deterministic fixtures:

```typescript
jest.mock('@neon-auth/stack', () => ({
  auth: { login: jest.fn().mockResolvedValue({ user: { id: '123' } }) }
}))

test('loginAction returns error on invalid credentials', async () => {
  auth.login.mockRejectedValueOnce(new Error('Invalid'))
  const result = await loginAction('test@example.com', 'wrong')
  expect(result.error).toBe('Invalid')
})
```

---

## Migration from Pages Router

If you have an existing Pages Router project:

1. Create App Router structure alongside Pages Router
2. Migrate routes incrementally
3. Test each migrated route
4. Delete `pages/` directory once complete
5. Move `_middleware.ts` to root `middleware.ts`

**Timeline**: 2–4 weeks depending on project size.

---

## Decision Tree

```
Starting a new Next.js project?
├─ Yes → Use App Router (mandatory)
├─ Existing Pages Router project?
│  ├─ Adding auth? → Plan migration to App Router first
│  └─ No auth yet? → Still migrate to App Router (future-proof)
└─ Using Neon Auth Stack? → App Router is required
```

---

## Summary

- **App Router is mandatory** for all new Next.js projects
- **Pages Router is deprecated** and not supported
- **Key features**: Server components, middleware, server actions, route handlers
- **Neon Auth Stack requires App Router**
- **Refactoring cost is massive**: Do not start with Pages Router

Start with App Router. It is the correct architectural foundation.
