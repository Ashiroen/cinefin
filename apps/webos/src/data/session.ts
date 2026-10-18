import {
  CLIENT_NAME,
  CLIENT_VERSION,
  LG_C2_WEBOS22,
  cloneTable,
  randomId,
  type CapabilityTable,
  type ReceiverOverrides,
} from '@cinefin/core';

const KEY = 'cinefin.session.v1';

export interface StoredAccount {
  serverId: string;
  serverName: string;
  address: string;
  userId: string;
  userName: string;
  token: string;
  deviceId: string;
}

export interface SessionState {
  installId: string;
  account: StoredAccount | null;
  table: CapabilityTable;
  overrides: ReceiverOverrides;
}

function load(): SessionState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionState;
      if (parsed.installId) return parsed;
    }
  } catch {
    /* ignore */
  }
  return {
    installId: randomId(),
    account: null,
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
  state = { ...state, account };
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
  return typeof navigator !== 'undefined' ? navigator.userAgent.includes('Web0S')
    ? 'LG webOS TV'
    : 'Cinefin browser'
    : 'Cinefin';
}

export function clientInfo() {
  return { name: CLIENT_NAME, version: CLIENT_VERSION };
}
