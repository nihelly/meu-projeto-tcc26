-- ============================================================
-- EDUCONNECT — SCRIPT PARA COMENTÁRIOS E INTERAÇÕES
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: comment_replies (Respostas aos comentários)
CREATE TABLE IF NOT EXISTS public.comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELAS DE CURTIDAS (Likes)
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reply_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES public.comment_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

-- 3. TABELA: post_shares (Compartilhamentos)
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'perfil', 'turma', 'destaques'
  target_id UUID, -- ID da turma (se target_type for 'turma')
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COLUNAS EXTENDIDAS EM comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- HABILITAR RLS E CRIAR POLÍTICAS
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "replies_select" ON public.comment_replies;
DROP POLICY IF EXISTS "replies_insert" ON public.comment_replies;
DROP POLICY IF EXISTS "replies_update" ON public.comment_replies;
DROP POLICY IF EXISTS "replies_delete" ON public.comment_replies;

CREATE POLICY "replies_select" ON public.comment_replies FOR SELECT USING (true);
CREATE POLICY "replies_insert" ON public.comment_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "replies_update" ON public.comment_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "replies_delete" ON public.comment_replies FOR DELETE USING (true);

DROP POLICY IF EXISTS "c_likes_select" ON public.comment_likes;
DROP POLICY IF EXISTS "c_likes_insert" ON public.comment_likes;
DROP POLICY IF EXISTS "c_likes_delete" ON public.comment_likes;

CREATE POLICY "c_likes_select" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "c_likes_insert" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "c_likes_delete" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "r_likes_select" ON public.reply_likes;
DROP POLICY IF EXISTS "r_likes_insert" ON public.reply_likes;
DROP POLICY IF EXISTS "r_likes_delete" ON public.reply_likes;

CREATE POLICY "r_likes_select" ON public.reply_likes FOR SELECT USING (true);
CREATE POLICY "r_likes_insert" ON public.reply_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "r_likes_delete" ON public.reply_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "shares_select" ON public.post_shares;
DROP POLICY IF EXISTS "shares_insert" ON public.post_shares;

CREATE POLICY "shares_select" ON public.post_shares FOR SELECT USING (true);
CREATE POLICY "shares_insert" ON public.post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
