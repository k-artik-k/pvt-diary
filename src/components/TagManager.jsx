import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TagPill from './TagPill';
import SettingsItemMenu from './SettingsItemMenu';
import './SettingsManager.css';

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
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) fetchTags();
  }, [user]);

  async function fetchTags() {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');

    setTags(data || []);
  }

  function resetForm() {
    setName('');
    setPillColor('#3b82f6');
    setTextColor('#ffffff');
    setEditingId(null);
    setHexInput('');
  }

  async function handleSave() {
    const nextName = name.trim();

    if (!nextName || nextName.length > 20) {
      setFeedback({ type: 'error', text: 'Use 1 to 20 characters.' });
      return;
    }

    const query = editingId
      ? supabase
          .from('tags')
          .update({ name: nextName, pill_color: pillColor, text_color: textColor })
          .eq('id', editingId)
      : supabase
          .from('tags')
          .insert({ user_id: user.id, name: nextName, pill_color: pillColor, text_color: textColor });

    const { error } = await query;

    if (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not save tag.' });
      return;
    }

    setFeedback({ type: 'success', text: editingId ? 'Tag updated.' : 'Tag created.' });
    resetForm();
    fetchTags();
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('tags').delete().eq('id', id);

    if (error) {
      setFeedback({ type: 'error', text: error.message || 'Could not delete tag.' });
      return;
    }

    setFeedback({ type: 'success', text: 'Tag deleted.' });
    fetchTags();
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setName(tag.name);
    setPillColor(tag.pill_color);
    setTextColor(tag.text_color);
    setHexInput(tag.pill_color);
    setFeedback({ type: '', text: '' });
  }

  return (
    <div className="settings-tool">
      <div className="settings-tool-form">
        <label className="settings-tool-field">
          <span className="settings-tool-label">Name</span>
          <input
            className="settings-tool-input"
            type="text"
            placeholder="Tag name"
            value={name}
            onChange={(event) => {
              setName(event.target.value.slice(0, 20));
              setFeedback({ type: '', text: '' });
            }}
          />
        </label>

        <div className="settings-tool-swatches">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`settings-tool-swatch ${pillColor === color ? 'active' : ''}`}
              onClick={() => {
                setPillColor(color);
                setHexInput(color);
                setFeedback({ type: '', text: '' });
              }}
              style={{ background: color }}
              aria-label={`Use ${color}`}
            />
          ))}
        </div>

        <div className="settings-tool-inline">
          <input
            className="settings-tool-input"
            type="text"
            placeholder="#hex"
            value={hexInput}
            onChange={(event) => {
              const value = event.target.value;
              setHexInput(value);
              if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                setPillColor(value);
              }
              setFeedback({ type: '', text: '' });
            }}
          />
          <input
            className="settings-tool-inline-color"
            type="color"
            value={textColor}
            onChange={(event) => {
              setTextColor(event.target.value);
              setFeedback({ type: '', text: '' });
            }}
            title="Text color"
          />
        </div>

        <div className="settings-tool-preview">
          <TagPill name={name || 'Tag'} pillColor={pillColor} textColor={textColor} />
        </div>

        {feedback.text && (
          <p className={`settings-tool-note ${feedback.type}`}>{feedback.text}</p>
        )}

        <div className="settings-tool-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            {editingId ? 'Save' : 'Create'}
          </button>
          {editingId && (
            <button className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="settings-tool-list">
        {tags.map((tag) => (
          <div key={tag.id} className="settings-tool-item">
            <div className="settings-tool-main">
              <TagPill name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
            </div>
            <div className="settings-tool-item-actions">
              <SettingsItemMenu
                items={[
                  { label: 'Edit', onSelect: () => startEdit(tag) },
                  { label: 'Delete', danger: true, onSelect: () => handleDelete(tag.id) }
                ]}
              />
            </div>
          </div>
        ))}

        {tags.length === 0 && <p className="settings-tool-empty">No tags yet.</p>}
      </div>
    </div>
  );
}
