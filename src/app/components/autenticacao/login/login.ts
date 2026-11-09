import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DietService } from '../../../nutrisync/diet.service';
import { SupabaseService } from '../../../nutrisync/supabase.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly diet = inject(DietService);

  readonly email = signal('');
  readonly senha = signal('');
  readonly mostrarSenha = signal(false);
  readonly lembrar = signal(true);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly avisoSucesso = signal('');
  readonly emailNaoConfirmado = signal(false);
  readonly reenviando = signal(false);

  constructor() {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (url.includes('verificado=1') || url.includes('access_token=') || url.includes('type=signup')) {
        this.avisoSucesso.set(
          'E-mail confirmado com sucesso! Sua conta foi ativada — digite seu e-mail e senha abaixo para entrar.',
        );
      }
    }
  }

  alternarSenha(): void {
    this.mostrarSenha.set(!this.mostrarSenha());
  }

  async entrar(): Promise<void> {
    this.erro.set('');
    this.avisoSucesso.set('');
    this.emailNaoConfirmado.set(false);

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
      const res = await this.supabase.autenticarComVerificacaoEmail(emailLimpo, senhaVal);
      if (!res.ok || !res.usuario) {
        this.emailNaoConfirmado.set(Boolean(res.emailNaoConfirmado));
        this.erro.set(
          res.erro ?? 'E-mail ou senha incorretos. Verifique seus dados ou confirme seu e-mail.',
        );
        return;
      }

      this.supabase.definirEmailSessao(res.usuario.email);
      await this.diet.carregarDoBanco(res.usuario.email);
      await this.router.navigateByUrl('/home');
    } finally {
      this.carregando.set(false);
    }
  }

  async reenviarConfirmacao(): Promise<void> {
    const emailLimpo = this.email().trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      this.erro.set('Digite seu e-mail no campo acima para reenviar o link de confirmação.');
      return;
    }
    this.reenviando.set(true);
    try {
      const res = await this.supabase.reenviarEmailConfirmacao(emailLimpo);
      if (res.ok) {
        this.erro.set('');
        this.avisoSucesso.set(res.mensagem);
      } else {
        this.erro.set(res.mensagem);
      }
    } finally {
      this.reenviando.set(false);
    }
  }
}
