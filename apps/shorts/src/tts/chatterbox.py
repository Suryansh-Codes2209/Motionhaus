# Chatterbox-Turbo (Resemble AI, MIT) on Apple Silicon via mlx-audio. A
# long-lived worker: loads the model once, then reads one JSON request per
# line on stdin ({"text", "out", "ref"?}) and answers {"ok": true} or
# {"error": "..."} per line. Spawned by chatterbox.mjs.
import json
import sys

import numpy as np
from mlx_audio.audio_io import write as audio_write
from mlx_audio.tts.utils import load_model

model = load_model(model_path=sys.argv[1])
print(json.dumps({"ready": True}), flush=True)

for line in sys.stdin:
    try:
        req = json.loads(line)
        kw = {"text": req["text"], "temperature": req.get("temperature", 0.8)}
        if req.get("ref"):
            kw["ref_audio"] = req["ref"]
        chunks = [np.array(r.audio) for r in model.generate(**kw)]
        audio_write(req["out"], np.concatenate(chunks), model.sample_rate, format="wav")
        print(json.dumps({"ok": True}), flush=True)
    except Exception as e:  # report and keep serving
        print(json.dumps({"error": str(e)}), flush=True)
