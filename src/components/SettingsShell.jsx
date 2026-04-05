import { useNavigate } from 'react-router-dom';
import './SettingsShell.css';

export default function SettingsShell({ title, description, children }) {
  const navigate = useNavigate();

  return (
    <section className="settings-page">
      <header className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate(-1)} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="settings-heading">
          <h1 className="settings-title">{title}</h1>
          {description && <p className="settings-description">{description}</p>}
        </div>
      </header>

      <div className="settings-content">
        {children}
      </div>
    </section>
  );
}
