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
