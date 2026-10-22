import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DietService } from './nutrisync/diet.service';
import { baseProfile } from './nutrisync/test-fixtures';
import { Plan } from './plan/plan';
import { Progress } from './progress/progress';
import { PhotoAnalysis } from './photo-analysis/photo-analysis';
import { Home } from './home/home';
import { Wizard } from './wizard/wizard';
import { AppShell } from './app-shell/app-shell';

const setup = () => {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
};

const text = (c: { nativeElement: HTMLElement }) => c.nativeElement.textContent ?? '';

describe('telas sem dieta criada', () => {
  beforeEach(setup);

  it.each<[string, Type<unknown>]>([
    ['Minha dieta', Plan],
    ['Progresso', Progress],
    ['Análise por foto', PhotoAnalysis],
  ])('%s mostra só o convite para criar a dieta', async (_name, cmp) => {
    const f = TestBed.createComponent(cmp);
    await f.whenStable();
    const html = text(f);
    expect(html).toContain('Criar minha dieta');
    expect(html).not.toMatch(/kcal/);
    expect(html).not.toContain('Frango');
    expect(html).not.toContain('Omelete');
    expect(f.nativeElement.querySelector('.meal')).toBeNull();
  });

  it('Home mostra a chamada inicial, sem números de plano', async () => {
    const f = TestBed.createComponent(Home);
    await f.whenStable();
    expect(text(f)).toContain('Plano ainda não gerado');
    expect(text(f)).not.toMatch(/kcal/);
  });

  it('barra lateral não mostra meta nem progresso', async () => {
    const f = TestBed.createComponent(AppShell);
    await f.whenStable();
    expect(text(f)).toContain('Sem plano ainda');
    expect(text(f)).not.toMatch(/\d+%/);
  });
});

describe('depois de criar a dieta', () => {
  beforeEach(setup);

  it('Plan exibe as calorias calculadas e as refeições reais', async () => {
    const diet = TestBed.inject(DietService);
    const plan = diet.generate(baseProfile);
    const f = TestBed.createComponent(Plan);
    await f.whenStable();
    expect(text(f)).toContain(plan.summary.kcal.toLocaleString('pt-BR'));
    expect(f.nativeElement.querySelectorAll('.meal').length).toBe(5);
    expect(f.nativeElement.querySelector('app-empty-plan')).toBeNull();
  });

  it('Progress mostra o peso informado no questionário', async () => {
    const diet = TestBed.inject(DietService);
    diet.generate({ ...baseProfile, weightKg: 81.5 });
    const f = TestBed.createComponent(Progress);
    await f.whenStable();
    expect(text(f)).toContain('81,5 kg');
  });
});

describe('Wizard', () => {
  beforeEach(setup);

  const click = (el: HTMLElement, label: RegExp) =>
    Array.from(el.querySelectorAll('button')).find((b) => label.test(b.textContent ?? ''))!.click();

  const type = (el: HTMLElement, placeholder: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(`input[placeholder="${placeholder}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('não avança da etapa 2 sem os dados corporais e explica o que falta', async () => {
    const f = TestBed.createComponent(Wizard);
    const el = f.nativeElement as HTMLElement;
    await f.whenStable();
    click(el, /Continuar/); // 1 → 2
    await f.whenStable();
    click(el, /Continuar/); // tenta 2 → 3 vazio
    await f.whenStable();
    expect(el.textContent).toContain('Etapa 2 de 5');
    expect(el.textContent).toContain('Informe sua idade');
    expect(el.textContent).toContain('Selecione uma opção');
  });

  it('preenche tudo, gera o plano com as calorias calculadas e vai para /plan', async () => {
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const f = TestBed.createComponent(Wizard);
    const el = f.nativeElement as HTMLElement;
    await f.whenStable();

    click(el, /Continuar/);
    await f.whenStable();
    const sex = el.querySelector<HTMLSelectElement>('select')!;
    sex.value = 'F';
    sex.dispatchEvent(new Event('change'));
    type(el, 'Ex.: 32', '32');
    type(el, 'Ex.: 168', '168');
    type(el, 'Ex.: 74', '74');
    await f.whenStable();

    for (let i = 0; i < 3; i++) {
      click(el, /Continuar|Revisar respostas/);
      await f.whenStable();
    }
    expect(el.textContent).toContain('Etapa 5 de 5');
    expect(el.textContent).toContain('1.820 kcal');

    click(el, /Gerar meu plano/);
    const saved = TestBed.inject(DietService).plan()!;
    expect(saved.summary.kcal).toBe(1820);
    expect(saved.profile.weightKg).toBe(74);
    expect(nav).toHaveBeenCalledWith('/plan');
  });
});

describe('troca por foto vale só para hoje', () => {
  beforeEach(setup);

  it('substitui a refeição de hoje, mantém os outros dias e desfaz', () => {
    const diet = TestBed.inject(DietService);
    diet.generate(baseProfile);
    const today = new Date().getDay();
    const other = (today + 1) % 7;
    const before = diet.dayOn(today)!;
    const lunch = before.meals.find((m) => m.slot === 'lunch')!;

    diet.replaceMealToday('lunch', { ...lunch, desc: 'Meu prato', kcal: 700, protein: 40, carbs: 80, fat: 20 });

    const after = diet.dayOn(today)!;
    expect(after.meals.find((m) => m.slot === 'lunch')!.desc).toBe('Meu prato');
    expect(after.meals.find((m) => m.slot === 'lunch')!.fromPhoto).toBe(true);
    expect(after.kcal).toBe(before.kcal - lunch.kcal + 700);
    expect(diet.dayOn(other)).toEqual(diet.plan()!.days.find((d) => d.weekday === other));

    diet.undoReplaceToday('lunch');
    expect(diet.dayOn(today)!.kcal).toBe(before.kcal);
  });

  it('refazer o plano descarta substituições antigas', () => {
    const diet = TestBed.inject(DietService);
    diet.generate(baseProfile);
    const lunch = diet.dayOn(new Date().getDay())!.meals.find((m) => m.slot === 'lunch')!;
    diet.replaceMealToday('lunch', { ...lunch, desc: 'Meu prato' });
    diet.generate(baseProfile);
    expect(diet.dayOn(new Date().getDay())!.meals.some((m) => m.fromPhoto)).toBe(false);
  });
});
