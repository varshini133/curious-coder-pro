## Why there's no instructor login

There is only one login. The sign-up form (`src/routes/auth.tsx`) never asks for a role and never calls the existing `claimRole` server function, so every new account falls through to the default in `getAccount` and becomes a **student**. The instructor dashboard, sidebar and pages already exist — nothing can reach them because no account is ever marked as an instructor.

## Plan

1. **Role picker on sign-up**
   Add a two-option toggle ("I'm a Student" / "I'm an Instructor") to the sign-up view of the auth page, styled with the existing gradient/soft-shadow cards. Hidden in sign-in mode (role comes from the database there).

2. **Persist the choice**
   After a successful email sign-up — and after Google sign-in when it's a first-time account — call the existing `claimRole` function with the selected role before navigating. Store the pending choice so the Google redirect round-trip doesn't lose it.

3. **Route to the right home**
   Send instructors to `/instructor` and students to `/dashboard` after sign-in/sign-up, instead of always `/dashboard`.

4. **Role switch for demos**
   Add a "Switch to instructor / student view" control on the Profile page so an existing account (including yours) can flip roles without creating a new one — useful for the project demo. Backed by a small server function that updates `user_roles` for the caller only.

### Technical notes
- `claimRole` currently no-ops if a role row already exists; the new switch function will update the existing row instead.
- Role is read via the `account` query, so switching invalidates that query to re-render the sidebar navigation.
- No schema changes needed — `user_roles` and `has_role()` already exist.
