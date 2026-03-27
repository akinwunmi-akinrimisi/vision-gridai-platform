import { useState, useRef } from 'react';

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[350px] h-[350px] bg-info/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-sm bg-card border border-border rounded-xl p-8 shadow-card relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-primary to-destructive flex items-center justify-center mb-3 shadow-glow-primary">
            <span className="text-xl font-bold text-white">G</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Vision GridAI
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your PIN to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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
                w-full px-4 py-3 text-center text-2xl tracking-[0.3em] font-mono
                bg-muted border rounded-lg transition-all duration-200
                text-foreground
                placeholder:text-muted-foreground placeholder:text-base placeholder:tracking-[0.3em] placeholder:font-sans
                focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50
                ${shaking
                  ? 'animate-shake border-danger focus:border-danger focus:ring-danger/20'
                  : 'border-border'
                }
              `}
            />
            {error && (
              <p className="mt-2 text-danger text-xs text-center font-medium animate-fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!pin || loading}
            className="
              w-full py-3 rounded-lg font-semibold text-sm
              bg-primary hover:bg-primary-hover text-primary-foreground
              shadow-glow-primary hover:shadow-glow-primary-lg
              transition-all duration-200 cursor-pointer
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
              focus:outline-none focus:ring-2 focus:ring-ring/40
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

        <p className="text-center text-muted-foreground text-xs mt-5">
          Secured with client-side SHA-256
        </p>
      </div>
    </div>
  );
}
