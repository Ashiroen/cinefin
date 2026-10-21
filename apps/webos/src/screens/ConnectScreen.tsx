import { MIN_SERVER_VERSION_LABEL, type PublicServer, type ServerKind } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import { IconInfo, IconKeyboard } from '../components/Icons';
import jellyfinIcon from '../assets/server-jellyfin.svg';
import plexIcon from '../assets/server-plex.svg';
import type { StoredAccount } from '../data/session';

export const SERVER_KIND_ICONS: Record<ServerKind, string> = {
  jellyfin: jellyfinIcon,
  plex: plexIcon,
};

export function ConnectScreen({
  servers,
  discovering,
  address,
  onAddress,
  onConnect,
  onPick,
  onSearchAgain,
  empty,
  kind = 'jellyfin',
  onKind,
  hideKindPicker,
  savedAccounts,
  onPickAccount,
  onPlexSignIn,
  title,
}: {
  servers: PublicServer[];
  discovering?: boolean;
  address: string;
  onAddress: (v: string) => void;
  onConnect: () => void;
  onPick: (s: PublicServer) => void;
  onSearchAgain?: () => void;
  empty?: boolean;
  kind?: ServerKind;
  onKind?: (kind: ServerKind) => void;
  hideKindPicker?: boolean;
  savedAccounts?: StoredAccount[];
  onPickAccount?: (account: StoredAccount) => void;
  onPlexSignIn?: () => void;
  title?: string;
}) {
  const none = empty || (!discovering && servers.length === 0);
  const heading =
    title ??
    (kind === 'plex' ? 'Connect to your Plex server' : 'Connect to your Jellyfin server');
  const placeholder = kind === 'plex' ? 'e.g. 192.168.1.20:32400' : 'e.g. 192.168.1.20:8096';
  const saved = (savedAccounts ?? []).filter((a) => !kind || a.kind === kind);
  const initial = none
    ? saved[0]
      ? `saved-${saved[0].kind}-${saved[0].serverId}-${saved[0].userId}`
      : hideKindPicker
        ? 'address'
        : 'kind-jellyfin'
    : servers[0]
      ? `server-${servers[0].id}`
      : 'address';

  return (
    <FocusRoot initial={initial}>
      <div className="screen">
        <div className="center-col">
          <div className="logo-center" style={{ marginTop: 8, marginBottom: 28 }}>
            <Logo size={52} />
          </div>
          <h1 className="h1" style={{ marginBottom: 28 }}>
            {heading}
          </h1>

          {hideKindPicker ? null : (
            <div style={{ width: 920, marginBottom: 28 }} data-testid="server-kind-picker">
              <div className="section-label">Server type</div>
              <div className="kind-picker">
                <KindCard
                  id="kind-jellyfin"
                  kind="jellyfin"
                  label="Jellyfin"
                  selected={kind === 'jellyfin'}
                  onSelect={() => onKind?.('jellyfin')}
                />
                <KindCard
                  id="kind-plex"
                  kind="plex"
                  label="Plex"
                  selected={kind === 'plex'}
                  onSelect={() => onKind?.('plex')}
                />
              </div>
            </div>
          )}

          {saved.length ? (
            <div className="server-list" style={{ marginBottom: 28 }}>
              <div className="section-label">Saved servers</div>
              {saved.map((account) => (
                <Focusable
                  key={`${account.kind}-${account.serverId}-${account.userId}`}
                  id={`saved-${account.kind}-${account.serverId}-${account.userId}`}
                  className="server-card"
                  onSelect={() => onPickAccount?.(account)}
                >
                  <img
                    className="server-type-icon"
                    src={SERVER_KIND_ICONS[account.kind]}
                    alt=""
                  />
                  <span style={{ flex: 1 }}>
                    <div className="name">{account.serverName}</div>
                    <div className="sub">
                      {account.userName} · {kindLabel(account.kind)} ·{' '}
                      {account.address.replace(/^https?:\/\//, '')}
                    </div>
                  </span>
                  <span className="muted">›</span>
                </Focusable>
              ))}
            </div>
          ) : null}

          {kind === 'plex' && onPlexSignIn ? (
            <Focusable
              id="plex-pin"
              className="btn btn-wide"
              style={{ marginBottom: 28 }}
              onSelect={onPlexSignIn}
            >
              Sign in with Plex
            </Focusable>
          ) : null}

          {none ? (
            <div className="banner" style={{ marginBottom: 36 }}>
              <IconInfo />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 600 }}>
                  {kind === 'plex'
                    ? 'Sign in at plex.tv/link, or enter a server address'
                    : 'No servers found on your network'}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {kind === 'plex'
                    ? 'Plex finds your servers from your account. A manual URL still works on the LAN.'
                    : 'Is the server on the same network as the TV?'}
                </div>
              </div>
              {kind === 'jellyfin' ? (
                <Focusable id="search" className="btn" onSelect={onSearchAgain}>
                  Search again
                </Focusable>
              ) : null}
            </div>
          ) : (
            <div className="server-list" style={{ marginBottom: 36 }}>
              <div className="section-label">
                {discovering ? 'Searching your network' : 'Servers found on your network'}
              </div>
              {servers.map((s) => (
                <Focusable
                  key={s.id}
                  id={`server-${s.id}`}
                  className={`server-card ${s.supported ? '' : 'is-unsupported'}`}
                  onSelect={() => s.supported && onPick(s)}
                >
                  <img
                    className="server-type-icon"
                    src={SERVER_KIND_ICONS[s.kind ?? kind]}
                    alt=""
                  />
                  <span style={{ flex: 1 }}>
                    <div className="name">{s.name}</div>
                    <div className="sub">
                      {s.address.replace(/^https?:\/\//, '')} · {kindLabel(s.kind ?? kind)}{' '}
                      {s.version || '—'}
                      {s.local ? ' · Local' : ''}
                      {s.relay ? ' · Relay' : ''}
                      {!s.supported && (s.kind ?? kind) === 'jellyfin'
                        ? ` · Needs Jellyfin ${MIN_SERVER_VERSION_LABEL}+`
                        : ''}
                    </div>
                  </span>
                  <span className="muted">{s.supported ? '›' : ''}</span>
                </Focusable>
              ))}
            </div>
          )}

          <div style={{ width: 920 }}>
            <div className="section-label">
              {none ? 'Enter your server address' : 'Enter address manually'}
            </div>
            <div className="address-row">
              <Focusable id="address" className="field" style={{ flex: 1 }}>
                <span className="muted">
                  <IconKeyboard />
                </span>
                <input
                  data-testid="address"
                  value={address}
                  placeholder={placeholder}
                  onChange={(e) => onAddress(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="kbd-hint">TV keyboard</span>
              </Focusable>
              <Focusable id="connect" className="btn" onSelect={onConnect}>
                Connect
              </Focusable>
            </div>
          </div>
        </div>
      </div>
    </FocusRoot>
  );
}

function KindCard({
  id,
  kind,
  label,
  selected,
  onSelect,
}: {
  id: string;
  kind: ServerKind;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Focusable
      id={id}
      className={`kind-card ${selected ? 'is-selected' : ''}`}
      onSelect={onSelect}
    >
      <span className="kind-icon-slot" data-testid={`kind-icon-${kind}`}>
        <img src={SERVER_KIND_ICONS[kind]} alt="" />
      </span>
      <span className="kind-label">{label}</span>
    </Focusable>
  );
}

function kindLabel(kind: ServerKind): string {
  return kind === 'plex' ? 'Plex' : 'Jellyfin';
}
