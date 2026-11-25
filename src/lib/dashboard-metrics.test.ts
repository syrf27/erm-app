import assert from "node:assert/strict";
import test from "node:test";
import { summarizePairedScores, summarizeTreatment, summarizeTreatmentOutcomes } from "./dashboard-metrics";

test("treatment coverage counts only residual risk above appetite", () => {
  assert.deepEqual(
    summarizeTreatment([
      { id: 1, residual: 11, hasPlan: false },
      { id: 2, residual: 12, hasPlan: true },
      { id: 3, residual: 14, hasPlan: false },
      { id: 4, residual: null, hasPlan: true },
    ], 11),
    { appetite: 11, eligible: 2, planned: 1, unplanned: 1, coveragePercent: 50 }
  );
  assert.equal(summarizeTreatment([{ id: 1, residual: 11, hasPlan: true }], 11).coveragePercent, null);
  assert.equal(summarizeTreatment([{ id: 1, residual: 12, hasPlan: true }], null).coveragePercent, null);
});

test("actual and residual averages use the same assessed risks", () => {
  assert.deepEqual(
    summarizePairedScores([
      { actual: 20, residual: 10 },
      { actual: 10, residual: null },
      { actual: 12, residual: 6 },
    ]),
    { count: 2, actualAvg: 16, residualAvg: 8 }
  );
});

test("2026 scenario reports four planned risks out of four above appetite", () => {
  const risks = Array.from({ length: 160 }, (_, index) => ({
    id: index + 1,
    residual: index < 4 ? 12 : 11,
    hasPlan: index < 4,
  }));
  const summary = summarizeTreatment(risks, 11);
  assert.equal(summary.eligible, 4);
  assert.equal(summary.planned, 4);
  assert.equal(summary.coveragePercent, 100);
});

test("treatment outcomes count only latest final result per planned risk", () => {
  const summary = summarizeTreatmentOutcomes(
    [1, 2, 3, 4],
    [
      { riskId: 1, besaran: 8, residualAcuan: 14 },
      { riskId: 1, besaran: 10, residualAcuan: 14 },
      { riskId: 2, besaran: 12, residualAcuan: 12 },
      { riskId: 3, besaran: 14, residualAcuan: 12 },
      { riskId: 9, besaran: 5, residualAcuan: 15 },
    ],
    11
  );
  assert.deepEqual(summary, {
    totalPlans: 4, assessed: 3, notAssessed: 1, comparable: 3,
    decreased: 1, unchanged: 1, increased: 1, withinAppetite: 1,
  });
  assert.equal(summarizeTreatmentOutcomes([1], [], 11).notAssessed, 1);
});
