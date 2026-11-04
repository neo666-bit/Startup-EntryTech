import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { marinaPhoto } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { SupabaseService } from '../nutrisync/supabase.service';

export type UserModalKind = 'configuracoes' | 'planos' | 'suporte' | null;

export interface UserAccount {
  nome: string;
  email: string;
  telefone: string;
  estado: string;
  fotoBase64: string | null;
  fotoMime?: string | null;
  fotoNomeArquivo?: string | null;
  planoAssinatura: 'Essencial' | 'Plano Equilíbrio' | 'Plano Acompanhamento';
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

  protected readonly defaultPhoto = marinaPhoto;
  protected readonly menuOpen = signal(false);
  protected readonly activeModal = signal<UserModalKind>(null);

  protected readonly account = signal<UserAccount>({ ...EMPTY_ACCOUNT });
  protected readonly configSaved = signal('');
  protected readonly photoUploadError = signal('');

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
    id: UserAccount['planoAssinatura'];
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
      descricao: 'Para começar a organizar sua alimentação com cálculo energético real.',
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
      destaque: true,
      descricao: 'Flexibilidade completa para adaptar os pratos e registrar sua rotina.',
      recursos: [
        'Tudo do plano Essencial',
        'Troca ilimitada de pratos mantendo calorias e macros',
        'Análise de pratos por foto com substituição no dia',
        'Gráfico completo de evolução de peso e metas',
      ],
    },
    {
      id: 'Plano Acompanhamento',
      preco: 'R$ 149,90',
      periodo: '/mês',
      descricao: 'Cuidado próximo com nutricionista dedicada revisando seu plano.',
      recursos: [
        'Tudo do Plano Equilíbrio',
        '1 consulta online mensal (50 min) inclusa',
        'Compartilhamento automático de dieta e progresso',
        'Canal direto para tirar dúvidas com a nutricionista',
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

  protected readonly nav = [
    { path: '/home', label: 'Painel', icon: 'bi-grid' },
    { path: '/minha-dieta', label: 'Minha dieta', icon: 'bi-journal-check' },
    { path: '/progresso', label: 'Progresso', icon: 'bi-graph-up-arrow' },
    { path: '/nutricionistas', label: 'Nutricionistas', icon: 'bi-people' },
    { path: '/analise-foto', label: 'Análise por foto', icon: 'bi-camera' },
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

    this.account.set({
      nome: usuarioBanco.nome,
      email: usuarioBanco.email,
      telefone: usuarioBanco.telefone ?? '',
      estado: usuarioBanco.estado_uf ?? 'SP',
      fotoBase64: usuarioBanco.foto_perfil_base64 ?? null,
      fotoMime: usuarioBanco.foto_perfil_mime ?? null,
      fotoNomeArquivo: null,
      planoAssinatura: usuarioBanco.plano_assinatura ?? 'Plano Equilíbrio',
      lembretesAgua: usuarioBanco.lembretes_agua ?? true,
      resumoSemanalEmail: usuarioBanco.resumo_semanal_email ?? true,
    });
  }

  protected toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  protected openModal(kind: UserModalKind): void {
    this.menuOpen.set(false);
    this.configSaved.set('');
    this.photoUploadError.set('');
    this.suporteProtocolo.set('');
    this.activeModal.set(kind);
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
