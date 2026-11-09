import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmptyPlan } from '../empty-plan/empty-plan';
import { DietService } from '../nutrisync/diet.service';
import { dateLabel, fmtDec, fmtInt, weekdayShort } from '../nutrisync/format';

interface QuickCupOption {
  ml: number;
  label: string;
  subtitle: string;
  icon: string;
}

@Component({
  selector: 'app-hidratacao',
  imports: [FormsModule, RouterLink, EmptyPlan],
  templateUrl: './hidratacao.html',
  styleUrl: './hidratacao.css',
})
export class Hidratacao {
  protected readonly diet = inject(DietService);

  protected readonly fmtDec = fmtDec;
  protected readonly fmtInt = fmtInt;
  protected readonly plan = this.diet.plan;
  protected readonly todayLabel = dateLabel(new Date());

  protected readonly customMl = signal<number | null>(300);
  protected readonly error = signal('');
  protected readonly feedback = signal('');

  protected readonly quickOptions: QuickCupOption[] = [
    { ml: 200, label: '+ 200 ml', subtitle: 'Copo americano', icon: 'bi-cup' },
    { ml: 250, label: '+ 250 ml', subtitle: 'Copo médio', icon: 'bi-cup-straw' },
    { ml: 350, label: '+ 350 ml', subtitle: 'Caneca grande', icon: 'bi-cup-hot' },
    { ml: 500, label: '+ 500 ml', subtitle: 'Garrafinha', icon: 'bi-droplet-half' },
  ];

  /** Meta diária em litros e em ml estipulada na geração da dieta (35 ml/kg). */
  protected readonly goalLiters = this.diet.waterGoalLiters;
  protected readonly goalMl = this.diet.waterGoalMl;

  /** Consumo acumulado hoje em ml e em litros. */
  protected readonly consumedMl = this.diet.waterTodayMl;
  protected readonly consumedLiters = computed(() => Math.round((this.consumedMl() / 100) ) / 10);

  /** Quantidade que ainda falta tomar hoje em ml e em litros. */
  protected readonly remainingMl = computed(() => Math.max(0, this.goalMl() - this.consumedMl()));
  protected readonly remainingLiters = computed(() => Math.round((this.remainingMl() / 100)) / 10);
  protected readonly remainingCups = computed(() => Math.ceil(this.remainingMl() / 250));

  /** Percentual concluído hoje (0 a 100 para os gráficos, e percentual real caso passe de 100%). */
  protected readonly progressPct = this.diet.waterTodayPct;
  protected readonly rawPct = computed(() => {
    const goal = this.goalMl();
    if (!goal) return 0;
    return Math.round((this.consumedMl() / goal) * 100);
  });

  protected readonly goalReached = computed(() => this.goalMl() > 0 && this.consumedMl() >= this.goalMl());

  /** Circunferência do gráfico Donut SVG (raio = 76 => 2 * PI * 76 ≈ 477.5). */
  protected readonly donutCircumference = 2 * Math.PI * 76;
  protected readonly donutDashOffset = computed(() => {
    const pct = this.progressPct() / 100;
    return this.donutCircumference * (1 - pct);
  });

  /** Escala graduada da garrafa/cilindro (100%, 75%, 50%, 25%). */
  protected readonly bottleMarks = computed(() => {
    const g = this.goalMl();
    return [
      { pct: 100, label: `${fmtDec(g / 1000, 1)} L (Meta)` },
      { pct: 75, label: `${fmtDec((g * 0.75) / 1000, 1)} L` },
      { pct: 50, label: `${fmtDec((g * 0.5) / 1000, 1)} L` },
      { pct: 25, label: `${fmtDec((g * 0.25) / 1000, 1)} L` },
    ];
  });

  /** Grade visual de copos de 250 ml até completar a meta da dieta. */
  protected readonly cupsGrid = computed(() => {
    const totalCups = Math.max(4, Math.ceil(this.goalMl() / 250));
    const filledCups = Math.floor(this.consumedMl() / 250);
    const partialRemainder = this.consumedMl() % 250;
    return Array.from({ length: totalCups }, (_, idx) => {
      const filled = idx < filledCups;
      const partial = !filled && idx === filledCups && partialRemainder > 0;
      return {
        index: idx + 1,
        filled,
        partial,
        fillPct: filled ? 100 : partial ? Math.round((partialRemainder / 250) * 100) : 0,
      };
    });
  });

  /** Gráfico comparativo dos 7 dias da semana atual (consumido vs meta da dieta). */
  protected readonly weekBars = computed(() => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    const todayW = new Date().getDay();
    const goal = this.goalMl() || 2000;

    return order.map((w) => {
      const dateIso = this.diet.dateOfWeekday(w);
      const ml = this.diet.waterConsumedMlOn(dateIso);
      const pctOfGoal = Math.min(100, Math.round((ml / goal) * 100));
      return {
        weekday: w,
        label: weekdayShort(w),
        isToday: w === todayW,
        ml,
        liters: fmtDec(ml / 1000, 1),
        pct: pctOfGoal,
        reached: ml >= goal,
      };
    });
  });

  protected readonly todayLogs = this.diet.waterTodayLogs;

  protected addQuick(opt: QuickCupOption): void {
    this.error.set('');
    this.diet.addWater(opt.ml, opt.subtitle);
    this.feedback.set(`+${opt.ml} ml registrados (${opt.subtitle})!`);
  }

  protected onCupClick(filled: boolean): void {
    if (!filled) {
      this.error.set('');
      this.diet.addWater(250, 'Copo de 250 ml');
      this.feedback.set('+250 ml adicionados pelo copo interativo!');
    }
  }

  protected addCustom(): void {
    const val = Number(this.customMl());
    if (!Number.isFinite(val) || val < 10 || val > 5000) {
      this.error.set('Informe uma quantidade entre 10 ml e 5000 ml.');
      return;
    }
    this.error.set('');
    this.diet.addWater(val, 'Dose personalizada');
    this.feedback.set(`+${Math.round(val)} ml adicionados ao seu dia!`);
  }

  protected removeLog(id: string): void {
    this.diet.removeWaterLog(id);
    this.feedback.set('Registro removido.');
  }

  protected clearToday(): void {
    this.diet.clearWaterDay();
    this.feedback.set('Contador de hoje zerado.');
  }
}
