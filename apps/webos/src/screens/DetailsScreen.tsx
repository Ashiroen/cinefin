import { formatClock, ticksToSeconds } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import type { CatalogItem, MediaStreamLite } from '../data/jellyfin';
import { imageUrl } from '../data/jellyfin';
import { cast as fixtureCast } from '../preview/fixtures';

export function DetailsScreen({
  item,
  audioIndex,
  onAudioIndex,
  pickerOpen,
  onTogglePicker,
  onPlay,
  onPlayFromStart,
  onSettings,
}: {
  item: CatalogItem;
  audioIndex?: number;
  onAudioIndex: (i: number) => void;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onPlay: () => void;
  onPlayFromStart: () => void;
  onSettings: () => void;
}) {
  const audios = (item.mediaStreams ?? []).filter((s) => s.type === 'Audio');
  const current = audios.find((s) => s.index === audioIndex) ?? audios[0];
  const pos = item.userData?.positionTicks ?? 0;
  const dur = item.runtimeTicks ?? 0;
  const canResume = pos > 10_000_000 && dur - pos > 10_000_000;
  const left = dur > 0 ? formatClock(ticksToSeconds(dur - pos)) : '';

  return (
    <FocusRoot initial="play">
      <div className="screen screen-fill">
        <div className="top-bar">
          <Logo size={34} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Focusable id="search" className="icon-btn">
              ⌕
            </Focusable>
            <Focusable id="settings" className="icon-btn" onSelect={onSettings}>
              ⚙
            </Focusable>
          </div>
        </div>
        <div className="details">
          <h1 className="h1 h1-lg">{item.name}</h1>
          <div className="meta" style={{ marginTop: 12 }}>
            {[
              item.year,
              item.runtimeTicks ? formatClock(ticksToSeconds(item.runtimeTicks)) : null,
              item.officialRating,
              (item.genres ?? []).slice(0, 2).join(', '),
              item.communityRating ? `★ ${item.communityRating.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="badge-row">
            <span className="badge">Dolby Vision</span>
            <span className="badge">HDR10</span>
            <span className="badge">Dolby Atmos</span>
            <span className="badge">TrueHD 7.1</span>
          </div>
          {item.overview ? (
            <p className="synopsis" style={{ maxWidth: 880 }}>
              {item.overview}
            </p>
          ) : null}
          {canResume ? (
            <div style={{ width: 420, marginTop: 22 }}>
              <div className="progress-line">
                <i style={{ width: `${Math.round((pos / dur) * 100)}%` }} />
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                {left} left
              </div>
            </div>
          ) : null}
          <div className="actions">
            <Focusable id="play" className="btn btn-amber" onSelect={onPlay}>
              ▶ {canResume ? `Resume from ${formatClock(ticksToSeconds(pos))}` : 'Play'}
            </Focusable>
            <Focusable id="start" className="btn" onSelect={onPlayFromStart}>
              Play from start
            </Focusable>
            <Focusable id="audio" className="btn" onSelect={onTogglePicker}>
              {current ? current.displayTitle ?? current.codec : 'Audio'}
            </Focusable>
            <Focusable id="subs" className="btn">
              Off
            </Focusable>
          </div>
          <div className="section-label">Cast & crew</div>
          <div className="cast-row">
            {fixtureCast.map((c) => (
              <div className="cast" key={c.name}>
                <div className="cast-orb" style={{ background: c.color }} />
                <div className="name">{c.name}</div>
                <div className="role">{c.role}</div>
              </div>
            ))}
          </div>
        </div>
        {item.backdropTag ? (
          <img
            alt=""
            src={imageUrl(item.id, { tag: item.backdropTag, type: 'Backdrop', w: 1920, h: 1080 })}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.28,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ) : null}
        {pickerOpen ? (
          <AudioPicker
            tracks={audios}
            selected={current?.index}
            onPick={(i) => {
              onAudioIndex(i);
              onTogglePicker();
            }}
          />
        ) : null}
      </div>
    </FocusRoot>
  );
}

function AudioPicker({
  tracks,
  selected,
  onPick,
}: {
  tracks: MediaStreamLite[];
  selected?: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="sheet-dim">
      <div className="sheet">
        <h1 className="h1" style={{ fontSize: 44, marginBottom: 8 }}>
          Audio
        </h1>
        <p className="muted" style={{ marginBottom: 28 }}>
          Choose a track. The note shows how it reaches your receiver.
        </p>
        {tracks.map((t) => {
          const dts = (t.codec ?? '').toLowerCase().includes('dts');
          return (
            <Focusable
              key={t.index}
              id={`track-${t.index}`}
              className="pick-row"
              onSelect={() => onPick(t.index)}
            >
              <div className="t">
                {selected === t.index ? '✓  ' : ''}
                {t.displayTitle ?? t.codec}
              </div>
              <div className="s">
                {dts
                  ? 'Converted · [confirmed format] · TV has no DTS'
                  : t.codec === 'truehd'
                    ? 'Default · To receiver (passthrough)'
                    : 'To receiver (passthrough)'}
              </div>
            </Focusable>
          );
        })}
        <p className="note" style={{ marginTop: 24 }}>
          [confirmed format] is filled from the receiver test result (multichannel PCM or Dolby Digital Plus).
        </p>
      </div>
    </div>
  );
}
