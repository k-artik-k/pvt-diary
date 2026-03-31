import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Identicon from './Identicon';
import ProfileMenu from './ProfileMenu';
import './Header.css';

export default function Header({ onSearch }) {
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
      <div className="header-logo">Pvt Diary</div>

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

      <div className="header-actions">
        <button
          className="header-create-btn"
          onClick={() => navigate('/create')}
          title="Create post"
        >
          +
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
