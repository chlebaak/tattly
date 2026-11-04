"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { bankConnections } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { fetchFioTransactions } from "@/lib/bank/fio";
import { syncBankConnection } from "@/lib/bank/sync";

export type FioActionState =
  | { ok: boolean; error?: string; accountNumber?: string | null }
  | null;

const MAX_CONNECTIONS = 3;

export async function connectFioAccount(
  _prev: FioActionState,
  formData: FormData
): Promise<FioActionState> {
  const profile = await requireProfile();
  const token = String(formData.get("token") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (token.length < 20 || token.length > 200) {
    return { ok: false, error: "INVALID_TOKEN" };
  }

  const existing = await db
    .select({ id: bankConnections.id })
    .from(bankConnections)
    .where(eq(bankConnections.profileId, profile.id));
  if (existing.length >= MAX_CONNECTIONS) {
    return { ok: false, error: "TOO_MANY" };
  }

  // Ověříme token hned – stáhneme poslední tři dny.
  const check = await fetchFioTransactions({
    token,
    from: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
  if (!check.ok) {
    return {
      ok: false,
      error:
        check.error === "UNAUTHORIZED"
          ? "INVALID_TOKEN"
          : check.error === "RATE_LIMITED"
            ? "RATE_LIMITED"
            : "UNKNOWN",
    };
  }

  const [created] = await db
    .insert(bankConnections)
    .values({
      profileId: profile.id,
      provider: "fio",
      label,
      accountNumber: check.accountNumber ?? check.iban,
      tokenEncrypted: encryptSecret(token),
      status: "active",
    })
    .returning({ id: bankConnections.id });

  await syncBankConnection(created.id);

  revalidatePath("/dashboard/settings/payments");
  revalidatePath("/dashboard");
  return { ok: true, accountNumber: check.accountNumber ?? check.iban };
}

export async function syncFioNow(connectionId: string): Promise<{
  ok: boolean;
  imported: number;
  matched: number;
  error?: string;
}> {
  const profile = await requireProfile();
  const parsed = z.uuid().safeParse(connectionId);
  if (!parsed.success) {
    return { ok: false, imported: 0, matched: 0, error: "INVALID_INPUT" };
  }

  const [connection] = await db
    .select({ id: bankConnections.id })
    .from(bankConnections)
    .where(
      and(
        eq(bankConnections.id, parsed.data),
        eq(bankConnections.profileId, profile.id)
      )
    )
    .limit(1);
  if (!connection) {
    return { ok: false, imported: 0, matched: 0, error: "NOT_FOUND" };
  }

  const result = await syncBankConnection(connection.id);
  revalidatePath("/dashboard/settings/payments");
  revalidatePath("/dashboard");
  return result;
}

export async function disconnectFioAccount(
  connectionId: string
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  const parsed = z.uuid().safeParse(connectionId);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };

  const deleted = await db
    .delete(bankConnections)
    .where(
      and(
        eq(bankConnections.id, parsed.data),
        eq(bankConnections.profileId, profile.id)
      )
    )
    .returning({ id: bankConnections.id });
  if (!deleted.length) return { ok: false, error: "NOT_FOUND" };

  revalidatePath("/dashboard/settings/payments");
  revalidatePath("/dashboard");
  return { ok: true };
}
