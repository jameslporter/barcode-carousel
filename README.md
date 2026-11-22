# Barcode Carousel

A universal [Expo](https://expo.dev) app (iOS, Android and web) for saving barcodes and flipping through them in a carousel, so the right card is one swipe away at the checkout.

Built with Expo SDK 58, [Expo Router](https://docs.expo.dev/router/introduction/) and TypeScript.

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android) or w (web)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run ios` / `android` / `web` | Start and open on a platform |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run lint` | Lint with `expo lint` |
| `npm run build:web` | Export a static web build to `dist/` |

## Project layout

- `src/app/` holds routes. Every file is a screen and `_layout.tsx` files define navigators.
- Put components, hooks and other non-route code elsewhere under `src/`.
- `ios/` and `android/` are generated (Continuous Native Generation); configure native behavior in `app.json`.

## Native builds and updates (EAS)

The app is linked to EAS project `abd294dc-0550-47f3-b20c-f25e7ca75a19`. Build profiles live in `eas.json`, and each one publishes to the matching EAS Update channel.

| Profile | Use | Channel |
| --- | --- | --- |
| `development` | Dev client for `npx expo start` (internal install) | `development` |
| `preview` | Internal test build of the release app | `preview` |
| `production` | Store build, build number auto-incremented by EAS | `production` |

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform ios   # or android / all
npx eas-cli@latest update --channel preview --message "..."      # ship JS changes OTA
```

Updates use the `appVersion` runtime policy: an update only reaches builds with the same `version` from `app.json`. Bump `version` whenever you add or upgrade a native module, then make new builds.

Pushes to `main` publish an update to the `production` channel via `.github/workflows/eas-update.yml` once the `EXPO_TOKEN` repository secret is set. The web build to GitHub Pages is separate and unchanged.

## Roadmap

- [ ] Scan barcodes with the camera
- [ ] Save barcodes locally
- [ ] Show saved barcodes in a swipeable carousel
