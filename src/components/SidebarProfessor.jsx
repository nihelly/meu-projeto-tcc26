import { 
  Home, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Calendar, 
  LayoutDashboard, 
  Bell, 
  User 
} from 'lucide-react';
import MenuItem from './MenuItem';
import SidebarFooter from './SidebarFooter';
import logoEduconnect from '../assets/logo-educonnect.png';

export default function SidebarProfessor({ unreadCount, usuario, perfil, handleLogout, onLinkClick }) {
  return (
    <div className="flex flex-col h-full w-full select-none">
      
      {/* Banner Superior Azul */}
      <div className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner">
        MENU - PROFESSOR
      </div>

      {/* Área Interna com Rolagem se necessário */}
      <div className="flex-1 flex flex-col justify-between p-5 overflow-y-auto min-h-0 space-y-6">
        
        <div className="space-y-6">
          {/* Logo e Nome */}
          <div className="flex items-center gap-2.5 px-3 py-1">
            <img src={logoEduconnect} alt="EduConnect" className="w-7 h-7 object-contain" />
            <span className="font-bold text-[16px] text-gray-950 tracking-tight">EduConnect</span>
          </div>

          {/* Lista de Navegação */}
          <nav className="space-y-1">
            <MenuItem to="/professor" label="Início" icon={Home} isHome={true} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={3} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Turmas" icon={GraduationCap} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Calendário" icon={Calendar} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/professor" label="Painel do Professor" icon={LayoutDashboard} papel="professor" onClick={onLinkClick} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="professor" onClick={onLinkClick} />
            <MenuItem to={`/perfil/${usuario?.id}`} label="Perfil" icon={User} papel="professor" onClick={onLinkClick} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} />

      </div>

    </div>
  );
}
