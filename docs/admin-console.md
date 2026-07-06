# Admin Console Architecture

This document explains how the EduthArt admin console works after the
server-side security refactor.

## Why We Changed It

The old admin console called Firebase Cloud Functions directly from the browser
with `httpsCallable(...)`.

That worked only if Google Cloud allowed public invoker access on those
callable endpoints. In this project, Cloud Functions invocation was blocked by
Google Cloud IAM and org policy, which caused the admin UI to fail even for
real admin users.

The new design follows a more standard admin-console pattern:

1. The browser signs in with Firebase Auth.
2. The browser sends the Firebase ID token to the Next.js server.
3. The Next.js server creates an HTTP-only admin session cookie.
4. The browser talks only to Next.js admin API routes.
5. Those server routes verify the admin session and use Firebase Admin SDK for
   privileged work.

This removes the admin UI's dependency on public Cloud Functions invoker
permissions.

## High-Level Flow

### Sign-in

Files:

- [site/src/app/admin/login/page.tsx](/Users/izzyyoung/code/eduthart/site/src/app/admin/login/page.tsx)
- [site/src/components/admin/admin-auth-provider.tsx](/Users/izzyyoung/code/eduthart/site/src/components/admin/admin-auth-provider.tsx)
- [site/src/app/api/admin/session/route.ts](/Users/izzyyoung/code/eduthart/site/src/app/api/admin/session/route.ts)

Flow:

1. The user signs in with Firebase client auth in the browser.
2. The client fetches a fresh Firebase ID token.
3. The client sends that ID token to `POST /api/admin/session`.
4. The server verifies the ID token with Firebase Admin SDK.
5. The server checks whether the user is an admin/super admin.
6. If valid, the server creates an HTTP-only session cookie:
   `memdojo_admin_session`
7. The client stores no privileged token manually; subsequent admin requests
   rely on the cookie.

### Admin API requests

Files:

- [site/src/lib/admin/api.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/api.ts)
- [site/src/lib/admin/route.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/route.ts)
- [site/src/lib/admin/server.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/server.ts)
- [site/src/app/api/admin](/Users/izzyyoung/code/eduthart/site/src/app/api/admin)

Flow:

1. The browser calls a Next.js route like `/api/admin/access` or
   `/api/admin/users`.
2. The route reads the HTTP-only admin session cookie.
3. The route verifies that cookie with Firebase Admin SDK.
4. The route checks admin or super-admin access.
5. The route performs the requested Firestore/Auth operation on the server.
6. JSON is returned to the browser.

## Security Model

### What the browser can do

The browser can:

- Sign in with Firebase Auth
- Hold the normal Firebase client session
- Send requests to the Next.js admin API routes

The browser cannot:

- Directly use Firebase Admin SDK
- Read the HTTP-only admin session cookie value
- Call privileged Firestore/Auth operations without passing server checks

### What the server does

The Next.js server:

- Verifies Firebase ID tokens
- Issues session cookies
- Verifies session cookies
- Checks admin roles
- Reads and writes privileged Firebase data

### Why this is safer

Compared with public browser-to-callable admin functions, this design:

- avoids dependence on `allUsers` Cloud Functions invoker
- centralizes admin authorization in one server layer
- keeps privileged Firebase Admin SDK access off the client
- gives us a cleaner place to add audit logging, rate limiting, or IP checks

## Required Environment Variables

Files:

- [site/.env.example](/Users/izzyyoung/code/eduthart/site/.env.example)
- [site/src/lib/firebase/admin.ts](/Users/izzyyoung/code/eduthart/site/src/lib/firebase/admin.ts)

Required for the Next.js runtime:

```bash
FIREBASE_ADMIN_PROJECT_ID=eduthart-d62de
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:

- `FIREBASE_ADMIN_PRIVATE_KEY` should preserve newline formatting.
- In hosted environments, the private key is usually stored with escaped
  newlines. The server code converts `\\n` back into real newlines.
- If these are not present, the code falls back to `applicationDefault()`.
  That only works if the hosting environment already has valid Google
  application credentials.

## Role Checks

File:

- [site/src/lib/admin/server.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/server.ts)

Important helpers:

- `getAdminAccessStatus(decodedToken)`
- `requireAdmin(decodedToken)`
- `requireSuperAdmin(decodedToken)`

These functions:

- verify that the session belongs to a signed-in Firebase user
- sync bootstrap super-admin access when needed
- read `admin_roles` from Firestore
- fall back to custom claims if already set

Bootstrap super admins are currently:

- `izzy@hendecalabs.com`
- `tenthyoung@gmail.com`

## Main Server Files

### Firebase Admin bootstrap

File:

- [site/src/lib/firebase/admin.ts](/Users/izzyyoung/code/eduthart/site/src/lib/firebase/admin.ts)

Responsibilities:

- initialize Firebase Admin app
- create Auth and Firestore admin clients
- read environment credentials

### Shared admin backend logic

File:

- [site/src/lib/admin/server.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/server.ts)

Responsibilities:

- session creation helpers
- session verification
- admin role enforcement
- Firestore/Auth admin operations
- shared business logic for roles, moderation, refunds, and user lookup

### Route helpers

File:

- [site/src/lib/admin/route.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/route.ts)

Responsibilities:

- read the admin session cookie
- verify the session
- normalize route errors into JSON responses

## API Route Map

Directory:

- [site/src/app/api/admin](/Users/izzyyoung/code/eduthart/site/src/app/api/admin)

Routes:

- `POST /api/admin/session`
  Creates an HTTP-only admin session from a Firebase ID token.

- `DELETE /api/admin/session`
  Clears the admin session cookie.

- `GET /api/admin/access`
  Returns current admin access status.

- `GET /api/admin/users`
  Searches users by username or email.

- `GET /api/admin/users/[uid]`
  Returns a full user admin detail payload.

- `POST /api/admin/users/[uid]/moderation`
  Updates account moderation state.

- `GET /api/admin/roles`
  Lists active admin roles.

- `POST /api/admin/roles`
  Grants an admin role. Super admin only.

- `DELETE /api/admin/roles/[uid]`
  Revokes an admin role. Super admin only.

- `GET /api/admin/moderation`
  Returns the open deck moderation queue.

- `GET /api/admin/public-decks/[publicDeckId]`
  Returns public deck moderation details.

- `POST /api/admin/public-decks/[publicDeckId]/moderation`
  Applies deck moderation.

- `GET /api/admin/refunds`
  Returns refund requests.

- `POST /api/admin/refunds/[refundRequestId]`
  Updates refund request state.

## Client-Side Files

### Client API wrapper

File:

- [site/src/lib/admin/api.ts](/Users/izzyyoung/code/eduthart/site/src/lib/admin/api.ts)

This is now a thin fetch wrapper around Next.js admin routes. It no longer
calls Firebase Cloud Functions.

### Auth provider

File:

- [site/src/components/admin/admin-auth-provider.tsx](/Users/izzyyoung/code/eduthart/site/src/components/admin/admin-auth-provider.tsx)

Responsibilities:

- sign in with Firebase Auth
- create the server-side admin session
- refresh access state from `/api/admin/access`
- clear the session on sign-out

## Operational Notes

### Deployments

For the admin console to work in production:

1. The Next.js deployment must have the Firebase Admin env vars configured.
2. The site must be rebuilt/redeployed after env changes.

Cloud Functions public invoker access is no longer required for the admin UI.

### Local development

If running locally, you need either:

- the Firebase Admin env vars above, or
- valid Google application default credentials

### Debugging

If admin access fails:

1. Confirm the user can sign in with Firebase Auth.
2. Confirm `POST /api/admin/session` succeeds.
3. Confirm the `memdojo_admin_session` cookie is being set.
4. Confirm the server has valid Firebase Admin credentials.
5. Confirm the user is in `admin_roles` or is a bootstrap super admin.

## Future Improvements

Good next steps if we want to harden this further:

- add audit logging around role changes and moderation actions
- add server-side rate limiting for admin routes
- add CSRF protection if the admin surface grows beyond same-site usage
- move repeated admin business logic into a shared package if both site and
  functions continue to need it
