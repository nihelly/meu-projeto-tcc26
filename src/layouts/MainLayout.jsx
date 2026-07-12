import { useEffect, useState } from 'react';
import { Bell, Mail, Plus, X, Menu, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import SidebarAdmin from '../components/SidebarAdmin';
import SidebarProfessor from '../components/SidebarProfessor';
import SidebarAluno from '../components/SidebarAluno';
import BottomNav from '../components/BottomNav';
import GeometricBackground from '../components/GeometricBackground';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { translate } = useLanguage();
  const { usuario, perfil } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(() => {
    const saved = localStorage.getItem('unreadMessagesCount');
    return saved !== null ? Number(saved) : 3;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  // Sincronizar unreadMessagesCount com localStorage
  useEffect(() => {
    localStorage.setItem('unreadMessagesCount', unreadMessagesCount);
  }, [unreadMessagesCount]);

  // Monitoramento de Mensagens não lidas
  useEffect(() => {
    if (location.pathname === '/mensagens') {
      setUnreadMessagesCount(0);
      return;
    }

    async function fetchUnreadMessages() {
      if (!usuario) return;
      try {
        const { data: myMemberships } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', usuario.id);
        
        if (!myMemberships || myMemberships.length === 0) {
          return;
        }

        const convIds = myMemberships.map(m => m.conversation_id);

        const { data: unreadMsgs } = await supabase
          .from('messages')
          .select('id, read_by')
          .in('conversation_id', convIds)
          .neq('sender_id', usuario.id);

        if (unreadMsgs) {
          const count = unreadMsgs.filter(m => {
            const readList = Array.isArray(m.read_by) ? m.read_by : [];
            return !readList.includes(usuario.id);
          }).length;
          setUnreadMessagesCount(count);
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchUnreadMessages();
  }, [usuario, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    async function fetchReportCount() {
      if (!usuario || perfil?.papel !== 'administrador') return;
      try {
        const { count } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true });
        if (count !== null) setReportCount(count);
      } catch (err) {
        console.error(err);
      }
    }
    fetchReportCount();
  }, [usuario, perfil, location.pathname]);

  useEffect(() => {
    let channel = null;

    async function fetchUnreadCount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadNotificationsCount(count);
      }

      channel = supabase
        .channel('global-notifications-realtime')
        .on('postgres_changes', { 
          event: '*', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, async () => {
          const { count: newCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
          
          if (newCount !== null) {
            setUnreadNotificationsCount(newCount);
          }
        })
        .subscribe();
    }

    fetchUnreadCount();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [location.pathname]);

  // Mapeamento de rota para chaves de tradução
  const chavePorRota = {
    '/feed': 'feedTitle',
    '/busca': 'searchTitle',
    '/mensagens': 'messagesTitle',
    '/notificacoes': 'notificationsTitle',
    '/configuracoes': 'settingsTitle',
    '/criar-post': 'newPostTitle',
    '/criar-aviso': 'newAnnouncementTitle',
  };

  const renderSidebar = (onLinkClick, collapsed = sidebarCollapsed) => {
    const papel = perfil?.papel || 'aluno';
    if (papel === 'administrador') {
      return (
        <SidebarAdmin 
          unreadCount={unreadNotificationsCount} 
          unreadMessagesCount={unreadMessagesCount}
          reportCount={reportCount} 
          usuario={usuario} 
          perfil={perfil} 
          handleLogout={handleLogout} 
          onLinkClick={onLinkClick}
          collapsed={collapsed}
        />
      );
    }
    if (papel === 'professor') {
      return (
        <SidebarProfessor 
          unreadCount={unreadNotificationsCount} 
          unreadMessagesCount={unreadMessagesCount}
          usuario={usuario} 
          perfil={perfil} 
          handleLogout={handleLogout} 
          onLinkClick={onLinkClick}
          collapsed={collapsed}
        />
      );
    }
    return (
      <SidebarAluno 
        unreadCount={unreadNotificationsCount} 
        unreadMessagesCount={unreadMessagesCount}
        usuario={usuario} 
        perfil={perfil} 
        handleLogout={handleLogout} 
        onLinkClick={onLinkClick}
        collapsed={collapsed}
      />
    );
  };

  const getTituloAtual = () => {
    const chave = chavePorRota[location.pathname];
    if (chave) return translate(chave);
    if (location.pathname.startsWith('/perfil')) return translate('profileTitle');
    return 'EDUCONNECT';
  };

  const tituloAtual = getTituloAtual();

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const papel = perfil?.papel || '';
    const padraoEscuro = papel === 'professor' || papel === 'administrador';
    const savedDark = localStorage.getItem('educonnect-dark-mode');
    return savedDark !== null ? savedDark === 'true' : padraoEscuro;
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const papel = perfil?.papel || '';
      const padraoEscuro = papel === 'professor' || papel === 'administrador';
      const savedDark = localStorage.getItem('educonnect-dark-mode');
      setIsDarkTheme(savedDark !== null ? savedDark === 'true' : padraoEscuro);
    };
    window.addEventListener('theme-changed', handleThemeChange);
    // Adicionalmente, atualiza o tema se o perfil do usuário carregar
    handleThemeChange();
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, [perfil]);

  return (
    <div className={`flex min-h-screen w-full antialiased selection:bg-gray-100 relative z-[1] transition-colors duration-300 ${isDarkTheme ? 'dark-dashboard-teacher bg-[#08070d] text-white' : 'bg-[#fcfcfc] text-gray-900'}`}>
      <GeometricBackground />
      
      {/* 1. Sidebar Dinâmica Completa (Desktop) */}
      <aside className={`hidden md:flex flex-col justify-between p-0 h-screen sticky top-0 z-30 select-none flex-shrink-0 relative overflow-visible transition-all duration-350 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${isDarkTheme ? 'border-r border-white/5 bg-[#0d0c13]' : 'border-r border-gray-100 bg-white'}`}>
        {renderSidebar()}
        
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-6 -right-4.5 z-40 w-9 h-9 rounded-full flex items-center justify-center bg-violet-600 border border-violet-500 text-white shadow-lg cursor-pointer transition-all duration-300 hover:bg-violet-700 hover:scale-110"
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={18} strokeWidth={3} />
          ) : (
            <ChevronLeft size={18} strokeWidth={3} />
          )}
        </button>
      </aside>
 
      {/* 2. Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* HEADER SUPERIOR — Título + Ícones de ação */}
        <header className={`sticky top-0 z-20 backdrop-blur-md border-b transition-all duration-300 ${isDarkTheme ? 'bg-[#0d0c13]/80 border-white/5 text-white' : 'bg-white/80 border-gray-100'}`}>
          <div className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 md:px-12 h-16 flex items-center justify-between">
            
            {/* Título da página + Seta de voltar + Menu hambúrguer no celular */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(-1)}
                className={`p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${isDarkTheme ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}
                title="Voltar"
              >
                <ArrowLeft size={18} />
              </button>
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className={`md:hidden p-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-colors ${isDarkTheme ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-black hover:bg-gray-55'}`}
              >
                <Menu size={18} />
              </button>
              <h1 className={`text-[14px] font-bold tracking-[0.2em] uppercase ${isDarkTheme ? 'text-white' : 'text-gray-950'}`}>
                {tituloAtual}
              </h1>
            </div>

            {/* Ícones de ação */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigate('/notificacoes')} 
                className={`p-2.5 rounded-xl transition-colors cursor-pointer relative ${isDarkTheme ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                title={translate('notificationsTitle')}
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
              <button 
                onClick={() => navigate('/mensagens')} 
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${isDarkTheme ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                title={translate('messagesTitle')}
              >
                <Mail size={18} strokeWidth={1.8} />
              </button>
              <button 
                onClick={() => navigate('/criar-post')} 
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${isDarkTheme ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                title={translate('newPostTitle')}
              >
                <Plus size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo da página — padding inferior responsivo para acomodar bottom bar no celular */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 sm:px-8 sm:py-10 md:px-10 md:py-10 pb-20 md:pb-10 animate-in fade-in duration-300">
          {children}
        </main>
        
      </div>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/35 z-40 md:hidden animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
          <aside className={`fixed top-0 left-0 bottom-0 w-64 z-50 p-0 flex flex-col justify-between h-full border-r md:hidden animate-in slide-in-from-left duration-300 relative overflow-hidden ${isDarkTheme ? 'bg-[#0d0c13] border-white/5' : 'bg-white border-gray-100'}`}>
            
            {/* Botão de Fechar Mobile */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-2.5 right-2.5 p-1 bg-black/15 hover:bg-black/25 rounded-full text-white cursor-pointer z-50 transition-colors flex items-center justify-center"
            >
              <X size={14} />
            </button>

            {renderSidebar(() => setMobileMenuOpen(false))}
          </aside>
        </>
      )}

      {/* 3. Bottom bar para dispositivos móveis */}
      <BottomNav />
      
    </div>
  );
}
