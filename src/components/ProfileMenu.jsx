import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exportAllData, importData } from '../utils/exportImport';
import TagManager from './TagManager';
import SpaceManager from './SpaceManager';
import PeopleManager from './PeopleManager';
import './ProfileMenu.css';

export default function ProfileMenu({ onClose }) {
  const { user, profile, signOut, updateUsername } = useAuth();
  const [activePanel, setActivePanel] = useState(null);
  const [username, setUsername] = useState('');
  const [editingUsername, setEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const currentUsername =
    profile?.username ||
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'user';

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  async function handleUsernameSave() {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setUsernameError('Username is required');
      return;
    }

    if (nextUsername === profile?.username) {
      setEditingUsername(false);
      setUsernameError('');
      return;
    }

    setSavingUsername(true);
    setUsernameError('');
    const { error } = await updateUsername(nextUsername);
    if (error) {
      setUsernameError(error.message || 'Unable to update username');
    } else {
      setEditingUsername(false);
    }
    setSavingUsername(false);
  }

  async function handleExport() {
    await exportAllData(user.id);
    onClose();
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          await importData(user.id, file);
          window.location.reload();
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      }
    };
    input.click();
  }

  function renderPanel(title, content) {
    return (
      <div className="profile-menu profile-menu-panel">
        <div className="profile-menu-panel-header">
          <button
            className="profile-menu-back-btn"
            onClick={() => setActivePanel(null)}
            aria-label="Back"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span>{title}</span>
        </div>
        <div className="profile-menu-sep" />
        {content}
      </div>
    );
  }

  if (activePanel === 'tags') {
    return renderPanel('Manage Tags', <TagManager />);
  }

  if (activePanel === 'spaces') {
    return renderPanel('Manage Spaces', <SpaceManager />);
  }

  if (activePanel === 'people') {
    return renderPanel('Manage People', <PeopleManager />);
  }

  return (
    <div className="profile-menu">
      <div className="profile-menu-profile">
        <div>
          <div className="profile-menu-label">Username</div>
          <div className="profile-menu-username">{currentUsername}</div>
        </div>
        {!editingUsername && (
          <button
            className="profile-menu-inline-btn"
            onClick={() => {
              setEditingUsername(true);
              setUsername(currentUsername);
              setUsernameError('');
            }}
          >
            Edit
          </button>
        )}
      </div>

      {editingUsername && (
        <div className="profile-menu-username-editor">
          <input
            className="profile-menu-username-input"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUsernameSave();
              if (e.key === 'Escape') {
                setEditingUsername(false);
                setUsername(currentUsername);
                setUsernameError('');
              }
            }}
            autoFocus
          />
          {usernameError && <p className="profile-menu-error">{usernameError}</p>}
          <div className="profile-menu-inline-actions">
            <button
              className="profile-menu-inline-btn"
              onClick={() => {
                setEditingUsername(false);
                setUsername(currentUsername);
                setUsernameError('');
              }}
            >
              Cancel
            </button>
            <button className="profile-menu-save-btn" onClick={handleUsernameSave} disabled={savingUsername}>
              {savingUsername ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="profile-menu-sep" />

      <button className="profile-menu-item" onClick={() => setActivePanel('tags')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        Tags
      </button>
      <button className="profile-menu-item" onClick={() => setActivePanel('people')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        People
      </button>
      <button className="profile-menu-item" onClick={() => setActivePanel('spaces')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        Spaces
      </button>

      <div className="profile-menu-sep" />

      <button className="profile-menu-item" onClick={handleExport}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Export Data
      </button>
      <button className="profile-menu-item" onClick={handleImport}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        Import Data
      </button>

      <div className="profile-menu-sep" />

      <button className="profile-menu-item" onClick={signOut} style={{ color: 'var(--danger)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        Sign Out
      </button>
    </div>
  );
}
