import { NavLink, useLocation } from 'react-router-dom';

const activeLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-violet-700 font-black transition-all text-[13px] shadow-sm";
const inactiveLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#8e8d97] hover:bg-white/5 hover:text-white transition-all text-[13px]";

export default function MenuItem({ to, label, icon: Icon, badge, isHome, papel, onClick, collapsed }) {
  const location = useLocation();

  const checkIsActive = () => {
    // 1. Caso especial: Início (isHome)
    if (isHome) {
      if (papel === 'professor') {
        const params = new URLSearchParams(location.search);
        return location.pathname === '/professor' && !params.get('aba');
      }
      if (papel === 'administrador') {
        return location.pathname.startsWith('/admin');
      }
      return location.pathname === '/feed' && !location.search;
    }

    // 2. Rotas com query params específicas (ex: /professor?aba=atividades)
    if (to.includes('?')) {
      const [targetPath, targetSearch] = to.split('?');
      const targetParams = new URLSearchParams(targetSearch);
      const currentParams = new URLSearchParams(location.search);
      
      const pathMatches = location.pathname === targetPath;
      let paramsMatch = true;
      for (const [key, val] of targetParams.entries()) {
        if (currentParams.get(key) !== val) {
          paramsMatch = false;
          break;
        }
      }
      return pathMatches && paramsMatch;
    }

    // 3. Rotas normais (ex: /feed, /turmas, /mensagens)
    if (to === '/feed') {
      return location.pathname === '/feed';
    }
    return location.pathname === to;
  };

  const active = checkIsActive();

  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={active ? activeLinkClass : inactiveLinkClass}
      title={collapsed ? label : undefined}
    >
      <Icon size={18} strokeWidth={1.8} className={collapsed ? 'mx-auto' : ''} />
      {!collapsed && <span>{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-violet-100 text-violet-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
