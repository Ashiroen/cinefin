# Cinefin on Google TV / Android TV

Cinefin for Android TV lives in `apps/androidtv`. It is a Kotlin + Jetpack Compose for TV client that talks to Jellyfin 12 through the official Kotlin SDK (`org.jellyfin.sdk:jellyfin-core-jvm` 1.9.2, unmodified — the Android AAR of the same version requires compileSdk 37, which this tree stays off so CI can build on SDK 35). A `MediaServer` interface sits in front of `JellyfinServer` so a Plex backend can be added later without rewriting the UI.

The main target is an **Nvidia Shield TV Pro** feeding an **Onkyo TX-NR7100** over eARC. Playback defaults to **direct play** with HDMI **audio passthrough**. The server is only asked to convert when you turn a codec off in Easy AVR setup, or when image subtitles must be burned in.

App id: `com.cinefin.tv`. Version: `0.1.0`.

## Build

From the repo root (JDK 17+, Android SDK 35):

```bash
# optional: echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew :androidtv:testDebugUnitTest
./gradlew :androidtv:lintDebug
./gradlew :androidtv:assembleDebug
```

npm wrappers:

```bash
npm run android:test
npm run android:lint
npm run android:assemble
npm run package:androidtv   # copies the debug APK to dist/apk/
```

The debug APK is `apps/androidtv/build/outputs/apk/debug/androidtv-debug.apk` (application id `com.cinefin.tv.debug`).

### Signed release APK

Create `keystore.properties` at the repo root (gitignored):

```
storeFile=release.keystore
storePassword=…
keyAlias=cinefin
keyPassword=…
```

Then `./gradlew :androidtv:assembleRelease`. CI does the same when `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` are set; otherwise it publishes the debug APK.

Brand assets are copied from `brand/android-tv/res` (320×180 `tv_banner`, adaptive `ic_launcher` with monochrome). Play store 512 / 1280×720 assets stay in `brand/store/` and are not packaged into the APK.

## Sideload onto a Shield TV Pro

Developer options on the Shield: Settings → Device Preferences → About → click Build seven times, then enable **USB debugging** (and network debugging if you sideload over Wi-Fi).

### adb

```bash
adb connect SHIELD_IP:5555
adb install -r apps/androidtv/build/outputs/apk/debug/androidtv-debug.apk
adb shell am start -n com.cinefin.tv.debug/com.cinefin.tv.MainActivity
```

Cinefin appears in the Leanback / Google TV launcher with the amber banner. There is no phone/tablet launcher icon (`LEANBACK_LAUNCHER` only; touchscreen is not required).

### Downloader (no computer)

1. On the Shield, install **Downloader** from the Play Store.
2. Open the latest GitHub Release and copy the `.apk` URL.
3. In Downloader, paste the URL, download, then install. Allow unknown sources for Downloader when the Shield asks.

Each push to `main` replaces the Android TV APK on the rolling **Latest** release, next to the webOS IPK.

## First run

1. Connect: LAN discovery if the Shield can see UDP 7359, otherwise type `192.168.x.x` or `192.168.x.x:8096`. `http://` and port **8096** are assumed. The server must be **Jellyfin 12.0+**.
2. Sign-in: Quick Connect when the server has it enabled, otherwise username/password (public user list, or Other user).
3. Home rows: Continue watching, Next up, library latest.
4. Details: seasons/episodes for series, version / audio / subtitle pickers, Resume / Play from start.
5. Player: progressive `static=true` direct play. Audio is bit-streamed when the HDMI / ARC / eARC sink reports the encoding. Progress is posted to Jellyfin every 10 s.
6. Settings → Playback & formats: Easy AVR setup. Detected encodings and HDR types are listed; each row can be forced on (passthrough / direct) or off (server convert). Optional frame-rate matching uses `Surface.setFrameRate`.

## Architecture

```
apps/androidtv/
  core/          MediaServer, capability table, decidePlayback, DeviceProfile
  jellyfin/      JellyfinServer — official SDK only
  playback/      AudioManager HDMI probe + Display HDR, Media3 ExoPlayer
  ui/            Compose for TV screens (tokens from docs/SPEC.md)
```

`packages/core` and `apps/webos` are not imported. The Kotlin types mirror that package so a later shared module is possible.

The official Media3 FFmpeg extension AAR is not on Maven, so it is not a compile dependency. `FfmpegSupport` looks up `FfmpegLibrary.isAvailable()` by reflection if a production NDK build of the extension is later dropped on the classpath. The default debug APK reports it as unavailable. Passthrough + device MediaCodec is the Shield path.

## What this VM / CI cannot prove

Do these on the Shield + TX-NR7100. They are **not** claimed by the PR:

1. HDMI eARC actually lists AC-3 / E-AC-3 / E-AC-3 JOC / TrueHD / DTS / DTS-HD / DTS:X on this Onkyo.
2. TrueHD Atmos and DTS:X light the right legend on the receiver (Atmos vs DD+ vs DTS).
3. Dolby Vision profile 5 / 8 toast on the display; profile 7 falls back to the HDR10 base layer without a green frame.
4. `Surface.setFrameRate` / display-mode switch for 23.976 and 24 without judder.
5. FFmpeg software decode (only after an NDK build of the official extension).
6. Leanback banner and D-pad focus on the real Google TV launcher compositor.
7. Cold start and time-to-first-frame on the Shield (not the emulator).

Browser / emulator / unit tests cannot stand in for HDMI bitstream or Dolby Vision.
