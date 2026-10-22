import { Component, computed, inject, signal } from '@angular/core';
import { EmptyPlan } from '../empty-plan/empty-plan';
import { DietService } from '../nutrisync/diet.service';
import { fmtDec } from '../nutrisync/format';

@Component({
  selector: 'app-progress',
  imports: [EmptyPlan],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  private readonly diet = inject(DietService);

  protected readonly fmtDec = fmtDec;
  protected readonly plan = this.diet.plan;
  protected readonly error = signal('');

  private readonly start = this.diet.startWeight;
  protected readonly current = this.diet.latestWeight;

  protected readonly change = computed(() => {
    const s = this.start();
    const c = this.current();
    return s === null || c === null ? 0 : Math.round((c - s) * 10) / 10;
  });

  protected readonly remaining = computed(() => {
    const p = this.plan();
    const c = this.current();
    if (!p || c === null) return 0;
    return Math.round((p.summary.targetWeightKg - c) * 10) / 10;
  });

  protected readonly changeText = computed(() => {
    const ch = this.change();
    if (ch === 0) return 'Sem variação desde o início';
    return `${ch < 0 ? '−' : '+'}${fmtDec(Math.abs(ch))} kg desde o início`;
  });

  protected readonly remainingText = computed(() => {
    const p = this.plan();
    if (!p) return '';
    if (p.profile.goal === 'Manter o peso') return `Meta: manter ${fmtDec(p.summary.targetWeightKg)} kg`;
    const r = this.remaining();
    const reached = p.profile.goal === 'Perder peso' ? r >= 0 : r <= 0;
    return reached ? 'Meta de peso alcançada 🎉' : `Faltam ${fmtDec(Math.abs(r))} kg para ${fmtDec(p.summary.targetWeightKg)} kg`;
  });

  /** Últimas 8 medidas, com a altura da barra proporcional ao intervalo de peso. */
  protected readonly bars = computed(() => {
    const entries = (this.plan()?.weights ?? []).slice(-8);
    if (!entries.length) return [];
    const kgs = entries.map((e) => e.kg);
    const min = Math.min(...kgs) - 1;
    const max = Math.max(...kgs) + 1;
    return entries.map((e, i) => ({
      kg: e.kg,
      pct: Math.round(25 + ((e.kg - min) / (max - min)) * 70),
      last: i === entries.length - 1,
      date: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }));
  });

  protected readonly history = computed(() => [...(this.plan()?.weights ?? [])].reverse().slice(0, 6));
  protected readonly dateText = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  protected save(input: HTMLInputElement) {
    const kg = Number(input.value.replace(',', '.'));
    if (!this.diet.addWeight(kg)) {
      this.error.set('Informe um peso entre 30 e 300 kg.');
      return;
    }
    this.error.set('');
    input.value = '';
  }
}
