export function summarizeTreatment(
  risks: readonly { id: number; residual: number | null; hasPlan: boolean }[],
  appetite: number | null
) {
  if (appetite == null || !Number.isFinite(appetite)) {
    return { appetite: null, eligible: 0, planned: 0, unplanned: 0, coveragePercent: null };
  }
  const eligibleRisks = risks.filter((risk) => risk.residual != null && risk.residual > appetite);
  const planned = eligibleRisks.filter((risk) => risk.hasPlan).length;
  return {
    appetite,
    eligible: eligibleRisks.length,
    planned,
    unplanned: eligibleRisks.length - planned,
    coveragePercent: eligibleRisks.length ? Math.round((planned / eligibleRisks.length) * 100) : null,
  };
}

export function summarizePairedScores(
  risks: readonly { actual: number | null; residual: number | null }[]
) {
  const paired = risks.filter((risk): risk is { actual: number; residual: number } => risk.actual != null && risk.residual != null);
  const count = paired.length;
  return {
    count,
    actualAvg: count ? +(paired.reduce((sum, risk) => sum + risk.actual, 0) / count).toFixed(2) : null,
    residualAvg: count ? +(paired.reduce((sum, risk) => sum + risk.residual, 0) / count).toFixed(2) : null,
  };
}
