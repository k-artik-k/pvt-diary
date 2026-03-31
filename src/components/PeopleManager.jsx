import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function PeopleManager() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [members, setMembers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSpaces = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('spaces').select('id, name, icon').eq('user_id', user.id).order('name');
    setSpaces(data || []);
  }, [user]);

  const fetchMembers = useCallback(async () => {
    if (!selectedSpace) {
      setMembers([]);
      return;
    }
    const { data } = await supabase.from('space_members').select('*').eq('space_id', selectedSpace).order('created_at');
    setMembers(data || []);
  }, [selectedSpace]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

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
      setError('Username not found. Use their app username, not their email.');
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
    setMessage('Member added. They can now open the shared space link and read posts in this space.');
    fetchMembers();
  }

  async function handleRemove(id) {
    await supabase.from('space_members').delete().eq('id', id);
    fetchMembers();
  }

  return (
    <div style={{ padding: '8px 16px' }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 10 }}>
        Add the person&apos;s app username here. Shared posts only appear when you publish the post into that space.
      </p>

      <select value={selectedSpace} onChange={(e) => setSelectedSpace(e.target.value)} style={{ width: '100%', marginBottom: 8, fontSize: 13 }}>
        <option value="">Select a space</option>
        {spaces.map((space) => <option key={space.id} value={space.id}>{space.icon} {space.name}</option>)}
      </select>

      {selectedSpace && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value);
                setError('');
                setMessage('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleAdd}>Add</button>
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8 }}>{error}</p>}
          {message && <p style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8 }}>{message}</p>}

          <div>
            {members.map((member) => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 13 }}>{member.member_username}</span>
                <button onClick={() => handleRemove(member.id)} style={{ fontSize: 12, color: 'var(--danger)', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {members.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No members</p>}
          </div>
        </>
      )}
    </div>
  );
}
