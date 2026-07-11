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

export default function SidebarAluno({ unreadCount, usuario, perfil, handleLogout, onLinkClick }) {
  return (
    <div className="flex flex-col h-full w-full select-none bg-[#0d0c13] text-white">
      
      {/* Banner Superior Verde/Teal */}
      <div className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold text-[9.5px] tracking-wider uppercase py-2.5 text-center flex items-center justify-center shadow-inner">
        MENU - ALUNO
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
          <nav className="space-y-1">
            <MenuItem to="/feed" label="Início" icon={Home} isHome={true} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/feed" label="Feed" icon={FileText} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/mensagens" label="Mensagens" icon={MessageSquare} badge={3} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Turma" icon={GraduationCap} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/turmas" label="Calendário" icon={Calendar} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/notificacoes" label="Notificações" icon={Bell} badge={unreadCount} papel="aluno" onClick={onLinkClick} />
            <MenuItem to={`/perfil/${usuario?.id}`} label="Perfil" icon={User} papel="aluno" onClick={onLinkClick} />
            <MenuItem to="/privacidade" label="Configurações" icon={Settings} papel="aluno" onClick={onLinkClick} />
          </nav>
        </div>

        {/* Rodapé e Perfil */}
        <SidebarFooter usuario={usuario} perfil={perfil} handleLogout={handleLogout} />

      </div>

    </div>
  );
}
