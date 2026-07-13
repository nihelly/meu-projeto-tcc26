import { useEffect, useRef } from 'react';
import { 
  Home, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Users,
  Shield,
  Megaphone,
  BarChart3,
  Calendar, 
  Bell, 
  Lock,
  User,
  Settings
} from 'lucide-react';
import MenuItem from './MenuItem';
import SidebarFooter from './SidebarFooter';
import logoEduconnect from '../assets/logo-educonnect.png';

export default function SidebarProfessor({ unreadCount, unreadMessagesCount, reportCount, usuario, perfil, handleLogout, onLinkClick, collapsed }) {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const savedScroll = localStorage.getItem('sidebar-professor-scroll');
    if (savedScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  const handleScroll = (e) => {
    localStorage.setItem('sidebar-professor-scroll', e.target.scrollTop);
  };

  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0d0c13] text-white">
      
      {/* Banner Superior Azul */}
      {!collapsed && (
        <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-650 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner animate-in fade-in duration-300">
          MENU - PROFESSOR
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
            <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain" />
            {!collapsed && <span className="font-bold text-[16px] text-white tracking-tight animate-in fade-in duration-300">EduConnect</span>}
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-2">
            <MenuItem to="/professor" label="Início" icon={Home} isHome={true} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={unreadMessagesCount} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/turmas" label="Turmas" icon={GraduationCap} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/gerenciar-usuarios" label="Gerenciar Usuários" icon={Users} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/moderar-postagens" label="Moderação" icon={Shield} badge={reportCount} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/professor?aba=atividades" label="Gerenciar Atividades" icon={FileText} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/professor?aba=avisos" label="Avisos" icon={Megaphone} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/professor?aba=relatorios" label="Relatórios" icon={BarChart3} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/professor?aba=calendario" label="Calendário" icon={Calendar} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/seguranca" label="Segurança" icon={Lock} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to="/configuracoes" label="Configurações" icon={Settings} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
            <MenuItem to={`/perfil/${usuario?.id}`} label="Perfil" icon={User} papel="professor" onClick={onLinkClick} collapsed={collapsed} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} collapsed={collapsed} />

      </div>

    </div>
  );
}
