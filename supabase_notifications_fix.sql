-- =========================================================================
-- SOLUÇÃO PARA O ERRO: check constraint "notifications_type_check"
-- Execute este script no SQL Editor do seu Painel do Supabase.
-- =========================================================================

-- 1. Remover a constraint de validação de tipo antiga
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Recriar a constraint permitindo os novos tipos de notificação ('moderation', 'approval', 'rejection')
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'comment', 'repost', 'follow', 'announcement', 'activity', 'turma', 'system', 'moderation', 'approval', 'rejection'));
