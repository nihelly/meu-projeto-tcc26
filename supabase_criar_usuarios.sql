-- ============================================================
-- EDUCONNECT — CRIAÇÃO DOS 3 USUÁRIOS DE TESTE
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- Configurar search path para garantir acesso aos esquemas e extensões
SET search_path = public, auth, extensions;

-- 1. CRIAR USUÁRIO: PROFESSOR
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'professor@conecta.com',
  extensions.crypt('Tcc2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"nome": "Prof. Dr. Roberto", "matricula": "100001", "papel": "professor"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

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
)
ON CONFLICT (id) DO NOTHING;


-- 2. CRIAR USUÁRIO: ALUNO 1
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-2222-2222-222222222222',
  'authenticated', 'authenticated',
  'aluno1@conecta.com',
  extensions.crypt('Tcc2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"nome": "Ana Silva", "matricula": "200001", "papel": "aluno"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

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
)
ON CONFLICT (id) DO NOTHING;


-- 3. CRIAR USUÁRIO: ALUNO 2
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  created_at, updated_at, confirmed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'c3333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated',
  'aluno2@conecta.com',
  extensions.crypt('Tcc2026!', extensions.gen_salt('bf')),
  NOW(),
  '{"nome": "Carlos Mendes", "matricula": "200002", "papel": "aluno"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  NOW(), NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

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
)
ON CONFLICT (id) DO NOTHING;
