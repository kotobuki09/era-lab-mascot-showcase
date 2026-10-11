# ERA Lab Mascot Showcase

An animated, dependency-free mascot showcase for ERA Lab's **male researcher character**, preserving the original black hair, rectangular glasses and white/navy orbit hoodie artwork.

**Latest release: v5.0 — smoother cursor tracking.** All nine head directions and nine expression poses use the original 512×512 transparent PNG exports. The v5 engine keeps every frame mounted and decoded, uses angular direction sectors with a center dead zone and boundary hysteresis, and moves the sprite via a small GPU-friendly spring transform. Switching poses no longer swaps `img.src` or crossfades two faces, and periodic full-face "fake blinking" has been removed. The image library, mobile direction buttons, and reduced-motion setting remain available.

## Live site and deployment

**Website:** https://kotobuki09.github.io/era-lab-mascot-showcase/

**Deployment:** GitHub Pages via [Verify and deploy ERA Lab mascot](https://github.com/kotobuki09/era-lab-mascot-showcase/actions/workflows/pages.yml). The site is built from the isolated static project and published automatically on `main` updates. The workflow runs PNG/checksum and JavaScript/motion tests before upload.

**Last verified release:** [v5.0 deployment (successful)](https://github.com/kotobuki09/era-lab-mascot-showcase/actions/runs/38110878550). Public browser checks also confirmed the mascot, direction controls, reaction buttons and 18-frame asset library.

This repository **does not publish to or modify** the separate [Sharper Night](https://github.com/kotobuki09/kotobuki09.github.io) user-site repository. The deployment workflow checks that it runs only in `kotobuki09/era-lab-mascot-showcase`.

## Artwork and implementation

- 18 original, transparent 512×512 PNG direction/reaction frames live under `assets/directions/` and `assets/reactions/`.
- Two unmodified 1254×1254 master sheets are preserved under `assets/originals/`.
- Shoulder/hoodie framing uses the already aligned frame exports without changing the source artwork.
- Direction changes follow the pointer's angle with an eight-sector map, dead-zone and angular hysteresis. Head pose selection is discrete because the artwork contains nine directions, not a rigged model.
- Pose layers are decoded once and switched without ghosting or synchronous layout reads. Fine spring motion between selections is separate from the frame compositor.
- Keyboard, mobile arrow buttons, reduced-motion preference, gallery filters, zoom and PNG downloads remain available.
- Node tests can be run with `node --test tests/verify.mjs tests/engine.test.mjs`; no `npm install` or build tool is required.

## Rendering limitation

Nine authored directions cannot produce continuous, anatomically accurate head rotation. Achieving actual smooth intermediate head poses would require additional aligned in-between frames or a rigged 2D/3D character. The current v5 update removes avoidable animation stutter and visual double-exposure without inventing or distorting the approved mascot artwork.
