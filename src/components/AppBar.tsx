import { Link, NavLink } from 'react-router';
import { ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/ui/cn';

export function AppBar() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-[1120px] items-center justify-between px-7">
        <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-ink">
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-accent text-white">
            <ShieldCheck size={15} strokeWidth={2} />
          </span>
          Secure Doc Converter
        </Link>
        <nav className="flex items-center gap-4">
          <NavLink
            to="/about"
            className={({ isActive }) =>
              cn('text-[13px] text-muted hover:text-ink', isActive && 'text-ink')
            }
          >
            About &amp; privacy
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('text-[13px] text-muted hover:text-ink', isActive && 'text-ink')
            }
          >
            Settings
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
