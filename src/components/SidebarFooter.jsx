import { LogOut } from 'lucide-react';
import UserProfileCard from './UserProfileCard';

export default function SidebarFooter({ usuario, perfil, handleLogout }) {
  const isDark = !!perfil?.papel;

  return (
    <div className="space-y-3 mt-auto pt-4 border-t border-white/10">
      <UserProfileCard usuario={usuario} perfil={perfil} />
      <button 
        onClick={handleLogout}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm ${
          isDark 
            ? 'bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30' 
            : 'bg-red-50 hover:bg-red-100/80 text-red-650 shadow-red-500/5'
        }`}
      >
        <LogOut size={13} strokeWidth={2.2} />
        Sair da conta
      </button>
    </div>
  );
}
