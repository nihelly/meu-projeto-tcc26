import { useEffect, useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Bell, 
  Calendar, 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Settings, 
  Search, 
  ChevronDown,
  Menu,
  X,
  LogOut,
  Shield,
  User,
  Lock,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import logoEduconnect from '../assets/logo-educonnect.png';
import sidebarGirl from '../assets/globo.png'; // We have globo.png in assets, or we can use it or a placeholder/generated illustration

export function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, perfil } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPostsCount, setPendingPostsCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [bellDropdownOpen, setBellDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);

  useEffect(() => {
    async function fetchRecent() {
      if (!usuario) return;
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', usuario.id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (data) setRecentNotifications(data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchRecent();
  }, [usuario, location.pathname, unreadCount]);

  useEffect(() => {
    async function fetchUnreadCount() {
      if (!usuario) return;
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', usuario.id)
        .eq('is_read', false);
      if (count !== null) setUnreadCount(count);
    }
    fetchUnreadCount();
  }, [usuario, location.pathname]);

  useEffect(() => {
    async function fetchPendingCount() {
      if (!usuario || !perfil) return;
      try {
        let query = supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'Aguardando aprovação');
        if (perfil.papel === 'professor') {
          const { data: allProfiles } = await supabase.from('profiles').select('id, turma');
          if (allProfiles) {
            const classesProf = perfil.turma ? perfil.turma.split(',').map(s => s.trim().toLowerCase()) : [];
            const allowedUserIds = allProfiles.filter(p => p.turma && classesProf.includes(p.turma.trim().toLowerCase())).map(p => p.id);
            query = query.in('user_id', allowedUserIds);
          }
        }
        const { count } = await query;
        if (count !== null) setPendingPostsCount(count);
      } catch (err) {
        console.error(err);
      }
    }
    fetchPendingCount();
  }, [usuario, perfil, location.pathname]);

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

  const isAbaActive = (abaName, path = '/professor') => {
    const params = new URLSearchParams(location.search);
    const currentAba = params.get('aba') || 'dashboard';
    return location.pathname === path && currentAba === abaName;
  };

  const activeLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-bold transition-all text-[13px]";
  const inactiveLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all text-[13px]";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const currentRoleLabel = () => {
    if (perfil?.papel === 'administrador') return 'Administrador';
    if (perfil?.papel === 'professor') return 'Professor';
    return 'Aluno';
  };

  const getSidebarLinks = () => {
    const papel = perfil?.papel || 'aluno';

    if (papel === 'administrador') {
      return [
        { to: '/admin', label: 'Início', icon: Home, isHome: true },
        { to: '/feed', label: 'Feed', icon: FileText },
        { to: '/mensagens', label: 'Mensagens', icon: MessageSquare, badge: 3 },
        { to: '/turmas', label: 'Turmas', icon: GraduationCap },
        { to: '/turmas', label: 'Calendário', icon: Calendar },
        { to: '/gerenciar-usuarios', label: 'Gerenciar Usuários', icon: Users },
        { to: '/admin?aba=moderacao', label: 'Moderação', icon: AlertTriangle, badge: reportCount },
        { to: '/professor', label: 'Painel do Professor', icon: LayoutDashboard },
        { to: '/admin', label: 'Painel do Administrador', icon: LayoutDashboard },
        { to: '/notificacoes', label: 'Notificações', icon: Bell, badge: unreadCount },
        { to: '/seguranca', label: 'Segurança', icon: Shield },
        { to: '/privacidade', label: 'Configurações', icon: Settings },
      ];
    }

    if (papel === 'professor') {
      return [
        { to: '/professor', label: 'Início', icon: Home, isHome: true },
        { to: '/feed', label: 'Feed', icon: FileText },
        { to: '/mensagens', label: 'Mensagens', icon: MessageSquare, badge: 3 },
        { to: '/turmas', label: 'Turmas', icon: GraduationCap },
        { to: '/turmas', label: 'Calendário', icon: Calendar },
        { to: '/professor', label: 'Painel do Professor', icon: LayoutDashboard },
        { to: '/notificacoes', label: 'Notificações', icon: Bell, badge: unreadCount },
        { to: `/perfil/${usuario?.id}`, label: 'Perfil', icon: User },
      ];
    }

    // Default/Aluno
    return [
      { to: '/feed', label: 'Início', icon: Home, isHome: true },
      { to: '/feed', label: 'Feed', icon: FileText },
      { to: '/mensagens', label: 'Mensagens', icon: MessageSquare, badge: 3 },
      { to: '/turmas', label: 'Turma', icon: GraduationCap },
      { to: '/turmas', label: 'Calendário', icon: Calendar },
      { to: '/notificacoes', label: 'Notificações', icon: Bell, badge: unreadCount },
      { to: `/perfil/${usuario?.id}`, label: 'Perfil', icon: User },
    ];
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] text-gray-900 flex relative font-sans">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 border-r border-gray-100 bg-white flex-col justify-between p-6 h-screen sticky top-0 select-none flex-shrink-0">
        <div className="space-y-6">
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5 px-3 py-1 cursor-pointer" onClick={() => navigate('/feed')}>
            <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain" />
            <span className="font-bold text-[16px] text-gray-950 tracking-tight">EduConnect</span>
          </div>

          {/* Links Dinâmicos por Papel */}
          <nav className="space-y-1">
            {getSidebarLinks().map((link, idx) => {
              const Icone = link.icon;
              return (
                <NavLink 
                  key={idx}
                  to={link.to} 
                  className={({ isActive }) => {
                    if (link.isHome) {
                      const isHomeActive = perfil?.papel === 'administrador' 
                        ? location.pathname.startsWith('/admin')
                        : perfil?.papel === 'professor' 
                          ? location.pathname.startsWith('/professor')
                          : location.pathname === '/feed' && !location.search;
                      return isHomeActive ? activeLinkClass : inactiveLinkClass;
                    }
                    if (link.to === '/feed' && !link.isHome) {
                      return location.pathname === '/feed' ? activeLinkClass : inactiveLinkClass;
                    }
                    return isActive ? activeLinkClass : inactiveLinkClass;
                  }}
                >
                  <Icone size={18} strokeWidth={1.8} />
                  <span>{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="ml-auto bg-violet-100 text-violet-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Card Promocional Rodapé */}
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50/50 rounded-2xl p-4 border border-violet-100/50 text-center relative overflow-hidden mt-6">
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-white/40 rounded-full blur-xl" />
          {sidebarGirl && (
            <img src={sidebarGirl} alt="Illustration" className="w-16 h-16 object-contain mx-auto mb-2 opacity-90" />
          )}
          <p className="text-[11px] text-gray-700 leading-normal mb-3 font-medium">
            Conecte alunos, professores e ideias em um só lugar.
          </p>
          <button 
            onClick={() => navigate('/busca')} 
            className="w-full bg-[#6366f1] hover:bg-[#5053e1] text-white font-bold text-[11px] py-2 rounded-xl transition-all cursor-pointer shadow-sm shadow-indigo-500/10"
          >
            Saiba mais
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* BARRA SUPERIOR */}
        <header className="h-16 border-b border-gray-100 bg-white sticky top-0 z-20 flex items-center justify-between px-6">
          {/* Busca no EduConnect */}
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="md:hidden p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-[#f9fafb] border border-gray-100 rounded-xl px-3 py-1.5 w-64 text-gray-400 focus-within:border-gray-200 transition-all">
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Buscar no EduConnect..." 
                className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate('/busca');
                }}
              />
            </div>
          </div>

          {/* Ações Direitas */}
          <div className="flex items-center gap-4">
            {/* Notificações */}
            <div className="relative">
              <button 
                onClick={() => setBellDropdownOpen(!bellDropdownOpen)}
                className="p-2 text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl relative transition-all cursor-pointer"
              >
                <Bell size={18} strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-violet-650 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setBellDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-lg p-4 z-45 animate-in fade-in duration-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                      <span className="font-bold text-[12px] text-gray-900 font-sans">Notificações Recentes</span>
                      <button 
                        onClick={() => {
                          setBellDropdownOpen(false);
                          navigate('/notificacoes');
                        }}
                        className="text-[10px] text-violet-600 font-bold hover:underline cursor-pointer"
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="divide-y divide-gray-55 space-y-2 max-h-60 overflow-y-auto">
                      {recentNotifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={async () => {
                            setBellDropdownOpen(false);
                            await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                            navigate('/notificacoes');
                          }}
                          className={`pt-2 text-[11px] text-gray-605 hover:text-black cursor-pointer ${!n.is_read ? 'font-extrabold text-gray-900' : ''}`}
                        >
                          <p className="line-clamp-2">{n.content}</p>
                          <span className="text-[9px] text-gray-400 font-light block mt-0.5">{new Date(n.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                      {recentNotifications.length === 0 && (
                        <p className="text-center py-4 text-gray-450 text-[11px]">Nenhuma notificação recente.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Perfil com Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 text-left p-1 hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0">
                  {perfil?.avatar_url ? (
                    <img src={perfil.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#f3f4f6] text-[#9ca3af] flex items-center justify-center text-[13px] font-bold">
                      {perfil?.nome ? perfil.nome.substring(0, 1).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-[12px] font-bold text-gray-950 leading-tight">{perfil?.nome || 'Usuário'}</div>
                  <div className="text-[10px] text-gray-400 leading-tight font-medium">{currentRoleLabel()}</div>
                </div>
                <ChevronDown size={14} className="text-gray-400 hidden md:block" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg p-2 z-45 animate-in fade-in duration-200">
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate(`/perfil/${usuario?.id}`);
                      }}
                      className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Meu Perfil
                    </button>
                    <button 
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/configuracoes');
                      }}
                      className="w-full text-left px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                    >
                      Configurações
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut size={13} />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto max-w-[1200px] w-full mx-auto animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/35 z-40 md:hidden animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-64 bg-white z-50 p-6 flex flex-col justify-between h-full border-r border-gray-100 md:hidden animate-in slide-in-from-left duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain" />
                  <span className="font-bold text-[16px] text-gray-950 tracking-tight">EduConnect</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-black cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Links Dinâmicos por Papel Mobile */}
              <nav className="space-y-1">
                {getSidebarLinks().map((link, idx) => {
                  const Icone = link.icon;
                  return (
                    <NavLink 
                      key={idx}
                      to={link.to} 
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => {
                        if (link.isHome) {
                          const isHomeActive = perfil?.papel === 'administrador' 
                            ? location.pathname.startsWith('/admin')
                            : perfil?.papel === 'professor' 
                              ? location.pathname.startsWith('/professor')
                              : location.pathname === '/feed' && !location.search;
                          return isHomeActive ? activeLinkClass : inactiveLinkClass;
                        }
                        if (link.to === '/feed' && !link.isHome) {
                          return location.pathname === '/feed' ? activeLinkClass : inactiveLinkClass;
                        }
                        return isActive ? activeLinkClass : inactiveLinkClass;
                      }}
                    >
                      <Icone size={18} strokeWidth={1.8} />
                      <span>{link.label}</span>
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className="ml-auto bg-violet-100 text-violet-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                          {link.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé Mobile */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 border border-violet-100 text-center relative overflow-hidden mt-6">
              <p className="text-[11px] text-gray-700 leading-normal mb-3 font-medium">
                Conecte alunos, professores e ideias em um só lugar.
              </p>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/busca');
                }} 
                className="w-full bg-[#6366f1] text-white font-bold text-[11px] py-2 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Saiba mais
              </button>
            </div>
          </aside>
        </>
      )}
      
    </div>
  );
}
