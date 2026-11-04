-- Starší Stripe platby v produkci: metoda 'stripe' už neexistuje, uvolníme ji.
UPDATE "payments" SET "method" = NULL WHERE "method" = 'stripe';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('qr', 'bank');--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE "public"."payment_method" USING "method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "service_title" varchar(120);--> statement-breakpoint
UPDATE "bookings" AS b SET "service_title" = s."title" FROM "services" AS s WHERE b."service_id" = s."id" AND b."service_title" IS NULL;--> statement-breakpoint
CREATE INDEX "bookings_profile_created_idx" ON "bookings" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "bookings_client_email_idx" ON "bookings" USING btree ("client_email");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "payments" USING btree ("paid_at");--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "external_ref";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "requires_deposit";