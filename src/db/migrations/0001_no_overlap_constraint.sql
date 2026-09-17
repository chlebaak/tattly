CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TABLE "bookings" ADD COLUMN "during" tstzrange GENERATED ALWAYS AS (tstzrange("start_time", "end_time", '[)')) STORED;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist ("profile_id" WITH =, "during" WITH &&) WHERE ("status" IN ('deposit_pending', 'confirmed'));
