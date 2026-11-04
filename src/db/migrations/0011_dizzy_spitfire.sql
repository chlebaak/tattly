ALTER TYPE "public"."payment_method" ADD VALUE 'bank';--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"type" varchar(32) NOT NULL,
	"actor" varchar(16) DEFAULT 'system' NOT NULL,
	"message" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "variable_symbol" varchar(10);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "client_iban" varchar(64);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "open_request" jsonb;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "external_ref" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "refund_note" text;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");