import React from 'react';
import { useNavigate } from 'react-router-dom';

const SPACES = [
  { icon: 'fitness_center', name: 'fitness', desc: 'Track regimens & vitals', id: 'fitness' },
  { icon: 'business_center', name: 'business', desc: 'Venture intelligence', id: 'business' },
  { icon: 'edit_note', name: 'notes', desc: 'Captured thoughts', id: 'notes' },
  { icon: 'account_balance', name: 'finance', desc: 'Asset allocation', id: 'finance' },
  { icon: 'task_alt', name: 'habits', desc: 'Routine tracking', id: 'habits' },
  { icon: 'link', name: 'links', desc: 'Saved resources', id: 'links' },
];

export default function Library() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0e0e0e] text-white min-h-full">
      {/* Top AppBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#141313] border-b border-white/5">
        <div className="flex items-center px-5 h-16 w-full max-w-screen-xl mx-auto">
          <button className="text-white hover:opacity-80 transition-opacity mr-4">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="text-[20px] font-medium lowercase text-white flex-1">tipas</h1>
        </div>
      </nav>

      {/* Main content */}
      <main className="pt-24 pb-6 px-5 max-w-screen-xl mx-auto w-full">
        <header className="mb-8">
          <h2 className="text-[14px] text-[#8e9192]">everything atlas has built for you</h2>
        </header>

        {/* Module grid */}
        <div className="grid grid-cols-2 gap-3">
          {SPACES.map(({ icon, name, desc, id }) => (
            <div
              key={id}
              onClick={() => navigate(`/space/${id}`)}
              className="bg-[#1c1b1b] rounded-xl border border-white/5 p-4 flex flex-col justify-between aspect-square relative active:bg-[#353434] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>
                {icon}
              </span>
              <div>
                <h3 className="text-[16px] text-white lowercase mb-1">{name}</h3>
                <p
                  className="text-[12px] text-[#8e9192]"
                  style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {desc}
                </p>
              </div>
              <span
                className="material-symbols-outlined text-[#8e9192] absolute bottom-4 right-4"
                style={{ fontSize: '16px' }}
              >
                arrow_forward
              </span>
            </div>
          ))}

          {/* Add new space CTA */}
          <div className="col-span-2 border border-dashed border-white/20 rounded-xl p-4 flex flex-row items-center justify-center gap-3 h-24 active:bg-[#353434] transition-colors cursor-pointer mt-1">
            <span className="material-symbols-outlined text-[#8e9192]" style={{ fontSize: '20px' }}>
              add
            </span>
            <span className="text-[14px] text-[#8e9192] lowercase">ask atlas to build a space</span>
          </div>
        </div>
      </main>
    </div>
  );
}
