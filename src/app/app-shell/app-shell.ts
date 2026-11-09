import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { defaultUserAvatar } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { PlanoAssinatura, SupabaseAmigoRow, SupabaseService } from '../nutrisync/supabase.service';

export type UserModalKind = 'configuracoes' | 'planos' | 'suporte' | null;

export interface UserAccount {
  nome: string;
  email: string;
  telefone: string;
  estado: string;
  fotoBase64: string | null;
  fotoMime?: string | null;
  fotoNomeArquivo?: string | null;
  planoAssinatura: PlanoAssinatura;
  lembretesAgua: boolean;
  resumoSemanalEmail: boolean;
}

const EMPTY_ACCOUNT: UserAccount = {
  nome: 'Carregando...',
  email: '',
  telefone: '',
  estado: 'SP',
  fotoBase64: null,
  fotoMime: null,
  fotoNomeArquivo: null,
  planoAssinatura: 'Plano Equilíbrio',
  lembretesAgua: true,
  resumoSemanalEmail: true,
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, FormsModule],
  templateUrl: './app-shell.html',
  // Os estilos do NutriSync ficam em src/nutrisync.css (global, escopado em .nutrisync),
  // pois precisam valer também para as páginas filhas (router-outlet).
  styleUrl: './app-shell.css',
  host: {
    '(document:keydown.escape)': 'closeAll()',
  },
})
export class AppShell {
  private readonly router = inject(Router);
  protected readonly diet = inject(DietService);
  private readonly supabase = inject(SupabaseService);

  protected readonly defaultPhoto = defaultUserAvatar;
  protected readonly menuOpen = signal(false);
  protected readonly activeModal = signal<UserModalKind>(null);

  protected readonly account = signal<UserAccount>({ ...EMPTY_ACCOUNT });
  protected readonly configSaved = signal('');
  protected readonly photoUploadError = signal('');

  // Gerenciamento de vagas do plano (Plano Dupla = 1 amigo | Plano Família = 3 amigos) dentro de Configurações
  protected readonly amigosPlano = signal<SupabaseAmigoRow[]>([]);
  protected readonly emailAmigoPlano = signal('');
  protected readonly erroAmigoPlano = signal('');
  protected readonly carregandoAmigoPlano = signal(false);

  // Campos de suporte
  protected readonly suporteAssunto = signal('Dúvida sobre meu plano alimentar');
  protected readonly suporteMensagem = signal('');
  protected readonly suporteProtocolo = signal('');

  protected readonly estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
  ];

  protected readonly planosDisponiveis: Array<{
    id: PlanoAssinatura;
    preco: string;
    periodo: string;
    destaque?: boolean;
    descricao: string;
    recursos: string[];
  }> = [
    {
      id: 'Essencial',
      preco: 'Grátis',
      periodo: 'para sempre',
      descricao: 'Plano individual para começar a organizar sua alimentação com cálculo real.',
      recursos: [
        'Cálculo de calorias e macronutrientes (Mifflin-St Jeor)',
        'Cardápio semanal de 7 dias adaptado a restrições',
        'Bloco de notas com modo de preparo das receitas',
      ],
    },
    {
      id: 'Plano Equilíbrio',
      preco: 'R$ 29,90',
      periodo: '/mês',
      descricao: 'Flexibilidade individual completa para adaptar os pratos e registrar sua rotina.',
      recursos: [
        'Tudo do plano Essencial (uso individual)',
        'Troca ilimitada de pratos mantendo calorias e macros',
        'Análise de pratos por foto com substituição no dia',
        'Gráfico completo de evolução de peso e metas',
      ],
    },
    {
      id: 'Plano Dupla',
      preco: 'R$ 49,90',
      periodo: '/mês',
      destaque: true,
      descricao: 'Para 2 pessoas: compartilhe o plano convidando 1 amigo pelo e-mail.',
      recursos: [
        'Tudo do Plano Equilíbrio para você + 1 amigo',
        'Convide 1 amigo pelo e-mail na aba Amigos',
        'Dietas, restrições e metas 100% individuais para cada um',
      ],
    },
    {
      id: 'Plano Família',
      preco: 'R$ 89,90',
      periodo: '/mês',
      descricao: 'Até 4 pessoas: você pode convidar até 3 amigos ou familiares pelo e-mail.',
      recursos: [
        'Tudo do Plano Equilíbrio para até 4 pessoas',
        'Convide até 3 amigos pelo e-mail na aba Amigos',
        'Cardápios e acompanhamento de peso independentes',
      ],
    },
  ];

  protected readonly faqs = [
    {
      pergunta: 'Como faço para alterar meus dados corporais ou restrições?',
      resposta: 'Vá até a aba "Minha dieta" e clique em "Editar preferências" (ou em "Refazer plano" no Painel) para atualizar peso, objetivo ou alergias.',
    },
    {
      pergunta: 'Preciso colocar link para trocar minha foto de perfil?',
      resposta: 'Não! Em "Configurações", basta clicar em "Enviar arquivo PNG / JPG" e selecionar qualquer imagem do seu celular ou computador.',
    },
    {
      pergunta: 'A troca de prato por foto altera a semana inteira?',
      resposta: 'Não. A substituição por foto vale apenas para a data de hoje, mantendo o restante da sua semana planejada intacto.',
    },
  ];

  protected readonly avatarUrl = computed(() => this.account().fotoBase64 || this.defaultPhoto);
  protected readonly planoAtivo = computed(() => this.supabase.planoAssinaturaAtual());
  protected readonly limiteAmigosPlano = computed(() => {
    const p = this.planoAtivo();
    if (p === 'Plano Dupla') return 1;
    if (p === 'Plano Família') return 3;
    return 0;
  });

  protected readonly nav = [
    { path: '/home', label: 'Painel', icon: 'bi-grid' },
    { path: '/minha-dieta', label: 'Minha dieta', icon: 'bi-journal-check' },
    { path: '/progresso', label: 'Progresso', icon: 'bi-graph-up-arrow' },
    { path: '/nutricionistas', label: 'Nutricionistas', icon: 'bi-people' },
    { path: '/analise-foto', label: 'Análise por foto', icon: 'bi-camera' },
    { path: '/amigos', label: 'Amigos', icon: 'bi-person-plus' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Páginas internas destacam o item de menu "pai", como no design. */
  protected readonly active = computed(() => {
    const page = this.url().split('?')[0];
    if (page === '/montar-dieta') return '/minha-dieta';
    if (['/perfil-nutricionista', '/agendar-consulta', '/consulta-confirmada'].includes(page)) {
      return '/nutricionistas';
    }
    return page;
  });

  constructor() {
    this.supabase.limparDadosLocaisAntigos();
    void this.carregarContaDoBanco();
  }

  /** Carrega os dados do usuário logado diretamente da tabela `usuarios` do PostgreSQL (Supabase). */
  private async carregarContaDoBanco(): Promise<void> {
    const usuarioBanco = await this.supabase.buscarUsuarioLogado();
    if (!usuarioBanco) {
      await this.router.navigateByUrl('/login');
      return;
    }

    const plano = usuarioBanco.plano_assinatura ?? 'Plano Equilíbrio';
    this.supabase.planoAssinaturaAtual.set(plano);
    this.account.set({
      nome: usuarioBanco.nome,
      email: usuarioBanco.email,
      telefone: usuarioBanco.telefone ?? '',
      estado: usuarioBanco.estado_uf ?? 'SP',
      fotoBase64: usuarioBanco.foto_perfil_base64 ?? null,
      fotoMime: usuarioBanco.foto_perfil_mime ?? null,
      fotoNomeArquivo: null,
      planoAssinatura: plano,
      lembretesAgua: usuarioBanco.lembretes_agua ?? true,
      resumoSemanalEmail: usuarioBanco.resumo_semanal_email ?? true,
    });
    const listaPlano = await this.supabase.listarAmigosDoPlano(usuarioBanco.email);
    this.amigosPlano.set(listaPlano);
  }

  protected irParaAmigos(): void {
    this.closeAll();
    void this.router.navigateByUrl('/amigos');
  }

  protected toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  protected openModal(kind: UserModalKind): void {
    this.menuOpen.set(false);
    this.configSaved.set('');
    this.photoUploadError.set('');
    this.erroAmigoPlano.set('');
    this.suporteProtocolo.set('');
    this.activeModal.set(kind);
    if (kind === 'configuracoes') {
      void this.recarregarAmigosPlano();
    }
  }

  private async recarregarAmigosPlano(): Promise<void> {
    const email = this.account().email || this.supabase.lerEmailSessao();
    if (!email) return;
    const lista = await this.supabase.listarAmigosDoPlano(email);
    this.amigosPlano.set(lista);
  }

  protected async adicionarAmigoAoPlanoConfig(): Promise<void> {
    this.erroAmigoPlano.set('');
    this.configSaved.set('');

    const email = this.emailAmigoPlano().trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.erroAmigoPlano.set('Informe um e-mail válido do amigo para vincular ao plano.');
      return;
    }

    const limite = this.limiteAmigosPlano();
    if (limite === 0) {
      this.erroAmigoPlano.set(
        'Seu plano atual é individual. Escolha o Plano Dupla (1 amigo) ou Plano Família (até 3 amigos) para convidar.',
      );
      return;
    }

    if (this.amigosPlano().length >= limite) {
      this.erroAmigoPlano.set(
        this.planoAtivo() === 'Plano Dupla'
          ? 'Limite de 1 amigo do Plano Dupla atingido. Mude para o Plano Família para até 3 amigos.'
          : 'Limite de 3 amigos do Plano Família atingido.',
      );
      return;
    }

    if (this.amigosPlano().some((a) => a.email_amigo.toLowerCase() === email)) {
      this.erroAmigoPlano.set('Este e-mail já está vinculado ao seu plano.');
      return;
    }

    this.carregandoAmigoPlano.set(true);
    try {
      const res = await this.supabase.adicionarAmigoPorEmail(email);
      if (!res.ok || !res.amigo) {
        this.erroAmigoPlano.set(res.erro ?? 'Não foi possível adicionar ao plano.');
        return;
      }
      this.amigosPlano.update((atuais) => [...atuais, res.amigo!]);
      this.emailAmigoPlano.set('');
      this.configSaved.set(`${res.amigo.email_amigo} foi adicionado ao seu ${this.planoAtivo()}!`);
    } finally {
      this.carregandoAmigoPlano.set(false);
    }
  }

  protected async removerAmigoDoPlanoConfig(amigo: SupabaseAmigoRow): Promise<void> {
    this.erroAmigoPlano.set('');
    const ok = await this.supabase.removerAmigoDoPlano(amigo.id);
    if (ok) {
      this.amigosPlano.update((atuais) => atuais.filter((a) => a.id !== amigo.id));
      this.configSaved.set(`${amigo.email_amigo} foi removido do seu plano.`);
    }
  }

  protected closeAll(): void {
    this.menuOpen.set(false);
    this.activeModal.set(null);
  }

  protected updateField<K extends keyof UserAccount>(key: K, value: UserAccount[K]): void {
    this.account.update((acc) => ({ ...acc, [key]: value }));
  }

  protected onAvatarFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      this.photoUploadError.set('Selecione um arquivo .PNG ou .JPG válido do seu dispositivo.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.photoUploadError.set('A foto de perfil deve ter no máximo 4 MB.');
      return;
    }

    this.photoUploadError.set('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.account.update((acc) => ({
          ...acc,
          fotoBase64: reader.result as string,
          fotoMime: file.type,
          fotoNomeArquivo: file.name,
        }));
        this.persistAccount();
        this.configSaved.set(`Foto "${file.name}" enviada e salva no banco!`);
      }
    };
    reader.readAsDataURL(file);
  }

  protected removerFoto(): void {
    this.account.update((acc) => ({
      ...acc,
      fotoBase64: null,
      fotoMime: null,
      fotoNomeArquivo: null,
    }));
    this.persistAccount();
    this.configSaved.set('Foto restaurada para o padrão no banco de dados.');
  }

  protected salvarConfiguracoes(): void {
    this.persistAccount();
    this.configSaved.set('Suas configurações foram salvas no banco de dados!');
  }

  protected selecionarPlano(plano: UserAccount['planoAssinatura']): void {
    this.updateField('planoAssinatura', plano);
    this.persistAccount();
  }

  protected limparDietaAtual(): void {
    this.diet.reset();
    this.configSaved.set('Dieta apagada no banco de dados. Você pode montar uma nova quando quiser.');
  }

  protected enviarSuporte(): void {
    const msg = this.suporteMensagem().trim();
    if (!msg) return;
    const num = Math.floor(100000 + Math.random() * 900000);
    const protocolo = `NS-${num}`;
    this.suporteProtocolo.set(protocolo);
    this.suporteMensagem.set('');
    void this.supabase.abrirChamadoSuporte({
      email: this.account().email,
      protocolo,
      assunto: this.suporteAssunto(),
      mensagem: msg,
    });
  }

  protected sairDaConta(): void {
    this.closeAll();
    this.supabase.definirEmailSessao(null);
    void this.diet.carregarDoBanco(null);
    void this.router.navigateByUrl('/login');
  }

  private persistAccount(): void {
    const acc = this.account();
    void this.supabase.atualizarUsuarioPorEmail(acc.email, {
      nome: acc.nome,
      telefone: acc.telefone,
      estado_uf: acc.estado,
      plano_assinatura: acc.planoAssinatura,
      foto_perfil_base64: acc.fotoBase64,
      foto_perfil_mime: acc.fotoMime ?? null,
      lembretes_agua: acc.lembretesAgua,
      resumo_semanal_email: acc.resumoSemanalEmail,
    });
  }
}
