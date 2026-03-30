import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import './Layout.css';

export default function Layout({ children, onSearch }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  useKeyboardShortcuts();

  return (
    <div className="layout">
      <Header onSearch={onSearch} />
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`layout-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
}
