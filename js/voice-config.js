/**
 * ElevenLabs voice config for the personalised welcome.
 *
 * Fill in the two values below to have the Hope voice speak each visitor's
 * name in real time ("Hi <name>, welcome to Cross Creative. Thanks for
 * joining us."). If you leave these blank, the site falls back to the
 * recorded audio/welcome.mp3 (or the browser voice).
 *
 * ── HOW TO FILL THIS IN ────────────────────────────────────────────────
 * 1. apiKey: ElevenLabs → your profile (top-right) → "API Keys" → copy.
 * 2. voiceId: ElevenLabs → Voices → the "Hope" voice → "..." → "Copy voice ID".
 *
 * ⚠️ SECURITY NOTE: because this is a static site, anyone who views the page
 * source can read this key and could use up your ElevenLabs quota. For a
 * personal portfolio that's usually fine — just keep an eye on usage, and
 * consider an ElevenLabs key with the lowest needed permissions. (Later this
 * can be moved behind a tiny serverless proxy to hide the key entirely.)
 */
window.CC_VOICE = {
  // Left blank on purpose: free ElevenLabs plans can't use the API, so the
  // site uses the free browser voice (which speaks the name). If you ever
  // upgrade to a paid ElevenLabs plan, paste your key + Hope voice ID back in
  // and the premium voice takes over automatically.
  apiKey: "",
  voiceId: "",
  modelId: "eleven_multilingual_v2",
};
