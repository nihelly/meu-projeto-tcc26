-- ============================================================
-- EDUCONNECT — MIGRATION: CONSOLIDAÇÃO PROFESSOR & ADMINISTRADOR
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 0. GARANTIR A EXTENSÃO PGCRYPTO (Necessária para criptografia de senhas)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- 1. ATUALIZAR TODOS OS PERFIS EXISTENTES COM PAPEL ADMINISTRADOR PARA PROFESSOR
-- Esta etapa DEVE ser feita antes de criar restrições check na coluna papel
UPDATE public.profiles SET papel = 'professor' WHERE papel = 'administrador';

-- 2. REMOVER CONSTRANGIMENTOS ANTERIORES E APLICAR NOVA VALIDAÇÃO
-- O bloco abaixo remove dinamicamente qualquer constraint do tipo check na coluna papel
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%papel%'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- Criar a restrição definitiva que aceita apenas aluno e professor
ALTER TABLE public.profiles ADD CONSTRAINT profiles_papel_check CHECK (papel IN ('aluno', 'professor'));

-- 3. REFAZER AS FUNÇÕES DE ADMINISTRAÇÃO DO SISTEMA COM SUPORTE A IDENTIDADES E BUSCA EM EXTENSIONS

-- Listar usuários
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
#variable_conflict use_column
BEGIN
  -- Validação de segurança: apenas professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() AND public.profiles.papel = 'professor'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas professores podem realizar esta ação.';
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
  FROM public.profiles p
  ORDER BY p.nome ASC;
END;
$$;

-- Criar usuário
CREATE OR REPLACE FUNCTION public.admin_create_user(
  email_arg TEXT,
  password_arg TEXT,
  nome_arg TEXT,
  papel_arg TEXT,
  turma_arg TEXT,
  disciplinas_arg TEXT,
  status_arg TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Validação de segurança: apenas professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() AND public.profiles.papel = 'professor'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas professores podem realizar esta ação.';
  END IF;

  -- Impedir e-mails duplicados
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_arg) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está sendo utilizado.';
  END IF;

  new_user_id := gen_random_uuid();

  -- 1. Criar na tabela auth.users
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
    now(),
    jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
    '{"provider":"email","providers":["email"]}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- 2. Vincular identidade de e-mail ao usuário (Essencial para o login no Supabase)
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
    now(), now(), now()
  );

  -- 3. Atualizar perfil correspondente na tabela profiles (que foi criado automaticamente pelo trigger handle_new_user)
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
$$;

-- Atualizar usuário
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  email_arg TEXT,
  password_arg TEXT,
  nome_arg TEXT,
  papel_arg TEXT,
  turma_arg TEXT,
  disciplinas_arg TEXT,
  status_arg TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Validação de segurança: apenas professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() AND public.profiles.papel = 'professor'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas professores podem realizar esta ação.';
  END IF;

  -- Impedir alteração de e-mail para um já utilizado por outro usuário
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_arg AND id != target_user_id) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está sendo utilizado por outro usuário.';
  END IF;

  -- 1. Atualizar auth.users (senha condicional)
  IF password_arg IS NOT NULL AND password_arg != '' THEN
    UPDATE auth.users
    SET 
      email = email_arg,
      encrypted_password = crypt(password_arg, gen_salt('bf')),
      raw_user_meta_data = jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
      updated_at = now()
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET 
      email = email_arg,
      raw_user_meta_data = jsonb_build_object('nome', nome_arg, 'papel', papel_arg),
      updated_at = now()
    WHERE id = target_user_id;
  END IF;

  -- 2. Atualizar auth.identities
  UPDATE auth.identities
  SET 
    identity_data = jsonb_build_object('sub', target_user_id, 'email', email_arg, 'email_verified', true),
    updated_at = now()
  WHERE user_id = target_user_id;

  -- 3. Atualizar public.profiles
  UPDATE public.profiles
  SET
    nome = nome_arg,
    email = email_arg,
    papel = papel_arg,
    status = status_arg,
    turma = turma_arg,
    disciplinas = disciplinas_arg
  WHERE id = target_user_id;
END;
$$;

-- Excluir usuário
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Validação de segurança: apenas professor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() AND public.profiles.papel = 'professor'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas professores podem realizar esta ação.';
  END IF;

  -- Exclui da tabela auth.users (o cascateamento remove o perfil e identidades)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 4. ATUALIZAR FUNÇÕES E TRIGGERS DE NOTIFICAÇÃO DO FEED E MODERAÇÃO
-- Remove referências a notificações de administradores e substitui pelo papel professor

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

    -- Notificar todos os outros professores (como moderadores gerais) sem duplicar notificações
    FOR admin_rec IN 
      SELECT id FROM public.profiles 
      WHERE papel = 'professor' AND NOT (turma ILIKE '%' || COALESCE(student_turma, 'Nenhuma') || '%')
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

  -- Notificar todos os outros professores (como moderadores gerais) sem duplicar notificações
  FOR admin_rec IN 
    SELECT id FROM public.profiles 
    WHERE papel = 'professor' AND NOT (turma ILIKE '%' || COALESCE(post_author_turma, 'Nenhuma') || '%')
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

-- 5. ATUALIZAR POLÍTICAS RLS DO SUPABASE PARA PERMITIR PAPEL 'PROFESSOR' GERENCIAR TUDO

-- Tabela de perfis (profiles)
DROP POLICY IF EXISTS "Permitir update total para administradores" ON public.profiles;
DROP POLICY IF EXISTS "Permitir update total para professores" ON public.profiles;
CREATE POLICY "Permitir update total para professores" ON public.profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

-- Tabela de turmas (turmas)
DROP POLICY IF EXISTS "Permitir insert para administradores" ON public.turmas;
DROP POLICY IF EXISTS "Permitir insert para professores" ON public.turmas;
CREATE POLICY "Permitir insert para professores" ON public.turmas
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

DROP POLICY IF EXISTS "Permitir update para administradores" ON public.turmas;
DROP POLICY IF EXISTS "Permitir update para professores" ON public.turmas;
CREATE POLICY "Permitir update para professores" ON public.turmas
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

DROP POLICY IF EXISTS "Permitir delete para administradores" ON public.turmas;
DROP POLICY IF EXISTS "Permitir delete para professores" ON public.turmas;
CREATE POLICY "Permitir delete para professores" ON public.turmas
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

-- Tabela de denúncias (reports)
DROP POLICY IF EXISTS "Permitir update para administradores" ON public.reports;
DROP POLICY IF EXISTS "Permitir update para professores" ON public.reports;
CREATE POLICY "Permitir update para professores" ON public.reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

DROP POLICY IF EXISTS "Permitir delete para administradores" ON public.reports;
DROP POLICY IF EXISTS "Permitir delete para professores" ON public.reports;
CREATE POLICY "Permitir delete para professores" ON public.reports
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );

-- Tabela de logs do sistema (security_logs)
DROP POLICY IF EXISTS "Permitir exclusao de logs para administradores" ON public.security_logs;
DROP POLICY IF EXISTS "Permitir exclusao de logs para professores" ON public.security_logs;
CREATE POLICY "Permitir exclusao de logs para professores" ON public.security_logs
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND papel = 'professor')
    );
