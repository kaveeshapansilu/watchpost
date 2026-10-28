import { Link } from 'react-router-dom';
import { Compass, House } from 'lucide-react';

/**
 * 404 page in the style of the reference empty-state pattern
 * (giant fading headline + Go Home / Explore actions).
 * Dependency-free: uses local button styles + lucide icons.
 */
export default function NotFound() {
  return (
    <div className="flex w-full items-center justify-center py-16 sm:py-24">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-2">
          <div
            className="text-8xl sm:text-9xl font-extrabold tracking-tight text-slate-900 [mask-image:linear-gradient(to_bottom,black_20%,transparent_85%)]"
            aria-hidden="true"
          >
            404
          </div>
          <p className="-mt-6 sm:-mt-8 text-sm text-slate-600">
            The page you&apos;re looking for might have been <br />
            moved or doesn&apos;t exist.
          </p>
        </div>
        <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/" className="btn-primary">
              <House className="size-4" aria-hidden="true" />
              Go Home
            </Link>
            <Link to="/incidents" className="btn-ghost">
              <Compass className="size-4" aria-hidden="true" />
              Explore
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
