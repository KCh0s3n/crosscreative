# Welcome voice clip

When a visitor enters the site, the greeting plays automatically. Drop one
file here, recorded in the Hope voice:

- `welcome.mp3` — one clip of:
  **"Hi, welcome to Cross Creative. Thanks for joining us."**

If `welcome.mp3` is missing, the site falls back to the browser's built-in
voice speaking the same line — so nothing breaks while you set it up.

## How to make it (free, Hope voice)

Free ElevenLabs accounts can use the Hope voice on the **website** (just not
through the API). So:

1. Go to elevenlabs.io → Text to Speech.
2. Select the **Hope** voice.
3. Type exactly: `Hi, welcome to Cross Creative. Thanks for joining us.`
4. Click Generate → Download.
5. Rename the downloaded file to **`welcome.mp3`** and place it in this folder.

Suggested settings: Model **Eleven Multilingual v2**, Stability **0.65**,
Similarity **0.80**, Style **0.0–0.2**.

> Note: an ElevenLabs "voice_preview_…" download is just a sample of the
> voice reading a generic demo sentence — it is NOT the greeting. You must
> generate a clip of the exact text above.

## Optional: generate it via script

From the `crosscreative/` folder, with Node 18+ and a PAID ElevenLabs plan
(the API blocks library voices on free plans):

```powershell
$env:ELEVENLABS_API_KEY = "your_api_key_here"
$env:ELEVENLABS_VOICE_ID = "WAhoMTNdLdMoq1j3wf3I"   # Hope
node tools/generate-welcome-voice.mjs
```
