import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bankConnections } from "@/db/schema";
import { inngest } from "./client";
import {
  expireDueDeposit,
  findDueDeposits,
  findDueReminders,
  sendDueReminder,
} from "@/lib/booking-jobs";
import {
  purgeDueBookingAssets,
  purgeOrphanedBookingAssets,
} from "@/lib/booking-lifecycle";
import { syncBankConnection } from "@/lib/bank/sync";

export const functions = [
  inngest.createFunction(
    { id: "deposit-expire", retries: 3, triggers: { event: "deposit/expire" } },
    async ({ event, step }) => {
      const bookingId = event.data.bookingId as string;
      const expired = await step.run("expire-if-unpaid", () =>
        expireDueDeposit(bookingId)
      );
      return { expired };
    }
  ),
  inngest.createFunction(
    { id: "booking-remind", retries: 3, triggers: { event: "booking/remind" } },
    async ({ event, step }) => {
      const bookingId = event.data.bookingId as string;
      const reminded = await step.run("send-reminder", () =>
        sendDueReminder(bookingId)
      );
      return { reminded };
    }
  ),
  inngest.createFunction(
    {
      id: "booking-sweep",
      retries: 2,
      concurrency: { limit: 1 },
      triggers: [
        { cron: "*/15 * * * *" },
        { event: "booking/sweep" },
      ],
    },
    async ({ step }) => {
      // Záchranná síť: kdyby se ztratila plánovaná událost, dohoníme to tady.
      const dueDeposits = await step.run("find-due-deposits", () =>
        findDueDeposits()
      );
      let expired = 0;
      for (const bookingId of dueDeposits) {
        const didExpire = await step.run(`expire-${bookingId}`, () =>
          expireDueDeposit(bookingId)
        );
        if (didExpire) expired += 1;
      }

      const dueReminders = await step.run("find-due-reminders", () =>
        findDueReminders()
      );
      let reminded = 0;
      for (const bookingId of dueReminders) {
        const didRemind = await step.run(`remind-${bookingId}`, () =>
          sendDueReminder(bookingId)
        );
        if (didRemind) reminded += 1;
      }

      return { dueDeposits: dueDeposits.length, expired, dueReminders: dueReminders.length, reminded };
    }
  ),

  inngest.createFunction(
    {
      id: "bank-sync",
      retries: 2,
      triggers: [{ cron: "*/10 * * * *" }],
    },
    async ({ step }) => {
      const activeConnections = await step.run("load-connections", async () => {
        const rows = await db
          .select({ id: bankConnections.id })
          .from(bankConnections)
          .where(eq(bankConnections.status, "active"));
        return rows.map((row) => row.id);
      });

      let imported = 0;
      let matched = 0;
      for (const connectionId of activeConnections) {
        const result = await step.run(`sync-${connectionId}`, async () =>
          syncBankConnection(connectionId)
        );
        imported += result.imported;
        matched += result.matched;
      }

      return { connections: activeConnections.length, imported, matched };
    }
  ),
  inngest.createFunction(
    {
      id: "assets-purge",
      retries: 2,
      concurrency: { limit: 1 },
      triggers: [
        { cron: "TZ=Europe/Prague 0 4 * * *" },
        { event: "assets/purge" },
      ],
    },
    async ({ event, step }) => {
      const BATCH_SIZE = 50;
      const MAX_BATCHES = 10;

      let bookings = 0;
      let assetsDeleted = 0;
      let answersCleared = 0;

      for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
        const result = await step.run(`purge-batch-${batch}`, () =>
          purgeDueBookingAssets({ limit: BATCH_SIZE })
        );
        bookings += result.bookings;
        assetsDeleted += result.assetsDeleted;
        answersCleared += result.answersCleared;
        if (result.bookings < BATCH_SIZE) break;
      }

      // Ruční běh může lhůtu pro osiřelé soubory zkrátit (testy, dohánění).
      const rawGrace = (event.data as { orphanGraceDays?: unknown } | undefined)
        ?.orphanGraceDays;
      const orphanGraceDays =
        typeof rawGrace === "number"
          ? Math.min(Math.max(rawGrace, 0), 365)
          : undefined;

      const orphans = await step.run("purge-orphans", () =>
        purgeOrphanedBookingAssets({ graceDays: orphanGraceDays })
      );

      return {
        bookings,
        assetsDeleted,
        answersCleared,
        orphansScanned: orphans.scanned,
        orphansDeleted: orphans.deleted,
      };
    }
  ),
];
