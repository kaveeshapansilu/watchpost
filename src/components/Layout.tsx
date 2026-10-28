import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, X } from 'lucide-react';
import MotionButton from './MotionButton';
import { cn } from '../lib/cn';

import { SITE } from '../lib/site';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded-md font-medium text-sm ${
    isActive ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
  }`;
}

const MOBILE_LINKS = [
  { to: '/', end: true, label: 'Status' },
  { to: '/maintenance', end: false, label: 'Maintenance' },
  { to: '/incidents', end: false, label: 'Previous incidents' },
];

/**
 * Floating-pill header with desktop nav inline and an animated hamburger
 * opening a full-screen menu on mobile. No admin links anywhere.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const location = useLocation();
  const menuOpen = menuPath === location.pathname;
  if (menuPath !== null && menuPath !== location.pathname) setMenuPath(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 4);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    const isAdmin = location.pathname === SITE.adminPath || location.pathname.startsWith(`${SITE.adminPath}/`);
    robots?.setAttribute('content', isAdmin ? 'noindex,nofollow,noarchive' : 'index,follow');
  }, [location.pathname]);

  // Close the menu on navigation, Escape, and lock body scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuPath(null);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>

      <header className="fixed z-50 w-full px-3 md:px-4">
        <div
          className={`mx-auto mt-2 max-w-3xl transition-all duration-300 ${
            isScrolled ? 'rounded-2xl border border-slate-200 bg-white/80 shadow-sm backdrop-blur-xl px-3' : 'bg-white px-1 sm:px-2'
          }`}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-2 py-2.5">
            <Link to="/" className="flex items-center rounded-md shrink-0" aria-label={`${SITE.name} status home`}>
              {!SITE.logo || logoFailed ? (
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-primary text-brand-soft font-bold"
                >
                  {SITE.name.slice(0, 1).toUpperCase()}
                </span>
              ) : (
                <img
                  src={SITE.logo}
                  alt={SITE.name}
                  className="h-8 sm:h-9 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                />
              )}
              <span className="ml-2 max-w-[140px] truncate text-sm font-semibold">{SITE.name}</span>
            </Link>

            <nav aria-label="Status pages" className="hidden lg:block">
              <div className="flex items-center gap-1">
                <NavLink to="/" end className={navLinkClass}>
                  Status
                </NavLink>
                <NavLink to="/maintenance" className={navLinkClass}>
                  Maintenance
                </NavLink>
                <NavLink to="/incidents" className={navLinkClass}>
                  Previous incidents
                </NavLink>
              </div>
            </nav>

            <div className="hidden lg:block">
              {SITE.contactUrl && <MotionButton label="Get in touch" href={SITE.contactUrl} />}
            </div>

            {/* Animated hamburger. mobile only */}
            <button
              type="button"
              onClick={() => setMenuPath(menuOpen ? null : location.pathname)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg text-brand-primary hover:bg-slate-100 lg:hidden"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  menuOpen && 'translate-y-[7px] rotate-45',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  menuOpen && 'opacity-0 scale-x-0',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[2px] w-6 rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  menuOpen && '-translate-y-[7px] -rotate-45',
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      {menuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-[60] flex flex-col bg-white text-slate-900 lg:hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-blob-slow absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-brand-accent/15 blur-3xl" />
          </div>

          <div className="relative flex items-center justify-end px-5 pt-5">
            <button
              type="button"
              onClick={() => setMenuPath(null)}
              aria-label="Close menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:rotate-90 hover:bg-slate-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="relative flex flex-1 flex-col justify-center gap-2 px-8">
            {MOBILE_LINKS.map((l, i) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'menu-item-in group flex items-center gap-3 py-3 text-4xl font-bold tracking-tight transition-colors',
                    isActive ? 'text-brand-accent' : 'text-slate-900 hover:text-brand-accent',
                  )
                }
                style={{ animationDelay: `${120 + i * 80}ms` }}
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-2 w-2 rounded-full transition-all',
                        isActive ? 'bg-brand-accent scale-100' : 'bg-slate-200 scale-75 group-hover:bg-brand-accent',
                      )}
                    />
                    {l.label}
                  </>
                )}
              </NavLink>
            ))}
            {SITE.contactUrl && <a
              href={SITE.contactUrl}
              className="menu-item-in mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-brand-primary px-6 py-3 text-base font-semibold text-white transition hover:opacity-90"
              style={{ animationDelay: '380ms' }}
            >
              Get in touch
              <ArrowUpRight className="size-5" aria-hidden="true" />
            </a>}
          </nav>
        </div>
      )}

      {/* Offset for the fixed header */}
      <main id="main" className="flex-1 w-full mx-auto max-w-3xl px-4 sm:px-6 pt-24 sm:pt-28 pb-10">
        {children}
      </main>

      <footer className="border-t border-slate-100 mt-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} {SITE.name}. Real-time website status and uptime monitoring.
          </p>
        </div>
      </footer>
    </div>
  );
}
