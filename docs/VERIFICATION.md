# M1 verification

Browser walk: 1920×1080 Chromium against Jellyfin 12.2.0 in Docker on this VM. Preview routes (`#/preview/00a`–`05b`) use board fixtures. Live routes used a real login (`Vojtech` / password) after `/Users/Public` returned `[]`.

Plex is verified with `scripts/mock-plex.mjs` (PIN + Home). There is no real PMS on this VM — see `docs/MEDIA-SERVERS.md`.

Typecheck, lint, 47 unit tests, production build, and `ares-package` → `dist/ipk/com.cinefin.app_0.1.0_all.ipk` all passed.

## Live walk (this VM)

| Step | Result |
|---|---|
| Manual address `127.0.0.1:8096` | Server 12.2.0 accepted; Quick Connect code issued |
| Password fallback | Other user + username (public user list empty). Signed in to Home |
| Home | Movies row: *The Harbour Lights*, *The Long Meridian*, *Glass Valley* |
| Details | Play / Play from start / real audio title (`AAC - Mono - Default`) |
| Playback | Progressive ` /Videos/{id}/stream?static=true ` — `readyState` 4, playing, duration 6s (tiny ffmpeg test file) |

A 404 in the console is an image request (no backdrop on the test items), not the video stream.

## Board vs app (what we could not close)

Preview screenshots live next to this file in the PR artifacts. Word-spacing in OCR dumps is a reader artefact — the UI has normal spaces.

| Board | Match | Remaining difference |
|---|---|---|
| 00a server picker | Structure, focus ring, version chip | Server icons are simple glyphs, not the board's rounded “home / NAS” marks |
| 00a2 empty | Address field focused, Search again | Same |
| 00b Quick Connect | 6 tiles, amber password button | Tile radius is 22px vs the board's slightly rounder tiles |
| 00c password | Avatars + Other user + TV keyboard | Preview uses fixture users (Vojtěch / Anna / Kids / Guest). Live servers with an empty public list show only Other user |
| 01 / 01b Home | Hero, Continue watching, Next up, Movies row, 2h 18m | Posters are flat tints (no licensed artwork). Continue-watching “min left” follows fixture maths (65 min), not the board's 24 min |
| 02 Details | Title, badges, resume, audio, cast | Cast is always the boarded names (Jellyfin people are M2) |
| 02b audio picker | Sheet + DTS convert note | `[confirmed format]` chip stays a placeholder until the wizard writes a real target |
| 03 player overlay | Bottom chrome, amber knob, output-state line | Board shows wall-clock “ends 13:46”; we show remaining + duration clock. Output line is `Direct` / `Converted` + reason, not the richer “TrueHD Atmos → AVR” lockup |
| 03b output states | Five state cards | Copy is boarded; no live player chrome behind it |
| 04a–c wizard | Detect / Atmos test / Summary | Test media is stubbed. Real tones are M2 |
| 05 Playback & formats | Nav + table + Convert to, scrollable below 1080 | Board is 1920×2100 (amber line = screen edge). Seed table is pre-wizard; counts therefore differ from the boarded “after test” example. Status “Sent to receiver” is the spec name; the board often writes “Direct” for the same eARC-confirmed Dolby rows |
| 05b Convert-to | Auto + PCM / DD+ / DD | Unconfirmed targets stay listed but are not selectable |

Focus chrome is `#F59E0B` 4px, ~1.08× scale, on `#0B0B0D`. Magic Remote hover uses the same class as D-pad focus.

## What this VM cannot prove (owner, C2 + TX-NR7100)

Same list as SPEC §13 — do these on the TV before merging:

1. DTS DirectPlay must never happen. A DTS title should show **Converted** and the Onkyo should show DD+ (Auto) or PCM if you confirmed it.
2. Confirm Auto → E-AC-3 is 5.1 on the Onkyo, not stereo.
3. If you pick PCM, confirm 5.1/7.1, not 2.0.
4. TrueHD / TrueHD Atmos: run the wizard. What does the Onkyo display on Direct vs Converted?
5. DD+ Atmos over eARC is Atmos on the Onkyo, not DD+.
6. DV P5/P8 in MKV remuxes to progressive TS (not HLS). DV toast on the C2; audio stays multichannel.
7. DV P7 plays as HDR10, not a green/black frame.
8. HEVC HDR10 23.976 / 24: judder, drop, or mode switch.
9. Magic Remote hover chrome matches D-pad on the real compositor.
10. UDP 7359 discovery from the JS service finds the LAN server (manual address still works if it does not).
11. Developer Mode install (`docs/INSTALL-webos.md`). Extend the session *before* it hits zero — expiry uninstalls the app.

Do **not** merge this PR until those on-device steps have a go.
