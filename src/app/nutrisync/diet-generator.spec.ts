import { FOOD_CATALOG } from './food-catalog';
import { SLOT_INFO, forbiddenFlags, generatePlan } from './diet-generator';
import { DietService } from './diet.service';
import { UserProfile } from './models';
import { baseProfile } from './test-fixtures';

const RESTRICTIONS = ['Lactose', 'Glúten', 'Amendoim', 'Castanhas', 'Frutos do mar', 'Ovos', 'Soja'];
const PATTERNS: UserProfile['pattern'][] = ['Onívoro', 'Vegetariano', 'Vegano'];
const byId = new Map(FOOD_CATALOG.map((o) => [o.id, o]));

describe('generatePlan', () => {
  it('gera 7 dias com as calorias da meta em todos eles', () => {
    const plan = generatePlan(baseProfile);
    expect(plan.days).toHaveLength(7);
    expect(new Set(plan.days.map((d) => d.weekday)).size).toBe(7);
    for (const day of plan.days) {
      expect(day.kcal).toBe(plan.summary.kcal);
      expect(day.meals).toHaveLength(5);
    }
  });

  it.each([3, 4, 5, 6])('respeita %i refeições por dia', (n) => {
    const plan = generatePlan({ ...baseProfile, mealsPerDay: n });
    for (const day of plan.days) {
      expect(day.meals).toHaveLength(n);
      expect(day.kcal).toBe(plan.summary.kcal);
    }
  });

  it('nunca repete o mesmo prato duas vezes no mesmo dia', () => {
    const plan = generatePlan({ ...baseProfile, mealsPerDay: 6 });
    for (const day of plan.days) {
      const ids = day.meals.map((m) => m.optionId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('cada refeição vem do conjunto certo (café, lanche, almoço/jantar)', () => {
    const plan = generatePlan({ ...baseProfile, mealsPerDay: 6 });
    for (const m of plan.days[0].meals) {
      expect(byId.get(m.optionId)?.pool).toBe(SLOT_INFO[m.slot].pool);
    }
  });

  it('porções ficam em faixa razoável (0,5x a 2,2x)', () => {
    for (const goal of ['Perder peso', 'Ganhar massa'] as const) {
      const plan = generatePlan({ ...baseProfile, goal });
      for (const day of plan.days) for (const m of day.meals) {
        expect(m.factor).toBeGreaterThan(0.5);
        expect(m.factor).toBeLessThan(2.2);
      }
    }
  });

  it('segurança: nenhuma combinação de restrições + padrão alimentar gera prato proibido', () => {
    let combos = 0;
    for (const pattern of PATTERNS) {
      for (let mask = 0; mask < 1 << RESTRICTIONS.length; mask++) {
        const restrictions = RESTRICTIONS.filter((_, i) => mask & (1 << i));
        const profile = { ...baseProfile, pattern, restrictions, mealsPerDay: 6 };
        const banned = forbiddenFlags(profile);
        const plan = generatePlan(profile);
        for (const day of plan.days) {
          expect(day.kcal).toBe(plan.summary.kcal);
          for (const m of day.meals) {
            const opt = byId.get(m.optionId)!;
            const hit = opt.flags.filter((f) => banned.has(f));
            if (hit.length) throw new Error(`${pattern} [${restrictions}] recebeu "${opt.name}" com ${hit}`);
          }
        }
        combos++;
      }
    }
    expect(combos).toBe(3 * 128);
  });

  it('evita alimentos que a pessoa não gosta quando há alternativa', () => {
    const plan = generatePlan({ ...baseProfile, dislikes: 'frango, brócolis' });
    for (const day of plan.days) for (const m of day.meals) {
      const text = [m.desc, ...m.ingredients].join(' ').toLowerCase();
      expect(text).not.toContain('frango');
      expect(text).not.toContain('brócolis');
    }
  });

  it('marmita: o almoço de dia útil é sempre transportável', () => {
    const plan = generatePlan({ ...baseProfile, cookFreq: 'Todos os dias' });
    for (const day of plan.days.filter((d) => d.weekday >= 1 && d.weekday <= 5)) {
      const lunch = day.meals.find((m) => m.slot === 'lunch')!;
      expect(byId.get(lunch.optionId)?.portable).toBe(true);
    }
  });

  it('preferências influenciam o cardápio', () => {
    const plan = generatePlan({ ...baseProfile, preferences: ['Peixes'], cookFreq: 'Todos os dias' });
    const fishDishes = plan.days.flatMap((d) => d.meals).filter((m) => byId.get(m.optionId)?.tags.includes('fish'));
    expect(fishDishes.length).toBeGreaterThan(0);
  });

  it('varia o cardápio ao longo da semana', () => {
    const plan = generatePlan({ ...baseProfile, cookFreq: 'Todos os dias' });
    const lunches = new Set(plan.days.map((d) => d.meals.find((m) => m.slot === 'lunch')!.optionId));
    expect(lunches.size).toBeGreaterThanOrEqual(4);
  });

  it('mantém o histórico de peso ao refazer o plano', () => {
    const first = generatePlan(baseProfile, new Date('2026-01-01'));
    const again = generatePlan({ ...baseProfile, weightKg: 72 }, new Date('2026-02-01'), first.weights);
    expect(again.weights.map((w) => w.kg)).toEqual([74, 72]);
  });
});

describe('DietService', () => {
  beforeEach(() => localStorage.clear());

  it('começa sem plano (nada de dieta antes de criar)', () => {
    const service = new DietService();
    expect(service.plan()).toBeNull();
    expect(service.hasPlan()).toBe(false);
  });

  it('gera, persiste e recarrega o plano', () => {
    const service = new DietService();
    service.generate(baseProfile);
    expect(service.hasPlan()).toBe(true);
    const reloaded = new DietService();
    expect(reloaded.plan()?.summary.kcal).toBe(service.plan()?.summary.kcal);
  });

  it('ignora dados salvos corrompidos', () => {
    localStorage.setItem('nutrisync.plan.v1', '{not json');
    expect(new DietService().plan()).toBeNull();
  });

  it('trocar refeição muda o prato e mantém as calorias do dia', () => {
    const service = new DietService();
    const before = service.generate(baseProfile);
    const weekday = before.days[0].weekday;
    const oldId = before.days[0].meals[2].optionId;

    service.swapMeal(weekday, 2);

    const day = service.plan()!.days.find((d) => d.weekday === weekday)!;
    expect(day.meals[2].optionId).not.toBe(oldId);
    expect(day.kcal).toBe(before.summary.kcal);
    expect(new Set(day.meals.map((m) => m.optionId)).size).toBe(day.meals.length);
  });

  it('registra peso e rejeita valores absurdos', () => {
    const service = new DietService();
    service.generate(baseProfile);
    expect(service.addWeight(73.2)).toBe(true);
    expect(service.latestWeight()).toBe(73.2);
    expect(service.addWeight(5)).toBe(false);
    expect(service.latestWeight()).toBe(73.2);
  });

  it('reset volta ao estado sem plano', () => {
    const service = new DietService();
    service.generate(baseProfile);
    service.reset();
    expect(service.hasPlan()).toBe(false);
    expect(new DietService().hasPlan()).toBe(false);
  });
});
