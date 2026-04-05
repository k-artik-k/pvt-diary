import { useNavigate } from 'react-router-dom';
import { stripHTML } from '../utils/sanitize';
import { getRelativeTime } from '../utils/dateHelpers';
import './PinnedPostsRail.css';

export default function PinnedPostsRail({ posts = [], createPath = '', createLabel = 'Create' }) {
  const navigate = useNavigate();

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="pinned-posts-rail" aria-label="Pinned posts">
      <div className="pinned-posts-header">
        <h2 className="pinned-posts-title">Pinned</h2>
      </div>

      <div className="pinned-posts-track">
        {posts.map((post) => (
          <button
            key={post.id}
            className="pinned-post-card"
            onClick={() => navigate(`/post/${post.id}`)}
            title={post.title || 'Untitled'}
          >
            <div className="pinned-post-card-top">
              <span className="pinned-post-card-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 17v5" />
                  <path d="M8 4h8" />
                  <path d="m9 4 1 7-3 3h10l-3-3 1-7" />
                </svg>
              </span>
              {post.spaces && (
                <span className="pinned-post-card-space">
                  {post.spaces.icon} {post.spaces.name}
                </span>
              )}
            </div>

            <div className="pinned-post-card-body">
              <div className="pinned-post-card-title">{post.title || 'Untitled'}</div>
              {post.subtitle && <div className="pinned-post-card-subtitle">{post.subtitle}</div>}
              {!post.subtitle && post.body && (
                <div className="pinned-post-card-snippet">{stripHTML(post.body)}</div>
              )}
            </div>

            <div className="pinned-post-card-meta">{getRelativeTime(post.created_at)}</div>
          </button>
        ))}

        {createPath && (
          <button
            className="pinned-post-create"
            onClick={() => navigate(createPath)}
            aria-label={createLabel}
            title={createLabel}
          >
            <span className="pinned-post-create-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="pinned-post-create-label">{createLabel}</span>
          </button>
        )}
      </div>
    </section>
  );
}
