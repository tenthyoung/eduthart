# EduthArt

This is the marketing website for EduthArt, built with [Next.js](https://nextjs.org) and bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

It also contains the admin site.

## Getting Started

This site requires Node 20 or newer. If you use `nvm`, run:

```bash
nvm use
```

The checked-in [`.nvmrc`](./.nvmrc) targets Node 20. Starting the site on
older Node releases such as 18.17 can fail before Next.js has a chance to show
its normal version error.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Format the code with:

```bash
npm run format
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin console setup

The `/admin` routes now use server-side Firebase Admin verification instead of
browser-to-Cloud-Functions callables. The Next app needs Firebase Admin
credentials in its runtime environment:

```bash
FIREBASE_ADMIN_PROJECT_ID=eduthart-5dd68
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Use the values from a Firebase service account that can verify auth tokens and
read/write the live admin data. See [`.env.example`](./.env.example) for the
variable names.

For a fuller walkthrough of the admin sign-in flow, session model, route map,
and security rationale, see [docs/admin-console.md](./docs/admin-console.md).

## Custom password reset page

The site now includes a custom Firebase password reset handler at
[`/auth/action`](./src/app/auth/action/page.tsx), styled to match the rest of
EduthArt instead of using the default Firebase-hosted form.

To route password reset emails to this page, update the Firebase Authentication
email template:

1. Open Firebase Console -> Authentication -> Templates.
2. Edit the password reset template.
3. Enable the custom action URL and set it to
   `https://www.eduthart.com/auth/action` in production, or your local/dev
   domain while testing.

The handler expects Firebase's standard `mode`, `oobCode`, `apiKey`, `lang`,
and optional `continueUrl` query parameters.

## How do we get the animations?

1. GSAP
2. Locomotive Scroll
3. Motion

By using...

1. Use the `useScroll` hook from `motion/react` to get the scroll position and locomotive scroll position (to keep things smooth)
2. Use the `useInView` hook from `motion/react` to animate the scroll position
3. Use sticky
4. Use TextSplit with GSAP module, SplitText (also not accessible)
5. use map, so there's different effects
6. Use LERP out
