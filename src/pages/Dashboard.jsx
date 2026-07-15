import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBlocks, subscribeToBlocks } from '@/lib/db';
import Block from '@/components/Block';
import { Skeleton } from '@/components/Skeleton';

function firstNameFrom(email) {
  if (!email) return '';
  const local = email.split('@')[0];
  return local.split(/[._-]/)[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'good morning';
  if (h < 17) return 'good afternoon';
  return 'good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const name = firstNameFrom(user?.email);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getBlocks(user.id, null);
      setBlocks(data);
    } catch (err) {
      console.error('[Dashboard] load error', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToBlocks(user.id, null, () => {
      load();
    });
    return unsubscribe;
  }, [user, load]);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-full">
      <header className="fixed top-0 w-full z-40 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5">
        <div className="flex items-center gap-4 w-full max-w-2xl mx-auto">
          <h1 className="text-[20px] font-medium lowercase text-white">tipas</h1>
        </div>
      </header>

      <main className="px-5 pt-24 pb-6 flex flex-col gap-6 max-w-2xl mx-auto">
        <section className="flex flex-col gap-1">
          <h2 className="text-[20px] font-medium lowercase text-white">
            {greeting()}{name ? `, ${name}` : ''}.
          </h2>
        </section>

        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="text-[14px] text-white/30 lowercase">no blocks yet — ask atlas to build something.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {blocks.map((block) => (
              <Block key={block.id} type={block.type} props={block.content} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
