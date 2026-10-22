import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marinaPhoto } from '../nutrisync-data';

@Component({
  selector: 'app-perfil-nutricionista',
  imports: [RouterLink],
  templateUrl: './perfil-nutricionista.html',
  styleUrl: './perfil-nutricionista.css',
})
export class PerfilNutricionista {
  protected readonly marinaPhoto = marinaPhoto;

  protected readonly steps = [
    { n: '1', title: 'Escuta', text: 'Entendemos rotina, sintomas e relação com a comida.' },
    { n: '2', title: 'Plano vivo', text: 'Revisamos seu plano e ajustamos o que for necessário.' },
    { n: '3', title: 'Evolução', text: 'Acompanhamos sinais, hábitos e resultados sem obsessão.' },
  ];

  protected readonly reviews = [
    { author: 'Ana P.', when: 'há 2 semanas', text: '“A Marina adaptou meu plano aos dias de escritório e finalmente parei de sentir que estava falhando.”' },
    { author: 'Juliana M.', when: 'há 1 mês', text: '“Consulta acolhedora, explicações claras e mudanças que cabem no orçamento.”' },
  ];

  protected readonly slots = [
    { day: 'Hoje', times: '18:30' },
    { day: 'Amanhã', times: '08:00 · 12:30' },
    { day: 'Sexta, 02', times: '10:30 · 17:00' },
  ];

  protected readonly credentials = [
    'Nutrição — USP, 2017',
    'Pós em Comportamento Alimentar',
    'Especialização em Saúde da Mulher',
    'Membro da ASBRAN',
  ];
}
