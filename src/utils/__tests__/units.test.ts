import { describe, expect, it } from 'vitest';
import {
  computePlates,
  formatWeight,
  formatWeightCompact,
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  plateSetup,
  toDisplayWeight,
  weightStep,
  weightUnitLabel,
} from '../units';

describe('kg↔lb conversion', () => {
  it('round-trips within a tenth', () => {
    for (const kg of [2.5, 20, 60, 102.5, 180]) {
      expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 6);
    }
  });

  it('converts 100kg ≈ 220.5lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
  });
});

describe('display boundary', () => {
  it('metric passes through', () => {
    expect(toDisplayWeight(60, 'metric')).toBe(60);
    expect(fromDisplayWeight(60, 'metric')).toBe(60);
  });

  it('imperial converts and rounds to 1 decimal', () => {
    expect(toDisplayWeight(60, 'imperial')).toBe(132.3);
    expect(fromDisplayWeight(135, 'imperial')).toBe(61.2);
  });

  it('storage stays kg after imperial edit round-trip', () => {
    const enteredLb = 225;
    const storedKg = fromDisplayWeight(enteredLb, 'imperial');
    expect(storedKg).toBeCloseTo(102.1, 1);
    expect(toDisplayWeight(storedKg, 'imperial')).toBeCloseTo(225.1, 1);
  });
});

describe('labels & steps', () => {
  it('unit labels', () => {
    expect(weightUnitLabel('metric')).toBe('kg');
    expect(weightUnitLabel('imperial')).toBe('lb');
  });

  it('stepper increments: 2.5kg / 5lb', () => {
    expect(weightStep('metric')).toBe(2.5);
    expect(weightStep('imperial')).toBe(5);
  });

  it('formatWeight', () => {
    expect(formatWeight(60, 'metric')).toBe('60 kg');
    expect(formatWeight(62.5, 'metric')).toBe('62.5 kg');
    expect(formatWeight(60, 'imperial')).toBe('132.3 lb');
  });

  it('formatWeightCompact compacts thousands', () => {
    expect(formatWeightCompact(480, 'metric')).toBe('480');
    expect(formatWeightCompact(12_340, 'metric')).toBe('12.3K');
    expect(formatWeightCompact(480, 'imperial')).toBe('1.06K');
  });
});

describe('plate calculator', () => {
  it('metric 100kg → 40 per side, greedy 25+15, no remainder', () => {
    const r = computePlates(100, 'metric');
    expect(r.perSide).toBe(40);
    expect(r.breakdown).toEqual([
      { plate: 25, count: 1 },
      { plate: 15, count: 1 },
    ]);
    expect(r.remainder).toBe(0);
  });

  it('metric 47.5kg → 10 + 2.5 + 1.25 per side', () => {
    const r = computePlates(47.5, 'metric');
    expect(r.breakdown).toEqual([
      { plate: 10, count: 1 },
      { plate: 2.5, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(r.remainder).toBe(0);
  });

  it('imperial uses a 45lb bar and lb plates', () => {
    expect(plateSetup('imperial').barDisplay).toBe(45);
    // 225lb total → 90lb per side → 2×45
    const r = computePlates(lbToKg(225), 'imperial');
    expect(r.breakdown).toEqual([{ plate: 45, count: 2 }]);
    expect(r.remainder).toBeCloseTo(0, 5);
  });

  it('bar-only and below never yields negative plates', () => {
    const r = computePlates(15, 'metric');
    expect(r.perSide).toBe(0);
    expect(r.breakdown).toEqual([]);
  });
});
