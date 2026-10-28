export interface SiteSettings {
  name: string;
  url: string;
  title: string;
  description: string;
  logo: string;
  contactUrl: string;
  primaryColor: string;
  accentColor: string;
  adminPath: string;
}

export function validateSettings(input: SiteSettings): SiteSettings {
  for (const field of ['name', 'title', 'description'] as const) {
    if (typeof input[field] !== 'string' || !input[field].trim()) throw new Error(`site.config.json: ${field} is required.`);
  }
  const url = new URL(input.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error('Website URL must use HTTPS without credentials or a fragment.');
  }
  for (const field of ['primaryColor', 'accentColor'] as const) {
    if (!/^#[0-9a-f]{6}$/i.test(input[field])) throw new Error(`${field} must be a six-digit hex colour.`);
  }
  if (input.logo && !(/^\/(?!\/)[^\s?#]+$/.test(input.logo) || /^https:\/\//.test(input.logo))) {
    throw new Error('Logo must be a path such as /logo.svg or an HTTPS URL.');
  }
  if (input.contactUrl && !/^(https:\/\/|mailto:)[^\s]+$/.test(input.contactUrl)) {
    throw new Error('Contact URL must be an HTTPS or mailto link.');
  }
  if (!/^\/[a-zA-Z0-9_-]+$/.test(input.adminPath) || ['/maintenance', '/incidents', '/status'].includes(input.adminPath)) {
    throw new Error('Admin path must be one URL segment, such as /admin, and must not match a public page.');
  }
  return { ...input, name: input.name.trim(), title: input.title.trim(), description: input.description.trim(), url: url.href };
}

export function hexToRgb(hex: string): string {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(' ');
}
