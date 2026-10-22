import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Registrar } from './registrar';

describe('Registrar', () => {
  let component: Registrar;
  let fixture: ComponentFixture<Registrar>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Registrar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Registrar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and render NutriSync registration form', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Comece sua jornada no NutriSync');
  });

  it('valida campos obrigatórios e confirmação de senha', async () => {
    component.nome.set('Marina Costa');
    component.email.set('marina@nutrisync.com');
    component.senha.set('123456');
    component.confirmar.set('654321');

    await component.verificarSenha();
    expect(component.erro()).toContain('As senhas digitadas não coincidem');
  });
});
