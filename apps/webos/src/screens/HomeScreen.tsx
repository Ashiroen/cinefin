import { ticksToSeconds, formatRuntime } from '@cinefin/core';
import { FocusRoot, Focusable } from '../focus/FocusRoot';
import { Logo } from '../components/Logo';
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
        <div className="poster-title">{item.name}</div>
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
}: {
  home: HomeModel;
  hero: CatalogItem | null;
  onHero: (item: CatalogItem) => void;
  onOpen: (item: CatalogItem) => void;
  onSearch?: () => void;
  onSettings: () => void;
}) {
  const h = hero ?? home.resume[0] ?? home.libraries[0]?.items[0] ?? null;
  const firstId = home.resume[0] ? 'resume-0' : 'lib-0-0';
  return (
    <FocusRoot initial={firstId}>
      <div className="screen screen-fill">
        <div className="top-bar">
          <Logo size={34} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Focusable id="search" className="icon-btn" onSelect={onSearch}>
              ⌕
            </Focusable>
            <Focusable id="settings" className="icon-btn" onSelect={onSettings}>
              ⚙
            </Focusable>
          </div>
        </div>
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
        <div className="rows">
          {home.resume.length ? (
            <div className="row">
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
            <div className="row">
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
            <div className="row" key={lib.id}>
              <div className="row-title">
                {lib.name}
                <span className="muted" style={{ fontSize: 18, marginLeft: 10 }}>
                  {lib.items.length} titles
                </span>
              </div>
              <div className="row-scroller">
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
