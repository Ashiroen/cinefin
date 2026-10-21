import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { formatClock, type CatalogItem, type PlaybackDecision } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';

const STATE_CHIP_COL = 460;

function formatEndsClock(now: Date, remainingSeconds: number): string {
  const end = new Date(now.getTime() + Math.max(0, remainingSeconds) * 1000);
  return `${end.getHours()}:${String(end.getMinutes()).padStart(2, '0')}`;
}

function formatWallClock(now: Date): string {
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function outputChip(decision: PlaybackDecision | null, item: CatalogItem): string {
  const audio = item.mediaStreams?.find((s) => s.type === 'Audio' && s.isDefault) ??
    item.mediaStreams?.find((s) => s.type === 'Audio');
  const title = `${audio?.displayTitle ?? ''} ${audio?.codec ?? ''}`.toLowerCase();
  if (decision?.output === 'direct' && (title.includes('atmos') || title.includes('truehd'))) {
    return 'TrueHD Atmos → AVR';
  }
  if (decision?.output === 'converted') return 'Converted';
  if (decision?.output === 'repackaged') return 'Repackaged';
  if (decision?.output === 'direct') return 'Direct';
  return '';
}

function outputSub(item: CatalogItem): string {
  const video = item.mediaStreams?.find((s) => s.type === 'Video');
  const codec = (video?.codec ?? 'hevc').toUpperCase();
  return `${codec} · 23.976 Hz matched`;
}

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
  wallNow,
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
  wallNow?: Date;
}) {
  const pct = duration > 0 ? current / duration : 0;
  const now = wallNow ?? new Date();
  const remaining = Math.max(0, duration - current);
  return (
    <FocusRoot initial="scrub">
      <div className="screen player-root">
        <video
          ref={videoRef}
          className="player-video"
          autoPlay
          onClick={onToggleOverlay}
        />
        {overlay ? (
          <div className="overlay">
            <div className="player-clock">{formatWallClock(now)}</div>
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
              <div style={{ textAlign: 'right' }}>
                {decision ? <div className="output-chip">{outputChip(decision, item)}</div> : null}
                <div className="output-sub">{outputSub(item)}</div>
              </div>
            </div>
            <Focusable id="scrub" className="scrub" onSelect={() => undefined}>
              <span className="scrub-track">
                <i style={{ width: `${pct * 100}%` }} />
              </span>
              <span className="scrub-knob" style={{ left: `${pct * 100}%` }} />
            </Focusable>
            <div style={{ display: 'flex', justifyContent: 'space-between' }} className="muted">
              <span>{formatClock(current)}</span>
              <span>
                -{formatClock(remaining)}
                {duration ? `  ends ${formatEndsClock(now, remaining)}` : ''}
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
      t: 'Server repackaging: MKV → TS · picture untouched',
      d: 'Lossless, container only. Neutral, not a warning. Example: Dolby Vision in MKV remuxes to progressive TS on webOS 22.',
      c: '#1e3328',
    },
    {
      k: 'SERVER CONVERTING',
      t: 'Server converting: DTS-HD MA → Dolby Digital Plus (TV has no DTS)',
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
      <div className="screen output-states">
        <h1 className="h1" style={{ marginBottom: 12 }}>
          Output states
        </h1>
        <p className="muted" style={{ maxWidth: 880, marginBottom: 20 }}>
          The line in the player overlay that shows what happens to audio and video. Hidden by default; one press of the remote shows it.
        </p>
        <div className="state-list">
          {rows.map((r) => (
            <StateCard key={r.k} kicker={r.k} chip={r.t} desc={r.d} color={r.c} />
          ))}
        </div>
        <Focusable
          id="back"
          className="btn"
          style={{ marginTop: 20, alignSelf: 'flex-start' }}
          onSelect={onBack}
        >
          Back
        </Focusable>
      </div>
    </FocusRoot>
  );
}

function StateCard({
  kicker,
  chip,
  desc,
  color,
}: {
  kicker: string;
  chip: string;
  desc: string;
  color: string;
}) {
  const chipRef = useRef<HTMLDivElement>(null);
  const [stack, setStack] = useState(false);
  useLayoutEffect(() => {
    const el = chipRef.current;
    if (!el) return;
    const probe = el.cloneNode(true) as HTMLElement;
    probe.style.cssText =
      'position:absolute;left:-9999px;top:0;width:max-content;max-width:none;white-space:nowrap;display:inline-flex';
    document.body.appendChild(probe);
    setStack(probe.scrollWidth > STATE_CHIP_COL);
    probe.remove();
  }, [chip]);
  return (
    <div className={`state-card ${stack ? 'is-stacked' : ''}`}>
      <div className="state-label">
        <div className="kicker">{kicker}</div>
        <div ref={chipRef} className="state-chip" style={{ background: color }}>
          {chip}
        </div>
      </div>
      <div className="muted state-desc">{desc}</div>
    </div>
  );
}
