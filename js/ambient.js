(function () {
  "use strict";

  const STORAGE_VOL = "cc-music-volume";
  const STORAGE_MUTED = "cc-music-muted";

  const player = document.getElementById("ambientPlayer");
  const toggleBtn = document.getElementById("ambientToggle");
  const volumeSlider = document.getElementById("ambientVolume");
  if (!player || !toggleBtn || !volumeSlider) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    player.style.display = "none";
    return;
  }

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // --- Preferences -------------------------------------------------------
  let muted = localStorage.getItem(STORAGE_MUTED) === "true";
  const savedVol = parseFloat(localStorage.getItem(STORAGE_VOL));
  let volume = Number.isFinite(savedVol) ? clamp(savedVol, 0, 1) : 0.5;

  // --- Audio graph -------------------------------------------------------
  let ctx = null;
  let masterGain = null;
  let dryGain = null;
  let wetGain = null;
  let reverb = null;
  let droneNodes = [];
  let droneSwell = null;
  let started = false; // graph built + scheduler running
  let schedulerId = null;
  let startTime = 0;

  // Japanese "Yo" pentatonic scale (serene, cherry-blossom feel)
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const ROOT = 62; // D4
  const SCALE_STEPS = [0, 2, 5, 7, 9]; // major pentatonic / yo scale
  const scale = [];
  for (let oct = -1; oct <= 1; oct += 1) {
    SCALE_STEPS.forEach((step) => scale.push(midiToFreq(ROOT + step + oct * 12)));
  }
  scale.sort((a, b) => a - b);

  // Slow harmonic progression so every layer shares a key centre (film-score cohesion).
  // Open-fifth roots that all land on scale tones — D, G, A — so nothing clashes.
  const PROG = [0, 5, 7, 0, 7, 5];
  const CHORD_DUR = 13; // seconds each harmonic centre is held
  const rootSemiAt = (time) => {
    const idx = Math.floor((time - startTime) / CHORD_DUR);
    return PROG[((idx % PROG.length) + PROG.length) % PROG.length];
  };
  // Consonant chord/extension tones (root, 5th, 8ve, 9th, 12th) — all in the pentatonic.
  const chordTones = (rootMidi) => [0, 7, 12, 14, 19].map((s) => midiToFreq(rootMidi + s));

  // Build a smooth artificial reverb impulse response
  const buildImpulse = (seconds, decay) => {
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * seconds);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch += 1) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  };

  const buildGraph = () => {
    ctx = new AudioCtx();

    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    masterGain.connect(ctx.destination);

    dryGain = ctx.createGain();
    dryGain.gain.value = 0.85;
    dryGain.connect(masterGain);

    reverb = ctx.createConvolver();
    reverb.buffer = buildImpulse(3.2, 2.4);
    wetGain = ctx.createGain();
    wetGain.gain.value = 0.55;
    reverb.connect(wetGain).connect(masterGain);

    startDrone();
  };

  const sendTo = (node) => {
    node.connect(dryGain);
    node.connect(reverb);
  };

  // Soft sustained drone (root + fifth, slowly breathing)
  const startDrone = () => {
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.0001;
    droneGain.connect(dryGain);
    droneGain.connect(reverb);
    droneGain.gain.setTargetAtTime(0.05, ctx.currentTime, 6);
    droneSwell = droneGain;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 700;
    lowpass.connect(droneGain);

    // Slow filter sweep for a living, breathing pad
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(lowpass.frequency);
    lfo.start();

    const freqs = [midiToFreq(ROOT - 12), midiToFreq(ROOT - 5), midiToFreq(ROOT - 24)];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? "sine" : "triangle";
      osc.frequency.value = f;
      osc.detune.value = (i - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.5 : 0.32;
      osc.connect(g).connect(lowpass);
      osc.start();
      droneNodes.push(osc);
    });
    droneNodes.push(lfo);
  };

  // Shakuhachi-style flute note: breathy, gentle vibrato
  const playFlute = (freq, time, dur) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 5 + Math.random();
    vibratoGain.gain.value = freq * 0.006;
    vibrato.connect(vibratoGain).connect(osc.frequency);
    vibrato.start(time);
    vibrato.stop(time + dur + 0.2);

    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2200;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(0.16, time + 0.35);
    env.gain.setValueAtTime(0.16, time + dur * 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(tone).connect(env);
    sendTo(env);
    osc.start(time);
    osc.stop(time + dur + 0.1);

    // a whisper of breath at the attack
    const noiseLen = Math.floor(ctx.sampleRate * 0.4);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i += 1) nd[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = freq * 2;
    nFilter.Q.value = 0.8;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.012, time);
    nGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
    noise.connect(nFilter).connect(nGain);
    sendTo(nGain);
    noise.start(time);
    noise.stop(time + 0.4);
  };

  // Koto-style pluck: quick attack, gentle decay
  const playKoto = (freq, time) => {
    [1, 2].forEach((mult, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.value = freq * mult;
      const env = ctx.createGain();
      const peak = idx === 0 ? 0.14 : 0.05;
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(peak, time + 0.01);
      env.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
      osc.connect(env);
      sendTo(env);
      osc.start(time);
      osc.stop(time + 1.7);
    });
  };

  // Glassy bell / wind-chime: glistening high harmonic, long shimmer
  const playBell = (freq, time) => {
    const partials = [
      { mult: 1, gain: 0.05, decay: 3.2 },
      { mult: 2.01, gain: 0.03, decay: 2.4 },
      { mult: 3.02, gain: 0.018, decay: 1.8 },
    ];
    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * p.mult;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.exponentialRampToValueAtTime(p.gain, time + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, time + p.decay);
      osc.connect(env);
      sendTo(env);
      osc.start(time);
      osc.stop(time + p.decay + 0.1);
    });
  };

  // Warm orchestral-ish pad: smooth open-fifth swell that lifts the whole bed
  const playPad = (freq, time, dur) => {
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(650, time);
    tone.frequency.linearRampToValueAtTime(1250, time + dur * 0.5);
    tone.frequency.linearRampToValueAtTime(650, time + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(0.06, time + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    tone.connect(env);
    sendTo(env);

    // Open fifths only (no third) — soft, filmic, never clashes with the melody
    [0, 7, 12].forEach((semi, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "triangle" : "sine";
      osc.frequency.value = freq * Math.pow(2, semi / 12);
      osc.detune.value = (i - 1) * 5;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.5 : 0.32;
      osc.connect(g).connect(tone);
      osc.start(time);
      osc.stop(time + dur + 0.3);
    });
  };

  // Synth bass — round, present, gently moving. Two stacked sines + soft saturation.
  const bassBus = () => {
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowpass";
    shelf.frequency.value = 320;
    shelf.connect(dryGain);
    return shelf;
  };
  const playSubBass = (freq, time, dur) => {
    const out = bassBus();
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(0.16, time + Math.min(0.25, dur * 0.3));
    env.gain.setValueAtTime(0.16, time + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    env.connect(out);

    [1, 2].forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 1 : 0.22;
      osc.connect(g).connect(env);
      osc.start(time);
      osc.stop(time + dur + 0.15);
    });
  };

  // Soft felted low kick — round and audible, with a sub-thump body. No click.
  const playKick = (time, level) => {
    const out = bassBus();

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.13);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(level, time + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    osc.connect(env).connect(out);
    osc.start(time);
    osc.stop(time + 0.55);

    // Sustained sub body so it reads on small speakers
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 48;
    const subEnv = ctx.createGain();
    subEnv.gain.setValueAtTime(0.0001, time);
    subEnv.gain.exponentialRampToValueAtTime(level * 0.8, time + 0.03);
    subEnv.gain.exponentialRampToValueAtTime(0.0001, time + 0.45);
    sub.connect(subEnv).connect(out);
    sub.start(time);
    sub.stop(time + 0.5);
  };

  // "dun dun (breathe) dun dun"
  const playKickPhrase = (time, level) => {
    playKick(time, level);
    playKick(time + 0.42, level * 0.9);
    playKick(time + 1.55, level);
    playKick(time + 1.97, level * 0.9);
  };

  // --- Generative scheduler ---------------------------------------------
  const STEP = 1.15; // seconds between possible note events
  const LOOKAHEAD = 2.0;
  let nextStepTime = 0;
  let lastIndex = Math.floor(scale.length / 2);
  let lastKickTime = -100;

  // Slow swell 0..1..0 over a long cycle — the build-up and release arc
  const CYCLE = 120; // seconds for a full rise and fall
  const getIntensity = (time) => {
    const elapsed = time - startTime;
    const phase = (elapsed % CYCLE) / CYCLE;
    const swell = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    return 0.12 + 0.88 * swell;
  };

  const nextScaleIndex = () => {
    // small melodic step for a flowing line
    const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)];
    lastIndex = clamp(lastIndex + move, 0, scale.length - 1);
    return lastIndex;
  };

  let lastPadRoot = -1;
  let lastBassTime = -100;

  const scheduleStep = (time) => {
    const I = getIntensity(time);
    const rootSemi = rootSemiAt(time);

    // The drone bed and reverb gently swell with the build-up
    if (droneSwell) droneSwell.gain.setTargetAtTime(0.05 + I * 0.06, time, STEP);
    if (wetGain) wetGain.gain.setTargetAtTime(0.42 + I * 0.16, time, STEP);

    // Pad chord — re-voiced on each harmonic change so the bed always agrees
    if (rootSemi !== lastPadRoot && I > 0.32) {
      lastPadRoot = rootSemi;
      playPad(midiToFreq(ROOT - 12 + rootSemi), time, CHORD_DUR + 2);
    }

    // Synth bass — round and steady, follows the harmonic root (the part you like)
    const bassGap = I > 0.55 ? 1.6 : 2.8;
    if (time - lastBassTime > bassGap && Math.random() < 0.6 + I * 0.3) {
      lastBassTime = time;
      playSubBass(midiToFreq(ROOT - 24 + rootSemi), time, 2.4 + Math.random() * 1.6);
    }

    // Core shakuhachi line — always present, a touch denser as it builds
    if (Math.random() < 0.5 + I * 0.18) {
      playFlute(scale[nextScaleIndex()], time, 1.6 + Math.random() * 1.8);
      if (Math.random() < 0.25 + I * 0.3) {
        playFlute(scale[nextScaleIndex()], time + 0.6, 1 + Math.random());
      }
    }

    // Koto plucks weave underneath
    if (Math.random() < 0.2 + I * 0.15) {
      playKoto(scale[nextScaleIndex()], time + Math.random() * 0.3);
    }

    // Glassy bells shimmer in from mid intensity — locked to chord tones
    if (I > 0.4 && Math.random() < (I - 0.4) * 0.6) {
      const tones = chordTones(ROOT + 12 + rootSemi);
      playBell(tones[Math.floor(Math.random() * tones.length)], time + Math.random() * 0.4);
    }

    // Climax: soft low kick "dun dun (breathe) dun dun", spaced out
    if (I > 0.7 && time - lastKickTime > 8) {
      playKickPhrase(time + 0.2, 0.6 + (I - 0.7) * 0.5);
      lastKickTime = time;
    }
  };

  const runScheduler = () => {
    while (nextStepTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(nextStepTime);
      nextStepTime += STEP * (0.85 + Math.random() * 0.4);
    }
  };

  // --- Volume / playback control ----------------------------------------
  let ducked = false; // softened while the welcome voice is speaking
  const applyVolume = () => {
    if (!masterGain) return;
    const base = muted ? 0.0001 : clamp(volume, 0.0001, 1) * 0.6;
    const target = base * (ducked ? 0.28 : 1);
    masterGain.gain.setTargetAtTime(target, ctx.currentTime, ducked ? 0.25 : 0.4);
  };

  window.addEventListener("cc:speech-start", () => {
    ducked = true;
    applyVolume();
  });
  window.addEventListener("cc:speech-end", () => {
    ducked = false;
    applyVolume();
  });

  const startMusic = () => {
    if (started) {
      applyVolume();
      return;
    }
    started = true;
    buildGraph();
    startTime = ctx.currentTime + 0.4;
    nextStepTime = startTime;
    runScheduler();
    schedulerId = window.setInterval(runScheduler, 250);
    applyVolume();
  };

  const ensureRunning = () => {
    if (!ctx) {
      startMusic();
    } else if (ctx.state === "suspended") {
      ctx.resume();
    }
  };

  // --- UI state ----------------------------------------------------------
  const syncUi = () => {
    player.dataset.state = muted ? "off" : "on";
    toggleBtn.setAttribute("aria-pressed", String(!muted));
    toggleBtn.setAttribute("aria-label", muted ? "Play ambient music" : "Mute ambient music");
    const pct = Math.round(volume * 100);
    volumeSlider.value = String(pct);
    volumeSlider.style.setProperty("--vol", `${pct}%`);
    volumeSlider.setAttribute("aria-valuetext", `${pct} percent`);
  };

  // --- Collapse / expand dock -------------------------------------------
  let collapseTimer = null;

  const expand = () => {
    window.clearTimeout(collapseTimer);
    player.classList.add("is-expanded");
  };

  const collapseNow = () => {
    window.clearTimeout(collapseTimer);
    player.classList.remove("is-expanded");
  };

  const scheduleCollapse = (delay) => {
    window.clearTimeout(collapseTimer);
    collapseTimer = window.setTimeout(() => {
      player.classList.remove("is-expanded");
    }, delay);
  };

  const leaveCollapse = () => {
    if (muted) {
      collapseNow();
    } else {
      scheduleCollapse(1500);
    }
  };

  /* Mobile/touch only — desktop hover expand stays unchanged */
  const isTouchAmbient = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  if (!isTouchAmbient) {
    player.addEventListener("pointerenter", expand);
    player.addEventListener("pointerleave", leaveCollapse);
    player.addEventListener("focusin", expand);
    player.addEventListener("focusout", leaveCollapse);
  } else {
    player.classList.add("ambient-player--touch");
  }

  toggleBtn.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem(STORAGE_MUTED, String(muted));
    if (isTouchAmbient) {
      collapseNow();
      if (!muted) {
        ensureRunning();
      }
    } else if (muted) {
      collapseNow();
    } else {
      ensureRunning();
      expand();
    }
    applyVolume();
    syncUi();
  });

  volumeSlider.addEventListener("input", () => {
    if (!isTouchAmbient) {
      expand();
    }
    volume = clamp(parseInt(volumeSlider.value, 10) / 100, 0, 1);
    localStorage.setItem(STORAGE_VOL, String(volume));
    if (volume > 0 && muted) {
      muted = false;
      localStorage.setItem(STORAGE_MUTED, "false");
      ensureRunning();
    }
    applyVolume();
    syncUi();
  });

  volumeSlider.addEventListener("pointerup", () => scheduleCollapse(1500));
  volumeSlider.addEventListener("change", () => scheduleCollapse(1500));

  // Reveal the player and kick off audio once the visitor enters the site
  const onEntered = () => {
    player.classList.add("is-visible");
    if (!muted) {
      startMusic();
      // If autoplay was blocked, resume on the first interaction
      if (ctx && ctx.state === "suspended") {
        const resumeOnce = () => {
          ctx.resume();
          window.removeEventListener("pointerdown", resumeOnce);
          window.removeEventListener("keydown", resumeOnce);
        };
        window.addEventListener("pointerdown", resumeOnce, { once: true });
        window.addEventListener("keydown", resumeOnce, { once: true });
      }
    }
  };

  window.addEventListener("cc:entered", onEntered, { once: true });

  // Fallback: if the entry screen never existed, reveal after load
  if (!document.getElementById("entry-screen")) {
    window.addEventListener("load", onEntered, { once: true });
  }

  syncUi();
})();
