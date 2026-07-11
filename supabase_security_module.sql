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
