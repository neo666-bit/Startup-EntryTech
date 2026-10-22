import { UserProfile } from './models';

/** Perfil de exemplo usado nos testes. */
export const baseProfile: UserProfile = {
  goal: 'Perder peso',
  deltaKg: 6,
  sex: 'F',
  age: 32,
  heightCm: 168,
  weightKg: 74,
  activity: 'Moderadamente ativa',
  work: 'Maior parte sentada',
  sleep: '23:00 às 07:00',
  training: 'Musculação, 3x por semana',
  restrictions: [],
  otherCare: '',
  preferences: [],
  dislikes: '',
  pattern: 'Onívoro',
  budget: 'Equilibrado',
  cookTime: 'Até 30 min por refeição',
  cookFreq: '3 vezes por semana',
  mealsPerDay: 5,
  lunch: 'Levo marmita',
  dinner: 'Cozinho em casa',
  weekend: 'Mais flexível',
};
