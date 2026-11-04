/* Original recorded race music with live engine, tyres and interaction cues. */
(() => {
  'use strict';
  let ac, master, music, effects, motor, tires, wind, engineFilter, airFilter, windFilter, noiseBuffer;
  let crank,overtone,intakeGain,scrub,scrubGain,engineAir,pulse,brass,mallet,reed,grit;
  let muted = false, mediaOnly = false, smoothedSpeed = 0, lastMode = '', scoreVolume = 1;
  const level = 0.72;
  const freq = n => 440 * Math.pow(2, (n - 69) / 12);
  const clip = n => Math.max(0, Math.min(1, Number(n) || 0));
  const hidden = () => typeof document !== 'undefined' && document.hidden;
  const pitch = (p, v, t, smoothing) => p.setTargetAtTime(v, t, smoothing);

  function bus(to, gain = 1) {
    const node = ac.createGain();
    node.gain.value = gain;
    node.connect(to);
    return node;
  }
  function filter(type, hz, q = .65) {
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    return f;
  }
  function periodic(real, imag) {
    return ac.createPeriodicWave(new Float32Array(real), new Float32Array(imag));
  }
  function osc(shape, hz) {
    const o = ac.createOscillator();
    if (typeof shape === 'string') o.type = shape;
    else o.setPeriodicWave(shape);
    o.frequency.value = hz;
    return o;
  }
  function white(loop) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuffer;
    s.loop = loop;
    return s;
  }
  function applyMaster() {
    if (!ac) return;
    if(mediaOnly){if(playing)paintMedia(playing);if(outgoing)paintMedia(outgoing);return}
    const t = ac.currentTime;
    master.gain.cancelScheduledValues(t);
    pitch(master.gain, muted || hidden() ? 0 : level, t, .015);
  }
  function init() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if(Audio)try{ac=new Audio({latencyHint:'interactive'})}catch{ /* Try the native player below. */ }
    if(!ac){
      if(!window.Audio)return false;
      // Some embedded browsers provide an audio element but prohibit Web
      // Audio. Keep the recorded score and its fades available on that path.
      mediaOnly=true;ac={state:'running',get currentTime(){return performance.now()*.001}};
      observeVisibility();return true;
    }
    const limiter = ac.createDynamicsCompressor();
    // The recorded band is already balanced. Catch only the loudest sums
    // of music and nearby effects so light passages can keep their dynamics.
    limiter.threshold.value = -5;
    limiter.knee.value = 4;
    limiter.ratio.value = 6;
    limiter.attack.value = .005;
    limiter.release.value = .14;
    limiter.connect(ac.destination);
    master = bus(limiter, 0);
    music = bus(master, .83*scoreVolume);
    effects = bus(master, .92);
    const sampleCount = Math.ceil(ac.sampleRate * .72);
    noiseBuffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let seed = 36279;
    for (let i = 0; i < sampleCount; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 2147483648 - 1) * .75;
    }
    pulse = periodic([0,0,0,0,0,0,0,0], [0,1,.27,.19,.08,.09,.04,.035]);
    brass = periodic([0,0,0,0,0,0,0], [0,1,.5,.32,.17,.08,.025]);

    mallet=periodic([0,0,0,0,0,0,0],[0,1,.17,.035,.13,.022,.045]);
    reed=periodic([0,0,0,0,0,0,0],[0,1,.11,.29,.085,.045,.022]);
    grit=periodic([0,0,0,0,0,0,0,0],[0,1,.43,.31,.14,.18,.052,.037]);
    motor = bus(master, 0);
    engineFilter = filter('lowpass', 380);
    engineFilter.connect(motor);
    crank = osc(pulse, 52);
    overtone = osc(grit, 104);
    crank.connect(bus(engineFilter, .62));
    intakeGain=bus(engineFilter, .15);overtone.connect(intakeGain);
    crank.start(); overtone.start();
    airFilter = filter('bandpass', 1450, .72);
    tires = bus(master, 0);
    airFilter.connect(tires);
    scrub=osc('sine',640);scrubGain=bus(master,0);scrub.connect(scrubGain);scrub.start();
    engineAir = white(true);
    engineAir.connect(airFilter);
    windFilter=filter('highpass',2200,.6);wind=bus(master,0);
    engineAir.connect(windFilter);windFilter.connect(wind);engineAir.start();
    applyMaster();
    observeVisibility();
    return true;
  }
  function observeVisibility(){
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      applyMaster();
      if (hidden()) stopScore(true);
    });
  }

  function unlock() {
    try {
      if (!ac && !init()) return;
      if (ac.state === 'suspended' || ac.state === 'interrupted') {
        const resumed = ac.resume();
        if (resumed && resumed.catch) resumed.catch(() => {});
      }
      if(stagedMedia?.key===wanted&&!muted&&!hidden()&&ac.state==='running')streamScore(wanted);
      const voice=playing;
      if (voice?.media?.paused && !muted && !hidden() && voice.start<=ac.currentTime) {
        const p=voice.media.play();if(p?.catch)p.catch(()=>{});
      }
    } catch (_) { /* Audio can be unavailable in a silent web view. */ }
  }
  function mute(value) {
    if(muted===!!value)return muted;
    muted = !!value;
    if (muted && ac) stopScore(true,.07);
    applyMaster();
    return muted;
  }
  // A cluster of twelve racers can hit one blast. Cap temporary sources;
  // keep four slots available for the starting signal and player impacts.
  const sfxEnds=[];
  let cueLimit=16;
  function roomForEffect(until){
    const now=ac.currentTime;
    for(let i=sfxEnds.length-1;i>=0;i--)if(sfxEnds[i]<=now)sfxEnds.splice(i,1);
    if(sfxEnds.length>=cueLimit)return false;
    sfxEnds.push(until);return true;
  }
  function voice(hz, when, length, shape, amplitude, out, endHz, attack = .005) {
    if(out===effects&&!roomForEffect(when+length+.009))return;
    const wave = osc(shape, hz), env = bus(out, .0002);
    wave.frequency.setValueAtTime(hz, when);
    if (endHz) wave.frequency.exponentialRampToValueAtTime(endHz, when + length * .84);
    env.gain.setValueAtTime(.0002, when);
    env.gain.exponentialRampToValueAtTime(Math.max(.0003, amplitude), when + attack);
    env.gain.exponentialRampToValueAtTime(.0002, when + length);
    wave.connect(env);
    wave.onended = () => { wave.disconnect(); env.disconnect(); };
    wave.start(when); wave.stop(when + length + .008);
  }
  function note(midi, when, length, shape, amplitude, out = music) {
    voice(freq(midi), when, length, shape, amplitude, out);
  }
  function hiss(when, length, hz, amplitude, out, q = .8) {
    if(out===effects&&!roomForEffect(when+length+.008))return;
    const source = white(false), f = filter('bandpass', hz, q), env = bus(out, .0002);
    source.connect(f); f.connect(env);
    env.gain.setValueAtTime(.0002, when);
    env.gain.exponentialRampToValueAtTime(Math.max(.0003, amplitude), when + .003);
    env.gain.exponentialRampToValueAtTime(.0002, when + length);
    source.onended = () => { source.disconnect(); f.disconnect(); env.disconnect(); };
    source.start(when); source.stop(when + length + .006);
  }

  // The pit band is recorded offline. A whole arrangement loops on a single
  // source, so its percussion fills cost no additional race-time audio work.
  const recordings = Object.assign({},typeof RUBY_SCORE==='undefined'?{}:RUBY_SCORE,
    typeof RUBY_EXTRA_SCORE==='undefined'?{}:RUBY_EXTRA_SCORE);
  const raceKeys=[],finalKeys=[];
  for(const key of Object.keys(recordings)){
    if(!key.endsWith('race'))continue;
    const index=Number.parseInt(key,10);
    raceKeys[index]=key;finalKeys[index]=index+'final';
  }
  const decoded = new Map(), useMedia = new Set(), failedDecode = new Set(), liveVoices=new Set();
  // Decode the stereo score outside the device-rate engine context when
  // possible. A 96-second cue at 32 kHz uses ~23.4 MiB, at 48 kHz ~35.2 MiB.
  const pcmBudget=64*1024*1024;
  let decoder=null,podiumEnded=false,loadingAsset=null;
  let decoding = '', wanted = '', preload = '', playing = null, outgoing = null;
  let resumeKey = '', resumeOffset = 0, launchAt = null, stagedMedia=null;
  let starRoad=null,raceClock=0,raceSampleAt=0;
  const unavailableMedia=new Set();
  let lastMixGain = .83;
  function unpack(base64, ready, fail, stale=()=>false, abandoned=()=>{}) {
    // Deschedule conversion from the race frame. Older phones without the
    // native base64 API yield between slices instead of expanding a long string.
    const begin = () => {
      try {
        if(stale()){abandoned();return}
        if (Uint8Array.fromBase64) { ready(Uint8Array.fromBase64(base64).buffer); return; }
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const bytes = new Uint8Array(base64.length*3/4-padding);
        let read=0, written=0;
        function slice() {
          try {
            if(stale()){abandoned();return}
            const end=Math.min(read+65536,base64.length), piece=atob(base64.slice(read,end));
            for (let i=0; i<piece.length; i++) bytes[written++]=piece.charCodeAt(i);
            read=end;
            if (read<base64.length) setTimeout(slice,0); else ready(bytes.buffer);
          } catch (_) { fail(); }
        }
        slice();
      } catch (_) { fail(); }
    };
    setTimeout(begin,0);
  }
  function loadRecording(key,ready,fail,stale){
    const entry=recordings[key];
    if(entry[2]){unpack(entry[2],ready,fail,()=>hidden()||muted||key!==wanted&&key!==preload,stale);return}
    if(!entry[3]||typeof fetch!=='function'){fail();return}
    const request={key,abort:typeof AbortController==='function'?new AbortController():null};
    loadingAsset=request;
    fetch(entry[3],{credentials:'same-origin',mode:'same-origin',signal:request.abort?.signal})
      .then(response=>{if(!response.ok)throw Error('Audio asset');return response.arrayBuffer()})
      .then(bytes=>{if(loadingAsset===request)loadingAsset=null;ready(bytes)},()=>{
        if(loadingAsset===request)loadingAsset=null;
        if(request.abort?.signal.aborted)stale();else fail();
      });
  }
  function cancelUnusedLoad(){
    if(loadingAsset&&(hidden()||muted||loadingAsset.key!==wanted&&loadingAsset.key!==preload))loadingAsset.abort?.abort();
  }
  function position(v, time){
    const cursor=v.media && v.media.readyState>=2 && !v.media.paused?v.media.currentTime:
      v.offset+Math.max(0,time-v.start);
    return v.loop?cursor%v.duration:Math.min(v.duration,cursor);
  }
  // Record the envelopes we actually scheduled. A pause halfway through a
  // crossfade must fade from the two current levels, with no jump to full gain.
  function levelAt(v,time){
    const points=v.points;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(time<=b[0])return a[1]+(b[1]-a[1])*Math.max(0,(time-a[0])/(b[0]-a[0]||1));
    }
    return points[points.length-1][1];
  }
  function paintMedia(v){
    if(!v.direct)return;
    clearTimeout(v.volumeTimer);
    const now=ac.currentTime;
    v.media.volume=muted||hidden()?0:Math.min(1,levelAt(v,now)*lastMixGain*scoreVolume*level);
    if(now<v.points[v.points.length-1][0])v.volumeTimer=setTimeout(()=>paintMedia(v),24);
  }
  function fade(v,when,to,length,matched=false){
    const from=levelAt(v,when),p=v.env?.gain;
    // Three live-band arrangements share their performance between lap
    // versions. The other scores have separately performed layers, for
    // which a mostly equal-power handover keeps the center from dipping.
    const power=matched?(courseScore===0||courseScore===2||courseScore===5?0:.65):1;
    v.points=v.points.filter(pt=>pt[0]<when);
    v.points.push([when,from]);
    if(p){p.cancelScheduledValues(when);p.setValueAtTime(from,when)}
    for(let i=1;i<=8;i++){
      const u=i/8,t=when+length*u,s=Math.sin(Math.PI*.5*u),c=Math.cos(Math.PI*.5*u);
      const linear=from+(to-from)*u;
      const gain=i===8?to:linear+power*(Math.hypot(from*c,to*s)-linear);
      v.points.push([t,gain]);if(p)p.linearRampToValueAtTime(gain,t);
    }
    paintMedia(v);
  }
  function dispose(v){
    if(!v||v.closed)return;
    v.closed=true;clearTimeout(v.startTimer);clearTimeout(v.stopTimer);clearTimeout(v.volumeTimer);
    if(v.media){
      v.media.pause();v.media.onloadedmetadata=v.media.onended=v.media.onerror=null;
      if(v.media.removeAttribute){v.media.removeAttribute('src');v.media.load()}
    }
    if(v.url)URL.revokeObjectURL(v.url);
    if(v.source){v.source.onended=null;v.source.disconnect()}
    if(v.env)v.env.disconnect();
    liveVoices.delete(v);
    if(outgoing===v)outgoing=null;
    if(playing===v)playing=null;
    setTimeout(fetchScore,0);
  }
  function endVoice(v,when,length,matched=false){
    if(!v||v.closed)return;
    v.stopping=true;
    const now=ac.currentTime;
    if(v.start>=when&&levelAt(v,when)<.001){
      if(!v.media)try{v.source.stop(now)}catch{}
      dispose(v);return;
    }
    fade(v,when,0,length,matched);
    const end=when+length+.008;
    if(v.media){
      clearTimeout(v.stopTimer);
      v.stopTimer=setTimeout(()=>dispose(v),Math.max(0,end-now)*1000);
    }else v.source.stop(end);
  }
  function stopScore(remember,length=.12){
    const now=ac.currentTime;
    const audible=playing&&playing.start>now&&outgoing?outgoing:playing;
    if(remember&&audible){resumeKey=audible.key;resumeOffset=position(audible,now)}
    else if(!remember){resumeKey='';resumeOffset=0}
    const old=outgoing;outgoing=playing;playing=null;wanted='';
    endVoice(old,now,length);endVoice(outgoing,now,length);
    cancelUnusedLoad();
  }
  function transition(key,duration){
    const now=ac.currentTime,old=playing;
    let when=now+.018,offset=resumeKey===key?Math.min(resumeOffset,duration-.001):0,length=old ? .44 : .18;
    const regular=raceKeys[courseScore],final=finalKeys[courseScore],phaseKey=old?.key||resumeKey;
    if(starRoad&&starRoad.course===courseScore&&(key===regular||key===final)){
      // The race band keeps virtual time while the star band is out front.
      // Both lap arrangements share a bar grid, including a lap change here.
      const elapsed=raceClock-starRoad.clock+Math.max(0,when-raceSampleAt);
      offset=((starRoad.bars+elapsed/starRoad.bar)*recordings[key][1])%duration;
      length=.26;
    }else if(key==='star'){
      length=.13;
    }else if(key===final&&phaseKey===regular){
      const bar=recordings[regular][1],newBar=recordings[final][1];
      const cursor=old?position(old,when):resumeOffset;
      if(old){
        const next=Math.ceil(cursor/bar-1e-7);
        when+=Math.max(0,next*bar-cursor);offset=(next*newBar)%duration;
      }else offset=(cursor/bar*newBar)%duration;
      length=Math.min(.46,bar*.24);
    }else if(key===regular&&Number.isFinite(launchAt)&&resumeKey!==key){
      // GO is bar one of the written piece. A late decoder joins the same
      // transport instead of beginning a few notes into an arbitrary bar.
      when=Math.max(when,launchAt);offset=(when-launchAt)%duration;length=.045;
    }else if(key==='result'||key==='podium'){
      // Clear a little space after the line bell, then play the cue's own
      // opening and cadence. The podium is a concert ending, not a loop.
      when=now+.19;length=.10;
    }
    if(resumeKey===key)length=.18;
    return {when,offset,length};
  }
  function playScore(key,buffer,element){
    if(playing?.key===key)return;
    const media=!buffer;
    if(media&&!window.Audio)return;
    const duration=buffer?Math.min(buffer.duration,recordings[key][0]):recordings[key][0];
    const {when,offset,length}=transition(key,duration),now=ac.currentTime;
    const v={key,start:when,offset,duration,loop:key!=='podium',points:[[now,0]],env:null,media:null,source:null};
    liveVoices.add(v);
    const ended=()=>{
      if(v.key==='podium'&&!v.stopping&&playing===v)podiumEnded=true;
      dispose(v);
    };
    const env=v.env=mediaOnly?null:bus(music,0);
    if(media){
      const el=v.media=element;v.url=el.rubyURL;el.onended=ended;
      el.onerror=()=>{dispose(v);mediaError(key)};
      if(env){
        try{v.source=ac.createMediaElementSource(el);v.source.connect(env)}
        catch{env.disconnect();v.env=null}
      }
      if(!v.source){v.direct=true;el.volume=0}
      const start=()=>{
        if(v.closed)return;
        if(el.readyState>=1){
          const at=offset+Math.max(0,ac.currentTime-when);
          el.currentTime=v.loop?at%duration:Math.min(at,duration-.001);
        }
        const pending=el.play();if(pending?.catch)pending.catch(()=>{});
      };
      if(when-now>.04)v.startTimer=setTimeout(start,(when-now)*1000);else start();
    }else{
      const source=v.source=ac.createBufferSource();
      source.buffer=buffer;source.loop=v.loop;source.loopStart=0;source.loopEnd=duration;
      source.connect(env);source.onended=ended;source.start(when,offset);
    }
    // Rapid pause/restart can leave a previous tail sounding. Shorten it
    // gently and leave its onended handler responsible for disconnection.
    if(outgoing)endVoice(outgoing,now,.065);
    outgoing=playing;playing=v;
    // The finale shares the exact phase of most of the band. Complementary
    // gains keep these instruments at unity across the arrangement change.
    const matched=outgoing?.key===raceKeys[courseScore] && key===finalKeys[courseScore];
    if(outgoing){
      const launching=!starRoad&&key===raceKeys[courseScore]&&Number.isFinite(launchAt)&&resumeKey!==key;
      if(launching){
        const fadeStart=Math.max(now,when-.32);
        endVoice(outgoing,fadeStart,Math.max(.045,when-fadeStart+.022));
      }else endVoice(outgoing,when,length,matched);
    }
    fade(v,when,1,length,matched);
    if(starRoad&&(key===raceKeys[courseScore]||key===finalKeys[courseScore]))starRoad=null;
    resumeKey='';resumeOffset=0;
    setTimeout(fetchScore,0);
  }
  function discardMedia(){
    if(!stagedMedia)return;
    const el=stagedMedia.el;stagedMedia=null;
    el.oncanplay=el.onloadeddata=el.onerror=null;
    if(el.removeAttribute){el.removeAttribute('src');el.load()}
    if(el.rubyURL)URL.revokeObjectURL(el.rubyURL);
  }
  function mediaError(key){
    unavailableMedia.add(key);
    if(!failedDecode.has(key)){useMedia.delete(key);fetchScore()}
  }
  function prepareMedia(key){
    if(!window.Audio||unavailableMedia.has(key)||playing?.key===key)return;
    if(stagedMedia?.key!==key){
      discardMedia();
      const el=new window.Audio();stagedMedia={key,el};el.loop=key!=='podium';el.preload='auto';
      el.onloadeddata=el.oncanplay=()=>{if(wanted===key&&!muted&&!hidden()&&ac.state==='running')streamScore(key)};
      el.onerror=()=>{if(stagedMedia?.el===el)discardMedia();mediaError(key)};
      const entry=recordings[key],uri=entry[2];
      if(!uri&&entry[3])el.src=entry[3];
      else if(typeof URL!=='undefined'&&URL.createObjectURL&&typeof Blob!=='undefined'){
        // A blob avoids a second multi-megabyte data-URL string in the
        // fallback media decoder. Stale loads cannot land in a newer scene.
        unpack(uri,bytes=>{
          if(stagedMedia?.el!==el)return;
          el.rubyURL=URL.createObjectURL(new Blob([bytes],{type:'audio/mpeg'}));el.src=el.rubyURL;
        },()=>{if(stagedMedia?.el===el)el.src='data:audio/mpeg;base64,'+uri},()=>stagedMedia?.el!==el);
      }else el.src='data:audio/mpeg;base64,'+uri;
    }
    return stagedMedia?.el;
  }
  function streamScore(key){
    const el=prepareMedia(key);
    // Keep the previous arrangement audible until the decoder has playable
    // samples. Tiny native players without readiness events can start directly.
    if(!el||(el.addEventListener&&el.readyState<2))return;
    el.oncanplay=el.onloadeddata=el.onerror=null;stagedMedia=null;
    playScore(key,null,el);
  }
  function decodeBus(){
    if(decoder)return decoder;
    const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(Offline&&ac.sampleRate>32000){
      try{decoder=new Offline(2,1,32000)}catch{ /* Device-rate decoding still works. */ }
    }
    decoder=decoder||ac;return decoder;
  }
  function roomFor(key){
    // AudioBuffers are counted once, including voices that are fading out
    // after their key left the cache. Do not accumulate a PCM library during
    // a seven-course event. Long pieces can use the native streaming decoder.
    const buffers=new Set();
    for(const [id,buffer] of decoded){
      if(id==='star'||id===playing?.key||id===outgoing?.key||id===wanted||id===preload)buffers.add(buffer);
      else decoded.delete(id);
    }
    for(const voice of liveVoices)if(voice.source?.buffer)buffers.add(voice.source.buffer);
    let bytes=0;for(const b of buffers)bytes+=b.length*b.numberOfChannels*4;
    const required=Math.ceil(recordings[key][0]*decodeBus().sampleRate)*8;
    // Keep the short star cached across laps if there is room. A long finale
    // or the underlying course always wins the last few MiB on a small phone.
    const star=decoded.get('star');
    if(bytes+required>pcmBudget&&star&&wanted!=='star'&&preload!=='star'&&
        ![...liveVoices].some(v=>v.source?.buffer===star)){
      decoded.delete('star');bytes-=star.length*star.numberOfChannels*4;
    }
    return bytes+required<=pcmBudget;
  }
  function fetchScore() {
    if (decoding || muted || hidden() || wanted==='podium'&&podiumEnded) return;
    if(stagedMedia?.key===wanted&&playing?.key!==wanted)return;
    if(mediaOnly){
      if(wanted&&playing?.key!==wanted&&!unavailableMedia.has(wanted))streamScore(wanted);
      else if(preload&&preload!==wanted&&playing?.key===wanted)prepareMedia(preload);
      return;
    }
    // Decode at most one piece at once. Never allocate a PCM buffer for every course.
    const missing = k => k && recordings[k] && !decoded.has(k) && !useMedia.has(k);
    const key = missing(wanted) ? wanted : missing(preload) ? preload : '';
    if(!key){
      if(preload&&useMedia.has(preload)&&wanted!==preload&&playing?.key===wanted)prepareMedia(preload);
      return;
    }
    if(!roomFor(key)){
      if(window.Audio&&!unavailableMedia.has(key)){
        useMedia.add(key);
        if(key===wanted)streamScore(key);else prepareMedia(key);
        return;
      }
      // A device without a usable native player can free the old buffer
      // once its tail ends. Background preloading must never evict a song
      // under the listener or expand the PCM budget.
      if(key!==wanted)return;
      if(preload&&preload!==key)decoded.delete(preload);
      if(!roomFor(key)){
        if(playing&&playing.key!==key){
          if(outgoing)endVoice(outgoing,ac.currentTime,.045);
          outgoing=playing;playing=null;endVoice(outgoing,ac.currentTime,.18);
        }
        return;
      }
    }
    decoding=key;
    let settled=false;
    function done(buffer) {
      if (settled) return;
      settled=true; decoding='';
      if (buffer) {
        if (key===wanted || key===preload || key===resumeKey) {
          decoded.set(key,buffer);
          for (const cached of decoded.keys()) {
            if (decoded.size<=2) break;
            if (cached!==key && cached!==wanted) decoded.delete(cached);
          }
        }
      } else {failedDecode.add(key);useMedia.add(key)}
      if (key===wanted && !muted && !hidden() && ac.state==='running') {
        if (buffer) playScore(key,buffer); else streamScore(key);
      }
      fetchScore();
    }
    const abandoned=()=>{if(decoding===key)decoding='';fetchScore()};
    loadRecording(key, bytes => {
      if (muted || hidden() || (key!==wanted && key!==preload && key!==resumeKey)) {
        abandoned();return;
      }
      try {
        // Both callback-only Safari and promise-based implementations are supported.
        const pending=decodeBus().decodeAudioData(bytes,done,()=>done(null));
        if (pending?.then) pending.then(done,()=>done(null));
      } catch (_) { done(null); }
    },()=>done(null),abandoned);
  }
  function updateScore(mode, course, lap, laps, motion) {
    const racing=mode==='race',grid=mode==='countdown';
    const startIn=motion?.startIn,lastLap=lap>=laps,result=recordings.result?'result':'';
    if(grid)launchAt=Number.isFinite(startIn)?ac.currentTime+startIn:null;
    else if(mode!=='race')launchAt=null;
    if(mode!=='finish'&&mode!=='pause')podiumEnded=false;
    let target=racing?(lastLap?finalKeys[course]:raceKeys[course]):
      grid&&Number.isFinite(launchAt)?raceKeys[course]:
      grid?(playing?.key||'menu'):mode==='menu'?'menu':'';
    const raceKey=target,star=racing&&motion?.starRemaining>0&&recordings.star;
    if(racing){
      if(star&&!starRoad){
        const now=ac.currentTime,keys=[raceKeys[course],finalKeys[course]];
        const old=playing?.start>now&&outgoing?outgoing:playing;
        const current=old&&keys.includes(old.key)?old.key:keys.includes(resumeKey)?resumeKey:raceKey;
        const offset=old?.key===current?position(old,now):resumeKey===current?resumeOffset:raceClock;
        const bar=recordings[current]?.[1];
        if(bar)starRoad={course,clock:raceClock,bars:offset/bar,bar};
      }
      if(star)target='star';
      else if(playing?.key===raceKey&&resumeKey!=='star')starRoad=null;
    }
    if(mode==='finish'){
      if(motion?.cupFinal&&!motion?.podium)target=finalKeys[course];
      else target=motion?.podium&&recordings.podium?'podium':result;
    }
    if(target==='podium'&&podiumEnded)return;
    const warm=star?raceKey:racing&&motion?.holdingStar&&recordings.star?'star':mode==='menu'||grid?raceKeys[course]:
      racing&&!lastLap&&lap>=laps-1?finalKeys[course]:
      (racing&&lastLap||mode==='finish'&&motion?.cupFinal&&!motion?.podium)?
        (motion?.cupFinal&&recordings.podium?'podium':result):racing&&motion?.itemRace!==false&&recordings.star?'star':'';
    if(target===wanted&&warm===preload&&(!target||playing?.key===target||decoding))return;
    if(!target&&(playing||wanted))stopScore(mode==='pause',mode==='finish'?.85:.12);
    wanted=target||''; preload=warm||'';
    cancelUnusedLoad();
    if(stagedMedia&&stagedMedia.key!==wanted&&stagedMedia.key!==preload)discardMedia();
    if (wanted && decoded.has(wanted)) playScore(wanted,decoded.get(wanted));
    else if (wanted && (mediaOnly||useMedia.has(wanted))) streamScore(wanted);
    fetchScore();
  }

  let courseScore=0,lastMotorUpdate=-1,lastEngineOn=false,driveGear=0,rpm=54,load=0,slipVoice=0,shiftDrop=0,duckUntil=0;
  const tonalHome=[65,62,69,62,64,63,67],majorThird=[4,3,4,4,3,4,4];
  // Firing frequency (Hz), redline in road metres per second, and intake
  // brightness. The five engine classes have different exhaust registers.
  const engines={
    50:[44,132,28,.72],100:[48,154,36,.82],150:[52,178,42,.94],
    200:[59,201,51,1.06],250:[64,221,60,1.14]
  };
  const gearCuts=[.23,.425,.64,.835],cueTimes=new Map();
  const cueIntervals={hit:.16,hitPeel:.16,hitShell:.16,bump:.16,land:.13,warning:.48,overtake:.8,
    drift:.14,hop:.1,boost:.12,guard:.19,confirm:.18,fireball:.10,golden:.14,explode:.14,gridCharge:.22,gridReady:.24};
  function updateMotor(t,elapsed,speedRatio,racing,drift,motion={}){
    const profile=engines[motion.cc]||engines[150];
    const measured=Number.isFinite(motion.speedMS)?motion.speedMS/profile[2]:speedRatio;
    const speed=Math.max(0,Math.min(1.32,measured||0)),grounded=motion.grounded!==false;
    const brake=clip(motion.brake),boost=clip(motion.boostStrength);
    const gas=motion.throttle===undefined?1:Number(!!motion.throttle);
    const charge=motion.chargeHeld?clip(motion.launchCharge):0;
    smoothedSpeed+=(speed-smoothedSpeed)*(1-Math.exp(-elapsed*12));
    const prev=driveGear;
    if(racing){
      if(grounded){
        while(driveGear<4&&smoothedSpeed>gearCuts[driveGear]+.008)driveGear++;
        while(driveGear>0&&smoothedSpeed<gearCuts[driveGear-1]-.055)driveGear--;
      }
    }else driveGear=0;
    shiftDrop=Math.max(0,shiftDrop-elapsed*6.0);
    if(racing&&driveGear>prev)shiftDrop=1;
    const low=driveGear?gearCuts[driveGear-1]-.045:0,high=driveGear===4?1.13:gearCuts[driveGear];
    const travel=clip((smoothedSpeed-low)/(high-low));
    const bandLow=driveGear?.34+driveGear*.045:0,bandHigh=.70+driveGear*.073;
    const ratio=bandLow+(bandHigh-bandLow)*travel;
    const effort=racing?clip(gas*(.85-.65*brake)+boost*.32):charge*.92;
    load+=(effort-load)*(1-Math.exp(-elapsed*(effort>load?12:8)));
    const idle=profile[0],span=profile[1]-idle;
    const roadRev=grounded?ratio:Math.max(ratio,.20+gas*.51);
    const note=racing?idle+span*(roadRev*(.81+load*.19)+.075*load+.07*boost-.047*shiftDrop):idle+span*(.025+charge*.70);
    rpm+=(note-rpm)*(1-Math.exp(-elapsed*(note<rpm?17:11)));
    // Gentle firing irregularity is strongest at idle. The induction voice
    // becomes bright under power and recedes on lift-off, at the same speed.
    const hz=rpm+(1-.56*clip(smoothedSpeed))*(Math.sin(t*17.8)*.48+Math.sin(t*28.3)*.28);
    pitch(crank.frequency,hz,t,.025);pitch(overtone.frequency,hz*(2.009+.004*load),t,.027);
    pitch(intakeGain.gain,(.10+.34*load+.09*boost)*profile[3],t,.046);
    pitch(engineFilter.frequency,(370+smoothedSpeed*860+load*1060+boost*380)*profile[3],t,.050);
    pitch(motor.gain,(.117+.073*clip(smoothedSpeed)+.068*load+.010*boost)*(1-.28*shiftDrop),t,.042);
    const tire=clip(motion.driftBlend??drift),slip=clip(Math.abs(motion.slip||0)*1.85);
    const goal=grounded?clip(slip*.78+tire*.52+brake*smoothedSpeed*.22+(racing?0:charge*.88)):0;
    slipVoice+=(goal-slipVoice)*(1-Math.exp(-elapsed*(goal>slipVoice?14:7.4)));
    const ice=motion.surface==='ice',contactHz=(ice?2270:1240)+slipVoice*(ice?1680:860);
    pitch(airFilter.frequency,contactHz,t,.055);
    pitch(scrub.frequency,(ice?1040:590)+slipVoice*(ice?630:380)+13*Math.sin(t*43),t,.040);
    pitch(scrubGain.gain,racing||charge>0?slipVoice*slipVoice*(ice?.022:.034):0,t,.043);
    pitch(tires.gain,racing||charge>0?slipVoice*(ice?.145:.175):0,t,.050);
    pitch(windFilter.frequency,2450-clip(smoothedSpeed)*790,t,.11);
    pitch(wind.gain,racing?clip(smoothedSpeed)*clip(smoothedSpeed)*.044+boost*.019+(grounded?0:.042):0,t,.09);
  }
  function tick(dt, speedRatio, mode, driftAmount, courseIndex=0, lap=1, laps=3, motion) {
    if (!ac || ac.state !== 'running') return;
    const t=ac.currentTime,racing=mode==='race',engineOn=racing||mode==='countdown';
    if(starRoad&&(starRoad.course!==courseIndex||!racing&&mode!=='pause'))starRoad=null;
    if(racing){
      raceClock=Number.isFinite(motion?.raceTime)?motion.raceTime:
        raceClock+(lastMode==='race'?Math.max(0,t-raceSampleAt):0);
    }else if(mode!=='pause')raceClock=0;
    raceSampleAt=t;
    if(mode!==lastMode){
      if(mode==='countdown'&&lastMode!=='pause'||racing&&lastMode!=='countdown'&&lastMode!=='pause'){
        driveGear=0;rpm=(engines[motion?.cc]||engines[150])[0];load=0;smoothedSpeed=0;slipVoice=0;shiftDrop=0;duckUntil=0;
        if(mode==='countdown'){resumeKey='';resumeOffset=0;launchAt=null}
      }
      lastMode=mode;
    }
    if(muted||hidden()){lastMotorUpdate=-1;return}
    courseScore=courseIndex;
    updateScore(mode,courseIndex,lap,laps,motion);
    const mixGain=(mode==='countdown'?.52:mode==='menu'?.85:
      mode==='finish'&&motion?.cupFinal&&!motion?.podium?.46:mode==='finish'?.93:.87)*(t<duckUntil?.88:1);
    if(mixGain!==lastMixGain){
      lastMixGain=mixGain;
      if(!mediaOnly)pitch(music.gain,mixGain*scoreVolume,t,t<duckUntil?.075:racing?.23:.14);
      if(playing?.direct)paintMedia(playing);if(outgoing?.direct)paintMedia(outgoing);
    }
    if(mediaOnly||t-lastMotorUpdate<1/30-.001&&lastMotorUpdate>=0&&engineOn===lastEngineOn)return;
    if(engineOn)updateMotor(t,lastMotorUpdate<0?.035:Math.min(.10,t-lastMotorUpdate),speedRatio,racing,clip(driftAmount),motion||{});
    else if(lastEngineOn||lastMotorUpdate<0){
      for(const gain of [motor,tires,scrubGain,wind])pitch(gain.gain,0,t,.042);
    }
    lastEngineOn=engineOn;lastMotorUpdate=t;
  }

  function event(name) {
    if (!ac || muted || hidden() || ac.state !== 'running') return;
    if(mediaOnly){
      if(name==='start'){launchAt=null;podiumEnded=false;resumeKey='';resumeOffset=0;
        if(playing?.key===raceKeys[courseScore]||playing?.key===finalKeys[courseScore])stopScore(false,.18);
      }else if(name==='go'&&!Number.isFinite(launchAt))launchAt=ac.currentTime;
      return;
    }
    const t=ac.currentTime+.006;
    cueLimit=(name==='go'||name==='finish'||name==='rescue'||name==='gridReady'||name.startsWith('hit'))?20:16;
    const interval=cueIntervals[name];
    if(interval&&t-(cueTimes.get(name)??-10)<interval)return;
    if(interval)cueTimes.set(name,t);
    if(name==='boost'||name==='hit'||name==='rescue'||name==='finish')duckUntil=Math.max(duckUntil,t+.25);
    const beep = (m,offset,length=.11,vol=.2,type='triangle') =>
      note(m,t+offset,length,type,vol,effects);
    const run = (notes,gap,length,type,vol=.18) =>
      notes.forEach((m,i) => beep(m,i*gap,length,vol,type));
    const root=tonalHome[courseScore]||65,third=majorThird[courseScore]||4;
    switch (name) {
      case 'gridCharge': voice(82,t,.085,grit,.12,effects,139);break;
      case 'gridReady': beep(root+19,0,.062,.12,mallet);beep(root+24,.052,.13,.13,mallet);break;
      case 'hop': voice(122,t,.083,grit,.17,effects,68);hiss(t+.021,.068,1570,.115,effects,.65);break;
      case 'drift': hiss(t,.19,2470,.17,effects,.96);voice(735,t,.15,'sine',.07,effects,530);break;
      case 'mini1':case 'mini2':case 'mini3':{
        const tier=Number(name.at(-1)),duration=.18+tier*.038;
        hiss(t,duration,1000+220*tier,.21,effects,.75);
        voice(102+tier*12,t,duration,grit,.18,effects,235+tier*65);
        beep(root+12+5*tier,.038,.10,.078,mallet);
        if(tier===3)beep(root+31,.13,.15,.092,mallet);break;
      }
      case 'green': voice(328,t,.14,reed,.16,effects,136);hiss(t+.012,.13,1920,.12,effects,.86);break;
      case 'spiny': voice(225,t,.23,grit,.13,effects,530);voice(882,t+.045,.19,'triangle',.09,effects,410);hiss(t,.16,1770,.12,effects);break;
      case 'bomb': voice(103,t,.12,'triangle',.22,effects,54);hiss(t+.068,.20,3480,.085,effects,1.5);break;
      case 'golden': beep(root+19,0,.072,.13,mallet);beep(root+24,.045,.13,.11,mallet);hiss(t,.16,1330,.17,effects);break;
      case 'guard': voice(640,t,.12,mallet,.115,effects,218);hiss(t,.062,2600,.085,effects,1.05);break;
      case 'confirm': beep(root+24,0,.07,.13,mallet);beep(root+19,.052,.14,.12,reed);break;
      case 'hitPeel':voice(920,t,.20,'sine',.12,effects,268);hiss(t+.025,.19,1480,.17,effects,.67);break;
      case 'hitShell':voice(174,t,.15,grit,.22,effects,60);hiss(t,.13,2270,.23,effects,1.2);break;
      case 'select': beep(77,0,.055,.14); beep(84,.043,.09,.10); break;
      case 'start': launchAt=null;podiumEnded=false;resumeKey='';resumeOffset=0;
        if(playing?.key===raceKeys[courseScore]||playing?.key===finalKeys[courseScore])stopScore(false,.18);
        hiss(t,.12,890,.12,effects,.64);break;
      case 'count': voice(557,t,.13,'triangle',.12,effects,540,.009);break;
      case 'go': if(!Number.isFinite(launchAt))launchAt=ac.currentTime;
        voice(1080,t,.23,'triangle',.16,effects,1103,.011);break;
      case 'coin': beep(88,0,.09,.27,'sine'); beep(95,.058,.27,.22,pulse); break;
      case 'box': run([78,83,86,90],.052,.095,'triangle'); break;
      case 'item': beep(root+12,0,.08,.11,mallet);beep(root+19,.065,.14,.13,mallet);break;
      case 'spark1': beep(84,0,.075,.105,'sine');beep(91,.033,.10,.075,'sine');break;
      case 'spark2': beep(88,0,.065,.090,'triangle');beep(95,.041,.12,.09,'sine');break;
      case 'spark3': run([88,93,100],.031,.125,'sine',.087);break;
      case 'trick': run([79,86,91],.047,.125,mallet,.105);break;
      case 'boost': hiss(t,.24,1160,.23,effects,.70);voice(116,t,.21,grit,.18,effects,305);voice(316,t+.055,.12,'triangle',.065,effects,228);break;
      case 'shell': voice(190,t,.19,reed,.15,effects,730);hiss(t+.015,.19,2360,.15,effects,.9);break;
      case 'banana': voice(450,t,.105,'triangle',.12,effects,170);voice(115,t+.052,.08,'sine',.10,effects,54);break;
      case 'mushroom': run([67,74,79],.038,.10,mallet,.10);hiss(t,.17,1260,.17,effects);break;
      case 'star': run([83,88],.052,.12,'triangle',.085);break;
      case 'fireball': hiss(t,.095,1630,.10,effects,.8);voice(390,t,.12,'triangle',.08,effects,135);break;
      case 'horn': voice(261,t,.31,brass,.16,effects,228);voice(392,t+.026,.26,brass,.11,effects,348);break;
      case 'lightning': hiss(t,.19,3950,.22,effects,.78);voice(592,t,.19,'sawtooth',.085,effects,76);break;
      case 'explode': hiss(t,.28,820,.22,effects);voice(110,t,.3,grit,.18,effects,38);break;
      case 'warning': beep(86,0,.065,.10,'sine');beep(89,.085,.065,.10,'sine');break;
      case 'overtake': hiss(t,.14,1850,.12,effects,1.2);voice(193,t,.115,'triangle',.06,effects,115);break;
      case 'bump': voice(154,t,.086,'triangle',.18,effects,67);hiss(t,.047,900,.14,effects);break;
      case 'rescue': voice(164,t,.24,'sine',.18,effects,72);run([72,67],.092,.16,reed,.12);break;
      case 'lap':
        // A short timing-gate doublet reads above the tyres without imposing
        // a chord on a bridge or key change in the recorded band.
        hiss(t,.063,3900,.11,effects,1.8);hiss(t+.11,.095,4900,.12,effects,2.4);break;
      case 'finish':
        hiss(t,.26,1650,.10,effects,.75);
        if(!recordings.result&&!recordings.podium){
          [7,12,12+third,14,12].forEach((n,i)=>beep(root+n,.22+i*.15,.31,brass,.13));
          [root-12,root-12+third,root-5,root].forEach(n=>beep(n,.90,.78,.084,'triangle'));
        }break;
      case 'hit': hiss(t,.12,1140,.31,effects);voice(165,t,.17,grit,.24,effects,51);voice(58,t+.028,.12,'sine',.17,effects,44);break;
      case 'jump': voice(265,t,.22,'triangle',.19,effects,710); break;
      case 'land': voice(124,t,.092,'triangle',.19,effects,56);voice(94,t+.053,.072,'sine',.085,effects,54);hiss(t,.072,courseScore===3||courseScore===6?2450:930,.105,effects);break;
    }
  }
  function setMusicVolume(value) {
    scoreVolume=clip(value);
    if(!ac)return;
    if(music)pitch(music.gain,lastMixGain*scoreVolume,ac.currentTime,.065);
    if(playing?.direct)paintMedia(playing);
    if(outgoing?.direct)paintMedia(outgoing);
  }
  window.KartAudio = {unlock, mute, event, tick, setMusicVolume};
})();
