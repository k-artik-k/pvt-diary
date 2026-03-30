import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import TagPill from '../components/TagPill';
import ConfirmDialog from '../components/ConfirmDialog';
import PassphraseDialog from '../components/PassphraseDialog';
import { sanitizeHTML } from '../utils/sanitize';
import { formatDate } from '../utils/dateHelpers';
import './ReadPost.css';

export default function ReadPost() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [decryptedBody, setDecryptedBody] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [allPostIds, setAllPostIds] = useState([]);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, post_tags(tag_id, tags(*))')
      .eq('id', id)
      .single();

    if (data) {
      setPost(data);
      setEditTitle(data.title);
      setEditSubtitle(data.subtitle);
      setEditBody(data.body);
      setTags(data.post_tags?.map(pt => pt.tags).filter(Boolean) || []);
      setIsOwner(data.user_id === user?.id);

      if (data.passphrase_hash) {
        setDecryptedBody(null);
      }

      // Log activity for shared posts
      if (data.user_id !== user?.id && user) {
        await supabase.from('post_activity').insert({
          post_id: id,
          viewer_id: user.id,
          viewer_username: profile?.username || user.email,
          action: 'viewed'
        });
      }
    }
    setLoading(false);
  }, [id, user, profile]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  // Fetch all tags for tag editing
  useEffect(() => {
    if (user) {
      supabase.from('tags').select('*').eq('user_id', user.id).order('name').then(({ data }) => setAllTags(data || []));
    }
  }, [user]);

  // Fetch activity for post owner
  useEffect(() => {
    if (post && isOwner) {
      supabase.from('post_activity').select('*').eq('post_id', id).order('created_at', { ascending: false }).limit(20)
        .then(({ data }) => setActivity(data || []));
    }
  }, [post, isOwner, id]);

  // Fetch all post IDs for arrow key navigation
  useEffect(() => {
    if (user) {
      supabase.from('posts').select('id').eq('user_id', user.id).order('created_at', { ascending: false })
        .then(({ data }) => setAllPostIds((data || []).map(p => p.id)));
    }
  }, [user]);

  // Arrow key navigation
  useEffect(() => {
    function handleKey(e) {
      if (editing) return;
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const idx = allPostIds.indexOf(id);
      if (idx === -1) return;

      if (e.key === 'ArrowLeft' && idx > 0) {
        navigate(`/post/${allPostIds[idx - 1]}`);
      } else if (e.key === 'ArrowRight' && idx < allPostIds.length - 1) {
        navigate(`/post/${allPostIds[idx + 1]}`);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [allPostIds, id, navigate, editing]);

  async function handleDecrypt(passphrase) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hash !== post.passphrase_hash) {
        alert('Incorrect passphrase');
        return;
      }

      // Decrypt
      const combined = Uint8Array.from(atob(post.encrypted_body), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const key = await crypto.subtle.importKey('raw', hashBuffer, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
      const decoder = new TextDecoder();
      setDecryptedBody(decoder.decode(decrypted));
      setEditBody(decoder.decode(decrypted));
      setShowPassphrase(false);
    } catch (err) {
      alert('Decryption failed. Check your passphrase.');
    }
  }

  async function handleSave() {
    const sanitized = post.is_markdown ? editBody : sanitizeHTML(editBody);
    await supabase.from('posts').update({
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      body: sanitized
    }).eq('id', id);
    setEditing(false);
    fetchPost();
  }

  async function handleDelete() {
    await supabase.from('posts').delete().eq('id', id);
    navigate('/');
  }

  async function togglePostTag(tag) {
    const exists = tags.find(t => t.id === tag.id);
    if (exists) {
      await supabase.from('post_tags').delete().eq('post_id', id).eq('tag_id', tag.id);
    } else {
      await supabase.from('post_tags').insert({ post_id: id, tag_id: tag.id });
    }
    fetchPost();
  }

  if (loading) return <div className="read-post-page"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>;
  if (!post) return <div className="read-post-page"><p style={{ color: 'var(--text-muted)' }}>Post not found</p></div>;

  // Locked post — show unlock prompt
  if (post.passphrase_hash && !decryptedBody && !showPassphrase) {
    return (
      <div className="read-post-page">
        <div className="read-post-nav">
          <button className="read-post-nav-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        </div>
        <div className="read-post-locked">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <h2>{post.title}</h2>
          <p>This post is locked</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowPassphrase(true)}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  if (showPassphrase) {
    return (
      <div className="read-post-page">
        <PassphraseDialog mode="unlock" onSubmit={handleDecrypt} onCancel={() => setShowPassphrase(false)} />
      </div>
    );
  }

  const displayBody = decryptedBody || post.body;

  return (
    <div className="read-post-page">
      <div className="read-post-nav">
        <button className="read-post-nav-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        {isOwner && !editing && (
          <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        {editing && (
          <>
            <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={handleSave}>Save</button>
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setEditing(false); setEditTitle(post.title); setEditSubtitle(post.subtitle); setEditBody(displayBody); }}>
              Cancel
            </button>
          </>
        )}
      </div>

      {editing ? (
        <>
          <input className="read-post-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title" />
          <input className="read-post-subtitle" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="Subtitle" />
          <div className="read-post-edit-body">
            <RichTextEditor
              content={editBody}
              onChange={setEditBody}
              isMarkdown={post.is_markdown}
              onToggleMode={() => {}}
            />
          </div>
        </>
      ) : (
        <>
          <h1 className="read-post-title" style={{ cursor: isOwner ? 'text' : 'default' }}>{post.title}</h1>
          {post.subtitle && <div className="read-post-subtitle">{post.subtitle}</div>}
          <div className="read-post-meta">
            {tags.map(tag => (
              <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color}
                onRemove={isOwner ? () => togglePostTag(tag) : undefined} />
            ))}
            <span className="read-post-date">{formatDate(post.created_at)}</span>
            {post.is_draft && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 'var(--radius-pill)' }}>Draft</span>}
          </div>
          <div className="read-post-body" dangerouslySetInnerHTML={{ __html: sanitizeHTML(displayBody) }} />
        </>
      )}

      {/* Tag management */}
      {isOwner && !editing && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Add tags:</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {allTags.filter(t => !tags.find(tt => tt.id === t.id)).map(tag => (
              <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color}
                onClick={() => togglePostTag(tag)} />
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <div className="read-post-actions">
          <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
        </div>
      )}

      {/* Activity tracking */}
      {isOwner && activity.length > 0 && (
        <div className="read-post-activity">
          <h4>Activity</h4>
          {activity.map(a => (
            <div key={a.id} className="activity-item">
              {a.viewer_username} — {a.action} — {formatDate(a.created_at)}
            </div>
          ))}
        </div>
      )}

      {showDelete && (
        <ConfirmDialog
          title="Delete Post"
          message="Are you sure you want to delete this post? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          confirmText="Delete"
          danger
        />
      )}
    </div>
  );
}
