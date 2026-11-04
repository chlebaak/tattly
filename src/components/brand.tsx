import { cn } from "cn";

export function LogoBlob({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-128.png"
      alt="Tattly"
      width={128}
      height={128}
      decoding="async"
      className={cn("object-contain mix-blend-multiply", className)}
    />
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-semibold tracking-[-0.045em] text-foreground",
        className
      )}
    >
      tattly<span className="text-muted-foreground">.eu</span>
    </span>
  );
}
