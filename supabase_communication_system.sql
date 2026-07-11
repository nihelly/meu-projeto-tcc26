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
