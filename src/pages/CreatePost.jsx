import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import TagPill from '../components/TagPill';
import PassphraseDialog from '../components/PassphraseDialog';
import { sanitizeHTML } from '../utils/sanitize';
import { parseDiaryDate } from '../utils/dateHelpers';
import './CreatePost.css';

export default function CreatePost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spaceId = searchParams.get('space');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [dateTag, setDateTag] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchTags();
  }, [user]);

  // Auto-apply space tag
  useEffect(() => {
    if (spaceId && allTags.length > 0) {
      fetchSpaceTag();
    }
  }, [spaceId, allTags]);

  async function fetchTags() {
    const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name');
    setAllTags(data || []);
  }

  async function fetchSpaceTag() {
    const { data } = await supabase.from('spaces').select('tag_id').eq('id', spaceId).single();
    if (data?.tag_id) {
      const tag = allTags.find(t => t.id === data.tag_id);
      if (tag && !selectedTags.find(t => t.id === tag.id)) {
        setSelectedTags(prev => [...prev, tag]);
      }
    }
  }

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const exists = prev.find(t => t.id === tag.id);
      if (exists) return prev.filter(t => t.id !== tag.id);
      return [...prev, tag];
    });
  }

  async function handleSave(isDraft) {
    if (!title.trim()) return;
    setSaving(true);

    const sanitizedBody = isMarkdown ? body : sanitizeHTML(body);
    const diaryDate = parseDiaryDate(title);

    let passphraseHash = null;
    let encryptedBody = null;

    if (passphrase) {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passphraseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Encrypt body with AES
      const key = await crypto.subtle.importKey('raw', hashBuffer, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(sanitizedBody));
      const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      encryptedBody = btoa(String.fromCharCode(...combined));
    }

    const { data: post, error } = await supabase.from('posts').insert({
      user_id: user.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      body: passphraseHash ? '' : sanitizedBody,
      is_markdown: isMarkdown,
      is_draft: isDraft,
      passphrase_hash: passphraseHash,
      encrypted_body: encryptedBody,
      date_tag: dateTag || (diaryDate ? diaryDate.toISOString().split('T')[0] : null),
      space_id: spaceId || null
    }).select().single();

    if (!error && post && selectedTags.length > 0) {
      const tagInserts = selectedTags.map(t => ({ post_id: post.id, tag_id: t.id }));
      await supabase.from('post_tags').insert(tagInserts);
    }

    setSaving(false);
    if (!error) navigate('/');
  }

  return (
    <div className="create-post-page">
      <div className="create-post-header">
        <button className="create-post-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span className="create-post-label">Create Post</span>
      </div>

      <div className="create-post-form">
        <input
          className="create-post-title-input"
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div className="create-post-subtitle-row">
          <input
            className="create-post-subtitle-input"
            type="text"
            placeholder="Subtitle"
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            style={{ flex: 1 }}
          />
          <div className="create-post-tags-dropdown">
            <button
              className="create-post-tags-btn"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
            >
              Tags ▾
            </button>
            {showTagDropdown && (
              <div className="tags-dropdown-menu">
                {allTags.length === 0 && (
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No tags. Create in profile menu.</div>
                )}
                {allTags.map(tag => (
                  <div
                    key={tag.id}
                    className="tags-dropdown-item"
                    onClick={() => toggleTag(tag)}
                  >
                    <input type="checkbox" checked={!!selectedTags.find(t => t.id === tag.id)} readOnly style={{ accentColor: tag.pill_color }} />
                    <TagPill name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="create-post-selected-tags">
            {selectedTags.map(tag => (
              <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} onRemove={() => toggleTag(tag)} />
            ))}
          </div>
        )}

        <div className="create-post-date-row">
          <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Date for calendar (optional):</label>
          <input type="date" className="create-post-date-input" value={dateTag} onChange={e => setDateTag(e.target.value)} />
        </div>

        <RichTextEditor
          content={body}
          onChange={setBody}
          isMarkdown={isMarkdown}
          onToggleMode={setIsMarkdown}
          placeholder="Start writing..."
        />

        <div className="create-post-actions">
          <button
            className="btn btn-outline"
            onClick={() => {
              if (passphrase) { setPassphrase(null); }
              else { setShowPassphrase(true); }
            }}
          >
            {passphrase ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Locked</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 5-5 5 5 0 0 1 5 5"/></svg> Lock</>
            )}
          </button>
          <button className="btn btn-ghost" onClick={() => handleSave(true)} disabled={saving}>
            Save Draft
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {showPassphrase && (
        <PassphraseDialog
          mode="set"
          onSubmit={(p) => { setPassphrase(p); setShowPassphrase(false); }}
          onCancel={() => setShowPassphrase(false)}
        />
      )}
    </div>
  );
}
