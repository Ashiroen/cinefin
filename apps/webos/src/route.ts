export type Route =
  | { name: 'connect'; empty?: boolean }
  | { name: 'quick' }
  | { name: 'plex-pin' }
  | { name: 'plex-servers' }
  | { name: 'password' }
  | { name: 'account' }
  | { name: 'home' }
  | { name: 'details'; id: string }
  | { name: 'player'; id: string }
  | { name: 'output-states' }
  | { name: 'wizard-detect' }
  | { name: 'wizard-test' }
  | { name: 'wizard-summary' }
  | { name: 'settings' }
  | { name: 'convert'; rowId: string }
  | { name: 'preview'; board: string };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/connect';
  const parts = raw.split('/').filter(Boolean);
  const a = parts[0];
  const b = parts[1];
  if (a === 'connect' && b === 'empty') return { name: 'connect', empty: true };
  if (a === 'connect') return { name: 'connect' };
  if (a === 'signin' && b === 'quick') return { name: 'quick' };
  if (a === 'signin' && b === 'plex') return { name: 'plex-pin' };
  if (a === 'signin' && b === 'plex-servers') return { name: 'plex-servers' };
  if (a === 'signin' && b === 'password') return { name: 'password' };
  if (a === 'settings' && b === 'account') return { name: 'account' };
  if (a === 'home') return { name: 'home' };
  if (a === 'item' && b) return { name: 'details', id: b };
  if (a === 'player' && b) return { name: 'player', id: b };
  if (a === 'output-states') return { name: 'output-states' };
  if (a === 'wizard' && b === 'detect') return { name: 'wizard-detect' };
  if (a === 'wizard' && b === 'test') return { name: 'wizard-test' };
  if (a === 'wizard' && b === 'summary') return { name: 'wizard-summary' };
  if (a === 'settings' && b === 'convert' && parts[2]) return { name: 'convert', rowId: parts[2] };
  if (a === 'settings') return { name: 'settings' };
  if (a === 'preview' && b) return { name: 'preview', board: b };
  return { name: 'connect' };
}

export function toHash(route: Route): string {
  switch (route.name) {
    case 'connect':
      return route.empty ? '#/connect/empty' : '#/connect';
    case 'quick':
      return '#/signin/quick';
    case 'plex-pin':
      return '#/signin/plex';
    case 'plex-servers':
      return '#/signin/plex-servers';
    case 'password':
      return '#/signin/password';
    case 'account':
      return '#/settings/account';
    case 'home':
      return '#/home';
    case 'details':
      return `#/item/${route.id}`;
    case 'player':
      return `#/player/${route.id}`;
    case 'output-states':
      return '#/output-states';
    case 'wizard-detect':
      return '#/wizard/detect';
    case 'wizard-test':
      return '#/wizard/test';
    case 'wizard-summary':
      return '#/wizard/summary';
    case 'settings':
      return '#/settings';
    case 'convert':
      return `#/settings/convert/${route.rowId}`;
    case 'preview':
      return `#/preview/${route.board}`;
    default:
      return '#/connect';
  }
}

export function go(route: Route) {
  window.location.hash = toHash(route);
}
