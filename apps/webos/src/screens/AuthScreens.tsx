import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import type { PublicUser } from '../data/jellyfin';

const ORB = ['#6b4a32', '#4a3a52', '#2f4a36', '#2a3a4a', '#2a2a2e'];

export function QuickConnectScreen({
  serverLabel,
  code,
  remaining,
  onPassword,
  onChangeServer,
}: {
  serverLabel: string;
  code: string;
  remaining: string;
  onPassword: () => void;
  onChangeServer: () => void;
}) {
  const chars = (code || '      ').padEnd(6, ' ').slice(0, 6).split('');
  return (
    <FocusRoot initial="password">
      <div className="screen">
        <div className="top-bar">
          <Logo size={36} />
          <div className="top-meta">{serverLabel}</div>
        </div>
        <div className="center-col" style={{ justifyContent: 'center', paddingTop: 0 }}>
          <h1 className="h1" style={{ marginBottom: 36 }}>
            Sign in with Quick Connect
          </h1>
          <div className="qc-row" style={{ marginBottom: 28 }}>
            {chars.map((c, i) => (
              <div key={i} className="qc-tile">
                {c.trim() || '·'}
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginBottom: 48, textAlign: 'center', maxWidth: 720 }}>
            On your phone or computer, open Jellyfin › Quick Connect and enter this code.
          </p>
          <p className="muted" style={{ marginBottom: 28 }}>
            Waiting for approval · Code refreshes in {remaining}
          </p>
          <Focusable id="password" className="btn btn-amber btn-wide" onSelect={onPassword}>
            Use password instead
          </Focusable>
          <Focusable
            id="change"
            className="btn btn-ghost"
            style={{ marginTop: 12 }}
            onSelect={onChangeServer}
          >
            Change server
          </Focusable>
        </div>
      </div>
    </FocusRoot>
  );
}

export function PasswordScreen({
  serverLabel,
  users,
  selected,
  onSelectUser,
  password,
  onPassword,
  onSignIn,
  onQuick,
}: {
  serverLabel: string;
  users: PublicUser[];
  selected: string;
  onSelectUser: (id: string) => void;
  password: string;
  onPassword: (v: string) => void;
  onSignIn: () => void;
  onQuick: () => void;
}) {
  const current = users.find((u) => u.id === selected);
  return (
    <FocusRoot initial={users[0] ? `user-${users[0].id}` : 'password'}>
      <div className="screen">
        <div className="top-bar">
          <Logo size={36} />
          <div className="top-meta">{serverLabel}</div>
        </div>
        <div className="center-col" style={{ justifyContent: 'center', paddingTop: 0 }}>
          <h1 className="h1" style={{ marginBottom: 42 }}>
            Who's signing in?
          </h1>
          <div className="avatar-row" style={{ marginBottom: 48 }}>
            {users.map((u, i) => (
              <Focusable
                key={u.id}
                id={`user-${u.id}`}
                className="avatar"
                onSelect={() => onSelectUser(u.id)}
              >
                <div className="avatar-orb" style={{ background: ORB[i % ORB.length] }}>
                  {u.name.slice(0, 1).toUpperCase()}
                  {selected === u.id ? <span className="avatar-check">✓</span> : null}
                </div>
                <div>{u.name}</div>
              </Focusable>
            ))}
            <Focusable id="other" className="avatar" onSelect={() => onSelectUser('other')}>
              <div className="avatar-orb" style={{ background: '#1c1c20', border: '2px solid #3a3a40' }}>
                +
              </div>
              <div>Other user</div>
            </Focusable>
          </div>
          <div style={{ width: 720 }}>
            <div className="section-label">
              Password for {current?.name ?? 'user'}
            </div>
            <Focusable id="password" className="field" style={{ marginBottom: 16 }}>
              <span>🔒</span>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => onPassword(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="kbd-hint">TV keyboard</span>
            </Focusable>
            <Focusable id="signin" className="btn" style={{ width: '100%' }} onSelect={onSignIn}>
              Sign in
            </Focusable>
          </div>
          <Focusable id="quick" className="btn btn-ghost" style={{ marginTop: 20 }} onSelect={onQuick}>
            Use Quick Connect instead
          </Focusable>
        </div>
      </div>
    </FocusRoot>
  );
}
