import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const DEFAULT_SPACE_ICON = '📁';

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [ownedSpaces, setOwnedSpaces] = useState([]);
  const [sharedSpaces, setSharedSpaces] = useState([]);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceIcon, setNewSpaceIcon] = useState(DEFAULT_SPACE_ICON);
  const isMobile = window.innerWidth <= 768;
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchAccessibleSpaces = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('spaces')
      .select('id, name, icon, user_id, show_in_menu')
      .eq('show_in_menu', true)
      .order('created_at');

    const spaces = data || [];
    setOwnedSpaces(spaces.filter((space) => space.user_id === user.id));
    setSharedSpaces(spaces.filter((space) => space.user_id !== user.id));
  }, [user]);

  useEffect(() => {
    fetchAccessibleSpaces();
  }, [fetchAccessibleSpaces]);

  function navigateTo(path) {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  }

  function isActive(path) {
    return location.pathname === path;
  }

  async function handleCreateSpace() {
    if (!newSpaceName.trim()) return;

    const { error } = await supabase.from('spaces').insert({
      user_id: user.id,
      name: newSpaceName.trim(),
      icon: newSpaceIcon || DEFAULT_SPACE_ICON,
      show_in_menu: true
    });

    if (!error) {
      setNewSpaceName('');
      setNewSpaceIcon(DEFAULT_SPACE_ICON);
      setShowCreateSpace(false);
      fetchAccessibleSpaces();
    }
  }

  function handleToggle() {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      onToggle();
    }
  }

  function renderSpaceItem(space, isShared = false) {
    return (
      <button
        key={space.id}
        className={`sidebar-item ${isActive(`/space/${space.id}`) ? 'active' : ''}`}
        onClick={() => navigateTo(`/space/${space.id}`)}
        title={isShared ? `${space.name} (shared with you)` : space.name}
      >
        <span className="sidebar-item-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
        <span className="sidebar-item-content">
          <span className="sidebar-item-label">{space.name}</span>
          {isShared && <span className="sidebar-item-badge">shared</span>}
        </span>
      </button>
    );
  }

  const sidebarClass = `sidebar ${collapsed && !isMobile ? 'collapsed' : ''} ${isMobile && mobileOpen ? 'open' : ''}`;
  const showSectionLabels = !collapsed || isMobile;

  return (
    <div className="sidebar-wrapper">
      <div className={sidebarClass}>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${isActive('/') ? 'active' : ''}`}
            onClick={() => navigateTo('/')}
          >
            <span className="sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span className="sidebar-item-label">Home</span>
          </button>

          <button
            className={`sidebar-item ${isActive('/calendar') ? 'active' : ''}`}
            onClick={() => navigateTo('/calendar')}
          >
            <span className="sidebar-item-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="sidebar-item-label">Calendar</span>
          </button>

          {ownedSpaces.length > 0 && <div className="sidebar-space-divider" />}

          {ownedSpaces.length > 0 && showSectionLabels && (
            <div className="sidebar-section-label">Your Spaces</div>
          )}
          {ownedSpaces.map((space) => renderSpaceItem(space))}

          {sharedSpaces.length > 0 && <div className="sidebar-space-divider" />}

          {sharedSpaces.length > 0 && showSectionLabels && (
            <div className="sidebar-section-label">Shared With You</div>
          )}
          {sharedSpaces.map((space) => renderSpaceItem(space, true))}
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            {showCreateSpace ? (
              <div style={{ padding: '0 8px', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Space name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSpace()}
                  style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="text"
                    value={newSpaceIcon}
                    onChange={(e) => setNewSpaceIcon(e.target.value)}
                    style={{ width: 60, fontSize: 12 }}
                    title="Space icon"
                  />
                  <button className="btn btn-primary" style={{ flex: 1, fontSize: 12, padding: '4px 8px' }} onClick={handleCreateSpace}>
                    Create
                  </button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={() => setShowCreateSpace(false)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
            ) : (
              <button className="sidebar-add-btn" onClick={() => setShowCreateSpace(true)} title="Create space">
                +
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-toggle">
        <button className="sidebar-toggle-btn" onClick={handleToggle} title={collapsed ? 'Expand menu' : 'Collapse menu'}>
          <svg className="hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {isMobile && (
        <div
          className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}
