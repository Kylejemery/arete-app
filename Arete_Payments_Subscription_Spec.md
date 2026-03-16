# Arete App — Payments & Subscription Spec

*For GitHub Copilot. This spec covers the full subscription and payments implementation: Stripe for web, App Store / Google Play for mobile, subscription status synced in Supabase, and feature gating across both surfaces. Implement after the database and authentication spec is complete and confirmed working.*

---

## 1. Overview

Arete uses a freemium model — a free tier with genuine value and a premium tier that unlocks the depth features. Payments are handled differently depending on the surface:

- **Mobile (iOS/Android):** In-app purchase via Apple App Store and Google Play. Required by both platforms for digital subscriptions.
- **Web:** Direct payment via Stripe. Better margin, full control.

Subscription status is stored in Supabase and checked on every surface. A user who subscribes on any surface gets premium access everywhere.

---

## 2. Tier Definitions

### Free Tier
- Morning check-in — unlimited
- Evening check-in — unlimited
- Basic journal — Reflection, Quote, and Idea entries, unlimited
- Canon view — read-only, can view encoded beliefs but cannot create new ones
- Cabinet access during check-ins only

### Premium Tier
- Everything in the free tier
- Belief Journal — full 3-stage refinement process, Canon building
- Progress tracker — habit logging, milestones, weekly review generator
- Reading tracker
- Extended cabinet conversations outside of check-ins
- Real-time sync across mobile and web
- Full web app access

### Pricing
- Monthly: $9.99/month
- Annual: $79.99/year (equivalent to $6.67/month — surface this saving clearly in the UI)

---

## 3. Supabase — Subscription Status

Add subscription fields to the `profiles` table:

```sql
alter table profiles add column subscription_status text default 'free'
  check (subscription_status in ('free', 'premium', 'cancelled', 'past_due'));
alter table profiles add column subscription_tier text default 'free'
  check (subscription_tier in ('free', 'monthly', 'annual'));
alter table profiles add column subscription_start timestamptz;
alter table profiles add column subscription_end timestamptz;
alter table profiles add column stripe_customer_id text;
alter table profiles add column stripe_subscription_id text;
```

`subscription_status` is the source of truth for feature gating on both mobile and web. Always check this field — do not check payment provider status directly in the frontend.

---

## 4. Web Payments — Stripe

### 4.1 Setup
- Create a Stripe account at stripe.com
- Create two products in the Stripe dashboard: Monthly ($9.99) and Annual ($79.99)
- Note the price IDs for both — these go into environment variables

**Add to `server/` Railway environment variables:**
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
STRIPE_MONTHLY_PRICE_ID=your_monthly_price_id
STRIPE_ANNUAL_PRICE_ID=your_annual_price_id
```

**Add to `web/` `.env.local`:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
```

### 4.2 Install Stripe

**Backend:**
```
npm install stripe
```

**Web frontend:**
```
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 4.3 Backend Endpoints

Add these endpoints to `server/index.js`:

**POST `/api/stripe/create-checkout-session`**
- Receives: `{ userId, priceId, email }`
- Creates or retrieves a Stripe customer for this user
- Creates a Stripe Checkout session
- Returns: `{ url }` — redirect the user to this URL to complete payment
- On success, Stripe redirects to `/app/subscription/success`
- On cancel, Stripe redirects to `/app/subscription/cancelled`

**POST `/api/stripe/webhook`**
- Receives Stripe webhook events
- Must verify webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handle these events:
  - `checkout.session.completed` → set `subscription_status = 'premium'` in Supabase
  - `invoice.payment_succeeded` → confirm premium status, update `subscription_end`
  - `invoice.payment_failed` → set `subscription_status = 'past_due'`
  - `customer.subscription.deleted` → set `subscription_status = 'cancelled'`
- All status updates write to the `profiles` table in Supabase using the service role key

**POST `/api/stripe/create-portal-session`**
- Receives: `{ userId }`
- Creates a Stripe Customer Portal session so the user can manage or cancel their subscription
- Returns: `{ url }` — redirect the user to this URL

### 4.4 Web Upgrade Flow

When a free user hits a premium feature:
1. Show a paywall modal (see Section 6)
2. User selects monthly or annual
3. Frontend calls `/api/stripe/create-checkout-session`
4. Redirect to Stripe Checkout
5. On success, Stripe webhook fires → Supabase updated → user has premium access

### 4.5 Webhook Setup
- In the Stripe dashboard, add a webhook endpoint pointing to your Railway backend: `https://your-railway-url/api/stripe/webhook`
- Listen for: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`

---

## 5. Mobile Payments — In-App Purchase

### 5.1 Overview
Apple and Google require in-app purchases for digital subscriptions on mobile. Use the `expo-iap` library (or `react-native-purchases` via RevenueCat — see note below).

**Recommended approach: RevenueCat**

RevenueCat is a third-party service that abstracts Apple and Google in-app purchase complexity into a single SDK. It handles receipt validation, subscription status, and webhooks. It costs nothing up to $2,500 monthly revenue. Strongly recommended over implementing raw StoreKit / Google Play Billing directly.

```
npx expo install react-native-purchases
```

### 5.2 RevenueCat Setup
- Create a RevenueCat account at revenuecat.com
- Connect your App Store Connect and Google Play accounts
- Create an Entitlement called `premium`
- Create two Packages: `monthly` ($9.99) and `annual` ($79.99)
- Note your RevenueCat API keys (one for iOS, one for Android)

**Add to `app/` `.env`:**
```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
```

### 5.3 RevenueCat Initialization

In `app/lib/purchases.ts`:

```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export const initializePurchases = (userId: string) => {
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey, appUserID: userId });
};
```

Call `initializePurchases` after the user is authenticated, passing their Supabase user ID.

### 5.4 Purchase Flow — Mobile

```typescript
import Purchases from 'react-native-purchases';

// Get available packages
const offerings = await Purchases.getOfferings();
const monthly = offerings.current?.monthly;
const annual = offerings.current?.annual;

// Purchase
const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

// Check entitlement
const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
```

### 5.5 Syncing Mobile Purchase Status to Supabase

RevenueCat supports webhooks. Set up a RevenueCat webhook pointing to a new backend endpoint:

**POST `/api/revenuecat/webhook`** in `server/index.js`:
- Receives RevenueCat subscription events
- Handle: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`
- On purchase/renewal → set `subscription_status = 'premium'` in Supabase
- On cancellation/expiration → set `subscription_status = 'cancelled'`
- Match the user by their Supabase user ID (passed as `appUserID` to RevenueCat)

### 5.6 Restore Purchases
Always provide a "Restore Purchases" button in the app settings. Required by Apple.

```typescript
const restore = async () => {
  const customerInfo = await Purchases.restorePurchases();
  const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
  // Update UI accordingly
};
```

---

## 6. Feature Gating

### 6.1 The Gate Check

Create a shared hook for checking subscription status:

**Mobile — `app/hooks/useSubscription.ts`:**
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useSubscription = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      setIsPremium(data?.subscription_status === 'premium');
      setLoading(false);
    };

    checkStatus();
  }, []);

  return { isPremium, loading };
};
```

Create the equivalent in `web/src/hooks/useSubscription.ts`.

### 6.2 Gated Features

Apply the gate check before rendering these features on both mobile and web:

| Feature | Free | Premium |
|---|---|---|
| Morning check-in | ✓ | ✓ |
| Evening check-in | ✓ | ✓ |
| Journal — Reflection, Quote, Idea | ✓ | ✓ |
| Canon view — read only | ✓ | ✓ |
| Belief Journal — full process | ✗ | ✓ |
| Canon — create new beliefs | ✗ | ✓ |
| Progress tracker | ✗ | ✓ |
| Reading tracker | ✗ | ✓ |
| Extended cabinet conversations | ✗ | ✓ |
| Real-time sync | ✗ | ✓ |
| Web app access | ✗ | ✓ |

### 6.3 Paywall Modal

When a free user taps a premium feature, show a paywall modal rather than an error. The modal should:

- Name the feature they tried to access
- Briefly explain what premium unlocks (2-3 lines maximum)
- Show both pricing options: monthly ($9.99) and annual ($79.99/year — save 33%)
- Have a clear CTA: "Start Premium"
- Have a subtle dismiss option: "Maybe later"
- Match the dark navy + gold design language

Do not use the word "upgrade" — use "Start Premium" or "Unlock Arete."

### 6.4 Empty Canon State

The Canon view is visible to free users but shows zero encoded beliefs (because they cannot create any). The empty state should not feel broken — it should feel like an invitation. Suggested empty state copy:

*"Your Canon is where your encoded beliefs live. Start your first Belief Journal entry to build it."*

With a "Start Premium" button below.

---

## 7. Subscription Management

### 7.1 Mobile
- Managed through Apple / Google natively
- Provide a "Manage Subscription" link in app settings that opens the native subscription management screen
- Provide a "Restore Purchases" button (required by Apple)

### 7.2 Web
- "Manage Subscription" link in account settings calls `/api/stripe/create-portal-session` and redirects to Stripe Customer Portal
- Users can upgrade, downgrade (monthly ↔ annual), or cancel from the portal

### 7.3 Cancellation Behavior
- On cancellation, `subscription_status` moves to `cancelled` when the current period ends (not immediately)
- User retains premium access until `subscription_end` date
- After that date, they revert to free tier
- Do not delete any user data on cancellation — beliefs, journal entries, and all history are retained

---

## 8. Order of Implementation

Implement in this exact order. Confirm each step before proceeding.

1. Add subscription fields to `profiles` table in Supabase
2. Stripe account created, products and prices set up, environment variables in place
3. Backend endpoint — `create-checkout-session` built and tested
4. Backend endpoint — `webhook` built, signature verification confirmed
5. Backend endpoint — `create-portal-session` built and tested
6. Web paywall modal built
7. Web upgrade flow tested end-to-end — free user hits gate, pays, gets premium access
8. Webhook confirmed updating Supabase correctly
9. `useSubscription` hook built and working on web
10. Feature gating applied to all premium features on web
11. RevenueCat account created, App Store and Google Play connected
12. Mobile purchase flow built and tested (sandbox)
13. RevenueCat webhook built and confirmed updating Supabase
14. `useSubscription` hook built and working on mobile
15. Feature gating applied to all premium features on mobile
16. Restore purchases button added to mobile settings
17. End-to-end test: subscribe on mobile, confirm premium access on web

---

## 9. Important Notes for Copilot

- **Never gate the check-ins.** Morning and evening check-ins must always be free. This is the hook that builds the habit. Do not add any usage limits to check-ins.
- **Never delete user data on cancellation.** A cancelled user who resubscribes should find everything exactly where they left it.
- **Always use `subscription_status` in Supabase as the source of truth** — not the payment provider directly. The webhook keeps Supabase in sync. The frontend only ever checks Supabase.
- **The paywall is an invitation, not a wall.** The copy and design should feel like an offer, not a punishment. The user is one tap away from unlocking something genuinely valuable.
- **Test in sandbox before going live.** Both Stripe and RevenueCat have sandbox/test modes. Use them fully before switching to live keys.

---

*If anything in this spec is ambiguous, ask before building. Do not implement payments logic without fully understanding each step — mistakes here involve real money.*
