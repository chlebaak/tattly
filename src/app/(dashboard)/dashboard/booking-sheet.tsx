"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { BookingView } from "./booking-view";

const BookingDetailSheet = dynamic(
  () =>
    import("./booking-detail-sheet").then((mod) => mod.BookingDetailSheet),
  { ssr: false }
);

/** Jedno místo, kde se otevírá detail rezervace – používá ho Přehled, kalendář i seznam. */
export function useBookingSheet(booking: BookingView | null) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const openSheet = () => {
    if (!booking) return;
    setMounted(true);
    setOpen(true);
  };

  const sheet =
    mounted && booking ? (
      <BookingDetailSheet booking={booking} open={open} onOpenChange={setOpen} />
    ) : null;

  return { openSheet, sheet };
}
