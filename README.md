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

## Roadmap

- [ ] Scan barcodes with the camera
- [ ] Save barcodes locally
- [ ] Show saved barcodes in a swipeable carousel
