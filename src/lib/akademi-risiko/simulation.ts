import { bpsRiskLevel, bpsRiskScore } from "./bps-risk-matrix";

export type Phase = "normal" | "warning" | "incident" | "impact" | "inherent" | "planning" | "mitigation" | "retest" | "residual";
export type Speed = 0.5 | 1 | 2;
export type ControlId = "loadTest" | "capacity" | "autoscale" | "backup" | "sop" | "whatsapp";
export type SimulationEvent = "START_TRAINING" | "INCREASE_TRAFFIC" | "SERVER_OVERLOAD" | "SERVICE_DISRUPTED" | "APPLY_LOAD_TESTING" | "ADD_SERVER_CAPACITY" | "ACTIVATE_BACKUP" | "RECOVER_SERVICE";
export type SimulationState = {
  step: number; phase: Phase; elapsed: number; playing: boolean; speed: Speed; revision: number;
  interacted: boolean; selected: ControlId[]; budget: number;
  likelihood: number; impact: number; mitigationRun: boolean; retestRun: boolean; comparing: boolean;
};
export type SimulationAction =
  | { type: "TICK"; delta: number } | { type: "STEP"; step: number } | { type: "REPLAY" } | { type: "RESET" }
  | { type: "RESTORE"; value: Partial<SimulationState> }
  | { type: "EVENT"; event: SimulationEvent }
  | { type: "PLAY"; value: boolean } | { type: "SPEED"; value: Speed }
  | { type: "INTERACT" } | { type: "SELECT"; id: ControlId }
  | { type: "RATE"; field: "likelihood" | "impact"; value: number }
  | { type: "RUN_MITIGATION" } | { type: "RETEST" } | { type: "COMPARE" };

export const controls: Record<ControlId, { label: string; cost: number; days: number; effectiveness: number; capacity: number; likelihood: number; impact: number }> = {
  loadTest: { label: "Load testing", cost: 15, days: 4, effectiveness: 15, capacity: 0, likelihood: 1, impact: 0 },
  capacity: { label: "Tambah kapasitas", cost: 35, days: 8, effectiveness: 30, capacity: 420, likelihood: 1, impact: 0 },
  autoscale: { label: "Auto scaling", cost: 40, days: 12, effectiveness: 35, capacity: 550, likelihood: 1, impact: 0 },
  backup: { label: "Server cadangan", cost: 30, days: 6, effectiveness: 25, capacity: 250, likelihood: 0, impact: 1 },
  sop: { label: "SOP gangguan", cost: 10, days: 2, effectiveness: 10, capacity: 0, likelihood: 0, impact: 1 },
  whatsapp: { label: "Grup WhatsApp peserta", cost: 5, days: 1, effectiveness: 5, capacity: 0, likelihood: 0, impact: 1 },
};
export const order: ControlId[] = ["loadTest", "capacity", "autoscale", "backup", "sop", "whatsapp"];
export const initialSimulation = (): SimulationState => ({ step: 0, phase: "normal", elapsed: 0, playing: true, speed: 1, revision: 0, interacted: false, selected: [], budget: 75, likelihood: 0, impact: 0, mitigationRun: false, retestRun: false, comparing: false });
export const phases: Phase[] = ["normal", "warning", "incident", "impact", "inherent", "planning", "mitigation", "retest", "residual"];
export const duration = [4, 4, 3, 4, 2, 2, 5, 5, 5];
export const cost = (state: SimulationState) => state.selected.reduce((n, id) => n + controls[id].cost, 0);
// Kept for the original engine. The score is deliberately a BPS matrix lookup,
// not a multiplication of likelihood and impact.
export const score = (likelihood: number, impact: number) => bpsRiskScore(likelihood, impact);
export const level = (n: number) => bpsRiskLevel(n).toLowerCase();

export function reducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case "TICK": {
      if (!state.playing) return state;
      const elapsed = Math.min(duration[state.step], state.elapsed + action.delta * state.speed);
      return { ...state, elapsed, playing: elapsed < duration[state.step] };
    }
    case "STEP": return { ...state, step: Math.max(0, Math.min(8, action.step)), phase: phases[Math.max(0, Math.min(8, action.step))], elapsed: 0, playing: true, interacted: false, revision: state.revision + 1 };
    case "REPLAY": return { ...state, elapsed: 0, playing: true, revision: state.revision + 1 };
    case "RESET": return initialSimulation();
    case "RESTORE": {
      const source = action.value;
      const selected = Array.isArray(source.selected) ? source.selected.filter((id): id is ControlId => typeof id === "string" && id in controls) : [];
      const safe = selected.reduce((n, id) => n + controls[id].cost, 0) <= 75 ? selected : [];
      const step = Number.isInteger(source.step) ? Math.max(0, Math.min(8, source.step!)) : 0;
      return { ...initialSimulation(), step, phase: phases[step], selected: safe, likelihood: Number.isInteger(source.likelihood) ? Math.max(0, Math.min(5, source.likelihood!)) : 0, impact: Number.isInteger(source.impact) ? Math.max(0, Math.min(5, source.impact!)) : 0, mitigationRun: Boolean(source.mitigationRun) && safe.length > 0, retestRun: Boolean(source.retestRun) && Boolean(source.mitigationRun), playing: false, speed: source.speed === .5 || source.speed === 2 ? source.speed : 1 };
    }
    case "PLAY": return action.value && state.elapsed >= duration[state.step] ? { ...state, elapsed: 0, playing: true, revision: state.revision + 1 } : { ...state, playing: action.value };
    case "SPEED": return { ...state, speed: action.value };
    case "INTERACT": return { ...state, interacted: true, elapsed: 0, playing: true, revision: state.revision + 1 };
    case "EVENT": {
      if (action.event === "START_TRAINING" || action.event === "INCREASE_TRAFFIC" || action.event === "SERVER_OVERLOAD" || action.event === "SERVICE_DISRUPTED") return { ...state, interacted: true, elapsed: 0, playing: true, revision: state.revision + 1 };
      if (action.event === "RECOVER_SERVICE") return cost(state) ? { ...state, mitigationRun: true, interacted: true, elapsed: 0, playing: true, revision: state.revision + 1 } : state;
      return state;
    }
    case "SELECT": {
      const selected = state.selected.includes(action.id) ? state.selected.filter(id => id !== action.id) : [...state.selected, action.id];
      return selected.reduce((n, id) => n + controls[id].cost, 0) <= state.budget ? { ...state, selected, mitigationRun: false, retestRun: false } : state;
    }
    case "RATE": return { ...state, [action.field]: Math.max(1, Math.min(5, action.value)) };
    case "RUN_MITIGATION": return cost(state) > 0 ? { ...state, mitigationRun: true, retestRun: false, interacted: true, elapsed: 0, playing: true, revision: state.revision + 1 } : state;
    case "RETEST": return state.mitigationRun ? { ...state, retestRun: true, interacted: true, elapsed: 0, playing: true, revision: state.revision + 1 } : state;
    case "COMPARE": return { ...state, comparing: !state.comparing, interacted: true };
  }
}

export function calculate(state: SimulationState) {
  const mitigated = state.mitigationRun && state.step >= 6;
  const stressed = state.step === 7 ? state.retestRun : state.step > 1 || (state.step === 1 && state.interacted);
  const incident = state.step === 7 ? state.retestRun : state.step > 2 || (state.step === 2 && state.interacted);
  const traffic = stressed ? 1200 : 450;
  const activeUsers = stressed ? 900 : 500;
  const capacity = 1000 + (mitigated ? state.selected.reduce((n, id) => n + controls[id].capacity, 0) : 0);
  const effectiveCapacity = capacity + (mitigated && state.selected.includes("loadTest") ? 120 : 0);
  const overload = Math.max(0, traffic - effectiveCapacity);
  const backup = mitigated && state.selected.includes("backup");
  const failedRequests = !incident ? 0 : Math.max(0, overload - (backup ? 200 : 0));
  const affectedUsers = !incident ? 0 : Math.min(activeUsers, Math.round(failedRequests * 1.6));
  const recoveryMinutes = !incident || failedRequests === 0 ? 0 : Math.max(2, Math.round(42 - (backup ? 18 : 0) - (mitigated && state.selected.includes("sop") ? 12 : 0)));
  const effectiveness = mitigated ? Math.min(95, state.selected.reduce((n, id) => n + controls[id].effectiveness, 0)) : 0;
  const inherentLikelihood = state.likelihood || 4, inherentImpact = state.impact || 4;
  const residualLikelihood = Math.max(1, inherentLikelihood - (mitigated ? state.selected.reduce((n, id) => n + controls[id].likelihood, 0) : 0) - (mitigated && failedRequests === 0 ? 1 : 0));
  const residualImpact = Math.max(1, inherentImpact - (mitigated ? state.selected.reduce((n, id) => n + controls[id].impact, 0) : 0));
  return { activeUsers, traffic, capacity, availableCapacity: Math.max(0, effectiveCapacity - traffic), serverLoad: Math.min(150, Math.round(traffic / effectiveCapacity * 100)), failedRequests, affectedUsers, recoveryMinutes, availability: !incident ? 99.9 : Math.max(70, 99.9 - failedRequests / traffic * 50), effectiveness, inherentScore: score(inherentLikelihood, inherentImpact), residualScore: score(residualLikelihood, residualImpact), inherentLikelihood, inherentImpact, residualLikelihood, residualImpact, overload, backup, usedBudget: cost(state) };
}

export function canAdvance(state: SimulationState) {
  if (state.step === 0 || state.step === 1 || state.step === 2) return state.interacted;
  if (state.step === 4) return state.likelihood > 0 && state.impact > 0;
  if (state.step === 5) return cost(state) > 0;
  if (state.step === 6) return state.mitigationRun;
  if (state.step === 7) return state.retestRun;
  return true;
}
