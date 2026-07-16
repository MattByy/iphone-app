import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Self-signup is hidden by default: the team is added manually in Supabase
// (Authentication -> Users) and public signup is disabled there. Set
// VITE_ALLOW_SIGNUP=1 only during first-time setup.
const ALLOW_SIGNUP = import.meta.env.VITE_ALLOW_SIGNUP === '1';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Account created. If email confirmation is on, check your inbox, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/', { replace: true });
      }
    } catch (err) {
      setMsg(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ backgroundColor: '#141313' }}
    >
      {/* Main container */}
      <main className="w-full max-w-sm mx-auto flex flex-col items-center gap-8">
        {/* Logo & branding */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-[16px] mb-4">
            <span className="font-bold text-[24px] text-[#141313] tracking-tighter leading-none">T</span>
          </div>
          <h1 className="text-[24px] font-medium tracking-tight text-white lowercase">tipas</h1>
          <p className="text-[14px] text-[#8e9192]">your agent-built world</p>
        </header>

        {/* Login form */}
        <form onSubmit={submit} className="w-full flex flex-col gap-3 mt-8">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full bg-[#1c1b1b] border border-white/5 rounded-xl px-4 py-4 text-[16px] text-white placeholder-[#8e9192] focus:outline-none focus:border-white/50 transition-colors"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full bg-[#1c1b1b] border border-white/5 rounded-xl px-4 py-4 text-[16px] text-white placeholder-[#8e9192] focus:outline-none focus:border-white/50 transition-colors"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-white text-[#141313] font-medium text-[16px] rounded-xl py-4 mt-4 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {busy ? 'please wait...' : mode === 'signin' ? 'enter' : 'sign up'}
          </button>
        </form>

        {msg && (
          <p className="text-[13px] text-[#8e9192] text-center">{msg}</p>
        )}

        {ALLOW_SIGNUP ? (
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[13px] text-[#8e9192] hover:text-white transition-colors"
          >
            {mode === 'signin' ? 'need an account? sign up' : 'have an account? sign in'}
          </button>
        ) : (
          <p className="text-[12px] text-[#8e9192]">team accounts are added by the admin.</p>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full py-8 text-center px-5 pb-safe">
        <p className="text-[12px] text-[#8e9192]">built by atlas</p>
      </footer>
    </div>
  );
}
