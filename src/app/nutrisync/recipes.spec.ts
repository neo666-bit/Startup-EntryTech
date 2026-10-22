import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Plan } from '../plan/plan';
import { DietService } from './diet.service';
import { FOOD_CATALOG } from './food-catalog';
import { formatItem, RECIPE_QUERY, recipeFor, RECIPES, recipeUrl } from './recipes';
import { baseProfile } from './test-fixtures';

describe('bloco de notas de receitas', () => {
  it('todo prato do catálogo tem receita completa (ingredientes e passos) e termo de busca', () => {
    const ids = FOOD_CATALOG.map((o) => o.id).sort();
    expect(Object.keys(RECIPES).sort()).toEqual(ids);
    expect(Object.keys(RECIPE_QUERY).sort()).toEqual(ids);
    for (const id of ids) {
      const r = recipeFor(id)!;
      expect(r.items.length).toBeGreaterThanOrEqual(2);
      expect(r.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('escala ingredientes em gramas/ml e em unidades conforme o fator da porção', () => {
    expect(formatItem({ qty: 120, unit: 'g', name: 'peito de frango' }, 1)).toBe('120 g de peito de frango');
    expect(formatItem({ qty: 120, unit: 'g', name: 'peito de frango' }, 1.25)).toBe('150 g de peito de frango');
    expect(formatItem({ qty: 2, unit: 'un', name: 'ovo|ovos' }, 1.5)).toBe('3 ovos');
    expect(formatItem({ qty: 1, unit: 'fatia', name: 'pão integral' }, 2)).toBe('2 fatias de pão integral');
    expect(formatItem({ qty: null, unit: 'un', name: 'sal' }, 1.4)).toBe('Sal a gosto');
  });

  it('pratos registrados por foto não têm receita nem link', () => {
    expect(recipeFor('photo')).toBeNull();
    expect(recipeUrl('photo')).toBeNull();
  });

  it('abre o bloco de notas da receita ao clicar em "Ver receita" na refeição', async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const diet = TestBed.inject(DietService);
    diet.generate(baseProfile);
    const f = TestBed.createComponent(Plan);
    const el = f.nativeElement as HTMLElement;
    await f.whenStable();

    el.querySelector<HTMLElement>('.meal')!.click();
    await f.whenStable();

    const btn = Array.from(el.querySelectorAll<HTMLButtonElement>('.meal-actions button')).find((b) =>
      b.textContent?.includes('Ver receita'),
    )!;
    expect(btn).toBeTruthy();
    btn.click();
    await f.whenStable();

    const note = el.querySelector<HTMLElement>('app-recipe-note .note')!;
    expect(note).toBeTruthy();
    const first = diet.plan()!.days.find((d) => d.weekday === new Date().getDay())!.meals[0];
    expect(note.querySelector('h2')!.textContent).toContain(first.desc);
    expect(note.querySelectorAll('.note-list li').length).toBeGreaterThanOrEqual(2);
    expect(note.querySelectorAll('.note-steps li').length).toBeGreaterThanOrEqual(2);

    const ext = note.querySelector<HTMLAnchorElement>('.note-foot a')!;
    expect(ext.href).toBe(recipeUrl(first.optionId));

    note.querySelector<HTMLButtonElement>('.note-close')!.click();
    await f.whenStable();
    expect(el.querySelector('app-recipe-note .note')).toBeNull();
  });
});
