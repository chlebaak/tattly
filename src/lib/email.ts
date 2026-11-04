import { Resend } from "resend";
import { appUrl, optionalEnv, requireEnv } from "./env";
import { formatCents, formatDateTime } from "./utils";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return resendClient;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;height:100%;background:#ffffff;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center">
            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;">
              <tr>
                <td style="padding:24px 28px 0;">
                  <p style="margin:0;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#111111;">Tattly.eu</p>
                  <p style="margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#a09c8d;">Book. Pay. Enjoy.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px 0;">
                  <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111111;">${escapeHtml(title)}</h1>
                  <div style="font-size:14px;line-height:1.65;color:#3d3c38;">${body}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px 28px;">
                  <hr style="border:none;border-top:1px solid #e7e4da;margin:0 0 14px;" />
                  <p style="margin:0;font-size:12px;color:#8a8779;">
                    Rezervace běží na
                    <a href="${appUrl()}" style="color:#111111;font-weight:600;">tattly.eu</a>
                    — zálohy, e-maily i kalendář automaticky.
                  </p>
                  <p style="margin:6px 0 0;font-size:11px;color:#a09c8d;">
                    <a href="${appUrl()}/privacy" style="color:#a09c8d;text-decoration:underline;">Ochrana osobních údajů</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  </body>
</html>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
}): Promise<void> {
  const from = optionalEnv("EMAIL_FROM") ?? "Tattly <onboarding@resend.dev>";
  try {
    await getResend().emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
      attachments: params.attachments,
    });
  } catch (error) {
    console.error("Email send failed", error);
  }
}

export function newRequestEmailForArtist(params: {
  artistName: string;
  clientName: string;
  serviceTitle: string;
  when: Date;
  timezone: string;
  bookingUrl: string;
}) {
  return {
    subject: `Nová poptávka – ${params.clientName}`,
    html: layout(
      "Nová poptávka",
      `<p>Dobrý den, ${escapeHtml(params.artistName)}, <strong>${escapeHtml(params.clientName)}</strong> právě odeslal(a) novou poptávku na <strong>${escapeHtml(params.serviceTitle)}</strong> s termínem ${escapeHtml(formatDateTime(params.when, params.timezone))}.</p>
      <p><a href="${params.bookingUrl}">Otevřít přehled a schválit</a></p>`,
    ),
  };
}

export function depositMarkedPaidEmailForArtist(params: {
  artistName: string;
  clientName: string;
  serviceTitle: string;
  when: Date | null;
  timezone: string;
  amountMinor: number;
  currency: string;
  variableSymbol?: string | null;
  bookingUrl: string;
}) {
  const whenLabel = params.when
    ? escapeHtml(formatDateTime(params.when, params.timezone))
    : "zatím bez termínu";
  const vsLine = params.variableSymbol
    ? `<p style="margin:0;font-size:12px;color:#8a8779">Variabilní symbol: ${escapeHtml(params.variableSymbol)}</p>`
    : "";
  return {
    subject: `Záloha označena jako odeslaná – ${params.clientName}`,
    html: layout(
      "Záloha označena jako odeslaná",
      `<p>Dobrý den, ${escapeHtml(params.artistName)}, ${escapeHtml(params.clientName)} označil(a) platbu zálohy <strong>${formatCents(params.amountMinor, params.currency)}</strong> jako odeslanou.</p>
      <p><strong>${escapeHtml(params.serviceTitle)}</strong><br>${whenLabel}</p>
      ${vsLine}
      <p>Zkontrolujte prosím svůj účet – až platba dorazí, potvrďte ji v přehledu jedním kliknutím. Teprve pak se termín zapíše do kalendáře.</p>
      <p><a href="${params.bookingUrl}">Otevřít přehled</a></p>`,
    ),
  };
}

export function clientRequestEmailForArtist(params: {
  artistName: string;
  clientName: string;
  clientEmail: string;
  kind: "reschedule" | "cancel" | "question";
  message?: string;
  serviceTitle: string;
  when: Date | null;
  timezone: string;
  bookingUrl: string;
}) {
  const kindCopy = {
    reschedule: {
      subject: `Klient chce přesunout termín – ${params.clientName}`,
      title: "Klient chce přesunout termín",
      intro: "požádal(a) o přesun termínu.",
    },
    cancel: {
      subject: `Klient ruší termín – ${params.clientName}`,
      title: "Klient ruší termín",
      intro: "chce termín zrušit.",
    },
    question: {
      subject: `Dotaz od klienta – ${params.clientName}`,
      title: "Dotaz od klienta",
      intro: "vám poslal(a) dotaz k rezervaci.",
    },
  }[params.kind];

  const whenLabel = params.when
    ? escapeHtml(formatDateTime(params.when, params.timezone))
    : "termín zatím není stanoven";
  const messageBlock = params.message
    ? `<p style="margin:16px 0 0;padding:12px 14px;background:#f4f3ea;border-radius:10px;white-space:pre-line;">${escapeHtml(params.message)}</p>`
    : "";

  return {
    subject: kindCopy.subject,
    html: layout(
      kindCopy.title,
      `<p>Dobrý den, ${escapeHtml(params.artistName)}, ${escapeHtml(params.clientName)} ${kindCopy.intro}</p>
      <p><strong>${escapeHtml(params.serviceTitle)}</strong><br>${whenLabel}</p>
      ${messageBlock}
      <p>Ozvěte se klientovi přímo na <a href="mailto:${escapeHtml(params.clientEmail)}">${escapeHtml(params.clientEmail)}</a> a požadavek pak v přehledu označte jako vyřízený.</p>
      <p><a href="${params.bookingUrl}">Otevřít přehled</a></p>`,
    ),
  };
}

export function requestReceivedEmailForClient(params: {
  clientName: string;
  artistName: string;
  statusUrl?: string | null;
}) {
  const statusBlock = params.statusUrl
    ? `<p style="margin-top:16px"><a href="${params.statusUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Zobrazit stav rezervace</a></p>
       <p style="font-size:12px;color:#8a8779">Odkaz si uložte – najdete tam vždy aktuální stav a můžete požádat o přesun nebo poslat dotaz.</p>`
    : "";
  return {
    subject: "Vaše poptávka byla odeslána",
    html: layout(
      "Poptávka přijata",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, děkujeme za poptávku. ${escapeHtml(params.artistName)} ji dostal(a) a ozve se vám, jakmile ji posoudí – pokud ji schválí, pošle vám odkaz na úhradu zálohy.</p>
      ${statusBlock}`,
    ),
  };
}

export function depositLinkEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  amountMinor: number;
  currency: string;
  payUrl: string;
  statusUrl?: string | null;
  expiresAt: Date;
  timezone: string;
  qrDataUri: string | null;
  variableSymbol?: string | null;
  iban?: string | null;
}) {
  const qrBlock = params.qrDataUri
    ? `<p style="margin:20px 0 4px;font-weight:600;color:#111111">Zaplaťte převodem – naskenujte QR:</p>
       <p style="margin:0 0 4px"><img src="${params.qrDataUri}" width="200" height="200" alt="QR platba" style="border-radius:8px" /></p>
       <p style="margin:0 0 12px;font-size:12px;color:#8a8779">Otevřete aplikaci své banky a naskenujte kód. Platba převodem je bez poplatků.</p>`
    : "";
  return {
    subject: `Záloha ${formatCents(params.amountMinor, params.currency)} – potvrďte termín`,
    html: layout(
      "Potvrďte termín zálohou",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, vaše poptávka <strong>${escapeHtml(params.serviceTitle)}</strong> byla schválena.</p>
      <p>K zajištění termínu je potřeba uhradit zálohu <strong>${formatCents(params.amountMinor, params.currency)}</strong> do ${escapeHtml(formatDateTime(params.expiresAt, params.timezone))}. Pokud zálohu do té doby nezaplatíte, termín se uvolní.</p>
      ${qrBlock}
      <p><a href="${params.payUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Zaplatit zálohu</a></p>
      ${
        params.statusUrl
          ? `<p style="font-size:12px;color:#8a8779">Stav rezervace najdete kdykoli na <a href="${params.statusUrl}" style="color:#111111">tomto odkazu</a>.</p>`
          : ""
      }`
    ),
  };
}

export function bookingConfirmedEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  when: Date;
  timezone: string;
  address?: { addressLine: string; city: string; zip: string } | null;
  price?: { amountMinor: number; currency: string } | null;
  deposit?: { amountMinor: number; currency: string } | null;
}) {
  const addressBlock = params.address?.addressLine
    ? `<p><strong>Kde:</strong> ${escapeHtml(params.address.addressLine)}, ${escapeHtml(params.address.city)}${params.address.zip ? ` ${escapeHtml(params.address.zip)}` : ""}</p>`
    : "";
  const priceBlock = params.price
    ? `<p><strong>Cena:</strong> ${formatCents(params.price.amountMinor, params.price.currency)}</p>`
    : "";
  const depositBlock = params.deposit
    ? `<p>Záloha ${formatCents(params.deposit.amountMinor, params.deposit.currency)} přijata – zbytek doplatíte při sezení.</p>`
    : "";
  return {
    subject: "Termín potvrzen",
    html: layout(
      "Termín potvrzen",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, termín je potvrzen.</p>
      <p><strong>${escapeHtml(params.serviceTitle)}</strong><br>${escapeHtml(formatDateTime(params.when, params.timezone))}</p>
      ${addressBlock}
      ${priceBlock}
      ${depositBlock}
      <p>V příloze najdete soubor .ics – kliknutím si termín přidáte do kalendáře.</p>`
    ),
  };
}

export function reminderEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  when: Date;
  timezone: string;
  address?: { addressLine: string; city: string; zip: string } | null;
}) {
  const addressBlock = params.address?.addressLine
    ? `<p><strong>Kde:</strong> ${escapeHtml(params.address.addressLine)}, ${escapeHtml(params.address.city)}${params.address.zip ? ` ${escapeHtml(params.address.zip)}` : ""}</p>`
    : "";
  return {
    subject: `Zítra máte termín: ${params.serviceTitle}`,
    html: layout(
      "Připomínka termínu",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, ${escapeHtml(params.artistName)} vám připomíná zítřejší termín.</p>
      <p><strong>${escapeHtml(params.serviceTitle)}</strong><br>${escapeHtml(formatDateTime(params.when, params.timezone))}</p>
      ${addressBlock}
      <p>Pokud termín nemůžete, dejte co nejdřív vědět. V příloze najdete znovu soubor .ics.</p>`,
    ),
  };
}

export function bookingRescheduledEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  oldWhen: Date;
  newWhen: Date;
  timezone: string;
}) {
  return {
    subject: "Termín se změnil",
    html: layout(
      "Termín se změnil",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, ${escapeHtml(params.artistName)} přesunul(a) váš termín <strong>${escapeHtml(params.serviceTitle)}</strong>.</p>
      <p>Původní: ${escapeHtml(formatDateTime(params.oldWhen, params.timezone))}<br>
      <strong>Nový: ${escapeHtml(formatDateTime(params.newWhen, params.timezone))}</strong></p>
      <p>V příloze najdete aktualizovaný soubor .ics.</p>`,
    ),
  };
}

export function bookingCancelledEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  when: Date;
  timezone: string;
  refundKind: "bank" | "none";
  hadDeposit: boolean;
  statusUrl?: string | null;
}) {
  const moneyBlock =
    params.refundKind === "bank"
      ? `<p>Zaplacenou zálohu vám ${escapeHtml(params.artistName)} vrátí převodem. Na stránce stavu rezervace prosím doplňte číslo účtu (IBAN), na který ji poslat.</p>`
      : params.hadDeposit
        ? `<p>Záloha se v souladu se storno podmínkami nevrací.</p>`
        : "";
  const statusBlock = params.statusUrl
    ? `<p style="margin-top:16px"><a href="${params.statusUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Zobrazit stav rezervace</a></p>`
    : "";
  return {
    subject: "Termín byl zrušen",
    html: layout(
      "Termín zrušen",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, termín <strong>${escapeHtml(params.serviceTitle)}</strong> na ${escapeHtml(formatDateTime(params.when, params.timezone))} byl zrušen.</p>
      ${moneyBlock}
      ${statusBlock}
      <p>Nový termín si domluvíte přímo s tatérem.</p>`
    ),
  };
}

export function artistMessageEmailForClient(params: {
  clientName: string;
  artistName: string;
  serviceTitle: string;
  when: Date;
  timezone: string;
  message: string;
  statusUrl?: string | null;
}) {
  return {
    subject: `Zpráva k vašemu termínu – ${params.artistName}`,
    html: layout(
      "Zpráva k termínu",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, ${escapeHtml(params.artistName)} vám posílá zprávu k termínu <strong>${escapeHtml(params.serviceTitle)}</strong> (${escapeHtml(formatDateTime(params.when, params.timezone))}):</p>
      <p style="padding:12px 16px;background:#f4f3ea;border-radius:8px">${escapeHtml(params.message)}</p>
      ${
        params.statusUrl
          ? `<p style="font-size:12px;color:#8a8779">Stav rezervace: <a href="${params.statusUrl}" style="color:#111111">odkaz</a></p>`
          : ""
      }`
    ),
  };
}

export function refundSentEmailForClient(params: {
  clientName: string;
  artistName: string;
  amountMinor: number;
  currency: string;
  iban?: string | null;
}) {
  const target = params.iban
    ? ` na účet ${escapeHtml(params.iban)}`
    : " na váš účet";
  return {
    subject: "Záloha byla vrácena",
    html: layout(
      "Záloha vrácena",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, ${escapeHtml(params.artistName)} vám vrátil(a) zálohu <strong>${formatCents(params.amountMinor, params.currency)}</strong>${target}.</p>
      <p>Převod může v závislosti na bance trvat i jeden pracovní den.</p>`
    ),
  };
}

export function invoiceEmailForClient(params: {
  clientName: string;
  invoiceNumber: string;
  supplierName: string;
  supplierStudio: string | null;
  supplierAddress: string;
  supplierIco: string | null;
  supplierDic: string | null;
  serviceTitle: string;
  serviceDate: Date;
  timezone: string;
  amountMinor: number;
  currency: string;
  bankAccount: string | null;
  qrDataUri: string | null;
  appUrl: string;
}) {
  const amount = formatCents(params.amountMinor, params.currency);
  const supplierLines = [
    params.supplierName,
    params.supplierStudio,
    params.supplierAddress,
    params.supplierIco ? `IČO: ${params.supplierIco}` : null,
    params.supplierDic ? `DIČ: ${params.supplierDic}` : null,
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(String(line)));

  const paymentBlock = params.bankAccount
    ? `<p style="margin:0 0 8px"><strong>Číslo účtu:</strong> ${escapeHtml(params.bankAccount)}<br>
       <strong>Variabilní symbol:</strong> ${escapeHtml(params.invoiceNumber)}<br>
       <strong>Částka:</strong> ${escapeHtml(amount)}</p>
       ${params.qrDataUri ? `<p style="margin:12px 0 4px"><img src="${params.qrDataUri}" width="180" height="180" alt="QR platba" style="border-radius:8px" /></p><p style="margin:0;font-size:12px;color:#8a8779">Naskenujte v aplikaci své banky (QR Platba).</p>` : ""}`
    : `<p style="margin:0 0 8px">Platba probíhá hotově při sezení.</p>`;

  return {
    subject: `Faktura ${params.invoiceNumber} – ${params.serviceTitle}`,
    html: layout(
      `Faktura ${params.invoiceNumber}`,
      `<p style="margin:0 0 16px">Dobrý den, ${escapeHtml(params.clientName)},</p>
      <p style="margin:0 0 16px">
        <strong>Dodavatel:</strong><br>
        ${supplierLines.join("<br>")}
      </p>
      <p style="margin:0 0 16px">
        <strong>Odběratel:</strong><br>
        ${escapeHtml(params.clientName)}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">
        <tr>
          <td style="padding:8px 0;border-top:1px solid #e7e4da;border-bottom:1px solid #e7e4da;font-size:14px;color:#3d3c38">
            ${escapeHtml(params.serviceTitle)}<br>
            <span style="font-size:12px;color:#8a8779">${escapeHtml(formatDateTime(params.serviceDate, params.timezone))}</span>
          </td>
          <td style="padding:8px 0;border-top:1px solid #e7e4da;border-bottom:1px solid #e7e4da;text-align:right;font-weight:700;white-space:nowrap">
            ${escapeHtml(amount)}
          </td>
        </tr>
      </table>
      ${paymentBlock}
      <p style="margin:16px 0 0;font-size:12px;color:#8a8779">Nejsme plátci DPH.</p>`
    ),
  };
}

export function bookingRejectedEmailForClient(params: {
  clientName: string;
  artistName: string;
}) {
  return {
    subject: "Vaše poptávka nebyla schválena",
    html: layout(
      "Poptávka nebyla schválena",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, bohužel vaši poptávku tentokrát nemůžeme přijmout. Kontaktujte tatéra přímo a domluvte se na jiném řešení.</p>`,
    ),
  };
}

export function depositExpiredEmailForClient(params: {
  clientName: string;
  artistName: string;
}) {
  return {
    subject: "Záloha nebyla uhrazena – termín vypršel",
    html: layout(
      "Termín vypršel",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, záloha nebyla včas uhrazena, takže se termín uvolnil. Pokud máte o sezení stále zájem, ozvěte se tatérovi a domluvte si nový termín.</p>`,
    ),
  };
}

export function depositPaidAfterExpiryEmailForClient(params: {
  clientName: string;
  artistName: string;
}) {
  return {
    subject: "Záloha bude vrácena – termín už byl uvolněn",
    html: layout(
      "Záloha bude vrácena",
      `<p>Dobrý den, ${escapeHtml(params.clientName)}, vaše platba přišla pozdě – termín se mezitím uvolnil. Zálohu vám automaticky vrátíme. Ozvěte se tatérovi a domluvte si nový termín.</p>`,
    ),
  };
}
