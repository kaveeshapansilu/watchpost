import type { FC } from 'react';
import { ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  label: string;
  href: string;
  classes?: string;
}

/**
 * Expanding-circle contact link.
 * Uses the contact URL supplied by the site owner.
 */
const MotionButton: FC<Props> = ({ label, href, classes }) => {
  return (
    <a
      href={href}
      className={cn(
        'group relative block h-auto w-36 shrink-0 cursor-pointer rounded-full bg-slate-100 p-0.5 outline-none',
        classes,
      )}
    >
      <span
        className="m-0 block h-8 w-8 overflow-hidden rounded-full bg-brand-primary transition-all duration-500 group-hover:w-full"
        aria-hidden="true"
      />
      <span className="absolute top-1/2 left-2.5 -translate-y-1/2 translate-x-0 transition-transform duration-500 group-hover:translate-x-[0.3rem]">
        <ArrowRight className="size-4 text-white" aria-hidden="true" />
      </span>
      <span className="absolute top-1/2 left-1/2 ml-2.5 -translate-x-1/2 -translate-y-1/2 text-center text-sm font-medium tracking-tight whitespace-nowrap text-brand-primary transition-colors duration-500 group-hover:text-white">
        {label}
      </span>
    </a>
  );
};

export default MotionButton;
