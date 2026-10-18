import { formatClock, formatRuntime, ticksToSeconds } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { IconSearch, IconSettings } from '../components/Icons';
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
  convertLabel,
}: {
  item: CatalogItem;
  audioIndex?: number;
  onAudioIndex: (i: number) => void;
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onPlay: () => void;
  onPlayFromStart: () => void;
  onSettings: () => void;
  convertLabel?: string | null;
}) {
  const audios = (item.mediaStreams ?? []).filter((s) => s.type === 'Audio');
  const current = audios.find((s) => s.index === audioIndex) ?? audios[0];
  const pos = item.userData?.positionTicks ?? 0;
  const dur = item.runtimeTicks ?? 0;
  const canResume = pos > 10_000_000 && dur - pos > 10_000_000;
  const left = dur > 0 ? formatClock(ticksToSeconds(dur - pos)) : '';

  return (
    <FocusRoot initial={pickerOpen && current ? `track-${current.index}` : 'play'}>
      <div className="screen screen-fill">
        <Focusable id="search" className="icon-btn icon-search">
          <IconSearch />
        </Focusable>
        <Focusable id="settings" className="icon-btn icon-settings" onSelect={onSettings}>
          <IconSettings />
        </Focusable>
        <div className="details">
          <h1 className="h1 h1-lg">{item.name}</h1>
          <div className="meta" style={{ marginTop: 12 }}>
            {[
              item.year,
              item.runtimeTicks ? formatRuntime(ticksToSeconds(item.runtimeTicks)) : null,
              item.officialRating,
              (item.genres ?? []).slice(0, 2).join(', '),
              item.communityRating ? `★ ${item.communityRating.toFixed(1)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="badge-row">
            {badgesFor(item).map((b) => (
              <span className="badge" key={b}>
                {b}
              </span>
            ))}
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
              <div className="caption" style={{ marginTop: 6 }}>
                {left} left
              </div>
            </div>
          ) : null}
          <div className="actions">
            <Focusable
              id="play"
              className={`btn ${canResume ? 'resume-btn' : ''}`}
              onSelect={onPlay}
            >
              {canResume ? (
                <>
                  <span>Resume</span>
                  <span className="caption">from {formatClock(ticksToSeconds(pos))}</span>
                </>
              ) : (
                <>▶ Play</>
              )}
            </Focusable>
            <Focusable id="start" className="btn" onSelect={onPlayFromStart}>
              Play from start
            </Focusable>
          </div>
          <div className="actions">
            <Focusable id="audio" className="picker-btn" onSelect={onTogglePicker}>
              <span>
                <div className="picker-label">Audio</div>
                <div className="picker-value">{current ? current.displayTitle ?? current.codec : 'Audio'}</div>
              </span>
              <span className="muted">›</span>
            </Focusable>
            <Focusable id="subs" className="picker-btn">
              <span>
                <div className="picker-label">Subtitles</div>
                <div className="picker-value">Off</div>
              </span>
              <span className="muted">›</span>
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
            convertLabel={convertLabel}
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

function badgesFor(item: CatalogItem): string[] {
  if (item.badges?.length) return item.badges;
  const out: string[] = [];
  const streams = item.mediaStreams ?? [];
  const video = streams.find((s) => s.type === 'Video');
  const range = (video?.videoRangeType ?? '').toLowerCase();
  if (range.includes('dovi') || range.includes('dolby')) out.push('Dolby Vision');
  if (range.includes('hdr10+')) out.push('HDR10+');
  else if (range.includes('hdr')) out.push('HDR10');
  if ((video?.width ?? 0) >= 3800) out.push('4K');
  for (const a of streams.filter((s) => s.type === 'Audio')) {
    const title = `${a.displayTitle ?? ''} ${a.codec ?? ''}`.toLowerCase();
    if (title.includes('atmos')) out.push('Dolby Atmos');
    if (title.includes('truehd')) out.push('TrueHD 7.1');
    if (title.includes('dts:x') || title.includes('dtsx')) out.push('DTS:X');
    else if (title.includes('dts-hd') || title.includes('dtshd')) out.push('DTS-HD');
  }
  return [...new Set(out)];
}

function AudioPicker({
  tracks,
  selected,
  onPick,
  convertLabel,
}: {
  tracks: MediaStreamLite[];
  selected?: number;
  onPick: (i: number) => void;
  convertLabel?: string | null;
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
                  ? `Converted · ${convertLabel ?? 'Not tested yet'} · TV has no DTS`
                  : t.codec === 'truehd'
                    ? 'Default · To receiver (passthrough)'
                    : 'To receiver (passthrough)'}
              </div>
            </Focusable>
          );
        })}
      </div>
    </div>
  );
}
