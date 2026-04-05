import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Identicon from './Identicon';
import ProfileMenu from './ProfileMenu';
import './Header.css';

export default function Header({ onSearch, showMobileMenuToggle = false, mobileMenuOpen = false, onMenuToggle }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch(e) {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Escape') {
      setSearchQuery('');
      onSearch?.('');
      e.target.blur();
    }
  }

  return (
    <header className="header">
      <div
        className="header-logo"
        onClick={() => navigate('/')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/');
          }
        }}
      >
        Pvt Diary
      </div>

      <div className="header-search-wrap">
        {showMobileMenuToggle && (
          <button
            className="header-menu-btn"
            onClick={onMenuToggle}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-pressed={mobileMenuOpen}
            title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="header-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <div className="header-search">
          <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="global-search"
            className="header-search-input"
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        {showMobileMenuToggle && (
          <button
            className="header-create-btn header-create-btn-mobile"
            onClick={() => navigate('/create')}
            title="Create post (Ctrl+K)"
            aria-label="Create post (Ctrl+K)"
          >
            <svg className="header-create-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>

      <div className="header-actions">
        <button
          className="header-create-btn header-create-btn-desktop"
          onClick={() => navigate('/create')}
          title="Create post (Ctrl+K)"
          aria-label="Create post (Ctrl+K)"
        >
          <svg className="header-create-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>Create</span>
        </button>

        <div ref={profileRef} style={{ position: 'relative' }}>
          <div
            className="header-avatar"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Profile"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" />
            ) : (
              <Identicon value={user?.id || 'default'} size={32} />
            )}
          </div>
          {showProfileMenu && (
            <ProfileMenu onClose={() => setShowProfileMenu(false)} />
          )}
        </div>
      </div>
    </header>
  );
}
