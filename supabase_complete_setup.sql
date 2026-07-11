-- ============================================================
-- EDUCONNECT — MASTER COMPLETE SETUP DATABASE SCRIPT
-- Execute this single script in the Supabase SQL Editor
-- ============================================================

-- START OF FILE: supabase_setup.sql --
-- ============================================================
-- EDUCONNECT — SCRIPT COMPLETO DE CRIAÇÃO DO BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ============================================================
-- 1. TABELA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Usuário EduConnect',
  matricula TEXT,
  papel TEXT NOT NULL DEFAULT 'aluno',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 2. TRIGGER: Criar perfil automaticamente ao registrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, matricula, papel, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'matricula', LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0')),
    COALESCE(NEW.raw_user_meta_data->>'papel', 'aluno'),
    'Estudante do EduConnect.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. TABELA: posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  image_url TEXT,
  author_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;
CREATE POLICY "posts_select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_insert" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. TABELA: comments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. TABELA: likes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "likes_select" ON public.likes;
DROP POLICY IF EXISTS "likes_insert" ON public.likes;
DROP POLICY IF EXISTS "likes_delete" ON public.likes;
CREATE POLICY "likes_select" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. TABELA: reposts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reposts_select" ON public.reposts;
DROP POLICY IF EXISTS "reposts_insert" ON public.reposts;
DROP POLICY IF EXISTS "reposts_delete" ON public.reposts;
CREATE POLICY "reposts_select" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "reposts_insert" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reposts_delete" ON public.reposts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. TABELA: follows
-- ============================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_select" ON public.follows;
DROP POLICY IF EXISTS "follows_insert" ON public.follows;
DROP POLICY IF EXISTS "follows_delete" ON public.follows;
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK (true);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING (true);

-- ============================================================
-- 8. TABELA: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_handle TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;
CREATE POLICY "notif_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 9. TABELA: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE USING (auth.uid() = sender_id);

-- ============================================================
-- 10. TABELA: blocked_users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocked_select" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_insert" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_delete" ON public.blocked_users;
CREATE POLICY "blocked_select" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "blocked_insert" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "blocked_delete" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);

-- ============================================================
-- 11. HABILITAR REALTIME
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 12. STORAGE: Criar Buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_avatars_insert" ON storage.objects;
  CREATE POLICY "storage_avatars_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_avatars_select" ON storage.objects;
  CREATE POLICY "storage_avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_avatars_update" ON storage.objects;
  CREATE POLICY "storage_avatars_update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'avatars');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_avatars_delete" ON storage.objects;
  CREATE POLICY "storage_avatars_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'avatars');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_postimg_insert" ON storage.objects;
  CREATE POLICY "storage_postimg_insert" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'post-images');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_postimg_select" ON storage.objects;
  CREATE POLICY "storage_postimg_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'post-images');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "storage_postimg_delete" ON storage.objects;
  CREATE POLICY "storage_postimg_delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'post-images');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- PRONTO! Tabelas, políticas, buckets e trigger criados.
-- ============================================================

-- END OF FILE: supabase_setup.sql --

-- START OF FILE: supabase_update.sql --
-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. ADICIONAR COLUNAS À TABELA profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS turma TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disciplinas TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Ativo';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ DEFAULT NOW();

-- 2. BACKFILL DE DADOS EXISTENTES
-- Copiar e-mail de auth.users para public.profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Ajustar status inicial como 'Ativo' para todos os perfis
UPDATE public.profiles
SET status = 'Ativo'
WHERE status IS NULL OR status = '';

-- Tornar a usuária Georgia Costa Administradora (se houver correspondência pelo ID ou Nome)
UPDATE public.profiles
SET papel = 'administrador'
WHERE id = '73c7bd63-6945-4cc6-9f28-fe53b26d0672' OR nome ILIKE '%Georgia%Costa%';

-- 3. ATUALIZAR TRIGGER handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, papel, status, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'papel', 'aluno'),
    'Ativo',
    'Estudante do EduConnect.'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÕES SQL SECURITY DEFINER PARA ADMINISTRAÇÃO

-- Função para Listar Usuários
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  papel TEXT,
  turma TEXT,
  disciplinas TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  ultimo_acesso TIMESTAMPTZ,
  avatar_url TEXT
) AS $$
BEGIN
  -- Validação de segurança: apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.nome,
    p.email,
    p.papel,
    p.turma,
    p.disciplinas,
    p.status,
    p.created_at,
    p.ultimo_acesso,
    p.avatar_url
  FROM public.profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Criar Usuário
CREATE OR REPLACE FUNCTION public.admin_create_user(
  email_arg TEXT,
  password_arg TEXT,
  nome_arg TEXT,
  papel_arg TEXT,
  turma_arg TEXT,
  disciplinas_arg TEXT,
  status_arg TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Validação de segurança: apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  -- Impedir e-mails duplicados
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_arg) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está sendo utilizado.';
  END IF;

  new_user_id := gen_random_uuid();

  -- Criar usuário na tabela auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    email_arg,
    crypt(password_arg, gen_salt('bf')),
    NOW(),
    jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    NOW(), NOW(), '', '', '', ''
  );

  -- Vincular identidade de e-mail ao usuário do Supabase
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  VALUES (
    new_user_id,
    new_user_id,
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', email_arg, 'email_verified', true),
    'email',
    NOW(), NOW(), NOW()
  );

  -- Atualizar perfil que foi criado pelo trigger handle_new_user
  UPDATE public.profiles
  SET 
    nome = nome_arg,
    email = email_arg,
    papel = papel_arg,
    turma = turma_arg,
    disciplinas = disciplinas_arg,
    status = status_arg
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Atualizar Usuário
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  email_arg TEXT,
  password_arg TEXT,
  nome_arg TEXT,
  papel_arg TEXT,
  turma_arg TEXT,
  disciplinas_arg TEXT,
  status_arg TEXT
) RETURNS VOID AS $$
BEGIN
  -- Validação de segurança: apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  -- Impedir alteração de e-mail para um já utilizado por outro usuário
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_arg AND id != target_user_id) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está sendo utilizado por outro usuário.';
  END IF;

  -- Atualizar auth.users (senha condicional)
  IF password_arg IS NOT NULL AND password_arg != '' THEN
    UPDATE auth.users
    SET 
      email = email_arg,
      encrypted_password = crypt(password_arg, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
      updated_at = NOW()
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET 
      email = email_arg,
      raw_user_meta_data = jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
      updated_at = NOW()
    WHERE id = target_user_id;
  END IF;

  -- Atualizar auth.identities
  UPDATE auth.identities
  SET 
    identity_data = jsonb_build_object('sub', target_user_id, 'email', email_arg, 'email_verified', true),
    updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Atualizar perfis
  UPDATE public.profiles
  SET 
    nome = nome_arg,
    email = email_arg,
    papel = papel_arg,
    turma = turma_arg,
    disciplinas = disciplinas_arg,
    status = status_arg
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Excluir Usuário
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Validação de segurança: apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'administrador'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem realizar esta ação.';
  END IF;

  -- Exclui da tabela auth.users (o cascateamento remove o perfil e identidades)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- END OF FILE: supabase_update.sql --

-- START OF FILE: supabase_turmas_organization.sql --
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

-- END OF FILE: supabase_turmas_organization.sql --

-- START OF FILE: supabase_teacher_panel.sql --
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

-- END OF FILE: supabase_teacher_panel.sql --

-- START OF FILE: supabase_moderation.sql --
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

-- END OF FILE: supabase_moderation.sql --

-- START OF FILE: supabase_admin_panel.sql --
-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO PARA O PAINEL DO ADMINISTRADOR
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: system_logs (Logs de Atividades do Sistema)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_logs_select" ON public.system_logs;
DROP POLICY IF EXISTS "system_logs_insert" ON public.system_logs;

CREATE POLICY "system_logs_select" ON public.system_logs FOR SELECT USING (true);
CREATE POLICY "system_logs_insert" ON public.system_logs FOR INSERT WITH CHECK (true);

-- 2. TABELA: system_settings (Configurações Gerais do Sistema)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_upsert" ON public.system_settings;

CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "system_settings_upsert" ON public.system_settings FOR ALL USING (true);

-- 3. INSERÇÃO DE CONFIGURAÇÕES PADRÃO (Caso não existam)
INSERT INTO public.system_settings (key, value)
VALUES 
  ('platform_name', 'EduConnect'),
  ('logo_url', '/assets/logo-educonnect.png'),
  ('banner_url', ''),
  ('primary_color', '#6366f1'),
  ('community_rules', '1. Respeito mútuo entre todos os participantes; 2. Proibido conteúdo ofensivo ou impróprio; 3. Use o fórum para fins estritamente acadêmicos.'),
  ('privacy_policy', 'Seus dados de perfil são confidenciais e protegidos nos termos da LGPD.'),
  ('terms_of_use', 'O uso da plataforma é restrito aos alunos, professores e responsáveis da rede escolar EduConnect.')
ON CONFLICT (key) DO NOTHING;

-- 4. INSERÇÃO DE ALGUNS LOGS INICIAIS MOCK
INSERT INTO public.system_logs (action, module, ip_address)
VALUES 
  ('Inicialização do sistema', 'Core', '192.168.1.1'),
  ('Atualização de políticas de moderação', 'Segurança', '192.168.1.5'),
  ('Configuração inicial das turmas', 'Turmas', '192.168.1.10');

-- END OF FILE: supabase_admin_panel.sql --

-- START OF FILE: supabase_notifications_preferences.sql --
-- ============================================================
-- EDUCONNECT — SCRIPT DE ATUALIZAÇÃO PARA PREFERÊNCIAS DE NOTIFICAÇÕES
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: notification_preferences (Preferências do usuário)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  posts BOOLEAN DEFAULT TRUE,
  comments BOOLEAN DEFAULT TRUE,
  messages BOOLEAN DEFAULT TRUE,
  announcements BOOLEAN DEFAULT TRUE,
  events BOOLEAN DEFAULT TRUE,
  mentions BOOLEAN DEFAULT TRUE,
  system BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "preferences_select" ON public.notification_preferences;
DROP POLICY IF EXISTS "preferences_upsert" ON public.notification_preferences;

CREATE POLICY "preferences_select" ON public.notification_preferences FOR SELECT USING (true);
CREATE POLICY "preferences_upsert" ON public.notification_preferences FOR ALL USING (true);

-- 2. TRIGGER PARA GERAR PREFERÊNCIAS AO CRIAR PERFIL
CREATE OR REPLACE FUNCTION public.create_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_user_notification_preferences ON public.profiles;
CREATE TRIGGER trg_create_user_notification_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_notification_preferences();

-- 3. GERAR PARA PERFIS EXISTENTES
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- END OF FILE: supabase_notifications_preferences.sql --

-- START OF FILE: supabase_comments_interactions.sql --
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

-- END OF FILE: supabase_comments_interactions.sql --

-- START OF FILE: supabase_security_module.sql --
-- ============================================================
-- EDUCONNECT — SEGURANÇA E PRIVACIDADE (MIGRAÇÃO)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: security_logs (Logs de Auditoria de Segurança)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_logs_select" ON public.security_logs;
DROP POLICY IF EXISTS "security_logs_insert" ON public.security_logs;

CREATE POLICY "security_logs_select" ON public.security_logs FOR SELECT USING (true);
CREATE POLICY "security_logs_insert" ON public.security_logs FOR INSERT WITH CHECK (true);

-- 2. TABELA: security_sessions (Sessões e Dispositivos Conectados)
CREATE TABLE IF NOT EXISTS public.security_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_sessions_select" ON public.security_sessions;
DROP POLICY IF EXISTS "security_sessions_all" ON public.security_sessions;

CREATE POLICY "security_sessions_select" ON public.security_sessions FOR SELECT USING (true);
CREATE POLICY "security_sessions_all" ON public.security_sessions FOR ALL USING (true);

-- 3. TABELA: security_backups (Histórico de Backups realizados)
CREATE TABLE IF NOT EXISTS public.security_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_backups_select" ON public.security_backups;
DROP POLICY IF EXISTS "security_backups_all" ON public.security_backups;

CREATE POLICY "security_backups_select" ON public.security_backups FOR SELECT USING (true);
CREATE POLICY "security_backups_all" ON public.security_backups FOR ALL USING (true);

-- 4. TABELA: security_privacy (Configurações de Privacidade do Usuário)
CREATE TABLE IF NOT EXISTS public.security_privacy (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_visibility TEXT DEFAULT 'Todos', -- 'Todos' | 'Professores' | 'Apenas eu'
  send_messages TEXT DEFAULT 'Todos',       -- 'Todos' | 'Colegas' | 'Ninguém'
  comment_posts TEXT DEFAULT 'Todos',       -- 'Todos' | 'Colegas' | 'Ninguém'
  view_photo TEXT DEFAULT 'Todos',          -- 'Todos' | 'Colegas' | 'Ninguém'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.security_privacy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "security_privacy_select" ON public.security_privacy;
DROP POLICY IF EXISTS "security_privacy_upsert" ON public.security_privacy;

CREATE POLICY "security_privacy_select" ON public.security_privacy FOR SELECT USING (true);
CREATE POLICY "security_privacy_upsert" ON public.security_privacy FOR ALL USING (true);

-- 5. TRIGGER PARA INICIALIZAR PRIVACIDADE AO CRIAR PERFIL
CREATE OR REPLACE FUNCTION public.create_user_security_privacy()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_privacy (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_user_security_privacy ON public.profiles;
CREATE TRIGGER trg_create_user_security_privacy
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_security_privacy();

-- 6. GERAR PRIVACIDADE PARA PERFIS EXISTENTES
INSERT INTO public.security_privacy (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 7. INSERÇÃO DE LOGS DE SEGURANÇA MOCK INICIAIS
INSERT INTO public.security_logs (user_id, action, details, ip_address, device, created_at)
SELECT 
  id, 
  'Login realizado', 
  'Chrome no Windows 11', 
  '192.168.1.15', 
  'Desktop', 
  NOW() - INTERVAL '15 minutes'
FROM public.profiles
WHERE papel = 'aluno'
LIMIT 1;

INSERT INTO public.security_logs (user_id, action, details, ip_address, device, created_at)
SELECT 
  id, 
  'Postagem aprovada', 
  'Título: Trabalho de Ciências', 
  '192.168.1.20', 
  'Desktop', 
  NOW() - INTERVAL '2 hours'
FROM public.profiles
WHERE papel = 'professor'
LIMIT 1;

-- END OF FILE: supabase_security_module.sql --

-- START OF FILE: supabase_communication_system.sql --
-- ============================================================
-- EDUCONNECT — SISTEMA DE COMUNICAÇÃO (MIGRAÇÃO)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. TABELA: conversations (Conversas Individuais e em Grupo)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT, -- Usado para chats de turmas/grupos
  type TEXT NOT NULL DEFAULT 'private', -- 'private' | 'group'
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_all" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "conversations_all" ON public.conversations FOR ALL USING (true);

-- 2. TABELA: conversation_members (Participantes das Conversas)
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'moderator' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_members_select" ON public.conversation_members;
DROP POLICY IF EXISTS "conversation_members_all" ON public.conversation_members;

CREATE POLICY "conversation_members_select" ON public.conversation_members FOR SELECT USING (true);
CREATE POLICY "conversation_members_all" ON public.conversation_members FOR ALL USING (true);

-- 3. TABELA: messages (Mensagens enviadas no chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'pdf' | 'document' | 'audio' | 'video' | 'link'
  reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_edited BOOLEAN DEFAULT FALSE,
  reactions JSONB DEFAULT '[]', -- Ex: [{"user_id": "...", "emoji": "❤️"}]
  read_by JSONB DEFAULT '[]', -- Lista de IDs dos usuários que leram a mensagem
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_all" ON public.messages;

CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (true);
CREATE POLICY "messages_all" ON public.messages FOR ALL USING (true);

-- 4. CRIAÇÃO DE DADOS MOCK INICIAIS
-- Localiza perfis para criar chats simulados
DO $$
DECLARE
  v_aluno_id UUID;
  v_prof_id UUID;
  v_conversa_id UUID;
BEGIN
  -- Seleciona um aluno e um professor
  SELECT id INTO v_aluno_id FROM public.profiles WHERE papel = 'aluno' LIMIT 1;
  SELECT id INTO v_prof_id FROM public.profiles WHERE papel = 'professor' LIMIT 1;

  IF v_aluno_id IS NOT NULL AND v_prof_id IS NOT NULL THEN
    -- Cria conversa privada
    INSERT INTO public.conversations (type) VALUES ('private') RETURNING id INTO v_conversa_id;

    -- Vincula membros
    INSERT INTO public.conversation_members (conversation_id, user_id, role) 
    VALUES 
      (v_conversa_id, v_aluno_id, 'member'),
      (v_conversa_id, v_prof_id, 'member');

    -- Mensagens iniciais
    INSERT INTO public.messages (conversation_id, sender_id, content, type, created_at)
    VALUES 
      (v_conversa_id, v_aluno_id, 'Professor, posso tirar uma dúvida sobre a parte 2 do projeto?', 'text', NOW() - INTERVAL '10 minutes'),
      (v_conversa_id, v_prof_id, 'Claro! Pode me falar 😊', 'text', NOW() - INTERVAL '9 minutes'),
      (v_conversa_id, v_aluno_id, 'Na parte da pesquisa, qual formato devemos usar para apresentar os dados?', 'text', NOW() - INTERVAL '8 minutes'),
      (v_conversa_id, v_prof_id, 'Você pode usar gráficos ou tabelas, o importante é que fique claro e organizado.', 'text', NOW() - INTERVAL '7 minutes'),
      (v_conversa_id, v_aluno_id, 'Entendi! Muito obrigado!', 'text', NOW() - INTERVAL '6 minutes');
  END IF;
END $$;

-- END OF FILE: supabase_communication_system.sql --

-- START OF FILE: supabase_criar_usuarios.sql --
-- ============================================================
-- EDUCONNECT — CRIAÇÃO DOS 3 USUÁRIOS DE TESTE
-- Execute DEPOIS do supabase_setup.sql
-- ============================================================

-- 1. PROFESSOR
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'professor@conecta.com',
  crypt('Tcc2026!', gen_salt('bf')),
  NOW(),
  '{"nome": "Prof. Dr. Roberto", "matricula": "100001", "papel": "professor"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  '{"sub": "a1111111-1111-1111-1111-111111111111", "email": "professor@conecta.com", "email_verified": true}'::jsonb,
  'email',
  NOW(), NOW(), NOW()
);

-- 2. ALUNO 1
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'aluno1@conecta.com',
  crypt('Tcc2026!', gen_salt('bf')),
  NOW(),
  '{"nome": "Ana Silva", "matricula": "200001", "papel": "aluno"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'b2222222-2222-2222-2222-222222222222',
  'b2222222-2222-2222-2222-222222222222',
  '{"sub": "b2222222-2222-2222-2222-222222222222", "email": "aluno1@conecta.com", "email_verified": true}'::jsonb,
  'email',
  NOW(), NOW(), NOW()
);

-- 3. ALUNO 2
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'c3333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'aluno2@conecta.com',
  crypt('Tcc2026!', gen_salt('bf')),
  NOW(),
  '{"nome": "Carlos Mendes", "matricula": "200002", "papel": "aluno"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  '{"sub": "c3333333-3333-3333-3333-333333333333", "email": "aluno2@conecta.com", "email_verified": true}'::jsonb,
  'email',
  NOW(), NOW(), NOW()
);

-- ============================================================
-- PRONTO! 3 usuários criados. O trigger cria os perfis automaticamente.
-- Login: professor@conecta.com / aluno1@conecta.com / aluno2@conecta.com
-- Senha: Tcc2026!
-- ============================================================

-- END OF FILE: supabase_criar_usuarios.sql --

