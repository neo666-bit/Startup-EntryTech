export type Goal = 'Perder peso' | 'Manter o peso' | 'Ganhar massa';
export type Sex = 'F' | 'M';
export type Pattern = 'Onívoro' | 'Vegetariano' | 'Vegano';
export type Slot = 'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner' | 'supper';
export type ImageKind = 'food' | 'salad';

/** Tudo o que a pessoa informa no questionário. */
export interface UserProfile {
  goal: Goal;
  /** Quantos kg a pessoa quer perder/ganhar (ignorado em "Manter o peso"). */
  deltaKg: number;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: string;
  work: string;
  sleep: string;
  training: string;
  restrictions: string[];
  otherCare: string;
  preferences: string[];
  dislikes: string;
  pattern: Pattern;
  budget: string;
  cookTime: string;
  cookFreq: string;
  mealsPerDay: number;
  lunch: string;
  dinner: string;
  weekend: string;
}

export interface MacroSet {
  protein: number;
  carbs: number;
  fat: number;
}

export interface PlanSummary {
  bmr: number;
  tdee: number;
  kcal: number;
  bmi: number;
  targetWeightKg: number;
  /** Ritmo estimado de variação de peso, em kg por semana (sempre positivo). */
  weeklyRateKg: number;
  weeksToGoal: number | null;
  macroTargets: MacroSet;
  notes: string[];
}

export interface PlannedMeal {
  slot: Slot;
  label: string;
  time: string;
  /** Descrição do prato. */
  desc: string;
  ingredients: string[];
  optionId: string;
  targetKcal: number;
  /** Multiplicador da porção base do prato para atingir a meta de calorias da refeição. */
  factor: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  prepMin: number;
  image: ImageKind;
  /** Refeição registrada pela pessoa (análise por foto) no lugar da sugerida. */
  fromPhoto?: boolean;
}

export interface DayPlan {
  /** 0 = domingo ... 6 = sábado (igual a Date#getDay). */
  weekday: number;
  meals: PlannedMeal[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface DietPlan {
  version: 1;
  createdAt: string;
  profile: UserProfile;
  summary: PlanSummary;
  days: DayPlan[];
  weights: WeightEntry[];
  /** Substituições pontuais por data (AAAA-MM-DD): valem só para aquele dia. */
  overrides?: Record<string, PlannedMeal[]>;
}
