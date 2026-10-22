import { calculateTargets } from './calculator';
import { FOOD_CATALOG, FoodOption, Flag, Pool, Tag, optionKcal } from './food-catalog';
import { DayPlan, DietPlan, PlannedMeal, Slot, UserProfile, WeightEntry } from './models';

export const SLOT_INFO: Record<Slot, { label: string; time: string; pool: Pool }> = {
  breakfast: { label: 'Café da manhã', time: '07:30', pool: 'breakfast' },
  snackAm: { label: 'Lanche da manhã', time: '10:30', pool: 'snack' },
  lunch: { label: 'Almoço', time: '13:00', pool: 'main' },
  snackPm: { label: 'Lanche da tarde', time: '16:30', pool: 'snack' },
  dinner: { label: 'Jantar', time: '20:00', pool: 'main' },
  supper: { label: 'Ceia', time: '22:00', pool: 'snack' },
};

/** Quais refeições existem para cada quantidade por dia, e quanto das calorias cada uma recebe. */
const LAYOUTS: Record<number, { slot: Slot; share: number }[]> = {
  3: [
    { slot: 'breakfast', share: 0.25 },
    { slot: 'lunch', share: 0.4 },
    { slot: 'dinner', share: 0.35 },
  ],
  4: [
    { slot: 'breakfast', share: 0.25 },
    { slot: 'lunch', share: 0.35 },
    { slot: 'snackPm', share: 0.15 },
    { slot: 'dinner', share: 0.25 },
  ],
  5: [
    { slot: 'breakfast', share: 0.22 },
    { slot: 'snackAm', share: 0.1 },
    { slot: 'lunch', share: 0.32 },
    { slot: 'snackPm', share: 0.12 },
    { slot: 'dinner', share: 0.24 },
  ],
  6: [
    { slot: 'breakfast', share: 0.2 },
    { slot: 'snackAm', share: 0.08 },
    { slot: 'lunch', share: 0.3 },
    { slot: 'snackPm', share: 0.12 },
    { slot: 'dinner', share: 0.22 },
    { slot: 'supper', share: 0.08 },
  ],
};

const RESTRICTION_FLAGS: Record<string, Flag[]> = {
  Lactose: ['lactose'],
  Glúten: ['gluten'],
  Amendoim: ['peanut'],
  Castanhas: ['nuts'],
  'Frutos do mar': ['seafood'],
  Ovos: ['egg'],
  Soja: ['soy'],
};

const PATTERN_FLAGS: Record<UserProfile['pattern'], Flag[]> = {
  Onívoro: [],
  Vegetariano: ['meat', 'fish', 'seafood'],
  Vegano: ['meat', 'fish', 'seafood', 'egg', 'dairy', 'lactose', 'honey'],
};

const PREFERENCE_TAGS: Record<string, Tag> = {
  'Comida brasileira': 'brazilian',
  Frango: 'chicken',
  Peixes: 'fish',
  'Arroz e feijão': 'rice-beans',
  Frutas: 'fruit',
  Massas: 'pasta',
  Vegetais: 'vegetables',
  'Café da manhã salgado': 'savory',
};

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface RankContext {
  targetKcal: number;
  /** O almoço precisa caber numa marmita. */
  needsPortable: boolean;
  usedToday?: ReadonlySet<string>;
  usedWeek?: ReadonlyMap<string, number>;
  prevId?: string;
  blockIdx?: number;
}

export function forbiddenFlags(profile: UserProfile): Set<Flag> {
  const banned = new Set<Flag>(PATTERN_FLAGS[profile.pattern]);
  for (const r of profile.restrictions) for (const f of RESTRICTION_FLAGS[r] ?? []) banned.add(f);
  return banned;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Alimentos que a pessoa não gosta / outros cuidados informados em texto livre. */
export function avoidKeywords(profile: UserProfile): string[] {
  return `${profile.dislikes},${profile.otherCare}`
    .split(/[,;\n]/)
    .map((k) => normalize(k.trim()))
    .filter((k) => k.length >= 3 && !['nenhum', 'nenhuma', 'nao', 'outro'].includes(k));
}

const matchesKeyword = (text: string[], keywords: string[]) =>
  text.some((t) => keywords.some((k) => normalize(t).includes(k)));

/** Pratos permitidos: filtro rígido por restrições e padrão alimentar; evita os "não gosto" quando possível. */
export function allowedOptions(profile: UserProfile, pool: Pool): FoodOption[] {
  const banned = forbiddenFlags(profile);
  const safe = FOOD_CATALOG.filter((o) => o.pool === pool && !o.flags.some((f) => banned.has(f)));
  const keywords = avoidKeywords(profile);
  if (!keywords.length) return safe;
  const liked = safe.filter((o) => !matchesKeyword([o.name, ...o.ingredients], keywords));
  return liked.length >= 3 ? liked : safe;
}

const MAX_COST: Record<string, 1 | 2 | 3> = { Econômico: 1, Equilibrado: 2, Flexível: 3 };

function maxPrepMinutes(profile: UserProfile, slot: Slot): number {
  if (slot === 'dinner' && profile.dinner.startsWith('Peço')) return 15;
  return profile.cookTime.includes('1 hora') ? 60 : 30;
}

/** Candidatos do mais para o menos adequado ao perfil. */
export function rankOptions(profile: UserProfile, slot: Slot, ctx: RankContext): FoodOption[] {
  const prefTags = profile.preferences.map((p) => PREFERENCE_TAGS[p]).filter((t): t is Tag => !!t);
  const maxCost = MAX_COST[profile.budget] ?? 2;
  const maxPrep = maxPrepMinutes(profile, slot);
  const wantsProtein = profile.goal !== 'Manter o peso';

  const scored = allowedOptions(profile, SLOT_INFO[slot].pool)
    .filter((o) => !ctx.usedToday?.has(o.id))
    .map((o, i) => {
      let s = 0;
      for (const t of prefTags) if (o.tags.includes(t)) s += 2;
      if (!prefTags.includes('savory') && o.tags.includes('savory')) s -= 1;
      if (o.cost > maxCost) s -= 5 * (o.cost - maxCost);
      if (o.prepMin > maxPrep) s -= 6;
      if (slot === 'lunch' && ctx.needsPortable && !o.portable) s -= 6;
      if (wantsProtein) s += ((o.protein * 4) / optionKcal(o)) * 4;
      s -= Math.abs(Math.log(ctx.targetKcal / optionKcal(o))) * 3;
      s -= 4 * (ctx.usedWeek?.get(o.id) ?? 0);
      if (ctx.prevId === o.id) s -= 100;
      s += (((i * 7 + (ctx.blockIdx ?? 0) * 3) % 10) / 10) * 0.5;
      return { o, s };
    });

  return scored.sort((a, b) => b.s - a.s).map((x) => x.o);
}

export function buildMeal(option: FoodOption, slot: Slot, targetKcal: number): PlannedMeal {
  const factor = targetKcal / optionKcal(option);
  const info = SLOT_INFO[slot];
  return {
    slot,
    label: info.label,
    time: info.time,
    desc: option.name,
    ingredients: option.ingredients,
    optionId: option.id,
    targetKcal,
    factor: Math.round(factor * 100) / 100,
    kcal: targetKcal,
    protein: Math.round(option.protein * factor),
    carbs: Math.round(option.carbs * factor),
    fat: Math.round(option.fat * factor),
    prepMin: option.prepMin,
    image: option.image,
  };
}

export function totalsOf(weekday: number, meals: PlannedMeal[]): DayPlan {
  const sum = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => meals.reduce((t, m) => t + m[k], 0);
  return { weekday, meals, kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') };
}

/** O almoço de "marmita" só vale para dias úteis quando o fim de semana é flexível. */
export function lunchNeedsPortable(profile: UserProfile, weekdays: number[]): boolean {
  if (profile.lunch !== 'Levo marmita') return false;
  const flexibleWeekend = profile.weekend.startsWith('Mais flexível');
  return weekdays.some((w) => !(flexibleWeekend && (w === 0 || w === 6)));
}

export function slotLayout(mealsPerDay: number) {
  return LAYOUTS[mealsPerDay] ?? LAYOUTS[5];
}

function splitKcal(kcal: number, layout: { share: number }[]): number[] {
  const targets = layout.map((l) => Math.round(kcal * l.share));
  targets[targets.length - 1] += kcal - targets.reduce((a, b) => a + b, 0);
  return targets;
}

export function generatePlan(
  profile: UserProfile,
  now: Date = new Date(),
  previousWeights: WeightEntry[] = [],
): DietPlan {
  const summary = calculateTargets(profile);
  const layout = slotLayout(profile.mealsPerDay);
  const targets = splitKcal(summary.kcal, layout);
  const blockSize = profile.cookFreq.startsWith('3') ? 2 : 1;

  const usedWeek = new Map<string, number>();
  let prev: Partial<Record<Slot, string>> = {};
  const days: DayPlan[] = [];

  for (let pos = 0; pos < WEEK_ORDER.length; pos += blockSize) {
    const blockWeekdays = WEEK_ORDER.slice(pos, pos + blockSize);
    const blockIdx = pos / blockSize;
    const needsPortable = lunchNeedsPortable(profile, blockWeekdays);

    const usedToday = new Set<string>();
    const meals: PlannedMeal[] = layout.map((l, i) => {
      const ranked = rankOptions(profile, l.slot, {
        targetKcal: targets[i],
        needsPortable,
        usedToday,
        usedWeek,
        prevId: prev[l.slot],
        blockIdx,
      });
      const pick = ranked[0] ?? allowedOptions(profile, SLOT_INFO[l.slot].pool)[0];
      usedToday.add(pick.id);
      return buildMeal(pick, l.slot, targets[i]);
    });

    prev = Object.fromEntries(meals.map((m) => [m.slot, m.optionId]));
    for (const m of meals) usedWeek.set(m.optionId, (usedWeek.get(m.optionId) ?? 0) + 1);
    for (const weekday of blockWeekdays) days.push(totalsOf(weekday, meals));
  }

  const keywords = avoidKeywords(profile);
  const notes = [...summary.notes];
  if (keywords.length && days.some((d) => d.meals.some((m) => matchesKeyword([m.desc, ...m.ingredients], keywords)))) {
    notes.push(
      'Com as suas restrições, não foi possível evitar todos os alimentos que você não gosta. Use "Trocar opção" nas refeições.',
    );
  }

  const last = previousWeights[previousWeights.length - 1];
  const entry: WeightEntry = { date: now.toISOString(), kg: profile.weightKg };
  const weights = previousWeights.length ? (last.kg === entry.kg ? previousWeights : [...previousWeights, entry]) : [entry];

  return {
    version: 1,
    createdAt: now.toISOString(),
    profile,
    summary: { ...summary, notes },
    days,
    weights,
  };
}
