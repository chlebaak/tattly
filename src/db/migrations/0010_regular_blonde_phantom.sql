ALTER TABLE "bookings" ADD COLUMN "status_code" varchar(16);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "portfolio_images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_code_unique" UNIQUE("status_code");