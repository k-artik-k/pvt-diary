import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_SPACE_ICON = '\uD83D\uDCC1';

export default function SpaceManager() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [tags, setTags] = useState([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_SPACE_ICON);
  const [tagId, setTagId] = useState('');
  const [showInMenu, setShowInMenu] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchSpaces();
      fetchTags();
    }
  }, [user]);

  async function fetchSpaces() {
    const { data } = await supabase.from('spaces').select('*, tags(name)').eq('user_id', user.id).order('created_at');
    setSpaces(data || []);
  }

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name');
    setTags(data || []);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      user_id: user.id,
      name: name.trim(),
      icon,
      tag_id: tagId || null,
      show_in_menu: showInMenu
    };
    if (editingId) {
      await supabase.from('spaces').update(payload).eq('id', editingId);
    } else {
      await supabase.from('spaces').insert(payload);
    }
    setName('');
    setIcon(DEFAULT_SPACE_ICON);
    setTagId('');
    setShowInMenu(true);
    setEditingId(null);
    fetchSpaces();
  }

  async function handleDelete(id) {
    await supabase.from('spaces').delete().eq('id', id);
    fetchSpaces();
  }

  function startEdit(space) {
    setEditingId(space.id);
    setName(space.name);
    setIcon(space.icon);
    setTagId(space.tag_id || '');
    setShowInMenu(space.show_in_menu);
  }

  function copyShareLink(space) {
    const link = `${window.location.origin}/shared/${space.share_link}`;
    navigator.clipboard.writeText(link);
  }

  return (
    <div style={{ padding: '8px 16px' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 40, textAlign: 'center', fontSize: 13 }} title="Icon (emoji)" />
          <input type="text" placeholder="Space name" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
        </div>
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} style={{ width: '100%', marginBottom: 8, fontSize: 13 }}>
          <option value="">Link to tag (optional)</option>
          {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={showInMenu} onChange={(e) => setShowInMenu(e.target.checked)} />
          Show in sidebar menu
        </label>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px', width: '100%' }} onClick={handleSave}>
          {editingId ? 'Update' : 'Create'} Space
        </button>
        {editingId && <button className="btn btn-ghost" style={{ fontSize: 12, width: '100%', marginTop: 4 }} onClick={() => { setEditingId(null); setName(''); }}>Cancel</button>}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {spaces.map((space) => (
          <div key={space.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14 }}>{space.icon} {space.name}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => copyShareLink(space)} style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer' }}>Copy Share Link</button>
                <button onClick={() => startEdit(space)} style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDelete(space.id)} style={{ fontSize: 11, color: 'var(--danger)', cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            {space.tags && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tag: {space.tags.name}</span>}
          </div>
        ))}
        {spaces.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No spaces yet</p>}
      </div>
    </div>
  );
}
