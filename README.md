# Pvt Diary

Pvt Diary is a private writing app built with React, Vite, React Router, TipTap, and Supabase. It combines personal posts, spaces, tags, shared spaces, profile management, and a lightweight people directory in a clean dark UI.

## Stack

- Frontend: React 19, Vite 8, React Router 7
- Editor: TipTap
- Backend: Supabase Auth, Postgres, Storage, Row Level Security
- Deployment target: Vercel-friendly static frontend talking to Supabase

## Core Features

- Email/password auth plus profile records
- Create, edit, read, and delete diary posts
- Drafts, markdown/rich text, post organization, and calendar view
- Tags and spaces for structuring content
- Shared spaces with membership-based access
- People directory pulled from space memberships
- Profile settings, tag settings, people settings, and space settings
- Keyboard shortcuts including `/` for search and `Ctrl/Cmd + K` for create post

## Routes

- `/` home feed
- `/calendar` calendar view
- `/create` create post
- `/post/:id` read/edit a post
- `/space/:id` view a space
- `/shared/:shareLink` shared space entry
- `/people/:username` person profile view
- `/settings/profile` profile settings
- `/settings/spaces` space settings
- `/settings/people` people settings
- `/settings/tags` tag settings
- `/login`, `/register`, `/forgot-password`, `/reset-password`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Copy [.env.example](/d:/KARTIK/Projs/Pvt-Diary/.env.example) into a local `.env` file and fill in real values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PUBLIC_APP_URL=https://your-app-domain.com
```

### 3. Start the app

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Supabase Setup, Step By Step

This repo already includes SQL schema files:

- [supabase_schema.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_schema.sql)
- [supabase_schema_fresh.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_schema_fresh.sql)
- [supabase_patch_username.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_patch_username.sql)
- [supabase_patch_sharing_fix.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_patch_sharing_fix.sql)
- [supabase_patch_post_pinning.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_patch_post_pinning.sql)
- [supabase_patch_remove_post_activity.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_patch_remove_post_activity.sql)
- [supabase_patch_delete_account.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_patch_delete_account.sql)

For a new deployment, use a fresh Supabase project if possible.

### Recommended path for a fresh project

1. Create a new project in Supabase.
2. Open the SQL editor.
3. Run [supabase_schema.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_schema.sql).
4. In Storage, create the bucket used by the editor for post images if it is not already present.
5. In Project Settings, copy the project URL and anon key.
6. Put those values in your `.env` file or deployment environment variables.
7. Set `VITE_PUBLIC_APP_URL` to your frontend domain.
8. Start the app and create a test account.
9. Verify sign up, login, create post, image upload, spaces, sharing, and settings.

### If your database already exists

1. Compare your existing tables and policies against [supabase_schema.sql](/d:/KARTIK/Projs/Pvt-Diary/supabase_schema.sql).
2. Confirm these objects exist:
   - `profiles`
   - `tags`
   - `spaces`
   - `space_members`
   - `posts`
   - `post_tags`
3. Confirm the `profiles` table has `username`, `display_name`, and `avatar_url`.
4. Confirm `spaces` has `share_link` and `show_in_menu`.
5. Confirm RLS policies for accessible spaces and related memberships are present.
6. If your project is older, apply the patch files only if the relevant fields/policies are missing.

## Deleting All Accounts Before Deployment

The safest production launch path is:

1. Create a brand-new Supabase project for production.
2. Point production env vars to that clean project.
3. Keep the current project for development/testing only.

If you want to reuse the same Supabase project, you must clear both app data and Auth users.

### Step 1: delete public app data

Run this in Supabase SQL Editor:

```sql
truncate table
  public.post_tags,
  public.posts,
  public.space_members,
  public.spaces,
  public.tags,
  public.profiles
restart identity cascade;
```

What this does:

- deletes posts, spaces, tags, memberships, and profiles
- cascades related dependent rows
- does not delete `auth.users`

### Step 2: delete Auth users

You must remove users from Supabase Auth separately. Do this with the Supabase dashboard or server-side admin API using the `service_role` key.

Official docs:

- https://supabase.com/docs/reference/javascript/auth-admin-listusers
- https://supabase.com/docs/reference/javascript/auth-admin-deleteuser

Minimal admin script example:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

const { data: { users } } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000
});

for (const user of users) {
  await supabase.auth.admin.deleteUser(user.id);
}
```

### Step 3: clear Storage if needed

If test users uploaded images, delete those files from your Supabase Storage bucket too. Auth deletion does not automatically clean uploaded files.

## Deployment Checklist

### Environment

- Set `VITE_SUPABASE_URL`
- Set `VITE_SUPABASE_ANON_KEY`
- Set `VITE_PUBLIC_APP_URL`
- Verify the deployed site origin matches the auth redirect settings in Supabase

### Supabase Auth

- Add your production URL to allowed redirect URLs
- Test reset-password flow
- Test register and login from the deployed domain

### Data and Permissions

- Verify RLS policies are active
- Test user isolation between separate accounts
- Test shared space access with a non-owner account
- Test People directory access with real memberships

### Storage

- Confirm the image bucket exists
- Confirm uploads work
- Confirm public URLs resolve correctly

### UI

- Verify desktop layout
- Verify mobile header, mobile menu, and search behavior
- Verify the create-post shortcut and search shortcut

## Is It Production Ready?

Not fully yet.

### What is already in decent shape

- Production build succeeds with `npm run build`
- Main flows exist end-to-end
- Header/sidebar/settings UI is significantly cleaner than the original version
- Routing, auth guards, and Supabase wiring are in place

### What still blocks a confident production release

- Full lint does not pass yet
- There is no proper automated end-to-end test suite
- Main JS bundle is still large
- Manual QA is still needed across auth, create/edit/delete, sharing, people, and mobile
- [src/supabaseClient.js](/d:/KARTIK/Projs/Pvt-Diary/src/supabaseClient.js) contains fallback Supabase credentials in source code, which is not a production-safe pattern

## Recommended Production Hardening

Before launch, I would strongly recommend:

1. Remove hardcoded fallback Supabase URL/key from [src/supabaseClient.js](/d:/KARTIK/Projs/Pvt-Diary/src/supabaseClient.js) and require env vars.
2. Fix the current repo-wide ESLint errors.
3. Add Playwright or similar smoke tests for critical flows.
4. Run a full mobile QA pass on real viewport sizes.
5. Review Storage bucket permissions.
6. Test two-account sharing behavior carefully.
7. Monitor bundle size and split heavier screens if needed.

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
```

## Project Structure

```text
src/
  components/     shared UI pieces
  contexts/       auth/session state
  hooks/          keyboard shortcuts and related hooks
  pages/          route-level screens
  utils/          app helpers, share links, import/export, people directory
  index.css       global theme and base styles
```

## Notes For This Repo

- The app currently assumes Supabase is the source of truth for auth and content.
- The People directory is derived from space memberships, not from a separate social graph.
- Shared links use `VITE_PUBLIC_APP_URL` when generating public URLs.
- Mobile layout has been customized and should always be checked after header/sidebar changes.

## Verification Status

Latest verified locally:

- `npm run build`: passes
- targeted lint for touched files: passes
- full `npm run lint`: still has existing repo-wide failures outside the latest UI changes

## Next Recommended Step

If you want this app pushed closer to a real deployment state, the next best step is to fix the repo-wide lint issues and add an automated smoke test suite before shipping.
