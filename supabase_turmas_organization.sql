-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO PARA ORGANIZAÇÃO POR TURMAS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. ADICIONAR COLUNAS ADICIONAIS NA TABELA: turmas (Caso não existam)
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS curso TEXT;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS turno TEXT DEFAULT 'Manhã'; -- 'Manhã', 'Tarde', 'Noite'
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS ano_letivo INTEGER DEFAULT 2026;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS max_alunos INTEGER DEFAULT 40;
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ativa'; -- 'Ativa', 'Inativa'
ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS codigo TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8);

-- 2. TABELA: matriculas (Alunos matriculados nas turmas)
CREATE TABLE IF NOT EXISTS public.matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ano_letivo INTEGER DEFAULT 2026,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(aluno_id, ano_letivo)
);

ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matriculas_select" ON public.matriculas;
DROP POLICY IF EXISTS "matriculas_insert" ON public.matriculas;
DROP POLICY IF EXISTS "matriculas_delete" ON public.matriculas;

CREATE POLICY "matriculas_select" ON public.matriculas FOR SELECT USING (true);
CREATE POLICY "matriculas_insert" ON public.matriculas FOR INSERT WITH CHECK (true);
CREATE POLICY "matriculas_delete" ON public.matriculas FOR DELETE USING (true);

-- 3. TABELA: turma_professores (Mapeamento de múltiplos professores responsáveis)
CREATE TABLE IF NOT EXISTS public.turma_professores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(turma_id, professor_id)
);

ALTER TABLE public.turma_professores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turma_professores_select" ON public.turma_professores;
DROP POLICY IF EXISTS "turma_professores_insert" ON public.turma_professores;
DROP POLICY IF EXISTS "turma_professores_delete" ON public.turma_professores;

CREATE POLICY "turma_professores_select" ON public.turma_professores FOR SELECT USING (true);
CREATE POLICY "turma_professores_insert" ON public.turma_professores FOR INSERT WITH CHECK (true);
CREATE POLICY "turma_professores_delete" ON public.turma_professores FOR DELETE USING (true);

-- 4. TABELA: turma_arquivos (Arquivos compartilhados da turma)
CREATE TABLE IF NOT EXISTS public.turma_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  category TEXT NOT NULL, -- 'PDFs', 'Imagens', 'Documentos', 'Planilhas', 'Apresentações', 'Vídeos'
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turma_arquivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turma_arquivos_select" ON public.turma_arquivos;
DROP POLICY IF EXISTS "turma_arquivos_insert" ON public.turma_arquivos;
DROP POLICY IF EXISTS "turma_arquivos_delete" ON public.turma_arquivos;

CREATE POLICY "turma_arquivos_select" ON public.turma_arquivos FOR SELECT USING (true);
CREATE POLICY "turma_arquivos_insert" ON public.turma_arquivos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "turma_arquivos_delete" ON public.turma_arquivos FOR DELETE USING (auth.uid() = user_id);

-- 5. TRIGGER DE SINCRONIZAÇÃO DE MATRÍCULA AUTOMÁTICA
-- Quando o perfil de aluno for atualizado com uma turma em texto, sincroniza automaticamente na tabela de matrículas.
CREATE OR REPLACE FUNCTION public.sync_aluno_matricula()
RETURNS TRIGGER AS $$
DECLARE
  t_id UUID;
BEGIN
  IF NEW.papel = 'aluno' AND NEW.turma IS NOT NULL AND NEW.turma <> '' THEN
    SELECT id INTO t_id FROM public.turmas WHERE LOWER(nome) = LOWER(TRIM(NEW.turma)) LIMIT 1;
    IF t_id IS NOT NULL THEN
      INSERT INTO public.matriculas (turma_id, aluno_id, ano_letivo)
      VALUES (t_id, NEW.id, 2026)
      ON CONFLICT (aluno_id, ano_letivo) 
      DO UPDATE SET turma_id = EXCLUDED.turma_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_aluno_matricula ON public.profiles;
CREATE TRIGGER trg_sync_aluno_matricula
  AFTER INSERT OR UPDATE OF turma ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_aluno_matricula();

-- 5. TABELA: turma_messages (Mensagens do chat da turma)
CREATE TABLE IF NOT EXISTS public.turma_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turma_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turma_messages_select" ON public.turma_messages;
DROP POLICY IF EXISTS "turma_messages_insert" ON public.turma_messages;

CREATE POLICY "turma_messages_select" ON public.turma_messages FOR SELECT USING (true);
CREATE POLICY "turma_messages_insert" ON public.turma_messages FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 6. POPULAR DADOS MOCK INICIAIS
-- Vínculos de exemplo de turmas a professores responsáveis
DO $$
DECLARE
  p_rec RECORD;
  t_rec RECORD;
BEGIN
  FOR p_rec IN SELECT id, turma FROM public.profiles WHERE papel = 'professor' LOOP
    FOR t_rec IN SELECT id, nome FROM public.turmas LOOP
      IF POSITION(LOWER(t_rec.nome) IN LOWER(p_rec.turma)) > 0 THEN
        INSERT INTO public.turma_professores (turma_id, professor_id)
        VALUES (t_rec.id, p_rec.id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;
