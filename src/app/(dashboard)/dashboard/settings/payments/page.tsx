import { and, count, desc, eq, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { bankConnections, bankTransactions } from "@/db/schema";
import { requireProfile } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import { PanelSection } from "@/components/ui/panel";
import { BillingForm } from "./billing-form";
import { FioCard } from "./fio-card";

export default async function PaymentsSettingsPage() {
  const profile = await requireProfile();
  const hasBank = Boolean(profile.bankAccount);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [connectionRows, matchedRows, unmatchedRows] = await Promise.all([
    db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.profileId, profile.id))
      .orderBy(desc(bankConnections.createdAt)),
    db
      .select({ value: count() })
      .from(bankTransactions)
      .innerJoin(
        bankConnections,
        eq(bankTransactions.connectionId, bankConnections.id)
      )
      .where(
        and(
          eq(bankConnections.profileId, profile.id),
          isNotNull(bankTransactions.bookingId),
          gte(bankTransactions.bookedAt, since)
        )
      ),
    db
      .select({ value: count() })
      .from(bankTransactions)
      .innerJoin(
        bankConnections,
        eq(bankTransactions.connectionId, bankConnections.id)
      )
      .where(
        and(
          eq(bankConnections.profileId, profile.id),
          isNull(bankTransactions.bookingId),
          eq(bankTransactions.direction, "in"),
          gte(bankTransactions.bookedAt, since)
        )
      ),
  ]);

  const connections = connectionRows.map((connection) => ({
    id: connection.id,
    label: connection.label,
    accountNumber: connection.accountNumber,
    status: connection.status,
    lastSyncedLabel: connection.lastSyncedAt
      ? formatDateTime(connection.lastSyncedAt, profile.timezone)
      : null,
    lastError: connection.lastError,
  }));

  return (
    <div className="space-y-4">
      <PanelSection
        title="Platby a fakturace"
        description="Zálohy od klientů a údaje na fakturách."
      >
        <BillingForm
          defaultDepositCzk={Math.round(profile.defaultDepositAmount / 100)}
          ico={profile.ico}
          dic={profile.dic}
          bankAccount={profile.bankAccount}
        />
      </PanelSection>

      <PanelSection
        title="Automatická kontrola plateb"
        description="Volitelné – s účtem u Fio banky potvrzujeme zálohy sami."
      >
        <FioCard
          connections={connections}
          matchedCount={Number(matchedRows[0]?.value ?? 0)}
          unmatchedCount={Number(unmatchedRows[0]?.value ?? 0)}
        />
      </PanelSection>

      {!hasBank && (
        <PanelSection title="Bez vyplněného účtu">
          <p className="rounded-xl bg-status-attention-soft px-3 py-2 text-sm text-status-attention">
            Nemáte vyplněný bankovní účet, takže není kam poslat zálohu.
            Rezervace proto potvrzujeme <strong>rovnou a bez zálohy</strong> –
            klient dostane potvrzení e-mailem hned po schválení.
          </p>
        </PanelSection>
      )}

      <PanelSection title="Jak zálohy fungují">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            Klient zaplatí zálohu <strong>QR platbou</strong> (standard, který
            umí všechny české bankovní aplikace) přímo na váš účet. Peníze jdou
            rovnou k vám.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            Tattly si z uhrazených záloh nebere nic – teď je celý systém zdarma.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            Když platba dorazí, potvrdíte ji jedním klikem v Přehledu – nebo ji
            potvrdíme sami, když máte zapojenou Fio banku.
          </li>
          <li className="flex gap-2">
            <span aria-hidden>·</span>
            Když klient zálohu nezaplatí, nic vás to nestojí – termín se po 24 hodinách uvolní.
          </li>
        </ul>
      </PanelSection>

      <PanelSection title="Vrácení záloh">
        <p className="text-sm text-muted-foreground">
          Když rezervaci stornujete se zálohou, klient na stavové stránce vyplní
          číslo účtu, na které mu ji poslat. Vy pak peníze odešlete ze svého
          bankovnictví – v Přehledu k tomu máte tlačítko <strong>„Vrátil jsem“</strong>{" "}
          a QR kód, který stačí naskenovat ve vaší bance. S Fio bankou se vrácení
          označí samo podle odchozí platby.
        </p>
      </PanelSection>
    </div>
  );
}
