-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO PARA MODERAÇÃO DE POSTS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. ADICIONAR COLUNAS À TABELA posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Aprovada';
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Geral';

-- Backfill para posts existentes ficarem como Aprovada e Geral
UPDATE public.posts SET status = 'Aprovada' WHERE status IS NULL OR status = '';
UPDATE public.posts SET tipo = 'Geral' WHERE tipo IS NULL OR tipo = '';

-- 2. TABELA: moderation_history
CREATE TABLE IF NOT EXISTS public.moderation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'Aprovada', 'Rejeitada', 'Oculta', 'Arquivada', 'Restaurada'
  reason TEXT, -- motivo da rejeição
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moderation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moderation_history_select" ON public.moderation_history;
DROP POLICY IF EXISTS "moderation_history_insert" ON public.moderation_history;
CREATE POLICY "moderation_history_select" ON public.moderation_history FOR SELECT USING (true);
CREATE POLICY "moderation_history_insert" ON public.moderation_history FOR INSERT WITH CHECK (auth.uid() = moderator_id);

-- 3. TABELA: reports (Denúncias)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- 'Conteúdo ofensivo', 'Spam', 'Fake News', 'Assédio', 'Outro'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_select" ON public.reports FOR SELECT USING (true);
CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- 4. FUNÇÃO E TRIGGER PARA NOTIFICAÇÕES AUTOMÁTICAS DE POSTAGEM
CREATE OR REPLACE FUNCTION public.on_post_created_or_updated_notif()
RETURNS TRIGGER AS $$
DECLARE
  student_nome TEXT;
  student_turma TEXT;
  prof_rec RECORD;
  admin_rec RECORD;
  rejection_reason TEXT;
  moderator_name TEXT;
BEGIN
  -- CASO 1: Inserção de um post com status 'Aguardando aprovação' (Post de aluno)
  IF (TG_OP = 'INSERT' AND NEW.status = 'Aguardando aprovação') THEN
    -- Obter informações do aluno
    SELECT nome, turma INTO student_nome, student_turma FROM public.profiles WHERE id = NEW.user_id;

    -- Notificar professores que lecionam para a turma do aluno
    FOR prof_rec IN 
      SELECT id, nome FROM public.profiles 
      WHERE papel = 'professor' AND (turma ILIKE '%' || COALESCE(student_turma, 'Nenhuma') || '%')
    LOOP
      INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
      VALUES (
        prof_rec.id,
        NEW.user_id,
        NEW.author_handle,
        'criou uma publicação que aguarda sua aprovação para a turma ' || COALESCE(student_turma, ''),
        'moderation',
        NOW()
      );
    END LOOP;

    -- Notificar administradores
    FOR admin_rec IN 
      SELECT id FROM public.profiles WHERE papel = 'administrador'
    LOOP
      INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
      VALUES (
        admin_rec.id,
        NEW.user_id,
        NEW.author_handle,
        'criou uma publicação que aguarda aprovação.',
        'moderation',
        NOW()
      );
    END LOOP;

  -- CASO 2: Atualização do status da postagem (Moderação realizada)
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Obter o nome do moderador que realizou a ação
    SELECT nome INTO moderator_name FROM public.profiles WHERE id = auth.uid();

    -- Se aprovada
    IF (NEW.status = 'Aprovada') THEN
      INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
      VALUES (
        NEW.user_id,
        COALESCE(auth.uid(), NEW.user_id),
        COALESCE('@' || LOWER(REPLACE(moderator_name, ' ', '')), '@moderador'),
        'Sua publicação "' || NEW.title || '" foi aprovada e publicada no feed!',
        'approval',
        NOW()
      );
    
    -- Se rejeitada
    ELSIF (NEW.status = 'Rejeitada') THEN
      -- Buscar motivo da última rejeição no histórico
      SELECT reason INTO rejection_reason FROM public.moderation_history 
      WHERE post_id = NEW.id AND action = 'Rejeitada' 
      ORDER BY created_at DESC LIMIT 1;

      INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
      VALUES (
        NEW.user_id,
        COALESCE(auth.uid(), NEW.user_id),
        COALESCE('@' || LOWER(REPLACE(moderator_name, ' ', '')), '@moderador'),
        'Sua publicação "' || NEW.title || '" foi rejeitada. Motivo: ' || COALESCE(rejection_reason, 'Conteúdo fora do contexto escolar.'),
        'rejection',
        NOW()
      );

    -- Se ocultada
    ELSIF (NEW.status = 'Oculta') THEN
      INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
      VALUES (
        NEW.user_id,
        COALESCE(auth.uid(), NEW.user_id),
        COALESCE('@' || LOWER(REPLACE(moderator_name, ' ', '')), '@moderador'),
        'Sua publicação "' || NEW.title || '" foi ocultada da timeline por um moderador.',
        'moderation',
        NOW()
      );
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de postagem
DROP TRIGGER IF EXISTS trg_post_created_or_updated_notif ON public.posts;
CREATE TRIGGER trg_post_created_or_updated_notif
  AFTER INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.on_post_created_or_updated_notif();


-- 5. FUNÇÃO E TRIGGER PARA NOTIFICAÇÕES AUTOMÁTICAS DE DENÚNCIA
CREATE OR REPLACE FUNCTION public.on_report_created_notif()
RETURNS TRIGGER AS $$
DECLARE
  post_title TEXT;
  post_author_id UUID;
  post_author_handle TEXT;
  post_author_turma TEXT;
  reporter_name TEXT;
  prof_rec RECORD;
  admin_rec RECORD;
BEGIN
  -- Obter informações do post denunciado
  SELECT title, user_id, author_handle INTO post_title, post_author_id, post_author_handle FROM public.posts WHERE id = NEW.post_id;
  -- Obter turma do autor do post
  SELECT turma INTO post_author_turma FROM public.profiles WHERE id = post_author_id;
  -- Obter nome do denunciante
  SELECT nome INTO reporter_name FROM public.profiles WHERE id = NEW.reporter_id;

  -- Notificar professores responsáveis por essa turma
  FOR prof_rec IN 
    SELECT id FROM public.profiles 
    WHERE papel = 'professor' AND (turma ILIKE '%' || COALESCE(post_author_turma, 'Nenhuma') || '%')
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
    VALUES (
      prof_rec.id,
      NEW.reporter_id,
      COALESCE('@' || LOWER(REPLACE(reporter_name, ' ', '')), '@denunciante'),
      'denunciou a publicação "' || COALESCE(post_title, 'Sem título') || '" de ' || COALESCE(post_author_handle, 'um aluno') || '. Motivo: ' || NEW.reason,
      'report',
      NOW()
    );
  END LOOP;

  -- Notificar administradores
  FOR admin_rec IN 
    SELECT id FROM public.profiles WHERE papel = 'administrador'
  LOOP
    INSERT INTO public.notifications (user_id, actor_id, actor_handle, content, type, created_at)
    VALUES (
      admin_rec.id,
      NEW.reporter_id,
      COALESCE('@' || LOWER(REPLACE(reporter_name, ' ', '')), '@denunciante'),
      'denunciou a publicação "' || COALESCE(post_title, 'Sem título') || '" de ' || COALESCE(post_author_handle, 'um aluno') || '. Motivo: ' || NEW.reason,
      'report',
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger de denúncia
DROP TRIGGER IF EXISTS trg_report_created_notif ON public.reports;
CREATE TRIGGER trg_report_created_notif
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.on_report_created_notif();
