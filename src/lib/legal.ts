import { optionalEnv } from "./env";

export type LegalOperator = {
  name: string;
  address: string | null;
  email: string;
  ico: string | null;
  effectiveDate: string;
};

/**
 * Údaje provozovatele pro právní stránky. Pro fyzickou osobu bez IČO
 * stačí jméno, kontakt a korespondenční adresa; IČO je volitelné.
 */
export function getLegalOperator(): LegalOperator {
  return {
    name: optionalEnv("LEGAL_OPERATOR_NAME") ?? "Jan Fiala",
    address: optionalEnv("LEGAL_OPERATOR_ADDRESS") ?? null,
    email: optionalEnv("LEGAL_OPERATOR_EMAIL") ?? "janfiala331@gmail.com",
    ico: optionalEnv("LEGAL_OPERATOR_ICO") ?? null,
    effectiveDate: optionalEnv("LEGAL_EFFECTIVE_DATE") ?? "8. listopadu 2026",
  };
}
