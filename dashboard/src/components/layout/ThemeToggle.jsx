import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ collapsed = false }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
        text-slate-500 dark:text-slate-500
        hover:bg-slate-100/80 dark:hover:bg-white/[0.04]
        hover:text-slate-700 dark:hover:text-slate-300
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-0
        ${collapsed ? 'justify-center' : ''}
      `}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      {!collapsed && (
        <span className="text-[13px] font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
