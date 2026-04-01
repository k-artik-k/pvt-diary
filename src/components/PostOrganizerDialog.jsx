import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TagPill from './TagPill';
import { syncPostTags } from '../utils/postActions';
import './PostOrganizerDialog.css';

const DEFAULT_TAG_COLOR = '#3b82f6';
const DEFAULT_TEXT_COLOR = '#ffffff';

export default function PostOrganizerDialog({ post, tags = [], onClose, onSaved }) {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState(post.space_id || '');
  const [selectedTagIds, setSelectedTagIds] = useState(tags.map((tag) => tag.id));
  const [newTagName, setNewTagName] = useState('');
  const [saving, setSaving] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedSpaceId(post.space_id || '');
    setSelectedTagIds(tags.map((tag) => tag.id));
  }, [post, tags]);

  useEffect(() => {
    if (!user) return;

    async function fetchOptions() {
      const [{ data: spaceData }, { data: tagData }] = await Promise.all([
        supabase.from('spaces').select('id, name, icon').eq('user_id', user.id).order('name'),
        supabase.from('tags').select('*').eq('user_id', user.id).order('name')
      ]);

      setSpaces(spaceData || []);
      setAllTags(tagData || []);
    }

    fetchOptions();
  }, [user]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function toggleTag(tagId) {
    setSelectedTagIds((prev) => (
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    ));
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name || !user) return;

    setCreatingTag(true);
    setError('');

    const { data, error: createError } = await supabase
      .from('tags')
      .insert({
        user_id: user.id,
        name,
        pill_color: DEFAULT_TAG_COLOR,
        text_color: DEFAULT_TEXT_COLOR
      })
      .select()
      .single();

    setCreatingTag(false);

    if (createError || !data) {
      setError(createError?.message || 'Could not create that tag.');
      return;
    }

    setAllTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedTagIds((prev) => (prev.includes(data.id) ? prev : [...prev, data.id]));
    setNewTagName('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');

    const { data: updatedPost, error: postError } = await supabase
      .from('posts')
      .update({ space_id: selectedSpaceId || null })
      .eq('id', post.id)
      .select('*, spaces(id, name, icon, share_link)')
      .single();

    if (postError || !updatedPost) {
      setSaving(false);
      setError(postError?.message || 'Could not update this post.');
      return;
    }

    const previousTagIds = tags.map((tag) => tag.id);
    const { error: tagError } = await syncPostTags(post.id, previousTagIds, selectedTagIds);

    if (tagError) {
      setSaving(false);
      setError(tagError.message || 'Could not update the tags for this post.');
      return;
    }

    const nextTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));
    onSaved?.(updatedPost, nextTags);
    setSaving(false);
    onClose?.();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content post-organizer-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="post-organizer-header">
          <p className="post-organizer-kicker">Post Tools</p>
          <h3 className="post-organizer-title">Organize post</h3>
          <p className="post-organizer-subtitle">{post.title || 'Untitled'}</p>
        </div>

        <div className="post-organizer-body">
          <section className="post-organizer-section">
            <div className="post-organizer-label-row">
              <span className="post-organizer-label">Space</span>
              <span className="post-organizer-count">
                {selectedSpaceId ? 'Shared in a space' : 'Private only'}
              </span>
            </div>
            <select
              className="post-organizer-select"
              value={selectedSpaceId}
              onChange={(event) => setSelectedSpaceId(event.target.value)}
            >
              <option value="">Private only</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.icon} {space.name}
                </option>
              ))}
            </select>
            <p className="post-organizer-hint">Pick a space or keep it private.</p>
          </section>

          <section className="post-organizer-section">
            <div className="post-organizer-label-row">
              <span className="post-organizer-label">Tags</span>
              <span className="post-organizer-count">{selectedTagIds.length} selected</span>
            </div>

            {allTags.length > 0 ? (
              <div className="post-organizer-tag-grid">
                {allTags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`post-organizer-tag-option ${selected ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      <TagPill
                        name={tag.name}
                        pillColor={tag.pill_color}
                        textColor={tag.text_color}
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="post-organizer-hint">No tags yet.</p>
            )}

            <div className="post-organizer-create-row">
              <input
                type="text"
                value={newTagName}
                placeholder="Create a quick tag"
                maxLength={20}
                onChange={(event) => setNewTagName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleCreateTag}
                disabled={creatingTag || !newTagName.trim()}
              >
                {creatingTag ? 'Adding...' : 'Add Tag'}
              </button>
            </div>
          </section>

          {error && <p className="post-organizer-error">{error}</p>}
        </div>

        <div className="post-organizer-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
