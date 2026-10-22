import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

const API_URL = 'https://69ec4ad897482ad5c528424e.mockapi.io/usuario';
const LOCAL_USERS_KEY = 'nutrisync.usuarios.v1';
const SESSION_KEY = 'nutrisync.sessao.v1';

@Component({
  selector: 'app-registrar',
  imports: [FormsModule, RouterLink],
  templateUrl: './registrar.html',
  styleUrl: './registrar.css',
})
export class Registrar {
  private readonly router = inject(Router);

  readonly nome = signal('');
  readonly email = signal('');
  readonly telefone = signal('');
  readonly estado = signal('SP');
  readonly perfil = signal<'paciente' | 'nutricionista'>('paciente');
  readonly senha = signal('');
  readonly confirmar = signal('');
  readonly mostrarSenha = signal(false);
  readonly aceitouTermos = signal(true);

  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');

  readonly estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  alternarSenha(): void {
    this.mostrarSenha.set(!this.mostrarSenha());
  }

  async verificarSenha(): Promise<void> {
    this.erro.set('');
    this.sucesso.set('');

    const nomeVal = this.nome().trim();
    const emailVal = this.email().trim().toLowerCase();
    const senhaVal = this.senha();
    const confirmarVal = this.confirmar();

    if (!nomeVal || nomeVal.length < 2) {
      this.erro.set('Informe seu nome completo.');
      return;
    }
    if (!emailVal || !emailVal.includes('@')) {
      this.erro.set('Informe um e-mail válido.');
      return;
    }
    if (!senhaVal || senhaVal.length < 6) {
      this.erro.set('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (senhaVal !== confirmarVal) {
      this.erro.set('As senhas digitadas não coincidem.');
      return;
    }
    if (!this.aceitouTermos()) {
      this.erro.set('Confirme a concordância com os termos de uso para criar sua conta.');
      return;
    }

    await this.registrar();
  }

  async registrar(): Promise<void> {
    const email = this.email().trim().toLowerCase();
    const senha = this.senha();
    const estado = this.estado();
    const telefone = this.telefone().trim() || '(11) 99999-9999';
    const nome = this.nome().trim();

    this.carregando.set(true);
    try {
      const locais = this.lerUsuariosLocais();
      if (locais.some((u) => u.email.toLowerCase() === email)) {
        this.erro.set('Este e-mail já está cadastrado. Tente entrar na sua conta.');
        return;
      }

      try {
        const resposta = await fetch(API_URL);
        if (resposta.ok) {
          const todosUsuarios: Array<{ email?: string }> = await resposta.json();
          const emailEncontrado = todosUsuarios.find(
            (usuario) => (usuario.email ?? '').toLowerCase() === email,
          );
          if (emailEncontrado) {
            this.erro.set('Este e-mail já está cadastrado. Tente entrar na sua conta.');
            return;
          }

          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: senha,
              estado,
              telefone,
              nome,
              perfil: this.perfil(),
            }),
          });
        }
      } catch {
        // Caso o MockAPI esteja indisponível, o cadastro segue salvo localmente
      }

      const novoUsuario = { email, password: senha, estado, telefone, nome, perfil: this.perfil() };
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([...locais, novoUsuario]));
      localStorage.setItem(SESSION_KEY, JSON.stringify({ nome, email, perfil: this.perfil() }));

      this.sucesso.set('Conta criada com sucesso! Redirecionando para o seu plano...');
      await this.router.navigateByUrl('/montar-dieta');
    } finally {
      this.carregando.set(false);
    }
  }

  private lerUsuariosLocais(): Array<{
    email: string;
    password?: string;
    nome?: string;
    estado?: string;
    telefone?: string;
  }> {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
