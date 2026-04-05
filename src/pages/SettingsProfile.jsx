import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exportAllData, importData } from '../utils/exportImport';
import SettingsShell from '../components/SettingsShell';

export default function SettingsProfile() {
  const { user, profile, updateUsername, updatePassword, deleteAccount, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState({ error: '', success: '', saving: false });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordState, setPasswordState] = useState({ error: '', success: '', saving: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteState, setDeleteState] = useState({ error: '', saving: false });

  const currentUsername =
    profile?.username ||
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'user';

  useEffect(() => {
    setUsername(currentUsername);
  }, [currentUsername]);

  const deleteMatches = deleteInput.trim() === currentUsername;

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

  async function handleDeleteAccount() {
    if (!deleteMatches) {
      setDeleteState({ error: 'Type your username exactly to continue.', saving: false });
      return;
    }

    setDeleteState({ error: '', saving: true });
    const { error } = await deleteAccount();

    if (error) {
      setDeleteState({
        error: error.message || 'Unable to delete account. If you uploaded files earlier, remove them first or use the admin dashboard.',
        saving: false
      });
    }
  }

  return (
    <SettingsShell title="Profile">
      <section className="settings-card">
        <h2 className="settings-card-title">Account</h2>
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
            {usernameState.saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Password</h2>
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
            {passwordState.saving ? 'Updating...' : 'Update'}
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2 className="settings-card-title">Data</h2>
        <div className="settings-tools">
          <button className="btn btn-ghost" onClick={handleExport}>Export</button>
          <button className="btn btn-ghost" onClick={handleImport}>Import</button>
          <button className="btn btn-danger" onClick={signOut}>Sign out</button>
        </div>
      </section>

      <section className="settings-card settings-danger-card">
        <h2 className="settings-card-title">Danger</h2>
        <div className="settings-danger-body">
          <p className="settings-note">
            Delete your account and all of your owned data permanently. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <div className="settings-inline-actions">
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete account
              </button>
            </div>
          ) : (
            <div className="settings-danger-confirm">
              <div className="settings-field">
                <span className="settings-label">Type your username to confirm</span>
                <input
                  value={deleteInput}
                  onChange={(event) => setDeleteInput(event.target.value)}
                  placeholder={currentUsername}
                />
              </div>

              {deleteState.error && <p className="settings-note error">{deleteState.error}</p>}

              <div className="settings-danger-actions">
                <button
                  className="btn btn-danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteState.saving || !deleteMatches}
                >
                  {deleteState.saving ? 'Deleting...' : 'Delete permanently'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInput('');
                    setDeleteState({ error: '', saving: false });
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </SettingsShell>
  );
}
