ALTER TABLE "bookings" ADD COLUMN "price_minor" integer;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "invoice_number" varchar(32);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "invoiced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ico" varchar(16);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "dic" varchar(16);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bank_account" varchar(64);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "invoice_counter" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "price_minor" integer;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "deposit_minor" integer;