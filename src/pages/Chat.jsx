import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEMO_MESSAGES = [
  {
    id: 1,
    role: 'atlas',
    text: "I've generated the new home screen layout based on your request. The diff includes a streamlined hero section and simplified navigation.",
    diff: true,
    chips: ['deploy this', 'show me', 'revert'],
  },
  {
    id: 2,
    role: 'user',
    text: "Let's show me the preview first before deploying.",
  },
  {
    id: 3,
    role: 'atlas',
    text: 'Preparing preview environment on port 3000...',
  },
];

function AtlasAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-[#161616] border border-white/5 flex items-center justify-center shrink-0">
      <span className="text-[14px] text-white">a</span>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Top App Bar */}
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

      {/* Chat messages */}
      <main className="flex-1 overflow-y-auto no-scrollbar pt-20 pb-28 px-5 flex flex-col gap-8 max-w-screen-md mx-auto w-full">
        {DEMO_MESSAGES.map((msg) =>
          msg.role === 'user' ? (
            <div key={msg.id} className="flex flex-col gap-3 items-end w-full">
              <div className="bg-[#1e1e1e] border border-white/5 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                <p className="text-[16px] text-white">{msg.text}</p>
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex flex-col gap-3 items-start w-full">
              <div className="flex gap-3 max-w-[85%]">
                <AtlasAvatar />
                <div className="pt-1 flex flex-col gap-4">
                  <p className="text-[16px] text-white">{msg.text}</p>

                  {msg.diff && (
                    <div className="bg-[#161616] border border-white/5 rounded-lg p-4 w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-[#8e9192]" style={{ fontSize: '16px' }}>
                          code
                        </span>
                        <span className="text-[12px] font-medium text-[#8e9192] tracking-widest uppercase">
                          Diff Summary
                        </span>
                      </div>
                      <div className="font-mono text-[13px] space-y-1">
                        <div className="text-[#ffb4ab]">{'- <nav class="complex-menu">'}</div>
                        <div className="text-emerald-400">{'+ <nav class="minimal-dock">'}</div>
                        <div className="text-[#ffb4ab]">{'- <div class="hero-gradient-bg">'}</div>
                        <div className="text-emerald-400">{'+ <div class="solid-dark-bg">'}</div>
                      </div>
                    </div>
                  )}

                  {msg.chips && (
                    <div className="flex flex-wrap gap-2">
                      {msg.chips.map((chip) => (
                        <button
                          key={chip}
                          className="px-4 py-2 bg-[#161616] border border-white/5 rounded-full text-[12px] font-medium text-white hover:bg-[#1a1a1a] transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </main>

      {/* Input bar */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-white/5 px-5 py-5 pb-safe z-50">
        <div className="max-w-screen-md mx-auto relative flex items-center">
          <form onSubmit={handleSubmit} className="w-full relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="tell tipas anything..."
              className="w-full bg-[#161616] border border-white/5 rounded-full py-4 pl-4 pr-12 text-[16px] text-white placeholder-[#8e9192] focus:outline-none focus:border-white/20 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
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
