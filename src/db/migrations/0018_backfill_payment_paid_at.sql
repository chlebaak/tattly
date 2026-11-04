-- Doplnění času platby u už potvrzených záloh (z historie rezervací).
UPDATE "payments" AS p
SET "paid_at" = b."client_paid_at"
FROM "bookings" AS b
WHERE p."booking_id" = b."id"
  AND p."status" = 'succeeded'
  AND p."paid_at" IS NULL
  AND b."client_paid_at" IS NOT NULL;
