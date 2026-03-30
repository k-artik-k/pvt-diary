import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import './Home.css';

const PAGE_SIZE = 20;

export default function Home({ searchQuery = '' }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const fetchPosts = useCallback(async (pageNum, search = '') => {
    let query = supabase
      .from('posts')
      .select('*, post_tags(tag_id, tags(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data } = await query;
    return data || [];
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setPosts([]);
    setPage(0);
    setHasMore(true);
    fetchPosts(0, searchQuery).then(data => {
      setPosts(data);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [user, searchQuery, fetchPosts]);

  // Infinite scroll
  useEffect(() => {
    if (!loadingRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          setLoading(true);
          fetchPosts(nextPage, searchQuery).then(data => {
            setPosts(prev => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
            setLoading(false);
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadingRef.current);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [hasMore, loading, page, searchQuery, fetchPosts]);

  function getPostTags(post) {
    return post.post_tags?.map(pt => pt.tags).filter(Boolean) || [];
  }

  if (!loading && posts.length === 0) {
    return (
      <div className="home-page">
        <div className="home-empty">
          <h2>{searchQuery ? 'No posts found' : 'No posts yet'}</h2>
          <p>{searchQuery ? `No posts matching "${searchQuery}"` : 'Click + to create your first post'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-feed">
        {posts.map((post, i) => (
          <div key={post.id}>
            <PostCard post={post} tags={getPostTags(post)} />
            {i < posts.length - 1 && <hr className="post-separator" />}
          </div>
        ))}
        <div ref={loadingRef}>
          {loading && <div className="home-loading">Loading...</div>}
        </div>
      </div>
    </div>
  );
}
