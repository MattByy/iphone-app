import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { setConfig } from '@/lib/db';
import { supabase } from '@/lib/supabase';

function firstNameFrom(email) {
  if (!email) return 'you';
  const local = email.split('@')[0];
  return local.split(/[._-]/)[0];
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setConfig(data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const name = firstNameFrom(user?.email);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-full bg-[#0a0a0a] text-white">
      <header className="fixed top-0 w-full z-50 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5">
        <h1 className="text-[20px] font-medium lowercase text-white">you</h1>
      </header>

      <main className="flex-1 w-full max-w-screen-md mx-auto px-5 pt-24 pb-safe flex flex-col gap-8">
        <section className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-[#161616] border border-white/5">
            <span className="text-[20px] font-medium text-white">{initial}</span>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[20px] font-medium lowercase text-white tracking-tight">{name}</h2>
            <p className="text-[14px] text-white/40">{user?.email}</p>
          </div>
        </section>

        <section className="flex justify-center pt-8">
          <button
            onClick={handleSignOut}
            className="text-[14px] text-red-400/80 hover:text-red-400 transition-colors lowercase py-2 px-4"
          >
            sign out
          </button>
        </section>
      </main>
    </div>
  );
}
