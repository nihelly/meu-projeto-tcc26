import { LogOut } from 'lucide-react';
import UserProfileCard from './UserProfileCard';

export default function SidebarFooter({ usuario, perfil, handleLogout }) {
  return (
    <div className="space-y-3 mt-auto pt-4 border-t border-gray-100">
      <UserProfileCard usuario={usuario} perfil={perfil} />
      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100/80 text-red-650 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-red-500/5"
      >
        <LogOut size={13} strokeWidth={2.2} />
        Sair da conta
      </button>
    </div>
  );
}
