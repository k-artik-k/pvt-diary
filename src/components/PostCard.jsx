import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TagPill from './TagPill';
import ConfirmDialog from './ConfirmDialog';
import PostActionsMenu from './PostActionsMenu';
import { stripHTML } from '../utils/sanitize';
import { getRelativeTime } from '../utils/dateHelpers';
import './PostCard.css';

export default function PostCard({ post, tags = [], onDeleted }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const canDelete = user?.id === post.user_id;

  async function handleDelete() {
    await supabase.from('posts').delete().eq('id', post.id);
    setShowDelete(false);
    onDeleted?.(post.id);
  }

  return (
    <>
      <div className="post-card" onClick={() => navigate(`/post/${post.id}`)}>
        <div className="post-card-header-row">
          <div className="post-card-title-wrap">
            <h3 className="post-card-title">{post.title || 'Untitled'}</h3>
            {post.is_draft && <span className="post-card-draft">Draft</span>}
            {post.passphrase_hash && (
              <span className="post-card-lock" title="Locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            )}
          </div>
          <PostActionsMenu postId={post.id} canDelete={canDelete} onDelete={() => setShowDelete(true)} />
        </div>
        {post.subtitle && <div className="post-card-subtitle">{post.subtitle}</div>}
        {post.body && !post.passphrase_hash && (
          <div className="post-card-body">{stripHTML(post.body)}</div>
        )}
        {post.passphrase_hash && (
          <div className="post-card-body" style={{ fontStyle: 'italic' }}>This post is locked</div>
        )}
        <div className="post-card-footer">
          {tags.map(tag => (
            <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
          ))}
          <span className="post-card-meta">{getRelativeTime(post.created_at)}</span>
        </div>
      </div>
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
    </>
  );
}
