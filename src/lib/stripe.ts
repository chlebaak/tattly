import Stripe from "stripe";
import { appUrl, requireEnv } from "./env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  }
  return stripeClient;
}

function numEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function computeApplicationFee(amountMinor: number): number {
  const platformPercent = numEnv("PLATFORM_FEE_PERCENT", 5);
  const stripeFeePercent = numEnv("STRIPE_FEE_PCT", 1.5);
  const stripeFeeFixed = numEnv("STRIPE_FEE_FIXED_MINOR", 600);
  const platformFee = Math.round((amountMinor * platformPercent) / 100);
  const stripeCostFloor =
    Math.round((amountMinor * stripeFeePercent) / 100) + stripeFeeFixed;
  return Math.max(platformFee, stripeCostFloor);
}

export async function createDepositCheckoutSession(params: {
  profileStripeAccountId: string;
  currency: string;
  amountMinor: number;
  serviceTitle: string;
  bookingId: string;
  paymentId: string;
  clientEmail: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const fee = computeApplicationFee(params.amountMinor);
  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.clientEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: params.currency.toLowerCase(),
          unit_amount: params.amountMinor,
          product_data: { name: `Záloha – ${params.serviceTitle}` },
        },
      },
    ],
    metadata: {
      bookingId: params.bookingId,
      paymentId: params.paymentId,
    },
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: { destination: params.profileStripeAccountId },
      metadata: {
        bookingId: params.bookingId,
        paymentId: params.paymentId,
      },
    },
    success_url: `${appUrl()}/booking/status?state=success`,
    cancel_url: `${appUrl()}/booking/status?state=cancel`,
  });
}
