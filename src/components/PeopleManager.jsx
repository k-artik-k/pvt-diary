import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function PeopleManager() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [members, setMembers] = useState([]);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    if (user) fetchSpaces();
  }, [user]);

  useEffect(() => {
    if (selectedSpace) fetchMembers();
  }, [selectedSpace]);

  async function fetchSpaces() {
    const { data } = await supabase.from('spaces').select('id, name, icon').eq('user_id', user.id).order('name');
    setSpaces(data || []);
  }

  async function fetchMembers() {
    const { data } = await supabase.from('space_members').select('*').eq('space_id', selectedSpace).order('created_at');
    setMembers(data || []);
  }

  async function handleAdd() {
    if (!newUsername.trim() || !selectedSpace) return;
    const { error } = await supabase.from('space_members').insert({
      space_id: selectedSpace,
      member_username: newUsername.trim(),
      added_by: user.id
    });
    if (!error) {
      setNewUsername('');
      fetchMembers();
    }
  }

  async function handleRemove(id) {
    await supabase.from('space_members').delete().eq('id', id);
    fetchMembers();
  }

  return (
    <div style={{ padding: '8px 16px' }}>
      <select value={selectedSpace} onChange={e => setSelectedSpace(e.target.value)} style={{ width: '100%', marginBottom: 8, fontSize: 13 }}>
        <option value="">Select a space</option>
        {spaces.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
      </select>

      {selectedSpace && (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} style={{ flex: 1, fontSize: 13 }} />
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={handleAdd}>Add</button>
          </div>

          <div>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: 13 }}>{m.member_username}</span>
                <button onClick={() => handleRemove(m.id)} style={{ fontSize: 12, color: 'var(--danger)', cursor: 'pointer' }}>Remove</button>
              </div>
            ))}
            {members.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No members</p>}
          </div>
        </>
      )}
    </div>
  );
}
