(function () {
  const entry = document.getElementById("entry-screen");
  if (!entry) return;

  const signalEntered = () => {
    window.dispatchEvent(new CustomEvent("cc:entered"));
  };

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    entry.remove();
    signalEntered();
    return;
  }

  document.body.classList.add("entry-active");

  const isPhoneEntry = document.documentElement.classList.contains("is-phone-entry");

  const hudSpinAnims = [];

  const attachHudSpin = () => {
    const rings = [
      { sel: ".entry-hud-ring--outer", dur: "12s", from: "0 500 500", to: "360 500 500" },
      { sel: ".entry-hud-ring--mid", dur: "16s", from: "360 500 500", to: "0 500 500" },
      { sel: ".entry-hud-ring--inner", dur: "10s", from: "0 500 500", to: "360 500 500" },
    ];

    rings.forEach(({ sel, dur, from, to }) => {
      const circle = entry.querySelector(sel);
      if (!circle || circle.parentElement?.classList.contains("entry-hud-ring-spin")) return;

      const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
      wrap.setAttribute("class", "entry-hud-ring-spin");
      circle.parentNode.insertBefore(wrap, circle);
      wrap.appendChild(circle);

      const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
      anim.setAttribute("attributeName", "transform");
      anim.setAttribute("type", "rotate");
      anim.setAttribute("from", from);
      anim.setAttribute("to", to);
      anim.setAttribute("dur", dur);
      anim.setAttribute("repeatCount", "indefinite");
      anim.setAttribute("begin", "indefinite");
      wrap.appendChild(anim);
      hudSpinAnims.push({ anim, idle: dur });
    });
  };

  const startHudSpin = () => {
    hudSpinAnims.forEach(({ anim }) => {
      try {
        anim.beginElement();
      } catch (_) {
        /* SVG SMIL unavailable — rings stay static */
      }
    });
  };

  const setHudSpinSpeed = (surge) => {
    const fast = ["5s", "7s", "4s"];
    hudSpinAnims.forEach((item, i) => {
      item.anim.setAttribute("dur", surge ? fast[i] : item.idle);
    });
  };

  const entryCore = entry.querySelector(".entry-core");
  const promptCycle = document.getElementById("entryPromptCycle");
  const promptLines = promptCycle ? [...promptCycle.querySelectorAll(".entry-prompt-line")] : [];

  const shouldCycleDesktop = () => {
    if (document.documentElement.classList.contains("is-phone-entry")) return false;
    const mobileLabel = document.querySelector(".entry-prompt-label--mobile");
    if (mobileLabel && window.getComputedStyle(mobileLabel).display !== "none") return false;
    return promptLines.length >= 2;
  };

  if (shouldCycleDesktop()) {
    let onIndex = promptLines.findIndex((line) => line.classList.contains("is-on"));
    if (onIndex < 0) onIndex = 0;

    window.setInterval(() => {
      promptLines[onIndex].classList.remove("is-on");
      onIndex = (onIndex + 1) % promptLines.length;
      promptLines[onIndex].classList.add("is-on");
    }, 1800);
  }

  const sparksEl = entry.querySelector(".entry-sparks");
  const steamEl = entry.querySelector(".entry-steam");
  let bonded = false;
  let timers = [];

  const lockMs = isPhoneEntry ? 920 : 850;
  const surgeMs = isPhoneEntry ? 1350 : 1200;
  const holdMs = isPhoneEntry ? 950 : 900;
  const openMs = isPhoneEntry ? 1100 : 1000;

  let audioCtx = null;
  let masterGain = null;

  const schedule = (fn, ms) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  const getAudio = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.15;
      masterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  };

  const out = (ctx) => masterGain || ctx.destination;

  const safeAudio = (fn) => {
    try {
      const ctx = getAudio();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      fn(ctx);
    } catch (_) {
      /* audio must never block the sequence */
    }
  };

  const playTone = (ctx, freq, duration, type, gain, when, detune = 0) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.setValueAtTime(detune, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(g);
    g.connect(out(ctx));
    osc.start(when);
    osc.stop(when + duration + 0.03);
  };

  const playSweep = (ctx, startFreq, endFreq, duration, type, gain, when) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), when + duration);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(g);
    g.connect(out(ctx));
    osc.start(when);
    osc.stop(when + duration + 0.03);
  };

  const playNoise = (ctx, duration, gain, when, filterType, filterFreq, filterQ = 1) => {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(g);
    g.connect(out(ctx));
    source.start(when);
    source.stop(when + duration + 0.03);
  };

  const playElectricalPressure = (ctx, when, weight = 1) => {
    playTone(ctx, 46, 0.8, "sine", weight * 0.12, when);
    playTone(ctx, 92, 0.65, "triangle", weight * 0.055, when + 0.04);
    playNoise(ctx, 0.62, weight * 0.12, when, "lowpass", 520, 0.7);
    playNoise(ctx, 0.42, weight * 0.075, when + 0.08, "bandpass", 1450, 1.5);
  };

  const playHudTick = (ctx, when, freq = 900, weight = 1) => {
    playTone(ctx, freq, 0.035, "triangle", weight * 0.035, when);
    playNoise(ctx, 0.025, weight * 0.025, when, "bandpass", freq * 1.8, 4);
  };

  const playHudSequence = (ctx, when) => {
    playHudTick(ctx, when, 760, 0.8);
    playHudTick(ctx, when + 0.07, 1040, 0.7);
    playHudTick(ctx, when + 0.14, 880, 0.55);
    playHudTick(ctx, when + 0.28, 1280, 0.55);
    playHudTick(ctx, when + 0.42, 980, 0.45);
  };

  const playDeepHit = (ctx, when, freq = 45, weight = 1) => {
    playTone(ctx, freq, 0.5, "sine", weight * 0.38, when);
    playTone(ctx, freq * 1.5, 0.32, "triangle", weight * 0.12, when + 0.01);
    playNoise(ctx, 0.2, weight * 0.24, when, "lowpass", 120, 0.7);
  };

  const playMetalSlam = (ctx, when, weight = 1) => {
    playTone(ctx, 58, 0.32, "sine", weight * 0.34, when);
    playTone(ctx, 118, 0.22, "triangle", weight * 0.08, when + 0.015);
    playNoise(ctx, 0.09, weight * 0.26, when, "bandpass", 760, 1.4);
    playNoise(ctx, 0.2, weight * 0.2, when + 0.035, "lowpass", 240, 0.55);
  };

  const playServo = (ctx, when) => {
    playSweep(ctx, 70, 155, 0.5, "sawtooth", 0.035, when);
    playNoise(ctx, 0.42, 0.075, when, "lowpass", 260, 0.5);
    playNoise(ctx, 0.18, 0.05, when + 0.18, "bandpass", 620, 1.2);
  };

  const playArcCharge = (ctx, when) => {
    playTone(ctx, 42, 1.15, "sine", 0.15, when);
    playTone(ctx, 84, 1.0, "sine", 0.08, when + 0.04);
    playSweep(ctx, 62, 145, 0.9, "sawtooth", 0.045, when);
    playNoise(ctx, 1.0, 0.12, when, "lowpass", 430, 0.7);
    playNoise(ctx, 0.72, 0.075, when + 0.18, "bandpass", 1180, 1.4);
    playElectricalPressure(ctx, when + 0.18, 0.8);
    playDeepHit(ctx, when + 0.42, 52, 0.46);
    playMetalSlam(ctx, when + 0.68, 0.35);
  };

  const playLockSequence = () => {
    if (isPhoneEntry) {
      safeAudio((ctx) => {
        const t = ctx.currentTime;
        playDeepHit(ctx, t, 40, 0.55);
        playMetalSlam(ctx, t + 0.12, 0.5);
      });
      return;
    }
    safeAudio((ctx) => {
      const t = ctx.currentTime;
      playServo(ctx, t);
      playHudSequence(ctx, t + 0.04);
      playElectricalPressure(ctx, t + 0.08, 0.42);
      playDeepHit(ctx, t + 0.38, 40, 0.85);
      playMetalSlam(ctx, t + 0.4, 1);
      playMetalSlam(ctx, t + 0.52, 0.62);
      playNoise(ctx, 0.34, 0.06, t + 0.48, "lowpass", 900, 0.8);
      playMetalSlam(ctx, t + 0.64, 0.42);
    });
  };

  const playSurgeSequence = () => {
    if (isPhoneEntry) {
      safeAudio((ctx) => {
        const t = ctx.currentTime;
        playDeepHit(ctx, t, 48, 0.5);
        playElectricalPressure(ctx, t + 0.1, 0.45);
      });
      return;
    }
    safeAudio((ctx) => {
      const t = ctx.currentTime;
      playHudSequence(ctx, t);
      playArcCharge(ctx, t);
    });
  };

  const vibrate = (pattern) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const spawnSteam = (count) => {
    if (!steamEl) return;
    steamEl.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const puff = document.createElement("span");
      puff.className = "entry-steam-puff";
      puff.style.setProperty("--sx", `${38 + Math.random() * 24}%`);
      puff.style.animationDelay = `${Math.random() * 0.25}s`;
      puff.style.width = `${24 + Math.random() * 20}px`;
      puff.style.height = puff.style.width;
      steamEl.appendChild(puff);
    }
  };

  const spawnSparks = (count) => {
    if (!sparksEl) return;
    sparksEl.innerHTML = "";
    const total = isPhoneEntry ? Math.min(count, 8) : count;
    for (let i = 0; i < total; i++) {
      const spark = document.createElement("span");
      spark.className = "entry-spark";
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 70;
      spark.style.left = `${48 + Math.random() * 4}%`;
      spark.style.top = `${48 + Math.random() * 4}%`;
      spark.style.setProperty("--sx", `${Math.cos(angle) * dist}px`);
      spark.style.setProperty("--sy", `${Math.sin(angle) * dist}px`);
      spark.style.animation = `entry-spark-fly ${0.5 + Math.random() * 0.5}s ease-out forwards`;
      sparksEl.appendChild(spark);
    }
  };

  const finish = () => {
    entry.classList.add("is-done");
    schedule(() => {
      entry.remove();
      document.body.classList.remove("entry-active");
      window.removeEventListener("keydown", onKeyDown);
      timers.forEach(clearTimeout);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
      signalEntered();
    }, 300);
  };

  const openSite = () => {
    entry.classList.add("is-opening");
    schedule(finish, openMs + 150);
  };

  const runMobileBond = () => {
    vibrate([20, 15, 20]);
    entry.classList.add("is-mobile-sequence");
    schedule(() => {
      entry.classList.remove("is-mobile-sequence");
      entry.classList.add("is-opening");
      schedule(finish, openMs + 150);
    }, 3600);
  };

  const runSurge = () => {
    startHudSpin();
    entry.classList.add("is-surging");
    setHudSpinSpeed(true);
    playSurgeSequence();
    spawnSparks(28);
    vibrate([20, 35, 25, 50, 20]);

    schedule(() => {
      entry.classList.add("is-lit");
      schedule(openSite, holdMs);
    }, surgeMs);
  };

  const lockC = () => {
    if (isPhoneEntry) {
      runMobileBond();
      return;
    }
    entry.classList.add("is-locking");
    playLockSequence();
    vibrate([70, 35, 100, 30, 50]);

    schedule(() => spawnSteam(10), 400);
    schedule(runSurge, lockMs);
  };

  // Shared trigger for both "press C" (desktop) and "tap" (mobile/touch)
  const triggerBond = () => {
    if (bonded) return;
    bonded = true;

    safeAudio((ctx) => {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
    });

    lockC();
  };

  const onKeyDown = (event) => {
    if (event.key !== "c" && event.key !== "C") return;
    event.preventDefault();
    triggerBond();
  };

  const onPointerDown = (event) => {
    if (bonded) return;
    event.preventDefault();
    triggerBond();
  };

  window.addEventListener("keydown", onKeyDown);

  if (entryCore) {
    entryCore.addEventListener("pointerdown", onPointerDown);
  }

  /* Warm audio + pre-build HUD before bond — reduces first-frame lag on mobile */
  const warmEntry = () => {
    safeAudio(() => {});
  };

  entry.addEventListener("pointerdown", warmEntry, { passive: true, capture: true });
  entry.addEventListener("touchstart", warmEntry, { passive: true, capture: true });

  attachHudSpin();
})();
