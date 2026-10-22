import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and render NutriSync login form', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Entrar no NutriSync');
  });

  it('valida e-mail e senha obrigatórios antes de autenticar', async () => {
    await component.entrar();
    expect(component.erro()).toContain('Informe um e-mail válido');

    component.email.set('marina@nutrisync.com');
    await component.entrar();
    expect(component.erro()).toContain('Digite sua senha');
  });
});
