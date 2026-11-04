import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bankConnections,
  bankTransactions,
  bookings,
  type BankTransaction,
} from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import {
  confirmDepositPaid,
  markDepositRefunded,
} from "@/lib/booking-payments";
import {
  accountMatchesIban,
  fetchFioTransactions,
  normalizeVariableSymbol,
} from "./fio";

const LOOKBACK_DAYS = 14;

export type SyncResult = {
  ok: boolean;
  imported: number;
  matched: number;
  error?: string;
};

/** Stáhne nové pohyby z banky a zkusí je spárovat s rezervacemi. */
export async function syncBankConnection(
  connectionId: string
): Promise<SyncResult> {
  const [connection] = await db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.id, connectionId))
    .limit(1);
  if (!connection) return { ok: false, imported: 0, matched: 0, error: "NOT_FOUND" };

  let token: string;
  try {
    token = decryptSecret(connection.tokenEncrypted);
  } catch (error) {
    console.error("Bank token decrypt failed", error);
    await db
      .update(bankConnections)
      .set({ status: "error", lastError: "DECRYPT_FAILED" })
      .where(eq(bankConnections.id, connection.id));
    return { ok: false, imported: 0, matched: 0, error: "DECRYPT_FAILED" };
  }

  const from = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const result = await fetchFioTransactions({ token, from });

  if (!result.ok) {
    await db
      .update(bankConnections)
      .set({
        status: result.error === "UNAUTHORIZED" ? "expired" : "error",
        lastError: result.error,
        lastSyncedAt: new Date(),
      })
      .where(eq(bankConnections.id, connection.id));
    return { ok: false, imported: 0, matched: 0, error: result.error };
  }

  let imported = 0;
  for (const transaction of result.transactions) {
    const inserted = await db
      .insert(bankTransactions)
      .values({
        connectionId: connection.id,
        externalId: transaction.externalId,
        amount: transaction.amountMinor,
        currency: transaction.currency,
        variableSymbol: normalizeVariableSymbol(transaction.variableSymbol),
        message: transaction.message,
        counterpartyAccount: transaction.counterpartyAccount,
        bookedAt: transaction.bookedAt,
        direction: transaction.direction,
      })
      .onConflictDoNothing({ target: bankTransactions.externalId })
      .returning({ id: bankTransactions.id });
    if (inserted.length) imported += 1;
  }

  const unmatched = await db
    .select()
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.connectionId, connection.id),
        isNull(bankTransactions.bookingId)
      )
    );

  let matched = 0;
  for (const transaction of unmatched) {
    const didMatch = await matchBankTransaction({
      profileId: connection.profileId,
      transaction,
    });
    if (didMatch) matched += 1;
  }

  await db
    .update(bankConnections)
    .set({
      status: "active",
      lastError: null,
      lastSyncedAt: new Date(),
      accountNumber: result.accountNumber ?? connection.accountNumber,
    })
    .where(eq(bankConnections.id, connection.id));

  return { ok: true, imported, matched };
}

/**
 * Zkusí přiřadit pohyb k rezervaci:
 * - příchozí + variabilní symbol + částka → potvrzení zálohy,
 * - odchozí + účet klienta + částka → vrácení zálohy.
 */
export async function matchBankTransaction(params: {
  profileId: string;
  transaction: BankTransaction;
}): Promise<boolean> {
  const { transaction, profileId } = params;
  if (transaction.bookingId) return false;
  if (transaction.currency !== "CZK") return false;

  if (transaction.direction === "out") {
    return matchRefund(profileId, transaction);
  }
  return matchDeposit(profileId, transaction);
}

async function matchDeposit(
  profileId: string,
  transaction: BankTransaction
): Promise<boolean> {
  const vs = normalizeVariableSymbol(transaction.variableSymbol);
  if (!vs) return false;

  const pending = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.profileId, profileId),
        eq(bookings.status, "deposit_pending")
      )
    );

  const match = pending.find(
    (booking) =>
      normalizeVariableSymbol(booking.variableSymbol) === vs &&
      booking.depositAmount === transaction.amount
  );
  if (!match) return false;

  const result = await confirmDepositPaid({
    profileId,
    bookingId: match.id,
    method: "bank",
  });
  if (!result.ok) return false;

  await db
    .update(bankTransactions)
    .set({ bookingId: match.id, matchedAt: new Date() })
    .where(eq(bankTransactions.id, transaction.id));
  return true;
}

async function matchRefund(
  profileId: string,
  transaction: BankTransaction
): Promise<boolean> {
  const amount = Math.abs(transaction.amount);
  const cancelled = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.profileId, profileId), eq(bookings.status, "cancelled"))
    );

  const match = cancelled.find(
    (booking) =>
      booking.clientIban &&
      accountMatchesIban(transaction.counterpartyAccount, booking.clientIban) &&
      booking.depositAmount === amount
  );
  if (!match) return false;

  const result = await markDepositRefunded({
    profileId,
    bookingId: match.id,
    note: "Automaticky podle odchozí platby z banky",
  });
  if (!result.ok) return false;

  await db
    .update(bankTransactions)
    .set({ bookingId: match.id, matchedAt: new Date() })
    .where(eq(bankTransactions.id, transaction.id));
  return true;
}
