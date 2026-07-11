import { NavLink, useLocation } from 'react-router-dom';

const activeLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 font-bold transition-all text-[13px]";
const inactiveLinkClass = "flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all text-[13px]";

export default function MenuItem({ to, label, icon: Icon, badge, isHome, papel, onClick }) {
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
    >
      <Icon size={18} strokeWidth={1.8} />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-violet-100 text-violet-700 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  );
}
