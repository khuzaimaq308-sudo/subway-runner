# Subway Runner — Native Android APK Build Guide

This project now has a **native Android wrapper** (Capacitor). The APK is a real native app — no "Running in Chrome" notification, no URL bar, no Chrome dependency.

The app loads `https://character-dash.replit.app` inside a native WebView shell.

---

## Quickest path: Build APK in the cloud (GitHub Actions)

You don't need a Mac, Android Studio, or any local setup. GitHub builds the APK for you for free.

### Step 1 — Push project to GitHub

1. Go to https://github.com/new and create a new repo (private is fine), e.g. `subway-runner`
2. In Replit shell:
   ```bash
   git remote add origin https://github.com/<your-username>/subway-runner.git
   git push -u origin main
   ```

### Step 2 — Wait for the workflow to run

- Go to your GitHub repo → **Actions** tab
- You'll see "Build Android APK" running automatically (takes ~5–8 minutes)
- When it's done (green checkmark), click into the run

### Step 3 — Download the APK

- Scroll to the bottom of the run page → **Artifacts** section
- Download `subway-runner-debug-apk.zip`
- Unzip it → you get `app-debug.apk`

### Step 4 — Install on your phone

- Transfer `app-debug.apk` to your phone (Bluetooth, WhatsApp, USB cable, anything)
- Tap the file → enable "Install from unknown sources" if asked → install
- Open **Subway Runner** from your app drawer

You'll see:
- ✅ **No "Running in Chrome" notification**
- ✅ **No URL bar at top**
- ✅ **No yellow status bar**
- ✅ Proper fullscreen native app experience

---

## App configuration

- **App ID (package name):** `app.replit.subwayrunner`
- **App name:** Subway Runner
- **URL loaded:** `https://character-dash.replit.app`
- **Background color:** `#060614` (dark)

To change the URL the app loads, edit `artifacts/3d-game/capacitor.config.ts`:
```ts
server: { url: 'https://your-new-url.replit.app', ... }
```

---

## For Play Store release (signed APK)

The GitHub Actions workflow currently builds a **debug-signed APK** — works great for sharing with friends, but Play Store requires a **release-signed** APK with your own keystore.

When you're ready to publish to Play Store, ping me — I'll add the signing setup (keystore generation + signed release workflow).

---

## Local builds (advanced — only if you have Android Studio)

```bash
cd artifacts/3d-game
pnpm run build
npx cap sync android
npx cap open android   # opens Android Studio
```

Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
