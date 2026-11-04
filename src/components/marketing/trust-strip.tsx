import { BadgeCheckIcon, CalendarCheckIcon, QrCodeIcon } from "lucide-react";
import { Container } from "./section";

const ITEMS = [
  { icon: QrCodeIcon, label: "QR platby a zálohy" },
  { icon: CalendarCheckIcon, label: "Google kalendář" },
  { icon: BadgeCheckIcon, label: "Žádné provize" },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
        {ITEMS.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <item.icon className="size-4 text-coffee/70" />
            {item.label}
          </span>
        ))}
      </Container>
    </section>
  );
}
