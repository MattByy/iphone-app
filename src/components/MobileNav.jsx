import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'home', icon: 'home', end: true },
  { to: '/chat', label: 'chat', icon: 'chat_bubble' },
  { to: '/ads', label: 'spaces', icon: 'grid_view' },
  { to: '/profile', label: 'you', icon: 'person' },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 border-t border-white/5 bg-[#0a0a0a]">
      <div className="flex justify-around items-center px-5 py-4 pb-safe max-w-xl mx-auto">
        {TABS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center scale-95 active:scale-90 transition-all ${
                isActive ? 'text-white' : 'text-[#8e9192] hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
                >
                  {icon}
                </span>
                {isActive && (
                  <span className="block w-1 h-1 bg-white rounded-full mt-1" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
