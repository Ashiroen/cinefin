import { useEffect, useRef } from 'react';
import { ticksToSeconds, formatRuntime } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
import { IconSearch, IconSettings } from '../components/Icons';
import type { CatalogItem, HomeModel } from '../data/jellyfin';
import { imageUrl } from '../data/jellyfin';

function tint(name: string): string {
  const hues = [20, 28, 210, 230, 160, 340, 40, 200];
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h += name.charCodeAt(i);
  return `hsl(${hues[h % hues.length]} 18% 28%)`;
}

function Poster({
  item,
  id,
  portrait,
  onSelect,
}: {
  item: CatalogItem;
  id: string;
  portrait?: boolean;
  onSelect: () => void;
}) {
  const src = imageUrl(item.id, { tag: item.imageTag, w: portrait ? 240 : 400, h: portrait ? 360 : 225 });
  const progress =
    item.userData?.positionTicks && item.runtimeTicks
      ? item.userData.positionTicks / item.runtimeTicks
      : 0;
  return (
    <div>
      <Focusable
        id={id}
        className={`poster ${portrait ? 'portrait' : ''}`}
        onSelect={onSelect}
        style={{ background: tint(item.name) }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
        <div className="poster-fill" />
        {!portrait ? <div className="poster-title">{item.name}</div> : null}
        {progress > 0 && progress < 0.95 ? (
          <div className="poster-progress">
            <i style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        ) : null}
      </Focusable>
      {item.type === 'Episode' ? (
        <div className="card-meta">
          {item.name}
          <br />
          S{item.parentIndexNumber ?? 1} E{item.indexNumber ?? 1}
          {item.userData?.positionTicks
            ? ` · ${Math.max(1, Math.round(ticksToSeconds((item.runtimeTicks ?? 0) - item.userData.positionTicks) / 60))} min left`
            : ''}
        </div>
      ) : portrait ? (
        <div className="card-meta">{item.name}</div>
      ) : null}
    </div>
  );
}

export function HomeScreen({
  home,
  hero,
  onHero,
  onOpen,
  onSearch,
  onSettings,
  initialFocus,
  scrolled,
}: {
  home: HomeModel;
  hero: CatalogItem | null;
  onHero: (item: CatalogItem) => void;
  onOpen: (item: CatalogItem) => void;
  onSearch?: () => void;
  onSettings: () => void;
  initialFocus?: string;
  scrolled?: boolean;
}) {
  const h = hero ?? home.resume[0] ?? home.libraries[0]?.items[0] ?? null;
  const firstId = initialFocus ?? (home.resume[0] ? 'resume-0' : 'lib-0-0');
  const rowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrolled) return;
    const rows = rowsRef.current;
    const next = rows?.querySelector('[data-row="next"]') as HTMLElement | null;
    const movies = rows?.querySelector('[data-row="movies"]') as HTMLElement | null;
    if (!rows) return;
    rows.scrollTop = (next ?? movies)?.offsetTop ?? 0;
  }, [scrolled, home]);

  return (
    <FocusRoot initial={firstId}>
      <div className="screen screen-fill screen-home">
        <div className="top-bar">
          <Logo size={50} />
        </div>
        <Focusable id="search" className="icon-btn icon-search" onSelect={onSearch}>
          <IconSearch />
        </Focusable>
        <Focusable id="settings" className="icon-btn icon-settings" onSelect={onSettings}>
          <IconSettings />
        </Focusable>
        {h ? (
          <div className="hero">
            <div className="kicker">
              {h.type === 'Episode'
                ? `Continue watching · S${h.parentIndexNumber ?? 1} E${h.indexNumber ?? 1}`
                : h.type === 'Movie'
                  ? 'Movie'
                  : h.type}
            </div>
            <h1 className="h1 h1-lg">{h.name}</h1>
            <div className="meta">
              {[
                h.year,
                h.runtimeTicks ? formatRuntime(ticksToSeconds(h.runtimeTicks)) : null,
                h.officialRating,
                h.genres?.[0],
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {h.overview ? <p className="synopsis">{h.overview}</p> : null}
          </div>
        ) : (
          <div className="hero">
            <h1 className="h1">Your library is empty</h1>
            <p className="meta">Add a library on the server, then come back.</p>
          </div>
        )}
        <div className="rows" ref={rowsRef} data-testid="home-rows">
          {home.resume.length ? (
            <div className="row" data-row="resume">
              <div className="row-title">Continue watching</div>
              <div className="row-scroller">
                {home.resume.map((item, i) => (
                  <Poster
                    key={item.id + i}
                    id={`resume-${i}`}
                    item={item}
                    onSelect={() => {
                      onHero(item);
                      onOpen(item);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {home.nextUp.length ? (
            <div className="row" data-row="next">
              <div className="row-title">Next up</div>
              <div className="row-scroller">
                {home.nextUp.map((item, i) => (
                  <Poster
                    key={item.id + i}
                    id={`next-${i}`}
                    item={item}
                    onSelect={() => {
                      onHero(item);
                      onOpen(item);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {home.libraries.map((lib, li) => (
            <div className="row" key={lib.id} data-row={li === 0 ? 'movies' : `lib-${li}`}>
              <div className="row-title row-title-posters">
                {lib.name}
                <span className="caption" style={{ marginLeft: 10 }}>
                  {lib.items.length} titles
                </span>
              </div>
              <div className="row-scroller portrait-row">
                {lib.items.map((item, i) => (
                  <Poster
                    key={item.id}
                    id={`lib-${li}-${i}`}
                    item={item}
                    portrait
                    onSelect={() => {
                      onHero(item);
                      onOpen(item);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </FocusRoot>
  );
}
