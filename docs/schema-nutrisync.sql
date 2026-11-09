-- =============================================================================
-- NUTRISYNC — SCRIPT DE CRIAÇÃO DO BANCO DE DADOS (PostgreSQL 14+)
-- Projeto Startup — Centro Universitário Facens
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABELA DE USUÁRIOS (Login e Cadastro)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(25),
    estado_uf CHAR(2) NOT NULL DEFAULT 'SP',
    tipo_perfil VARCHAR(20) NOT NULL DEFAULT 'paciente'
        CHECK (tipo_perfil IN ('paciente', 'nutricionista')),
    plano_assinatura VARCHAR(30) NOT NULL DEFAULT 'Plano Equilíbrio'
        CHECK (plano_assinatura IN ('Essencial', 'Plano Equilíbrio', 'Plano Dupla', 'Plano Família')),
    -- A foto é enviada do aparelho do usuário (upload de arquivo) e salva direto no banco
    -- (em Base64 ou binário BYTEA), sem que a pessoa precise digitar nenhuma URL:
    foto_perfil_base64 TEXT,
    foto_perfil_binario BYTEA,
    foto_perfil_mime VARCHAR(40),
    lembretes_agua BOOLEAN NOT NULL DEFAULT TRUE,
    resumo_semanal_email BOOLEAN NOT NULL DEFAULT TRUE,
    email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
    ofensiva_dias INTEGER NOT NULL DEFAULT 1,
    ultimo_checkin_ofensiva DATE DEFAULT CURRENT_DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (LOWER(email));

-- -----------------------------------------------------------------------------
-- 2. TABELA DE PERFIS NUTRICIONAIS (Questionário / Montar Dieta - Etapas 1 a 4)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfis_nutricionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    objetivo VARCHAR(30) NOT NULL
        CHECK (objetivo IN ('Perder peso', 'Manter o peso', 'Ganhar massa')),
    delta_kg NUMERIC(4,1) NOT NULL DEFAULT 0,
    sexo CHAR(1) NOT NULL CHECK (sexo IN ('F', 'M')),
    idade SMALLINT NOT NULL CHECK (idade BETWEEN 18 AND 100),
    altura_cm NUMERIC(5,1) NOT NULL CHECK (altura_cm BETWEEN 120 AND 230),
    peso_inicial_kg NUMERIC(5,2) NOT NULL CHECK (peso_inicial_kg BETWEEN 30 AND 300),
    nivel_atividade VARCHAR(40) NOT NULL,
    tipo_trabalho VARCHAR(40) NOT NULL,
    horario_sono VARCHAR(30) NOT NULL,
    treinos VARCHAR(60) NOT NULL,
    restricoes JSONB NOT NULL DEFAULT '[]'::jsonb,
    outros_cuidados TEXT NOT NULL DEFAULT '',
    preferencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    alimentos_evitados TEXT NOT NULL DEFAULT '',
    padrao_alimentar VARCHAR(20) NOT NULL DEFAULT 'Onívoro'
        CHECK (padrao_alimentar IN ('Onívoro', 'Vegetariano', 'Vegano')),
    orcamento VARCHAR(20) NOT NULL DEFAULT 'Equilibrado'
        CHECK (orcamento IN ('Econômico', 'Equilibrado', 'Flexível')),
    tempo_preparo VARCHAR(40) NOT NULL,
    frequencia_preparo VARCHAR(40) NOT NULL,
    refeicoes_por_dia SMALLINT NOT NULL CHECK (refeicoes_por_dia BETWEEN 3 AND 6),
    formato_almoco VARCHAR(30) NOT NULL,
    formato_jantar VARCHAR(30) NOT NULL,
    estilo_fim_semana VARCHAR(30) NOT NULL,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. CATÁLOGO DE PRATOS E BLOCO DE NOTAS DE RECEITAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pratos_catalogo (
    id VARCHAR(60) PRIMARY KEY,
    titulo VARCHAR(180) NOT NULL,
    termo_busca_externo VARCHAR(120),
    kcal_base INTEGER NOT NULL CHECK (kcal_base > 0),
    proteina_base_g SMALLINT NOT NULL CHECK (proteina_base_g >= 0),
    carboidrato_base_g SMALLINT NOT NULL CHECK (carboidrato_base_g >= 0),
    gordura_base_g SMALLINT NOT NULL CHECK (gordura_base_g >= 0),
    preparo_min SMALLINT NOT NULL CHECK (preparo_min >= 0),
    custo VARCHAR(10) NOT NULL CHECK (custo IN ('low', 'mid', 'high')),
    aceita_marmita BOOLEAN NOT NULL DEFAULT FALSE,
    tipo_imagem VARCHAR(15) NOT NULL DEFAULT 'food' CHECK (tipo_imagem IN ('food', 'salad')),
    slots_permitidos JSONB NOT NULL DEFAULT '[]'::jsonb,
    flags_alergenos JSONB NOT NULL DEFAULT '[]'::jsonb,
    dica_preparo TEXT
);

CREATE TABLE IF NOT EXISTS receita_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prato_id VARCHAR(60) NOT NULL REFERENCES pratos_catalogo(id) ON DELETE CASCADE,
    ordem SMALLINT NOT NULL,
    quantidade_base NUMERIC(6,2), -- NULL = "a gosto"
    unidade VARCHAR(30) NOT NULL,
    nome_singular_plural VARCHAR(120) NOT NULL,
    UNIQUE (prato_id, ordem)
);

CREATE TABLE IF NOT EXISTS receita_passos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prato_id VARCHAR(60) NOT NULL REFERENCES pratos_catalogo(id) ON DELETE CASCADE,
    numero_passo SMALLINT NOT NULL,
    instrucao TEXT NOT NULL,
    UNIQUE (prato_id, numero_passo)
);

-- -----------------------------------------------------------------------------
-- 4. PLANOS ALIMENTARES, DIAS DA SEMANA E REFEIÇÕES PLANEJADAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS planos_alimentares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    tmb_kcal INTEGER NOT NULL,
    gasto_total_kcal INTEGER NOT NULL,
    meta_kcal INTEGER NOT NULL,
    imc_inicial NUMERIC(4,1) NOT NULL,
    peso_meta_kg NUMERIC(5,2) NOT NULL,
    ritmo_semanal_kg NUMERIC(4,2) NOT NULL DEFAULT 0,
    semanas_estimadas SMALLINT,
    meta_proteina_g SMALLINT NOT NULL,
    meta_carboidrato_g SMALLINT NOT NULL,
    meta_gordura_g SMALLINT NOT NULL,
    avisos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planos_usuario_ativo ON planos_alimentares (usuario_id, ativo);

CREATE TABLE IF NOT EXISTS dias_plano (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plano_id UUID NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom ... 6=Sab
    total_kcal INTEGER NOT NULL,
    total_proteina_g SMALLINT NOT NULL,
    total_carboidrato_g SMALLINT NOT NULL,
    total_gordura_g SMALLINT NOT NULL,
    UNIQUE (plano_id, dia_semana)
);

CREATE TABLE IF NOT EXISTS refeicoes_plano (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia_plano_id UUID NOT NULL REFERENCES dias_plano(id) ON DELETE CASCADE,
    pratos_catalogo_id VARCHAR(60) NOT NULL REFERENCES pratos_catalogo(id),
    ordem SMALLINT NOT NULL,
    slot VARCHAR(20) NOT NULL
        CHECK (slot IN ('breakfast', 'snackAm', 'lunch', 'snackPm', 'dinner', 'supper')),
    nome_refeicao VARCHAR(40) NOT NULL,
    horario CHAR(5) NOT NULL,
    descricao_prato VARCHAR(200) NOT NULL,
    meta_kcal_slot INTEGER NOT NULL,
    fator_porcao NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    kcal INTEGER NOT NULL,
    proteina_g SMALLINT NOT NULL,
    carboidrato_g SMALLINT NOT NULL,
    gordura_g SMALLINT NOT NULL,
    preparo_min SMALLINT NOT NULL,
    UNIQUE (dia_plano_id, slot)
);

-- -----------------------------------------------------------------------------
-- 5. ANÁLISE POR FOTO (Substituição pontual para a data escolhida)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS substituicoes_foto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plano_id UUID NOT NULL REFERENCES planos_alimentares(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data_refeicao DATE NOT NULL DEFAULT CURRENT_DATE,
    slot VARCHAR(20) NOT NULL
        CHECK (slot IN ('breakfast', 'snackAm', 'lunch', 'snackPm', 'dinner', 'supper')),
    -- Arquivo de imagem enviado pela câmera/galeria do aparelho:
    nome_arquivo_foto VARCHAR(140),
    foto_prato_base64 TEXT,
    foto_prato_binario BYTEA,
    titulo_prato_montado VARCHAR(200) NOT NULL,
    total_kcal INTEGER NOT NULL,
    total_proteina_g SMALLINT NOT NULL,
    total_carboidrato_g SMALLINT NOT NULL,
    total_gordura_g SMALLINT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plano_id, data_refeicao, slot)
);

CREATE TABLE IF NOT EXISTS itens_prato_foto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    substituicao_foto_id UUID NOT NULL REFERENCES substituicoes_foto(id) ON DELETE CASCADE,
    alimento_codigo VARCHAR(40) NOT NULL,
    nome_alimento VARCHAR(80) NOT NULL,
    quantidade_gramas SMALLINT NOT NULL CHECK (quantidade_gramas BETWEEN 1 AND 2000),
    kcal_calculada INTEGER NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. PROGESSO E HISTÓRICO DE PESO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_peso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plano_id UUID REFERENCES planos_alimentares(id) ON DELETE SET NULL,
    data_pesagem DATE NOT NULL DEFAULT CURRENT_DATE,
    peso_kg NUMERIC(5,2) NOT NULL CHECK (peso_kg BETWEEN 30 AND 300),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_peso_usuario_data ON registros_peso (usuario_id, data_pesagem DESC);

-- -----------------------------------------------------------------------------
-- 7. NUTRICIONISTAS E AGENDAMENTO DE CONSULTAS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutricionistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_exibicao VARCHAR(120) NOT NULL,
    crn VARCHAR(30) NOT NULL UNIQUE,
    especialidades VARCHAR(160) NOT NULL,
    biografia TEXT,
    preco_consulta NUMERIC(8,2) NOT NULL,
    duracao_minutos SMALLINT NOT NULL DEFAULT 50,
    nota_media NUMERIC(2,1) NOT NULL DEFAULT 4.9,
    total_avaliacoes INTEGER NOT NULL DEFAULT 128,
    melhor_combinacao BOOLEAN NOT NULL DEFAULT FALSE,
    verificado BOOLEAN NOT NULL DEFAULT TRUE,
    foto_url TEXT,
    credenciais JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS consultas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nutricionista_id UUID NOT NULL REFERENCES nutricionistas(id) ON DELETE RESTRICT,
    plano_id UUID REFERENCES planos_alimentares(id) ON DELETE SET NULL,
    data_consulta DATE NOT NULL,
    horario_inicio CHAR(5) NOT NULL,
    modalidade VARCHAR(20) NOT NULL DEFAULT 'Online',
    valor NUMERIC(8,2) NOT NULL,
    motivo_principal VARCHAR(140) NOT NULL,
    compartilhar_plano BOOLEAN NOT NULL DEFAULT TRUE,
    compartilhar_perfil BOOLEAN NOT NULL DEFAULT TRUE,
    compartilhar_progresso BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmada'
        CHECK (status IN ('solicitada', 'confirmada', 'realizada', 'cancelada')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. CARGA INICIAL (SEEDS DOS NUTRICIONISTAS DO DIRETÓRIO)
-- -----------------------------------------------------------------------------
INSERT INTO nutricionistas (nome_exibicao, crn, especialidades, biografia, preco_consulta, melhor_combinacao, credenciais)
VALUES
(
    'Dra. Marina Costa',
    'CRN-3 58721',
    'Emagrecimento sustentável · Comportamental',
    'Acredito em uma nutrição que respeita sua história, seus afetos e a comida possível.',
    189.00,
    TRUE,
    '["Nutrição — USP, 2017", "Pós em Comportamento Alimentar", "Especialização em Saúde da Mulher", "Membro da ASBRAN"]'::jsonb
),
(
    'Dr. Rafael Nogueira',
    'CRN-3 61204',
    'Nutrição esportiva · Hipertrofia',
    'Planejamento nutricional voltado para performance, hipertrofia e rotina de treinos.',
    210.00,
    FALSE,
    '["Nutrição — UNICAMP, 2018", "Pós em Nutrição Esportiva"]'::jsonb
),
(
    'Dra. Camila Azevedo',
    'CRN-3 54910',
    'Saúde da mulher · Intolerâncias',
    'Cuidado especializado em intolerâncias alimentares, saúde intestinal e rotina feminina.',
    175.00,
    FALSE,
    '["Nutrição — UNESP, 2016", "Especialização em Alergias e Intolerâncias"]'::jsonb
)
ON CONFLICT (crn) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. CHAMADOS DE SUPORTE (Abertos pelo menu do usuário no cabeçalho)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chamados_suporte (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    email_contato VARCHAR(160) NOT NULL,
    protocolo VARCHAR(20) NOT NULL UNIQUE,
    assunto VARCHAR(140) NOT NULL,
    mensagem TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberto'
        CHECK (status IN ('aberto', 'em_atendimento', 'resolvido')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. AMIGOS CONVIDADOS DO PLANO (Plano Dupla: 1 amigo | Plano Família: até 3 amigos)
--     Gerenciado dentro do modal de Configurações da conta
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amigos_plano (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titular_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    amigo_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nome_amigo VARCHAR(120) NOT NULL,
    email_amigo VARCHAR(160) NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'ativo'
        CHECK (status IN ('ativo', 'convite_pendente')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (titular_id, email_amigo)
);

-- -----------------------------------------------------------------------------
-- 11. AMIZADES E STREAK / OFENSIVA (Aba Amigos — pedidos, aceites e progresso)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amizades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    solicitante_nome VARCHAR(120) NOT NULL,
    solicitante_email VARCHAR(160) NOT NULL,
    destinatario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_nome VARCHAR(120) NOT NULL,
    destinatario_email VARCHAR(160) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'aceita', 'recusada')),
    incentivos INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (solicitante_email, destinatario_email)
);

-- -----------------------------------------------------------------------------
-- 12. PERMISSÕES E DESATIVAÇÃO DE RLS PARA USO DIRETO COM A API DO SUPABASE
-- -----------------------------------------------------------------------------
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_nutricionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE pratos_catalogo DISABLE ROW LEVEL SECURITY;
ALTER TABLE receita_ingredientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE receita_passos DISABLE ROW LEVEL SECURITY;
ALTER TABLE planos_alimentares DISABLE ROW LEVEL SECURITY;
ALTER TABLE dias_plano DISABLE ROW LEVEL SECURITY;
ALTER TABLE refeicoes_plano DISABLE ROW LEVEL SECURITY;
ALTER TABLE substituicoes_foto DISABLE ROW LEVEL SECURITY;
ALTER TABLE itens_prato_foto DISABLE ROW LEVEL SECURITY;
ALTER TABLE registros_peso DISABLE ROW LEVEL SECURITY;
ALTER TABLE nutricionistas DISABLE ROW LEVEL SECURITY;
ALTER TABLE consultas DISABLE ROW LEVEL SECURITY;
ALTER TABLE chamados_suporte DISABLE ROW LEVEL SECURITY;
ALTER TABLE amigos_plano DISABLE ROW LEVEL SECURITY;
ALTER TABLE amizades DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        GRANT USAGE ON SCHEMA public TO anon, authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    END IF;
END $$;

