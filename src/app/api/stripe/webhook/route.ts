import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, payments, profiles, services } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import {
  depositPaidAfterExpiryEmailForClient,
  sendEmail,
} from "@/lib/email";
import { onBookingConfirmed } from "@/lib/booking-flow";

export async function POST(request: Request) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 400 });
  }
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(event.data.object);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : null;
      if (paymentIntentId) {
        await db
          .update(payments)
          .set({ status: "refunded" })
          .where(eq(payments.stripePaymentIntentId, paymentIntentId));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

type CheckoutOutcome = {
  outcome: "confirmed" | "refund" | "noop";
  snapshot: {
    clientName: string;
    clientEmail: string;
    clientPhone: string | null;
    description: string | null;
    startTime: Date | null;
    endTime: Date | null;
    profileId: string;
    serviceTitle: string | null;
    serviceDurationMinutes: number | null;
    priceMinor: number | null;
    depositAmount: number | null;
  };
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const paymentId = session.metadata?.paymentId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  if (!bookingId || !paymentId) return;

  const result = await db.transaction(
    async (tx): Promise<CheckoutOutcome | null> => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update")
        .limit(1);
      if (!booking) return null;

      await tx
        .update(payments)
        .set({
          status: "succeeded",
          stripePaymentIntentId: paymentIntentId,
          method: "stripe",
        })
        .where(eq(payments.id, paymentId));

      let outcome: CheckoutOutcome["outcome"] = "noop";
      if (booking.status === "deposit_pending") {
        await tx
          .update(bookings)
          .set({ status: "confirmed" })
          .where(eq(bookings.id, booking.id));
        outcome = "confirmed";
      } else if (booking.status === "expired") {
        outcome = "refund";
      }

      let serviceTitle: string | null = null;
      let serviceDurationMinutes: number | null = null;
      if (booking.serviceId) {
        const [service] = await tx
          .select({ title: services.title, durationMinutes: services.durationMinutes })
          .from(services)
          .where(eq(services.id, booking.serviceId))
          .limit(1);
        serviceTitle = service?.title ?? null;
        serviceDurationMinutes = service?.durationMinutes ?? null;
      }

      return {
        outcome,
        snapshot: {
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          description: booking.description,
          startTime: booking.startTime,
          endTime: booking.endTime,
          profileId: booking.profileId,
          serviceTitle,
          serviceDurationMinutes,
          priceMinor: booking.priceMinor,
          depositAmount: booking.depositAmount,
        },
      };
    }
  );

  if (!result) return;
  const { outcome, snapshot } = result;
  const { startTime, endTime } = snapshot;
  if (!startTime || !endTime) return;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, snapshot.profileId))
    .limit(1);
  if (!profile) return;

  if (outcome === "refund" && paymentIntentId) {
    try {
      await getStripe().refunds.create({ payment_intent: paymentIntentId });
    } catch (error) {
      console.error("Refund failed", error);
    }
    const email = depositPaidAfterExpiryEmailForClient({
      clientName: snapshot.clientName,
      artistName: profile.displayName,
    });
    await sendEmail({
      to: snapshot.clientEmail,
      subject: email.subject,
      html: email.html,
    });
    return;
  }

  if (outcome === "confirmed") {
    await onBookingConfirmed({
      profile,
      bookingId,
      clientName: snapshot.clientName,
      clientEmail: snapshot.clientEmail,
      clientPhone: snapshot.clientPhone,
      description: snapshot.description,
      startTime,
      endTime,
      serviceTitle: snapshot.serviceTitle,
      serviceDurationMinutes: snapshot.serviceDurationMinutes,
      priceMinor: snapshot.priceMinor,
      depositAmount: snapshot.depositAmount,
    });
  }
}
