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

export default function SidebarAdmin({ unreadCount, unreadMessagesCount, reportCount, usuario, perfil, handleLogout, onLinkClick }) {
  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0d0c13] text-white">
      
      {/* Banner Superior Roxo */}
      <div className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner">
        MENU - ADMINISTRADOR
      </div>

      {/* Área Interna com Rolagem se necessário */}
      <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto min-h-0 space-y-6">
        
        <div className="space-y-6">
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5 px-3 py-1">
            <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain animate-pulse" />
            <span className="font-bold text-[16px] text-white tracking-tight">EduConnect</span>
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-2">
            <MenuItem to="/admin" label="Início" icon={Home} isHome={true} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={unreadMessagesCount} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Turmas" icon={GraduationCap} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Calendário" icon={Calendar} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/gerenciar-usuarios" label="Gerenciar Usuários" icon={Users} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/moderar-postagens" label="Moderação" icon={AlertTriangle} badge={reportCount} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/professor" label="Painel do Professor" icon={LayoutDashboard} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/admin" label="Painel do Administrador" icon={LayoutDashboard} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/seguranca" label="Segurança" icon={Lock} papel="administrador" onClick={onLinkClick} />
            <MenuItem to="/privacidade" label="Configurações" icon={Settings} papel="administrador" onClick={onLinkClick} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} />

      </div>

    </div>
  );
}
