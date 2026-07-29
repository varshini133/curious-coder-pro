## Goal

Let email/password users request a reset link by email and set a new password, without changing the existing UI style or project structure.

## What gets built

**1. "Forgot password?" on the sign-in form (`src/routes/auth.tsx`)**
- Small link under the password field, visible only in sign-in mode.
- Clicking switches the card into a lightweight "reset" state: email field + "Send reset link" button + "Back to sign in".
- Sends the reset email with a redirect back to `/reset-password`.
- Reuses the existing `Field` component, inline error box, and toast patterns — same look, no new design elements.

**2. New public page `src/routes/reset-password.tsx`**
- Detects the recovery session arriving from the email link (Supabase sets it from the URL hash) and waits for it before showing the form.
- Form: new password + confirm password, same styling as the auth card.
- Validates minimum 6 characters and that both fields match; maps provider errors to friendly messages via the same helper style already in `auth.tsx`.
- On success: toast, then route the user onward to their dashboard.
- If the link is expired/invalid: clear message plus a link back to `/auth` to request a new one.
- Public route (not under `_authenticated`), with its own page title/description metadata.

## Email delivery

Reset emails will send using Lovable's default sender template — no setup needed for this to work. If you later want the email branded with your own domain and wording, that requires setting up a sender domain you own; happy to do that as a follow-up.

## Not changing

Google sign-in, role selection, routing for existing pages, database schema, styling tokens, and layout all stay as they are.
