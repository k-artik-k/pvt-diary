import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Identicon from '../components/Identicon';
import { useAuth } from '../contexts/AuthContext';
import { fetchOwnedSpacePerson } from '../utils/peopleDirectory';
import './PersonProfile.css';

function Avatar({ avatarUrl, value, size = 88 }) {
  return (
    <div className="person-profile-avatar" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" />
      ) : (
        <Identicon value={value} size={size} />
      )}
    </div>
  );
}

export default function PersonProfile() {
  const navigate = useNavigate();
  const { username: usernameParam } = useParams();
  const { user } = useAuth();
  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadPerson() {
      if (!user?.id || !usernameParam) return;

      setLoading(true);
      setError('');

      const decodedUsername = decodeURIComponent(usernameParam);
      const result = await fetchOwnedSpacePerson(user.id, decodedUsername);

      if (cancelled) return;

      if (!result) {
        setPerson(null);
        setError('This person is not in your spaces.');
        setLoading(false);
        return;
      }

      setPerson(result);
      setLoading(false);
    }

    loadPerson();

    return () => {
      cancelled = true;
    };
  }, [user?.id, usernameParam]);

  if (loading) {
    return (
      <div className="person-profile-page">
        <div className="person-profile-card">
          <p className="person-profile-loading">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="person-profile-page">
        <div className="person-profile-card">
          <button className="person-profile-back" onClick={() => navigate(-1)} aria-label="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="person-profile-title">Unavailable</h1>
          <p className="person-profile-copy">{error || 'Profile not available.'}</p>
        </div>
      </div>
    );
  }

  const hasDistinctDisplayName = person.displayName && person.displayName !== person.username;

  return (
    <div className="person-profile-page">
      <div className="person-profile-card">
        <button className="person-profile-back" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="person-profile-hero">
          <Avatar avatarUrl={person.avatarUrl} value={person.username} />

          <div className="person-profile-identity">
            <h1 className="person-profile-title">{person.displayName}</h1>
            {hasDistinctDisplayName && (
              <p className="person-profile-username">@{person.username}</p>
            )}
            {!hasDistinctDisplayName && (
              <p className="person-profile-username">{person.username}</p>
            )}
          </div>
        </div>

        <div className="person-profile-stat">
          <span className="person-profile-stat-label">Spaces</span>
          <strong className="person-profile-stat-value">{person.spaceCount}</strong>
        </div>

        <section className="person-profile-section">
          <h2 className="person-profile-section-title">In Your Spaces</h2>
          <div className="person-profile-space-list">
            {person.spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                className="person-profile-space-item"
                onClick={() => navigate(`/space/${space.id}`)}
              >
                <span className="person-profile-space-icon">{space.icon || ' '}</span>
                <span className="person-profile-space-name">{space.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
