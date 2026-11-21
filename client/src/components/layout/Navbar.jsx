import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fmtDate, cap } from '../../utils/format.js';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState({ items: [], unread: 0 });

  const fetchNotifs = useCallback(() => {
    api.get('/notifications').then(setNotifs).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 60000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  const openNotif = async (n) => {
    setOpen(false);
    if (!n.read) { await api.patch(`/notifications/${n._id}/read`).catch(() => {}); fetchNotifs(); }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => { await api.patch('/notifications/read-all').catch(() => {}); fetchNotifs(); };

  return (
    <header className="navbar no-print">
      <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>

      <div className="navbar-right">
        <div className="notif-wrap">
          <button className="icon-btn notif-btn" aria-label="Notifications" onClick={() => { setOpen((o) => !o); fetchNotifs(); }}>
            <Bell size={20} />
            {notifs.unread > 0 && <span className="notif-count">{notifs.unread > 9 ? '9+' : notifs.unread}</span>}
          </button>
          {open && (
            <>
              <div className="dropdown-backdrop" onClick={() => setOpen(false)} />
              <div className="dropdown">
                <div className="dropdown-head">
                  <strong>Notifications</strong>
                  {notifs.unread > 0 && <button className="link-btn" onClick={readAll}>Mark all read</button>}
                </div>
                {notifs.items.length === 0 ? (
                  <p className="dropdown-empty">No notifications yet</p>
                ) : notifs.items.map((n) => (
                  <button key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => openNotif(n)}>
                    <strong>{n.title}</strong>
                    {n.message && <span>{n.message}</span>}
                    <small>{fmtDate(n.createdAt)}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="user-chip">
          <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <strong>{user.name}</strong>
            <small>{cap(user.role)}</small>
          </div>
        </div>
        <button className="icon-btn" onClick={logout} title="Logout" aria-label="Logout"><LogOut size={19} /></button>
      </div>
    </header>
  );
}
