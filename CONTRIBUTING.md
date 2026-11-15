# Contributing

Thanks for wanting to help. Motionhaus is a small project with one maintainer, so a little care up front saves everyone time.

## Before you start

- **Open an issue first** for anything bigger than a small fix, and say what you want to change and why. That avoids work that cannot be merged.
- Read the [Rules for using Motionhaus](RESPONSIBLE_USE.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions that make it easier to break those rules will not be accepted.
- Security problems go through private reporting, not issues: see [SECURITY.md](SECURITY.md).

## Setting up

Requirements: macOS, Node 18 or newer, ffmpeg (`brew install ffmpeg`), and [Claude Code](https://claude.com/claude-code) for the parts that write scripts.

```bash
npm install
npm run studio:install
npm run check        # type checks and tests for every package and the studio
```

Never test against a real channel. Tests use temporary folders (`MOTIONHAUS_DATA`, `MOTIONHAUS_CONFIG_HOME`) and fake network calls; follow the patterns in `apps/shorts/test/`.

## Making a change

- **Write the test first** and watch it fail, then make it pass. Pull requests without tests for new behaviour are usually sent back.
- **Keep it focused.** One change per pull request.
- **Follow the code around you.** Plain JavaScript modules (`.mjs`) with JSDoc types checked by TypeScript; comments say why, not what.
- **Video motion must be frame-driven** (`useCurrentFrame` with `spring` or `interpolate`). CSS animation, Tailwind and framer-motion do not render in Remotion.
- **Edit the motion kit in `packages/motion-kit`**, never in the studio's copy, then run `npm run sync`.
- **No channel's private data in shared files.** A channel's name, handles, view counts and lessons belong in its own folder (`workspace/channels/<slug>/`), never in `apps/shorts/src`, the templates or `skills/`. A test checks for this.
- **New dependencies** need a reason in the pull request, and a licence that allows commercial use.
- **Third-party code or ideas** need a credit and their licence in the matching `CREDITS.md` or `NOTICE.md`.

## Pull requests

- Describe what changed and why, and how you tested it.
- `npm run check` passes.
- By sending a pull request you agree your contribution is licensed under the [MIT licence](LICENSE) of this project.
