import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exportAllData, importData } from '../utils/exportImport';
import SettingsShell from '../components/SettingsShell';

export default function SettingsProfile() {
  const { user, profile, updateUsername, updatePassword, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState({ error: '', success: '', saving: false });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordState, setPasswordState] = useState({ error: '', success: '', saving: false });

  const currentUsername =
    profile?.username ||
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'user';

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  async function handleUsernameSave() {
    const nextUsername = username.trim();
    if (!nextUsername) {
      setUsernameState({ error: 'Username is required.', success: '', saving: false });
      return;
    }

    if (nextUsername === profile?.username) {
      setUsernameState({ error: '', success: 'Username is already up to date.', saving: false });
      return;
    }

    setUsernameState({ error: '', success: '', saving: true });
    const { error } = await updateUsername(nextUsername);

    if (error) {
      setUsernameState({ error: error.message || 'Unable to update username.', success: '', saving: false });
      return;
    }

    setUsernameState({ error: '', success: 'Username updated successfully.', saving: false });
  }

  async function handlePasswordSave() {
    if (!password || password.length < 6) {
      setPasswordState({ error: 'Password must be at least 6 characters.', success: '', saving: false });
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordState({ error: 'Passwords do not match.', success: '', saving: false });
      return;
    }

    setPasswordState({ error: '', success: '', saving: true });
    const { error } = await updatePassword(password);

    if (error) {
      setPasswordState({ error: error.message || 'Unable to update password.', success: '', saving: false });
      return;
    }

    setPassword('');
    setPasswordConfirm('');
    setPasswordState({ error: '', success: 'Password updated successfully.', saving: false });
  }

  async function handleExport() {
    await exportAllData(user.id);
  }

  async function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        await importData(user.id, file);
        window.location.reload();
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      }
    };
    input.click();
  }

  return (
    <SettingsShell title="Profile">
      <section className="settings-card">
        <h2 className="settings-card-title">Username</h2>
        <p className="settings-card-copy">People add this name to a space.</p>
        <div className="settings-form-grid">
          <div className="settings-field">
            <span className="settings-label">Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
          <div className="settings-field">
            <span className="settings-label">Email</span>
            <input value={user?.email || ''} disabled />
          </div>
        </div>
        {usernameState.error && <p className="settings-note error">{usernameState.error}</p>}
        {usernameState.success && <p className="settings-note success">{usernameState.success}</p>}
        <div className="settings-inline-actions">
          <button className="btn btn-primary" onClick={handleUsernameSave} disabled={usernameState.saving}>
            {usernameState.saving ? 'Saving...' : 'Save Username'}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Password</h2>
        <p className="settings-card-copy">Set a new password.</p>
        <div className="settings-form-grid">
          <div className="settings-field">
            <span className="settings-label">New Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div className="settings-field">
            <span className="settings-label">Confirm Password</span>
            <input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
          </div>
        </div>
        {passwordState.error && <p className="settings-note error">{passwordState.error}</p>}
        {passwordState.success && <p className="settings-note success">{passwordState.success}</p>}
        <div className="settings-inline-actions">
          <button className="btn btn-primary" onClick={handlePasswordSave} disabled={passwordState.saving}>
            {passwordState.saving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Data</h2>
        <p className="settings-card-copy">Backup or restore.</p>
        <div className="settings-tools">
          <button className="btn btn-ghost" onClick={handleExport}>Export Data</button>
          <button className="btn btn-ghost" onClick={handleImport}>Import Data</button>
          <button className="btn btn-danger" onClick={signOut}>Sign Out</button>
        </div>
      </section>
    </SettingsShell>
  );
}
