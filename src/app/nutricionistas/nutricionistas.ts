import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marinaPhoto, secondProfessional } from '../nutrisync-data';
import { SupabaseService } from '../nutrisync/supabase.service';

interface ProfessionalCard {
  name: string;
  area: string;
  price: string;
  image: string;
  best: boolean;
}

@Component({
  selector: 'app-nutricionistas',
  imports: [RouterLink],
  templateUrl: './nutricionistas.html',
  styleUrl: './nutricionistas.css',
})
export class Nutricionistas {
  private readonly supabase = inject(SupabaseService);
  protected readonly search = signal('');
  private readonly listFromDb = signal<ProfessionalCard[]>([]);

  protected readonly professionals = computed(() =>
    this.listFromDb().filter((p) => p.name.toLowerCase().includes(this.search().toLowerCase())),
  );

  protected readonly filters = [
    { group: 'Especialidade', items: ['Emagrecimento', 'Comportamental', 'Esportiva'] },
    { group: 'Disponibilidade', items: ['Hoje', 'Próximos 3 dias', 'À noite'] },
    { group: 'Faixa de preço', items: ['Até R$ 180', 'R$ 180–220', 'Acima de R$ 220'] },
    { group: 'Avaliação mínima', items: ['4,5+'] },
  ];

  protected readonly sortOptions = ['Melhor combinação', 'Menor preço'];

  constructor() {
    void this.carregarNutricionistasDoBanco();
  }

  private async carregarNutricionistasDoBanco(): Promise<void> {
    const rows = await this.supabase.listarNutricionistas();
    this.listFromDb.set(
      rows.map((r, idx) => ({
        name: r.nome_exibicao,
        area: r.especialidades,
        price: `R$ ${Math.round(Number(r.preco_consulta))}`,
        image: r.foto_url || (idx === 1 ? secondProfessional : marinaPhoto),
        best: r.melhor_combinacao,
      })),
    );
  }

  protected onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
