-- ============================================================
-- EDUCONNECT — COMENTÁRIOS E INTERAÇÕES (MIGRAÇÃO)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: comments (Comentários Principais nos Posts)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_url TEXT,
  filename TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_highlighted BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_all_actions" ON public.comments;

CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_all_actions" ON public.comments FOR ALL USING (true);

-- 2. TABELA: comment_replies (Respostas de Comentários / Threads)
CREATE TABLE IF NOT EXISTS public.comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "replies_select" ON public.comment_replies;
DROP POLICY IF EXISTS "replies_all_actions" ON public.comment_replies;

CREATE POLICY "replies_select" ON public.comment_replies FOR SELECT USING (true);
CREATE POLICY "replies_all_actions" ON public.comment_replies FOR ALL USING (true);

-- 3. TABELA: likes (Curtidas Unificadas para Posts, Comentários e Respostas)
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.comment_replies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garantir que a curtida seja vinculada a exatamente um item
  CONSTRAINT check_single_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL AND reply_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Índices e restrições únicas para evitar curtidas duplicadas do mesmo usuário
CREATE UNIQUE INDEX IF NOT EXISTS likes_user_post_idx ON public.likes (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS likes_user_comment_idx ON public.likes (user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS likes_user_reply_idx ON public.likes (user_id, reply_id) WHERE reply_id IS NOT NULL;

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select" ON public.likes;
DROP POLICY IF EXISTS "likes_all_actions" ON public.likes;

CREATE POLICY "likes_select" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_all_actions" ON public.likes FOR ALL USING (true);

-- 4. TABELA: shares (Compartilhamentos)
CREATE TABLE IF NOT EXISTS public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  target_turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shares_select" ON public.shares;
DROP POLICY IF EXISTS "shares_all_actions" ON public.shares;

CREATE POLICY "shares_select" ON public.shares FOR SELECT USING (true);
CREATE POLICY "shares_all_actions" ON public.shares FOR ALL USING (true);
