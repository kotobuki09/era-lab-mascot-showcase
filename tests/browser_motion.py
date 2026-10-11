#!/usr/bin/env python3
"""Browser regression: reaction animations must not move the centered stage.

Runs against the actual assembled GitHub Pages files, inlining the three
production mascot images and scripts to avoid local HTTP and font requests.
"""
from pathlib import Path
import base64
import json
import re
import shutil
import sys
from playwright.sync_api import sync_playwright

root = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "src/styles.css").read_text(encoding="utf-8")
main_js = (root / "src/main.js").read_text(encoding="utf-8")
manifest_js = (root / "src/manifest.js").read_text(encoding="utf-8")

def data_uri(name):
    return "data:image/webp;base64," + base64.b64encode(
        (root / "assets/rig" / name).read_bytes()
    ).decode("ascii")

css = re.sub(r"@import url\([^;]+;", "", css, count=1)
for kind in ("directions", "reactions"):
    css = css.replace(f"../assets/rig/{kind}.webp?v=9", data_uri(kind + ".webp"))
html = html.replace('<link rel="stylesheet" href="./src/styles.css?v=9">',
                    "<style>" + css + "</style>")
for name in ("manifest", "main"):
    html = re.sub(rf'<script defer src="./src/{name}\.js(?:\?v=9)?"></script>',
                  "", html)
html = html.replace("./assets/rig/body.webp?v=9", data_uri("body.webp"))

errors = []
with sync_playwright() as pw:
    executable = (shutil.which("google-chrome") or
                  shutil.which("google-chrome-stable") or
                  shutil.which("chromium"))
    opts = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
    if executable:
        opts["executable_path"] = executable
    browser = pw.chromium.launch(**opts)

    def make_page(reduced=False):
        page = browser.new_page(viewport={"width": 1440, "height": 1000},
                                reduced_motion="reduce" if reduced else "no-preference")
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.set_content(html, wait_until="domcontentloaded")
        page.add_script_tag(content=manifest_js)
        page.add_script_tag(content=main_js)
        return page

    page = make_page()
    page.locator("#mascot-stage").scroll_into_view_if_needed()

    def geometry():
        return page.evaluate("""() => {
          const s=document.querySelector('#mascot-stage');
          const b=document.querySelector('#mascot-body');
          const p=document.querySelector('#play-scene');
          const sr=s.getBoundingClientRect(), pr=p.getBoundingClientRect();
          const br=b.getBoundingClientRect();
          return {position:[sr.left-pr.left,sr.top-pr.top,sr.width,sr.height],
            body:[br.left-pr.left,br.top-pr.top,br.width,br.height],
            stageAnimations:s.getAnimations().length,
            headAnimations:document.querySelector('.mascot-head-track').getAnimations().length,
            opacity:[...document.querySelectorAll('.mascot-sheet')].map(x=>+getComputedStyle(x).opacity),
            current:window.ERA_MASCOT_DEBUG.state.activeFrame};
        }""")

    base = geometry()
    points = [base]
    page.locator('[data-reaction="joy"]').click()
    page.wait_for_timeout(90)
    entering = geometry()
    points.append(entering)
    assert entering["current"] == "reactions:joy"
    assert entering["headAnimations"] >= 1
    assert entering["stageAnimations"] == 0
    assert 0 < entering["opacity"][0] < 1
    assert 0 < entering["opacity"][1] < 1

    page.wait_for_timeout(230)
    points.append(geometry())
    assert points[-1]["opacity"][1] > .99

    # A second expression uses the other head layer, not a visible atlas swap.
    page.locator('[data-reaction="curious"]').click()
    page.wait_for_timeout(90)
    switching = geometry()
    points.append(switching)
    assert switching["current"] == "reactions:curious"
    assert 0 < switching["opacity"][1] < 1
    assert 0 < switching["opacity"][2] < 1

    for mood in ("calm", "joy", "surprised", "excited", "curious",
                 "sleepy", "thinking", "love", "victory"):
        page.locator(f'[data-reaction="{mood}"]').click()
        assert geometry()["current"] == "reactions:" + mood
        points.append(geometry())
        page.wait_for_timeout(22)

    page.wait_for_timeout(1950)
    returned = geometry()
    points.append(returned)
    assert returned["current"].startswith("directions:")
    assert returned["stageAnimations"] == 0

    for position in ("position", "body"):
        max_delta = max(abs(point[position][i] - base[position][i])
                        for point in points for i in range(4))
        assert max_delta < .3, f"{position} shifted by {max_delta:.2f}px"

    reduced = make_page(reduced=True)
    reduced.locator('[data-reaction="joy"]').click()
    reduced.wait_for_timeout(80)
    assert reduced.evaluate(
        "document.querySelector('.mascot-head-track').getAnimations().length") == 0
    assert reduced.evaluate(
        "getComputedStyle(document.querySelector('#mascot-reactions')).transitionDuration"
    ) == "0s"
    assert not errors, "JS errors: " + json.dumps(errors)
    print("PASS: 0px stage/body movement, 9 expressions, crossfade, rapid clicks, reduced motion")
    browser.close()
