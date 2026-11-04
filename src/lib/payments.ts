import { buildQrDataUri, buildSpaydString } from "./qr";

export async function buildDepositQr(params: {
  iban: string;
  amountMinor: number;
  currency: string;
  variableSymbol: string;
  artistName: string;
}): Promise<{ dataUri: string | null }> {
  const dataUri = await buildQrDataUri(
    buildSpaydString({
      iban: params.iban,
      amountMinor: params.amountMinor,
      currency: params.currency,
      variableSymbol: params.variableSymbol,
      message: `Zaloha - ${params.artistName}`,
    })
  );
  return { dataUri };
}

/**
 * QR pro vrácení zálohy – tatér ho naskenuje ve své bankovní aplikaci
 * a peníze pošle na účet klienta.
 */
export async function buildRefundQr(params: {
  iban: string;
  amountMinor: number;
  currency: string;
  variableSymbol?: string | null;
  artistName: string;
}): Promise<{ dataUri: string | null }> {
  const dataUri = await buildQrDataUri(
    buildSpaydString({
      iban: params.iban,
      amountMinor: params.amountMinor,
      currency: params.currency,
      variableSymbol: params.variableSymbol ?? "",
      message: `Vraceni zalohy - ${params.artistName}`,
    })
  );
  return { dataUri };
}
