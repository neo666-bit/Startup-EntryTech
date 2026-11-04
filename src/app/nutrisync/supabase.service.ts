import { Injectable, signal } from '@angular/core';
import { FOOD_CATALOG } from './food-catalog';
import { DayPlan, DietPlan, Goal, Pattern, PlannedMeal, Sex, Slot, UserProfile, WeightEntry } from './models';
import { isSupabaseConfigured, SUPABASE_CONFIG } from './supabase.config';

export interface SupabaseUsuarioRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
  telefone: string | null;
  estado_uf: string;
  tipo_perfil: 'paciente' | 'nutricionista';
  plano_assinatura: 'Essencial' | 'Plano Equilíbrio' | 'Plano Acompanhamento';
  foto_perfil_base64: string | null;
  foto_perfil_mime?: string | null;
  lembretes_agua: boolean;
  resumo_semanal_email: boolean;
}

export interface SupabaseNutricionistaRow {
  id: string;
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
      return rows[0] ?? null;
    } catch {
      return null;
    }
  }

  /** Atualiza configurações, plano de assinatura ou foto de perfil (PNG/JPG) na tabela `usuarios`. */
  async atualizarUsuarioPorEmail(
    email: string,
    campos: Partial<{
      nome: string;
      telefone: string;
      estado_uf: string;
      plano_assinatura: 'Essencial' | 'Plano Equilíbrio' | 'Plano Acompanhamento';
      foto_perfil_base64: string | null;
      foto_perfil_mime: string | null;
      lembretes_agua: boolean;
      resumo_semanal_email: boolean;
    }>,
  ): Promise<boolean> {
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

  /** Lista os nutricionistas cadastrados na tabela `nutricionistas` do PostgreSQL. */
  async listarNutricionistas(): Promise<SupabaseNutricionistaRow[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const res = await fetch(
        this.restUrl('nutricionistas?select=*&order=melhor_combinacao.desc,preco_consulta.asc'),
        { headers: this.headers() },
      );
      if (!res.ok) return [];
      return (await res.json()) as SupabaseNutricionistaRow[];
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
          notes: Array.isArray(sRow['avisos']) ? (sRow['avisos'] as string[]) : [],
        },
        days,
        weights,
        overrides,
      };
    } catch {
      return null;
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
          avisos: s.notes,
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
