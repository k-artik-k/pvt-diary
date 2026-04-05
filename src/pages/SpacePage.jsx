import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import PinnedPostsRail from '../components/PinnedPostsRail';
import { getSharedSpaceUrl } from '../utils/appLinks';
import { sortPostsByCreatedAt } from '../utils/postOrdering';
import './SpacePage.css';

const PAGE_SIZE = 20;

export default function SpacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const loadingRef = useRef(null);

  const fetchSpace = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('spaces')
      .select('id, name, icon, user_id, share_link')
      .eq('id', id)
      .maybeSingle();

    if (!data) {
      setError('This space is not available to your account.');
      setLoading(false);
      return;
    }

    setSpace(data);
  }, [id, user]);

  const fetchPosts = useCallback(async (pageNum) => {
    if (!space) return [];

    const { data } = await supabase
      .from('posts')
      .select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))')
      .eq('space_id', id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    return data || [];
  }, [id, space]);

  const fetchPinnedPosts = useCallback(async () => {
    if (!space) return [];

    const { data } = await supabase
      .from('posts')
      .select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))')
      .eq('space_id', id)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false });

    return data || [];
  }, [id, space]);

  useEffect(() => {
    fetchSpace();
  }, [fetchSpace]);

  useEffect(() => {
    if (!space) return;

    let cancelled = false;

    async function loadFirstPage() {
      setLoading(true);
      setPosts([]);
      setPinnedPosts([]);
      setPage(0);
      const [data, pinnedData] = await Promise.all([fetchPosts(0), fetchPinnedPosts()]);
      if (cancelled) return;
      setPosts(data);
      setPinnedPosts(sortPostsByCreatedAt(pinnedData));
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }

    loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [space, fetchPinnedPosts, fetchPosts]);

  useEffect(() => {
    if (!loadingRef.current) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        setLoading(true);
        fetchPosts(nextPage).then((data) => {
          setPosts((prev) => [...prev, ...data]);
          setHasMore(data.length === PAGE_SIZE);
          setLoading(false);
        });
      }
    }, { threshold: 0.1 });

    observer.observe(loadingRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchPosts]);

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function getPostTags(post) {
    return post.post_tags?.map((item) => item.tags).filter(Boolean) || [];
  }

  function handlePostDeleted(postId) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    setPinnedPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  function handlePostUpdated(updatedPost, updatedTags) {
    const nextPost = {
      ...updatedPost,
      post_tags: updatedTags.map((tag) => ({ tag_id: tag.id, tags: tag }))
    };

    setPosts((prev) => {
      if (updatedPost.space_id !== id) {
        return prev.filter((post) => post.id !== updatedPost.id);
      }

      return prev.map((post) => (
        post.id === updatedPost.id
          ? nextPost
          : post
      ));
    });

    setPinnedPosts((prev) => {
      const others = prev.filter((post) => post.id !== updatedPost.id);

      if (updatedPost.space_id !== id || !updatedPost.is_pinned) {
        return others;
      }

      return sortPostsByCreatedAt([nextPost, ...others]);
    });
  }

  async function handleCopyLink() {
    if (!space?.share_link) return;

    try {
      await navigator.clipboard.writeText(getSharedSpaceUrl(space.share_link));
      setCopied(true);
    } catch {}
  }

  const isOwner = space?.user_id === user?.id;

  if (error) {
    return (
      <div className="space-page">
        <div className="space-page-error">
          <h1 className="space-page-title">Unavailable</h1>
          <p className="space-page-error-copy">{error}</p>
        </div>
      </div>
    );
  }

  if (loading && !space) {
    return (
      <div className="space-page">
        <div className="space-page-feed">
          <div className="space-page-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-page">
      <div className="space-page-header">
        <div className="space-page-heading">
          <button className="space-page-back" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="space-page-heading-copy">
            <h1 className="space-page-title">{space?.icon} {space?.name || 'Space'}</h1>
            <div className="space-page-meta">
              <span className="space-page-chip">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span>
              <span className="space-page-chip">{isOwner ? 'Owner' : 'Shared'}</span>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="space-page-actions">
            <button className="btn btn-ghost" onClick={handleCopyLink}>
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/create?space=${id}`)}>
              New Post
            </button>
          </div>
        )}
      </div>

      <PinnedPostsRail
        posts={pinnedPosts}
        createPath={isOwner ? `/create?space=${id}` : ''}
        createLabel="New Post"
      />

      <div className="space-page-feed">
        {posts.map((post, index) => (
          <div key={post.id}>
            <PostCard
              post={post}
              tags={getPostTags(post)}
              onDeleted={handlePostDeleted}
              onUpdated={handlePostUpdated}
            />
            {index < posts.length - 1 && <hr className="post-separator" />}
          </div>
        ))}

        {!loading && posts.length === 0 && (
          <div className="space-page-empty">
            <h2>No posts yet</h2>
            <p>{isOwner ? 'Start with a new post.' : 'Nothing shared here yet.'}</p>
            {isOwner && (
              <button className="btn btn-primary" onClick={() => navigate(`/create?space=${id}`)}>
                New Post
              </button>
            )}
          </div>
        )}

        <div ref={loadingRef}>
          {loading && <div className="space-page-loading">Loading...</div>}
        </div>
      </div>
    </div>
  );
}
