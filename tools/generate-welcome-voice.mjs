#!/usr/bin/env node
/**
 * Generates the welcome voice clips with ElevenLabs.
 *
 * Usage (from the crosscreative/ folder, Node 18+):
 *   ELEVENLABS_API_KEY=xxx node tools/generate-welcome-voice.mjs
 *
 * Optional env vars:
 *   ELEVENLABS_VOICE_ID  voice to use (defaults to "Rachel")
 *   ELEVENLABS_MODEL_ID  defaults to "eleven_multilingual_v2"
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "WAhoMTNdLdMoq1j3wf3I"; // Hope
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY environment variable.");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const audioDir = resolve(__dirname, "..", "audio");

const clips = [
  { file: "welcome.mp3", text: "Hi, welcome to Cross Creative. Thanks for joining us." },
];

const voiceSettings = {
  stability: 0.65,
  similarity_boost: 0.8,
  style: 0.15,
  use_speaker_boost: true,
};

async function generate({ file, text }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: voiceSettings,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} for "${text}": ${detail}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = resolve(audioDir, file);
  await writeFile(outPath, buffer);
  console.log(`✓ ${file} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

(async () => {
  await mkdir(audioDir, { recursive: true });
  for (const clip of clips) {
    // sequential so we stay well within rate limits
    // eslint-disable-next-line no-await-in-loop
    await generate(clip);
  }
  console.log("Done. Clips saved to audio/.");
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
