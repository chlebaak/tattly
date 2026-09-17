import { buildQrDataUri, buildSpaydString } from "./qr";

export function variableSymbolForBooking(bookingId: string): string {
  const hex = bookingId.replace(/-/g, "").slice(0, 12);
  const num = parseInt(hex, 16) % 1_000_000_000;
  return String(num).padStart(9, "0");
}

export async function buildDepositQr(params: {
  iban: string;
  amountMinor: number;
  currency: string;
  bookingId: string;
  artistName: string;
}): Promise<{ variableSymbol: string; dataUri: string | null }> {
  const variableSymbol = variableSymbolForBooking(params.bookingId);
  const dataUri = await buildQrDataUri(
    buildSpaydString({
      iban: params.iban,
      amountMinor: params.amountMinor,
      currency: params.currency,
      variableSymbol,
      message: `Zaloha - ${params.artistName}`,
    })
  );
  return { variableSymbol, dataUri };
}
