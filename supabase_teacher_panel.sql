-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO PARA O PAINEL DO PROFESSOR
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE, -- ex: '1º Ano A', '2º Ano B', '3º Ano C'
  serie TEXT NOT NULL DEFAULT 'Ensino Médio',
  professor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "turmas_select" ON public.turmas;
DROP POLICY IF EXISTS "turmas_insert" ON public.turmas;
DROP POLICY IF EXISTS "turmas_update" ON public.turmas;
DROP POLICY IF EXISTS "turmas_delete" ON public.turmas;

CREATE POLICY "turmas_select" ON public.turmas FOR SELECT USING (true);
CREATE POLICY "turmas_insert" ON public.turmas FOR INSERT WITH CHECK (true);
CREATE POLICY "turmas_update" ON public.turmas FOR UPDATE USING (true);
CREATE POLICY "turmas_delete" ON public.turmas FOR DELETE USING (true);

-- 2. TABELA: activities (Atividades)
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluation_criteria TEXT,
  status TEXT NOT NULL DEFAULT 'Aberta', -- 'Aberta', 'Encerrada'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activities_select" ON public.activities;
DROP POLICY IF EXISTS "activities_insert" ON public.activities;
DROP POLICY IF EXISTS "activities_update" ON public.activities;
DROP POLICY IF EXISTS "activities_delete" ON public.activities;

CREATE POLICY "activities_select" ON public.activities FOR SELECT USING (true);
CREATE POLICY "activities_insert" ON public.activities FOR INSERT WITH CHECK (auth.uid() = professor_id);
CREATE POLICY "activities_update" ON public.activities FOR UPDATE USING (auth.uid() = professor_id);
CREATE POLICY "activities_delete" ON public.activities FOR DELETE USING (auth.uid() = professor_id);

-- 3. TABELA: activity_submissions (Entregas de Atividades)
CREATE TABLE IF NOT EXISTS public.activity_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  grade DECIMAL(4,2),
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, student_id)
);

ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions_select" ON public.activity_submissions;
DROP POLICY IF EXISTS "submissions_insert" ON public.activity_submissions;
DROP POLICY IF EXISTS "submissions_update" ON public.activity_submissions;

CREATE POLICY "submissions_select" ON public.activity_submissions FOR SELECT USING (true);
CREATE POLICY "submissions_insert" ON public.activity_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "submissions_update" ON public.activity_submissions FOR UPDATE USING (true);

-- 4. TABELA: calendar_events (Eventos do Calendário)
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL, -- 'Prova', 'Trabalho', 'Evento', 'Reunião', 'Aula especial'
  event_date TIMESTAMPTZ NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "calendar_events_select" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_delete" ON public.calendar_events;

CREATE POLICY "calendar_events_select" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "calendar_events_insert" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = professor_id);
CREATE POLICY "calendar_events_delete" ON public.calendar_events FOR DELETE USING (auth.uid() = professor_id);

-- 5. TABELA: announcements (Avisos de Turma)
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_pinned BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_select" ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT WITH CHECK (auth.uid() = professor_id);
CREATE POLICY "announcements_update" ON public.announcements FOR UPDATE USING (auth.uid() = professor_id);
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE USING (auth.uid() = professor_id);


-- ============================================================
-- 6. INSERÇÃO DE DADOS MOCK (Caso não existam)
-- ============================================================

-- Inserir Turmas Padrão
INSERT INTO public.turmas (nome, serie)
VALUES 
  ('1º Ano A', 'Ensino Médio'),
  ('2º Ano B', 'Ensino Médio'),
  ('3º Ano C', 'Ensino Médio')
ON CONFLICT (nome) DO NOTHING;

-- Associar turmas existentes ao primeiro professor cadastrado (se houver)
DO $$
DECLARE
  prof_id UUID;
BEGIN
  SELECT id INTO prof_id FROM public.profiles WHERE papel = 'professor' LIMIT 1;
  IF prof_id IS NOT NULL THEN
    UPDATE public.turmas SET professor_id = prof_id WHERE professor_id IS NULL;
  END IF;
END $$;
