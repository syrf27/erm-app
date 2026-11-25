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

export function summarizeTreatmentOutcomes(
  planRiskIds: readonly number[],
  finalMonitorings: readonly { riskId: number; besaran: number | null; residualAcuan: number | null }[],
  appetite: number | null
) {
  const planned = new Set(planRiskIds);
  const latest = new Map<number, { besaran: number | null; residualAcuan: number | null }>();
  for (const monitoring of finalMonitorings) {
    if (planned.has(monitoring.riskId) && !latest.has(monitoring.riskId)) latest.set(monitoring.riskId, monitoring);
  }
  let assessed = 0;
  let comparable = 0;
  let decreased = 0;
  let unchanged = 0;
  let increased = 0;
  let withinAppetite = 0;
  for (const monitoring of Array.from(latest.values())) {
    if (monitoring.besaran == null) continue;
    assessed++;
    if (monitoring.residualAcuan != null) {
      comparable++;
      if (monitoring.besaran < monitoring.residualAcuan) decreased++;
      else if (monitoring.besaran > monitoring.residualAcuan) increased++;
      else unchanged++;
    }
    if (appetite != null && monitoring.besaran <= appetite) withinAppetite++;
  }
  return {
    totalPlans: planned.size,
    assessed,
    notAssessed: planned.size - assessed,
    comparable,
    decreased,
    unchanged,
    increased,
    withinAppetite: appetite == null ? null : withinAppetite,
  };
}
