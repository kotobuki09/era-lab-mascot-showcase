# ERA Lab Mascot Showcase

Premium, dependency-free page-mascot showcase for ERA Lab's **male researcher mascot** — black hair, rectangular glasses and a white/navy orbit hoodie.

**Latest build: v4.1.** Includes nine shoulder-aligned directions, nine reactions, frame-rate-independent gaze easing, a 112ms interruptible latest-frame crossfade, transparent PNG exports, reduced-motion support, and a responsive asset library.

## Deployment status

The GitHub Actions workflow is configured in `.github/workflows/pages.yml`. **The complete image assets and frontend code must still be uploaded to this repository** before a working page can deploy. The workflow intentionally skips if `index.html` is missing. This avoids a broken public site.

The verified package containing all source and original PNG artwork is available in the ChatGPT conversation that produced the project. Extract it and run `publish-github.ps1` (Windows) or `publish-github.sh` (macOS/Linux), using your authenticated GitHub CLI/Git credentials.

After pushing, set **Settings → Pages → Build and deployment → Source: GitHub Actions**. Once deployment succeeds, the expected URL is:

https://kotobuki09.github.io/era-lab-mascot-showcase/

## Notes

- All 18 production frames are individual transparent 512×512 PNGs, not CSS-cropped sprite rectangles.
- Both high-resolution 1254×1254 master sprite sheets remain in `assets/originals/`.
- Pixel-safe translations align the shoulder/hoodie anchor without altering the masters.
- CI runs the 9 automated asset and motion tests before deploying.
- True continuous head rotation beyond nine directions would require a rigged 2D model; the current build smooths directional transitions without distorting the artwork.
