import Stripe from 'stripe'
import { requireEnv } from './supabaseServer'

let stripeClient: Stripe | null = null

/** Lazily construct the Stripe client so a missing key fails at request time
 *  with a clear message rather than crashing the whole build. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv('STRIPE_SECRET_KEY'))
  }
  return stripeClient
}
