import { Goal, MacroSet, PlanSummary, Sex, UserProfile } from './models';

/** Fatores de atividade usados sobre o metabolismo basal (gasto energético total). */
export const ACTIVITY_LEVELS: Record<string, number> = {
  Sedentária: 1.2,
  'Pouco ativa': 1.375,
  'Moderadamente ativa': 1.55,
  'Muito ativa': 1.725,
};

/** Piso calórico diário: nunca sugerimos abaixo disso. */
export const MIN_KCAL: Record<Sex, number> = { F: 1200, M: 1500 };

const KCAL_PER_KG = 7700;
const MIN_HEALTHY_BMI = 18.5;

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/** Equação de Mifflin-St Jeor (kcal/dia em repouso). */
export function basalRate(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'M' ? 5 : -161);
}

export function targetWeight(p: { goal: Goal; deltaKg: number; weightKg: number }): number {
  if (p.goal === 'Perder peso') return round1(p.weightKg - p.deltaKg);
  if (p.goal === 'Ganhar massa') return round1(p.weightKg + p.deltaKg);
  return p.weightKg;
}

export function calculateTargets(p: UserProfile): PlanSummary {
  const notes: string[] = [];
  const bmr = basalRate(p.sex, p.weightKg, p.heightCm, p.age);
  const tdee = bmr * (ACTIVITY_LEVELS[p.activity] ?? ACTIVITY_LEVELS['Moderadamente ativa']);

  let kcal = tdee;
  if (p.goal === 'Perder peso') kcal = tdee - Math.min(500, tdee * 0.2);
  else if (p.goal === 'Ganhar massa') kcal = tdee + 300;

  const floor = MIN_KCAL[p.sex];
  if (kcal < floor) {
    kcal = floor;
    notes.push(`Ajustamos para o mínimo seguro de ${floor.toLocaleString('pt-BR')} kcal por dia.`);
  }
  kcal = Math.round(kcal / 10) * 10;

  const dailyDelta = kcal - tdee;
  let weeklyRateKg = 0;
  if (p.goal === 'Perder peso') {
    if (dailyDelta < 0) {
      weeklyRateKg = (-dailyDelta * 7) / KCAL_PER_KG;
    } else {
      notes.push(
        'Seu gasto estimado já está no mínimo seguro, então não há déficit calórico. Recomendamos avaliação profissional para emagrecer.',
      );
    }
  } else if (p.goal === 'Ganhar massa') {
    weeklyRateKg = (dailyDelta * 7) / KCAL_PER_KG;
  }

  const weeksToGoal = weeklyRateKg >= 0.05 ? Math.ceil(p.deltaKg / weeklyRateKg) : null;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    bmi: round1(bmi(p.weightKg, p.heightCm)),
    targetWeightKg: targetWeight(p),
    weeklyRateKg: Math.round(weeklyRateKg * 100) / 100,
    weeksToGoal,
    macroTargets: macroTargets(p, kcal),
    notes,
  };
}

export function macroTargets(p: Pick<UserProfile, 'goal' | 'weightKg'>, kcal: number): MacroSet {
  const perKg = p.goal === 'Manter o peso' ? 1.4 : 1.8;
  const protein = Math.min(Math.round(p.weightKg * perKg), Math.round((kcal * 0.35) / 4));
  const fat = Math.round((kcal * 0.27) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export interface BodyInput {
  sex: '' | Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal;
  deltaKg: number;
}

/** Valida os dados corporais; devolve um mapa campo → mensagem (vazio = tudo certo). */
export function validateBody(v: BodyInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!v.sex) errors['sex'] = 'Selecione uma opção.';

  if (v.age === null || !Number.isFinite(v.age)) errors['age'] = 'Informe sua idade.';
  else if (v.age < 18) errors['age'] = 'A NutriSync é para maiores de 18 anos. Procure um profissional de saúde.';
  else if (v.age > 90) errors['age'] = 'Informe uma idade entre 18 e 90 anos.';

  if (v.heightCm === null || !Number.isFinite(v.heightCm)) errors['heightCm'] = 'Informe sua altura.';
  else if (v.heightCm < 120 || v.heightCm > 230) errors['heightCm'] = 'Informe uma altura entre 120 e 230 cm.';

  if (v.weightKg === null || !Number.isFinite(v.weightKg)) errors['weightKg'] = 'Informe seu peso.';
  else if (v.weightKg < 35 || v.weightKg > 300) errors['weightKg'] = 'Informe um peso entre 35 e 300 kg.';

  if (!errors['heightCm'] && !errors['weightKg'] && v.heightCm !== null && v.weightKg !== null) {
    if (v.goal === 'Perder peso') {
      if (bmi(v.weightKg, v.heightCm) <= MIN_HEALTHY_BMI) {
        errors['goal'] =
          'Seu IMC atual já está no limite inferior saudável. Para emagrecer, procure um profissional de saúde.';
      } else if (bmi(targetWeight({ ...v, weightKg: v.weightKg }), v.heightCm) < MIN_HEALTHY_BMI) {
        errors['goal'] =
          'Com essa meta, seu peso ficaria abaixo da faixa saudável (IMC 18,5). Volte à etapa 1 e reduza a meta.';
      }
    }
  }

  return errors;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
