import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LG_C2_WEBOS22,
  PROGRESS_INTERVAL_MS,
  applyOverrides,
  cloneTable,
  decidePlayback,
  findRow,
  randomId,
  type CapabilityTable,
  type ConvertTargetId,
  type PlaybackDecision,
} from '@cinefin/core';
import { parseHash, go, type Route } from './route';
import { discoverServers } from './platform/discovery';
import {
  fetchPublicServer,
  fetchPublicUsers,
  finishQuickConnect,
  itemToMedia,
  loadHome,
  loadItem,
  loginByName,
  openPlayback,
  pollQuickConnect,
  reportPlaying,
  startQuickConnect,
  type CatalogItem,
  type HomeModel,
  type PublicServer,
  type PublicUser,
} from './data/jellyfin';
import { getSession, setAccount, setTable } from './data/session';
import { confirmedConvertLabel } from './data/format-label';
import {
  fixtureQcCode,
  fixtureServers,
  fixtureUsers,
  glassValley,
  homeFixture,
  longMeridian,
} from './preview/fixtures';
import { ConnectScreen } from './screens/ConnectScreen';
import { PasswordScreen, QuickConnectScreen } from './screens/AuthScreens';
import { HomeScreen } from './screens/HomeScreen';
import { DetailsScreen } from './screens/DetailsScreen';
import { OutputStatesScreen, PlayerScreen } from './screens/PlayerScreen';
import { WizardDetect, WizardSummary, WizardTest } from './screens/WizardScreens';
import { ConvertPicker, SettingsPlayback } from './screens/SettingsScreen';

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash || '#/connect'));
  useEffect(() => {
    if (!window.location.hash) window.location.hash = '#/connect';
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function App() {
  const route = useRoute();
  const [servers, setServers] = useState<PublicServer[]>([]);
  const [address, setAddress] = useState('192.168.1.20:8096');
  const [picked, setPicked] = useState<PublicServer | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [qc, setQc] = useState({ code: '', secret: '', remaining: '4:32' });
  const [home, setHome] = useState<HomeModel>(homeFixture);
  const [hero, setHero] = useState<CatalogItem | null>(longMeridian);
  const [item, setItem] = useState<CatalogItem>(longMeridian);
  const [audioIndex, setAudioIndex] = useState<number | undefined>(undefined);
  const [picker, setPicker] = useState(false);
  const [table, setTableState] = useState<CapabilityTable>(() => getSession().table);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [overlay, setOverlay] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [decision, setDecision] = useState<PlaybackDecision | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [startAt, setStartAt] = useState(0);
  const playRef = useRef<{ itemId: string; mediaSourceId: string; playSessionId: string } | null>(
    null,
  );
  const [wizardClip, setWizardClip] = useState<'atmos' | 'dts'>('atmos');
  const [dtsChecked, setDtsChecked] = useState(false);

  useEffect(() => {
    if (route.name !== 'connect' || route.empty) return;
    let cancelled = false;
    discoverServers().then(async (found) => {
      const mapped: PublicServer[] = [];
      for (const s of found) {
        try {
          mapped.push(await fetchPublicServer(s.address));
        } catch {
          mapped.push({
            id: s.id,
            name: s.name,
            address: s.address,
            version: '',
            supported: false,
          });
        }
      }
      if (!cancelled && mapped.length) setServers(mapped);
    });
    return () => {
      cancelled = true;
    };
  }, [route]);

  useEffect(() => {
    if (route.name !== 'home') return;
    if (!getSession().account) return;
    loadHome()
      .then((h) => {
        setHome(h);
        setHero(h.resume[0] ?? h.libraries[0]?.items[0] ?? null);
      })
      .catch(() => {
        /* keep fixture so the UI still walks */
      });
  }, [route]);

  useEffect(() => {
    if (route.name !== 'details') return;
    if (!getSession().account) {
      setItem(route.id === 'glass' ? glassValley : longMeridian);
      return;
    }
    loadItem(route.id)
      .then(setItem)
      .catch(() => setItem(longMeridian));
  }, [route]);

  useEffect(() => {
    if (route.name !== 'quick' || !picked) return;
    let stop = false;
    startQuickConnect(picked.address)
      .then((started) => {
        if (stop) return;
        setQc((c) => ({ ...c, code: started.code, secret: started.secret }));
        const t0 = Date.now();
        const tick = window.setInterval(async () => {
          const left = Math.max(0, 300 - Math.floor((Date.now() - t0) / 1000));
          const m = Math.floor(left / 60);
          const s = String(left % 60).padStart(2, '0');
          setQc((c) => ({ ...c, remaining: `${m}:${s}` }));
          try {
            const p = await pollQuickConnect(picked.address, started.secret);
            if (p.authenticated && !stop) {
              window.clearInterval(tick);
              const deviceId = randomId();
              const auth = await finishQuickConnect(picked.address, started.secret, deviceId);
              setAccount({
                serverId: picked.id,
                serverName: picked.name,
                address: picked.address,
                userId: auth.User?.Id ?? '',
                userName: auth.User?.Name ?? '',
                token: auth.AccessToken ?? '',
                deviceId,
              });
              go({ name: 'home' });
            }
          } catch {
            /* keep polling */
          }
        }, 2000);
        return () => window.clearInterval(tick);
      })
      .catch(() => setQc((c) => ({ ...c, code: fixtureQcCode })));
    return () => {
      stop = true;
    };
  }, [route, picked]);

  async function connectManual() {
    setError(null);
    try {
      const info = await fetchPublicServer(address);
      setPicked(info);
      if (!info.supported) {
        setServers((prev) => {
          const rest = prev.filter((s) => s.id !== info.id);
          return [...rest, info];
        });
        return;
      }
      const pub = await fetchPublicUsers(info.address);
      setUsers(pub);
      setUserId(pub[0]?.id ?? 'other');
      go({ name: 'quick' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server');
    }
  }

  async function signInPassword() {
    if (!picked) return;
    setError(null);
    const name = (users.find((u) => u.id === userId)?.name ?? username).trim();
    if (!name) {
      setError('Enter a user name');
      return;
    }
    try {
      const deviceId = randomId();
      const auth = await loginByName(picked.address, name, password, deviceId);
      setAccount({
        serverId: picked.id,
        serverName: picked.name,
        address: picked.address,
        userId: auth.User?.Id ?? '',
        userName: auth.User?.Name ?? name,
        token: auth.AccessToken ?? '',
        deviceId,
      });
      go({ name: 'home' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    }
  }

  async function startPlay(id: string, fromStart = false) {
    const media = itemToMedia(item, audioIndex);
    const dec = media ? decidePlayback(media, table) : null;
    setDecision(dec);
    if (getSession().account) {
      try {
        const opened = await openPlayback(id, table, audioIndex);
        playRef.current = {
          itemId: id,
          mediaSourceId: opened.mediaSourceId,
          playSessionId: opened.playSessionId,
        };
        setPlayUrl(opened.url);
        setStartAt(
          fromStart ? 0 : (item.userData?.positionTicks ?? 0) / 10_000_000,
        );
        go({ name: 'player', id });
        void reportPlaying({
          itemId: id,
          mediaSourceId: opened.mediaSourceId,
          playSessionId: opened.playSessionId,
          positionSeconds: fromStart ? 0 : (item.userData?.positionTicks ?? 0) / 10_000_000,
          audioStreamIndex: audioIndex,
          playMethod: dec?.playMethod ?? 'DirectPlay',
          event: 'start',
        });
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Playback failed');
      }
    }
    go({ name: 'player', id });
  }

  useEffect(() => {
    if (route.name !== 'player' || !playUrl) return;
    const apply = () => {
      const v = videoRef.current;
      if (!v) return false;
      if (v.src !== playUrl) v.src = playUrl;
      if (startAt > 0 && Math.abs(v.currentTime - startAt) > 1) v.currentTime = startAt;
      void v.play().catch(() => undefined);
      return true;
    };
    if (apply()) return;
    const id = window.requestAnimationFrame(() => apply());
    return () => window.cancelAnimationFrame(id);
  }, [route, playUrl, startAt]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || route.name !== 'player') return;
    const onTime = () => {
      setCurrent(v.currentTime);
      setDuration(v.duration || 0);
    };
    const onPlay = () => setPaused(false);
    const onPause = () => setPaused(true);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    const iv = window.setInterval(() => {
      const p = playRef.current;
      if (!p || !getSession().account) return;
      void reportPlaying({
        itemId: p.itemId,
        mediaSourceId: p.mediaSourceId,
        playSessionId: p.playSessionId,
        positionSeconds: v.currentTime,
        audioStreamIndex: audioIndex,
        playMethod: decision?.playMethod ?? 'DirectPlay',
        event: v.paused ? 'pause' : 'progress',
      });
    }, PROGRESS_INTERVAL_MS);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      window.clearInterval(iv);
    };
  }, [route, audioIndex, decision]);

  const serverLabel = picked
    ? `${picked.name} · ${picked.address.replace(/^https?:\/\//, '')}`
    : 'Home server · 192.168.1.20';

  if (route.name === 'preview') {
    return <Preview board={route.board} table={table} />;
  }

  if (route.name === 'connect') {
    return (
      <>
        <ConnectScreen
          servers={route.empty ? [] : servers.length ? servers : fixtureServers}
          empty={route.empty}
          address={address}
          onAddress={setAddress}
          onConnect={() => void connectManual()}
          onPick={(s) => {
            setPicked(s);
            if (s.supported) go({ name: 'quick' });
          }}
          onSearchAgain={() => go({ name: 'connect' })}
        />
        {error ? (
          <div className="caption" style={{ position: 'absolute', bottom: 24, left: 'var(--safe-x)' }}>
            {error}
          </div>
        ) : null}
      </>
    );
  }

  if (route.name === 'quick') {
    return (
      <QuickConnectScreen
        serverLabel={serverLabel}
        code={qc.code || fixtureQcCode}
        remaining={qc.remaining}
        onPassword={() => go({ name: 'password' })}
        onChangeServer={() => go({ name: 'connect' })}
      />
    );
  }

  if (route.name === 'password') {
    return (
      <PasswordScreen
        serverLabel={serverLabel}
        users={users}
        selected={userId || (users[0]?.id ?? 'other')}
        onSelectUser={setUserId}
        username={username}
        onUsername={setUsername}
        password={password}
        onPassword={setPassword}
        onSignIn={() => void signInPassword()}
        onQuick={() => go({ name: 'quick' })}
        error={error}
      />
    );
  }

  if (route.name === 'home') {
    return (
      <HomeScreen
        home={home}
        hero={hero}
        onHero={setHero}
        onOpen={(it) => {
          setItem(it);
          go({ name: 'details', id: it.id });
        }}
        onSettings={() => go({ name: 'settings' })}
      />
    );
  }

  if (route.name === 'details') {
    return (
      <DetailsScreen
        item={item}
        audioIndex={audioIndex}
        onAudioIndex={setAudioIndex}
        pickerOpen={picker}
        onTogglePicker={() => setPicker((v) => !v)}
        onPlay={() => void startPlay(item.id, false)}
        onPlayFromStart={() => void startPlay(item.id, true)}
        onSettings={() => go({ name: 'settings' })}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }

  if (route.name === 'player') {
    return (
      <PlayerScreen
        item={item}
        videoRef={videoRef}
        overlay={overlay}
        onToggleOverlay={() => setOverlay((v) => !v)}
        current={current}
        duration={duration}
        paused={paused}
        onPause={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) void v.play();
          else v.pause();
        }}
        onSeek={(d) => {
          const v = videoRef.current;
          if (v) v.currentTime = Math.max(0, v.currentTime + d);
        }}
        decision={decision}
        audioLabel={
          item.mediaStreams?.find((s) => s.type === 'Audio' && (audioIndex === undefined || s.index === audioIndex))
            ?.displayTitle
        }
        onBack={() => {
          const p = playRef.current;
          if (p && getSession().account) {
            void reportPlaying({
              itemId: p.itemId,
              mediaSourceId: p.mediaSourceId,
              playSessionId: p.playSessionId,
              positionSeconds: videoRef.current?.currentTime ?? 0,
              playMethod: decision?.playMethod ?? 'DirectPlay',
              event: 'stop',
            });
          }
          go({ name: 'details', id: item.id });
        }}
      />
    );
  }

  if (route.name === 'output-states') {
    return <OutputStatesScreen onBack={() => go({ name: 'home' })} />;
  }

  if (route.name === 'wizard-detect') {
    return (
      <WizardDetect
        onContinue={() => {
          setWizardClip('atmos');
          go({ name: 'wizard-test' });
        }}
        onSkip={() => go({ name: 'home' })}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }

  if (route.name === 'wizard-test') {
    return (
      <WizardTest
        onPick={(label) => {
          if (wizardClip === 'dts') {
            setDtsChecked(true);
            const next =
              label === 'PCM'
                ? applyOverrides(cloneTable(table), { confirmed: { 'audio.pcm': 'direct' } })
                : label === 'Dolby Digital'
                  ? applyOverrides(cloneTable(table), { confirmed: { 'audio.ac3': 'direct' } })
                  : applyOverrides(cloneTable(table), { confirmed: { 'audio.eac3': 'direct' } });
            setTableState(next);
            setTable(next);
          }
          go({ name: 'wizard-summary' });
        }}
        onAgain={() => undefined}
        onBack={() => go({ name: wizardClip === 'dts' ? 'wizard-summary' : 'wizard-detect' })}
      />
    );
  }

  if (route.name === 'wizard-summary') {
    return (
      <WizardSummary
        onFinish={() => {
          const next = applyOverrides(cloneTable(LG_C2_WEBOS22), {
            confirmed: {
              'audio.ac3': 'sent_to_receiver',
              'audio.eac3': 'sent_to_receiver',
              'audio.truehd': 'sent_to_receiver',
            },
          });
          setTableState(next);
          setTable(next, {
            confirmed: {
              'audio.ac3': 'sent_to_receiver',
              'audio.eac3': 'sent_to_receiver',
              'audio.truehd': 'sent_to_receiver',
            },
          });
          go({ name: 'home' });
        }}
        onAgain={() => {
          setDtsChecked(false);
          setWizardClip('atmos');
          go({ name: 'wizard-detect' });
        }}
        onTestDts={() => {
          setWizardClip('dts');
          go({ name: 'wizard-test' });
        }}
        dtsChecked={dtsChecked}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }

  if (route.name === 'settings') {
    return (
      <SettingsPlayback
        table={table}
        onConvert={(row) => go({ name: 'convert', rowId: row.id })}
        onWizard={() => go({ name: 'wizard-detect' })}
      />
    );
  }

  if (route.name === 'convert') {
    const row = findRow(table, route.rowId) ?? table.rows[0]!;
    return (
      <ConvertPicker
        row={row}
        table={table}
        onPick={(id: 'auto' | ConvertTargetId) => {
          const next = {
            ...table,
            rows: table.rows.map((r) => (r.id === row.id ? { ...r, convertTo: id } : r)),
          };
          setTableState(next);
          setTable(next);
          go({ name: 'settings' });
        }}
        onClose={() => go({ name: 'settings' })}
      />
    );
  }

  return (
    <ConnectScreen
      servers={fixtureServers}
      address={address}
      onAddress={setAddress}
      onConnect={() => go({ name: 'connect' })}
      onPick={() => go({ name: 'quick' })}
    />
  );
}

function Preview({ board, table }: { board: string; table: CapabilityTable }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewTable = useMemo(() => {
    if (board === '03' || board === '05' || board === '05b') {
      return applyOverrides(cloneTable(table), {
        confirmed: {
          'audio.ac3': 'direct',
          'audio.eac3': 'direct',
          'audio.truehd': 'sent_to_receiver',
        },
      });
    }
    return table;
  }, [board, table]);
  const media = useMemo(
    () =>
      itemToMedia(longMeridian, 1) ?? {
        container: 'mkv',
        video: { codec: 'hevc', range: 'hdr10' as const },
        audio: { codec: 'truehd', channels: 8, isAtmos: true },
      },
    [],
  );
  const dec = decidePlayback(media, previewTable);

  if (board === '00a') {
    return (
      <ConnectScreen
        servers={fixtureServers}
        address="192.168.1.20:8096"
        onAddress={() => undefined}
        onConnect={() => undefined}
        onPick={() => undefined}
      />
    );
  }
  if (board === '00a2') {
    return (
      <ConnectScreen
        servers={[]}
        empty
        address=""
        onAddress={() => undefined}
        onConnect={() => undefined}
        onPick={() => undefined}
      />
    );
  }
  if (board === '00b') {
    return (
      <QuickConnectScreen
        serverLabel="Home server · 192.168.1.20"
        code={fixtureQcCode}
        remaining="4:32"
        onPassword={() => undefined}
        onChangeServer={() => undefined}
      />
    );
  }
  if (board === '00c') {
    return (
      <PasswordScreen
        serverLabel="Home server · 192.168.1.20"
        users={fixtureUsers}
        selected={fixtureUsers[0]!.id}
        onSelectUser={() => undefined}
        username=""
        onUsername={() => undefined}
        password="secret"
        onPassword={() => undefined}
        onSignIn={() => undefined}
        onQuick={() => undefined}
      />
    );
  }
  if (board === '01' || board === '01b') {
    return (
      <HomeScreen
        home={homeFixture}
        hero={board === '01b' ? glassValley : longMeridian}
        onHero={() => undefined}
        onOpen={() => undefined}
        onSettings={() => undefined}
        initialFocus={board === '01b' ? 'lib-0-0' : undefined}
        scrolled={board === '01b'}
      />
    );
  }
  if (board === '02') {
    return (
      <DetailsScreen
        item={longMeridian}
        audioIndex={1}
        onAudioIndex={() => undefined}
        pickerOpen={false}
        onTogglePicker={() => undefined}
        onPlay={() => undefined}
        onPlayFromStart={() => undefined}
        onSettings={() => undefined}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }
  if (board === '02b') {
    return (
      <DetailsScreen
        item={longMeridian}
        audioIndex={1}
        onAudioIndex={() => undefined}
        pickerOpen
        onTogglePicker={() => undefined}
        onPlay={() => undefined}
        onPlayFromStart={() => undefined}
        onSettings={() => undefined}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }
  if (board === '03') {
    return (
      <PlayerScreen
        item={longMeridian}
        videoRef={videoRef}
        overlay
        onToggleOverlay={() => undefined}
        current={1 * 3600 + 12 * 60 + 40}
        duration={2 * 3600 + 18 * 60}
        wallNow={new Date('2024-01-01T12:40:40')}
        paused={false}
        onPause={() => undefined}
        onSeek={() => undefined}
        decision={dec}
        onBack={() => undefined}
      />
    );
  }
  if (board === '03b') {
    return <OutputStatesScreen onBack={() => undefined} />;
  }
  if (board === '04a') {
    return (
      <WizardDetect
        onContinue={() => undefined}
        onSkip={() => undefined}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }
  if (board === '04b') {
    return (
      <WizardTest onPick={() => undefined} onAgain={() => undefined} onBack={() => undefined} />
    );
  }
  if (board === '04c') {
    return (
      <WizardSummary
        onFinish={() => undefined}
        onAgain={() => undefined}
        onTestDts={() => undefined}
        dtsChecked={false}
        convertLabel={confirmedConvertLabel(table)}
      />
    );
  }
  if (board === '05') {
    return (
      <SettingsPlayback
        table={previewTable}
        onConvert={() => undefined}
        onWizard={() => undefined}
      />
    );
  }
  if (board === '05b') {
    const row = findRow(previewTable, 'audio.dtshd') ?? previewTable.rows[0]!;
    return (
      <ConvertPicker
        row={row}
        table={previewTable}
        onPick={() => undefined}
        onClose={() => undefined}
      />
    );
  }
  return (
    <ConnectScreen
      servers={fixtureServers}
      address=""
      onAddress={() => undefined}
      onConnect={() => undefined}
      onPick={() => undefined}
    />
  );
}

