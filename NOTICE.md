# Notice

Motionhaus's own code is under the MIT licence in [LICENSE](LICENSE). Some parts come from other projects or depend on software with its own terms. Those terms still apply to those parts.

## Not covered by the MIT licence

- **Remotion.** Every video is rendered with [Remotion](https://www.remotion.dev), which is source-available, not open source, and is used under the [Remotion License](https://www.remotion.dev/docs/license). It is free for individuals and for companies or teams of up to 3 people; larger organisations need a company licence. Everyone who renders videos with Motionhaus needs to be covered by the Remotion License themselves. The MIT licence on this repository does not grant any rights to Remotion.
- **The Launch Radar name and artwork.** "Launch Radar", its handles, its logo and the art in `apps/shorts/brand/` identify the author's own channel. They are in the repository as a working example. Use your own name and artwork for your channel; do not present your channel as Launch Radar.

## Included third-party code and content

| Part | From | Licence | Details |
|---|---|---|---|
| `packages/art-engine/` | huashu-art-motion by alchaincyf | MIT | [`packages/art-engine/LICENSE`](packages/art-engine/LICENSE) |
| `packages/art-engine/engine/lib/three.min.js` | three.js | MIT | [`THREE_LICENSE.txt`](packages/art-engine/engine/lib/THREE_LICENSE.txt) |
| Fonts in `packages/art-engine/engine/lib/fonts/` | Noto, LXGW WenKai and others | SIL Open Font License 1.1 | [`LICENSES.md`](packages/art-engine/engine/lib/fonts/LICENSES.md), [`OFL.txt`](packages/art-engine/engine/lib/fonts/OFL.txt) |
| Effect ports in `packages/motion-kit/src/components/fx/` | ideas from Magic UI components on 21st.dev | MIT (originals); the ports are reimplementations | [`CREDITS.md`](packages/motion-kit/src/components/fx/CREDITS.md) |
| `skills/video-craft/references/` | adapted from HyperFrames by HeyGen | Apache 2.0 | [`NOTICE.md`](skills/video-craft/NOTICE.md) |

npm dependencies are installed by `npm install` and keep their own licences.

## Media fetched while making videos

Photos, music and sound effects found by the photo search and the audio library come from Openverse, Wikimedia Commons, Freesound, Jamendo and the Internet Archive under their own licences. Motionhaus keeps only commercial-use licences by default and writes the credits each one requires (`photo-credits.txt`, `sfx-credits.txt`, `ATTRIBUTION.md`). Publishing those credits with your video is your responsibility. None of this media is in the repository.
