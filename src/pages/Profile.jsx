import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function firstNameFrom(email) {
  if (!email) return 'you';
  const local = email.split('@')[0];
  return local.split(/[._-]/)[0];
}

const CONNECTIONS = [
  { icon: 'music_note', label: 'Spotify', connected: true },
  { icon: 'calendar_today', label: 'Google Calendar', connected: true },
  { icon: 'description', label: 'Notion', connected: false },
  { icon: 'code', label: 'GitHub', connected: true },
  { icon: 'directions_run', label: 'Strava', connected: false },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full flex-shrink-0 transition-colors"
      style={{ backgroundColor: checked ? '#ffffff' : '#161616', border: checked ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full transition-transform"
        style={{
          left: '4px',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          backgroundColor: checked ? '#0a0a0a' : '#ffffff',
        }}
      />
    </button>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(true);
  const [autoDeploy, setAutoDeploy] = useState(false);
  const [showChanges, setShowChanges] = useState(true);

  const name = firstNameFrom(user?.email);
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white">
      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5 justify-between">
        <h1 className="text-[20px] font-medium lowercase text-white">you</h1>
        <button className="text-white hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-screen-md mx-auto px-5 pt-24 pb-safe flex flex-col gap-8">
        {/* Identity row */}
        <section className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-[#161616] border border-white/5"
          >
            <span className="text-[20px] font-medium text-white">{initial}</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[20px] font-medium lowercase text-white tracking-tight">{name}</h2>
            <p className="text-[14px] text-[#8e9192]">{user?.email}</p>
          </div>
        </section>

        {/* Connections */}
        <section className="flex flex-col gap-3">
          <h3 className="text-[12px] font-medium text-[#8e9192] uppercase tracking-wider">Connections</h3>
          <div className="flex flex-col bg-[#161616] border border-white/5 rounded-xl overflow-hidden">
            {CONNECTIONS.map(({ icon, label, connected }, idx) => (
              <button
                key={label}
                className={`flex items-center justify-between p-4 active:bg-[#1c1b1b] transition-colors text-left w-full ${
                  idx < CONNECTIONS.length - 1 ? 'border-b border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-white">{icon}</span>
                  <span className="text-[14px] text-white">{label}</span>
                </div>
                <span
                  className="text-[12px] font-medium lowercase"
                  style={{ color: connected ? '#4ade80' : '#8e9192' }}
                >
                  {connected ? 'connected' : 'not connected'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Atlas settings */}
        <section className="flex flex-col gap-3">
          <h3 className="text-[12px] font-medium text-[#8e9192] uppercase tracking-wider">Atlas settings</h3>
          <div className="flex flex-col bg-[#161616] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-[14px] text-white">Push notifications</span>
                <span className="text-[12px] text-[#8e9192]">Alerts for critical AI updates</span>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-[14px] text-white">Auto-deploy changes</span>
                <span className="text-[12px] text-[#8e9192]">Apply config updates instantly</span>
              </div>
              <Toggle checked={autoDeploy} onChange={setAutoDeploy} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex flex-col">
                <span className="text-[14px] text-white">Show raw changes</span>
                <span className="text-[12px] text-[#8e9192]">Display diffs before execution</span>
              </div>
              <Toggle checked={showChanges} onChange={setShowChanges} />
            </div>
          </div>
        </section>

        {/* Sign out */}
        <section className="flex justify-center py-4">
          <button
            onClick={handleSignOut}
            className="text-[14px] text-red-400 opacity-80 hover:opacity-100 transition-opacity lowercase py-2 px-4"
          >
            sign out
          </button>
        </section>
      </main>
    </div>
  );
}
