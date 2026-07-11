import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, GraduationCap, User } from 'lucide-react';

export default function UserProfileCard({ usuario, perfil }) {
  const navigate = useNavigate();

  const papel = perfil?.papel || 'aluno';

  const getRoleLabel = () => {
    if (papel === 'administrador') return 'Administrador';
    if (papel === 'professor') return 'Professor';
    return 'Aluno';
  };

  const getFloatingBadge = () => {
    if (papel === 'administrador') {
      return {
        bg: 'bg-violet-600',
        icon: Crown
      };
    }
    if (papel === 'professor') {
      return {
        bg: 'bg-blue-600',
        icon: GraduationCap
      };
    }
    return {
      bg: 'bg-teal-600',
      icon: User
    };
  };

  const badge = getFloatingBadge();
  const BadgeIcon = badge.icon;

  const irParaPerfil = () => {
    if (usuario?.id) {
      navigate(`/perfil/${usuario.id}`);
    }
  };

  return (
    <div className="relative inline-block w-full select-none">
      
      {/* Card principal do Perfil */}
      <div 
        onClick={irParaPerfil}
        className="flex items-center gap-3 p-3 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer transition-all duration-200"
      >
        <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f3f4f6] text-[#9ca3af] flex items-center justify-center text-[12.5px] font-bold">
              {perfil?.nome ? perfil.nome.substring(0, 1).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-bold text-gray-950 leading-tight block truncate">{perfil?.nome || 'Usuário'}</span>
          <span className="text-[10px] text-gray-400 font-medium block">{getRoleLabel()}</span>
        </div>
        <ChevronRight size={14} className="text-gray-400" />
      </div>

      {/* Selo flutuante de papel (RBAC) */}
      <div className={`w-6 h-6 rounded-full ${badge.bg} text-white flex items-center justify-center absolute -bottom-1.5 -right-1 shadow-md border-2 border-white animate-in zoom-in-50 duration-300`}>
        <BadgeIcon size={11} strokeWidth={2.2} />
      </div>

    </div>
  );
}
