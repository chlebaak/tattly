ALTER TABLE "bookings" ADD COLUMN "assets_purge_after" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "bookings_assets_purge_idx" ON "bookings" USING btree ("assets_purge_after");