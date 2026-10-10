# ERA Lab Mascot Showcase

Premium, dependency-free page-mascot showcase for ERA Lab's **male researcher mascot** — black hair, rectangular glasses and a white/navy orbit hoodie.

**Latest build: v4.1.** Includes nine shoulder-aligned directions, nine reactions, frame-rate-independent gaze easing, a 112ms interruptible latest-frame crossfade, transparent PNG exports, reduced-motion support, and a responsive asset library.

## Deployment status

✅ Frontend source, 18 production transparent PNG frames, two original master sheets, and 9 automated tests are committed to `main`.

⚠️ GitHub Actions deployment is currently blocked because **GitHub Pages is not enabled for this repository**. The workflow run reports `Get Pages site failed — Not Found`. An automated attempt to enable Pages using `GITHUB_TOKEN` was rejected by GitHub (`Resource not accessible by integration`).

**One-time repository-owner action:** open [Settings → Pages](https://github.com/kotobuki09/era-lab-mascot-showcase/settings/pages), set **Build and deployment → Source: GitHub Actions**. Afterwards, rerun the [latest Pages workflow](https://github.com/kotobuki09/era-lab-mascot-showcase/actions/workflows/pages.yml), or push a small commit to `main`.

Expected project-only URL: https://kotobuki09.github.io/era-lab-mascot-showcase/

The workflow checks `github.repository` to avoid deploying elsewhere, and uploads only a generated `dist/` folder containing the mascot website. The separate Sharper Night user site `kotobuki09/kotobuki09.github.io` is untouched.

## Notes

- All 18 production frames are individual transparent 512×512 PNGs, not CSS-cropped sprite rectangles.
- Both high-resolution 1254×1254 master sprite sheets remain in `assets/originals/`.
- Pixel-safe translations align the shoulder/hoodie anchor without altering the masters.
- CI runs the 9 automated asset and motion tests before deploying.
- True continuous head rotation beyond nine directions would require a rigged 2D model; the current build smooths directional transitions without distorting the artwork.
