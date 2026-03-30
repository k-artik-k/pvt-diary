import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const pendingKey = useRef(null);
  const timeoutRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // "/" to focus search — works even in inputs (prevent default)
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      document.getElementById('global-search')?.focus();
      return;
    }

    if (isInput) return;

    // g + h = home, g + c = calendar (two-key combo)
    if (pendingKey.current === 'g') {
      clearTimeout(timeoutRef.current);
      pendingKey.current = null;
      if (e.key === 'h') {
        e.preventDefault();
        navigate('/');
        return;
      }
      if (e.key === 'c') {
        e.preventDefault();
        navigate('/calendar');
        return;
      }
    }

    if (e.key === 'g') {
      pendingKey.current = 'g';
      timeoutRef.current = setTimeout(() => {
        pendingKey.current = null;
      }, 500);
      return;
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
