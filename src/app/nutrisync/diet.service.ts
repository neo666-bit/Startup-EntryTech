import { Injectable, computed, signal } from '@angular/core';
import { buildMeal, generatePlan, lunchNeedsPortable, rankOptions, totalsOf } from './diet-generator';
import { DayPlan, DietPlan, PlannedMeal, Slot, UserProfile, WaterLogItem } from './models';
import { fmtDec } from './format';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DietService {
  private readonly supabase = new SupabaseService();
  private readonly state = signal<DietPlan | null>(null);
  readonly carregandoBanco = signal(false);

  /** `null` enquanto a pessoa ainda não criou a dieta no banco de dados. */
  readonly plan = this.state.asReadonly();
  readonly hasPlan = computed(() => this.state() !== null);

  readonly latestWeight = computed(() => {
    const w = this.state()?.weights;
    return w?.length ? w[w.length - 1].kg : null;
  });

  readonly startWeight = computed(() => this.state()?.weights[0]?.kg ?? null);

  /** Meta diária de água (em litros) estipulada na geração da dieta (35 ml por kg corporal). */
  readonly waterGoalLiters = computed(() => {
    const p = this.state();
    return p ? Math.round(p.profile.weightKg * 0.035 * 10) / 10 : 0;
  });

  /** Meta diária de água em mililitros (ml). */
  readonly waterGoalMl = computed(() => Math.round(this.waterGoalLiters() * 1000));

  /** Registros de água tomados na data de hoje. */
  readonly waterTodayLogs = computed(() => {
    const p = this.state();
    if (!p) return [];
    const key = this.todayIso();
    return p.waterHistory?.[key] ?? [];
  });

  /** Total de água (em ml) ingerido hoje. */
  readonly waterTodayMl = computed(() =>
    this.waterTodayLogs().reduce((sum, item) => sum + item.ml, 0),
  );

  /** Percentual da meta diária de água concluído hoje (0 a 100%). */
  readonly waterTodayPct = computed(() => {
    const goal = this.waterGoalMl();
    if (!goal) return 0;
    return Math.min(100, Math.round((this.waterTodayMl() / goal) * 100));
  });

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

  constructor() {
    this.supabase.limparDadosLocaisAntigos();
    void this.carregarDoBanco();
  }

  /** Busca o plano alimentar ativo do usuário diretamente no PostgreSQL (Supabase). */
  async carregarDoBanco(email?: string | null): Promise<void> {
    const alvo = email !== undefined ? email : this.supabase.lerEmailSessao();
    if (!alvo) {
      this.state.set(null);
      return;
    }
    this.carregandoBanco.set(true);
    try {
      const planoBanco = await this.supabase.carregarPlanoDoBanco(alvo);
      this.state.set(planoBanco);
    } finally {
      this.carregandoBanco.set(false);
    }
  }

  generate(profile: UserProfile): DietPlan {
    const plan = generatePlan(profile, new Date(), this.state()?.weights ?? []);
    const novoPlano: DietPlan = {
      ...plan,
      overrides: {},
      waterHistory: this.state()?.waterHistory ?? {},
    };
    this.state.set(novoPlano);
    void this.supabase.sincronizarPlanoAlimentar(novoPlano);
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

    const atualizado: DietPlan = {
      ...plan,
      days: plan.days.map((d) => (d.weekday === weekday ? totalsOf(weekday, meals) : d)),
    };
    this.state.set(atualizado);
    void this.supabase.sincronizarPlanoAlimentar(atualizado);
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
    this.state.set({ ...plan, overrides: { [key]: [...rest, { ...meal, slot, fromPhoto: true }] } });
  }

  undoReplaceToday(slot: Slot): void {
    const plan = this.state();
    if (!plan) return;
    const key = this.dateOfWeekday(new Date().getDay());
    const rest = (plan.overrides?.[key] ?? []).filter((m) => m.slot !== slot);
    this.state.set({ ...plan, overrides: rest.length ? { [key]: rest } : {} });
  }

  addWeight(kg: number): boolean {
    const plan = this.state();
    if (!plan || !Number.isFinite(kg) || kg < 30 || kg > 300) return false;
    this.state.set({ ...plan, weights: [...plan.weights, { date: new Date().toISOString(), kg }] });
    void this.supabase.registrarPesoNoBanco(kg);
    return true;
  }

  /** Retorna a data atual no formato AAAA-MM-DD. */
  todayIso(now: Date = new Date()): string {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /** Retorna o total de água ingerido (em ml) em uma data específica (AAAA-MM-DD). */
  waterConsumedMlOn(dateIso: string): number {
    const logs = this.state()?.waterHistory?.[dateIso] ?? [];
    return logs.reduce((sum, item) => sum + item.ml, 0);
  }

  /** Registra uma ingestão de água (em ml) no dia e sincroniza com o banco PostgreSQL. */
  addWater(ml: number, label = 'Copo de água', dateIso: string = this.todayIso()): boolean {
    const plan = this.state();
    const rounded = Math.round(ml);
    if (!plan || !Number.isFinite(rounded) || rounded < 10 || rounded > 5000) return false;

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const item: WaterLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      ml: rounded,
      label,
    };

    const currentDayLogs = plan.waterHistory?.[dateIso] ?? [];
    const waterHistory: Record<string, WaterLogItem[]> = {
      ...(plan.waterHistory ?? {}),
      [dateIso]: [item, ...currentDayLogs],
    };

    const atualizado: DietPlan = { ...plan, waterHistory };
    this.state.set(atualizado);
    const totalDia = waterHistory[dateIso].reduce((s, x) => s + x.ml, 0);
    void this.supabase.salvarHidratacaoNoBanco(
      plan.summary.notes,
      waterHistory,
      dateIso,
      totalDia,
      this.waterGoalMl(),
    );
    return true;
  }

  /** Remove um registro específico de água do dia e atualiza o banco PostgreSQL. */
  removeWaterLog(id: string, dateIso: string = this.todayIso()): void {
    const plan = this.state();
    if (!plan) return;
    const currentDayLogs = plan.waterHistory?.[dateIso] ?? [];
    const filtrados = currentDayLogs.filter((item) => item.id !== id);
    const waterHistory: Record<string, WaterLogItem[]> = {
      ...(plan.waterHistory ?? {}),
      [dateIso]: filtrados,
    };
    this.state.set({ ...plan, waterHistory });
    const totalDia = filtrados.reduce((s, x) => s + x.ml, 0);
    void this.supabase.salvarHidratacaoNoBanco(
      plan.summary.notes,
      waterHistory,
      dateIso,
      totalDia,
      this.waterGoalMl(),
    );
  }

  /** Zera os registros de água da data informada e atualiza o banco PostgreSQL. */
  clearWaterDay(dateIso: string = this.todayIso()): void {
    const plan = this.state();
    if (!plan) return;
    const waterHistory: Record<string, WaterLogItem[]> = {
      ...(plan.waterHistory ?? {}),
      [dateIso]: [],
    };
    this.state.set({ ...plan, waterHistory });
    void this.supabase.salvarHidratacaoNoBanco(
      plan.summary.notes,
      waterHistory,
      dateIso,
      0,
      this.waterGoalMl(),
    );
  }

  reset(): void {
    this.state.set(null);
    void this.supabase.desativarPlanoNoBanco();
  }
}
