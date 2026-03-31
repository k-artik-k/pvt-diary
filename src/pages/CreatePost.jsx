import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const initialSpaceId = searchParams.get('space') || '';
  const tagDropdownRef = useRef(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [body, setBody] = useState('');
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [allSpaces, setAllSpaces] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(initialSpaceId);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [dateTag, setDateTag] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name');
    setAllTags(data || []);
  }, [user]);

  const fetchSpaces = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('spaces').select('id, name, icon, tag_id').eq('user_id', user.id).order('created_at');
    setAllSpaces(data || []);
  }, [user]);

  const applySpaceTag = useCallback(async () => {
    if (!selectedSpaceId || allTags.length === 0) return;

    const linkedTagId = allSpaces.find((space) => space.id === selectedSpaceId)?.tag_id;
    if (!linkedTagId) return;

    const tag = allTags.find((item) => item.id === linkedTagId);
    if (tag && !selectedTags.find((item) => item.id === tag.id)) {
      setSelectedTags((prev) => [...prev, tag]);
    }
  }, [allSpaces, allTags, selectedSpaceId, selectedTags]);

  useEffect(() => {
    fetchTags();
    fetchSpaces();
  }, [fetchTags, fetchSpaces]);

  useEffect(() => {
    applySpaceTag();
  }, [applySpaceTag]);

  useEffect(() => {
    if (!selectedSpaceId || allSpaces.length === 0) return;
    const stillOwned = allSpaces.some((space) => space.id === selectedSpaceId);
    if (!stillOwned) {
      setSelectedSpaceId('');
    }
  }, [allSpaces, selectedSpaceId]);

  useEffect(() => {
    function handleClick(event) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setShowTagDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedSpace = useMemo(
    () => allSpaces.find((space) => space.id === selectedSpaceId) || null,
    [allSpaces, selectedSpaceId]
  );

  function toggleTag(tag) {
    setSelectedTags((prev) => {
      const exists = prev.find((item) => item.id === tag.id);
      if (exists) return prev.filter((item) => item.id !== tag.id);
      return [...prev, tag];
    });
  }

  async function handleSave(isDraft) {
    if (!title.trim()) {
      setSaveError('Title is required.');
      return;
    }

    setSaving(true);
    setSaveError('');

    const sanitizedBody = isMarkdown ? body : sanitizeHTML(body);
    const diaryDate = parseDiaryDate(title);

    let passphraseHash = null;
    let encryptedBody = null;

    if (passphrase) {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      passphraseHash = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

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
      space_id: selectedSpaceId || null
    }).select().single();

    if (error || !post) {
      setSaving(false);
      setSaveError(error?.message || 'Could not save this post.');
      return;
    }

    if (selectedTags.length > 0) {
      const tagInserts = selectedTags.map((tag) => ({ post_id: post.id, tag_id: tag.id }));
      const { error: tagError } = await supabase.from('post_tags').insert(tagInserts);
      if (tagError) {
        setSaveError('Post saved, but tags could not be attached.');
      }
    }

    setSaving(false);
    navigate(selectedSpaceId ? `/space/${selectedSpaceId}` : '/');
  }

  return (
    <div className="create-post-page">
      <div className="create-post-header">
        <button className="create-post-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <span className="create-post-kicker">Compose</span>
          <h1 className="create-post-heading">New Entry</h1>
        </div>
      </div>

      <div className="create-post-shell">
        <div className="create-post-meta-grid">
          <div className="create-post-meta-card">
            <label className="create-post-meta-label" htmlFor="post-space">Posting To</label>
            <select
              id="post-space"
              className="create-post-space-select"
              value={selectedSpaceId}
              onChange={(e) => setSelectedSpaceId(e.target.value)}
            >
              <option value="">Private only</option>
              {allSpaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.icon} {space.name}
                </option>
              ))}
            </select>
            <p className="create-post-meta-hint">
              {selectedSpace
                ? `People added to ${selectedSpace.name} can read this post.`
                : 'Keep this private, or choose a space to share it.'}
            </p>
          </div>

          <div className="create-post-meta-card">
            <label className="create-post-meta-label" htmlFor="post-date">Date</label>
            <input
              id="post-date"
              type="date"
              className="create-post-date-input"
              value={dateTag}
              onChange={(e) => setDateTag(e.target.value)}
            />
            <p className="create-post-meta-hint">Optional. Used for the calendar view.</p>
          </div>
        </div>

        {selectedSpace && (
          <div className="create-post-space-banner">
            <span>{selectedSpace.icon}</span>
            <span>Sharing in {selectedSpace.name}</span>
          </div>
        )}

        <input
          className="create-post-title-input"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaveError('');
          }}
        />

        <div className="create-post-subtitle-row">
          <input
            className="create-post-subtitle-input"
            type="text"
            placeholder="Subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />

          <div className="create-post-tags-dropdown" ref={tagDropdownRef}>
            <button
              className="create-post-tags-btn"
              type="button"
              onClick={() => setShowTagDropdown((prev) => !prev)}
            >
              <span>Tags</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {showTagDropdown && (
              <div className="tags-dropdown-menu">
                {allTags.length === 0 && (
                  <div style={{ padding: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No tags yet. Create them in the profile menu.
                  </div>
                )}

                {allTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="tags-dropdown-item"
                    onClick={() => toggleTag(tag)}
                  >
                    <input type="checkbox" checked={!!selectedTags.find((item) => item.id === tag.id)} readOnly style={{ accentColor: tag.pill_color }} />
                    <TagPill name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div className="create-post-selected-tags">
            {selectedTags.map((tag) => (
              <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} onRemove={() => toggleTag(tag)} />
            ))}
          </div>
        )}

        <div className="create-post-editor-wrap">
          <RichTextEditor
            content={body}
            onChange={setBody}
            isMarkdown={isMarkdown}
            onToggleMode={setIsMarkdown}
            placeholder="Start writing..."
          />
        </div>

        {saveError && <p className="create-post-error">{saveError}</p>}

        <div className="create-post-actions">
          <button
            className="btn btn-outline"
            onClick={() => {
              if (passphrase) {
                setPassphrase(null);
              } else {
                setShowPassphrase(true);
              }
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
          onSubmit={(value) => {
            setPassphrase(value);
            setShowPassphrase(false);
          }}
          onCancel={() => setShowPassphrase(false)}
        />
      )}
    </div>
  );
}
