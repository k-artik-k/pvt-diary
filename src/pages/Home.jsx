import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import PinnedPostsRail from '../components/PinnedPostsRail';
import { sortPostsByCreatedAt } from '../utils/postOrdering';
import './Home.css';

const PAGE_SIZE = 20;

export default function Home({ searchQuery = '' }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [pinnedPosts, setPinnedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const fetchPosts = useCallback(async (pageNum, search = '') => {
    let query = supabase
      .from('posts')
      .select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data } = await query;
    return data || [];
  }, [user]);

  const fetchPinnedPosts = useCallback(async (search = '') => {
    let query = supabase
      .from('posts')
      .select('*, spaces(id, name, icon, share_link), post_tags(tag_id, tags(*))')
      .eq('user_id', user.id)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false });

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
    setPinnedPosts([]);
    setPage(0);
    setHasMore(true);
    Promise.all([fetchPosts(0, searchQuery), fetchPinnedPosts(searchQuery)]).then(([postData, pinnedData]) => {
      setPosts(postData);
      setPinnedPosts(sortPostsByCreatedAt(pinnedData));
      setHasMore(postData.length === PAGE_SIZE);
      setLoading(false);
    });
  }, [user, searchQuery, fetchPinnedPosts, fetchPosts]);

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

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(post => post.id !== postId));
    setPinnedPosts(prev => prev.filter(post => post.id !== postId));
  }

  function handlePostUpdated(updatedPost, updatedTags) {
    const nextPost = {
      ...updatedPost,
      post_tags: updatedTags.map((tag) => ({ tag_id: tag.id, tags: tag }))
    };

    setPosts((prev) => prev.map((post) => (
      post.id === updatedPost.id ? nextPost : post
    )));

    setPinnedPosts((prev) => {
      const others = prev.filter((post) => post.id !== updatedPost.id);
      return updatedPost.is_pinned ? sortPostsByCreatedAt([nextPost, ...others]) : others;
    });
  }

  if (!loading && posts.length === 0 && pinnedPosts.length === 0) {
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
      <PinnedPostsRail posts={pinnedPosts} createPath="/create" createLabel="New Post" />

      <div className="home-feed">
        {posts.map((post, i) => (
          <div key={post.id}>
            <PostCard
              post={post}
              tags={getPostTags(post)}
              onDeleted={handlePostDeleted}
              onUpdated={handlePostUpdated}
            />
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
