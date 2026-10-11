#!/usr/bin/env python3
"""End-to-end mascot motion and FX regression against the Pages build.

Browser must render decorative emotion symbols ABOVE the immutable hoodie,
and expression changes must not move the stage or fixed body. No API calls.
"""
import base64
import json
import re
import shutil
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else 'dist').resolve()
assert (ROOT/'assets/rig/reactions_fx.webp').is_file()
assert (ROOT/'src/main.js').is_file()
assert (ROOT/'index.html').is_file()

def data_uri(name):
    return "data:image/webp;base64,"+base64.b64encode(
        (ROOT/'assets/rig'/name).read_bytes()).decode('ascii')

html=(ROOT/'index.html').read_text(encoding='utf-8')
css=(ROOT/'src/styles.css').read_text(encoding='utf-8')
manifest_js=(ROOT/'src/manifest.js').read_text(encoding='utf-8')
main_js=(ROOT/'src/main.js').read_text(encoding='utf-8')
css=re.sub(r"@import url\([^;]+;", "", css, count=1)
for kind,version in [('directions',9),('reactions',9),('reactions_fx',10)]:
    target=f"../assets/rig/{kind}.webp?v={version}"
    assert target in css,target
    css=css.replace(target,data_uri(kind+'.webp'))
html=html.replace('<link rel="stylesheet" href="./src/styles.css?v=10">',
                  '<style>'+css+'</style>')
assert '<style>' in html
for name in ('manifest','main'):
    html=re.sub(rf'<script defer src="./src/{name}\.js(?:\?v=10)?"></script>',
                '', html)
html=html.replace('./assets/rig/body.webp?v=9',data_uri('body.webp'))
html=re.sub(r'<link rel="preload"[^>]+>', '', html)
errors=[]

def make_page(browser,**opts):
    page=browser.new_page(**opts)
    page.on('pageerror',lambda err:errors.append(str(err)))
    page.set_content(html,wait_until='domcontentloaded')
    page.add_script_tag(content=manifest_js)
    page.add_script_tag(content=main_js)
    return page

def position(page):
    return page.evaluate("""() => {
      const scene=document.querySelector('#play-scene').getBoundingClientRect();
      const sr=document.querySelector('#mascot-stage').getBoundingClientRect();
      const br=document.querySelector('#mascot-body').getBoundingClientRect();
      return [sr.left-scene.left,sr.top-scene.top,sr.width,sr.height,
              br.left-scene.left,br.top-scene.top,br.width,br.height];
    }""")

def check_position(page,base,label):
    values=position(page)
    delta=max(abs(a-b) for a,b in zip(values,base))
    assert delta<0.5,f'{label}: stage or body moved by {delta:.2f} px'

try:
    with sync_playwright() as pw:
        opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        executable=(shutil.which('chromium') or shutil.which('google-chrome')
                    or shutil.which('google-chrome-stable'))
        if executable:opts['executable_path']=executable
        browser=pw.chromium.launch(**opts)
        page=make_page(browser,viewport={'width':1440,'height':1000},
                       reduced_motion='no-preference')
        page.wait_for_function('Boolean(window.ERA_MASCOT_DEBUG)')
        page.locator('#mascot-stage').scroll_into_view_if_needed()
        base=position(page)
        assert page.locator('#mascot-fx').count()==1
        assert page.locator('#mascot-fx-next').count()==1
        assert 'V10.0' in page.locator('body').inner_text()
        assert page.evaluate(
            "getComputedStyle(document.querySelector('#mascot-fx')).backgroundImage"
        ).startswith('url("data:image/webp;base64,')
        page.locator('[data-reaction="curious"]').click()
        page.wait_for_timeout(80)
        mid=page.evaluate(
            "[...document.querySelectorAll('.mascot-fx-sheet')].map(x=>+getComputedStyle(x).opacity)"
        )
        assert any(.05 < opacity < .98 for opacity in mid),('missing FX fade',mid)
        check_position(page,base,'curious entering')
        page.wait_for_timeout(180)
        for mood in ('calm','joy','surprised','excited','curious','sleepy',
                     'thinking','love','victory'):
            page.locator(f'[data-reaction="{mood}"]').click()
            page.wait_for_timeout(195)
            state=page.evaluate('window.ERA_MASCOT_DEBUG.state.activeFrame')
            assert state=='reactions:'+mood,(mood,state)
            opacity=page.evaluate(
                "[...document.querySelectorAll('.mascot-fx-sheet')].map(x=>+getComputedStyle(x).opacity)"
            )
            assert max(opacity)>.97,(mood,'FX not visible',opacity)
            assert page.evaluate(
                "document.querySelector('#mascot-stage').getAnimations().length")==0
            check_position(page,base,mood)
        for mood in ('curious','love','sleepy','victory','joy','surprised'):
            page.locator(f'[data-reaction="{mood}"]').click()
            page.wait_for_timeout(25)
            check_position(page,base,'rapid '+mood)
        page.wait_for_timeout(1800)
        assert page.evaluate(
            'window.ERA_MASCOT_DEBUG.state.activeFrame').startswith('directions:')
        check_position(page,base,'return to tracking')

        mobile=make_page(browser,viewport={'width':390,'height':844},
                         is_mobile=True,has_touch=True)
        mobile.wait_for_function('Boolean(window.ERA_MASCOT_DEBUG)')
        mobile.locator('#mascot-stage').scroll_into_view_if_needed()
        mobile_base=position(mobile)
        mobile.locator('[data-reaction="love"]').click()
        mobile.wait_for_timeout(220)
        assert max(mobile.evaluate(
            "[...document.querySelectorAll('.mascot-fx-sheet')].map(x=>+getComputedStyle(x).opacity)"
        ))>.95
        check_position(mobile,mobile_base,'mobile love')

        reduced=make_page(browser,viewport={'width':1200,'height':900},
                          reduced_motion='reduce')
        reduced.locator('[data-reaction="excited"]').click()
        reduced.wait_for_timeout(30)
        assert reduced.evaluate(
            "document.querySelector('.mascot-head-track').getAnimations().length")==0
        assert reduced.evaluate(
            "getComputedStyle(document.querySelector('#mascot-fx')).transitionDuration"
        )=='0s'
        assert not errors,json.dumps(errors)
        print('PASS: desktop/mobile 9 emotions, FX visible, 170ms crossfade, stable stage/body, rapid clicks, reduced motion')
        browser.close()
finally:
    pass
