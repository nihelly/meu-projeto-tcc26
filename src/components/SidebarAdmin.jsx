import { useEffect, useRef } from 'react';
import { 
  Home, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Calendar, 
  Users, 
  AlertTriangle, 
  LayoutDashboard, 
  Bell, 
  Lock, 
  Settings 
} from 'lucide-react';
import MenuItem from './MenuItem';
import SidebarFooter from './SidebarFooter';
import logoEduconnect from '../assets/logo-educonnect.png';

export default function SidebarAdmin({ unreadCount, unreadMessagesCount, reportCount, usuario, perfil, handleLogout, onLinkClick, collapsed }) {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const savedScroll = localStorage.getItem('sidebar-admin-scroll');
    if (savedScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  const handleScroll = (e) => {
    localStorage.setItem('sidebar-admin-scroll', e.target.scrollTop);
  };

  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0d0c13] text-white">
      
      {/* Banner Superior Roxo */}
      {!collapsed && (
        <div className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner animate-in fade-in duration-300">
          MENU - ADMINISTRADOR
        </div>
      )}

      {/* Área Interna com Rolagem se necessário */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 flex flex-col justify-between overflow-y-auto min-h-0 space-y-6 ${collapsed ? 'p-3' : 'p-5'}`}
      >
        
        <div className="space-y-6">
          {/* Logo e Nome */}
          <div className={`flex items-center gap-2.5 px-3 py-1 ${collapsed ? 'justify-center' : ''}`}>
            <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain animate-pulse" />
            {!collapsed && <span className="font-bold text-[16px] text-white tracking-tight animate-in fade-in duration-300">EduConnect</span>}
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-2">
            <MenuItem to="/admin" label="Início" icon={Home} isHome={true} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={unreadMessagesCount} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/turmas" label="Turmas" icon={GraduationCap} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/turmas" label="Calendário" icon={Calendar} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/gerenciar-usuarios" label="Gerenciar Usuários" icon={Users} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/moderar-postagens" label="Moderação" icon={AlertTriangle} badge={reportCount} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/professor" label="Painel do Professor" icon={LayoutDashboard} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/admin" label="Painel do Administrador" icon={LayoutDashboard} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/seguranca" label="Segurança" icon={Lock} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/privacidade" label="Configurações" icon={Settings} papel="administrador" onClick={onLinkClick} collapsed={collapsed} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} collapsed={collapsed} />

      </div>

    </div>
  );
}
