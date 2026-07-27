## Diagnosis (verified)

I checked the accounts in your auth system. Every email/password account created so far has **no confirmed email** (`email_confirmed_at` is empty), while the Google account is confirmed automatically. The auth logs show sign-in attempts returning `400: Invalid login credentials` — that is exactly what the auth provider returns when the account exists but its email was never confirmed.

So: sign-up *is* working (accounts are created, passwords are stored as bcrypt hashes — never plain text, and the app never touches them). Login fails because confirmation emails are required and your project has no email sending configured, so nobody can ever confirm.

## Fix

1. **Turn on auto-confirm for email sign-ups** in the auth settings, so a new account is usable immediately after sign-up (standard for a demo/college-project build; can be switched back once an email domain is set up).
2. **Confirm the existing unconfirmed accounts** so the users already registered can sign in instead of being permanently locked out.
3. **Better error messages in `src/routes/auth.tsx`** (no UI/layout change, same components):
   - Map "Invalid login credentials" to "Incorrect email or password."
   - Map "User already registered" to a message suggesting sign-in.
   - Map "Email not confirmed" to a clear explanation.
   - Show a success toast on sign-in.
4. **Client-side validation** on the existing form fields: valid email format and minimum password length (6), with inline messaging before the request is sent.
5. **Sign-up session handling**: after `signUp`, verify a session actually exists before routing; if not, fall back to `signInWithPassword` so the user lands on their dashboard reliably.

## Not changing

Routing, layout, styling, Google sign-in flow, database schema, and the role-selection logic all stay exactly as they are. Only `src/routes/auth.tsx` is edited, plus the auth provider setting and a one-time confirmation of existing accounts.
