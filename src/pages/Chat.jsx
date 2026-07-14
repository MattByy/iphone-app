import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMessages, insertMessage, subscribeToMessages } from '@/lib/db';

function AtlasAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#161616] border border-white/5 flex items-center justify-center shrink-0">
      <span className="text-[14px] text-white">a</span>
    </div>
  );
}

function BlockCreatedCard({ metadata }) {
  return (
    <div className="bg-[#161616] border border-white/5 rounded-xl p-3 mt-2">
      <p className="text-[13px] text-white/60 lowercase">
        i built you a{' '}
        <span className="text-white">{metadata.blockType || 'block'}</span> in{' '}
        {metadata.spaceId ? (
          <Link to={`/spaces/${metadata.spaceId}`} className="text-white underline underline-offset-2">
            {metadata.spaceName || 'a space'}
          </Link>
        ) : (
          <Link to="/" className="text-white underline underline-offset-2">
            home
          </Link>
        )}
      </p>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMessages(user.id);
      setMessages(data);
    } catch (err) {
      console.error('[Chat] load error', err);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToMessages(user.id, () => {
      load();
    });
    return unsubscribe;
  }, [user, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !user) return;

    setSending(true);
    setInput('');

    try {
      await insertMessage(user.id, 'user', text, {});
      const thinking = await insertMessage(user.id, 'atlas', '...', { type: 'thinking' });

      const recentMessages = [...messages.slice(-19), { role: 'user', content: text }];

      const res = await fetch('/api/atlas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: recentMessages, userId: user.id }),
      });

      if (!res.ok) throw new Error(`Atlas API error ${res.status}`);
      const { content } = await res.json();

      await updateMessage(thinking.id, content, {});
    } catch (err) {
      console.error('[Chat] send error', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <header className="fixed top-0 w-full z-50 bg-[#0a0a0a] flex items-center px-5 h-16 border-b border-white/5">
        <button
          onClick={() => navigate('/')}
          className="text-white hover:opacity-80 transition-opacity"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 flex justify-center items-center">
          <h1 className="text-[20px] font-medium lowercase text-white tracking-tight">atlas</h1>
        </div>
        <div className="w-6 flex justify-end">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 pb-28 px-5 flex flex-col gap-6 max-w-screen-md mx-auto w-full">
        {messages.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex flex-col items-end w-full">
              <div className="bg-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                <p className="text-[15px] text-[#0a0a0a]">{msg.content}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col items-start w-full">
              <div className="flex gap-3 max-w-[85%]">
                <AtlasAvatar />
                <div className="pt-1 flex flex-col gap-2">
                  <div className="bg-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-[15px] text-white">
                      {msg.metadata?.type === 'thinking' ? (
                        <span className="text-white/30 animate-pulse">...</span>
                      ) : (
                        msg.content
                      )}
                    </p>
                  </div>
                  {msg.metadata?.type === 'block_created' && (
                    <BlockCreatedCard metadata={msg.metadata} />
                  )}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-white/5 px-5 py-5 pb-safe z-50">
        <div className="max-w-screen-md mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="tell atlas anything..."
              disabled={sending}
              className="w-full bg-[#161616] border border-white/5 rounded-full py-4 pl-4 pr-12 text-[16px] text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="absolute right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[#0a0a0a]" style={{ fontSize: '20px' }}>
                arrow_upward
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
