import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { calculateTargets, validateBody } from '../nutrisync/calculator';
import { DietService } from '../nutrisync/diet.service';
import { fmtDec, fmtInt } from '../nutrisync/format';
import { Goal, Pattern, Sex, UserProfile } from '../nutrisync/models';

interface Option {
  title: Goal | string;
  description: string;
  icon: string;
}

type SelectKey =
  | 'sex'
  | 'activity'
  | 'work'
  | 'sleep'
  | 'training'
  | 'pattern'
  | 'cookTime'
  | 'cookFreq'
  | 'mealsPerDay'
  | 'lunch'
  | 'dinner'
  | 'weekend';

interface SelectField {
  key: SelectKey;
  label: string;
  options: string[];
}

/** Estado do questionário (campos numéricos ficam vazios até a pessoa preencher). */
interface WizardForm {
  goal: Goal;
  deltaKg: number;
  sex: '' | Sex;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
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
  mealsPerDay: string;
  lunch: string;
  dinner: string;
  weekend: string;
}

const EMPTY_FORM: WizardForm = {
  goal: 'Perder peso',
  deltaKg: 6,
  sex: '',
  age: null,
  heightCm: null,
  weightKg: null,
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
  mealsPerDay: '5 refeições',
  lunch: 'Levo marmita',
  dinner: 'Cozinho em casa',
  weekend: 'Mais flexível',
};

@Component({
  selector: 'app-montar-dieta',
  templateUrl: './montar-dieta.html',
  styleUrl: './montar-dieta.css',
})
export class MontarDieta {
  private readonly router = inject(Router);
  private readonly diet = inject(DietService);

  protected readonly fmtInt = fmtInt;
  protected readonly fmtDec = fmtDec;

  protected readonly step = signal(1);
  /** Só mostramos mensagens de erro depois que a pessoa tenta avançar. */
  protected readonly attempted = signal(false);
  protected readonly form = signal<WizardForm>(this.initialForm());

  protected readonly stepIds = [1, 2, 3, 4, 5];
  protected readonly stepLabels = ['Objetivo', 'Corpo e rotina', 'Alimentação', 'Rotina alimentar', 'Revisão'];

  protected readonly goals: Option[] = [
    { title: 'Perder peso', description: 'Déficit leve e sustentável, preservando sua energia.', icon: '↘' },
    { title: 'Manter o peso', description: 'Equilíbrio para nutrir bem e manter sua rotina.', icon: '⚖' },
    { title: 'Ganhar massa', description: 'Mais energia e proteína para apoiar seus treinos.', icon: '⌁' },
  ];

  protected readonly budgets: Option[] = [
    { title: 'Econômico', description: 'Ingredientes essenciais e maior reaproveitamento.', icon: '▤' },
    { title: 'Equilibrado', description: 'Variedade com compras planejadas.', icon: '♜' },
    { title: 'Flexível', description: 'Mais opções premium e conveniência.', icon: '◇' },
  ];

  protected readonly sexOptions = [
    { value: 'F', label: 'Feminino' },
    { value: 'M', label: 'Masculino' },
  ];

  protected readonly routineFields: SelectField[] = [
    { key: 'activity', label: 'Nível de atividade', options: ['Sedentária', 'Pouco ativa', 'Moderadamente ativa', 'Muito ativa'] },
    { key: 'work', label: 'Tipo de trabalho', options: ['Maior parte sentada', 'Em movimento', 'Híbrido'] },
    { key: 'sleep', label: 'Horário de sono', options: ['23:00 às 07:00', '22:00 às 06:00', '00:00 às 08:00'] },
    { key: 'training', label: 'Treinos', options: ['Não treino', 'Musculação, 3x por semana', 'Caminhada, 4x por semana', 'Musculação, 5x por semana'] },
  ];

  protected readonly tagOptions = ['Lactose', 'Glúten', 'Amendoim', 'Castanhas', 'Frutos do mar', 'Ovos', 'Soja', 'Nenhuma'];
  protected readonly prefOptions = ['Comida brasileira', 'Frango', 'Peixes', 'Arroz e feijão', 'Frutas', 'Massas', 'Vegetais', 'Café da manhã salgado'];

  protected readonly patternField: SelectField = { key: 'pattern', label: 'Padrão alimentar', options: ['Onívoro', 'Vegetariano', 'Vegano'] };

  protected readonly timeFields: SelectField[] = [
    { key: 'cookTime', label: 'Tempo para cozinhar', options: ['Até 30 min por refeição', 'Até 1 hora'] },
    { key: 'cookFreq', label: 'Frequência de preparo', options: ['3 vezes por semana', 'Todos os dias'] },
  ];

  protected readonly dayFields: SelectField[] = [
    { key: 'mealsPerDay', label: 'Número de refeições', options: ['3 refeições', '4 refeições', '5 refeições', '6 refeições'] },
    { key: 'lunch', label: 'Almoço em dias úteis', options: ['Levo marmita', 'Como fora'] },
    { key: 'dinner', label: 'Jantar', options: ['Cozinho em casa', 'Peço delivery'] },
    { key: 'weekend', label: 'Fim de semana', options: ['Mais flexível', 'Sigo a rotina'] },
  ];

  /** Erros da etapa atual (hoje só a etapa 2 tem campos obrigatórios). */
  protected readonly errors = computed<Record<string, string>>(() => {
    if (this.step() !== 2 && this.step() !== 5) return {};
    const f = this.form();
    return validateBody({
      sex: f.sex,
      age: f.age,
      heightCm: f.heightCm,
      weightKg: f.weightKg,
      goal: f.goal,
      deltaKg: f.deltaKg,
    });
  });

  protected readonly profile = computed<UserProfile | null>(() => {
    const f = this.form();
    if (!f.sex || f.age === null || f.heightCm === null || f.weightKg === null) return null;
    if (Object.keys(validateBody({ ...f, sex: f.sex })).length) return null;
    return {
      goal: f.goal,
      deltaKg: f.goal === 'Manter o peso' ? 0 : f.deltaKg,
      sex: f.sex,
      age: f.age,
      heightCm: f.heightCm,
      weightKg: f.weightKg,
      activity: f.activity,
      work: f.work,
      sleep: f.sleep,
      training: f.training,
      restrictions: f.restrictions,
      otherCare: f.otherCare,
      preferences: f.preferences,
      dislikes: f.dislikes,
      pattern: f.pattern,
      budget: f.budget,
      cookTime: f.cookTime,
      cookFreq: f.cookFreq,
      mealsPerDay: parseInt(f.mealsPerDay, 10),
      lunch: f.lunch,
      dinner: f.dinner,
      weekend: f.weekend,
    };
  });

  protected readonly preview = computed(() => {
    const p = this.profile();
    return p ? calculateTargets(p) : null;
  });

  protected readonly goalLabel = computed(() => {
    const { goal, deltaKg } = this.form();
    if (goal === 'Perder peso') return `-${deltaKg} kg`;
    if (goal === 'Ganhar massa') return `+${deltaKg} kg`;
    return 'Manter';
  });

  protected readonly goalHint = computed(() => {
    const goal = this.form().goal;
    if (goal === 'Perder peso') return 'Vamos priorizar uma evolução gradual, de cerca de 0,3 a 0,5 kg por semana.';
    if (goal === 'Ganhar massa') return 'Vamos priorizar um ganho gradual, com superávit calórico moderado e mais proteína.';
    return 'Vamos calcular as calorias para você manter o peso atual.';
  });

  protected readonly summaries = computed(() => {
    const f = this.form();
    const p = this.profile();
    const preview = this.preview();
    const target = preview ? preview.targetWeightKg : null;
    return [
      {
        title: 'Objetivo',
        step: 1,
        items: [
          ['Meta principal', f.goal],
          ['Peso atual', f.weightKg === null ? '—' : `${fmtDec(f.weightKg)} kg`],
          ['Meta inicial', target === null ? '—' : `${fmtDec(target)} kg`],
          ['Ritmo sugerido', preview && preview.weeklyRateKg > 0 ? `${fmtDec(preview.weeklyRateKg, 2)} kg/semana` : '—'],
        ],
      },
      {
        title: 'Alimentação',
        step: 3,
        items: [
          ['Restrição', f.restrictions.join(', ') || 'Nenhuma'],
          ['Padrão', f.pattern],
          ['Preferências', f.preferences.slice(0, 3).join(', ') || 'Sem preferência'],
        ],
      },
      {
        title: 'Corpo e rotina',
        step: 2,
        items: [
          ['Idade e altura', p ? `${p.age} anos · ${p.heightCm} cm` : '—'],
          ['Atividade', f.activity],
          ['Treinos', f.training],
          ['Sono', f.sleep.replace(' às ', '–')],
        ],
      },
      {
        title: 'Praticidade',
        step: 4,
        items: [
          ['Orçamento', f.budget],
          ['Tempo de preparo', f.cookTime.replace(' por refeição', '')],
          ['Refeições', `${parseInt(f.mealsPerDay, 10)} por dia`],
          ['Almoço', f.lunch === 'Levo marmita' ? 'Marmita' : 'Como fora'],
        ],
      },
    ];
  });

  protected patch(partial: Partial<WizardForm>) {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  protected onSelect(key: SelectKey, event: Event) {
    this.patch({ [key]: (event.target as HTMLSelectElement).value } as Partial<WizardForm>);
  }

  protected onNumber(key: 'age' | 'heightCm' | 'weightKg', event: Event) {
    const raw = (event.target as HTMLInputElement).value.replace(',', '.');
    this.patch({ [key]: raw === '' ? null : Number(raw) } as Partial<WizardForm>);
  }

  protected onText(key: 'otherCare' | 'dislikes', event: Event) {
    this.patch({ [key]: (event.target as HTMLInputElement).value } as Partial<WizardForm>);
  }

  protected onDelta(event: Event) {
    this.patch({ deltaKg: Number((event.target as HTMLInputElement).value) });
  }

  protected toggleRestriction(item: string) {
    const current = this.form().restrictions;
    if (item === 'Nenhuma') return this.patch({ restrictions: [] });
    this.patch({ restrictions: current.includes(item) ? current.filter((v) => v !== item) : [...current, item] });
  }

  protected togglePreference(item: string) {
    const current = this.form().preferences;
    this.patch({ preferences: current.includes(item) ? current.filter((v) => v !== item) : [...current, item] });
  }

  protected next() {
    if (Object.keys(this.errors()).length) {
      this.attempted.set(true);
      return;
    }
    this.attempted.set(false);
    if (this.step() < 5) this.step.update((s) => s + 1);
  }

  protected back() {
    this.attempted.set(false);
    if (this.step() === 1) this.router.navigateByUrl('/home');
    else this.step.update((s) => s - 1);
  }

  protected goTo(step: number) {
    this.attempted.set(false);
    this.step.set(step);
  }

  protected finish() {
    const profile = this.profile();
    if (!profile) {
      this.attempted.set(true);
      this.step.set(2);
      return;
    }
    this.diet.generate(profile);
    this.router.navigateByUrl('/minha-dieta');
  }

  /** Se já existe um plano, o questionário abre preenchido para a pessoa só ajustar. */
  private initialForm(): WizardForm {
    const saved = this.diet.plan()?.profile;
    if (!saved) return { ...EMPTY_FORM };
    return {
      ...EMPTY_FORM,
      ...saved,
      deltaKg: saved.deltaKg || EMPTY_FORM.deltaKg,
      mealsPerDay: `${saved.mealsPerDay} refeições`,
    };
  }
}
