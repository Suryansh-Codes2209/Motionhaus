# art-engine

A vendored copy of the canvas engine from [huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) (MIT, © alchaincyf; see `LICENSE`), pinned at upstream commit `8a0d7d7`. Changes from upstream:

- Python tooling, reference films and docs removed. Every Chinese comment and message was stripped or translated (style names, labels, errors, example specs). The one exception is the seal stamp drawn inside the ink-wash painting, which is part of the artwork.
- The Chinese explainer demo films (`demos/t*`, `demos/y*`) were removed. The explainer **grammars** (`clips/`) and their example specs (`examples/`, now in English) remain.

It is plain browser JS with a deterministic frame contract: after boot sets `window.__ready`, `await prepare(t); renderFrame(t)` draws time `t` onto `window.__canvas` (`renderSolo(id, t)` draws one style alone). Motionhaus drives it from Remotion through `apps/reels/studio/src/engines/Huashu.tsx`; never edit the engine to fit Remotion.

## Art styles (`kind: 'style'`, `id`)

Every scene is drawn at 1920×1080 around the same composition: a window, a cat and a figure at a table. That composition is the "art-history speedrun" demo, and the style is what changes. In 9:16, use `fit: cover` and set `focusX` to choose the part you want.

| id | style | id | style |
|---|---|---|---|
| 01_cave | Cave painting | 19_munch | Munch expressionism (The Scream in the window) |
| 02_egypt | Egyptian wall painting | 20_dunhuang | Dunhuang mural |
| 03_greek | Greek black-figure pottery | 21_kusama | Kusama polka dots |
| 04_roman | Roman mosaic | 22_constructivism | Constructivist poster |
| 05_gothic | Gothic illumination | 23_dali | Dalí surrealism |
| 06_renaissance | High Renaissance | 24_hopper | Hopper American realism |
| 08_impressionism | Impressionism | 25_ghibli | Ghibli watercolor |
| 09_postimp | Van Gogh (best-quality scene) | 26_vaporwave | Vaporwave / neon |
| 10_nouveau | Art Nouveau poster | 27_kirby | Kirby comics |
| 11_cubism | Cubism | 28_monet | Monet water lilies |
| 12_bauhaus | Bauhaus | 29_seurat | Seurat pointillism |
| 13_pop | Lichtenstein pop art | 30_matisse | Matisse cut-outs |
| 14_8bit | 8-bit pixel | 31_haring | Keith Haring graffiti |
| 15_raytrace | 90s ray-traced CGI | 32_rembrandt | Rembrandt chiaroscuro |
| 16_2026 | 2026 flat illustration | 33_rubberhose | 1930s rubber-hose cartoon |
| 17_ink | Chinese ink wash | 34_shadowpuppet | Shadow puppetry |
| 18_klimt | Klimt Golden Phase | 35_shinkai | Shinkai light |
| | | 36_picasso_blue | Picasso Blue Period |

Research prototypes, rated below production quality by upstream (about 53–82 out of 100): 38_giotto, 39_piero, 40_raphael, 41_michelangelo, 42_guardi, 43_lorenzetti, 44_cortona, 45_renoir, 46_pissarro, 47_sisley, 48_gauguin, 49_chagall, 50_ma_yuan, 51_persian_miniature, 52_south_park, 53_pixar, 54_ghibli_lab, 55_dunhuang. These load from the `style_studies` film automatically.

## Explainer grammars (`kind: 'clip'`, `spec`)

A clip is one JSON spec, `{grammar, duration, fps, width, height, theme?, finish?, data?, cues: [{at, kind, text?, data?}]}`, rendered at the size the spec gives. Field reference: `clip_schema.json`. Working examples: `examples/*.json`.

| grammar | look | cue kinds |
|---|---|---|
| y1_kurzgesagt | flat shapes without outlines, journeys across scale | title, point, highlight, enter |
| y2_vox | clippings, red lines, highlighter | image, clip, title, point, highlight |
| y3_whiteboard | a pen draws icons and labels | title, point, draw, image, highlight |
| y4_storytime | reaction close-ups (needs your own character frames) | title, point, highlight, react, insert |
| y5_kinetic_type | key words land hard | title, point, number, highlight |
| t1_3b1b | one object morphs into the next, equations | title, equation, point, line, highlight |
| t2_keynote_ui | frosted cards, big numbers | title, card, step, image, highlight, number |
| t3_finance_chart | axes first, then data, one thing highlighted | title, bar, line, candle, highlight, number |

Palettes (`theme`): paper, poster, ink, navy, bauhaus, snow, wood, chalk. Finish (`finish`): soft, film, punch, clean.
