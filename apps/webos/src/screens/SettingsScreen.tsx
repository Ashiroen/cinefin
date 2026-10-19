import type { ReactNode } from 'react';
import {
  CONVERT_TARGETS,
  listConfirmedConvertTargets,
  resolveConvertTo,
  sourceCaption,
  statusLabel,
  type CapabilityTable,
  type ConvertTargetId,
  type FormatRow,
} from '@cinefin/core';
import { FocusRoot, Focusable, useFocus } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';

const NAV = [
  { id: 'account', label: 'Account' },
  { id: 'playback', label: 'Playback & formats', active: true },
  { id: 'subs', label: 'Subtitles' },
  { id: 'receiver', label: 'Receiver setup' },
  { id: 'about', label: 'About' },
];

export function SettingsPlayback({
  table,
  onConvert,
  onWizard,
  onNav,
  inert,
}: {
  table: CapabilityTable;
  onConvert: (row: FormatRow) => void;
  onWizard: () => void;
  onNav?: (id: string) => void;
  inert?: boolean;
}) {
  const audio = table.rows.filter((r) => r.kind === 'audio');
  const video = table.rows.filter((r) => r.kind === 'video');
  const containers = table.rows.filter((r) => r.kind === 'container' && !r.id.includes('webos22'));
  const counts = {
    direct: table.rows.filter((r) => r.status === 'direct' || r.status === 'sent_to_receiver').length,
    repack: table.rows.filter((r) => r.status === 'repackaged').length,
    conv: table.rows.filter((r) => r.status === 'converted').length,
    untested: table.rows.filter((r) => r.status === 'untested').length,
  };

  const body = (
    <div className={`screen screen-fill settings ${inert ? 'is-inert' : ''}`}>
      <aside className="settings-nav">
        <Logo size={34} />
        <h1>Settings</h1>
        {NAV.map((n) => (
          <Focusable
            key={n.id}
            id={`nav-${n.id}`}
            className={`nav-item ${n.active ? 'active' : ''}`}
            onSelect={() => {
              if (inert) return;
              if (n.id === 'receiver') onWizard();
              else onNav?.(n.id);
            }}
          >
            {n.label}
          </Focusable>
        ))}
        <div className="caption" style={{ marginTop: 48 }}>
          Cinefin on your TV · ONKYO TX-NR7100
          <br />
          over HDMI eARC
        </div>
      </aside>
      <main className="settings-main" data-testid="settings-main">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="h1" style={{ fontSize: 42 }}>
              What your setup plays
            </h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Direct: {counts.direct} · Repackaged: {counts.repack} · Converted: {counts.conv} · Untested:{' '}
              {counts.untested}
            </p>
          </div>
          <Focusable id="rerun" className="btn" onSelect={inert ? undefined : onWizard}>
            Run receiver test again
          </Focusable>
        </div>
        <Section title="Audio" extra="Convert to">
          {audio.map((row) => (
            <FormatLine
              key={row.id}
              row={row}
              table={table}
              onConvert={inert ? undefined : () => onConvert(row)}
              onWizard={inert ? undefined : onWizard}
            />
          ))}
        </Section>
        <Section title="Video">
          {video.map((row) => (
            <FormatLine key={row.id} row={row} table={table} onWizard={inert ? undefined : onWizard} />
          ))}
        </Section>
        <Section title="Containers">
          {containers.map((row) => (
            <FormatLine key={row.id} row={row} table={table} onWizard={inert ? undefined : onWizard} />
          ))}
        </Section>
      </main>
    </div>
  );

  return (
    <FocusRoot initial={inert ? '__none__' : 'row-audio.dtshd'}>
      {body}
    </FocusRoot>
  );
}

function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 28 }}>
      <div className="section-label" style={{ display: 'flex', gap: 16 }}>
        <span style={{ flex: '0 0 280px' }}>{title}</span>
        <span style={{ flex: '0 0 200px' }} />
        <span style={{ flex: 1 }} />
        {extra ? <span>{extra}</span> : null}
      </div>
      {children}
    </div>
  );
}

function chipClass(status: FormatRow['status']): string {
  if (status === 'direct' || status === 'sent_to_receiver') return 'direct';
  if (status === 'converted') return 'converted';
  if (status === 'repackaged') return 'repackaged';
  return 'untested';
}

function FormatLine({
  row,
  table,
  onConvert,
  onWizard,
}: {
  row: FormatRow;
  table: CapabilityTable;
  onConvert?: () => void;
  onWizard?: () => void;
}) {
  const { focused } = useFocus();
  const is = focused === `row-${row.id}`;
  const converted = row.status === 'converted';
  const auto = resolveConvertTo(table, row.convertTo);
  return (
    <Focusable
      id={`row-${row.id}`}
      className="format-row"
      onSelect={converted ? onConvert : onWizard}
      style={{ width: '100%', textAlign: 'left' }}
    >
      <div className="format-label">{row.label}</div>
      <span className={`status-chip ${chipClass(row.status)}`}>{statusLabel(row.status)}</span>
      <div className="why">
        {sourceCaption(row)}
        {row.reason ? <div style={{ marginTop: 4 }}>{row.reason}</div> : null}
      </div>
      <div className="format-row-actions">
        {converted ? (
          <span className="btn convert-pill">
            {row.convertTo === 'auto' || !row.convertTo
              ? 'Best confirmed'
              : CONVERT_TARGETS[auto].label}
          </span>
        ) : null}
        {is ? <span className="btn convert-pill">Test again</span> : null}
      </div>
    </Focusable>
  );
}

export function ConvertPicker({
  row,
  table,
  onPick,
  onClose,
}: {
  row: FormatRow;
  table: CapabilityTable;
  onPick: (id: 'auto' | ConvertTargetId) => void;
  onClose: () => void;
}) {
  const confirmed = listConfirmedConvertTargets(table);
  const current = resolveConvertTo(table, row.convertTo);
  return (
    <FocusRoot initial="opt-auto">
      <div className="screen">
        <SettingsPlayback inert table={table} onConvert={() => undefined} onWizard={() => undefined} />
        <div className="modal-back">
          <div className="modal">
            <h1 className="h1" style={{ fontSize: 36, marginBottom: 8 }}>
              Convert {row.label} to
            </h1>
            <p className="muted" style={{ marginBottom: 22 }}>
              Only formats your receiver test confirmed can be picked.
            </p>
            <Focusable id="opt-auto" className="pick-row" onSelect={() => onPick('auto')}>
              <div className="t">✓  Best confirmed</div>
              <div className="s">
                Default · now {CONVERT_TARGETS[current].label}
              </div>
            </Focusable>
            {(['pcm', 'eac3', 'ac3'] as ConvertTargetId[]).map((id) => {
              const ok = confirmed.includes(id);
              if (!ok) {
                return (
                  <div key={id} className="pick-row is-muted" aria-disabled>
                    <div>
                      <div className="t">{CONVERT_TARGETS[id].label}</div>
                      <div className="s">Untested · run receiver test</div>
                    </div>
                    <span className="pill-outline">Run test</span>
                  </div>
                );
              }
              return (
                <Focusable
                  key={id}
                  id={`opt-${id}`}
                  className="pick-row"
                  onSelect={() => onPick(id)}
                >
                  <div className="t">{CONVERT_TARGETS[id].label}</div>
                  <div className="s">
                    {id === 'pcm' ? 'Multichannel · confirmed by test' : 'Confirmed by test'}
                  </div>
                </Focusable>
              );
            })}
            <Focusable id="close" className="btn" style={{ marginTop: 16 }} onSelect={onClose}>
              Close
            </Focusable>
          </div>
        </div>
      </div>
    </FocusRoot>
  );
}
