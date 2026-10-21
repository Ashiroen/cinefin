import {
  CLIENT_NAME,
  CLIENT_VERSION,
  LG_C2_WEBOS22,
  cloneTable,
  randomId,
  type CapabilityTable,
  type MediaServerAuth,
  type ReceiverOverrides,
  type ServerKind,
} from '@cinefin/core';

const KEY = 'cinefin.session.v2';
const KEY_V1 = 'cinefin.session.v1';

export type StoredAccount = MediaServerAuth;

export interface SessionState {
  installId: string;
  account: StoredAccount | null;
  accounts: StoredAccount[];
  table: CapabilityTable;
  overrides: ReceiverOverrides;
}

function accountKey(account: StoredAccount): string {
  return `${account.kind}:${account.serverId}:${account.userId}`;
}

function asAccount(raw: Partial<StoredAccount> & { address?: string }): StoredAccount | null {
  if (!raw.address || !raw.token) return null;
  return {
    kind: raw.kind ?? 'jellyfin',
    serverId: raw.serverId ?? raw.address,
    serverName: raw.serverName ?? 'Server',
    address: raw.address,
    userId: raw.userId ?? '',
    userName: raw.userName ?? '',
    token: raw.token,
    deviceId: raw.deviceId ?? randomId(),
  };
}

function load(): SessionState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(KEY_V1);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState & { account?: StoredAccount | null };
      const account = parsed.account ? asAccount(parsed.account) : null;
      const accounts = (parsed.accounts ?? (account ? [account] : []))
        .map((a) => asAccount(a))
        .filter((a): a is StoredAccount => Boolean(a));
      if (parsed.installId) {
        return {
          installId: parsed.installId,
          account,
          accounts,
          table: parsed.table ?? cloneTable(LG_C2_WEBOS22),
          overrides: parsed.overrides ?? { confirmed: {} },
        };
      }
    }
  } catch {
    /* ignore */
  }
  return {
    installId: randomId(),
    account: null,
    accounts: [],
    table: cloneTable(LG_C2_WEBOS22),
    overrides: { confirmed: {} },
  };
}

let state = load();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function getSession(): SessionState {
  return state;
}

export function setAccount(account: StoredAccount | null) {
  let accounts = state.accounts;
  if (account) {
    const key = accountKey(account);
    accounts = [account, ...accounts.filter((a) => accountKey(a) !== key)];
  }
  state = { ...state, account, accounts };
  persist();
}

export function switchAccount(account: StoredAccount) {
  setAccount(account);
}

export function removeAccount(account: StoredAccount) {
  const key = accountKey(account);
  const accounts = state.accounts.filter((a) => accountKey(a) !== key);
  const current = state.account && accountKey(state.account) === key ? (accounts[0] ?? null) : state.account;
  state = { ...state, accounts, account: current };
  persist();
}

export function setTable(table: CapabilityTable, overrides?: ReceiverOverrides) {
  state = {
    ...state,
    table,
    overrides: overrides ?? state.overrides,
  };
  persist();
}

export function deviceName(): string {
  return typeof navigator !== 'undefined'
    ? navigator.userAgent.includes('Web0S')
      ? 'LG webOS TV'
      : 'Cinefin browser'
    : 'Cinefin';
}

export function clientInfo() {
  return { name: CLIENT_NAME, version: CLIENT_VERSION };
}

export function plexTvOverride(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as Window & { __CINEFIN_PLEX_TV__?: string };
  if (w.__CINEFIN_PLEX_TV__) return w.__CINEFIN_PLEX_TV__;
  try {
    return localStorage.getItem('cinefin.plexTv') ?? undefined;
  } catch {
    return undefined;
  }
}

export type { ServerKind };
