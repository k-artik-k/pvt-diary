import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { exportAllData, importData } from '../utils/exportImport';
import TagManager from './TagManager';
import SpaceManager from './SpaceManager';
import PeopleManager from './PeopleManager';
import './ProfileMenu.css';

export default function ProfileMenu({ onClose }) {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [activePanel, setActivePanel] = useState(null);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(path);
      await updateProfile({ avatar_url: publicUrl });
    }
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

  if (activePanel === 'tags') {
    return (
      <div className="profile-menu" style={{ width: 320, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 13 }} onClick={() => setActivePanel(null)}>←</button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Manage Tags</span>
        </div>
        <div className="profile-menu-sep" />
        <TagManager />
      </div>
    );
  }

  if (activePanel === 'spaces') {
    return (
      <div className="profile-menu" style={{ width: 320, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 13 }} onClick={() => setActivePanel(null)}>←</button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Manage Spaces</span>
        </div>
        <div className="profile-menu-sep" />
        <SpaceManager />
      </div>
    );
  }

  if (activePanel === 'people') {
    return (
      <div className="profile-menu" style={{ width: 320, maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: 13 }} onClick={() => setActivePanel(null)}>←</button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Manage People</span>
        </div>
        <div className="profile-menu-sep" />
        <PeopleManager />
      </div>
    );
  }

  return (
    <div className="profile-menu">
      <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
        {profile?.display_name || profile?.username || user?.email}
      </div>
      <div className="profile-menu-sep" />

      <label className="profile-upload-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 12l-4-4-4 4M12 16V8"/></svg>
        Upload Avatar
        <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
      </label>

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
