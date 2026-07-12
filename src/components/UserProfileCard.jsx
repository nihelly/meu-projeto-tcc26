import { useNavigate } from 'react-router-dom';
import { ChevronRight, Crown, GraduationCap, User } from 'lucide-react';

export default function UserProfileCard({ usuario, perfil, collapsed }) {
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

  if (collapsed) {
    return (
      <div className="relative inline-block w-full select-none">
        <div 
          onClick={irParaPerfil}
          className="flex items-center justify-center p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl cursor-pointer transition-all duration-200"
          title={perfil?.nome || 'Usuário'}
        >
          <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
            {perfil?.avatar_url ? (
              <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#f3f4f6]/10 text-white/70 flex items-center justify-center text-[12.5px] font-bold">
                {perfil?.nome ? perfil.nome.substring(0, 1).toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </div>
        <div className={`w-5 h-5 rounded-full ${badge.bg} text-white flex items-center justify-center absolute -bottom-1.5 -right-1 shadow-md border-2 border-white animate-in zoom-in-50 duration-300`}>
          <BadgeIcon size={9} strokeWidth={2.2} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block w-full select-none">
      
      {/* Card principal do Perfil */}
      <div 
        onClick={irParaPerfil}
        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl cursor-pointer transition-all duration-200"
      >
        <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-white/10 border border-white/10 flex-shrink-0">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#f3f4f6]/10 text-white/70 flex items-center justify-center text-[12.5px] font-bold">
              {perfil?.nome ? perfil.nome.substring(0, 1).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-bold text-white leading-tight block truncate">{perfil?.nome || 'Usuário'}</span>
          <span className="text-[10px] text-[#8e8d97] font-medium block">{getRoleLabel()}</span>
        </div>
        <ChevronRight size={14} className="text-white/45" />
      </div>

      {/* Selo flutuante de papel (RBAC) */}
      <div className={`w-6 h-6 rounded-full ${badge.bg} text-white flex items-center justify-center absolute -bottom-1.5 -right-1 shadow-md border-2 border-white animate-in zoom-in-50 duration-300`}>
        <BadgeIcon size={11} strokeWidth={2.2} />
      </div>

    </div>
  );
}
