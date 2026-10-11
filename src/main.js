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
  // Reference: nilbuild/page-mascot (MIT). Two persistent 3x3 sprite
  // sheets follow the pointer. The hoodie is one immutable third layer.
  const state = {wantedDirection:'center', reaction:null, auto:false, motion:true, lastPointer:Date.now(), mode:'all', query:'', activeFrame:'directions:center', x:0, y:0, initPointer:false};
  const stage=$('#mascot-stage'), scene=$('#play-scene'), speech=$('#scene-speech'), status=$('#direction-status');
  const directionSheet=$('#mascot-directions');
  const reactionLayers=[$('#mascot-reactions'),$('#mascot-reactions-next')];
  const headTrack=$('.mascot-head-track');
  let activeReactionLayer=-1, headAnimation=null;
  const randomButton=$('#random-button'), autoToggle=$('#auto-toggle'), motionToggle=$('#motion-toggle');
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduceMotion){state.motion=false;motionToggle.classList.remove('is-on');motionToggle.setAttribute('aria-checked','false');document.body.classList.add('motion-off');}
  const speechMap={calm:'Ah, a peaceful moment ☁',joy:'This made my day! ✦',surprised:'Oh! You caught me!',excited:'That is SO cool! ✨',curious:'Hmm… interesting. 🤔',sleepy:'Five more minutes… 💤',thinking:'Let me think about that.',love:'Sending some love! 💕',victory:'Yes! We did it! 🚀'};
  let reactionTimer=0,bubbleTimer=0,autoTimer=0;
  const order={directions:manifest.directions.map(x=>x.id),reactions:manifest.reactions.map(x=>x.id)};
  function cellPosition(index){return `${(index%3)*50}% ${Math.floor(index/3)*50}%`;}
  function setFrame(key){
    const [kind,id]=key.split(':');
    const index=order[kind]?.indexOf(id)??-1;
    if(index<0)return;
    if(kind==='directions'){
      directionSheet.style.backgroundPosition=cellPosition(index);
      directionSheet.classList.remove('is-muted');
      // The torso and stage never move. Fade out whichever expression layers
      // are visible; the directional head stays mounted beneath them.
      reactionLayers.forEach(layer=>layer.classList.remove('is-visible'));
      // Keep the last buffer index so a quick new reaction uses the other
      // (already hidden) sprite layer instead of mutating a fading frame.
    }else{
      if(state.activeFrame!==key){
        // Double-buffer the reaction atlas. Updating backgroundPosition on the
        // currently visible layer was causing a second hard snap when users
        // clicked different expressions in quick succession.
        const next=activeReactionLayer===0?1:0;
        const layer=reactionLayers[next];
        layer.style.backgroundPosition=cellPosition(index);
        layer.style.zIndex='2';
        if(activeReactionLayer!==-1){
          const previous=reactionLayers[activeReactionLayer];
          previous.style.zIndex='1';
          previous.classList.remove('is-visible');
        }
        directionSheet.classList.add('is-muted');
        layer.classList.add('is-visible');
        activeReactionLayer=next;
      }
    }
    state.activeFrame=key;
  }
  // The page-mascot reference keeps its parent button stationary and animates
  // an inner span. The old stage.animate(scale) replaced the CSS translate()
  // used to center the entire ERA character, moving it by half its width.
  const SQUASH=[
    {transform:'scale(1,1)',easing:'ease-out'},
    {transform:'scale(1.025,.975)',offset:.22,easing:'ease-out'},
    {transform:'scale(.99,1.015)',offset:.57,easing:'ease-in-out'},
    {transform:'scale(1,1)'}
  ];
  function boop(){
    if(!state.motion || typeof headTrack.animate!=='function')return;
    if(headAnimation)headAnimation.cancel();
    // ONLY animate the head layer: never animate #mascot-stage or #mascot-body.
    headAnimation=headTrack.animate(SQUASH,{duration:320,easing:'linear'});
  }
  function say(txt,duration=1400){
    clearTimeout(bubbleTimer);speech.textContent=txt;
    if(duration)bubbleTimer=setTimeout(()=>{if(!state.reaction)speech.textContent='Move your cursor. I\'ll follow! ✦';},duration);
  }
  let markedDirection='center';
  function markDirection(dir){
    if(markedDirection===dir){status.textContent='LOOKING · '+dir.toUpperCase().replaceAll('-',' ');return;}
    markedDirection=dir;
    $$('[data-direction]').forEach(b=>b.classList.toggle('active',b.dataset.direction===dir));
    status.textContent='LOOKING · '+dir.toUpperCase().replaceAll('-',' ');
  }
  function setDirection(dir,{manual=false}={}){
    if(!D.has(dir))return;
    state.wantedDirection=dir;
    markDirection(dir);
    if(manual){clearAuto();pointerHoldUntil=performance.now()+950;say('Looking '+dir.replaceAll('-',' ')+' ✳',750);}
    if(!state.reaction)setFrame('directions:'+dir);
  }
  function showReaction(id,{fromAuto=false}={}){
    if(!R.has(id))return;
    if(!fromAuto)clearAuto();
    clearTimeout(reactionTimer);
    state.reaction=id;
    setFrame('reactions:'+id);
    $$('[data-reaction]').forEach(b=>b.classList.toggle('selected',b.dataset.reaction===id));
    say(speechMap[id],0);
    boop();
    status.textContent='FEELING · '+id.toUpperCase();
    reactionTimer=setTimeout(()=>{
      state.reaction=null;
      $$('[data-reaction]').forEach(b=>b.classList.remove('selected'));
      setFrame('directions:'+state.wantedDirection);
      markDirection(state.wantedDirection);
      say('Move your cursor. I\'ll follow! ✦',0);
    },id==='sleepy'?2200:1550);
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

  // Direct port of the page-mascot angular-sector selection mechanics.
  const CLOCKWISE=['right','down-right','down','down-left','left','up-left','up','up-right'];
  const SECTOR=Math.PI*2/CLOCKWISE.length;
  const HYSTERESIS=.12;
  const DEAD_ZONE=70;
  let pointer=null,sector=-1,pointerHoldUntil=0;
  function wrap(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
  function chooseDirection(dx,dy,current){
    // Keep the center pose stable within the dead zone.
    if(Math.hypot(dx,dy)<DEAD_ZONE)return {direction:'center',sector:-1};
    const angle=Math.atan2(dy,dx);
    if(current!==-1&&Math.abs(wrap(angle-current*SECTOR))<SECTOR/2+HYSTERESIS)
      return {direction:CLOCKWISE[current],sector:current};
    const chosen=(Math.round(angle/SECTOR)+CLOCKWISE.length)%CLOCKWISE.length;
    return {direction:CLOCKWISE[chosen],sector:chosen};
  }
  function aim(){
    if(!pointer||state.auto||performance.now()<pointerHoldUntil||document.body.classList.contains('modal-open'))return;
    const box=stage.getBoundingClientRect();
    const dx=pointer.x-(box.left+box.width/2);
    const dy=pointer.y-(box.top+box.height/2);
    const chosen=chooseDirection(dx,dy,sector);
    sector=chosen.sector;
    if(chosen.direction!==state.wantedDirection)setDirection(chosen.direction);
  }
  window.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch')return;
    pointer={x:event.clientX,y:event.clientY};
    state.lastPointer=Date.now();
    aim();
  },{passive:true});
  window.addEventListener('scroll',aim,{passive:true});
  window.addEventListener('resize',aim,{passive:true});
  window.addEventListener('pointerleave',()=>{
    if(!state.auto){pointer=null;sector=-1;setDirection('center');}
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
    if(!state.motion && headAnimation){headAnimation.cancel();headAnimation=null;}
    // Motion setting also disables sprite fades without moving the stage.
  });
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

  window.ERA_MASCOT_DEBUG={setDirection,showReaction,setAuto,state,manifest,setFrame,chooseDirection,aim};
})();
