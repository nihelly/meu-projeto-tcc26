import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  async function atualizarUltimoAcesso(id) {
    try {
      await supabase
        .from('profiles')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Erro ao atualizar ultimo acesso:', err.message);
    }
  }

  async function buscarPerfil(id) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
      } else {
        if (data?.status === 'Bloqueado' || data?.status === 'bloqueado') {
          toast.error("Acesso Negado", { description: "Sua conta foi bloqueada por um administrador." });
          await supabase.auth.signOut();
          setPerfil(null);
          setUsuario(null);
          setCarregando(false);
          return;
        }
        setPerfil(data);
        atualizarUltimoAcesso(id);
      }
    } catch (err) {
      console.error('Erro ao buscar perfil no Supabase:', err.message);
    } finally {
      setCarregando(false);
    }
  }

  async function recarregarPerfil() {
    if (usuario) {
      await buscarPerfil(usuario.id);
    }
  }

  useEffect(() => {
    // 1. Pega a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null);
      if (session?.user) {
        buscarPerfil(session.user.id);
      } else {
        setCarregando(false);
      }
    });

    // 2. Escuta mudanças (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null);
      if (session?.user) {
        buscarPerfil(session.user.id);
      } else {
        setPerfil(null);
        setCarregando(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = { 
    usuario, 
    perfil, 
    carregando, 
    ehProfessor: perfil?.papel === 'professor',
    ehAdmin: perfil?.papel === 'professor',
    recarregarPerfil
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
