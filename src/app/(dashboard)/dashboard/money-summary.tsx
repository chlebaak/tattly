import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { formatCents } from "@/lib/utils";
import type { DashboardMoney } from "@/lib/dashboard";

export function MoneySummary({
  money,
  currency,
  href,
}: {
  money: DashboardMoney;
  currency: string;
  href: string;
}) {
  return (
    <section className="border-t border-border pt-5" aria-labelledby="money-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="money-heading" className="text-sm font-semibold">
          Peníze
        </h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Statistiky
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>

      <dl className="mt-4 space-y-3.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">
            Vyděláno <span className="text-xs">tento měsíc</span>
          </dt>
          <dd className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
            {formatCents(money.revenue, currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Očekávané</dt>
          <dd className="text-lg font-medium tabular-nums">
            {formatCents(money.expected, currency)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm text-muted-foreground">Nezaplaceno</dt>
          <dd
            className={
              money.unpaid > 0
                ? "text-lg font-medium text-status-attention tabular-nums"
                : "text-lg font-medium tabular-nums"
            }
          >
            {formatCents(money.unpaid, currency)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
