import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyPlan } from '../empty-plan/empty-plan';
import { imageUrl } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { Flag } from '../nutrisync/food-catalog';
import { forbiddenFlags } from '../nutrisync/diet-generator';
import { dateLabel, fmtDec, fmtInt, weekdayLong, weekdayShort } from '../nutrisync/format';
import { PlannedMeal } from '../nutrisync/models';
import { recipeFor } from '../nutrisync/recipes';
import { RecipeNote } from '../recipe-note/recipe-note';

interface SwapSuggestion {
  from: string;
  /** Alternativas possíveis, em ordem de preferência; só entram as compatíveis com a pessoa. */
  to: { label: string; flags: Flag[] }[];
}

const SWAP_CATALOG: SwapSuggestion[] = [
  { from: 'frango', to: [{ label: 'tilápia', flags: ['fish'] }, { label: 'tofu firme', flags: ['soy'] }, { label: 'grão-de-bico', flags: [] }] },
  { from: 'arroz', to: [{ label: 'batata-doce', flags: [] }, { label: 'quinoa', flags: [] }] },
  { from: 'iogurte', to: [{ label: 'iogurte vegetal sem açúcar', flags: [] }] },
  { from: 'pão integral', to: [{ label: 'tapioca', flags: [] }, { label: 'cuscuz de milho', flags: [] }] },
  { from: 'ovo', to: [{ label: 'tofu mexido', flags: ['soy'] }, { label: 'queijo cottage', flags: ['lactose', 'dairy'] }] },
  { from: 'carne moída', to: [{ label: 'lentilha', flags: [] }, { label: 'proteína de soja', flags: ['soy'] }] },
];

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

@Component({
  selector: 'app-minha-dieta',
  imports: [RouterLink, EmptyPlan, RecipeNote],
  templateUrl: './minha-dieta.html',
  styleUrl: './minha-dieta.css',
})
export class MinhaDieta {
  private readonly diet = inject(DietService);

  protected readonly fmtInt = fmtInt;
  protected readonly fmtDec = fmtDec;
  protected readonly imageUrl = imageUrl;
  protected readonly hasRecipe = (optionId: string) => recipeFor(optionId) !== null;
  protected readonly recipeMeal = signal<PlannedMeal | null>(null);
  protected readonly weekdayShort = weekdayShort;
  protected readonly weekdays = WEEK_DISPLAY_ORDER;

  protected readonly plan = this.diet.plan;
  protected readonly today = new Date().getDay();
  protected readonly selectedWeekday = signal(this.today);
  protected readonly selectedMeal = signal<number | null>(null);

  protected readonly day = computed(() => this.diet.dayOn(this.selectedWeekday()));

  protected readonly dayTitle = computed(() =>
    this.selectedWeekday() === this.today ? 'Refeições de hoje' : `Refeições de ${weekdayLong(this.selectedWeekday()).toLowerCase()}`,
  );

  protected readonly dayPill = computed(() =>
    this.selectedWeekday() === this.today ? `Hoje • ${dateLabel(new Date())}` : weekdayLong(this.selectedWeekday()),
  );

  protected readonly createdLabel = computed(() => {
    const p = this.plan();
    return p ? dateLabel(new Date(p.createdAt)) : '';
  });

  protected readonly prepText = computed(() =>
    this.plan()?.profile.cookTime.includes('1 hora') ? 'até 1 hora' : 'até 30 minutos',
  );

  /** Participação de cada macro nas calorias do dia, com a meta calculada ao lado. */
  protected readonly macros = computed(() => {
    const p = this.plan();
    const d = this.day();
    if (!p || !d) return [];
    const total = d.protein * 4 + d.carbs * 4 + d.fat * 9 || 1;
    const t = p.summary.macroTargets;
    return [
      { name: 'Proteínas', grams: d.protein, target: t.protein, pct: Math.round(((d.protein * 4) / total) * 100), cls: 'protein' },
      { name: 'Carboidratos', grams: d.carbs, target: t.carbs, pct: Math.round(((d.carbs * 4) / total) * 100), cls: 'carb' },
      { name: 'Gorduras', grams: d.fat, target: t.fat, pct: Math.round(((d.fat * 9) / total) * 100), cls: 'fat' },
    ];
  });

  protected readonly waterLiters = computed(() => {
    const p = this.plan();
    return p ? Math.round(p.profile.weightKg * 0.035 * 10) / 10 : 0;
  });

  protected readonly goalNote = computed(() => {
    const g = this.plan()?.profile.goal;
    if (g === 'Perder peso') return 'Déficit leve e sustentável';
    if (g === 'Ganhar massa') return 'Superávit moderado para ganho de massa';
    return 'Calorias de manutenção';
  });

  /** Trocas só com ingredientes que aparecem no plano e alternativas compatíveis com as restrições. */
  protected readonly swaps = computed(() => {
    const p = this.plan();
    if (!p) return [];
    const banned = forbiddenFlags(p.profile);
    const ingredients = new Set(p.days.flatMap((d) => d.meals.flatMap((m) => m.ingredients)));
    return SWAP_CATALOG.filter((s) => [...ingredients].some((i) => i.includes(s.from)))
      .map((s) => ({
        from: s.from.charAt(0).toUpperCase() + s.from.slice(1),
        to: s.to.filter((o) => !o.flags.some((f) => banned.has(f))).map((o) => o.label),
      }))
      .filter((s) => s.to.length)
      .slice(0, 3);
  });

  protected readonly mealCount = computed(() => this.day()?.meals.length ?? 0);

  protected selectDay(weekday: number) {
    this.selectedWeekday.set(weekday);
    this.selectedMeal.set(null);
  }

  protected toggleMeal(index: number) {
    this.selectedMeal.update((current) => (current === index ? null : index));
  }

  protected swap(index: number, event: Event) {
    event.stopPropagation();
    this.diet.swapMeal(this.selectedWeekday(), index);
  }

  protected openRecipe(meal: PlannedMeal, event: Event) {
    event.stopPropagation();
    this.recipeMeal.set(meal);
  }

  protected print() {
    window.print();
  }
}
