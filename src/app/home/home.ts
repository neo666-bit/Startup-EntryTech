import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { foodPhoto, imageUrl } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { dateLabel, fmtDec, fmtInt } from '../nutrisync/format';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly diet = inject(DietService);

  protected readonly fmtInt = fmtInt;
  protected readonly fmtDec = fmtDec;
  protected readonly imageUrl = imageUrl;
  protected readonly foodPhoto = foodPhoto;
  protected readonly plan = this.diet.plan;
  protected readonly todayLabel = dateLabel(new Date());

  protected readonly features = [
    { icon: '☷', title: 'Ajustado ao seu dia', description: 'Refeições compatíveis com seus horários e orçamento.' },
    { icon: '⟳', title: 'Flexível de verdade', description: 'Substituições simples para você não ficar sem opções.' },
    { icon: '♧', title: 'Apoio quando quiser', description: 'Conecte um nutricionista ao plano a qualquer momento.' },
  ];

  protected readonly today = computed(() => this.plan()?.days.find((d) => d.weekday === new Date().getDay()) ?? null);
  protected readonly weight = this.diet.latestWeight;
}
