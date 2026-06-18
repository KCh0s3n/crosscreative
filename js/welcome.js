(function () {
  "use strict";

  const synth = window.speechSynthesis || null;

  // Recorded Hope-voice greeting. First playlist that loads is used; if none
  // are present we fall back to the browser voice speaking the same line.
  //  - audio/welcome.mp3            → one clip with the full greeting
  //  - welcome-1.mp3 + welcome-2.mp3 → two separate lines
  const AUDIO_PLAYLISTS = [
    ["audio/welcome.mp3"],
    ["audio/welcome-1.mp3", "audio/welcome-2.mp3"],
  ];
  const GREETING_TEXT = "Hi, welcome to Cross Creative. Thanks for joining us.";

  // --- Voice selection (for the browser fallback) ------------------------
  let voices = [];
  const loadVoices = () => {
    if (!synth) return;
    voices = synth.getVoices() || [];
  };
  loadVoices();
  if (synth && typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", loadVoices);
  }

  let voiceOverride = "";
  try {
    voiceOverride = (localStorage.getItem("cc-voice") || "").toLowerCase();
  } catch (e) {
    voiceOverride = "";
  }

  const scoreVoice = (v) => {
    const name = v.name.toLowerCase();
    if (!/^en/i.test(v.lang)) return -100;
    let s = 0;
    if (v.localService === false) s += 40;
    if (/(natural|neural|premium|enhanced|wavenet|journey|online)/.test(name)) s += 34;
    const lovely = [
      "aria", "jenny", "emma", "michelle", "ana", "sonia", "libby", "clara",
      "ava", "samantha", "serena", "zoe", "nova", "amber", "ashley", "evelyn",
      "isabella", "sara", "nancy", "jane", "victoria", "fiona", "moira", "tessa",
    ];
    if (lovely.some((n) => name.includes(n))) s += 22;
    if (/female/.test(name)) s += 8;
    if (/^en-gb/i.test(v.lang)) s += 6;
    else if (/^en-au|^en-ie/i.test(v.lang)) s += 3;
    if (/google/.test(name)) s -= 26;
    if (/(espeak|compact|robot|zira|david|mark|microsoft sam)/.test(name)) s -= 30;
    return s;
  };

  const pickVoice = () => {
    if (!voices.length) return null;
    if (voiceOverride) {
      const forced = voices.find((v) => v.name.toLowerCase().includes(voiceOverride));
      if (forced) return forced;
    }
    const ranked = voices
      .map((v) => ({ v, s: scoreVoice(v) }))
      .filter((x) => x.s > -50)
      .sort((a, b) => b.s - a.s);
    return (ranked[0] && ranked[0].v) || voices[0] || null;
  };

  // --- Playback ----------------------------------------------------------
  let activeAudio = null;

  const playAudioSequence = (files, onDone) => {
    let idx = 0;
    let everPlayed = false;
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      activeAudio = null;
      onDone(ok);
    };
    const playNext = () => {
      if (idx >= files.length) {
        done(true);
        return;
      }
      const audio = new Audio(files[idx]);
      activeAudio = audio;
      audio.volume = 1;
      audio.addEventListener("ended", () => {
        idx += 1;
        playNext();
      });
      audio.addEventListener("error", () => done(everPlayed));
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          everPlayed = true;
        }).catch(() => done(everPlayed));
      } else {
        everPlayed = true;
      }
    };
    playNext();
  };

  const speakFallback = (onDone) => {
    if (!synth) {
      onDone();
      return;
    }
    synth.cancel();
    const voice = pickVoice();
    let safety = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(safety);
      onDone();
    };
    const u = new SpeechSynthesisUtterance(GREETING_TEXT);
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || "en-GB";
    u.rate = 0.84;
    u.pitch = 1.0;
    u.volume = 0.95;
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
    safety = window.setTimeout(finish, GREETING_TEXT.length * 85 + 2500);
  };

  const tryPlaylists = (index, onDone) => {
    if (index >= AUDIO_PLAYLISTS.length) {
      speakFallback(onDone);
      return;
    }
    playAudioSequence(AUDIO_PLAYLISTS[index], (ok) => {
      if (ok) onDone();
      else tryPlaylists(index + 1, onDone);
    });
  };

  // --- Greeting trigger --------------------------------------------------
  let played = false;
  const playGreeting = () => {
    if (played) return;
    played = true;
    window.dispatchEvent(new CustomEvent("cc:speech-start"));
    let ended = false;
    const onEnd = () => {
      if (ended) return;
      ended = true;
      window.dispatchEvent(new CustomEvent("cc:speech-end"));
    };
    tryPlaylists(0, onEnd);
  };

  // Pressing "C" to enter gives us audio permission, so play right after.
  window.addEventListener("cc:entered", () => window.setTimeout(playGreeting, 600), {
    once: true,
  });

  // Reduced-motion / no entry screen: there was no gesture, so wait for the
  // first interaction before playing (browsers block audio otherwise).
  if (!document.getElementById("entry-screen")) {
    const onFirst = () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
      playGreeting();
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
  }
})();
