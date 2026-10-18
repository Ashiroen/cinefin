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
                <div style={{ fontSize: 20, fontWeight: 600 }}>No servers found on your network</div>
                <div className="muted" style={{ fontSize: 16, marginTop: 4 }}>
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
                  className="server-card"
                  onSelect={() => s.supported && onPick(s)}
                >
                  <span style={{ fontSize: 22, opacity: 0.7 }}>{s.supported ? '▣' : '□'}</span>
                  <span style={{ flex: 1 }}>
                    <div className="name">{s.name}</div>
                    <div className="sub">
                      {s.address.replace(/^https?:\/\//, '')} · Jellyfin {s.version || '—'}
                      {!s.supported ? (
                        <>
                          {' '}
                          · <span className="chip">Needs Jellyfin {MIN_SERVER_VERSION_LABEL}+</span>
                        </>
                      ) : null}
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

          <div className="note" style={{ width: 920, marginTop: 36 }}>
            {none ? (
              <p>Focus starts in the address field; OK opens the TV keyboard. Magic Remote hover uses the same style as focus.</p>
            ) : (
              <>
                <p>
                  Magic Remote: pointer hover uses the same style as D-pad focus (scale + amber ring). One focused element per screen.
                </p>
                <p>
                  [{MIN_SERVER_VERSION_LABEL}] comes from the Jellyfin TypeScript SDK. Server versions shown are example data.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </FocusRoot>
  );
}
