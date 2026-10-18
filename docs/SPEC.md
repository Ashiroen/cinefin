# Cinefin: technical product spec (webOS v1)

*18 Oct 2026 · milestone 1 · closed-source Jellyfin client for TVs*

Cinefin is a Jellyfin client whose first shipped platform is **webOS (LG TVs)**, with Android TV planned next. It is built to be **the** home theater client: it plays the original file, sends the original audio to the AVR untouched whenever the HDMI chain allows it, and keeps out of the way. It should feel fast and polished, with no clutter.

The owner's reference chain is an **LG C2 (webOS 22, Chromium 87)** over **HDMI eARC** to an **Onkyo TX-NR7100**, talking to the newest Jellyfin server. Every playback default is derived from a capability table for that chain, never copied from the official Jellyfin webOS profile.

Visual design is not invented here. M1 screens are implemented from the signed-off board PNGs (00a–05b). Tokens: background `#0B0B0D`, focus ring `#F59E0B` at **4px** with **~1.08×** scale, 1920×1080 with 5% overscan-safe margins (96px sides, 54px top/bottom). Board 05 is a tall 1920×2100 canvas; the amber line is the 1080 screen edge.

---

## 1. Goals, non-goals, success metrics

**Goals**
- Direct play by default. The server only converts when the TV (or the confirmed AVR path) cannot play the stream.
- Bit-perfect audio to the AVR wherever the HDMI chain allows it (AC-3, E-AC-3, E-AC-3 Atmos; TrueHD / TrueHD Atmos and DTS family only if the capability table plus the wizard say so).
- Correct picture: HDR10, HDR10+, HLG, Dolby Vision (profiles the TV can actually present), plus frame-rate matching where the platform allows it.
- A one-time AVR / receiver setup wizard. After that, playback needs no settings.
- Instant-feeling browsing. Every screen works with the Magic Remote (D-pad **and** pointer). Hover uses the same focus style as the D-pad.

**Non-goals for v1:** music, live TV/DVR, downloads/offline playback, a phone or tablet UI, Chromecast sender, SyncPlay, books/comics, admin features, LG Content Store certification, and Android TV (scaffold only — see §9).

**Success metrics** (measured on the C2 on a wired LAN; browser verification is a weaker substitute)

| Metric | Target | How it's measured |
|---|---|---|
| Cold start to an interactive Home screen (cached) | ≤ 2.0 s on the C2; ≤ 1.5 s in desktop Chromium at 1920×1080 | Time from `webOSLaunch` / first JS to first focused, interactive card |
| Time to first frame, direct play | ≤ 1.5 s from pressing Play (≤ 3 s if the TV switches HDR / refresh rate) | Timestamp from Play to `playing` + first decoded frame |
| Browsing smoothness | 60 fps; no visible hitching while moving focus across a row | Manual on-device; Chromium Performance panel in browser |
| Unnecessary transcodes | **0** across the reference test library (§3.7) | `PlayMethod` in session reports vs the decision-engine fixture |
| Crash-free sessions | ≥ 99.5 % | In-app error log, opt-in export later |

Browser verification cannot prove codec, eARC, or refresh-rate behaviour. Those are owner test steps in the PR.

---

## 2. Platform and stack

### 2.1 Decision: React + Vite, not Enact Sandstone

The brief allows Enact or a justified alternative. **Cinefin uses React 18 + TypeScript + Vite**, not Enact.

| Option | Why not / why |
|---|---|
| **Enact + Sandstone** | Official, Spotlight is good, Luna helpers exist. Sandstone's visual language (Moonstone leftovers, its own type, its own focus chrome) fights every board. We would restyle every control to match `#0B0B0D` / `#F59E0B` / 1.08× scale and still carry Enact's weight on Chromium 87. |
| **Enact core (Spotlight only)** | Gets pointer+key focus, still pulls Enact's runtime and does not help pixel-match the boards. |
| **React + Vite + a 80-line focus manager (chosen)** | Enact is React underneath. A tiny manager where `mouseenter` and arrow-key moves set the same focused id gives **identical hover and D-pad chrome**, which the boards require. Vite targets `chrome87`. The bundle stays small enough for the cold-start metric. The same screens run in desktop Chrome for verification. |

webOS-specific work stays behind interfaces: Luna discovery, `webOSTV.js`, `<video>` / media pipeline, `appinfo.json`. The core package has **zero** webOS imports.

### 2.2 Runtime facts (verified)

| Fact | Source | Confidence |
|---|---|---|
| webOS 22 web engine is **Chromium 87** (`Chrome/87.0.4280.88`) | [LG web engine table](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) | High |
| C2 is a 2022 OLED, webOS 22 out of the box (OTA may later move it) | LG / owner | High |
| Official webOS 22 media table lists MKV/MP4/TS codecs including HEVC, AV1 (UHD), AC-3, E-AC-3, AAC, PCM; DTS is listed under MKV audio; FLAC is **2 channels**; TrueHD is **not listed** | [LG audio/video 22](https://webostv.developer.lge.com/develop/specifications/video-audio-220) | High for the page; see §3.1 for the DTS contradiction |
| Dolby Vision in the Media Player is MPEG-2 TS and ISOBMFF (MP4), profiles **5, 6, 8, 9, 10**. Not MKV. Not profile 7 as DV. | [LG forum, staff](https://forum.webostv.developer.lge.com/t/dolby-vision-video-playback-via-media-player-app/1358) | High |
| Native HLS on recent webOS forces **stereo** over eARC (originally reported for DV, later reproduced for any HLS). `hls.js` does not. | [LG forum thread](https://forum.webostv.developer.lge.com/t/stereo-only-for-dolby-vision-video-with-multi-channel-audio-in-hls-streams/23069) | High for the bug; **unverified on this C2** |
| 2021+ LG firmware shipped **without a DTS license**. C2 does not decode or passthrough DTS / DTS-HD / DTS:X from apps. The generic format page still listing DTS is stale relative to 2022 OLEDs. | AVS / Plex / RootMyTV; owner brief | High for "no DTS on C2"; the table still says otherwise, so we treat it as a **device quirk that overrides the generic spec** |
| eARC can carry TrueHD / Atmos from an **HDMI source**. Whether a webOS **HTML5 app** can bitstream TrueHD into that eARC link is **not confirmed**. Plex/Emby communities say TV apps cannot; one LG staff reply said C/G OLEDs support TrueHD & DTS eARC output. | Mixed | **Unverified on-device** — wizard decides |
| Multichannel FLAC/PCM from the non-proprietary decoder path may collapse to front channels (RootMyTV / GStreamer `decproxy`). | Community | **Unverified** — do not assume lossless PCM is a working convert-to target until the wizard confirms it |

Build target: `chrome87`. No `structuredClone`, no `Array.prototype.at` without transpile. Vite/esbuild handles that.

### 2.3 Repo layout

```
packages/core          platform-agnostic: Jellyfin API wrapper, capability table,
                       convert-to ranking, DeviceProfile builder, decision engine
apps/webos             React UI, focus manager, <video> player, Luna discovery
apps/webos/service     JS service: UDP 7359 LAN discovery
brand/                 Artist kit (icons, splash, mark). webOS copies icon.png,
                       largeIcon.png, splash.png into the IPK via appinfo.json
docs/SPEC.md           this file
docs/INSTALL-webos.md  C2 Developer Mode sideload
```

App id: `com.cinefin.app`. Title: **Cinefin**. Version: `0.1.0` for M1.

### 2.4 Licence

Cinefin is **closed source**. Do not copy code from `jellyfin-androidtv` or `jellyfin-webos` (GPL-2.0) or `jellyfin-web` (GPL-2.0). Reading them for behaviour is fine.

`@jellyfin/sdk` **1.0.x** is used unmodified (Mozilla Public License 2.0 — not the Kotlin SDK's LGPL). The SDK's source is public; we do not vendor a fork. FFmpeg is used only on the **server** (and in our QA scripts to generate fixtures), not shipped in the TV app.

Trademark: "Cinefin, a client for Jellyfin". No Jellyfin mark in the brand.

---

## 3. Server connection

**SDK:** official TypeScript SDK [`@jellyfin/sdk`](https://typescript-sdk.jellyfin.org/) **1.0.x**.

| SDK | Jellyfin |
|---|---|
| 1.0.x | **12.x** (this is what we ship) |
| 0.13.0 / 0.12.0 | 10.11.x |
| 0.11.0 | 10.10.x |

**Minimum server version: 12.0.** The `[min version]` chips on the boards render `12.0`. On connect we `GET /System/Info/Public` and compare. Below 12.0 the server card shows **Needs Jellyfin 12.0+** and Connect refuses to continue. We do not try to limp along on a 10.11 API.

12.0 removed `GET /QuickConnect/Initiate` — **POST only**.

- **Discovery:** broadcast `Who is JellyfinServer?` on UDP **7359**. The web app cannot open raw UDP sockets, so discovery lives in a **webOS JS service** (`com.cinefin.app.service`) and is reached over Luna. In desktop Chrome the service is absent: the **manual address path (board 00a2) must still work**. `http://` is assumed; port **8096** is tried when the user omits a port. Addresses are validated through `/System/Info/Public`.
- **Sign-in, Quick Connect first:** `POST /QuickConnect/Initiate` → poll `/QuickConnect/Connect?secret=` → `POST /Users/AuthenticateWithQuickConnect`. The TV shows the 6-character code; the user approves it on their phone. **Fallback:** `/Users/Public` picker, then `/Users/AuthenticateByName`. Quick Connect is the default because a password on a TV remote is the worst part of every TV client.
- **Auth header:** only `Authorization: MediaBrowser Client="Cinefin", Device=…, DeviceId=…, Version=…, Token=…`, which the SDK builds. 12.0 disables legacy auth by default, so API calls never use `api_key` query strings or `X-Emby-*` headers.
- **Exception for `<img>` and `<video>`:** HTML elements cannot set headers. Media and image URLs therefore append `api_key={accessToken}` (Jellyfin still accepts the session token this way on stream/image routes). API calls stay header-only. If a future 12.x build rejects the query token, a service worker will inject the Authorization header on media requests. **This is a webOS/HTML constraint, not a protocol preference.**
- **DeviceId:** stable and **unique per (install, server, user)**. Jellyfin ends other sessions that share a DeviceId. A single id across users would sign them out.
- **Token storage:** `localStorage` (webOS has no Android Keystore equivalent). Tokens are never logged. A 401 marks that account signed out and returns to its sign-in screen; other accounts are left alone.
- **Multiple servers and users:** `servers` + `accounts(serverId, userId, token, deviceId)` in localStorage. Last-used account opens directly. Each account has its own cache namespace. A Netflix-style avatar row is the password screen; a profile switcher from Home is M2 if needed.

---

## 4. Playback engine

The player is the TV's native pipeline via the **`<video>` element** (plus Luna media only if we later prove we need it). There is no ExoPlayer and no in-app FFmpeg. Convert and remux happen on the **server**.

**Never use native HLS.** webOS's HLS implementation has been shown to force stereo over eARC. Progressive HTTP of the original file, or a lossless remux to a container the TV plays (`static=true` or a non-HLS `TranscodingUrl`), is required. If Jellyfin only offers HLS for a path, we still ask for `Protocol=http` progressive in the DeviceProfile and treat HLS as a last-resort failure, not a default.

### 4.1 Capability table (data, not a hard-coded profile)

A row is:

| Field | Meaning |
|---|---|
| `id` | Stable key (`audio.dts`, `video.dovi.p7`, `container.mkv+dovi`, …) |
| `kind` | `audio` / `video` / `container` |
| `label` | What Settings shows |
| `status` | `direct` · `sent_to_receiver` · `repackaged` · `converted` · `untested` |
| `source` | `confirmed_by_test` · `lg_spec` · `detected_by_tv` |
| `reason` | Plain language, required for every non-direct row |
| `convertTo` | `auto` or a confirmed target id |

**What the user confirmed in the wizard beats what the device or the LG page reports.**

Seed for **LG C2 / webOS 22 / eARC → Onkyo TX-NR7100** (M1 defaults; wizard mutates a copy):

| Row | Default status | Source | Reason / notes |
|---|---|---|---|
| Dolby Digital (AC-3) | Direct / sent to receiver | LG spec | Listed for MKV, MP4, TS. eARC carries it. |
| Dolby Digital Plus / Atmos (E-AC-3 / JOC) | Direct / sent to receiver | LG spec | Listed. DD+ Atmos is the reliable object format from a TV app. |
| TrueHD / TrueHD Atmos | Untested | Community + missing from LG table | eARC *can* carry TrueHD from an HDMI source. The webOS 22 format table does not list TrueHD. Third-party webOS apps usually transcode it. **Do not advertise DirectPlay until the wizard confirms.** |
| DTS / DTS-HD MA / DTS:X | Converted | C2 2022 firmware (overrides LG table) | 2022 LGs have no DTS license: no decode, no passthrough. Official Jellyfin webOS forces DTS→AC-3 for every LG. **We do not.** Convert-to is whatever the table says is the best *confirmed* target (see §4.3). |
| AAC | Direct | LG spec | |
| PCM / LPCM | Direct (stereo); multichannel untested | LG spec | PCM is listed for MKV/TS. FLAC is listed as **2 channels** only, so FLAC is not a multichannel convert-to candidate. Multichannel PCM may not hit the proprietary HDMI sink — wizard must confirm. |
| H.264 / HEVC / VP9 / AV1 | Direct | LG spec (AV1: UHD models; C2 is UHD) | 4K HEVC Main/Main10 L5.1. |
| HDR10 / HLG | Direct | Display | TV switches on decode. |
| HDR10+ | Untested | — | Play as HDR10 if metadata is dropped. |
| Dolby Vision P5 / P8 | Direct in **MP4 or TS**; **repackaged** from MKV | LG staff + field reports | MKV DV is not supported on webOS 22. Remux container only. Prefer **TS progressive** (survives the webOS 24 MP4-P8 regression if the C2 is later updated). |
| Dolby Vision P7 | Plays as HDR10 (not DV) | LG (P7 not in supported profile list) + Media3/field reports | HEVC HDR10 base layer, EL ignored. Not a transcode if HEVC HDR10 plays. |
| Dolby Vision P10 | Direct only if AV1 DV is detected | LG lists P10 | Rare. |
| MKV (no DV) | Direct | LG spec | |
| MP4 / MOV | Direct | LG spec | |
| TS / M2TS | Direct, including DV | LG spec + field reports | |

The official Jellyfin webOS client builds a one-size-fits-all LG profile that transcodes DTS to AC-3. **Cinefin never copies that profile.** `DeviceProfile` is *generated from this table* every time.

### 4.2 DeviceProfile (sent with `POST /Items/{id}/PlaybackInfo`)

Generated in `packages/core`, no webOS imports.

- **DirectPlayProfiles:** only containers + video + audio codecs whose table status is `direct` or `sent_to_receiver` (or wizard-confirmed). Typical C2 seed: containers `mp4,m4v,mov,ts,m2ts,mkv` with `h264,hevc,vp9,av1` and `ac3,eac3,aac,mp3,pcm`. MKV + DV is excluded via a CodecProfile / ContainerProfile condition on `VideoRangeType=DOVI` for `mkv`, so the server remuxes instead of direct-playing a purple/green or SDR fallback.
- **CodecProfiles:** `VideoProfile`, `VideoLevel`, `VideoBitDepth`, size, framerate, **`VideoRangeType`** (SDR, HDR10, HDR10Plus, HLG, DOVI, DOVIWithHDR10, DOVIWithEL). P7/`DOVIWithEL` is not advertised as DV. Audio channel limits follow the table.
- **TranscodingProfiles:** **progressive HTTP**, not HLS. Container `ts` (HEVC/H.264) or `mp4` (AV1). Video copy when the table says the video is fine. Audio copy when the table says the audio is fine; otherwise the **best confirmed convert-to** (§4.3). `EstimateContentLength=true` so `<video>` can seek.
- **SubtitleProfiles:** SRT/SubRip/VTT/WebVTT as **External** (and Embed). ASS/SSA, PGS (`pgssub`), DVB, VobSub as **Encode** (burn-in). webOS documents WebVTT; it does not document PGS/ASS. Burn-in is the honest default until a future M-release proves native overlay.
- **Flags:** `EnableDirectPlay=true`, `EnableDirectStream=true`, `EnableTranscoding=true`, `AllowVideoStreamCopy=true`, `AllowAudioStreamCopy=true`. `MaxStreamingBitrate` default unlimited/LAN.

### 4.3 Convert-to picker (never hard-coded AC-3)

Settings › Playback & formats shows a Convert-to control per converted row. **Only confirmed targets are selectable.** Default is **Auto = best confirmed**.

Ranking (first match wins):

1. Lossless multichannel PCM / LPCM, **if** status is `confirmed_by_test`
2. E-AC-3 (DD+), if `confirmed_by_test` **or** (no test yet **and** `lg_spec`)
3. AC-3, same rule

Until the wizard has confirmed PCM, Auto on a C2 is **E-AC-3**, because that is in the LG table and is the format eARC TV apps actually deliver. We do **not** default to AC-3 the way jellyfin-webos does. FLAC is not offered for multichannel (LG: 2 channels).

Board 05b: untested candidates appear with a **Run test** action, not as a silent default.

### 4.4 Decision tree (per item, per chosen audio and subtitle track)

Implemented in `packages/core` and covered by table-driven tests.

1. **Direct play** — container, video, audio, subtitles all play on the device → `/Videos/{id}/stream?static=true&mediaSourceId=…&playSessionId=…`. `<video>` reads the file.
2. **Repackage (lossless remux)** — codecs are fine, container (or DV-in-MKV) is not → server remux, video and audio **copied**, progressive TS or MP4. Output-state line: **Repackaged** + why ("Dolby Vision in MKV isn't supported on webOS 22, so the server remuxes to TS without touching the picture or the sound").
3. **Convert** — only when a codec cannot play: DTS family on the C2; TrueHD if still untested/failed; video the decoder cannot handle; subtitles that require burn-in. Video is still copied when only audio or subs are the problem.
4. **Never** convert because of bitrate on the LAN, because audio is "unknown", or because of subtitles we can render.
5. **Never HLS** as a chosen protocol.

Each decision is logged with its reason and shown on the player overlay (board 03 / 03b): Direct / Repackaged / Converted, plus the reason.

Test fixtures the engine must hit (see `packages/core/test/decision.test.ts`):

- DTS / DTS-HD MA / DTS:X on C2 → converted, target = Auto (E-AC-3 until PCM is confirmed)
- TrueHD Atmos, untested → not DirectPlay; converted to Auto
- TrueHD Atmos, wizard-confirmed → DirectPlay / sent to receiver
- DV P5 / P8 in MKV → remux (repackaged), no video transcode
- DV P5 / P8 in MP4 or TS → direct
- DV P7 in MKV or MP4 → HDR10 base, not DV; not a video transcode
- HEVC Main10, AV1 → direct
- PGS / ASS / SSA → burn-in (converted), even if A/V would otherwise direct play
- SRT / VTT → no burn-in

### 4.5 Audio path on webOS (no on-device FFmpeg)

Android's plan (passthrough → MediaCodec → FFmpeg PCM) does not apply. On webOS:

- If the table says the encoding is Direct / sent to receiver, we put it in DirectPlayProfiles and let the TV's sink bitstream over eARC.
- If not, the **server** converts to the Auto / user-picked target.
- "Decoded by TV" (board 03b) is reserved for the case where the TV decodes a supported bitstream to PCM itself (fallback when the receiver test said it did not get Atmos / the original format). We do not ship an in-app decoder in M1.

### 4.6 Video, HDR, subtitles, frame rate

- **HDR10 / HLG:** native when the display is in the right mode. The TV usually switches on decode.
- **HDR10+:** pass through if the pipeline keeps the metadata; otherwise HDR10.
- **Dolby Vision P8 / P5:** Direct in MP4/TS. Remux from MKV. **P7:** HDR10 only. **P5 with no DV decoder** would be a server tone-map — the C2 has DV, so this is a table row for other webOS sets, not the C2 default.
- **Frame rate matching:** webOS has no Android `setFrameRate` / `preferredDisplayModeId`. M1 does not claim AFR. If a Luna API proves reliable on the C2 it lands in M2/M3 and is recorded as `detected_by_tv`.
- **Subtitles:** VTT/SRT overlay via `<track>` when the server gives an external file. PGS/ASS/DVB → burn-in. Forced subs follow the audio language.

### 4.7 Progress reporting and resume

- `POST /Sessions/Playing` on start (`PlaySessionId`, `MediaSourceId`, `PlayMethod`, audio/subtitle indexes) → `/Sessions/Playing/Progress` every 10 s and on pause, seek, or track change → `/Sessions/Playing/Stopped` with `PositionTicks` (1 s = 10,000,000 ticks). `DELETE /Videos/ActiveEncodings` on stop when converting.
- Offline queue is localStorage in M1 (Room on Android later).
- **Resume:** `UserData.PlaybackPositionTicks`. Details: primary button is **Resume** when in progress; **Play from start** sits beside it (board 02). Played state uses server thresholds.

---

## 5. AVR / receiver setup wizard

Boards 04a–04c. Three steps (the Android draft had four; the signed boards collapsed picture/AFR out of M1, which matches "we cannot claim AFR on webOS yet"):

1. **Detect** — HDMI eARC, TV-reported audio, a "what we found" list, a Cinefin → eARC → receiver diagram. `[confirmed format]` chips are filled from the table after tests. Continue / Skip for now.
2. **What does your receiver display now?** — play a Dolby TrueHD Atmos (or DD+ Atmos) test clip. Buttons for the formats on the board. Play again / Back. **M1 uses stubbed test media** (a short generated clip + a simulated "receiver showed X" UI). Real encoded test tones land in M2.
3. **Summary** — per-format result and why. Untested DTS row offers **Test DTS conversion**. Finish writes the overrides into the capability table (source becomes `confirmed_by_test`). Run again resets.

Stored as `ReceiverProfile` keyed by output route (eARC + product name when Luna gives one, else `lg-c2-default`). Several profiles can exist (TV speakers vs AVR).

---

## 6. UI, navigation and focus

**Boards are the source of truth.** Implementation is from the exported PNGs and the tokens below. Nothing visual is invented when a board exists.

**Tokens**

| Token | Value |
|---|---|
| Background | `#0B0B0D` |
| Surface / pill | `#17171B` |
| Text | `#F5F5F6` |
| Muted | `#8B8B90` |
| Amber | `#F59E0B` |
| Cream (wordmark / notes) | `#F5EBDD` |
| Focus | 4px solid `#F59E0B`, scale `1.08`, radius matches the control |
| Safe inset | 96×54 |

**Type:** self-hosted Geist Sans (geometric, close to the boards). Wordmark and mark come from the Artist kit, never recreated.

**Information architecture:** Connect → Quick Connect / password → Home (hero + Continue watching + library rows; slim top bar: mark, Search, Settings) → Details → Player. Plus Settings and the wizard. No sidebar on Home.

**Focus rules**
- Focus always lands somewhere visible. Initial focus is defined per board (00a: first discovered server; 00a2: address field; Home: first Continue watching card; Details: Resume / Play).
- Magic Remote **pointer hover and D-pad focus are the same style** (amber ring + scale). One focused element per screen.
- Rows remember their index. Left at the start of a row does not wrap.
- **Back:** player overlay visible → hide overlay. Player → Details (stop reported). Details → previous screen. Home → `webOS.platformBack()` (exit). `disableBackHistoryAPI: true` in `appinfo.json` so the remote Back key is ours.
- **Player keys:** OK = overlay / play-pause. Left/Right = −10 / +30 s. Up = audio/subs. Down = output-state / info. Pointer click on a control focuses then activates.
- No dead ends: every error has a focused action.

**Settings › Playback & formats** (board 05, tall): statuses Direct / Sent to receiver / Repackaged / Converted / Untested; a source caption on each row; a plain-language reason on every non-direct row; Convert-to only offers confirmed targets.

---

## 7. Performance

- UI renders from a local cache (localStorage / memory in M1) and refreshes in the background.
- Images requested at the rendered size (`fillWidth`/`fillHeight`, `quality=85`, `format=Jpg` — WebP is listed as supported on webOS 22; we still prefer JPEG for posters until we measure). `tag` is part of the URL so caches stay valid.
- Prefetch: next 6 posters in the focused row, first 6 of the rows above and below. Backdrop of the focused item after 150 ms dwell.
- `PlaybackInfo` pre-warms when Details opens.
- Startup: first frame is the cached Home or the connect screen. Capability table is loaded from disk (seed + wizard overrides); Luna probes run after first paint.

---

## 8. Milestones

| Milestone | Scope | Acceptance |
|---|---|---|
| **M1 (this spec)** | Spec, core engine + tests, sign-in (manual path required; discovery if the JS service packages), Home, Details + audio picker, `<video>` direct play / remux / convert, overlay + output-state line, progress reports, capability table + Settings + Convert-to, wizard UI with stubbed media, IPK + INSTALL-webos | Typecheck, lint, unit tests, production build, packable IPK. Browser 1920×1080 against a real Jellyfin: sign-in, browse, Details, play. Board-vs-screenshot notes. Owner on-device steps listed, not pretended. |
| **M2** | Real test-tone files, discovery polish, AFR research, subtitle overlay proof, TrueHD/PCM confirmation on the C2, cache + Search | Wizard answers change decisions (unit test + one on-device film). |
| **M3** | Android TV client behind the same core | One codebase, two players. |
| **M4** | Polish, crash log, in-app update check, sideload README | Metrics in `docs/benchmarks.md`. |

---

## 9. How Android TV fits later

`packages/core` is the product. It contains:

- Jellyfin API wrapper (SDK, auth header, Quick Connect, DeviceId, version check)
- Capability table types, merge rules (wizard > detected > spec)
- Convert-to ranking
- DeviceProfile builder
- Decision engine + output-state copy

It **must not** import anything from `apps/webos`, Enact, Luna, or DOM-only APIs except types.

Android TV (M3) adds `apps/android` (Kotlin or a later React Native / Compose shell — decided then) that implements:

```ts
export interface CapabilityProbe {
  probe(): Promise<DetectedCapabilities>;
}

export interface MediaPlayer {
  play(request: PlayRequest): Promise<void>;
  // pause, seek, destroy, events…
}
```

webOS implements those with `<video>` + a static/Luna probe. Android implements them with ExoPlayer + `MediaCodecList` / `AudioCapabilities` (the previous Android draft, §3 of the October 18 Android spec, still applies there: FFmpeg audio fallback, AFR, Keystore). The C2 table is one **profile** in the table, not the engine.

---

## 10. Packaging and distribution

- Vite production build → static files + `appinfo.json` + brand icons/splash + JS service → `ares-package` (`@webos-tools/cli`) → `com.cinefin.app_0.1.0_all.ipk`.
- CI runs typecheck, lint, unit tests, production build, and `ares-package`, and uploads the IPK.
- Install path is **Developer Mode sideload**, documented in `docs/INSTALL-webos.md`. Session expiry uninstalls sideloaded apps — called out there, including how to extend (on-TV EXTEND; CLI `ares-launch com.palmdts.devmode -p extend=true -d DEVICE`). After expiry you cannot extend; you sign in again.
- No Content Store listing in M1.

---

## 11. Technical calls (brief was silent)

1. **React+Vite, not Enact** — §2.1.
2. **SDK 1.0.x / server 12.0+** — matches "newest Jellyfin" and the SDK compatibility table. 10.11 is a hard stop with a dedicated UI state, not a best-effort mode.
3. **Never native HLS** — the stereo bug is not DV-only; it is the native HLS path. Progressive remux instead.
4. **DV remux container = TS first, MP4 for AV1** — TS is the DV-safe progressive container on C2; MP4 P8 later broke on webOS 24 for C/G2–3.
5. **DTS override** — C2 quirk beats the generic LG page that still lists DTS.
6. **TrueHD default = untested, not DirectPlay** — eARC capability ≠ app bitstream. Wizard can promote it.
7. **Auto convert-to = E-AC-3 until PCM is confirmed** — lossless is preferred *if confirmed*; we will not guess that the C2's `<video>` element emits multichannel PCM over eARC.
8. **No in-app FFmpeg on webOS** — convert on the server.
9. **Query token on media URLs only** — HTML constraint.
10. **Tokens in localStorage** — no Keystore on webOS.
11. **Wizard is 3 steps as boarded**, AFR out of M1.
12. **Discovery is best-effort**; manual address is the supported path.
13. **Closed source, unmodified MPL-2.0 TypeScript SDK**, no GPL copies.
14. **Preview routes** (`#/preview/00a` …) render board fixtures so we can pixel-check without the owner's library. Live routes talk to a real server.

---

## 12. Risks

1. **Device reports and LG's published table are wrong** (DTS listed, TrueHD omitted, PCM multichannel maybe broken). *Mitigation:* wizard overrides, quirks in the table, honest Untested.
2. **`<video>` + `api_key` rejected by a future server.** *Mitigation:* service-worker header injection.
3. **Chromium 87 CSS/JS gaps.** *Mitigation:* `build.target = 'chrome87'`, no modern-only APIs.
4. **Developer Mode session expires and wipes the app.** *Mitigation:* INSTALL doc; not a Store app in M1.
5. **Jellyfin 12 API churn.** *Mitigation:* version gate at connect; SDK pinned.
6. **HLS-only transcode paths.** *Mitigation:* DeviceProfile asks for progressive HTTP; if the server ignores us, the overlay says so instead of silently going stereo.

---

## 13. What this VM cannot prove

These are **owner test steps** on the C2 + TX-NR7100, not claims:

1. DTS is silent or garbage if we accidentally DirectPlay it (should never happen).
2. DTS → E-AC-3 (Auto) shows DD+ on the Onkyo.
3. DTS → PCM, if confirmed, is actually 5.1/7.1 on the Onkyo, not 2.0.
4. TrueHD / TrueHD Atmos: DirectPlay vs convert — what does the Onkyo display?
5. DD+ Atmos over eARC is Atmos on the Onkyo, not DD+.
6. DV P5/P8 in MKV remuxes to TS and the C2 shows the DV toast; audio stays multichannel (not the HLS stereo bug).
7. DV P7 plays as HDR10, not audio-only / green.
8. HEVC HDR10 23.976 and 24: any drop, judder, or mode switch.
9. Magic Remote hover chrome matches D-pad on the real compositor (pointer events differ from Chrome).
10. JS service discovery finds the LAN server.
11. Developer Mode install + 48 h later the app is still there (or the session expired as documented).
