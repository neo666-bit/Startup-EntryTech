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
      const usuarioPg = await this.supabase.buscarUsuarioPorEmail(emailLimpo);
      if (!usuarioPg || usuarioPg.senha_hash !== senhaVal) {
        this.erro.set('E-mail ou senha incorretos no banco de dados. Verifique seus dados ou crie uma conta.');
        return;
      }

      this.supabase.definirEmailSessao(usuarioPg.email);
      await this.diet.carregarDoBanco(usuarioPg.email);
      await this.router.navigateByUrl('/home');
    } finally {
      this.carregando.set(false);
    }
  }
}
