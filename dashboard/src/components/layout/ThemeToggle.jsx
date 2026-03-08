import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ collapsed = false }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="
        inline-flex items-center justify-center gap-2 p-2 rounded-lg
        text-text-muted dark:text-text-muted-dark
        hover:bg-slate-100 dark:hover:bg-slate-800
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary/30
      "
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      {!collapsed && (
        <span className="text-sm font-medium">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
