import test from "node:test";
import assert from "node:assert/strict";
import { BPS_MAX_RISK_TOLERANCE, bpsRiskColor, bpsRiskLevel, bpsRiskScore } from "./bps-risk-matrix";

test("BPS risk score is a matrix lookup, not multiplication", () => {
  assert.equal(bpsRiskScore(3, 3), 14);
  assert.equal(bpsRiskScore(2, 5), 21);
  assert.equal(bpsRiskScore(5, 1), 9);
  assert.notEqual(bpsRiskScore(2, 5), 2 * 5);
});

test("BPS levels and tolerance follow the official bands", () => {
  assert.equal(bpsRiskLevel(5), "Sangat Rendah");
  assert.equal(bpsRiskLevel(11), "Rendah");
  assert.equal(bpsRiskLevel(15), "Sedang");
  assert.equal(bpsRiskLevel(19), "Tinggi");
  assert.equal(bpsRiskLevel(20), "Sangat Tinggi");
  assert.equal(bpsRiskColor(11), "green");
  assert.equal(BPS_MAX_RISK_TOLERANCE, 11);
});
