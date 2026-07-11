import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

/**
 * Componente interno para redirecionar com aviso via toast de forma limpa e segura.
 */
const RedirecionarComMensagem = ({ to, mensagem }) => {
  const navigate = useNavigate();
  useEffect(() => {
    toast.error(mensagem);
    navigate(to, { replace: true });
  }, [navigate, to, mensagem]);
  return null;
};

/**
 * Componente de Ordem Superior (HOC) para proteger rotas.
 * Ele verifica se o usuário está logado e se tem o papel necessário.
 */
export const RotaProtegida = ({ children, apenasProfessor = false, apenasAdmin = false }) => {
  const { usuario, carregando, ehProfessor, ehAdmin } = useAuth();

  // 1. Enquanto o Supabase verifica a sessão, mostra um loader limpo
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 2. Se não estiver logado, manda para o Login
  if (!usuario) {
    return <RedirecionarComMensagem to="/login" mensagem="Por favor, faça login para acessar esta área." />;
  }

  // 3. Proteção por Papel (Role-Based Access Control)
  // Se exige ser professor/admin e não possui o papel, bloqueia
  if (apenasProfessor && !ehProfessor && !ehAdmin) {
    return <RedirecionarComMensagem to="/feed" mensagem="Você não possui permissão para acessar esta área." />;
  }

  // Se exige ser admin e não possui o papel, bloqueia
  if (apenasAdmin && !ehAdmin) {
    return <RedirecionarComMensagem to="/feed" mensagem="Você não possui permissão para acessar esta área." />;
  }

  return children;
};