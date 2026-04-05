import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import TagPill from '../components/TagPill';
import ConfirmDialog from '../components/ConfirmDialog';
import PassphraseDialog from '../components/PassphraseDialog';
import PostActionsMenu from '../components/PostActionsMenu';
import PostOrganizerDialog from '../components/PostOrganizerDialog';
import { sanitizeHTML } from '../utils/sanitize';
import { formatDate } from '../utils/dateHelpers';
import { duplicatePostWithTags } from '../utils/postActions';
import { getPostShareUrl } from '../utils/appLinks';
import './ReadPost.css';

export default function ReadPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldStartEditing = searchParams.get('edit') === '1';

  const [post, setPost] = useState(null);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [decryptedBody, setDecryptedBody] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [allPostIds, setAllPostIds] = useState([]);

  const fetchPost = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))')
      .eq('id', id)
      .single();

    if (data) {
      setPost(data);
      setEditTitle(data.title);
      setEditSubtitle(data.subtitle);
      setEditBody(data.body);
      setTags(data.post_tags?.map((item) => item.tags).filter(Boolean) || []);
      const owner = data.user_id === user?.id;
      setIsOwner(owner);
      setEditing(owner && shouldStartEditing);

      if (data.passphrase_hash) {
        setDecryptedBody(null);
      }
    }
    setLoading(false);
  }, [id, user, shouldStartEditing]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  useEffect(() => {
    if (user) {
      supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPostIds((data || []).map((item) => item.id)));
    }
  }, [user]);

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
      const hash = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

      if (hash !== post.passphrase_hash) {
        alert('Incorrect passphrase');
        return;
      }

      const combined = Uint8Array.from(atob(post.encrypted_body), (char) => char.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      const key = await crypto.subtle.importKey('raw', hashBuffer, 'AES-GCM', false, ['decrypt']);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
      const decoder = new TextDecoder();
      const decryptedText = decoder.decode(decrypted);
      setDecryptedBody(decryptedText);
      setEditBody(decryptedText);
      setShowPassphrase(false);
    } catch {
      alert('Decryption failed. Check your passphrase.');
    }
  }

  async function handleSave() {
    const sanitized = post.is_markdown ? editBody : sanitizeHTML(editBody);
    const { data } = await supabase.from('posts').update({
      title: editTitle.trim(),
      subtitle: editSubtitle.trim(),
      body: sanitized
    }).eq('id', id).select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))').single();

    if (data) {
      setPost(data);
      setTags(data.post_tags?.map((item) => item.tags).filter(Boolean) || []);
    }

    navigate(`/post/${id}`, { replace: true });
    setEditing(false);
  }

  async function handleDelete() {
    await supabase.from('posts').delete().eq('id', id);
    navigate('/');
  }

  async function handleToggleDraft() {
    if (!post) return;

    const { data } = await supabase
      .from('posts')
      .update({ is_draft: !post.is_draft })
      .eq('id', post.id)
      .select('*, spaces(id, name, icon, share_link)')
      .single();

    if (data) {
      setPost((prev) => ({ ...prev, ...data }));
    }
  }

  async function handleTogglePin() {
    if (!post) return;

    const { data } = await supabase
      .from('posts')
      .update({ is_pinned: !post.is_pinned })
      .eq('id', post.id)
      .select('*, spaces(id, name, icon, share_link)')
      .single();

    if (data) {
      setPost((prev) => ({ ...prev, ...data }));
    }
  }

  async function handleDuplicate() {
    if (!post) return;

    const { data } = await duplicatePostWithTags(post, tags);
    if (data?.id) {
      navigate(`/post/${data.id}?edit=1`);
    }
  }

  function handlePostUpdated(updatedPost, updatedTags) {
    setPost(updatedPost);
    setTags(updatedTags);
  }

  if (loading) return <div className="read-post-page"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>;
  if (!post) {
    return (
      <div className="read-post-page">
        <p style={{ color: 'var(--text-muted)' }}>This post is private or unavailable to your account.</p>
      </div>
    );
  }

  if (post.passphrase_hash && !decryptedBody && !showPassphrase) {
    return (
      <div className="read-post-page">
        <div className="read-post-nav">
          <button className="read-post-nav-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div className="read-post-nav-spacer" />
          <PostActionsMenu
            postId={post.id}
            shareUrl={getPostShareUrl(post)}
            canManage={isOwner}
            isDraft={post.is_draft}
            isPinned={post.is_pinned}
            onEdit={() => navigate(`/post/${post.id}?edit=1`)}
            onOrganize={() => setShowOrganizer(true)}
            onDuplicate={handleDuplicate}
            onTogglePin={handleTogglePin}
            onToggleDraft={handleToggleDraft}
            onDelete={() => setShowDelete(true)}
          />
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
        <div className="read-post-nav-actions">
          {isOwner && !editing && (
            <button className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => navigate(`/post/${post.id}?edit=1`, { replace: true })}>
              Edit
            </button>
          )}
          {editing && (
            <>
              <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={handleSave}>Save</button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 13 }}
                onClick={() => {
                  navigate(`/post/${post.id}`, { replace: true });
                  setEditing(false);
                  setEditTitle(post.title);
                  setEditSubtitle(post.subtitle);
                  setEditBody(displayBody);
                }}
              >
                Cancel
              </button>
            </>
          )}
          {!editing && (
            <PostActionsMenu
              postId={post.id}
              shareUrl={getPostShareUrl(post)}
              canManage={isOwner}
              isDraft={post.is_draft}
              isPinned={post.is_pinned}
              onEdit={() => navigate(`/post/${post.id}?edit=1`, { replace: true })}
              onOrganize={() => setShowOrganizer(true)}
              onDuplicate={handleDuplicate}
              onTogglePin={handleTogglePin}
              onToggleDraft={handleToggleDraft}
              onDelete={() => setShowDelete(true)}
            />
          )}
        </div>
      </div>

      {editing ? (
        <>
          <input className="read-post-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
          <input className="read-post-subtitle" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} placeholder="Subtitle" />
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
            {tags.map((tag) => (
              <TagPill
                key={tag.id}
                name={tag.name}
                pillColor={tag.pill_color}
                textColor={tag.text_color}
              />
            ))}
            {post.spaces && (
              <span className="read-post-space">
                {post.spaces.icon} {post.spaces.name}
              </span>
            )}
            {post.is_pinned && (
              <span className="read-post-pin" title="Pinned" aria-label="Pinned">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 17v5" />
                  <path d="M8 4h8" />
                  <path d="m9 4 1 7-3 3h10l-3-3 1-7" />
                </svg>
              </span>
            )}
            <span className="read-post-date">{formatDate(post.created_at)}</span>
            {post.is_draft && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 8px', borderRadius: 'var(--radius-pill)' }}>Draft</span>}
          </div>
          <div className="read-post-body" dangerouslySetInnerHTML={{ __html: sanitizeHTML(displayBody) }} />
        </>
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

      {showOrganizer && isOwner && post && (
        <PostOrganizerDialog
          post={post}
          tags={tags}
          onClose={() => setShowOrganizer(false)}
          onSaved={handlePostUpdated}
        />
      )}
    </div>
  );
}
