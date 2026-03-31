import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TagPill from './TagPill';

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#e11d48', '#84cc16', '#0ea5e9', '#a855f7', '#64748b'
];

export default function TagManager() {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [name, setName] = useState('');
  const [pillColor, setPillColor] = useState('#3b82f6');
  const [textColor, setTextColor] = useState('#ffffff');
  const [hexInput, setHexInput] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user) fetchTags();
  }, [user]);

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('created_at');
    setTags(data || []);
  }

  async function handleSave() {
    if (!name.trim() || name.length > 20) return;
    if (editingId) {
      await supabase.from('tags').update({ name: name.trim(), pill_color: pillColor, text_color: textColor }).eq('id', editingId);
    } else {
      await supabase.from('tags').insert({ user_id: user.id, name: name.trim(), pill_color: pillColor, text_color: textColor });
    }
    setName('');
    setPillColor('#3b82f6');
    setTextColor('#ffffff');
    setEditingId(null);
    setHexInput('');
    fetchTags();
  }

  async function handleDelete(id) {
    await supabase.from('tags').delete().eq('id', id);
    fetchTags();
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setName(tag.name);
    setPillColor(tag.pill_color);
    setTextColor(tag.text_color);
  }

  return (
    <div style={{ padding: '8px 16px' }}>
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Tag name (max 20)"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
        />
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Pill color:</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setPillColor(color)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: color,
                border: pillColor === color ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="#hex"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value);
              if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setPillColor(e.target.value);
            }}
            style={{ width: 80, fontSize: 12 }}
          />
          <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
            Text:
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: 24, height: 20, padding: 0, border: 'none', cursor: 'pointer' }} />
          </label>
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Preview: </span>
          <TagPill name={name || 'Tag'} pillColor={pillColor} textColor={textColor} />
        </div>
        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px', width: '100%' }} onClick={handleSave}>
          {editingId ? 'Update' : 'Create'} Tag
        </button>
        {editingId && <button className="btn btn-ghost" style={{ fontSize: 12, width: '100%', marginTop: 4 }} onClick={() => { setEditingId(null); setName(''); }}>Cancel</button>}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {tags.map((tag) => (
          <div key={tag.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <TagPill name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => startEdit(tag)} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => handleDelete(tag.id)} style={{ fontSize: 12, color: 'var(--danger)', cursor: 'pointer' }}>&times;</button>
            </div>
          </div>
        ))}
        {tags.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No tags yet</p>}
      </div>
    </div>
  );
}
