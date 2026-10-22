import { basalRate, calculateTargets, validateBody } from './calculator';
import { baseProfile } from './test-fixtures';

describe('calculator', () => {
  it('calcula o metabolismo basal (Mifflin-St Jeor)', () => {
    expect(basalRate('F', 74, 168, 32)).toBe(1469); // 740 + 1050 - 160 - 161
    expect(basalRate('M', 80, 180, 30)).toBe(1780); // 800 + 1125 - 150 + 5
  });

  it('perder peso: déficit de 20% do gasto (limitado a 500 kcal)', () => {
    const s = calculateTargets(baseProfile);
    expect(s.bmr).toBe(1469);
    expect(s.tdee).toBe(2277); // 1469 * 1,55
    expect(s.kcal).toBe(1820); // 2277 - 455
    expect(s.targetWeightKg).toBe(68);
    expect(s.weeklyRateKg).toBeGreaterThan(0.3);
    expect(s.weeklyRateKg).toBeLessThan(0.5);
    expect(s.weeksToGoal).toBeGreaterThan(10);
  });

  it('manter: calorias iguais ao gasto, sem previsão de meta', () => {
    const s = calculateTargets({ ...baseProfile, goal: 'Manter o peso' });
    expect(Math.abs(s.kcal - s.tdee)).toBeLessThanOrEqual(5);
    expect(s.weeklyRateKg).toBe(0);
    expect(s.weeksToGoal).toBeNull();
    expect(s.targetWeightKg).toBe(74);
  });

  it('ganhar massa: superávit de 300 kcal', () => {
    const s = calculateTargets({ ...baseProfile, goal: 'Ganhar massa', deltaKg: 4 });
    expect(Math.abs(s.kcal - (s.tdee + 300))).toBeLessThanOrEqual(5);
    expect(s.targetWeightKg).toBe(78);
  });

  it('nunca sugere abaixo do piso calórico', () => {
    const s = calculateTargets({ ...baseProfile, age: 60, heightCm: 150, weightKg: 45, activity: 'Sedentária', deltaKg: 2 });
    expect(s.kcal).toBe(1200);
    expect(s.notes.length).toBeGreaterThan(0);
  });

  it('macros somam as calorias alvo (±2%)', () => {
    const s = calculateTargets(baseProfile);
    const m = s.macroTargets;
    const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9;
    expect(Math.abs(kcal - s.kcal) / s.kcal).toBeLessThan(0.02);
  });
});

describe('validateBody', () => {
  const ok = { sex: 'F' as const, age: 32, heightCm: 168, weightKg: 74, goal: 'Perder peso' as const, deltaKg: 6 };

  it('aceita dados válidos', () => {
    expect(validateBody(ok)).toEqual({});
  });

  it('exige todos os campos', () => {
    const e = validateBody({ ...ok, sex: '', age: null, heightCm: null, weightKg: null });
    expect(Object.keys(e).sort()).toEqual(['age', 'heightCm', 'sex', 'weightKg']);
  });

  it('bloqueia menores de 18 anos', () => {
    expect(validateBody({ ...ok, age: 17 })['age']).toContain('18');
  });

  it('bloqueia meta que leve o IMC abaixo de 18,5', () => {
    const e = validateBody({ ...ok, heightCm: 168, weightKg: 55, deltaKg: 6 });
    expect(e['goal']).toBeDefined();
  });

  it('permite ganhar peso mesmo com IMC baixo', () => {
    const e = validateBody({ ...ok, weightKg: 48, goal: 'Ganhar massa', deltaKg: 5 });
    expect(e['goal']).toBeUndefined();
  });
});
