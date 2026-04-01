import { useEffect, useMemo, useRef, useState } from 'react';

export default function SettingsItemMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const visibleItems = useMemo(
    () => items.filter((item) => item && !item.hidden),
    [items]
  );

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleToggle(event) {
    event.stopPropagation();
    setOpen((prev) => !prev);
  }

  function handleSelect(event, action) {
    event.stopPropagation();
    setOpen(false);
    action?.();
  }

  if (visibleItems.length === 0) return null;

  return (
    <div className="settings-item-menu" ref={menuRef}>
      <button
        type="button"
        className={`settings-item-trigger ${open ? 'open' : ''}`}
        onClick={handleToggle}
        aria-label="More actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div className="settings-item-dropdown">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`settings-item-option ${item.danger ? 'danger' : ''}`}
              onClick={(event) => handleSelect(event, item.onSelect)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
