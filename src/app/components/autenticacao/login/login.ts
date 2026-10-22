import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

const API_URL = 'https://69ec4ad897482ad5c528424e.mockapi.io/usuario';
const LOCAL_USERS_KEY = 'nutrisync.usuarios.v1';
const SESSION_KEY = 'nutrisync.sessao.v1';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly senha = signal('');
  readonly mostrarSenha = signal(false);
  readonly lembrar = signal(true);
  readonly carregando = signal(false);
  readonly erro = signal('');

  alternarSenha(): void {
    this.mostrarSenha.set(!this.mostrarSenha());
  }

  async entrar(): Promise<void> {
    this.erro.set('');
    const emailLimpo = this.email().trim().toLowerCase();
    const senhaVal = this.senha();

    if (!emailLimpo || !emailLimpo.includes('@')) {
      this.erro.set('Informe um e-mail válido para continuar.');
      return;
    }
    if (!senhaVal) {
      this.erro.set('Digite sua senha.');
      return;
    }

    this.carregando.set(true);
    try {
      let usuarioEncontrado: { nome?: string; email: string } | undefined;

      // 1. Verifica usuários salvos localmente
      const locais = this.lerUsuariosLocais();
      usuarioEncontrado = locais.find(
        (u) => u.email.toLowerCase() === emailLimpo && u.password === senhaVal,
      );

      // 2. Consulta o MockAPI do projeto caso não esteja apenas local
      if (!usuarioEncontrado) {
        try {
          const resposta = await fetch(API_URL);
          if (resposta.ok) {
            const todosUsuarios: Array<{ nome?: string; email?: string; password?: string }> =
              await resposta.json();
            usuarioEncontrado = todosUsuarios.find(
              (u) => (u.email ?? '').toLowerCase() === emailLimpo && u.password === senhaVal,
            ) as { nome?: string; email: string } | undefined;
          }
        } catch {
          // Se estiver sem internet ou a API falhar, permite seguir pelo fallback
        }
      }

      if (!usuarioEncontrado) {
        this.erro.set('E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.');
        return;
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          nome: usuarioEncontrado.nome ?? emailLimpo.split('@')[0],
          email: emailLimpo,
        }),
      );
      await this.router.navigateByUrl('/home');
    } finally {
      this.carregando.set(false);
    }
  }

  private lerUsuariosLocais(): Array<{ nome?: string; email: string; password?: string }> {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
