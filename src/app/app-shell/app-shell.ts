import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { marinaPhoto } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app-shell.html',
  // Os estilos do NutriSync ficam em src/nutrisync.css (global, escopado em .nutrisync),
  // pois precisam valer também para as páginas filhas (router-outlet).
  styleUrl: './app-shell.css',
})
export class AppShell {
  private readonly router = inject(Router);
  protected readonly diet = inject(DietService);

  protected readonly marinaPhoto = marinaPhoto;

  protected readonly nav = [
    { path: '/home', label: 'Painel', icon: '▦' },
    { path: '/minha-dieta', label: 'Minha dieta', icon: '⑂' },
    { path: '/progresso', label: 'Progresso', icon: '↗' },
    { path: '/nutricionistas', label: 'Nutricionistas', icon: '♧' },
    { path: '/analise-foto', label: 'Análise por foto', icon: '▣' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Páginas internas destacam o item de menu "pai", como no design. */
  protected readonly active = computed(() => {
    const page = this.url().split('?')[0];
    if (page === '/montar-dieta') return '/minha-dieta';
    if (['/perfil-nutricionista', '/agendar-consulta', '/consulta-confirmada'].includes(page)) {
      return '/nutricionistas';
    }
    return page;
  });
}
