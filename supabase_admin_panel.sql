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
