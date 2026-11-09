import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../nutrisync/supabase.service';

@Component({
  selector: 'app-registrar',
  imports: [FormsModule, RouterLink],
  templateUrl: './registrar.html',
  styleUrl: './registrar.css',
})
export class Registrar {
  private readonly supabase = inject(SupabaseService);

  readonly nome = signal('');
  readonly email = signal('');
  readonly telefone = signal('');
  readonly estado = signal('SP');
  readonly perfil = signal<'paciente' | 'nutricionista'>('paciente');
  readonly senha = signal('');
  readonly confirmar = signal('');
  readonly mostrarSenha = signal(false);
  readonly aceitouTermos = signal(true);
  readonly fotoBase64 = signal<string | null>(null);
  readonly fotoMime = signal<string | null>(null);
  readonly fotoNome = signal<string>('');

  readonly carregando = signal(false);
  readonly reenviando = signal(false);
  readonly erro = signal('');
  readonly sucesso = signal('');
  readonly aguardandoConfirmacaoEmail = signal(false);

  readonly estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  alternarSenha(): void {
    this.mostrarSenha.set(!this.mostrarSenha());
  }

  selecionarFotoArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const permitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!permitidos.includes(file.type)) {
      this.erro.set('Selecione um arquivo de foto no formato .PNG ou .JPG.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.erro.set('A foto deve ter no máximo 4 MB.');
      return;
    }

    this.erro.set('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.fotoBase64.set(reader.result);
        this.fotoMime.set(file.type);
        this.fotoNome.set(file.name);
      }
    };
    reader.readAsDataURL(file);
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
      const res = await this.supabase.registrarComVerificacaoEmail({
        nome,
        email,
        senha,
        telefone,
        estado,
        perfil: this.perfil(),
        fotoBase64: this.fotoBase64(),
        fotoMime: this.fotoMime(),
      });

      if (!res.ok) {
        this.erro.set(res.erro ?? 'Não foi possível criar a conta. Verifique os dados informados.');
        return;
      }

      this.aguardandoConfirmacaoEmail.set(true);
      this.sucesso.set(`Enviamos um e-mail de confirmação para ${email}!`);
    } finally {
      this.carregando.set(false);
    }
  }

  async reenviarEmail(): Promise<void> {
    this.erro.set('');
    this.reenviando.set(true);
    try {
      const res = await this.supabase.reenviarEmailConfirmacao(this.email());
      if (res.ok) {
        this.sucesso.set(res.mensagem);
      } else {
        this.erro.set(res.mensagem);
      }
    } finally {
      this.reenviando.set(false);
    }
  }
}
