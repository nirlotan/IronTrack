/**
 * Weight unit handling. Storage is ALWAYS kilograms (schema preserved);
 * these helpers convert at the display/input boundary only.
 */
import type { Units } from '../store/appStore';

export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** kg (storage) → display number in the user's unit, rounded to 1 decimal. */
export function toDisplayWeight(kg: number, units: Units): number {
  const v = units === 'imperial' ? kgToLb(kg) : kg;
  return Math.round(v * 10) / 10;
}

/** display number in the user's unit → kg for storage (1-decimal kg). */
export function fromDisplayWeight(value: number, units: Units): number {
  const kg = units === 'imperial' ? lbToKg(value) : value;
  return Math.round(kg * 10) / 10;
}

export function weightUnitLabel(units: Units): 'kg' | 'lb' {
  return units === 'imperial' ? 'lb' : 'kg';
}

/** Sensible stepper increment per unit system. */
export function weightStep(units: Units): number {
  return units === 'imperial' ? 5 : 2.5;
}

/**
 * Volume formatting (kg storage → user unit, compacted).
 * e.g. 12,340kg → "12.3K kg" / "27.2K lb".
 */
export function formatWeightCompact(kg: number, units: Units): string {
  const v = units === 'imperial' ? kgToLb(kg) : kg;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}K`;
  return `${Math.round(v).toLocaleString()}`;
}

/** Full label: "142.5 kg" / "314 lb". */
export function formatWeight(kg: number, units: Units): string {
  const v = toDisplayWeight(kg, units);
  const rounded = Number.isInteger(v) ? v.toString() : v.toFixed(1);
  return `${rounded} ${weightUnitLabel(units)}`;
}

export interface PlateSetup {
  barKg: number;
  /** Plate denominations in the user's display unit. */
  plates: number[];
  /** Bar weight in the user's display unit (for labels). */
  barDisplay: number;
}

/** Metric: 20kg bar + kg plates. Imperial: 45lb bar + lb plates. */
export function plateSetup(units: Units): PlateSetup {
  if (units === 'imperial') {
    return { barKg: lbToKg(45), plates: [45, 35, 25, 10, 5, 2.5], barDisplay: 45 };
  }
  return { barKg: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], barDisplay: 20 };
}

export interface PlateBreakdownResult {
  /** Per-side plates in display units. */
  breakdown: Array<{ plate: number; count: number }>;
  /** Unloadable remainder per side, display units. */
  remainder: number;
  /** Total per-side load, display units. */
  perSide: number;
}

/** Compute per-side plate loading for a target total weight (kg storage). */
export function computePlates(totalKg: number, units: Units): PlateBreakdownResult {
  const setup = plateSetup(units);
  const totalDisplay = units === 'imperial' ? kgToLb(totalKg) : totalKg;
  const perSide = Math.max(0, (totalDisplay - setup.barDisplay) / 2);
  const breakdown: Array<{ plate: number; count: number }> = [];
  let remaining = perSide;
  for (const p of setup.plates) {
    const c = Math.floor((remaining + 1e-9) / p);
    if (c > 0) {
      breakdown.push({ plate: p, count: c });
      remaining = Math.round((remaining - c * p) * 100) / 100;
    }
  }
  return { breakdown, remainder: remaining, perSide };
}
