import Stripe from 'stripe'

/** Read an env var or throw — billing routes must fail loudly, never default. */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

let stripeClient: Stripe | null = null

/**
 * Lazily construct the Stripe client so a missing key fails at request time
 * with a clear message rather than crashing the build. The Academy shares
 * the Arete Stripe account: the same STRIPE_SECRET_KEY and price ids as
 * app.pursuearete.com, and the same webhook (registered there) writes the
 * resulting entitlement to profiles — the Academy only starts Checkout.
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv('STRIPE_SECRET_KEY'))
  }
  return stripeClient
}
