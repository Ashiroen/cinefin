# Install Cinefin on an LG C2 (webOS 22)

Cinefin M1 is a sideloaded IPK. It is **not** in the LG Content Store. Sideloaded apps only stay installed while **Developer Mode** is on. When the Developer Mode session expires, webOS **uninstalls** them. Read §5 before the first evening you actually want to watch a film.

You need:

- The C2 on the same network as your PC
- An [LG Developer](https://webostv.developer.lge.com/) account (email + password)
- Node.js 22+ and the webOS CLI
- The `com.cinefin.app_*.ipk` from CI (Actions artifact) or built locally

## 1. Build the IPK (optional)

From the repo root:

```bash
npm ci
npm run package:webos
```

This typechecks, builds the web app for Chromium 87, and runs `ares-package`. The IPK lands in `dist/`.

The CLI is `@webos-tools/cli` (not the retired `@webosose/ares-cli`). If you already have the old one:

```bash
npm uninstall -g @webosose/ares-cli
npm install -g @webos-tools/cli
ares-config --profile tv
```

`npm run package:webos` installs the CLI locally in the repo if it is missing.

## 2. Turn on Developer Mode on the C2

1. On the TV, confirm it is on Wi‑Fi or Ethernet.
2. Open the **LG Content Store**, search **Developer Mode**, install it.
3. Sign in with your LG Developer account.
4. Switch **Dev Mode Status** on. The TV reboots.
5. Open Developer Mode again. Leave it on this screen — you need the **Key Server** and the 6-character **Passphrase**.

Developer Mode turns itself off if:

- The remaining session time hits zero, or
- The TV reboots **ten times** while offline

When it turns off, **every sideloaded app is deleted**, including Cinefin. You will see the Developer Mode login again.

## 3. Pair the PC with the TV

On the TV: tap **Key Server** so it is on.

On the PC:

```bash
ares-setup-device
```

Choose **add**, then:

| Field | Value |
|---|---|
| Device name | `c2` (any name) |
| IP | the C2's address (Settings → Network) |
| Port | `9922` |
| SSH user | `prisoner` |
| Password | *leave empty* |
| Set default | Yes |

Then fetch the SSH key and type the passphrase **exactly** as shown on the TV (case sensitive):

```bash
ares-novacom --device c2 --getkey
ares-device --system-info --device c2
```

You should see something like `sdkVersion : 7.x` / webOS 22 on a stock C2.

## 4. Install and launch

```bash
ares-install --device c2 dist/com.cinefin.app_0.1.0_all.ipk
ares-launch --device c2 com.cinefin.app
```

Cinefin appears in the launcher with the amber mark. First run: connect to the server (board 00a / 00a2). If LAN discovery is empty, that is expected on some networks — type `192.168.x.x` or `192.168.x.x:8096`. `http://` and port `8096` are assumed. The server must be **Jellyfin 12.0 or newer**.

Logs:

```bash
ares-inspect --device c2 --app com.cinefin.app
```

## 5. Session expiry — extend it *before* it dies

The Developer Mode tile shows **Remain Session**. When that hits zero, the next reboot drops you out of Developer Mode and **Cinefin is uninstalled**. You cannot extend a session that has already expired; you have to sign in and turn Dev Mode on again, then reinstall the IPK.

**On the TV (simplest):** open Developer Mode, keep the TV online, press **EXTEND**. Do this whenever you notice the timer getting low.

**From the PC** (current `@webos-tools/cli`; `ares-extend-dev` was removed in CLI v3):

```bash
ares-launch --device c2 com.palmdts.devmode -p extend=true
```

LG now allows a long session (up to 1000 hours once extended). Still check it after firmware updates and after a stretch of the TV being unplugged.

After an expiry you will need:

```bash
# Dev Mode on again, Key Server on, passphrase if the key was lost
ares-install --device c2 dist/com.cinefin.app_0.1.0_all.ipk
ares-launch --device c2 com.cinefin.app
```

Your Jellyfin login lives in the app's localStorage, so a reinstall means signing in again.

## 6. Update

```bash
ares-install --device c2 dist/com.cinefin.app_<new>_all.ipk
```

webOS replaces the previous sideload of the same id.

## 7. Remove

```bash
ares-install --device c2 --remove com.cinefin.app
```

Or turn Developer Mode off — that removes it too.
