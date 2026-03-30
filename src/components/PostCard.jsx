import { useNavigate } from 'react-router-dom';
import TagPill from './TagPill';
import { stripHTML } from '../utils/sanitize';
import { getRelativeTime } from '../utils/dateHelpers';
import './PostCard.css';

export default function PostCard({ post, tags = [] }) {
  const navigate = useNavigate();

  return (
    <div className="post-card" onClick={() => navigate(`/post/${post.id}`)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
  );
}
