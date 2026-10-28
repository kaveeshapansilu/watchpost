import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';

const GLYPHS = '!<>-_\\/[]{}:=+*^?#';

interface TextScrambleProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

function randomChar(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/** Scramble-in effect: resolves left-to-right through random glyphs. */
export function TextScramble({ text, className, style }: TextScrambleProps) {
  const [output, setOutput] = useState(text);
  const frameRef = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;

    let iteration = 0;
    const total = text.length;
    window.cancelAnimationFrame(frameRef.current);

    const tick = () => {
      iteration += 1 / 3;
      const resolved = Math.floor(iteration);
      let next = '';
      for (let i = 0; i < total; i++) {
        const ch = text[i];
        if (ch === ' ' || ch === '…') {
          next += ch;
        } else if (i < resolved) {
          next += ch;
        } else {
          next += randomChar();
        }
      }
      setOutput(next);
      if (resolved <= total) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        setOutput(text);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [text, reduce]);

  return (
    <span className={className} style={style}>
      {reduce ? text : output}
    </span>
  );
}

export default TextScramble;
