ALTER TABLE "profiles" ADD COLUMN "address_line" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "zip" varchar(12);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "lng" double precision;