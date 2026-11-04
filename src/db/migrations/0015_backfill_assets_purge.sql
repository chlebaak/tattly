-- Backfill lhůty úklidu citlivých dat u rezervací, které vznikly před touto funkcí.
-- Aktivní rezervace: tvrdý strop 12 měsíců od vzniku.
-- Ukončené rezervace: kratší z lhůty (14 dní, u splněné 30 dní) a stropu.
UPDATE "bookings"
SET "assets_purge_after" = LEAST(
  "created_at" + INTERVAL '365 days',
  CASE "status"
    WHEN 'completed' THEN now() + INTERVAL '30 days'
    WHEN 'rejected' THEN now() + INTERVAL '14 days'
    WHEN 'cancelled' THEN now() + INTERVAL '14 days'
    WHEN 'expired' THEN now() + INTERVAL '14 days'
    ELSE "created_at" + INTERVAL '365 days'
  END
)
WHERE "assets_purge_after" IS NULL;
