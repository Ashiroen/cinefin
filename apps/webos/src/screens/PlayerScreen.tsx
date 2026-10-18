import type { RefObject } from 'react';
import { formatClock, outputStateTitle, type PlaybackDecision } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import type { CatalogItem } from '../data/jellyfin';

export function PlayerScreen({
  item,
  videoRef,
  overlay,
  onToggleOverlay,
  current,
  duration,
  paused,
  onPause,
  onSeek,
  decision,
  onBack,
  onChapters,
  audioLabel,
}: {
  item: CatalogItem;
  videoRef: RefObject<HTMLVideoElement>;
  overlay: boolean;
  onToggleOverlay: () => void;
  current: number;
  duration: number;
  paused: boolean;
  onPause: () => void;
  onSeek: (delta: number) => void;
  decision: PlaybackDecision | null;
  onBack: () => void;
  onChapters?: () => void;
  audioLabel?: string;
}) {
  const pct = duration > 0 ? current / duration : 0;
  return (
    <FocusRoot initial="pause">
      <div className="screen player-root">
        <video
          ref={videoRef}
          className="player-video"
          autoPlay
          onClick={onToggleOverlay}
        />
        {overlay ? (
          <div className="overlay">
            <div style={{ position: 'absolute', top: 36, right: 48 }} className="muted">
              {formatClock(current)}
            </div>
            <div className="kicker" style={{ marginBottom: 8 }}>
              {item.type === 'Episode'
                ? `S${item.parentIndexNumber ?? 1} E${item.indexNumber ?? 1} · ${item.seriesName ?? item.name}`
                : item.type}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h1 className="h1" style={{ fontSize: 48 }}>
                  {item.name}
                </h1>
                {item.type === 'Episode' ? (
                  <div className="muted">The Crossing</div>
                ) : null}
              </div>
              <div style={{ textAlign: 'right' }} className="muted">
                <div>{decision ? `${outputStateTitle(decision.output)}` : ''}</div>
                <div style={{ maxWidth: 420, fontSize: 14 }}>{decision?.reason}</div>
              </div>
            </div>
            <div className="scrub">
              <i style={{ width: `${pct * 100}%` }} />
              <span className="scrub-knob" style={{ left: `${pct * 100}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
              <span>{formatClock(current)}</span>
              <span>
                -{formatClock(Math.max(0, duration - current))}
                {duration ? `  ends ${formatClock(duration)}` : ''}
              </span>
            </div>
            <div className="transport">
              <Focusable id="audio" className="btn">
                {audioLabel ?? 'English · Atmos'}
              </Focusable>
              <Focusable id="subs" className="btn">
                Subtitles off
              </Focusable>
              <span style={{ flex: 1 }} />
              <Focusable id="back10" className="btn" onSelect={() => onSeek(-10)}>
                ↺
              </Focusable>
              <Focusable id="pause" className="btn" onSelect={onPause}>
                {paused ? '▶' : '❚❚'}
              </Focusable>
              <Focusable id="fwd30" className="btn" onSelect={() => onSeek(30)}>
                ↻
              </Focusable>
              <span style={{ flex: 1 }} />
              <Focusable id="chapters" className="btn" onSelect={onChapters}>
                Chapters
              </Focusable>
              <Focusable id="back" className="btn btn-ghost" onSelect={onBack}>
                Back
              </Focusable>
            </div>
          </div>
        ) : null}
      </div>
    </FocusRoot>
  );
}

export function OutputStatesScreen({ onBack }: { onBack: () => void }) {
  const rows = [
    {
      k: 'PASSTHROUGH',
      t: 'TrueHD Atmos → AVR',
      d: 'Bitstream goes untouched to the receiver. The receiver decodes it.',
      c: '#1f3b34',
    },
    {
      k: 'DECODED BY TV',
      t: 'TrueHD Atmos → PCM · decoded by TV',
      d: "Fallback only: used when the setup test shows the receiver didn't get Atmos. Still lossless multichannel.",
      c: '#3a2a2a',
    },
    {
      k: 'SERVER REPACKAGING',
      t: 'Server repackaging: MKV → MP4 · picture untouched',
      d: 'Lossless, container only. Neutral, not a warning. Example: Dolby Vision in MKV on webOS 22.',
      c: '#1e3328',
    },
    {
      k: 'SERVER CONVERTING',
      t: 'Server converting: DTS-HD MA → [confirmed format] (TV has no DTS)',
      d: 'Changes quality, so it is amber and always has the reason.',
      c: '#3a2f12',
    },
    {
      k: 'VIDEO',
      t: 'DV P7 → HDR10 · 23.976 Hz matched',
      d: 'HDR format change and whether the display refresh rate matched the film.',
      c: '#3a1c22',
    },
  ];
  return (
    <FocusRoot initial="back">
      <div className="screen" style={{ padding: '72px 96px' }}>
        <h1 className="h1" style={{ marginBottom: 12 }}>
          Output states
        </h1>
        <p className="muted" style={{ maxWidth: 880, marginBottom: 32 }}>
          The line in the player overlay that shows what happens to audio and video. Hidden by default; one press of the remote shows it.
        </p>
        <div className="state-list">
          {rows.map((r) => (
            <div key={r.k} className="state-card">
              <div>
                <div className="kicker">{r.k}</div>
                <div
                  style={{
                    marginTop: 10,
                    background: r.c,
                    borderRadius: 12,
                    padding: '12px 16px',
                    fontWeight: 600,
                  }}
                >
                  {r.t}
                </div>
              </div>
              <div className="muted">{r.d}</div>
            </div>
          ))}
        </div>
        <Focusable id="back" className="btn" style={{ marginTop: 28 }} onSelect={onBack}>
          Back
        </Focusable>
      </div>
    </FocusRoot>
  );
}
