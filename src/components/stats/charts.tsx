import { cn } from "cn";

type Datum = { label: string; value: number; hint?: string };

function AccessibleTable({
  data,
  formatValue,
  caption,
}: {
  data: Datum[];
  formatValue: (value: number) => string;
  caption: string;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Položka</th>
          <th scope="col">Hodnota</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={`${item.label}-${index}`}>
            <th scope="row">{item.label}</th>
            <td>{formatValue(item.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AxisLabels({ data }: { data: Datum[] }) {
  if (data.length === 0) return null;
  const middle = data[Math.floor((data.length - 1) / 2)];
  return (
    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
      <span>{data[0]?.label}</span>
      {middle ? <span className="hidden sm:inline">{middle.label}</span> : null}
      <span>{data[data.length - 1]?.label}</span>
    </div>
  );
}

/** Sloupcový graf (počty v čase, dny v týdnu…). */
export function BarSeries({
  data,
  formatValue,
  caption,
  className,
  showAllLabels = false,
}: {
  data: Datum[];
  formatValue: (value: number) => string;
  caption: string;
  className?: string;
  showAllLabels?: boolean;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="group relative flex h-full flex-1 items-end"
            title={`${item.label}: ${formatValue(item.value)}`}
          >
            <div
              className={cn(
                "w-full rounded-t-[3px] transition-colors animate-grow-y",
                item.value > 0
                  ? "bg-coffee group-hover:bg-espresso"
                  : "bg-muted"
              )}
              style={{
                height: `${Math.max(1.5, (item.value / max) * 100)}%`,
                animationDelay: `${Math.min(index * 6, 120)}ms`,
              }}
            />
          </div>
        ))}
      </div>
      {showAllLabels ? (
        <div className="mt-1.5 flex gap-[3px] text-[10px] text-muted-foreground">
          {data.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex-1 text-center">
              {item.label}
            </span>
          ))}
        </div>
      ) : (
        <AxisLabels data={data} />
      )}
      <AccessibleTable data={data} formatValue={formatValue} caption={caption} />
    </div>
  );
}

/** Liniový graf s plochou (vývoj výdělku). */
export function LineSeries({
  data,
  formatValue,
  caption,
  className,
}: {
  data: Datum[];
  formatValue: (value: number) => string;
  caption: string;
  className?: string;
}) {
  const width = 640;
  const height = 180;
  const pad = 10;
  const max = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => {
    const x =
      pad +
      (index / Math.max(1, data.length - 1)) * (width - pad * 2);
    const y = height - pad - (item.value / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;

  return (
    <div className={cn("min-w-0 animate-fade", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label={caption}
        preserveAspectRatio="none"
      >
        <polygon points={area} style={{ fill: "var(--color-crema)", opacity: 0.35 }} />
        <polyline
          points={line}
          fill="none"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          style={{ stroke: "var(--color-espresso)" }}
        />
      </svg>
      <AxisLabels data={data} />
      <AccessibleTable data={data} formatValue={formatValue} caption={caption} />
    </div>
  );
}

/** Horizontální stacked bar pro mix stavů – klidnější než donut. */
export function StatusMixBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  const visible = segments.filter((segment) => segment.value > 0);
  return (
    <div>
      <div
        className="flex h-3 animate-grow-x overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label="Mix stavů rezervací"
      >
        {visible.map((segment) => {
          const width = total > 0 ? (segment.value / total) * 100 : 0;
          return (
            <span
              key={segment.label}
              style={{ width: `${width}%`, background: segment.color }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: segment.color }}
            />
            <span className="truncate text-muted-foreground">
              {segment.label}
            </span>
            <span className="ml-auto font-medium tabular-nums">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Celkem {total} rezervací v období.
      </p>
    </div>
  );
}
/** Žebříček (top služby, dny…) s pruhem a sekundární hodnotou. */
export function RankBars({
  items,
  formatValue,
  formatSecondary,
  emptyText = "Zatím žádná data.",
}: {
  items: { label: string; value: number; secondary?: number }[];
  formatValue: (value: number) => string;
  formatSecondary?: (value: number) => string;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums">
              {formatValue(item.value)}
              {item.secondary !== undefined && formatSecondary ? (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {formatSecondary(item.secondary)}
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full animate-grow-x rounded-full bg-coffee/80"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                animationDelay: `${index * 60}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
