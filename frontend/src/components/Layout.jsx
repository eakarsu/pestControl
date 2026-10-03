import React from 'react';
import SectionSidebar from './SectionSidebar';
import { FiFileText, FiLogOut, FiShield } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function signOut() {
    await logout();
    navigate('/login');
  }
  return (
    <div className="min-h-screen bg-gray-50 codex-section-shell">
      <SectionSidebar title="Service Evidence" items={[
        { href: '#evidence-overview', label: 'Overview' },
        { href: '#load-evidence', label: 'Load Evidence' },
        { href: '#register-evidence', label: 'Register Evidence' },
        { href: '#evidence-records', label: 'Evidence Records' },
        { href: '#evidence-actions', label: 'Export and Holds' },
      ]} />
      <div className="codex-section-content">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/evidence" className="flex items-center gap-3 font-bold text-gray-900">
          <FiShield className="text-primary-600" /> Governed Service Evidence
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span>{user?.firstName} {user?.lastName} · {user?.role}</span>
          <button className="btn btn-secondary flex items-center gap-2" onClick={signOut}><FiLogOut /> Sign out</button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-6"><Link className="flex items-center gap-2 text-primary-700 font-medium" to="/evidence"><FiFileText /> Evidence workspace</Link></nav>
        <main>{children}</main>
      </div>
      </div>
    </div>
  );
}
