import { getCodes } from "country-list";

export type CountryItem = {
  code: string;
  label: string;
};

export const ALL_COUNTRY_CODES: string[] = (getCodes() as string[]).map(
  (code: string) => code.toUpperCase(),
);

export function getCountryLabel(code: string, locale?: string): string {
  try {
    return (
      new Intl.DisplayNames(locale ?? "en", { type: "region" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}

export function getSortedCountries(): CountryItem[] {
  return ALL_COUNTRY_CODES.map((code) => ({
    code,
    label: getCountryLabel(code),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}
