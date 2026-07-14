import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

function firstNameFrom(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  return local.split(/[._-]/)[0];
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = firstNameFrom(user?.email);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-full">
      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-40 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5">
        <div className="flex items-center gap-4 w-full max-w-2xl mx-auto">
          <span className="material-symbols-outlined text-white cursor-pointer hover:opacity-80 transition-opacity">
            menu
          </span>
          <h1 className="text-[20px] font-medium lowercase text-white">tipas</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="px-5 pt-24 pb-6 flex flex-col gap-8 max-w-2xl mx-auto">
        {/* Greeting */}
        <section className="flex flex-col gap-2">
          <h2 className="text-[20px] font-medium lowercase text-white">
            hey{name ? `, ${name}` : ''}.
          </h2>
          <p className="text-[14px] text-[#8e9192]">your world, right now.</p>
        </section>

        {/* Status chips (horizontal scroll) */}
        <section className="-mx-5 px-5 scroll-x flex gap-3 snap-x snap-mandatory">
          {['3 tasks', '2 meetings', 'gym today'].map((label) => (
            <div
              key={label}
              className="snap-start shrink-0 px-4 py-2 rounded-full border border-white/5 bg-[#161616] text-white text-[12px] font-medium whitespace-nowrap"
            >
              {label}
            </div>
          ))}
        </section>

        {/* Bento grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Weekly chart card */}
          <article className="md:col-span-2 bg-[#161616] rounded-[16px] border border-white/5 p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-[16px] text-white">this week</h3>
              <span className="material-symbols-outlined text-[#8e9192] text-[18px]">trending_up</span>
            </div>
            <div className="w-full h-32 flex items-end justify-between gap-1 mt-2">
              <div className="w-1/6 bg-[#353434] rounded-t-sm" style={{ height: '33%' }} />
              <div className="w-1/6 bg-[#353434] rounded-t-sm" style={{ height: '50%' }} />
              <div className="w-1/6 bg-[#353434] rounded-t-sm" style={{ height: '25%' }} />
              <div className="w-1/6 bg-[#353434] rounded-t-sm" style={{ height: '75%' }} />
              <div className="w-1/6 bg-[#353434] rounded-t-sm" style={{ height: '66%' }} />
              <div className="w-1/6 bg-white rounded-t-sm" style={{ height: '100%' }} />
            </div>
          </article>

          {/* Focus today card */}
          <article className="bg-[#161616] rounded-[16px] border border-white/5 p-5 flex flex-col gap-4">
            <h3 className="text-[16px] text-white">focus today</h3>
            <ul className="flex flex-col gap-3 text-[14px] text-[#8e9192]">
              {[
                { icon: 'check_circle', label: 'Design review prep' },
                { icon: 'schedule', label: 'Client sync at 2PM' },
                { icon: 'bolt', label: 'Ship MVP v1.2' },
              ].map(({ icon, label }) => (
                <li key={label} className="flex items-start gap-2 border-b border-white/5 pb-2">
                  <span className="material-symbols-outlined text-white mt-0.5" style={{ fontSize: '16px' }}>
                    {icon}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </article>

          {/* Goal card */}
          <article className="bg-[#161616] rounded-[16px] border border-white/5 p-5 flex flex-col justify-between gap-4">
            <h3 className="text-[16px] text-white">goal</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#8e9192]">Weekly output</span>
                <span className="text-white">80%</span>
              </div>
              <div className="w-full h-2 bg-[#353434] rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
