import React from 'react';
import { Outlet } from 'react-router-dom';
import MobileNav from '@/components/MobileNav';

export default function Layout() {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white">
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain pt-[env(safe-area-inset-top)] pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
