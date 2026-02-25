export function toNumber(input: unknown): number {
  const value = typeof input === "string" ? Number(input) : Number(input ?? 0);
  return Number.isFinite(value) ? value : NaN;
}

export function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatAmount(value: number): string {
  const rounded = roundTo2(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function parseSplit(split?: string | null): { hostPct: number; visitPct: number } | null {
  if (!split) return null;
  const match = split.trim().match(/^(\d{1,3})\s*\/\s*(\d{1,3})$/);
  if (!match) return null;

  const hostPct = Number(match[1]);
  const visitPct = Number(match[2]);

  if (!Number.isFinite(hostPct) || !Number.isFinite(visitPct)) return null;
  if (hostPct < 0 || visitPct < 0) return null;
  if (hostPct + visitPct !== 100) return null;

  return { hostPct, visitPct };
}

export function computeSplitAmounts(amountFinal: number, split?: string | null) {
  const parsed = parseSplit(split);
  if (!parsed || !Number.isFinite(amountFinal)) {
    return {
      parsed: null,
      visitingAmount: null as number | null,
      hostAmount: null as number | null,
      visitingAmountText: null as string | null,
    };
  }

  const visitingAmount = roundTo2(amountFinal * (parsed.visitPct / 100));
  const hostAmount = roundTo2(amountFinal - visitingAmount);

  return {
    parsed,
    visitingAmount,
    hostAmount,
    visitingAmountText: formatAmount(visitingAmount),
  };
}
