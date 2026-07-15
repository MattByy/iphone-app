import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getBlocks, subscribeToBlocks } from '@/lib/db';
import Block from '@/components/Block';
import { Skeleton } from '@/components/Skeleton';

export default function SpaceView() {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !spaceId) return;
    try {
      const data = await getBlocks(spaceId);
      setBlocks(data);
    } catch (err) {
      console.error('[SpaceView] load error', err);
    } finally {
      setLoading(false);
    }
  }, [user, spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToBlocks(spaceId, () => {
      load();
    });
    return unsubscribe;
  }, [user, spaceId, load]);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-full">
      <header className="fixed top-0 w-full z-40 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5">
        <div className="flex items-center gap-3 w-full max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/spaces')}
            className="text-white hover:opacity-80 transition-opacity"
            aria-label="Back to spaces"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </div>
      </header>

      <main className="px-5 pt-24 pb-6 flex flex-col gap-4 max-w-2xl mx-auto">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : blocks.length === 0 ? (
          <p className="text-[14px] text-white/30 lowercase">no blocks in this space yet.</p>
        ) : (
          blocks.map((block) => (
            <Block key={block.id} type={block.type} props={block.content} />
          ))
        )}
      </main>
    </div>
  );
}
