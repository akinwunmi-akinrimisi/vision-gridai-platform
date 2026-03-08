import { useState, useRef } from 'react';
import { Lock } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-dark items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Vision GridAI</h1>
          <p className="text-text-muted-dark text-lg">
            AI Video Production Platform
          </p>
        </div>
      </div>

      {/* Right PIN form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface dark:bg-surface-dark">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Vision GridAI
            </h1>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Welcome back
          </h2>
          <p className="text-text-muted dark:text-text-muted-dark mb-8">
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
                placeholder="Enter PIN"
                autoFocus
                className={`
                  w-full px-4 py-3 text-center text-2xl font-mono tracking-[0.5em]
                  border rounded-lg transition-all duration-200
                  bg-white dark:bg-card-dark
                  text-slate-900 dark:text-white
                  border-border dark:border-border-dark
                  focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
                  placeholder:text-text-muted/50 placeholder:text-base placeholder:tracking-normal placeholder:font-sans
                  ${shaking ? 'animate-shake border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                `}
              />
              {error && (
                <p className="mt-2 text-sm text-red-500 text-center font-medium">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!pin || loading}
              className="
                w-full py-3 px-6 rounded-lg font-semibold text-white
                bg-cta hover:opacity-90 hover:-translate-y-0.5
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0
                focus:outline-none focus:ring-2 focus:ring-cta/50
              "
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
