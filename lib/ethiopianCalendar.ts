export * from "./calendar/ethiopian";
export * from "./clinical/gestational-age";

import { EthiopianDate } from "./calendar/ethiopian";

export function formatEthiopianDate(eth: EthiopianDate, lang: "am" | "en" = "am"): string {
  if (lang === "am") {
    return eth.formattedAm || `${eth.day} ${eth.monthNameAm} ${eth.year} ዓ.ም`;
  }
  return eth.formattedEn || `${eth.day} ${eth.monthNameEn} ${eth.year} E.C.`;
}
