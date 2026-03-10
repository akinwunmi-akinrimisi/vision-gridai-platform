import { useState, useRef } from 'react';
import { Zap } from 'lucide-react';

export default function PinGate({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin || loading) return;

    setLoading(true);
    setError('');

    const success = await onLogin(pin);

    if (!success) {
      setShaking(true);
      setError('Wrong PIN');
      setPin('');
      setLoading(false);
      setTimeout(() => setShaking(false), 500);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-cta/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative">
        <div className="text-center max-w-md">
          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-indigo-600 mb-8 shadow-lg shadow-primary/25 animate-float">
            <Zap className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Vision Grid<span className="text-gradient">AI</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            AI-powered video production platform.
            <br />
            From niche research to YouTube — fully automated.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['25 Topics', '3-Pass Scripts', 'Auto Assembly', 'YouTube Publish'].map((f) => (
              <span
                key={f}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] text-slate-400 border border-white/[0.08]"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right PIN form panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 mb-4 shadow-lg shadow-primary/25">
              <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Vision Grid<span className="text-gradient">AI</span>
            </h1>
          </div>

          {/* Form card */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold text-white mb-1">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              Enter your PIN to access the dashboard
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    setError('');
                  }}
                  placeholder="- - - -"
                  autoFocus
                  className={`
                    w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em]
                    border rounded-xl transition-all duration-200
                    bg-white/[0.04] text-white
                    border-white/[0.1]
                    focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20
                    placeholder:text-slate-600 placeholder:text-lg placeholder:tracking-[0.3em] placeholder:font-sans
                    ${shaking ? 'animate-shake border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : ''}
                  `}
                />
                {error && (
                  <p className="mt-3 text-sm text-red-400 text-center font-medium animate-in">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!pin || loading}
                className="
                  w-full py-3.5 px-6 rounded-xl font-semibold text-white
                  bg-gradient-to-r from-primary to-indigo-600
                  hover:from-primary/90 hover:to-indigo-500
                  hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5
                  transition-all duration-300 cursor-pointer
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none
                  focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-slate-950
                "
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Unlock Dashboard'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            Secured with client-side SHA-256 encryption
          </p>
        </div>
      </div>
    </div>
  );
}
