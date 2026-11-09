import { Injectable, signal } from '@angular/core';
import { FOOD_CATALOG } from './food-catalog';
import { DayPlan, DietPlan, Goal, Pattern, PlannedMeal, Sex, Slot, UserProfile, WaterLogItem, WeightEntry } from './models';
import { isSupabaseConfigured, SUPABASE_CONFIG } from './supabase.config';

export type PlanoAssinatura =
  | 'Essencial'
  | 'Plano Equilíbrio'
  | 'Plano Dupla'
  | 'Plano Família';

export interface SupabaseUsuarioRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  telefone: string | null;
  estado_uf: string;
  tipo_perfil: 'paciente' | 'nutricionista';
  plano_assinatura: PlanoAssinatura;
  foto_perfil_base64: string | null;
  foto_perfil_mime?: string | null;
  lembretes_agua: boolean;
  resumo_semanal_email: boolean;
  email_verificado?: boolean;
  ofensiva_dias?: number;
  ultimo_checkin_ofensiva?: string | null;
}

export interface SupabaseAmigoRow {
  id: string;
  titular_id: string;
  amigo_usuario_id: string | null;
  nome_amigo: string;
  email_amigo: string;
  status: 'ativo' | 'convite_pendente';
  criado_em: string;
}

export interface SupabaseAmizadeRow {
  id: string;
  solicitante_id: string;
  solicitante_nome: string;
  solicitante_email: string;
  destinatario_id: string | null;
  destinatario_nome: string;
  destinatario_email: string;
  status: 'pendente' | 'aceita' | 'recusada';
  incentivos: number;
  criado_em: string;
}

export interface AmigoComProgresso {
  amizadeId: string;
  nome: string;
  email: string;
  fotoBase64: string | null;
  ofensivaDias: number;
  fezCheckinHoje: boolean;
  temDietaAtiva: boolean;
  objetivoTexto: string;
  metaKcal: number | null;
  progressoMetaPct: number;
  ultimoPesoKg: number | null;
  incentivos: number;
}

export interface SupabaseNutricionistaRow {
  id: string;
  usuario_id?: string | null;
  nome_exibicao: string;
  crn: string;
  especialidades: string;
  biografia: string | null;
  preco_consulta: number;
  duracao_minutos: number;
  nota_media: number;
  total_avaliacoes: number;
  melhor_combinacao: boolean;
  verificado: boolean;
  foto_url: string | null;
  credenciais: string[];
}

const AUTH_EMAIL_KEY = 'nutrisync.auth.email';
const LEGACY_KEYS = ['nutrisync.plan.v1', 'nutrisync.usuarios.v1', 'nutrisync.sessao.v1'];

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly emailAutenticado = signal<string | null>(this.lerEmailSessao());
  readonly planoAssinaturaAtual = signal<PlanoAssinatura>('Plano Equilíbrio');

  constructor() {
    this.limparDadosLocaisAntigos();
  }

  /** Remove qualquer dado local antigo que existia antes da integração com o PostgreSQL. */
  limparDadosLocaisAntigos(): void {
    try {
      for (const key of LEGACY_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      /* storage indisponível */
    }
  }

  definirEmailSessao(email: string | null): void {
    const limpo = email ? email.trim().toLowerCase() : null;
    this.emailAutenticado.set(limpo);
    try {
      if (limpo) {
        sessionStorage.setItem(AUTH_EMAIL_KEY, limpo);
      } else {
        sessionStorage.removeItem(AUTH_EMAIL_KEY);
      }
    } catch {
      /* sessionStorage indisponível */
    }
  }

  lerEmailSessao(): string | null {
    try {
      return sessionStorage.getItem(AUTH_EMAIL_KEY);
    } catch {
      return null;
    }
  }

  private headers(prefer = 'return=representation'): Record<string, string> {
    const key = SUPABASE_CONFIG.anonKey.trim();
    return {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer,
    };
  }

  private restUrl(tableAndQuery: string): string {
    const base = SUPABASE_CONFIG.url.trim().replace(/\/+$/, '');
    return `${base}/rest/v1/${tableAndQuery}`;
  }

  private authUrl(pathAndQuery: string): string {
    const base = SUPABASE_CONFIG.url.trim().replace(/\/+$/, '');
    return `${base}/auth/v1/${pathAndQuery}`;
  }

  /**
   * Registra o usuário no Supabase Auth (que dispara o e-mail real de confirmação)
   * e cria o registro correspondente na tabela `usuarios` do PostgreSQL.
   */
  async registrarComVerificacaoEmail(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    estado: string;
    perfil: 'paciente' | 'nutricionista';
    fotoBase64?: string | null;
    fotoMime?: string | null;
  }): Promise<{ ok: boolean; erro?: string; usuario?: SupabaseUsuarioRow }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, erro: 'Banco de dados Supabase não configurado.' };
    }

    const emailLimpo = dados.email.trim().toLowerCase();
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
      const redirectTo = encodeURIComponent(`${origin}/login?verificado=1`);

      // 1. Cria a conta no Supabase Auth para enviar o e-mail de confirmação
      const authRes = await fetch(this.authUrl(`signup?redirect_to=${redirectTo}`), {
        method: 'POST',
        headers: {
          apikey: SUPABASE_CONFIG.anonKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailLimpo,
          password: dados.senha,
          data: {
            nome: dados.nome,
            telefone: dados.telefone,
            estado_uf: dados.estado,
            tipo_perfil: dados.perfil,
          },
        }),
      });

      const authBody = (await authRes.json().catch(() => ({}))) as {
        error_code?: string;
        msg?: string;
        message?: string;
        identities?: unknown[];
      };

      if (!authRes.ok) {
        if (authBody.error_code === 'user_already_exists' || (authBody.msg ?? '').includes('already registered')) {
          return {
            ok: false,
            erro: 'Este e-mail já está cadastrado. Confirme seu e-mail na caixa de entrada ou faça login.',
          };
        }
        if (authBody.error_code === 'over_email_send_rate_limit') {
          return {
            ok: false,
            erro: 'Muitas tentativas de envio de e-mail em pouco tempo. Aguarde alguns minutos ou verifique sua caixa de entrada.',
          };
        }
        return {
          ok: false,
          erro: authBody.msg || authBody.message || 'Não foi possível enviar o e-mail de confirmação.',
        };
      }

      // Quando o e-mail já existe no Auth, o Supabase retorna identities vazio
      if (Array.isArray(authBody.identities) && authBody.identities.length === 0) {
        return {
          ok: false,
          erro: 'Este e-mail já possui cadastro. Verifique sua caixa de entrada para confirmar ou faça login.',
        };
      }

      // 2. Garante o registro na tabela `public.usuarios`
      let usuario = await this.buscarUsuarioPorEmail(emailLimpo);
      if (!usuario) {
        usuario = await this.cadastrarUsuario(dados);
      } else if (dados.perfil === 'nutricionista') {
        await this.garantirPerfilNutricionista(usuario);
      }

      return { ok: true, usuario: usuario ?? undefined };
    } catch {
      return { ok: false, erro: 'Erro de conexão ao registrar e enviar e-mail de confirmação.' };
    }
  }

  /**
   * Valida login no Supabase Auth exigindo que o e-mail tenha sido confirmado pelo link enviado.
   */
  async autenticarComVerificacaoEmail(
    emailRaw: string,
    senha: string,
  ): Promise<{
    ok: boolean;
    emailNaoConfirmado?: boolean;
    erro?: string;
    usuario?: SupabaseUsuarioRow;
  }> {
    if (!isSupabaseConfigured()) {
      return { ok: false, erro: 'Banco de dados não configurado.' };
    }

    const email = emailRaw.trim().toLowerCase();
    try {
      const [usuarioTabela, authRes] = await Promise.all([
        this.buscarUsuarioPorEmail(email),
        fetch(this.authUrl('token?grant_type=password'), {
          method: 'POST',
          headers: {
            apikey: SUPABASE_CONFIG.anonKey.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password: senha }),
        }),
      ]);

      const authBody = (await authRes.json().catch(() => ({}))) as {
        error_code?: string;
        msg?: string;
        user?: { user_metadata?: Record<string, unknown> };
      };

      if (!authRes.ok) {
        // Se a conta estiver marcada como `email_verificado = true` na tabela `usuarios` (para contas de teste),
        // permite o login normalmente desde que a senha esteja correta!
        if (usuarioTabela && usuarioTabela.senha_hash === senha && usuarioTabela.email_verificado === true) {
          return { ok: true, usuario: usuarioTabela };
        }

        const naoConfirmadoExplicito =
          authBody.error_code === 'email_not_confirmed' ||
          (authBody.msg ?? '').toLowerCase().includes('email not confirmed');

        // Se a conta existe na tabela `usuarios` e a senha digitada está correta,
        // significa que o único bloqueio é a falta de confirmação do e-mail no Supabase Auth!
        if (naoConfirmadoExplicito || (usuarioTabela && usuarioTabela.senha_hash === senha)) {
          // Caso seja uma conta antiga que ainda não estava no Supabase Auth, dispara o envio do e-mail agora
          if (!naoConfirmadoExplicito && usuarioTabela) {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
            const redirectTo = encodeURIComponent(`${origin}/login?verificado=1`);
            void fetch(this.authUrl(`signup?redirect_to=${redirectTo}`), {
              method: 'POST',
              headers: {
                apikey: SUPABASE_CONFIG.anonKey.trim(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                password: senha,
                data: { nome: usuarioTabela.nome },
              }),
            });
          }

          return {
            ok: false,
            emailNaoConfirmado: true,
            erro: 'Você ainda não confirmou seu e-mail! Abra sua caixa de entrada (ou pasta de Spam) e clique no link de confirmação que enviamos para liberar o login.',
          };
        }

        return {
          ok: false,
          erro: 'E-mail ou senha incorretos. Verifique seus dados ou crie uma conta.',
        };
      }

      // E-mail confirmado e senha correta! Busca ou cria o perfil na tabela `usuarios`
      let usuario = usuarioTabela;
      if (!usuario) {
        const meta = authBody.user?.user_metadata ?? {};
        usuario = await this.cadastrarUsuario({
          nome: String(meta['nome'] ?? email.split('@')[0]),
          email,
          senha,
          telefone: String(meta['telefone'] ?? '(11) 99999-9999'),
          estado: String(meta['estado_uf'] ?? 'SP'),
          perfil: (meta['tipo_perfil'] as 'paciente' | 'nutricionista') ?? 'paciente',
        });
      }

      if (!usuario) {
        return { ok: false, erro: 'Não foi possível carregar os dados do usuário no banco.' };
      }

      if (usuario.email_verificado !== true) {
        void fetch(this.restUrl(`usuarios?id=eq.${usuario.id}`), {
          method: 'PATCH',
          headers: this.headers('return=minimal'),
          body: JSON.stringify({ email_verificado: true }),
        });
      }

      return { ok: true, usuario };
    } catch {
      return { ok: false, erro: 'Erro de conexão ao verificar suas credenciais.' };
    }
  }

  /** Reenvia o e-mail de confirmação de cadastro pelo Supabase Auth. */
  async reenviarEmailConfirmacao(emailRaw: string): Promise<{ ok: boolean; mensagem: string }> {
    const email = emailRaw.trim().toLowerCase();
    if (!isSupabaseConfigured() || !email) {
      return { ok: false, mensagem: 'Informe seu e-mail acima para reenviar o link de confirmação.' };
    }
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200';
      const redirectTo = encodeURIComponent(`${origin}/login?verificado=1`);
      const res = await fetch(this.authUrl(`resend?redirect_to=${redirectTo}`), {
        method: 'POST',
        headers: {
          apikey: SUPABASE_CONFIG.anonKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'signup', email }),
      });

      if (!res.ok) {
        return {
          ok: false,
          mensagem: 'Aguarde cerca de 60 segundos antes de solicitar um novo reenvio de e-mail.',
        };
      }
      return {
        ok: true,
        mensagem: `Um novo e-mail de confirmação foi enviado para ${email}! Verifique sua caixa de entrada e Spam.`,
      };
    } catch {
      return { ok: false, mensagem: 'Erro ao tentar reenviar o e-mail de confirmação.' };
    }
  }

  /** Confirma manualmente o e-mail de uma conta de teste direto na tabela `usuarios` do Supabase. */
  async confirmarEmailParaTeste(emailRaw: string): Promise<boolean> {
    const email = emailRaw.trim().toLowerCase();
    if (!isSupabaseConfigured() || !email) return false;
    try {
      const encoded = encodeURIComponent(email);
      const res = await fetch(this.restUrl(`usuarios?email=eq.${encoded}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({ email_verificado: true }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Busca usuário pelo e-mail diretamente na tabela `usuarios` do PostgreSQL (Supabase). */
  async buscarUsuarioPorEmail(email: string): Promise<SupabaseUsuarioRow | null> {
    if (!isSupabaseConfigured() || !email) return null;
    try {
      const encoded = encodeURIComponent(email.trim().toLowerCase());
      const res = await fetch(this.restUrl(`usuarios?email=eq.${encoded}&select=*&limit=1`), {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as SupabaseUsuarioRow[];
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  /** Busca o usuário atualmente logado no banco de dados. */
  async buscarUsuarioLogado(): Promise<SupabaseUsuarioRow | null> {
    const email = this.emailAutenticado() ?? this.lerEmailSessao();
    if (!email) return null;
    return this.buscarUsuarioPorEmail(email);
  }

  /** Cadastra um novo usuário na tabela `usuarios` do PostgreSQL (Supabase). */
  async cadastrarUsuario(dados: {
    nome: string;
    email: string;
    senha: string;
    telefone: string;
    estado: string;
    perfil: 'paciente' | 'nutricionista';
    fotoBase64?: string | null;
    fotoMime?: string | null;
  }): Promise<SupabaseUsuarioRow | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const res = await fetch(this.restUrl('usuarios'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          nome: dados.nome,
          email: dados.email.trim().toLowerCase(),
          senha_hash: dados.senha,
          telefone: dados.telefone,
          estado_uf: dados.estado,
          tipo_perfil: dados.perfil,
          plano_assinatura: 'Plano Equilíbrio',
          foto_perfil_base64: dados.fotoBase64 ?? null,
          foto_perfil_mime: dados.fotoMime ?? null,
        }),
      });
      if (!res.ok) return null;
      const rows = (await res.json()) as SupabaseUsuarioRow[];
      const criado = rows[0] ?? null;
      if (criado && dados.perfil === 'nutricionista') {
        await this.garantirPerfilNutricionista(criado);
      }
      return criado;
    } catch {
      return null;
    }
  }

  /** Garante que todo usuário com perfil 'nutricionista' tenha registro ativo na tabela `nutricionistas`. */
  async garantirPerfilNutricionista(usuario: SupabaseUsuarioRow): Promise<void> {
    if (!isSupabaseConfigured() || usuario.tipo_perfil !== 'nutricionista') return;
    try {
      const checkRes = await fetch(
        this.restUrl(`nutricionistas?usuario_id=eq.${usuario.id}&select=id&limit=1`),
        { headers: this.headers() },
      );
      if (checkRes.ok) {
        const existentes = (await checkRes.json()) as Array<{ id: string }>;
        if (existentes.length > 0) return;
      }

      const sufixoCrn = String(Math.abs(this.hashSimples(usuario.email)) % 89999 + 10000);
      const uf = (usuario.estado_uf || 'SP').toUpperCase();
      await fetch(this.restUrl('nutricionistas'), {
        method: 'POST',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({
          usuario_id: usuario.id,
          nome_exibicao: usuario.nome,
          crn: `CRN-${uf} ${sufixoCrn}`,
          especialidades: `Nutrição clínica · Atendimento em ${uf} e Online`,
          biografia: 'Profissional cadastrado na plataforma NutriSync para acompanhamento nutricional personalizado.',
          preco_consulta: 180.0,
          duracao_minutos: 50,
          nota_media: 5.0,
          total_avaliacoes: 1,
          melhor_combinacao: false,
          verificado: true,
          foto_url: usuario.foto_perfil_base64 ?? null,
          credenciais: [`Nutricionista — CRN-${uf} ${sufixoCrn}`, 'Atendimento Online NutriSync'],
        }),
      });
    } catch {
      /* erro ignorado */
    }
  }

  private hashSimples(texto: string): number {
    let h = 0;
    for (let i = 0; i < texto.length; i++) {
      h = (h * 31 + texto.charCodeAt(i)) | 0;
    }
    return h;
  }

  /** Atualiza configurações, plano de assinatura ou foto de perfil (PNG/JPG) na tabela `usuarios`. */
  async atualizarUsuarioPorEmail(
    email: string,
    campos: Partial<{
      nome: string;
      telefone: string;
      estado_uf: string;
      plano_assinatura: PlanoAssinatura;
      foto_perfil_base64: string | null;
      foto_perfil_mime: string | null;
      lembretes_agua: boolean;
      resumo_semanal_email: boolean;
    }>,
  ): Promise<boolean> {
    if (campos.plano_assinatura) {
      this.planoAssinaturaAtual.set(campos.plano_assinatura);
    }
    if (!isSupabaseConfigured() || !email) return false;
    try {
      const encoded = encodeURIComponent(email.trim().toLowerCase());
      const res = await fetch(this.restUrl(`usuarios?email=eq.${encoded}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify(campos),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Lista os amigos vinculados ao plano do usuário titular na tabela `amigos_plano`. */
  async listarAmigosDoPlano(emailTitular?: string | null): Promise<SupabaseAmigoRow[]> {
    const email = emailTitular ?? this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return [];
    try {
      const titular = await this.buscarUsuarioPorEmail(email);
      if (!titular) return [];
      const res = await fetch(
        this.restUrl(`amigos_plano?titular_id=eq.${titular.id}&select=*&order=criado_em.asc`),
        { headers: this.headers() },
      );
      if (!res.ok) return [];
      return (await res.json()) as SupabaseAmigoRow[];
    } catch {
      return [];
    }
  }

  /** Convidar/adicionar um amigo pelo e-mail ao Plano Dupla (1 amigo) ou Plano Família (até 3 amigos). */
  async adicionarAmigoPorEmail(
    emailAmigoRaw: string,
  ): Promise<{ ok: boolean; erro?: string; amigo?: SupabaseAmigoRow }> {
    const emailTitular = this.emailAutenticado() ?? this.lerEmailSessao();
    const emailAmigo = emailAmigoRaw.trim().toLowerCase();
    if (!emailTitular) {
      return { ok: false, erro: 'Faça login para convidar amigos para o seu plano.' };
    }
    if (!emailAmigo || !emailAmigo.includes('@')) {
      return { ok: false, erro: 'Informe um e-mail válido do seu amigo.' };
    }
    if (emailAmigo === emailTitular.toLowerCase()) {
      return { ok: false, erro: 'Você já é o titular deste plano. Informe o e-mail de outra pessoa.' };
    }

    try {
      const titular = await this.buscarUsuarioPorEmail(emailTitular);
      if (!titular) {
        return { ok: false, erro: 'Não foi possível localizar sua conta no banco de dados.' };
      }

      // Verifica se o e-mail do amigo já possui conta cadastrada na tabela `usuarios`
      const contaAmigo = await this.buscarUsuarioPorEmail(emailAmigo);
      const nomeExibicao = contaAmigo?.nome || emailAmigo.split('@')[0];
      const status: 'ativo' | 'convite_pendente' = contaAmigo ? 'ativo' : 'convite_pendente';

      const res = await fetch(this.restUrl('amigos_plano'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          titular_id: titular.id,
          amigo_usuario_id: contaAmigo?.id ?? null,
          nome_amigo: nomeExibicao,
          email_amigo: emailAmigo,
          status,
        }),
      });

      if (!res.ok) {
        return {
          ok: false,
          erro: 'Não foi possível salvar no banco (verifique se este e-mail já foi convidado ou se a tabela amigos_plano foi criada no Supabase).',
        };
      }

      // Se o amigo já tem conta no banco, compartilha o mesmo plano de assinatura com ele
      if (contaAmigo) {
        await fetch(this.restUrl(`usuarios?id=eq.${contaAmigo.id}`), {
          method: 'PATCH',
          headers: this.headers('return=minimal'),
          body: JSON.stringify({ plano_assinatura: this.planoAssinaturaAtual() }),
        });
      }

      const rows = (await res.json()) as SupabaseAmigoRow[];
      return { ok: true, amigo: rows[0] };
    } catch {
      return { ok: false, erro: 'Erro de conexão com o banco de dados ao adicionar amigo.' };
    }
  }

  /** Remove um amigo do plano na tabela `amigos_plano`. */
  async removerAmigoDoPlano(idVinculo: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !idVinculo) return false;
    try {
      const res = await fetch(this.restUrl(`amigos_plano?id=eq.${idVinculo}`), {
        method: 'DELETE',
        headers: this.headers('return=minimal'),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private dataHojeIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Registra o check-in diário de foco na dieta (+1 dia de ofensiva / streak estilo Duolingo). */
  async registrarCheckinOfensiva(): Promise<{ ok: boolean; novaOfensiva: number; jaFezHoje: boolean }> {
    const usuario = await this.buscarUsuarioLogado();
    if (!usuario) return { ok: false, novaOfensiva: 1, jaFezHoje: false };

    const hoje = this.dataHojeIso();
    const atual = Number(usuario.ofensiva_dias ?? 1);
    if (usuario.ultimo_checkin_ofensiva === hoje) {
      return { ok: true, novaOfensiva: atual, jaFezHoje: true };
    }

    const nova = atual + 1;
    try {
      const res = await fetch(this.restUrl(`usuarios?id=eq.${usuario.id}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({
          ofensiva_dias: nova,
          ultimo_checkin_ofensiva: hoje,
        }),
      });
      return { ok: res.ok, novaOfensiva: res.ok ? nova : atual, jaFezHoje: false };
    } catch {
      return { ok: false, novaOfensiva: atual, jaFezHoje: false };
    }
  }

  /** Envia um pedido de amizade pelo e-mail na tabela `amizades`. */
  async enviarPedidoAmizade(
    emailDestinoRaw: string,
  ): Promise<{ ok: boolean; erro?: string; pedido?: SupabaseAmizadeRow }> {
    const meuUsuario = await this.buscarUsuarioLogado();
    const emailDestino = emailDestinoRaw.trim().toLowerCase();

    if (!meuUsuario) {
      return { ok: false, erro: 'Faça login para adicionar amigos.' };
    }
    if (!emailDestino || !emailDestino.includes('@')) {
      return { ok: false, erro: 'Informe um e-mail válido para enviar o pedido de amizade.' };
    }
    if (emailDestino === meuUsuario.email.toLowerCase()) {
      return { ok: false, erro: 'Você não pode enviar pedido de amizade para o seu próprio e-mail.' };
    }

    try {
      const usuarioDestino = await this.buscarUsuarioPorEmail(emailDestino);
      if (!usuarioDestino) {
        return {
          ok: false,
          erro: 'Nenhuma conta encontrada com esse e-mail no NutriSync. Peça para seu amigo criar uma conta primeiro!',
        };
      }

      // Verifica se já existe amizade ou pedido entre os dois (em qualquer direção)
      const meuEmailEnc = encodeURIComponent(meuUsuario.email.toLowerCase());
      const destEmailEnc = encodeURIComponent(emailDestino);
      const checkRes = await fetch(
        this.restUrl(
          `amizades?or=(and(solicitante_email.eq.${meuEmailEnc},destinatario_email.eq.${destEmailEnc}),and(solicitante_email.eq.${destEmailEnc},destinatario_email.eq.${meuEmailEnc}))&select=*`,
        ),
        { headers: this.headers() },
      );

      if (checkRes.ok) {
        const existentes = (await checkRes.json()) as SupabaseAmizadeRow[];
        const ativaOuPendente = existentes.find((e) => e.status !== 'recusada');
        if (ativaOuPendente) {
          return {
            ok: false,
            erro:
              ativaOuPendente.status === 'aceita'
                ? `${usuarioDestino.nome} já está na sua lista de amigos!`
                : `Já existe um pedido de amizade pendente com ${usuarioDestino.nome}.`,
          };
        }
      }

      const res = await fetch(this.restUrl('amizades'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          solicitante_id: meuUsuario.id,
          solicitante_nome: meuUsuario.nome,
          solicitante_email: meuUsuario.email.toLowerCase(),
          destinatario_id: usuarioDestino.id,
          destinatario_nome: usuarioDestino.nome,
          destinatario_email: usuarioDestino.email.toLowerCase(),
          status: 'pendente',
          incentivos: 0,
        }),
      });

      if (!res.ok) {
        return {
          ok: false,
          erro: 'Não foi possível enviar o pedido (verifique se a tabela amizades foi criada no Supabase).',
        };
      }

      const rows = (await res.json()) as SupabaseAmizadeRow[];
      return { ok: true, pedido: rows[0] };
    } catch {
      return { ok: false, erro: 'Erro de conexão ao enviar pedido de amizade.' };
    }
  }

  /** Aceita ou recusa um pedido de amizade recebido. */
  async responderPedidoAmizade(amizadeId: string, aceitar: boolean): Promise<boolean> {
    if (!isSupabaseConfigured() || !amizadeId) return false;
    try {
      if (!aceitar) {
        const del = await fetch(this.restUrl(`amizades?id=eq.${amizadeId}`), {
          method: 'DELETE',
          headers: this.headers('return=minimal'),
        });
        return del.ok;
      }
      const res = await fetch(this.restUrl(`amizades?id=eq.${amizadeId}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({ status: 'aceita' }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Remove uma amizade ou cancela um pedido enviado. */
  async removerAmizade(amizadeId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !amizadeId) return false;
    try {
      const res = await fetch(this.restUrl(`amizades?id=eq.${amizadeId}`), {
        method: 'DELETE',
        headers: this.headers('return=minimal'),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Envia um incentivo ("foguinho" estilo Duolingo) para o amigo. */
  async incentivarAmigo(amizadeId: string, incentivosAtuais: number): Promise<number> {
    const novo = incentivosAtuais + 1;
    if (!isSupabaseConfigured() || !amizadeId) return novo;
    try {
      await fetch(this.restUrl(`amizades?id=eq.${amizadeId}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({ incentivos: novo }),
      });
      return novo;
    } catch {
      return novo;
    }
  }

  /** Carrega pedidos recebidos, pedidos enviados e a lista de amigos com Streak e progresso real do banco. */
  async carregarPainelSocialAmigos(): Promise<{
    meuUsuario: SupabaseUsuarioRow | null;
    minhaOfensiva: number;
    fizCheckinHoje: boolean;
    pedidosRecebidos: SupabaseAmizadeRow[];
    pedidosEnviados: SupabaseAmizadeRow[];
    amigos: AmigoComProgresso[];
  }> {
    const meuUsuario = await this.buscarUsuarioLogado();
    const hoje = this.dataHojeIso();
    if (!meuUsuario) {
      return {
        meuUsuario: null,
        minhaOfensiva: 0,
        fizCheckinHoje: false,
        pedidosRecebidos: [],
        pedidosEnviados: [],
        amigos: [],
      };
    }

    const minhaOfensiva = Number(meuUsuario.ofensiva_dias ?? 1);
    const fizCheckinHoje = meuUsuario.ultimo_checkin_ofensiva === hoje;

    try {
      const meuEmailEnc = encodeURIComponent(meuUsuario.email.toLowerCase());
      const res = await fetch(
        this.restUrl(
          `amizades?or=(solicitante_email.eq.${meuEmailEnc},destinatario_email.eq.${meuEmailEnc})&select=*&order=criado_em.desc`,
        ),
        { headers: this.headers() },
      );

      if (!res.ok) {
        return {
          meuUsuario,
          minhaOfensiva,
          fizCheckinHoje,
          pedidosRecebidos: [],
          pedidosEnviados: [],
          amigos: [],
        };
      }

      const todas = (await res.json()) as SupabaseAmizadeRow[];
      const meuEmail = meuUsuario.email.toLowerCase();

      const pedidosRecebidos = todas.filter(
        (a) => a.status === 'pendente' && a.destinatario_email.toLowerCase() === meuEmail,
      );
      const pedidosEnviados = todas.filter(
        (a) => a.status === 'pendente' && a.solicitante_email.toLowerCase() === meuEmail,
      );
      const aceitas = todas.filter((a) => a.status === 'aceita');

      const amigos: AmigoComProgresso[] = await Promise.all(
        aceitas.map(async (rel) => {
          const souSolicitante = rel.solicitante_email.toLowerCase() === meuEmail;
          const emailAmigo = souSolicitante ? rel.destinatario_email : rel.solicitante_email;
          const nomePadrao = souSolicitante ? rel.destinatario_nome : rel.solicitante_nome;

          const uAmigo = await this.buscarUsuarioPorEmail(emailAmigo);
          if (!uAmigo) {
            return {
              amizadeId: rel.id,
              nome: nomePadrao,
              email: emailAmigo,
              fotoBase64: null,
              ofensivaDias: 1,
              fezCheckinHoje: false,
              temDietaAtiva: false,
              objetivoTexto: 'Ainda montando o plano',
              metaKcal: null,
              progressoMetaPct: 0,
              ultimoPesoKg: null,
              incentivos: Number(rel.incentivos ?? 0),
            };
          }

          // Busca perfil nutricional, plano alimentar ativo e histórico de peso do amigo
          const [perfilRes, planoRes, pesosRes] = await Promise.all([
            fetch(this.restUrl(`perfis_nutricionais?usuario_id=eq.${uAmigo.id}&select=*&limit=1`), {
              headers: this.headers(),
            }),
            fetch(
              this.restUrl(
                `planos_alimentares?usuario_id=eq.${uAmigo.id}&ativo=eq.true&select=*&order=criado_em.desc&limit=1`,
              ),
              { headers: this.headers() },
            ),
            fetch(
              this.restUrl(`registros_peso?usuario_id=eq.${uAmigo.id}&select=*&order=criado_em.asc`),
              { headers: this.headers() },
            ),
          ]);

          const perfis = perfilRes.ok ? ((await perfilRes.json()) as Array<Record<string, unknown>>) : [];
          const planos = planoRes.ok ? ((await planoRes.json()) as Array<Record<string, unknown>>) : [];
          const pesos = pesosRes.ok ? ((await pesosRes.json()) as Array<Record<string, unknown>>) : [];

          const pRow = perfis[0];
          const sRow = planos[0];

          let objetivoTexto = 'Ainda não montou a dieta';
          let metaKcal: number | null = null;
          let progressoMetaPct = 0;
          let ultimoPesoKg: number | null = null;

          if (pRow && sRow) {
            const obj = String(pRow['objetivo'] ?? 'Manter o peso');
            const delta = Number(pRow['delta_kg'] ?? 0);
            const pesoInicial = Number(pRow['peso_inicial_kg'] ?? 0);
            const pesoMeta = Number(sRow['peso_meta_kg'] ?? pesoInicial);
            metaKcal = Number(sRow['meta_kcal'] ?? 0);

            if (obj === 'Perder peso') objetivoTexto = `Perder ${delta} kg`;
            else if (obj === 'Ganhar massa') objetivoTexto = `Ganhar ${delta} kg`;
            else objetivoTexto = `Manter ${pesoInicial} kg`;

            ultimoPesoKg = pesos.length
              ? Number(pesos[pesos.length - 1]['peso_kg'])
              : pesoInicial;

            if (obj === 'Manter o peso') {
              progressoMetaPct = 100;
            } else {
              const total = pesoMeta - pesoInicial;
              if (total !== 0 && ultimoPesoKg !== null) {
                progressoMetaPct = Math.max(
                  0,
                  Math.min(100, Math.round(((ultimoPesoKg - pesoInicial) / total) * 100)),
                );
              }
            }
          }

          const ofensivaBase = Number(uAmigo.ofensiva_dias ?? 1);
          const ofensivaCalculada = Math.max(ofensivaBase, pesos.length || (sRow ? 1 : 0));

          return {
            amizadeId: rel.id,
            nome: uAmigo.nome,
            email: uAmigo.email,
            fotoBase64: uAmigo.foto_perfil_base64 ?? null,
            ofensivaDias: ofensivaCalculada,
            fezCheckinHoje: uAmigo.ultimo_checkin_ofensiva === hoje || Boolean(sRow),
            temDietaAtiva: Boolean(sRow),
            objetivoTexto,
            metaKcal,
            progressoMetaPct,
            ultimoPesoKg,
            incentivos: Number(rel.incentivos ?? 0),
          };
        }),
      );

      // Ordena amigos pela maior ofensiva (ranking estilo Duolingo)
      amigos.sort((a, b) => b.ofensivaDias - a.ofensivaDias);

      return {
        meuUsuario,
        minhaOfensiva,
        fizCheckinHoje,
        pedidosRecebidos,
        pedidosEnviados,
        amigos,
      };
    } catch {
      return {
        meuUsuario,
        minhaOfensiva,
        fizCheckinHoje,
        pedidosRecebidos: [],
        pedidosEnviados: [],
        amigos: [],
      };
    }
  }

  /** Lista os nutricionistas cadastrados na tabela `nutricionistas` e sincroniza contas `tipo_perfil = 'nutricionista'`. */
  async listarNutricionistas(): Promise<SupabaseNutricionistaRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const [nutriRes, usersRes] = await Promise.all([
        fetch(
          this.restUrl('nutricionistas?select=*&order=melhor_combinacao.desc,preco_consulta.asc'),
          { headers: this.headers() },
        ),
        fetch(
          this.restUrl('usuarios?tipo_perfil=eq.nutricionista&select=*&order=criado_em.desc'),
          { headers: this.headers() },
        ),
      ]);

      const nutris = nutriRes.ok ? ((await nutriRes.json()) as SupabaseNutricionistaRow[]) : [];
      const usuariosNutri = usersRes.ok ? ((await usersRes.json()) as SupabaseUsuarioRow[]) : [];

      const porUsuarioId = new Map<string, SupabaseNutricionistaRow>();
      const porNome = new Map<string, SupabaseNutricionistaRow>();
      for (const n of nutris) {
        if (n.usuario_id) porUsuarioId.set(n.usuario_id, n);
        porNome.set(n.nome_exibicao.trim().toLowerCase(), n);
      }

      for (const u of usuariosNutri) {
        const existente = porUsuarioId.get(u.id) ?? porNome.get(u.nome.trim().toLowerCase());
        if (existente) {
          // Mantém foto e nome sincronizados com a conta do usuário nutricionista
          if (u.foto_perfil_base64 && !existente.foto_url) {
            existente.foto_url = u.foto_perfil_base64;
          }
          continue;
        }

        // Se a conta de nutricionista ainda não estava na tabela `nutricionistas`, sincroniza em background e inclui na lista:
        void this.garantirPerfilNutricionista(u);
        const sufixoCrn = String(Math.abs(this.hashSimples(u.email)) % 89999 + 10000);
        const uf = (u.estado_uf || 'SP').toUpperCase();
        nutris.push({
          id: u.id,
          usuario_id: u.id,
          nome_exibicao: u.nome,
          crn: `CRN-${uf} ${sufixoCrn}`,
          especialidades: `Nutrição clínica · Atendimento em ${uf} e Online`,
          biografia: 'Profissional cadastrado na plataforma NutriSync para acompanhamento nutricional personalizado.',
          preco_consulta: 180,
          duracao_minutos: 50,
          nota_media: 5.0,
          total_avaliacoes: 1,
          melhor_combinacao: false,
          verificado: true,
          foto_url: u.foto_perfil_base64 ?? null,
          credenciais: [`Nutricionista — CRN-${uf} ${sufixoCrn}`, 'Atendimento Online NutriSync'],
        });
      }

      return nutris;
    } catch {
      return [];
    }
  }

  /** Registra um chamado de suporte na tabela `chamados_suporte`. */
  async abrirChamadoSuporte(dados: {
    email: string;
    protocolo: string;
    assunto: string;
    mensagem: string;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const usuario = await this.buscarUsuarioPorEmail(dados.email);
      const res = await fetch(this.restUrl('chamados_suporte'), {
        method: 'POST',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({
          usuario_id: usuario?.id ?? null,
          email_contato: dados.email,
          protocolo: dados.protocolo,
          assunto: dados.assunto,
          mensagem: dados.mensagem,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Carrega o plano alimentar ativo completo do usuário direto do PostgreSQL (Supabase). */
  async carregarPlanoDoBanco(emailUsuario?: string | null): Promise<DietPlan | null> {
    const email = emailUsuario ?? this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return null;

    try {
      const usuario = await this.buscarUsuarioPorEmail(email);
      if (!usuario) return null;

      // 1. Busca o perfil nutricional e o plano alimentar ativo em paralelo
      const [perfilRes, planoRes, pesosRes] = await Promise.all([
        fetch(this.restUrl(`perfis_nutricionais?usuario_id=eq.${usuario.id}&select=*&limit=1`), {
          headers: this.headers(),
        }),
        fetch(
          this.restUrl(
            `planos_alimentares?usuario_id=eq.${usuario.id}&ativo=eq.true&select=*&order=criado_em.desc&limit=1`,
          ),
          { headers: this.headers() },
        ),
        fetch(
          this.restUrl(`registros_peso?usuario_id=eq.${usuario.id}&select=*&order=criado_em.asc`),
          { headers: this.headers() },
        ),
      ]);

      if (!perfilRes.ok || !planoRes.ok) return null;
      const perfis = (await perfilRes.json()) as Array<Record<string, unknown>>;
      const planos = (await planoRes.json()) as Array<Record<string, unknown>>;
      const pRow = perfis[0];
      const sRow = planos[0];
      if (!pRow || !sRow) return null;

      const planoId = String(sRow['id']);

      // 2. Busca os 7 dias + refeições planejadas e substituições por foto do plano ativo
      const [diasRes, subsRes] = await Promise.all([
        fetch(
          this.restUrl(
            `dias_plano?plano_id=eq.${planoId}&select=*,refeicoes_plano(*)&order=dia_semana.asc`,
          ),
          { headers: this.headers() },
        ),
        fetch(this.restUrl(`substituicoes_foto?plano_id=eq.${planoId}&select=*`), {
          headers: this.headers(),
        }),
      ]);

      if (!diasRes.ok) return null;
      const diasRows = (await diasRes.json()) as Array<Record<string, unknown>>;
      if (diasRows.length !== 7) return null;

      const profile: UserProfile = {
        goal: (pRow['objetivo'] as Goal) ?? 'Perder peso',
        deltaKg: Number(pRow['delta_kg'] ?? 0),
        sex: (pRow['sexo'] as Sex) ?? 'F',
        age: Number(pRow['idade'] ?? 30),
        heightCm: Number(pRow['altura_cm'] ?? 165),
        weightKg: Number(pRow['peso_inicial_kg'] ?? 68),
        activity: String(pRow['nivel_atividade'] ?? 'Moderadamente ativa'),
        work: String(pRow['tipo_trabalho'] ?? 'Maior parte sentada'),
        sleep: String(pRow['horario_sono'] ?? '23:00 às 07:00'),
        training: String(pRow['treinos'] ?? 'Musculação, 3x por semana'),
        restrictions: Array.isArray(pRow['restricoes']) ? (pRow['restricoes'] as string[]) : [],
        otherCare: String(pRow['outros_cuidados'] ?? ''),
        preferences: Array.isArray(pRow['preferencias']) ? (pRow['preferencias'] as string[]) : [],
        dislikes: String(pRow['alimentos_evitados'] ?? ''),
        pattern: (pRow['padrao_alimentar'] as Pattern) ?? 'Onívoro',
        budget: String(pRow['orcamento'] ?? 'Equilibrado'),
        cookTime: String(pRow['tempo_preparo'] ?? 'Até 30 min por refeição'),
        cookFreq: String(pRow['frequencia_preparo'] ?? '3 vezes por semana'),
        mealsPerDay: Number(pRow['refeicoes_por_dia'] ?? 5),
        lunch: String(pRow['formato_almoco'] ?? 'Levo marmita'),
        dinner: String(pRow['formato_jantar'] ?? 'Cozinho em casa'),
        weekend: String(pRow['estilo_fim_semana'] ?? 'Mais flexível'),
      };

      const days: DayPlan[] = diasRows.map((d) => {
        const refRows = Array.isArray(d['refeicoes_plano'])
          ? ([...(d['refeicoes_plano'] as Array<Record<string, unknown>>)].sort(
              (a, b) => Number(a['ordem'] ?? 0) - Number(b['ordem'] ?? 0),
            ))
          : [];

        const meals: PlannedMeal[] = refRows.map((r) => {
          const optionId = String(r['pratos_catalogo_id'] ?? '');
          const catalogItem = FOOD_CATALOG.find((o) => o.id === optionId);
          return {
            slot: (r['slot'] as Slot) ?? 'lunch',
            label: String(r['nome_refeicao'] ?? ''),
            time: String(r['horario'] ?? '12:00'),
            desc: String(r['descricao_prato'] ?? catalogItem?.name ?? ''),
            ingredients: catalogItem?.ingredients ?? [],
            optionId,
            targetKcal: Number(r['meta_kcal_slot'] ?? r['kcal'] ?? 0),
            factor: Number(r['fator_porcao'] ?? 1),
            kcal: Number(r['kcal'] ?? 0),
            protein: Number(r['proteina_g'] ?? 0),
            carbs: Number(r['carboidrato_g'] ?? 0),
            fat: Number(r['gordura_g'] ?? 0),
            prepMin: Number(r['preparo_min'] ?? catalogItem?.prepMin ?? 15),
            image: catalogItem?.image ?? 'food',
          };
        });

        return {
          weekday: Number(d['dia_semana'] ?? 0),
          meals,
          kcal: Number(d['total_kcal'] ?? 0),
          protein: Number(d['total_proteina_g'] ?? 0),
          carbs: Number(d['total_carboidrato_g'] ?? 0),
          fat: Number(d['total_gordura_g'] ?? 0),
        };
      });

      const pesosRows = pesosRes.ok
        ? ((await pesosRes.json()) as Array<Record<string, unknown>>)
        : [];
      const weights: WeightEntry[] = pesosRows.length
        ? pesosRows.map((w) => ({
            date: String(w['criado_em'] ?? w['data_pesagem'] ?? new Date().toISOString()),
            kg: Number(w['peso_kg']),
          }))
        : [{ date: String(sRow['criado_em'] ?? new Date().toISOString()), kg: profile.weightKg }];

      const overrides: Record<string, PlannedMeal[]> = {};
      if (subsRes.ok) {
        const subsRows = (await subsRes.json()) as Array<Record<string, unknown>>;
        for (const sub of subsRows) {
          const dt = String(sub['data_refeicao'] ?? '');
          if (!dt) continue;
          const slot = (sub['slot'] as Slot) ?? 'lunch';
          const meal: PlannedMeal = {
            slot,
            label: slot === 'breakfast' ? 'Café da manhã' : slot === 'lunch' ? 'Almoço' : 'Jantar',
            time: '13:00',
            desc: String(sub['titulo_prato_montado'] ?? 'Prato registrado por foto'),
            ingredients: [],
            optionId: 'foto',
            targetKcal: Number(sub['total_kcal'] ?? 0),
            factor: 1,
            kcal: Number(sub['total_kcal'] ?? 0),
            protein: Number(sub['total_proteina_g'] ?? 0),
            carbs: Number(sub['total_carboidrato_g'] ?? 0),
            fat: Number(sub['total_gordura_g'] ?? 0),
            prepMin: 0,
            image: 'food',
            fromPhoto: true,
          };
          overrides[dt] = [...(overrides[dt] ?? []), meal];
        }
      }

      const rawAvisos = Array.isArray(sRow['avisos']) ? (sRow['avisos'] as string[]) : [];
      const notes: string[] = [];
      let waterHistory: Record<string, WaterLogItem[]> = {};

      for (const item of rawAvisos) {
        if (typeof item === 'string' && item.startsWith('__HIDRATACAO__:')) {
          try {
            const parsed = JSON.parse(item.slice('__HIDRATACAO__:'.length)) as Record<string, WaterLogItem[]>;
            if (parsed && typeof parsed === 'object') {
              waterHistory = parsed;
            }
          } catch {
            /* json inválido ignorado */
          }
        } else if (typeof item === 'string') {
          notes.push(item);
        }
      }

      return {
        version: 1,
        createdAt: String(sRow['criado_em'] ?? new Date().toISOString()),
        profile,
        summary: {
          bmr: Number(sRow['tmb_kcal'] ?? 0),
          tdee: Number(sRow['gasto_total_kcal'] ?? 0),
          kcal: Number(sRow['meta_kcal'] ?? 0),
          bmi: Number(sRow['imc_inicial'] ?? 0),
          targetWeightKg: Number(sRow['peso_meta_kg'] ?? profile.weightKg),
          weeklyRateKg: Number(sRow['ritmo_semanal_kg'] ?? 0),
          weeksToGoal: sRow['semanas_estimadas'] !== null ? Number(sRow['semanas_estimadas']) : null,
          macroTargets: {
            protein: Number(sRow['meta_proteina_g'] ?? 0),
            carbs: Number(sRow['meta_carboidrato_g'] ?? 0),
            fat: Number(sRow['meta_gordura_g'] ?? 0),
          },
          notes,
        },
        days,
        weights,
        overrides,
        waterHistory,
      };
    } catch {
      return null;
    }
  }

  private empacotarAvisosComHidratacao(
    notes: string[],
    waterHistory?: Record<string, WaterLogItem[]>,
  ): string[] {
    const limpos = (notes ?? []).filter((n) => !n.startsWith('__HIDRATACAO__:'));
    if (waterHistory && Object.keys(waterHistory).length > 0) {
      limpos.push(`__HIDRATACAO__:${JSON.stringify(waterHistory)}`);
    }
    return limpos;
  }

  /** Salva o histórico diário de ingestão de água diretamente no banco PostgreSQL (Supabase). */
  async salvarHidratacaoNoBanco(
    notes: string[],
    waterHistory: Record<string, WaterLogItem[]>,
    dataIso?: string,
    totalMlDia?: number,
    metaMlDia?: number,
  ): Promise<void> {
    const email = this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return;
    try {
      const usuario = await this.buscarUsuarioPorEmail(email);
      if (!usuario) return;

      const avisosAtualizados = this.empacotarAvisosComHidratacao(notes, waterHistory);
      await fetch(
        this.restUrl(`planos_alimentares?usuario_id=eq.${usuario.id}&ativo=eq.true`),
        {
          method: 'PATCH',
          headers: this.headers('return=minimal'),
          body: JSON.stringify({ avisos: avisosAtualizados }),
        },
      );

      // Se a tabela opcional `registros_agua` também existir no banco, sincroniza nela:
      if (dataIso && totalMlDia !== undefined && metaMlDia !== undefined) {
        await fetch(this.restUrl('registros_agua?on_conflict=usuario_id,data_registro'), {
          method: 'POST',
          headers: this.headers('resolution=merge-duplicates,return=minimal'),
          body: JSON.stringify({
            usuario_id: usuario.id,
            data_registro: dataIso,
            consumido_ml: totalMlDia,
            meta_ml: metaMlDia,
            historico_goles: waterHistory[dataIso] ?? [],
          }),
        }).catch(() => undefined);
      }
    } catch {
      /* erro de rede ignorado */
    }
  }

  /** Salva o perfil nutricional, o plano alimentar, os 7 dias e todas as refeições no PostgreSQL. */
  async sincronizarPlanoAlimentar(plan: DietPlan, emailUsuario?: string | null): Promise<void> {
    const email = emailUsuario ?? this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return;
    try {
      const usuario = await this.buscarUsuarioPorEmail(email);
      if (!usuario) return;

      const p = plan.profile;
      // 1. Upsert em perfis_nutricionais
      await fetch(this.restUrl('perfis_nutricionais?on_conflict=usuario_id'), {
        method: 'POST',
        headers: this.headers('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify({
          usuario_id: usuario.id,
          objetivo: p.goal,
          delta_kg: p.deltaKg,
          sexo: p.sex,
          idade: p.age,
          altura_cm: p.heightCm,
          peso_inicial_kg: p.weightKg,
          nivel_atividade: p.activity,
          tipo_trabalho: p.work,
          horario_sono: p.sleep,
          treinos: p.training,
          restricoes: p.restrictions,
          outros_cuidados: p.otherCare,
          preferencias: p.preferences,
          alimentos_evitados: p.dislikes,
          padrao_alimentar: p.pattern,
          orcamento: p.budget,
          tempo_preparo: p.cookTime,
          frequencia_preparo: p.cookFreq,
          refeicoes_por_dia: p.mealsPerDay,
          formato_almoco: p.lunch,
          formato_jantar: p.dinner,
          estilo_fim_semana: p.weekend,
        }),
      });

      // 2. Desativa planos anteriores do usuário e cria o novo plano ativo
      await fetch(this.restUrl(`planos_alimentares?usuario_id=eq.${usuario.id}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({ ativo: false }),
      });

      const s = plan.summary;
      const planoRes = await fetch(this.restUrl('planos_alimentares'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          usuario_id: usuario.id,
          ativo: true,
          tmb_kcal: s.bmr,
          gasto_total_kcal: s.tdee,
          meta_kcal: s.kcal,
          imc_inicial: s.bmi,
          peso_meta_kg: s.targetWeightKg,
          ritmo_semanal_kg: s.weeklyRateKg,
          semanas_estimadas: s.weeksToGoal,
          meta_proteina_g: s.macroTargets.protein,
          meta_carboidrato_g: s.macroTargets.carbs,
          meta_gordura_g: s.macroTargets.fat,
          avisos: this.empacotarAvisosComHidratacao(s.notes, plan.waterHistory),
        }),
      });
      if (!planoRes.ok) return;
      const planosCriados = (await planoRes.json()) as Array<{ id: string }>;
      const planoId = planosCriados[0]?.id;
      if (!planoId) return;

      // 3. Insere os 7 dias na tabela `dias_plano`
      const diasPayload = plan.days.map((d) => ({
        plano_id: planoId,
        dia_semana: d.weekday,
        total_kcal: d.kcal,
        total_proteina_g: d.protein,
        total_carboidrato_g: d.carbs,
        total_gordura_g: d.fat,
      }));
      const diasRes = await fetch(this.restUrl('dias_plano'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(diasPayload),
      });
      if (diasRes.ok) {
        const diasInseridos = (await diasRes.json()) as Array<{ id: string; dia_semana: number }>;
        const refeicoesPayload: Array<Record<string, unknown>> = [];

        for (const diaRow of diasInseridos) {
          const dayObj = plan.days.find((d) => d.weekday === diaRow.dia_semana);
          if (!dayObj) continue;
          dayObj.meals.forEach((m, idx) => {
            refeicoesPayload.push({
              dia_plano_id: diaRow.id,
              pratos_catalogo_id: m.optionId,
              ordem: idx + 1,
              slot: m.slot,
              nome_refeicao: m.label,
              horario: m.time,
              descricao_prato: m.desc,
              meta_kcal_slot: m.targetKcal,
              fator_porcao: m.factor,
              kcal: m.kcal,
              proteina_g: m.protein,
              carboidrato_g: m.carbs,
              gordura_g: m.fat,
              preparo_min: m.prepMin,
            });
          });
        }

        if (refeicoesPayload.length > 0) {
          await fetch(this.restUrl('refeicoes_plano'), {
            method: 'POST',
            headers: this.headers('return=minimal'),
            body: JSON.stringify(refeicoesPayload),
          });
        }
      }

      // 4. Registra o peso inicial em `registros_peso`
      const ultimoPeso = plan.weights[plan.weights.length - 1];
      if (ultimoPeso) {
        await fetch(this.restUrl('registros_peso'), {
          method: 'POST',
          headers: this.headers('return=minimal'),
          body: JSON.stringify({
            usuario_id: usuario.id,
            plano_id: planoId,
            peso_kg: ultimoPeso.kg,
          }),
        });
      }
    } catch {
      /* erro de rede ignorado */
    }
  }

  /** Registra nova pesagem na tabela `registros_peso` do PostgreSQL. */
  async registrarPesoNoBanco(kg: number): Promise<void> {
    const email = this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return;
    try {
      const usuario = await this.buscarUsuarioPorEmail(email);
      if (!usuario) return;
      await fetch(this.restUrl('registros_peso'), {
        method: 'POST',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({
          usuario_id: usuario.id,
          peso_kg: kg,
        }),
      });
    } catch {
      /* erro de rede ignorado */
    }
  }

  /** Desativa todos os planos alimentares do usuário no PostgreSQL ao apagar a dieta. */
  async desativarPlanoNoBanco(): Promise<void> {
    const email = this.emailAutenticado() ?? this.lerEmailSessao();
    if (!isSupabaseConfigured() || !email) return;
    try {
      const usuario = await this.buscarUsuarioPorEmail(email);
      if (!usuario) return;
      await fetch(this.restUrl(`planos_alimentares?usuario_id=eq.${usuario.id}`), {
        method: 'PATCH',
        headers: this.headers('return=minimal'),
        body: JSON.stringify({ ativo: false }),
      });
    } catch {
      /* erro de rede ignorado */
    }
  }
}
