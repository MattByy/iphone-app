import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSpaces, subscribeToSpaces } from '@/lib/db';
import { Skeleton } from '@/components/Skeleton';

export default function Library() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getSpaces(user.id);
      setSpaces(data);
    } catch (err) {
      console.error('[Library] load error', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToSpaces(user.id, () => {
      load();
    });
    return unsubscribe;
  }, [user, load]);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-full">
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a] border-b border-white/5">
        <div className="flex items-center px-5 h-16 w-full max-w-screen-xl mx-auto">
          <h1 className="text-[20px] font-medium lowercase text-white flex-1">spaces</h1>
        </div>
      </nav>

      <main className="pt-24 pb-6 px-5 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {spaces.map((space) => (
              <div
                key={space.id}
                onClick={() => navigate(`/spaces/${space.id}`)}
                className="bg-[#161616] rounded-xl border border-white/5 p-4 flex flex-col justify-between aspect-square relative active:bg-[#222] transition-colors cursor-pointer"
              >
                <span className="text-[22px] leading-none">
                  {space.icon || '📁'}
                </span>
                <div>
                  <h3 className="text-[16px] text-white lowercase mb-1">{space.title}</h3>
                </div>
                <span
                  className="material-symbols-outlined text-white/30 absolute bottom-4 right-4"
                  style={{ fontSize: '16px' }}
                >
                  arrow_forward
                </span>
              </div>
            ))}

            <div
              onClick={() => navigate('/chat')}
              className="col-span-2 border border-dashed border-white/20 rounded-xl p-4 flex flex-row items-center justify-center gap-3 h-24 active:bg-white/5 transition-colors cursor-pointer mt-1"
            >
              <span className="material-symbols-outlined text-white/30" style={{ fontSize: '20px' }}>
                add
              </span>
              <span className="text-[14px] text-white/30 lowercase">ask atlas to create a space</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
