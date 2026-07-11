import { useEffect, useState } from 'react';
import { Bell, Mail, Plus, X, Menu } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportCount, setReportCount] = useState(0);

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

  const renderSidebar = (onLinkClick) => {
    const papel = perfil?.papel || 'aluno';
    if (papel === 'administrador') {
      return (
        <SidebarAdmin 
          unreadCount={unreadNotificationsCount} 
          reportCount={reportCount} 
          usuario={usuario} 
          perfil={perfil} 
          handleLogout={handleLogout} 
          onLinkClick={onLinkClick}
        />
      );
    }
    if (papel === 'professor') {
      return (
        <SidebarProfessor 
          unreadCount={unreadNotificationsCount} 
          usuario={usuario} 
          perfil={perfil} 
          handleLogout={handleLogout} 
          onLinkClick={onLinkClick}
        />
      );
    }
    return (
      <SidebarAluno 
        unreadCount={unreadNotificationsCount} 
        usuario={usuario} 
        perfil={perfil} 
        handleLogout={handleLogout} 
        onLinkClick={onLinkClick}
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

  return (
    <div className="flex min-h-screen w-full bg-[#fcfcfc] text-gray-900 antialiased selection:bg-gray-100 relative z-[1]">
      <GeometricBackground />
      
      {/* 1. Sidebar Dinâmica Completa (Desktop) */}
      <aside className="hidden md:flex w-64 border-r border-gray-100 bg-[#0d0c13] flex-col justify-between p-0 h-screen sticky top-0 select-none flex-shrink-0 relative overflow-hidden">
        {renderSidebar()}
      </aside>
 
      {/* 2. Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* HEADER SUPERIOR — Título + Ícones de ação */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 md:px-12 h-14 flex items-center justify-between">
            
            {/* Título da página + Menu hambúrguer no celular */}
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 text-gray-500 hover:text-black hover:bg-gray-55 rounded-lg cursor-pointer flex items-center justify-center transition-colors"
              >
                <Menu size={18} />
              </button>
              <h1 className="text-[14px] font-bold text-gray-950 tracking-[0.2em] uppercase">
                {tituloAtual}
              </h1>
            </div>

            {/* Ícones de ação */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigate('/notificacoes')} 
                className="p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer relative"
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
                className="p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer"
                title={translate('messagesTitle')}
              >
                <Mail size={18} strokeWidth={1.8} />
              </button>
              <button 
                onClick={() => navigate('/criar-post')} 
                className="p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 cursor-pointer"
                title={translate('newPostTitle')}
              >
                <Plus size={18} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </header>

        {/* Conteúdo da página — padding inferior responsivo para acomodar bottom bar no celular */}
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-6 sm:px-8 sm:py-8 md:px-12 md:py-8 pb-20 md:pb-8 animate-in fade-in duration-300">
          {children}
        </main>
        
      </div>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/35 z-40 md:hidden animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 p-0 flex flex-col justify-between h-full border-r border-gray-100 md:hidden animate-in slide-in-from-left duration-300 relative overflow-hidden">
            
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
