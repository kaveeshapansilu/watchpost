import type { CSSProperties } from 'react';

export const TEXT_SHIMMER_CLASS_NAME = 'reasoning-shimmer';

export const TEXT_SHIMMER_KEYFRAMES = `
@keyframes reasoning-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.reasoning-shimmer {
  background-image: linear-gradient(110deg, #334155 35%, #94a3b8 50%, #334155 65%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation-name: reasoning-shimmer;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-fill-mode: both;
}
@media (prefers-reduced-motion: reduce) {
  .reasoning-shimmer {
    animation: none;
    background-image: none;
    color: inherit;
    -webkit-text-fill-color: currentColor;
  }
}
`;

export function textShimmerStyle(shimmerDuration: number): CSSProperties {
  return {
    animationDuration: `${shimmerDuration}s`,
  };
}
