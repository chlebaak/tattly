import { cn } from "cn";

export function LogoBlob({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Tattly"
      className={cn("object-contain mix-blend-multiply", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-extrabold uppercase tracking-[0.08em]",
        className
      )}
    >
      Tattly.eu
    </span>
  );
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}
