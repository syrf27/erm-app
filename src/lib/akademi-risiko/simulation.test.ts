import test from "node:test";
import assert from "node:assert/strict";
import { calculate, canAdvance, controls, cost, initialSimulation, reducer, score, type ControlId, type SimulationState } from "./simulation";

const at = (step: number, extra: Partial<SimulationState> = {}) => ({ ...initialSimulation(), step, interacted: true, ...extra });
test("normal load and overload follow traffic and capacity", () => {
  const normal = calculate(at(0));
  assert.equal(normal.serverLoad, 45);
  assert.equal(normal.availableCapacity, 550);
  assert.equal(normal.failedRequests, 0);
  const warning = calculate(at(1));
  assert.equal(warning.serverLoad, 120);
  assert.equal(warning.failedRequests, 0);
  const incident = calculate(at(2));
  assert.equal(incident.failedRequests, 200);
  assert.equal(incident.availableCapacity, 0);
  assert.equal(incident.affectedUsers, 320);
});
test("lesson events trigger state changes", () => {
  const start = reducer(initialSimulation(), { type: "EVENT", event: "START_TRAINING" });
  assert.equal(start.interacted, true);
  const warning = reducer({ ...start, step: 1, interacted: false }, { type: "EVENT", event: "INCREASE_TRAFFIC" });
  assert.equal(calculate(warning).serverLoad, 120);
  const incident = reducer({ ...warning, step: 2, interacted: false }, { type: "EVENT", event: "SERVER_OVERLOAD" });
  assert.equal(calculate(incident).failedRequests, 200);
});
test("each control has a concrete effect and capacity controls prevent failure", () => {
  const base = calculate(at(7, { mitigationRun: true }));
  for (const id of Object.keys(controls) as ControlId[]) {
    const result = calculate(at(7, { selected: [id], mitigationRun: true }));
    assert.ok(result.effectiveness > 0, id);
    assert.ok(result.residualScore < base.residualScore || result.failedRequests < base.failedRequests || result.recoveryMinutes < base.recoveryMinutes, id);
  }
  assert.equal(calculate(at(7, { selected: ["capacity"], mitigationRun: true })).failedRequests, 0);
  assert.equal(calculate(at(7, { selected: ["backup"], mitigationRun: true })).failedRequests, 0);
});
test("mitigation budget rejects an over-limit selection", () => {
  let state = initialSimulation();
  state = reducer(state, { type: "SELECT", id: "capacity" });
  state = reducer(state, { type: "SELECT", id: "autoscale" });
  assert.equal(cost(state), 75);
  assert.deepEqual(reducer(state, { type: "SELECT", id: "whatsapp" }), state);
});
test("inherent and residual scores are deterministic", () => {
  assert.equal(score(4, 4), 19);
  const state = at(7, { likelihood: 4, impact: 4, selected: ["capacity", "sop"], mitigationRun: true, retestRun: true });
  const first = calculate(state), second = calculate(state);
  assert.deepEqual(first, second);
  assert.equal(first.inherentScore, 19);
  assert.equal(first.residualScore, 11);
  assert.equal(first.affectedUsers, 0);
});
test("pause, resume, replay, reset and step navigation", () => {
  let state = initialSimulation();
  assert.equal(canAdvance(state), false);
  state = reducer(state, { type: "INTERACT" });
  assert.equal(canAdvance(state), true);
  state = reducer(state, { type: "TICK", delta: 1 });
  assert.equal(state.elapsed, 1);
  state = reducer(state, { type: "PLAY", value: false });
  assert.equal(reducer(state, { type: "TICK", delta: 1 }).elapsed, 1);
  state = reducer(state, { type: "PLAY", value: true });
  assert.equal(reducer(state, { type: "TICK", delta: 1 }).elapsed, 2);
  state = reducer(state, { type: "REPLAY" });
  assert.equal(state.elapsed, 0);
  state = reducer(state, { type: "TICK", delta: 5 });
  assert.equal(state.playing, false);
  state = reducer(state, { type: "PLAY", value: true });
  assert.equal(state.elapsed, 0);
  assert.equal(state.playing, true);
  state = reducer(state, { type: "STEP", step: 1 });
  assert.equal(state.step, 1);
  assert.equal(canAdvance(state), false);
  assert.deepEqual(reducer(state, { type: "RESET" }), initialSimulation());
});
test("completion gates require ratings, controls, simulation and retest", () => {
  let state = at(4, { likelihood: 0, impact: 0 });
  assert.equal(canAdvance(state), false);
  state = reducer(reducer(state, { type: "RATE", field: "likelihood", value: 4 }), { type: "RATE", field: "impact", value: 4 });
  assert.equal(canAdvance(state), true);
  state = reducer(state, { type: "STEP", step: 5 });
  assert.equal(canAdvance(state), false);
  state = reducer(state, { type: "SELECT", id: "capacity" });
  assert.equal(canAdvance(state), true);
  state = reducer(state, { type: "STEP", step: 6 });
  assert.equal(canAdvance(state), false);
  state = reducer(state, { type: "RUN_MITIGATION" });
  assert.equal(canAdvance(state), true);
  state = reducer(state, { type: "STEP", step: 7 });
  assert.equal(canAdvance(state), false);
  state = reducer(state, { type: "RETEST" });
  assert.equal(canAdvance(state), true);
});
test("retest starts calm and deterministically applies the same traffic spike", () => {
  const before = calculate(at(7, { selected: ["sop"], mitigationRun: true, retestRun: false }));
  const after = calculate(at(7, { selected: ["sop"], mitigationRun: true, retestRun: true }));
  assert.equal(before.serverLoad, 45);
  assert.equal(before.failedRequests, 0);
  assert.equal(after.serverLoad, 120);
  assert.equal(after.failedRequests, 200);
});
test("saved progress is restored with safe controls and paused animation", () => {
  const state = reducer(initialSimulation(), { type: "RESTORE", value: { step: 7, selected: ["capacity", "autoscale", "whatsapp"], likelihood: 4, impact: 3, mitigationRun: true, retestRun: true } });
  assert.equal(state.step, 7);
  assert.deepEqual(state.selected, []);
  assert.equal(state.mitigationRun, false);
  assert.equal(state.playing, false);
});
