// components/ThemeToggle.js
import { Sun, Moon } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useStore(state => ({ theme: state.theme, toggleTheme: state.toggleTheme }));

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-secondary dark:hover:bg-dark_secondary focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-dark_primary"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={20} className="text-foreground dark:text-dark_foreground" /> : <Sun size={20} className="text-foreground dark:text-dark_foreground" />}
    </button>
  );
}
