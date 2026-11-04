/**
 * Fio Banka – čtení pohybů na účtu přes API Bankovnictví (read-only token).
 * Dokumentace: https://www.fio.cz/docs/cz/API_Bankovnictvi.pdf
 *
 * Sloupce v JSON odpovědi:
 *   column22 = ID pohybu, column0 = datum (ms), column1 = objem (podepsaný),
 *   column14 = měna, column2 = protiúčet, column5 = variabilní symbol,
 *   column16 = zpráva pro příjemce.
 */

export type BankTransactionInput = {
  externalId: string;
  amountMinor: number;
  currency: string;
  variableSymbol: string | null;
  message: string | null;
  counterpartyAccount: string | null;
  bookedAt: Date;
  direction: "in" | "out";
};

export type FioFetchResult =
  | {
      ok: true;
      accountNumber: string | null;
      iban: string | null;
      transactions: BankTransactionInput[];
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "RATE_LIMITED" | "ERROR";
      message?: string;
    };

type FioColumn = { value?: unknown } | null | undefined;

function columnValue(
  transaction: Record<string, FioColumn>,
  key: string
): unknown {
  const column = transaction[key];
  if (!column || typeof column !== "object" || !("value" in column)) {
    return null;
  }
  return column.value ?? null;
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Číslice variabilního symbolu bez vedoucích nul – pro spolehlivé porovnání. */
export function normalizeVariableSymbol(value: string | null): string {
  if (!value) return "";
  return value.replace(/\D/g, "").replace(/^0+/, "");
}

function apiBase(): string {
  return process.env.FIO_API_BASE ?? "https://fioapi.fio.cz/v1/rest";
}

export async function fetchFioTransactions(params: {
  token: string;
  from: Date;
  to?: Date;
}): Promise<FioFetchResult> {
  const url = `${apiBase()}/periods/${encodeURIComponent(params.token)}/${formatDate(
    params.from
  )}/${formatDate(params.to ?? new Date())}/transactions.json`;

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    return {
      ok: false,
      error: "ERROR",
      message: error instanceof Error ? error.message : "network",
    };
  }

  if (response.status === 409) return { ok: false, error: "RATE_LIMITED" };
  if ([400, 401, 403, 404, 422].includes(response.status)) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: `HTTP ${response.status}`,
    };
  }
  if (!response.ok) {
    return { ok: false, error: "ERROR", message: `HTTP ${response.status}` };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "ERROR", message: "invalid json" };
  }

  const statement = (data as { accountStatement?: unknown })?.accountStatement as
    | {
        info?: { accountId?: string; bankId?: string; iban?: string };
        transactionList?: { transaction?: unknown };
      }
    | undefined;
  if (!statement) {
    // Prázdný výpis Fio vrací bez transactionList – bereme jako nula pohybů.
    return { ok: true, accountNumber: null, iban: null, transactions: [] };
  }

  const info = statement.info ?? {};
  const accountNumber =
    info.accountId && info.bankId
      ? `${info.accountId}/${info.bankId}`
      : (info.accountId ?? null);

  const rawList = statement.transactionList?.transaction;
  const list = Array.isArray(rawList) ? rawList : rawList ? [rawList] : [];

  const transactions: BankTransactionInput[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const transaction = raw as Record<string, FioColumn>;
    const externalId = stringOrNull(columnValue(transaction, "column22"));
    const bookedRaw = Number(columnValue(transaction, "column0") ?? NaN);
    const amount = Number(columnValue(transaction, "column1") ?? NaN);
    if (!externalId || !Number.isFinite(bookedRaw) || !Number.isFinite(amount)) {
      continue;
    }
    const bookedAt = new Date(bookedRaw);
    if (Number.isNaN(bookedAt.getTime())) continue;

    transactions.push({
      externalId,
      amountMinor: Math.round(amount * 100),
      currency: (
        stringOrNull(columnValue(transaction, "column14")) ?? "CZK"
      ).toUpperCase(),
      variableSymbol: stringOrNull(columnValue(transaction, "column5")),
      message: stringOrNull(columnValue(transaction, "column16")),
      counterpartyAccount: stringOrNull(columnValue(transaction, "column2")),
      bookedAt,
      direction: amount < 0 ? "out" : "in",
    });
  }

  return {
    ok: true,
    accountNumber,
    iban: info.iban ?? null,
    transactions,
  };
}

/** Porovná číslo protiúčtu z banky s IBANem klienta (bez kódu banky). */
export function accountMatchesIban(
  counterpartyAccount: string | null,
  iban: string | null
): boolean {
  if (!counterpartyAccount || !iban) return false;
  const counterpartyDigits = counterpartyAccount.replace(/\D/g, "");
  const ibanDigits = iban.replace(/\D/g, "");
  if (!counterpartyDigits || !ibanDigits) return false;
  const withoutBankCode =
    counterpartyDigits.length > 4
      ? counterpartyDigits.slice(0, -4)
      : counterpartyDigits;
  const trimmed = withoutBankCode.replace(/^0+/, "");
  return trimmed.length >= 6 && ibanDigits.includes(trimmed);
}
