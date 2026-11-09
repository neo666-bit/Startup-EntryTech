import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { defaultUserAvatar } from '../nutrisync-data';
import {
  AmigoComProgresso,
  SupabaseAmizadeRow,
  SupabaseService,
} from '../nutrisync/supabase.service';

@Component({
  selector: 'app-amigos',
  imports: [FormsModule],
  templateUrl: './amigos.html',
  styleUrl: './amigos.css',
})
export class Amigos {
  private readonly supabase = inject(SupabaseService);

  protected readonly defaultPhoto = defaultUserAvatar;
  protected readonly meuNome = signal('');
  protected readonly meuEmail = signal('');
  protected readonly minhaFoto = signal<string | null>(null);
  protected readonly minhaOfensiva = signal(1);
  protected readonly fizCheckinHoje = signal(false);

  protected readonly pedidosRecebidos = signal<SupabaseAmizadeRow[]>([]);
  protected readonly pedidosEnviados = signal<SupabaseAmizadeRow[]>([]);
  protected readonly amigos = signal<AmigoComProgresso[]>([]);

  protected readonly emailBusca = signal('');
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');

  protected readonly diasSemanaStreak = computed(() => {
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hojeIdx = new Date().getDay();
    const streak = this.minhaOfensiva();
    return nomes.map((label, idx) => {
      const distancia = (hojeIdx - idx + 7) % 7;
      const aceso =
        idx === hojeIdx
          ? this.fizCheckinHoje() || streak > 0
          : distancia > 0 && distancia < streak;
      return { label, aceso, hoje: idx === hojeIdx };
    });
  });

  constructor() {
    void this.carregarPainel();
  }

  protected async carregarPainel(): Promise<void> {
    this.carregando.set(true);
    try {
      const dados = await this.supabase.carregarPainelSocialAmigos();
      if (dados.meuUsuario) {
        this.meuNome.set(dados.meuUsuario.nome);
        this.meuEmail.set(dados.meuUsuario.email);
        this.minhaFoto.set(dados.meuUsuario.foto_perfil_base64 ?? null);
      }
      this.minhaOfensiva.set(dados.minhaOfensiva);
      this.fizCheckinHoje.set(dados.fizCheckinHoje);
      this.pedidosRecebidos.set(dados.pedidosRecebidos);
      this.pedidosEnviados.set(dados.pedidosEnviados);
      this.amigos.set(dados.amigos);
    } finally {
      this.carregando.set(false);
    }
  }

  protected async marcarFocoDeHoje(): Promise<void> {
    this.erro.set('');
    this.sucesso.set('');
    const res = await this.supabase.registrarCheckinOfensiva();
    this.minhaOfensiva.set(res.novaOfensiva);
    this.fizCheckinHoje.set(true);
    if (res.jaFezHoje) {
      this.sucesso.set(
        `Sua ofensiva de hoje já está garantida (${res.novaOfensiva} ${res.novaOfensiva === 1 ? 'dia seguido' : 'dias seguidos'})!`,
      );
    } else {
      this.sucesso.set(
        `Foco registrado! Sua ofensiva subiu para ${res.novaOfensiva} ${res.novaOfensiva === 1 ? 'dia seguido' : 'dias seguidos'}!`,
      );
    }
  }

  protected async enviarPedido(): Promise<void> {
    this.erro.set('');
    this.sucesso.set('');
    const email = this.emailBusca().trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.erro.set('Digite o e-mail válido do amigo que deseja adicionar.');
      return;
    }

    this.carregando.set(true);
    try {
      const res = await this.supabase.enviarPedidoAmizade(email);
      if (!res.ok || !res.pedido) {
        this.erro.set(res.erro ?? 'Não foi possível enviar o pedido de amizade.');
        return;
      }
      this.pedidosEnviados.update((atuais) => [res.pedido!, ...atuais]);
      this.emailBusca.set('');
      this.sucesso.set(`Pedido de amizade enviado para ${res.pedido.destinatario_nome} (${res.pedido.destinatario_email})!`);
    } finally {
      this.carregando.set(false);
    }
  }

  protected async responderPedido(pedido: SupabaseAmizadeRow, aceitar: boolean): Promise<void> {
    this.erro.set('');
    this.sucesso.set('');
    const ok = await this.supabase.responderPedidoAmizade(pedido.id, aceitar);
    if (!ok) {
      this.erro.set('Não foi possível atualizar o pedido de amizade.');
      return;
    }

    if (aceitar) {
      this.sucesso.set(`Agora você e ${pedido.solicitante_nome} são amigos! Acompanhem suas ofensivas juntos.`);
      await this.carregarPainel();
    } else {
      this.pedidosRecebidos.update((atuais) => atuais.filter((p) => p.id !== pedido.id));
      this.sucesso.set(`Pedido de ${pedido.solicitante_nome} recusado.`);
    }
  }

  protected async cancelarOuRemover(amizadeId: string, nome: string): Promise<void> {
    this.erro.set('');
    this.sucesso.set('');
    const ok = await this.supabase.removerAmizade(amizadeId);
    if (ok) {
      this.pedidosEnviados.update((l) => l.filter((p) => p.id !== amizadeId));
      this.amigos.update((l) => l.filter((a) => a.amizadeId !== amizadeId));
      this.sucesso.set(`${nome} foi removido.`);
    }
  }

  protected async mandarIncentivo(amigo: AmigoComProgresso): Promise<void> {
    const novoTotal = await this.supabase.incentivarAmigo(amigo.amizadeId, amigo.incentivos);
    this.amigos.update((lista) =>
      lista.map((a) => (a.amizadeId === amigo.amizadeId ? { ...a, incentivos: novoTotal } : a)),
    );
    this.sucesso.set(`Você mandou um foguinho de incentivo para ${amigo.nome}!`);
  }
}
