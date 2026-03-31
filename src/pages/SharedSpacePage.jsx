import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function SharedSpacePage() {
  const { shareLink } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  const resolveShareLink = useCallback(async () => {
    const { data } = await supabase
      .from('spaces')
      .select('id')
      .eq('share_link', shareLink)
      .maybeSingle();

    if (data?.id) {
      navigate(`/space/${data.id}`, { replace: true });
      return;
    }

    setStatus('unavailable');
  }, [navigate, shareLink]);

  useEffect(() => {
    resolveShareLink();
  }, [resolveShareLink]);

  if (status === 'loading') {
    return (
      <div style={{ width: 'min(100%, 760px)', margin: '0 auto', padding: '24px', color: 'var(--text-muted)' }}>
        Opening shared space...
      </div>
    );
  }

  return (
    <div style={{ width: 'min(100%, 760px)', margin: '0 auto', padding: '24px' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Shared Space
        </p>
        <h1 style={{ fontSize: 24, lineHeight: 1.2, marginBottom: 10 }}>This space is not available to your account yet.</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          Ask the owner to add your app username in <strong>Profile &gt; People</strong>, then open the link again.
        </p>
      </div>
    </div>
  );
}
