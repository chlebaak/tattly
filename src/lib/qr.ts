import QRCode from "qrcode";

export function buildSpaydString(params: {
  iban: string;
  amountMinor: number;
  currency: string;
  variableSymbol: string;
  message?: string;
}): string {
  const iban = params.iban.replace(/\s+/g, "").toUpperCase();
  const amount = (params.amountMinor / 100).toFixed(2);
  const vs = params.variableSymbol.replace(/\D/g, "").slice(0, 10);
  const message = (params.message ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .slice(0, 60);
  const parts = [
    "SPD*1.0",
    `ACC:${iban}`,
    `AM:${amount}`,
    `CC:${params.currency.toUpperCase()}`,
    vs ? `X-VS:${vs}` : null,
    message ? `MSG:${message}` : null,
  ].filter(Boolean);
  return parts.join("*");
}

export async function buildQrDataUri(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("QR generation failed", error);
    return null;
  }
}
