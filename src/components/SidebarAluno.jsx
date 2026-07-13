import { useEffect, useRef } from 'react';
import { 
  Home, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Calendar, 
  Bell, 
  User,
  Settings
} from 'lucide-react';
import MenuItem from './MenuItem';
import SidebarFooter from './SidebarFooter';
import logoEduconnect from '../assets/logo-educonnect.png';

export default function SidebarAluno({ unreadCount, unreadMessagesCount, usuario, perfil, handleLogout, onLinkClick, collapsed }) {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const savedScroll = localStorage.getItem('sidebar-aluno-scroll');
    if (savedScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  const handleScroll = (e) => {
    localStorage.setItem('sidebar-aluno-scroll', e.target.scrollTop);
  };

  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0d0c13] text-white">
      
      {/* Banner Superior Verde/Teal */}
      {!collapsed && (
        <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner animate-in fade-in duration-300">
          MENU - ALUNO
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
            <MenuItem to="/feed" label="Início" icon={Home} isHome={true} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={unreadMessagesCount} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/turmas" label="Turma" icon={GraduationCap} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/turmas" label="Calendário" icon={Calendar} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to={`/perfil/${usuario?.id}`} label="Perfil" icon={User} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/privacidade" label="Configurações" icon={Settings} papel="aluno" onClick={onLinkClick} collapsed={collapsed} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} collapsed={collapsed} />

      </div>

    </div>
  );
}
