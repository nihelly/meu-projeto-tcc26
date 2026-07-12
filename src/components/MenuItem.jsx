import { NavLink, useLocation } from 'react-router-dom';

const activeLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white text-violet-700 font-black transition-all text-[13px] shadow-sm";
const inactiveLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#8e8d97] hover:bg-white/5 hover:text-white transition-all text-[13px]";

export default function MenuItem({ to, label, icon: Icon, badge, isHome, papel, onClick, collapsed }) {
  const location = useLocation();

  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => {
        if (isHome) {
          const isHomeActive = papel === 'administrador' 
            ? location.pathname.startsWith('/admin')
            : papel === 'professor' 
              ? location.pathname.startsWith('/professor')
              : location.pathname === '/feed' && !location.search;
          return isHomeActive ? activeLinkClass : inactiveLinkClass;
        }
        if (to === '/feed' && !isHome) {
          return location.pathname === '/feed' ? activeLinkClass : inactiveLinkClass;
        }
        return isActive ? activeLinkClass : inactiveLinkClass;
      }}
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
