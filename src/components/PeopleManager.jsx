import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getSharedSpaceUrl } from '../utils/appLinks';
import './SettingsManager.css';

export default function PeopleManager() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [members, setMembers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedSpaceItem = useMemo(
    () => spaces.find((space) => space.id === selectedSpace) || null,
    [spaces, selectedSpace]
  );

  const fetchSpaces = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('spaces')
      .select('id, name, icon, share_link')
      .eq('user_id', user.id)
      .order('name');

    setSpaces(data || []);
  }, [user]);

  const fetchMembers = useCallback(async () => {
    if (!selectedSpace) {
      setMembers([]);
      return;
    }

    const { data } = await supabase
      .from('space_members')
      .select('*')
      .eq('space_id', selectedSpace)
      .order('created_at');

    setMembers(data || []);
  }, [selectedSpace]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (!selectedSpace && spaces.length > 0) {
      setSelectedSpace(spaces[0].id);
      return;
    }

    if (selectedSpace && !spaces.some((space) => space.id === selectedSpace)) {
      setSelectedSpace(spaces[0]?.id || '');
    }
  }, [selectedSpace, spaces]);

  async function handleAdd() {
    const username = newUsername.trim();
    if (!username || !selectedSpace) return;

    setMessage('');
    setError('');

    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (!existingUser) {
      setError('Username not found.');
      return;
    }

    const { error: insertError } = await supabase.from('space_members').insert({
      space_id: selectedSpace,
      member_username: username,
      added_by: user.id
    });

    if (insertError) {
      setError(insertError.message || 'Could not add this person.');
      return;
    }

    setNewUsername('');
    setMessage('Person added.');
    fetchMembers();
  }

  async function handleRemove(id) {
    await supabase.from('space_members').delete().eq('id', id);
    fetchMembers();
  }

  async function handleCopyLink() {
    if (!selectedSpaceItem?.share_link) return;

    try {
      await navigator.clipboard.writeText(getSharedSpaceUrl(selectedSpaceItem.share_link));
      setMessage('Link copied.');
      setError('');
    } catch {
      setError('Could not copy link.');
      setMessage('');
    }
  }

  return (
    <div className="settings-tool">
      <div className="settings-tool-form">
        <div className="settings-tool-row">
          <select
            className="settings-tool-input"
            value={selectedSpace}
            onChange={(event) => {
              setSelectedSpace(event.target.value);
              setError('');
              setMessage('');
            }}
          >
            <option value="">Select space</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>{space.icon} {space.name}</option>
            ))}
          </select>

          {selectedSpaceItem && (
            <button className="btn btn-ghost" onClick={handleCopyLink}>
              Copy link
            </button>
          )}
        </div>

        {selectedSpace && (
          <>
            <div className="settings-tool-row">
              <input
                className="settings-tool-input"
                type="text"
                placeholder="Username"
                value={newUsername}
                onChange={(event) => {
                  setNewUsername(event.target.value);
                  setError('');
                  setMessage('');
                }}
                onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
              />
              <button className="btn btn-primary" onClick={handleAdd}>Add</button>
            </div>
          </>
        )}

        {error && <p className="settings-tool-note error">{error}</p>}
        {message && <p className="settings-tool-note success">{message}</p>}
      </div>

      <div className="settings-tool-list">
        {members.map((member) => (
          <div key={member.id} className="settings-tool-item">
            <div className="settings-tool-main">
              <span className="settings-tool-name">{member.member_username}</span>
            </div>
            <div className="settings-tool-item-actions">
              <button className="settings-tool-link danger" onClick={() => handleRemove(member.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        {selectedSpace && members.length === 0 && <p className="settings-tool-empty">No people yet.</p>}
        {!selectedSpace && spaces.length > 0 && <p className="settings-tool-empty">Choose a space.</p>}
        {spaces.length === 0 && <p className="settings-tool-empty">Create a space first.</p>}
      </div>
    </div>
  );
}
