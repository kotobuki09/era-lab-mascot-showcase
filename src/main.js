/* ERA Lab mascot — zero dependency animation + gallery. All visual states are original 512px PNG cells. */
(() => {
  'use strict';
  const manifest = window.ERA_MASCOT_FRAMES;
  if (!manifest || !manifest.directions || !manifest.reactions) {
    throw new Error('ERA mascot manifest missing');
  }
  const assetURL = (path) => path.startsWith('data:') ? path : './' + path;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const D = new Map(manifest.directions.map(x => [x.id, x]));
  const R = new Map(manifest.reactions.map(x => [x.id, x]));
  // A small two-layer compositor: preload each frame once and only paint decoded images.
  // Direction changes are throttled by hysteresis below, not by a fade queue.
  const state = {wantedDirection:'center', reaction:null, auto:false, motion:true, lastPointer:Date.now(), mode:'all', query:'', activeFrame:'directions:center', x:0, y:0, initPointer:false};
  const base = $('#sprite-base'), spriteHost = $('.sprite-breathe'), spriteLook = $('.sprite-look'), stage = $('#mascot-stage'), scene = $('#play-scene'), speech = $('#scene-speech'), status = $('#direction-status');
  const randomButton = $('#random-button'), autoToggle = $('#auto-toggle'), motionToggle = $('#motion-toggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {state.motion=false;motionToggle.classList.remove('is-on');motionToggle.setAttribute('aria-checked','false');document.body.classList.add('motion-off');}
  const speechMap = {calm:'Ah, a peaceful moment ☁', joy:'This made my day! ✦', surprised:'Oh! You caught me!', excited:'That is SO cool! ✨', curious:'Hmm… interesting. 🤔', sleepy:'Five more minutes… 💤', thinking:'Let me think about that.', love:'Sending some love! 💕', victory:'Yes! We did it! 🚀'};
  const animMap = {surprised:'shake', curious:'poke', sleepy:'poke', joy:'pop', excited:'pop', love:'pop', victory:'pop', thinking:'poke', calm:'poke'};
  // Decode each PNG once, keep its image node mounted, and only toggle the
  // active layer. No img.src swapping, forced reflow, or crossfade ghosting.
  const preloaded = new Map(), frameNodes = new Map(), decoded = new Set();
  const assetPath = key => {
    const [kind,id] = key.split(':');
    const item = (kind === 'directions' ? D : R).get(id);
    if (!item) throw new Error('Unknown frame ' + key);
    return assetURL(item.path);
  };
  let displayed = 'directions:center', requested = displayed, activeNode = null;
  let reactionTimer = 0, bubbleTimer = 0, autoTimer = 0, actionTimer = 0;
  function commitFrame(key) {
    if (requested !== key || !decoded.has(key)) return;
    const node = frameNodes.get(key);
    if (!node || node === activeNode) return;
    if (activeNode) activeNode.classList.remove('is-active');
    node.classList.add('is-active');
    activeNode = node;
    base.classList.add('is-hidden');
    base.setAttribute('aria-hidden','true');
    displayed = key;
    state.activeFrame = key;
  }
  function preloadImage(key) {
    if (preloaded.has(key)) return preloaded.get(key);
    const node = new Image();
    node.className = 'sprite sprite-frame';
    node.alt = '';
    node.decoding = 'async';
    node.loading = 'eager';
    node.setAttribute('aria-hidden','true');
    node.src = assetPath(key);
    frameNodes.set(key,node);
    spriteHost.append(node);
    const ready = typeof node.decode === 'function'
      ? node.decode()
      : new Promise((resolve,reject) => {
          if (node.complete && node.naturalWidth) resolve();
          else { node.onload = resolve; node.onerror = reject; }
        });
    const promise = ready.then(() => {
      decoded.add(key);
      if (requested === key) commitFrame(key);
      return node;
    }).catch(() => {
      console.warn('ERA mascot frame could not be decoded: ' + key);
      return null;
    });
    preloaded.set(key,promise);
    return promise;
  }
  function setFrame(key) {
    if (!frameNodes.has(key)) return;
    requested = key;
    if (decoded.has(key)) commitFrame(key);
    // Pending decode commits only the most recently requested frame.
  }
  function say(txt,duration=1400){
    clearTimeout(bubbleTimer);speech.textContent=txt;
    if(duration)bubbleTimer=setTimeout(()=>{if(!state.reaction)speech.textContent='Move your cursor. I\'ll follow! ✦';},duration);
  }
  let markedDirection='center';
  function markDirection(dir){
    if(markedDirection===dir)return;
    markedDirection=dir;
    $$('[data-direction]').forEach(b=>b.classList.toggle('active',b.dataset.direction===dir));
    status.textContent='LOOKING · '+dir.toUpperCase().replaceAll('-',' ');
  }
  function setDirection(dir,{manual=false}={}){
    if(!D.has(dir))return;
    state.wantedDirection=dir;markDirection(dir);
    if (manual) {
      clearAuto();
      state.lastPointer = Date.now();
      gaze.holdUntil = performance.now() + 1100;
      gaze.pointerDirty = false;
      gaze.sector = sectorOrder.indexOf(dir);
      const i = sectors.indexOf(dir);
      gaze.targetX = (i % 3 - 1) * .55;
      gaze.targetY = (Math.floor(i / 3) - 1) * .52;
      startGaze();
      say('Looking ' + dir.replaceAll('-',' ') + ' ✳',750);
    } else if (state.auto) {
      const i = sectors.indexOf(dir);
      gaze.targetX = (i % 3 - 1) * .55;
      gaze.targetY = (Math.floor(i / 3) - 1) * .52;
      startGaze();
    }
    if(!state.reaction)setFrame('directions:'+dir);
  }
  function showReaction(id,{fromAuto=false,blink=false}={}){
    if(!R.has(id))return;
    if(!fromAuto)clearAuto();
    clearTimeout(reactionTimer);clearTimeout(actionTimer);
    state.reaction=id;setFrame('reactions:'+id);
    $$('[data-reaction]').forEach(b=>b.classList.toggle('selected',b.dataset.reaction===id));
    if(!blink)say(speechMap[id],0);
    stage.classList.remove('poke','shake','pop');
    if(state.motion&&!blink){
      // Reflow only at reaction boundaries, not every animation frame.
      void stage.offsetWidth;stage.classList.add(animMap[id]||'pop');
      actionTimer=setTimeout(()=>stage.classList.remove('poke','shake','pop'),650);
    }
    if(!blink)status.textContent='FEELING · '+id.toUpperCase();
    reactionTimer=setTimeout(()=>{
      state.reaction=null;stage.classList.remove('poke','shake','pop');
      $$('[data-reaction]').forEach(b=>b.classList.remove('selected'));
      setFrame('directions:'+state.wantedDirection);markDirection(state.wantedDirection);
      if(!blink)say('Move your cursor. I\'ll follow! ✦',0);
    },blink?215:id==='sleepy'?2200:1550);
  }
  function randomReaction(){
    const ids=[...R.keys()];let choice=ids[Math.floor(Math.random()*ids.length)];
    if(choice===state.reaction)choice=ids[(ids.indexOf(choice)+1)%ids.length];
    showReaction(choice);
  }
  function clearAuto(){
    if(!state.auto)return;state.auto=false;clearInterval(autoTimer);
    autoToggle.classList.remove('is-on');autoToggle.setAttribute('aria-checked','false');
  }
  function setAuto(on){
    clearAuto();if(!on)return;
    state.auto=true;autoToggle.classList.add('is-on');autoToggle.setAttribute('aria-checked','true');
    const dirs=[...D.keys()],moods=[...R.keys()];let index=0;
    autoTimer=setInterval(()=>{
      if(document.hidden)return;
      setDirection(dirs[index%dirs.length]);
      if(index%2===0)showReaction(moods[Math.floor(index/2)%moods.length],{fromAuto:true});
      index++;
    },2750);
    say('Demo mode is on — enjoy! ✨',1300);
  }

  // Koboyo-style angle sectors and dead zone, independent of motion easing.
  const sectorOrder = ['right','down-right','down','down-left','left','up-left','up','up-right'];
  const sectors = ['up-left','up','up-right','left','center','right','down-left','down','down-right'];
  const gaze = {targetX:0,targetY:0,x:0,y:0,sector:-1,clientX:0,clientY:0,hasPointer:false,pointerDirty:false,holdUntil:0,lastTime:0};
  let gazeRAF = 0;
  const clamp = (n,lo,hi) => Math.min(hi,Math.max(lo,n));
  function chooseSector(dx,dy,previous,deadzone) {
    const radius = Math.hypot(dx,dy);
    if (radius < (previous === -1 ? deadzone + 12 : Math.max(0,deadzone - 12))) return -1;
    const angle = Math.atan2(dy,dx), arc = Math.PI / 4;
    if (previous !== -1 &&
      Math.abs(Math.atan2(Math.sin(angle - previous*arc),Math.cos(angle - previous*arc))) < arc/2 + .13) return previous;
    return ((Math.round(angle/arc) % 8) + 8) % 8;
  }
  function applyPointer() {
    gaze.pointerDirty = false;
    if (!gaze.hasPointer || state.auto) return;
    const rect = stage.getBoundingClientRect();
    const dx = gaze.clientX - (rect.left + rect.width / 2);
    const dy = gaze.clientY - (rect.top + rect.height / 2);
    const sector = chooseSector(dx,dy,gaze.sector,Math.max(48,Math.min(rect.width,rect.height)*.18));
    if (sector !== gaze.sector) {
      gaze.sector = sector;
      setDirection(sector === -1 ? 'center' : sectorOrder[sector]);
    }
    gaze.targetX = clamp(dx / (rect.width*.62),-1,1);
    gaze.targetY = clamp(dy / (rect.height*.62),-1,1);
  }
  function gazeTick(ts) {
    gazeRAF = 0;
    if (!state.motion || document.hidden) return;
    if (gaze.pointerDirty && ts >= gaze.holdUntil) applyPointer();
    const dt = clamp(ts - (gaze.lastTime || ts),0,48);
    gaze.lastTime = ts;
    const alpha = 1 - Math.exp(-dt / 88);
    gaze.x += (gaze.targetX - gaze.x) * alpha;
    gaze.y += (gaze.targetY - gaze.y) * alpha;
    spriteLook.style.transform = 'translate3d(' + (gaze.x*4).toFixed(2) + 'px,' + (gaze.y*3).toFixed(2) + 'px,0) rotate(' + (gaze.x*1.15).toFixed(2) + 'deg)';
    if (gaze.pointerDirty || Math.abs(gaze.x-gaze.targetX)>.003 || Math.abs(gaze.y-gaze.targetY)>.003) startGaze();
  }
  function startGaze() {
    if (!gazeRAF && state.motion && !document.hidden) gazeRAF = requestAnimationFrame(gazeTick);
  }
  function updateTarget(clientX,clientY) {
    gaze.clientX = clientX;
    gaze.clientY = clientY;
    gaze.hasPointer = true;
    gaze.pointerDirty = true;
    startGaze();
  }
  window.addEventListener('pointermove',e => {
    if (e.pointerType === 'touch' || state.auto || document.body.classList.contains('modal-open') || performance.now() < gaze.holdUntil) return;
    state.x = e.clientX; state.y = e.clientY;
    state.lastPointer = Date.now(); state.initPointer = true;
    updateTarget(e.clientX,e.clientY);
  },{passive:true});
  const reaim = () => {
    if (!gaze.hasPointer || state.auto) return;
    gaze.pointerDirty = true;
    startGaze();
  };
  window.addEventListener('scroll',reaim,{passive:true});
  window.addEventListener('resize',reaim,{passive:true});
  window.addEventListener('pointerleave',() => {
    if (state.auto || performance.now() < gaze.holdUntil) return;
    gaze.hasPointer = false; gaze.pointerDirty = false; gaze.sector = -1;
    gaze.targetX = 0; gaze.targetY = 0;
    setDirection('center'); startGaze();
  });
  stage.addEventListener('click',randomReaction);
  stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();randomReaction();}});
  scene.addEventListener('keydown',e=>{if(e.target===scene&&(e.key==='Enter'||e.key===' ')){e.preventDefault();randomReaction();}});
  randomButton.addEventListener('click',randomReaction);
  $$('[data-reaction]').forEach(b=>b.addEventListener('click',()=>showReaction(b.dataset.reaction)));
  $$('[data-direction]').forEach(b=>b.addEventListener('click',()=>setDirection(b.dataset.direction,{manual:true})));
  autoToggle.addEventListener('click',()=>setAuto(!state.auto));
  motionToggle.addEventListener('click',()=>{
    state.motion=!state.motion;document.body.classList.toggle('motion-off',!state.motion);
    motionToggle.classList.toggle('is-on',state.motion);motionToggle.setAttribute('aria-checked',String(state.motion));
    if(!state.motion){cancelAnimationFrame(gazeRAF);gazeRAF=0;setFrame(requested);}
    else startGaze();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(gazeRAF);gazeRAF=0;}else{gaze.lastTime=0;startGaze();}});
  // No periodic full-face swap to simulate a blink: no blink asset exists.

  // Asset library controls
  const all=[...manifest.directions.map(x=>({...x,category:'directions'})),...manifest.reactions.map(x=>({...x,category:'reactions'}))];
  const gallery=$('#asset-gallery');
  const cardsRoot=$('#mood-showcase');
  manifest.reactions.forEach(item=>{
    const button=document.createElement('button');button.type='button';button.className='mood-card';
    button.innerHTML=`<img loading="lazy" src="${assetURL(item.path)}" alt="${item.label} ERA Lab mascot expression"><span>${item.label}</span>`;
    button.addEventListener('click',()=>{showReaction(item.id);document.getElementById('playground').scrollIntoView({behavior:reduceMotion?'instant':'smooth'});});
    cardsRoot.append(button);
  });
  function renderGallery() {
    const q=state.query.toLowerCase();
    const filtered=all.filter(x=>(state.mode==='all'||x.category===state.mode)&&(x.label.toLowerCase().includes(q)||x.category.includes(q)));
    $('#asset-counter').textContent=`${filtered.length} FRAME${filtered.length===1?'':'S'} SHOWN`;
    gallery.replaceChildren();
    if(!filtered.length){gallery.innerHTML='<div class="no-results">No frames found. Try another search.</div>';return;}
    const fragment=document.createDocumentFragment();
    filtered.forEach(item=>{
      const card=document.createElement('article');card.className='asset-card';
      const pic=document.createElement('button');pic.type='button';pic.className='asset-card-picture';pic.setAttribute('aria-label','Preview '+item.label);
      const img=document.createElement('img');img.loading='lazy';img.src=assetURL(item.path);img.alt=item.label+' mascot, original PNG frame';pic.append(img);
      pic.addEventListener('click',()=>openModal(item));
      const foot=document.createElement('div');foot.className='asset-card-foot';
      const title=document.createElement('span');title.textContent=item.label;
      const link=document.createElement('a');link.href=assetURL(item.path);link.download='era-lab-'+item.category+'-'+item.id+'.png';link.setAttribute('aria-label','Download '+item.label+' PNG');link.textContent='↓';
      foot.append(title,link);card.append(pic,foot);fragment.append(card);
    });
    gallery.append(fragment);
  }
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.filter;$$('[data-filter]').forEach(el=>el.classList.toggle('selected',el===b));renderGallery();}));
  $('#asset-search').addEventListener('input',e=>{state.query=e.target.value.trim();renderGallery();});
  renderGallery();
  const modal=$('#asset-modal'),modalImg=$('#modal-img'),modalPicture=$('.modal-picture');let previousFocus=null;
  function openModal(item) {
    previousFocus=document.activeElement;
    $('#modal-title').textContent=item.label+' · '+item.category;
    modalImg.src=assetURL(item.path);modalImg.alt=item.label+' original full-resolution transparent PNG';
    $('#modal-download').href=assetURL(item.path);$('#modal-download').download='era-lab-'+item.category+'-'+item.id+'.png';
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
    modalPicture.classList.remove('zoomed');$('#zoom-button').textContent='View at 1:1';$('#modal-close').focus();
  }
  function closeModal() {modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');if(previousFocus)previousFocus.focus();}
  $('#modal-close').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target.dataset.close)closeModal();});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal();});
  $('#zoom-button').addEventListener('click',()=>{const isZoom=modalPicture.classList.toggle('zoomed');$('#zoom-button').textContent=isZoom?'Fit to preview':'View at 1:1';});

  // Decode the sprites before they are displayed to prevent the first swap stuttering.
  for(const item of manifest.directions)preloadImage('directions:'+item.id);
  for(const item of manifest.reactions)preloadImage('reactions:'+item.id);
  window.ERA_MASCOT_DEBUG={setDirection,showReaction,setAuto,state,manifest,gaze,setFrame,preloaded,frameNodes,decoded,chooseSector};
})();
