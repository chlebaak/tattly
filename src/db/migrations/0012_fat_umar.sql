ALTER TABLE "payments" DROP CONSTRAINT "payments_stripe_session_id_unique";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_stripe_payment_intent_id_unique";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "stripe_session_id";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "stripe_payment_intent_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "stripe_account_id";