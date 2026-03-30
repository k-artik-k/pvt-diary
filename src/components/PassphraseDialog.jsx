import { useState } from 'react';

export default function PassphraseDialog({ mode = 'unlock', onSubmit, onCancel }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!passphrase) {
      setError('Passphrase is required');
      return;
    }
    if (mode === 'set' && passphrase !== confirm) {
      setError('Passphrases do not match');
      return;
    }
    onSubmit(passphrase);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{mode === 'set' ? 'Set Passphrase' : 'Enter Passphrase'}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
          {mode === 'set'
            ? 'This post will be encrypted. You must remember the passphrase to access it.'
            : 'This post is locked. Enter the passphrase to view it.'}
        </p>
        <input
          type="password"
          placeholder="Passphrase"
          value={passphrase}
          onChange={e => { setPassphrase(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={{ width: '100%', marginBottom: 8 }}
          autoFocus
        />
        {mode === 'set' && (
          <input
            type="password"
            placeholder="Confirm passphrase"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', marginBottom: 8 }}
          />
        )}
        {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            {mode === 'set' ? 'Lock Post' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
