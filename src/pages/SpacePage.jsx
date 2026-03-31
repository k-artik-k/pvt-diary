import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import './SpacePage.css';

const PAGE_SIZE = 20;

export default function SpacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [space, setSpace] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const loadingRef = useRef(null);

  const fetchSpace = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('spaces')
      .select('id, name, icon, tag_id, user_id, tags(name)')
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

    let query = supabase
      .from('posts')
      .select('*, post_tags(tag_id, tags(*))')
      .eq('user_id', space.user_id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (space.tag_id) {
      const { data: taggedPostIds } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('tag_id', space.tag_id);

      const ids = (taggedPostIds || []).map((item) => item.post_id);
      if (ids.length === 0) {
        return [];
      }
      query = query.in('id', ids);
    } else {
      query = query.eq('space_id', id);
    }

    const { data } = await query;
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
      setPage(0);
      const data = await fetchPosts(0);
      if (cancelled) return;
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    }

    loadFirstPage();

    return () => {
      cancelled = true;
    };
  }, [space, fetchPosts]);

  useEffect(() => {
    if (!loadingRef.current) return;

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

  function getPostTags(post) {
    return post.post_tags?.map((item) => item.tags).filter(Boolean) || [];
  }

  function handlePostDeleted(postId) {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  }

  const isOwner = space?.user_id === user?.id;

  if (error) {
    return (
      <div className="space-page">
        <div className="space-page-card">
          <p className="space-page-kicker">Space</p>
          <h1 className="space-page-title">Unavailable</h1>
          <p className="space-page-description">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-page">
      <div className="space-page-card space-page-header">
        <h1 className="space-page-title">{space?.icon} {space?.name || 'Space'}</h1>

        {isOwner && (
          <button
            className="btn btn-primary"
            style={{ fontSize: 13, padding: '8px 14px' }}
            onClick={() => navigate(`/create?space=${id}`)}
          >
            + New Post
          </button>
        )}
      </div>

      <div className="space-page-feed">
        {posts.map((post, index) => (
          <div key={post.id}>
            <PostCard post={post} tags={getPostTags(post)} onDeleted={handlePostDeleted} />
            {index < posts.length - 1 && <hr className="post-separator" />}
          </div>
        ))}

        {!loading && posts.length === 0 && (
          <div className="space-page-empty">
            <p>No posts in this space yet.</p>
          </div>
        )}

        <div ref={loadingRef}>
          {loading && <div className="space-page-loading">Loading...</div>}
        </div>
      </div>
    </div>
  );
}
