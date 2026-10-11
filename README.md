# ERA Lab Mascot Showcase v6 — page-mascot rig

**Live:** https://kotobuki09.github.io/era-lab-mascot-showcase/

Based on [nilbuild/page-mascot](https://github.com/nilbuild/page-mascot) by Kamran Ahmed (MIT). The pointer angle selects a direction cell with the original 70px dead zone and 0.12rad hysteresis. Two always-mounted 3×3 sheets switch through CSS `background-position`, while click reactions use the reference's squash animation.

## What actually fixes the jitter

In prior releases, the nine original drawings had **different white/navy hoodie, collar, shoulder and planet-logo pixels**. Faster JS could not remove this visual jump.

The new `scripts/build_rig.py` deterministically creates:
- `dist/assets/rig/body.webp`: **one permanently fixed torso** extracted from the approved original front-facing artwork.
- `dist/assets/rig/directions.webp`: nine **head-only** direction poses.
- `dist/assets/rig/reactions.webp`: nine **head-only** expression poses.

Only the head sheet position changes. There is no full-body image replacement or crossfade. All approved source PNGs and the asset gallery remain intact; **none of the rejected AI-generated images are used**.

The build runs on GitHub Actions after Node tests. Rebuild locally with `python -m pip install -r scripts/requirements.txt && python scripts/build_rig.py --source assets --dest dist/assets/rig`. Run the tests with `node --test tests/verify.mjs tests/engine.test.mjs`.

The mascot still has nine discrete head directions, not a continuously rigged 3D head. Some neck edges may differ slightly because the source expressions were hand-drawn separately.

## Isolation and attribution

GitHub Pages deploys only the `kotobuki09/era-lab-mascot-showcase` repository project; the separate Sharper Night user site `kotobuki09/kotobuki09.github.io` is untouched.

The angle tracking and click squash are adapted from [page-mascot](https://github.com/nilbuild/page-mascot), distributed under the MIT license. License text: `THIRD_PARTY_LICENSES/page-mascot-MIT.txt`.

## V7 — aligned original artwork, not redrawn

V7 addresses the user-visible head snap root cause. The previous rig had dynamic hoodie/collar fragments and a **23-pixel native vertical neck-anchor spread**. The builder now cuts out only skin/hair/head pixels (not clothing), aligns all 18 poses to one neck pivot, verifies the fixed torso after atlas generation, and displays the nine authored directions at a reference-appropriate size. The original approved artwork remains untouched and the algorithm still follows [nilbuild/page-mascot](https://github.com/nilbuild/page-mascot). There is still a discrete nine-pose artistic limit; this is not a 3D rig.

## V8: image artifact repair

Removes the black spurious line behind the collar on the down-right head sprite and the pale ghost band left in the fixed body by the earlier segmentation. Keeps the entire approved 18-PNG source set unchanged. The builder restricts below-cheek outlines to an 8-pixel warm-skin envelope, cuts only the true neck skin from the single hoodie layer, and validates four recorded neck-edge regression regions in every GitHub Pages build. The artwork still has nine discrete directions; this change repairs visual artifacts, not interpolated head rotation.

## V9 — smooth reaction transition, stationary mascot

The expression jump occurred because animating the outer #mascot-stage with scale()
overrode its CSS translate(-50%, -50%) centering. V9 animates only the inner
head, retains the original fixed hoodie/body, and double-buffers two reaction
sprites so rapid emotion changes crossfade smoothly (170 ms). Reduced-motion
preferences and the original assets are unchanged. Regression tests explicitly
guard against accidentally animating the outer stage again.

## V9 browser regression in CI

GitHub Actions now tests the deployed static build in headless Chromium before
publishing it. The test verifies stable stage/body geometry (less than 0.3 px
measured deviation), a 170 ms emotion crossfade, all nine rapid expression
selections, restoration of cursor tracking, and reduced-motion behavior.
