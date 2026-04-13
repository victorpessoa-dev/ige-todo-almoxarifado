-- Script completo para configurar o banco de dados do sistema IGE - Tarefas e Lembretes
-- Execute este script no SQL Editor do Supabase

-- ===========================================
-- TABELA: tarefas
-- ===========================================
CREATE TABLE IF NOT EXISTS tarefas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    responsavel TEXT,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
    prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    data DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================================
-- TABELA: lembretes
-- ===========================================
CREATE TABLE IF NOT EXISTS lembretes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    conteudo TEXT,
    destinatario TEXT,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'cancelado')),
    prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    data DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================================
-- TABELA: produtos
-- ===========================================
CREATE TABLE IF NOT EXISTS produtos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cod TEXT NOT NULL,
    nome TEXT NOT NULL,
    cod_barra TEXT NOT NULL,
    max INTEGER NOT NULL,
    min INTEGER NOT NULL,
    estoque INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT produtos_max_min_check CHECK (max >= min),
    CONSTRAINT produtos_estoque_check CHECK (estoque >= 0)
);

-- ===========================================
-- TABELA: movimentacoes_estoque
-- ===========================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ===========================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_tarefas_user_id ON tarefas(user_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_data ON tarefas(data);

CREATE INDEX IF NOT EXISTS idx_lembretes_user_id ON lembretes(user_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_status ON lembretes(status);
CREATE INDEX IF NOT EXISTS idx_lembretes_data ON lembretes(data);

CREATE INDEX IF NOT EXISTS idx_produtos_user_id ON produtos(user_id);
CREATE INDEX IF NOT EXISTS idx_produtos_cod ON produtos(cod);
CREATE INDEX IF NOT EXISTS idx_produtos_cod_barra ON produtos(cod_barra);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_user_cod ON produtos(user_id, cod);
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_user_cod_barra ON produtos(user_id, cod_barra);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_user_id ON movimentacoes_estoque(user_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at ON movimentacoes_estoque(created_at);

-- ===========================================
-- POLÍTICAS RLS (Row Level Security)
-- ===========================================

-- Tarefas
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own tasks" ON tarefas
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own tasks" ON tarefas
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own tasks" ON tarefas
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own tasks" ON tarefas
    FOR DELETE USING (auth.uid() = user_id);

-- Lembretes
ALTER TABLE lembretes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own reminders" ON lembretes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own reminders" ON lembretes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own reminders" ON lembretes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own reminders" ON lembretes
    FOR DELETE USING (auth.uid() = user_id);

-- Produtos
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own products" ON produtos
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own products" ON produtos
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own products" ON produtos
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own products" ON produtos
    FOR DELETE USING (auth.uid() = user_id);

-- Movimentações de Estoque
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own stock movements" ON movimentacoes_estoque
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own stock movements" ON movimentacoes_estoque
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- TRIGGERS PARA ATUALIZAR updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_tarefas_updated_at
    BEFORE UPDATE ON tarefas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_lembretes_updated_at
    BEFORE UPDATE ON lembretes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_produtos_updated_at
    BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_movimentacoes_updated_at
    BEFORE UPDATE ON movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- TRIGGER PARA REGISTRAR MOVIMENTAÇÕES DE ESTOQUE
-- ===========================================
CREATE OR REPLACE FUNCTION registrar_movimentacao_estoque()
RETURNS TRIGGER AS $$
BEGIN
    -- Só registra se houve mudança no estoque
    IF OLD.estoque != NEW.estoque THEN
        INSERT INTO movimentacoes_estoque (user_id, produto_id, tipo, quantidade)
        VALUES (
            NEW.user_id,
            NEW.id,
            CASE WHEN NEW.estoque > OLD.estoque THEN 'entrada' ELSE 'saida' END,
            ABS(NEW.estoque - OLD.estoque)
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS trigger_movimentacao_estoque
    AFTER UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION registrar_movimentacao_estoque();