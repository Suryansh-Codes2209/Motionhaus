# Local audio packs

Drop pre-downloaded packs here, one folder per pack. The audio library indexes them by folder and file name and works fully offline.

```
assets/audio-packs/
├── kenney_interface-sounds/   ← unzip as-is; its License.txt (CC0) is detected automatically
└── oga-battle-music/
    ├── pack.json              ← optional, recommended for anything that isn't Kenney
    └── music/*.ogg
```

`pack.json` (all fields optional):

```json
{"license": "CC-BY 4.0", "creator": "Jane Doe", "sourceUrl": "https://opengameart.org/content/…", "type": "music"}
```

Without `pack.json`, the license comes from a `LICENSE`/`License.txt`/`README` file. If that file mentions more than one license, or none, the pack is `unknown` and `commercialUseOnly` excludes it. Folders named `music`, `bgm`, `songs`, `soundtrack`, `themes` or `loops` count as music; everything else counts as sfx.

Good CC0 sources: [Kenney audio](https://kenney.nl/assets/category:Audio), [OpenGameArt CC0 audio](https://opengameart.org/art-search-advanced?field_art_type_tid[]=13&field_art_licenses_tid[]=4). Pack folders are git-ignored.
