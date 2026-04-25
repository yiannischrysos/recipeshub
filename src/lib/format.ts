export const fmtMoney = (n: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const fmtNum = (n: number, digits = 2) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(
    Number.isFinite(n) ? n : 0,
  );
