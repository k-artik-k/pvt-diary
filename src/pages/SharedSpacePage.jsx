import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function SharedSpacePage() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const sharedPostId = searchParams.get('post');

  const resolveShareLink = useCallback(async () => {
    const { data } = await supabase
      .from('spaces')
      .select('id')
      .eq('share_link', shareLink)
      .maybeSingle();

    if (data?.id) {
      if (sharedPostId) {
        const { data: postData } = await supabase
          .from('posts')
          .select('id')
          .eq('id', sharedPostId)
          .eq('space_id', data.id)
          .maybeSingle();

        if (postData?.id) {
          navigate(`/post/${sharedPostId}`, { replace: true });
          return;
        }
      }

      navigate(`/space/${data.id}`, { replace: true });
      return;
    }

    setStatus('unavailable');
  }, [navigate, shareLink, sharedPostId]);

  useEffect(() => {
    resolveShareLink();
  }, [resolveShareLink]);

  if (status === 'loading') {
    return (
      <div style={{ width: 'min(100%, 760px)', margin: '0 auto', padding: '24px', color: 'var(--text-muted)' }}>
        Opening...
      </div>
    );
  }

  return (
    <div style={{ width: 'min(100%, 760px)', margin: '0 auto', padding: '24px' }}>
      <div style={{ padding: '18px 0', borderTop: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 8 }}>Unavailable</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Ask the owner to add your username, then try again.
        </p>
      </div>
    </div>
  );
}
