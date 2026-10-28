import config from '../../site.config.json';
import { validateSettings } from './settings';

export const SITE = validateSettings(config);
export const MONITORED_SITE = {
  name: SITE.name,
  url: SITE.url,
  displayUrl: new URL(SITE.url).host + (new URL(SITE.url).pathname === '/' ? '' : new URL(SITE.url).pathname),
};
