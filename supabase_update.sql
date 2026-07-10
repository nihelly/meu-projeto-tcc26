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
