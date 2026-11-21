import { NavLink } from 'react-router-dom';
import { GraduationCap, X } from 'lucide-react';
import { navItems } from '../../data/navItems.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = navItems.filter((i) => i.roles.includes(user.role));

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo"><GraduationCap size={22} /></div>
          <span>Campus Track</span>
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {items.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">© 2026 Campus Track</div>
      </aside>
    </>
  );
}
