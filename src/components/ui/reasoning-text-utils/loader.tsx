import { useEffect, useState } from 'react';

const ASCII_LINE_FRAMES = ['|', '/', '-', '\\'];

interface LoaderProps {
  variant?: 'ascii-line' | string;
  size?: number;
  speed?: number;
  label?: string;
  className?: string;
}

/** Terminal-style ASCII loader. Cycles through | / - \ */
export function Loader({ size = 14, speed = 0.8, label = 'Loading', className }: LoaderProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const intervalMs = Math.max(40, 120 / Math.max(0.1, speed));
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % ASCII_LINE_FRAMES.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [speed]);

  return (
    <span
      role="img"
      aria-label={label}
      className={className}
      style={{
        display: 'inline-block',
        fontSize: size,
        lineHeight: 1,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontWeight: 400,
        width: '1em',
        textAlign: 'center',
      }}
    >
      {ASCII_LINE_FRAMES[frame]}
    </span>
  );
}

export default Loader;
