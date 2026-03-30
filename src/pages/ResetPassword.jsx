import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function ResetPassword() {
  const { resetPassword, updatePassword } = useAuth();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('type') === 'recovery';
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    if (!email) { setError('Enter your email'); return; }
    setLoading(true); setError('');
    const { error: err } = await resetPassword(email);
    if (err) setError(err.message);
    else setSuccess('Check your email for a password reset link.');
    setLoading(false);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    const { error: err } = await updatePassword(newPassword);
    if (err) setError(err.message);
    else setSuccess('Password updated! You can now sign in.');
    setLoading(false);
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">{isReset ? 'Set New Password' : 'Reset Password'}</h1>
        <p className="auth-subtitle">{isReset ? 'Enter your new password' : 'Enter your email to receive a reset link'}</p>
        <form className="auth-form" onSubmit={isReset ? handleUpdate : handleRequest}>
          {isReset ? (
            <input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          ) : (
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          )}
          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">{success}</p>}
          <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} type="submit" disabled={loading}>
            {loading ? 'Processing...' : isReset ? 'Update Password' : 'Send Reset Link'}
          </button>
        </form>
        <div className="auth-link">
          <Link to="/login">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
