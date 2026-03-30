import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';

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
  const loadingRef = useRef(null);

  const fetchPosts = useCallback(async (pageNum) => {
    // Fetch posts in this space, OR if space has a linked tag, filter by that tag
    let query = supabase
      .from('posts')
      .select('*, post_tags(tag_id, tags(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (space?.tag_id) {
      // Filter posts that have this tag
      const { data: taggedPostIds } = await supabase
        .from('post_tags')
        .select('post_id')
        .eq('tag_id', space.tag_id);

      const ids = (taggedPostIds || []).map(p => p.post_id);
      if (ids.length > 0) {
        query = query.in('id', ids);
      } else {
        return [];
      }
    } else {
      query = query.eq('space_id', id);
    }

    const { data } = await query;
    return data || [];
  }, [user, id, space]);

  useEffect(() => {
    if (!user) return;
    supabase.from('spaces').select('*, tags(name)').eq('id', id).single()
      .then(({ data }) => {
        setSpace(data);
      });
  }, [user, id]);

  useEffect(() => {
    if (!space) return;
    setLoading(true);
    setPosts([]);
    setPage(0);
    fetchPosts(0).then(data => {
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [space, fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    if (!loadingRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        setLoading(true);
        fetchPosts(nextPage).then(data => {
          setPosts(prev => [...prev, ...data]);
          setHasMore(data.length === PAGE_SIZE);
          setLoading(false);
        });
      }
    }, { threshold: 0.1 });
    observer.observe(loadingRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchPosts]);

  function getPostTags(post) {
    return post.post_tags?.map(pt => pt.tags).filter(Boolean) || [];
  }

  return (
    <div style={{ padding: '0 20px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 8px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>
          {space?.icon} {space?.name || 'Space'}
        </h1>
        <button
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '6px 14px' }}
          onClick={() => navigate(`/create?space=${id}`)}
        >
          + New Post
        </button>
      </div>
      {space?.tags && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Filtering by tag: {space.tags.name}
        </p>
      )}

      <div style={{ maxWidth: 720 }}>
        {posts.map((post, i) => (
          <div key={post.id}>
            <PostCard post={post} tags={getPostTags(post)} />
            {i < posts.length - 1 && <hr className="post-separator" />}
          </div>
        ))}
        {!loading && posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <p>No posts in this space yet</p>
          </div>
        )}
        <div ref={loadingRef}>
          {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>}
        </div>
      </div>
    </div>
  );
}
