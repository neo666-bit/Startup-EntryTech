import { Injectable, computed, signal } from '@angular/core';
import { buildMeal, generatePlan, lunchNeedsPortable, rankOptions, totalsOf } from './diet-generator';
import { DayPlan, DietPlan, PlannedMeal, Slot, UserProfile } from './models';
import { fmtDec } from './format';

const STORAGE_KEY = 'nutrisync.plan.v1';

@Injectable({ providedIn: 'root' })
export class DietService {
  private readonly state = signal<DietPlan | null>(this.load());

  /** `null` enquanto a pessoa ainda não criou a dieta. */
  readonly plan = this.state.asReadonly();
  readonly hasPlan = computed(() => this.state() !== null);

  readonly latestWeight = computed(() => {
    const w = this.state()?.weights;
    return w?.length ? w[w.length - 1].kg : null;
  });

  readonly startWeight = computed(() => this.state()?.weights[0]?.kg ?? null);

  /** Texto curto do objetivo, usado na barra lateral. */
  readonly goalText = computed(() => {
    const p = this.state();
    if (!p) return '';
    const { goal, deltaKg } = p.profile;
    if (goal === 'Perder peso') return `Meta atual: perder ${fmtDec(deltaKg)} kg com constância.`;
    if (goal === 'Ganhar massa') return `Meta atual: ganhar ${fmtDec(deltaKg)} kg com constância.`;
    return `Meta atual: manter o peso em ${fmtDec(p.profile.weightKg)} kg.`;
  });

  /** Quanto do caminho até a meta de peso já foi percorrido (0–100). */
  readonly goalProgress = computed(() => {
    const p = this.state();
    const start = this.startWeight();
    const now = this.latestWeight();
    if (!p || start === null || now === null) return 0;
    if (p.profile.goal === 'Manter o peso') return 100;
    const total = p.summary.targetWeightKg - start;
    if (total === 0) return 100;
    return Math.max(0, Math.min(100, Math.round(((now - start) / total) * 100)));
  });

  generate(profile: UserProfile): DietPlan {
    const plan = generatePlan(profile, new Date(), this.state()?.weights ?? []);
    this.set({ ...plan, overrides: {} });
    return this.state()!;
  }

  /** Troca o prato de uma refeição por outra opção compatível, mantendo as calorias da refeição. */
  swapMeal(weekday: number, mealIndex: number): void {
    const plan = this.state();
    const day = plan?.days.find((d) => d.weekday === weekday);
    const current = day?.meals[mealIndex];
    if (!plan || !day || !current) return;

    const usedToday = new Set(day.meals.filter((_, i) => i !== mealIndex).map((m) => m.optionId));
    const ranked = rankOptions(plan.profile, current.slot, {
      targetKcal: current.targetKcal,
      needsPortable: lunchNeedsPortable(plan.profile, [weekday]),
      usedToday,
    });
    if (ranked.length < 2) return;

    const at = ranked.findIndex((o) => o.id === current.optionId);
    const next = ranked[(at + 1) % ranked.length];
    const meals = day.meals.map((m, i) => (i === mealIndex ? buildMeal(next, current.slot, current.targetKcal) : m));

    this.set({
      ...plan,
      days: plan.days.map((d) => (d.weekday === weekday ? totalsOf(weekday, meals) : d)),
    });
  }

  /** Data (AAAA-MM-DD) em que o dia da semana cai na semana atual (domingo a sábado). */
  dateOfWeekday(weekday: number, now: Date = new Date()): string {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (weekday - now.getDay()));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** O dia do plano já com as substituições por foto daquela data aplicadas. */
  dayOn(weekday: number): DayPlan | null {
    const plan = this.state();
    const base = plan?.days.find((d) => d.weekday === weekday);
    if (!plan || !base) return null;
    const replaced = plan.overrides?.[this.dateOfWeekday(weekday)];
    if (!replaced?.length) return base;
    const meals = base.meals.map((m) => replaced.find((r) => r.slot === m.slot) ?? m);
    return totalsOf(weekday, meals);
  }

  /** Substitui uma refeição de hoje por um prato registrado por foto (vale só para hoje). */
  replaceMealToday(slot: Slot, meal: PlannedMeal): void {
    const plan = this.state();
    if (!plan) return;
    const key = this.dateOfWeekday(new Date().getDay());
    const rest = (plan.overrides?.[key] ?? []).filter((m) => m.slot !== slot);
    this.set({ ...plan, overrides: { [key]: [...rest, { ...meal, slot, fromPhoto: true }] } });
  }

  undoReplaceToday(slot: Slot): void {
    const plan = this.state();
    if (!plan) return;
    const key = this.dateOfWeekday(new Date().getDay());
    const rest = (plan.overrides?.[key] ?? []).filter((m) => m.slot !== slot);
    this.set({ ...plan, overrides: rest.length ? { [key]: rest } : {} });
  }

  addWeight(kg: number): boolean {
    const plan = this.state();
    if (!plan || !Number.isFinite(kg) || kg < 30 || kg > 300) return false;
    this.set({ ...plan, weights: [...plan.weights, { date: new Date().toISOString(), kg }] });
    return true;
  }

  reset(): void {
    this.state.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* armazenamento indisponível */
    }
  }

  private set(plan: DietPlan): void {
    this.state.set(plan);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      /* armazenamento indisponível: o plano segue válido só nesta sessão */
    }
  }

  private load(): DietPlan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const plan = JSON.parse(raw) as DietPlan;
      return plan.version === 1 && Array.isArray(plan.days) && plan.days.length === 7 ? plan : null;
    } catch {
      return null;
    }
  }
}
