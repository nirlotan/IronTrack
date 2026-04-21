# IronTrack — iOS TestFlight & App Store Publishing Guide

**Assumptions:** Apple Developer account (paid, $99/yr), Mac with Xcode 16+, and the IronTrack repo cloned locally.

---

## Overview

The publishing flow for an Expo SDK 54 app has two paths:

| Path | Best for |
|---|---|
| **EAS Build (recommended)** | Automated, cloud or local, no Xcode config needed day-to-day |
| **Manual Xcode archive** | Full control, works fully offline |

This guide covers **EAS Build** first (faster) and then the **manual Xcode** path as a fallback.

---

## Part 1 — Pre-flight Checklist

### 1.1 App metadata in `app.json`

Confirm these fields are correct before any build:

```json
{
  "expo": {
    "name": "IronTrack",
    "version": "1.0.0",          // bump for each TestFlight submission
    "ios": {
      "bundleIdentifier": "com.irontrack.app",
      "buildNumber": "1",        // increment every submission (even if version stays)
      "supportsTablet": false
    }
  }
}
```

> **Rule:** `version` is what users see (e.g. 1.0.0). `buildNumber` must be a string integer and must be higher than the last submission — TestFlight rejects duplicate build numbers.

### 1.2 App icons

App Store Connect requires a single 1024×1024 PNG with **no alpha channel** (transparency). Check your current icon:

```bash
file assets/icon.png
# Should say: PNG image data, 1024 x 1024, 8-bit/color RGBA
```

If it has alpha, open it in Preview → Export → uncheck Alpha → save as PNG.

Expo also generates all required icon sizes from this file automatically.

### 1.3 Splash screen

`assets/splash-icon.png` should be at least 1242×2688 px (iPhone max resolution). The `backgroundColor` in `app.json` (`#0e0e0e`) is used to fill the rest of the screen.

### 1.4 Privacy — `NSUserTrackingUsageDescription` / `PrivacyInfo.xcprivacy`

IronTrack stores workout data locally (AsyncStorage) and uses `expo-crypto` for UUIDs. No third-party analytics or ad SDKs. You need to declare data-collection practices in App Store Connect (see Part 3). No `NSUserTrackingUsageDescription` is needed unless you add ATT/analytics later.

---

## Part 2A — Build & Submit with EAS (Recommended)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login   # sign in with your Apple ID / Expo account
```

### Step 2: Initialize EAS in the project

```bash
cd /path/to/IronTrack
eas build:configure
```

This creates `eas.json`. Accept the defaults. It should look like:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

> Add `"autoIncrement": true` to the `production` profile so EAS auto-bumps `buildNumber` on every build.

### Step 3: Configure Apple credentials

```bash
eas credentials
```

Select **iOS → production** and let EAS manage signing (it will create/reuse your Distribution Certificate and Provisioning Profile through App Store Connect API).

Alternatively, provide credentials manually:
- Distribution Certificate (`.p12`) from Keychain
- App Store Provisioning Profile from [developer.apple.com](https://developer.apple.com/account/resources/profiles/list)

### Step 4: Create the App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **My Apps → +** → **New App**
3. Fill in:
   - Platform: **iOS**
   - Name: **IronTrack**
   - Primary Language: English (or Hebrew)
   - Bundle ID: `com.irontrack.app` (must match `app.json`)
   - SKU: `irontrack` (any unique internal identifier)
4. Save.

### Step 5: Run the production build

```bash
eas build --platform ios --profile production
```

EAS will:
1. Install dependencies
2. Run `expo prebuild` to generate the native iOS project
3. Archive and sign the app
4. Upload the `.ipa` to EAS servers

This takes ~10–20 minutes. You can close the terminal — EAS runs in the cloud.

When complete, you'll see a build URL. The `.ipa` is ready.

### Step 6: Submit to TestFlight

```bash
eas submit --platform ios --latest
```

EAS uploads the `.ipa` directly to App Store Connect via the App Store Connect API. It uses the credentials from Step 3.

After a few minutes the build will appear in **App Store Connect → TestFlight → iOS Builds** with status **"Processing"** (Apple takes 5–30 min to process).

### Step 7: Distribute via TestFlight

Once processing is complete:

1. In App Store Connect → **TestFlight → iOS Builds** → click your build
2. Add a **"What to Test"** note
3. **Internal Testing:** Add testers (up to 100 Apple-ID accounts on your team). Available immediately.
4. **External Testing:** Create a group → Add testers by email → Submit for Beta App Review (typically <24h first time, faster later).

Testers install the **TestFlight app** from the App Store and accept your invite email.

---

## Part 2B — Manual Xcode Archive (Alternative)

Use this if you prefer not to use EAS or need to debug native code.

### Step 1: Generate the native iOS project

```bash
cd /path/to/IronTrack
npx expo prebuild --platform ios --clean
```

This creates an `ios/` folder. **Do not commit this folder** — regenerate it on each build instead (it's a build artifact for Expo managed workflow).

### Step 2: Open in Xcode

```bash
open ios/IronTrack.xcworkspace
```

Always open the `.xcworkspace`, never the `.xcodeproj`.

### Step 3: Configure signing in Xcode

1. Select the **IronTrack** target in the project navigator
2. **Signing & Capabilities** tab
3. Check **Automatically manage signing**
4. Team: select your Apple Developer team
5. Bundle Identifier: `com.irontrack.app`

Xcode will download/create your distribution certificate and provisioning profile automatically.

### Step 4: Set the scheme and destination

1. In the toolbar, set the scheme to **IronTrack**
2. Set the destination to **Any iOS Device (arm64)** (not a Simulator)

### Step 5: Archive

**Product → Archive**

This compiles a release build and opens the **Organizer** window when done.

### Step 6: Distribute

In the Organizer:
1. Select your archive → **Distribute App**
2. Method: **App Store Connect**
3. Distribution: **Upload**
4. Follow the wizard — Xcode handles signing
5. Click **Upload**

The build will appear in App Store Connect → TestFlight within a few minutes.

---

## Part 3 — App Store Connect Setup (required before public TestFlight or release)

### App Information

| Field | Value |
|---|---|
| Category | Health & Fitness |
| Content Rights | No, does not contain, display, or access third-party content |
| Age Rating | 4+ |

### Privacy Nutrition Labels

Go to **App Privacy → Get Started**. For IronTrack:

| Data type | Collected? | Used for |
|---|---|---|
| Health & Fitness | **No** (stored locally, never sent to any server) | — |
| Identifiers | **No** | — |
| Usage Data | **No** | — |

Select **"Data Not Collected"** — IronTrack is fully offline with no analytics.

### App Store Listing (required for public release, optional for TestFlight)

- **Screenshots:** Required sizes are iPhone 6.9" (1320×2868 or 1290×2796), iPhone 6.5" (1284×2778). Capture from Simulator or a real device.
- **Description:** Write a short description of IronTrack's features.
- **Keywords:** workout tracker, gym log, weight training, fitness
- **Support URL:** Required — can be a GitHub repo URL or a simple webpage.

---

## Part 4 — Submit for App Store Review

Once you're happy with TestFlight testing:

1. In App Store Connect → your app → **+** next to **iOS App** under the App Store section
2. Select the build you tested on TestFlight
3. Fill in all required metadata (description, screenshots, keywords, support URL)
4. Set pricing: **Free**
5. Click **Submit for Review**

Apple review typically takes **24–48 hours** for new apps.

---

## Part 5 — Updating the App

For every subsequent update:

```bash
# Bump version and/or buildNumber in app.json, then:
eas build --platform ios --profile production
eas submit --platform ios --latest
```

With `"autoIncrement": true` in `eas.json`, the `buildNumber` is bumped automatically.

---

## Common Issues

| Problem | Fix |
|---|---|
| "Invalid Bundle" on upload | Confirm `bundleIdentifier` in `app.json` matches App Store Connect exactly |
| "No provisioning profiles found" | Run `eas credentials` and let EAS regenerate the profile |
| "CFBundleIconFiles is missing" | Ensure `assets/icon.png` is 1024×1024 with no alpha channel |
| "This bundle is invalid. The value for key CFBundleShortVersionString..." | `version` in `app.json` must match semantic versioning (e.g. `"1.0.0"`, not `"1"`) |
| TestFlight says "Missing Compliance" | Add `ITSAppUsesNonExemptEncryption = NO` to `app.json` under `ios.infoPlist` |
| Build fails on `expo prebuild` | Delete `ios/` and `node_modules/`, run `npm install` then `prebuild` again |

### Fix for encryption compliance warning (add to `app.json`)

```json
"ios": {
  "bundleIdentifier": "com.irontrack.app",
  "buildNumber": "1",
  "supportsTablet": false,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  }
}
```

---

## Useful Links

- [EAS Build docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit docs](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com/account)
- [TestFlight documentation](https://developer.apple.com/testflight/)
