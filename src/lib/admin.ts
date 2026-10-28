import { SITE } from './site';

// Authentication and database policies protect this route; its name is not a secret.
export const ADMIN_PATH = SITE.adminPath;
export const ADMIN_LOGIN_PATH = `${ADMIN_PATH}/login`;

export function useNoIndex() {
  // Mark admin routes as noindex/nofollow at runtime (defence in depth;
  // robots.txt also disallows them. see public/robots.txt).
  if (typeof document !== 'undefined') {
    let tag = document.querySelector('meta[name="robots"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'robots');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', 'noindex, nofollow, noarchive');
  }
}
