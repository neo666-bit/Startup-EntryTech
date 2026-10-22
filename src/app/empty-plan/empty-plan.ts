import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Estado vazio exibido nas telas que dependem de uma dieta já criada. */
@Component({
  selector: 'app-empty-plan',
  imports: [RouterLink],
  template: `
    <section class="card empty-state">
      <div class="big-icon">⑂</div>
      <h2>{{ title() }}</h2>
      <p>{{ description() }}</p>
      <button class="btn btn-accent" routerLink="/wizard">✦ Criar minha dieta</button>
    </section>
  `,
})
export class EmptyPlan {
  readonly title = input('Você ainda não tem uma dieta');
  readonly description = input(
    'Responda algumas perguntas sobre você e sua rotina. A NutriSync calcula suas calorias e monta o seu plano alimentar.',
  );
}
