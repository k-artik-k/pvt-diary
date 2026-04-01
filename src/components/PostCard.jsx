import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import TagPill from './TagPill';
import ConfirmDialog from './ConfirmDialog';
import PostActionsMenu from './PostActionsMenu';
import PostOrganizerDialog from './PostOrganizerDialog';
import { stripHTML } from '../utils/sanitize';
import { getRelativeTime } from '../utils/dateHelpers';
import { duplicatePostWithTags } from '../utils/postActions';
import { getPostShareUrl } from '../utils/appLinks';
import './PostCard.css';

export default function PostCard({ post, tags = [], onDeleted, onUpdated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPost, setCurrentPost] = useState(post);
  const [currentTags, setCurrentTags] = useState(tags);
  const [showDelete, setShowDelete] = useState(false);
  const [showOrganizer, setShowOrganizer] = useState(false);
  const canManage = user?.id === currentPost.user_id;

  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  useEffect(() => {
    setCurrentTags(tags);
  }, [tags]);

  function handlePostUpdated(updatedPost, updatedTags = currentTags) {
    setCurrentPost(updatedPost);
    setCurrentTags(updatedTags);
    onUpdated?.(updatedPost, updatedTags);
  }

  async function handleDelete() {
    await supabase.from('posts').delete().eq('id', currentPost.id);
    setShowDelete(false);
    onDeleted?.(currentPost.id);
  }

  async function handleToggleDraft() {
    const { data } = await supabase
      .from('posts')
      .update({ is_draft: !currentPost.is_draft })
      .eq('id', currentPost.id)
      .select('*, spaces(id, name, icon, share_link)')
      .single();

    if (data) {
      handlePostUpdated(data, currentTags);
    }
  }

  async function handleDuplicate() {
    const { data } = await duplicatePostWithTags(currentPost, currentTags);
    if (data?.id) {
      navigate(`/post/${data.id}?edit=1`);
    }
  }

  return (
    <>
      <div className="post-card" onClick={() => navigate(`/post/${currentPost.id}`)}>
        <div className="post-card-header-row">
          <div className="post-card-title-wrap">
            <h3 className="post-card-title">{currentPost.title || 'Untitled'}</h3>
            {currentPost.is_draft && <span className="post-card-draft">Draft</span>}
            {currentPost.passphrase_hash && (
              <span className="post-card-lock" title="Locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
            )}
          </div>
          <PostActionsMenu
            postId={currentPost.id}
            shareUrl={getPostShareUrl(currentPost)}
            canManage={canManage}
            isDraft={currentPost.is_draft}
            onEdit={() => navigate(`/post/${currentPost.id}?edit=1`)}
            onOrganize={() => setShowOrganizer(true)}
            onDuplicate={handleDuplicate}
            onToggleDraft={handleToggleDraft}
            onDelete={() => setShowDelete(true)}
          />
        </div>
        {currentPost.subtitle && <div className="post-card-subtitle">{currentPost.subtitle}</div>}
        {currentPost.body && !currentPost.passphrase_hash && (
          <div className="post-card-body">{stripHTML(currentPost.body)}</div>
        )}
        {currentPost.passphrase_hash && (
          <div className="post-card-body" style={{ fontStyle: 'italic' }}>This post is locked</div>
        )}
        <div className="post-card-footer">
          {currentTags.map((tag) => (
            <TagPill key={tag.id} name={tag.name} pillColor={tag.pill_color} textColor={tag.text_color} />
          ))}
          {currentPost.spaces && (
            <span className="post-card-space">
              {currentPost.spaces.icon} {currentPost.spaces.name}
            </span>
          )}
          <span className="post-card-meta">{getRelativeTime(currentPost.created_at)}</span>
        </div>
      </div>
      {showOrganizer && canManage && (
        <PostOrganizerDialog
          post={currentPost}
          tags={currentTags}
          onClose={() => setShowOrganizer(false)}
          onSaved={handlePostUpdated}
        />
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
    </>
  );
}
