import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingKey = useRef(null);
  const timeoutRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    const target = event.target;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;
    const isCreateShortcut =
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'k';

    if (isCreateShortcut && !isInput) {
      event.preventDefault();
      navigate('/create');
      return;
    }

    if (event.key === '/' && !isInput) {
      event.preventDefault();
      document.getElementById('global-search')?.focus();
      return;
    }

    if (isInput) return;

    if (pendingKey.current === 'g') {
      clearTimeout(timeoutRef.current);
      pendingKey.current = null;

      if (event.key === 'h') {
        event.preventDefault();
        navigate('/');
        return;
      }

      if (event.key === 'c') {
        event.preventDefault();
        navigate('/calendar');
        return;
      }
    }

    if (event.key === 'g') {
      pendingKey.current = 'g';
      timeoutRef.current = setTimeout(() => {
        pendingKey.current = null;
      }, 500);
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
