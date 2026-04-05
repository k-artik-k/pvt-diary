import { useEffect, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './Layout.css';

export default function Layout({ children, onSearch }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useKeyboardShortcuts();

  useEffect(() => {
    function handleResize() {
      const nextIsMobile = window.innerWidth <= 768;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="layout">
      <Header
        onSearch={onSearch}
        showMobileMenuToggle={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
      />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        isMobile={isMobile}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <main className={`layout-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}
