import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defaultUserAvatar, marinaPhoto, secondProfessional } from '../nutrisync-data';
import { fmtDec } from '../nutrisync/format';
import { SupabaseService } from '../nutrisync/supabase.service';

interface ProfessionalCard {
  name: string;
  crn: string;
  area: string;
  price: string;
  durationMin: number;
  rating: string;
  reviewsCount: number;
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

  protected readonly professionals = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.listFromDb();
    return this.listFromDb().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.crn.toLowerCase().includes(q),
    );
  });

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
      rows.map((r, idx) => {
        const fotoPadraoSeed = idx === 1 ? secondProfessional : marinaPhoto;
        const imagem = r.foto_url || (r.usuario_id ? defaultUserAvatar : fotoPadraoSeed);
        return {
          name: r.nome_exibicao,
          crn: r.crn || 'CRN-SP Verificado',
          area: r.especialidades,
          price: `R$ ${Math.round(Number(r.preco_consulta || 180))}`,
          durationMin: Number(r.duracao_minutos || 50),
          rating: fmtDec(Number(r.nota_media || 5.0), 1),
          reviewsCount: Number(r.total_avaliacoes ?? 1),
          image: imagem,
          best: r.melhor_combinacao,
        };
      }),
    );
  }

  protected onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
