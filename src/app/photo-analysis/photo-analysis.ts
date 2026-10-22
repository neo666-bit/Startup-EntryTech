import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyPlan } from '../empty-plan/empty-plan';
import { foodPhoto } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { dateLabel, fmtInt } from '../nutrisync/format';
import { PlannedMeal, Slot } from '../nutrisync/models';

interface PlateFood {
  id: string;
  name: string;
  unit: string;
  grams: number;
  /** Macros por grama (valores aproximados, tabelas tipo TACO). */
  p: number;
  c: number;
  f: number;
}

const PLATE_FOODS: PlateFood[] = [
  { id: 'frango', name: 'Frango grelhado', unit: '1 filé médio', grams: 120, p: 0.31, c: 0, f: 0.036 },
  { id: 'carne', name: 'Carne bovina grelhada', unit: '1 bife médio', grams: 100, p: 0.27, c: 0, f: 0.12 },
  { id: 'peixe', name: 'Peixe grelhado', unit: '1 filé médio', grams: 120, p: 0.26, c: 0, f: 0.05 },
  { id: 'ovo', name: 'Ovo cozido', unit: '2 unidades', grams: 100, p: 0.13, c: 0.01, f: 0.1 },
  { id: 'arroz-int', name: 'Arroz integral', unit: '5 colheres de sopa', grams: 150, p: 0.026, c: 0.26, f: 0.01 },
  { id: 'arroz', name: 'Arroz branco', unit: '5 colheres de sopa', grams: 150, p: 0.025, c: 0.28, f: 0.002 },
  { id: 'feijao', name: 'Feijão', unit: '1 concha pequena', grams: 100, p: 0.05, c: 0.14, f: 0.005 },
  { id: 'macarrao', name: 'Macarrão cozido', unit: '1 prato raso', grams: 180, p: 0.058, c: 0.31, f: 0.009 },
  { id: 'batata-doce', name: 'Batata-doce', unit: '1 unidade média', grams: 150, p: 0.013, c: 0.2, f: 0.001 },
  { id: 'legumes', name: 'Legumes cozidos', unit: '1 porção', grams: 100, p: 0.025, c: 0.07, f: 0.003 },
  { id: 'salada', name: 'Salada de folhas', unit: '1 prato de sobremesa', grams: 60, p: 0.014, c: 0.03, f: 0.002 },
  { id: 'pao', name: 'Pão integral', unit: '2 fatias', grams: 50, p: 0.09, c: 0.43, f: 0.04 },
  { id: 'banana', name: 'Banana', unit: '1 unidade', grams: 100, p: 0.013, c: 0.23, f: 0.003 },
  { id: 'abacate', name: 'Abacate', unit: '2 colheres de sopa', grams: 60, p: 0.02, c: 0.06, f: 0.15 },
  { id: 'azeite', name: 'Azeite de oliva', unit: '1 colher de sobremesa', grams: 8, p: 0, c: 0, f: 1 },
];

interface PlateItem {
  food: PlateFood;
  grams: number;
}

const kcalOf = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);

@Component({
  selector: 'app-photo-analysis',
  imports: [RouterLink, EmptyPlan],
  templateUrl: './photo-analysis.html',
  styleUrl: './photo-analysis.css',
})
export class PhotoAnalysis {
  private readonly diet = inject(DietService);

  protected readonly fmtInt = fmtInt;
  protected readonly plan = this.diet.plan;
  protected readonly tipsPhoto = foodPhoto;
  protected readonly foodOptions = PLATE_FOODS;
  protected readonly stepNames = ['Foto do prato', 'Montar o prato', 'Substituir refeição', 'Plano atualizado'];
  protected readonly todayLabel = dateLabel(new Date());

  protected readonly stage = signal<1 | 2 | 3 | 4>(1);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoName = signal('');
  protected readonly photoError = signal('');
  protected readonly items = signal<PlateItem[]>([]);
  protected readonly targetSlot = signal<Slot | null>(null);
  protected readonly updated = signal(false);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  protected readonly today = computed(() => this.diet.dayOn(new Date().getDay()));

  protected readonly plate = computed(() => {
    const items = this.items();
    const p = items.reduce((t, i) => t + i.food.p * i.grams, 0);
    const c = items.reduce((t, i) => t + i.food.c * i.grams, 0);
    const f = items.reduce((t, i) => t + i.food.f * i.grams, 0);
    return {
      kcal: kcalOf(p, c, f),
      protein: Math.round(p),
      carbs: Math.round(c),
      fat: Math.round(f),
    };
  });

  protected readonly plateTitle = computed(() => {
    const names = this.items()
      .filter((i) => i.grams > 0)
      .map((i) => i.food.name.toLowerCase());
    return names.length ? names.join(', ') : 'Prato sem alimentos';
  });

  protected readonly selectedMeal = computed(() => {
    const slot = this.targetSlot();
    return this.today()?.meals.find((m) => m.slot === slot) ?? null;
  });

  /** O que acontece com os totais do dia se a refeição escolhida for trocada pelo prato. */
  protected readonly comparison = computed(() => {
    const day = this.today();
    const meal = this.selectedMeal();
    const p = this.plate();
    if (!day || !meal) return [];
    const row = (label: string, before: number, after: number, unit: string) => ({
      label,
      before: `${fmtInt(before)} ${unit}`,
      after: `≈ ${fmtInt(after)} ${unit}`,
      diff: `${after - before >= 0 ? '+' : '−'}${fmtInt(Math.abs(after - before))} ${unit}`,
    });
    return [
      row('Energia', day.kcal, day.kcal - meal.kcal + p.kcal, 'kcal'),
      row('Proteínas', day.protein, day.protein - meal.protein + p.protein, 'g'),
      row('Carboidratos', day.carbs, day.carbs - meal.carbs + p.carbs, 'g'),
      row('Gorduras', day.fat, day.fat - meal.fat + p.fat, 'g'),
    ];
  });

  protected readonly canContinue = computed(() => this.items().some((i) => i.grams > 0));

  protected readonly title = computed(() => {
    switch (this.stage()) {
      case 1:
        return 'O que tem no seu prato?';
      case 2:
        return 'Monte o seu prato.';
      case 3:
        return 'Qual refeição vamos trocar?';
      default:
        return `Seu ${this.selectedMeal()?.label.toLowerCase() ?? 'prato'} já está no plano.`;
    }
  });

  protected readonly lead = computed(() => {
    switch (this.stage()) {
      case 1:
        return 'Fotografe sua refeição para registrar, depois informe o que tem nela e encaixe esse prato no seu dia.';
      case 2:
        return 'Escolha os alimentos e ajuste as quantidades. As calorias e macros são calculadas por aqui.';
      case 3:
        return 'Compare com seu plano antes de confirmar. A troca vale apenas para hoje.';
      default:
        return 'Substituição concluída para hoje. Seu plano dos próximos dias continua igual.';
    }
  });

  protected onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.photoError.set('Escolha um arquivo de imagem (JPG, PNG ou HEIC).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.photoError.set('A imagem precisa ter até 10 MB.');
      return;
    }
    this.photoError.set('');
    this.revoke();
    this.photoUrl.set(URL.createObjectURL(file));
    this.photoName.set(file.name);
    this.stage.set(2);
  }

  protected addFood(event: Event) {
    const select = event.target as HTMLSelectElement;
    const food = PLATE_FOODS.find((f) => f.id === select.value);
    select.value = '';
    if (!food || this.items().some((i) => i.food.id === food.id)) return;
    this.items.update((list) => [...list, { food, grams: food.grams }]);
  }

  protected setGrams(index: number, event: Event) {
    const value = Math.max(0, Math.min(2000, Number((event.target as HTMLInputElement).value) || 0));
    this.items.update((list) => list.map((item, i) => (i === index ? { ...item, grams: value } : item)));
  }

  protected removeFood(index: number) {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  protected itemKcal(item: PlateItem) {
    return kcalOf(item.food.p * item.grams, item.food.c * item.grams, item.food.f * item.grams);
  }

  protected toSwap() {
    const meals = this.today()?.meals ?? [];
    if (!this.targetSlot()) {
      this.targetSlot.set((meals.find((m) => m.slot === 'lunch') ?? meals[0])?.slot ?? null);
    }
    this.stage.set(3);
  }

  protected confirm() {
    const meal = this.selectedMeal();
    if (!meal) return;
    const p = this.plate();
    const planned: PlannedMeal = {
      ...meal,
      desc: this.plateTitle().replace(/^./, (c) => c.toUpperCase()),
      ingredients: this.items().filter((i) => i.grams > 0).map((i) => i.food.name.toLowerCase()),
      optionId: 'photo',
      kcal: p.kcal,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
      factor: 1,
      prepMin: 0,
      fromPhoto: true,
    };
    this.diet.replaceMealToday(meal.slot, planned);
    this.updated.set(true);
    this.stage.set(4);
  }

  protected undo() {
    const slot = this.targetSlot();
    if (slot) this.diet.undoReplaceToday(slot);
    this.updated.set(false);
    this.stage.set(3);
  }

  protected restart() {
    this.revoke();
    this.photoUrl.set(null);
    this.photoName.set('');
    this.items.set([]);
    this.targetSlot.set(null);
    this.updated.set(false);
    this.stage.set(1);
  }

  private revoke() {
    const url = this.photoUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
