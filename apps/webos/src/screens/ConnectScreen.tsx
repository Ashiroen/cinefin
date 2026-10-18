import { MIN_SERVER_VERSION_LABEL } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import type { PublicServer } from '../data/jellyfin';

export function ConnectScreen({
  servers,
  discovering,
  address,
  onAddress,
  onConnect,
  onPick,
  onSearchAgain,
  empty,
}: {
  servers: PublicServer[];
  discovering?: boolean;
  address: string;
  onAddress: (v: string) => void;
  onConnect: () => void;
  onPick: (s: PublicServer) => void;
  onSearchAgain?: () => void;
  empty?: boolean;
}) {
  const none = empty || (!discovering && servers.length === 0);
  return (
    <FocusRoot initial={none ? 'address' : servers[0] ? `server-${servers[0].id}` : 'address'}>
      <div className="screen">
        <div className="center-col">
          <div className="logo-center" style={{ marginTop: 8, marginBottom: 28 }}>
            <Logo size={52} />
          </div>
          <h1 className="h1" style={{ marginBottom: 42 }}>
            Connect to your Jellyfin server
          </h1>

          {none ? (
            <div className="banner" style={{ marginBottom: 36 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>No servers found on your network</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Is the server on the same network as the TV?
                </div>
              </div>
              <Focusable id="search" className="btn" onSelect={onSearchAgain}>
                Search again
              </Focusable>
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
                  <span style={{ fontSize: 26, opacity: 0.7 }}>{s.supported ? '▣' : '□'}</span>
                  <span style={{ flex: 1 }}>
                    <div className="name">{s.name}</div>
                    <div className="sub">
                      {s.address.replace(/^https?:\/\//, '')} · Jellyfin {s.version || '—'}
                      {!s.supported ? ` · Needs Jellyfin ${MIN_SERVER_VERSION_LABEL}+` : ''}
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
            <div style={{ display: 'flex', gap: 12 }}>
              <Focusable id="address" className="field" style={{ flex: 1 }}>
                <span className="muted">⌂</span>
                <input
                  data-testid="address"
                  value={address}
                  placeholder="e.g. 192.168.1.20:8096"
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
