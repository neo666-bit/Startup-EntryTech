import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marinaPhoto, secondProfessional } from '../nutrisync-data';

@Component({
  selector: 'app-nutricionistas',
  imports: [RouterLink],
  templateUrl: './nutricionistas.html',
  styleUrl: './nutricionistas.css',
})
export class Nutricionistas {
  protected readonly search = signal('');

  private readonly all = [
    { name: 'Dra. Marina Costa', area: 'Emagrecimento sustentável · Comportamental', price: 'R$ 189', image: marinaPhoto, best: true },
    { name: 'Dr. Rafael Nogueira', area: 'Nutrição esportiva · Hipertrofia', price: 'R$ 210', image: secondProfessional, best: false },
    { name: 'Dra. Camila Azevedo', area: 'Saúde da mulher · Intolerâncias', price: 'R$ 175', image: marinaPhoto, best: false },
  ];

  protected readonly professionals = computed(() =>
    this.all.filter((p) => p.name.toLowerCase().includes(this.search().toLowerCase())),
  );

  protected readonly filters = [
    { group: 'Especialidade', items: ['Emagrecimento', 'Comportamental', 'Esportiva'] },
    { group: 'Disponibilidade', items: ['Hoje', 'Próximos 3 dias', 'À noite'] },
    { group: 'Faixa de preço', items: ['Até R$ 180', 'R$ 180–220', 'Acima de R$ 220'] },
    { group: 'Avaliação mínima', items: ['4,5+'] },
  ];

  protected readonly sortOptions = ['Melhor combinação', 'Menor preço'];

  protected onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
