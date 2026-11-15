import type {SfxName} from './audio/Sfx';
export type Format = '16:9' | '9:16' | '1:1';

export type FontName =
  | 'Inter'
  | 'SpaceGrotesk'
  | 'Manrope'
  | 'Sora'
  | 'PlusJakartaSans'
  | 'DMSans'
  | 'Poppins'
  | 'Outfit'
  | 'Geist'
  | 'InstrumentSerif'
  | 'PlayfairDisplay'
  | 'CourierPrime'
  | 'Unbounded'
  | 'IBMPlexMono';

// Edit style: the whole look and motion grammar of a video (background,
// surfaces, type treatment, transitions, hit effects). See src/styles/.
export type StyleName = 'radar' | 'vox' | 'explainer' | 'neon' | 'terminal' | 'toybox' | '3d' | 'headshot';

// Transition INTO a scene. Omit to use the default rotation.
export type TransitionName =
  | 'zoomPunch'
  | 'pushCut'
  | 'slideLeft'
  | 'slideUp'
  | 'wipe'
  | 'fade'
  | 'paper' // vox: next sheet slides up over the last one
  | 'glitch' // terminal: RGB-split slice jitter
  | 'blur' // explainer: soft blur crossfade
  | 'pop' // toybox: shrink away, next one springs up with an overshoot
  | 'flip' // 3d: the scene turns like a cube face
  | 'zoomIn' // any: the camera flies into the old scene and out of the new one
  | 'zoomOut' // any: the old scene shrinks into the distance, the next pulls back into place
  | 'whip' // any: a fast whip pan with directional motion blur
  | 'filmBurn' // any: the frame burns out to hot orange-white and the next scene burns in
  | 'iris' // any: the next scene opens in a growing circle from the centre
  // any style (the editor-preset vocabulary, see transitions/index.tsx):
  | 'flash' // hard cut under a white flash
  | 'dip' // dips to the background colour and back
  | 'rgbSplit' // the channels tear apart and the cut hides in the tear
  | 'blinds' // horizontal slats open onto the next scene
  | 'strips' // vertical strips slide in from alternate ends
  | 'diamond' // a diamond iris opens from the centre
  | 'clock' // a clock-hand wipe sweeps round
  | 'split' // the old scene splits in two and parts like doors
  | 'cube' // the scene tips over like the top face of a cube
  | 'pageTurn' // the old scene turns like a page on its left edge
  | 'spin' // both scenes spin through a blur
  | 'stretch' // the old scene stretches wide and smears into the next
  | 'swirl' // both scenes twist and shrink through a heavy blur
  | 'lightSweep' // a bar of light crosses the frame and leaves the next scene behind it
  | 'whipUp' // a vertical whip pan
  | 'push' // the next scene pushes the old one off the top
  // mask edits: the next scene is cut into the old one through a shape
  | 'maskText' // seen through one huge word (maskWord), then the camera flies through the letters
  | 'maskInk' // ink blots bloom and run together
  | 'maskBrush' // slanted brush strokes paint it on from alternate sides
  | 'none';

type Base = {
  // Length in musical beats. Each transition overlaps one beat.
  beats: number;
  transition?: TransitionName;
  // The word a `maskText` transition cuts the scene through (≤ 8 letters reads best).
  maskWord?: string;
  // In-scene camera: in = slow push, out = slow pull back, punch = snap in on beat 2.
  zoom?: 'in' | 'out' | 'punch';
  // Overlays: glitch = RGB-split bursts every few beats; flames = fire from the bottom edge;
  // vhs = scanlines, tracking noise and colour bleed; shake = handheld camera wobble;
  // letterbox = cinematic black bars slide in; flare = an anamorphic lens flare sweeps across;
  // leak = a warm light leak drifts over the frame; tiltShift = the top and bottom fall out of
  // focus (a miniature look); spotlight = the edges fall dark around the centre.
  fx?: ('glitch' | 'flames' | 'vhs' | 'shake' | 'letterbox' | 'flare' | 'leak' | 'tiltShift' | 'spotlight')[];
  // Extra glitch hits, in beats from the scene start (the entry hit is automatic).
  glitchAt?: number[];
  // Real photos cutting behind the scene every 1.5 beats, each cut with a shutter sound.
  broll?: string[];
  // One-off sound cues on words: kit role name + beats from the scene start (the sound's peak lands there).
  sfx?: {name: SfxName; at: number; volume?: number}[];
  // Beat-timed accents: `at` is beats from the scene start, so each one sits
  // on the word that earns it (each brings its own sound). See fx/hits.tsx.
  hits?: {fx: HitFx; at: number}[];
  // Colour grade over the whole scene.
  grade?: GradeName;
};

// punch = a zoom hit that snaps in and decays; flash = a white frame;
// invert = two frames of colour negative; freeze = a camera-shutter flash
// that leaves the frame high-contrast and muted for half a beat; strobe =
// four hard light/dark flickers; rgb = a clean channel split; jolt = the
// camera knocked sideways; blur = a defocus pop; echo = ghost copies of the
// frame fly outward.
export type HitFx = 'punch' | 'flash' | 'invert' | 'freeze' | 'strobe' | 'rgb' | 'jolt' | 'blur' | 'echo';

export type GradeName = 'tealOrange' | 'noir' | 'warm' | 'cold' | 'punchy' | 'duotone' | 'faded';

// How a hook stages its first two seconds (scenes/Hook.tsx).
export type HookVariant = 'rise' | 'build' | 'band' | 'echo' | 'card' | 'ghost' | 'tag';

// In any text field, wrap words in *asterisks* to paint them with the accent gradient.
export type Scene = Base &
  (
    // image: a product shot filling the frame behind the lines, so the first
    // frame already shows the thing (path inside public/).
    // video: a short clip of the product running (muted, path inside public/); wins over image
    // variant: how the opening is staged (default 'rise'); keyword: the word the
    // band / echo / card / ghost / tag variants headline (default: the first
    // *emphasised* word of the lines).
    | {type: 'hook'; lines: string[]; image?: string; video?: string; variant?: HookVariant; keyword?: string}
    // 'assemble': brand-colored shapes orbit in and burst into the logo on the drop.
    | {type: 'logo'; style?: 'slam' | 'assemble'}
    | {
        type: 'screenshot';
        image: string; // path inside public/
        caption?: string;
        device?: 'browser' | 'phone';
        scroll?: boolean; // true for tall full-page captures
      }
    | {
        type: 'features';
        title?: string;
        items: {title: string; desc?: string; icon?: string}[];
      }
    | {
        type: 'stat';
        value: number;
        decimals?: number;
        prefix?: string;
        suffix?: string;
        label: string;
      }
    | {type: 'quote'; text: string; author?: string}
    | {type: 'cta'; headline: string; url: string; button?: string}
    // Big kinetic statement. slam: one word per half-beat, full frame;
    // scramble: characters decode into place; stack: outlined marquee rows;
    // build: words land faster and bigger; echo: the keyword as rising outlines
    // settling on a solid copy; boxed: the *emphasised* word gets a solid box;
    // offset: 1–2 words on an offset outline copy; wall: the keyword tiled
    // behind the line; window: the keyword set huge, its letters a window
    // onto `image` or `video` (a mask edit), the rest of the line under it.
    | {type: 'type'; text: string; style?: 'slam' | 'scramble' | 'stack' | 'build' | 'echo' | 'boxed' | 'offset' | 'wall' | 'window'; image?: string; video?: string; credit?: string}
    // Screenshot, cursor clicks a point, camera zooms in on it. focus x/y are
    // 0..1 within the image; label is a callout pill shown after the zoom.
    | {
        type: 'spotlight';
        image: string;
        focus: {x: number; y: number; zoom?: number};
        caption?: string;
        label?: string;
      }
    // Code editor (or terminal) typing itself out. Lines starting with "$ " in
    // terminal mode render as commands, the rest as output.
    | {type: 'code'; code: string; filename?: string; terminal?: boolean; caption?: string}
    // Animated bar or line chart; the last point is highlighted and counted up.
    | {
        type: 'chart';
        kind?: 'bar' | 'line';
        title?: string;
        data: {label: string; value: number}[];
        prefix?: string;
        suffix?: string;
      }
    // "How it works": 3–4 nodes joined by connectors that draw on each beat.
    | {type: 'steps'; title?: string; items: {title: string; desc?: string; icon?: string}[]}
    // AI chat demo: prompt types into an input, sends, answer streams in.
    | {type: 'chat'; prompt: string; answer: string; caption?: string}
    // A real forum comment (HN, Reddit, GitHub) typing into a card; optional
    // reply underneath. Quote real comments verbatim (… for cuts).
    | {
        type: 'comment';
        author: string;
        text: string;
        source: string; // "Hacker News"
        date?: string;
        reply?: {author: string; text: string};
      }
    // Head-to-head comparison; winner gets the accent edge.
    | {
        type: 'versus';
        title?: string;
        left: {name: string; rows: {label: string; value: string}[]};
        right: {name: string; rows: {label: string; value: string}[]};
        winner?: 'left' | 'right';
      }
    // vox: a screenshot cut out like a newspaper clipping (torn edge, tape),
    // then a marker circles / underlines / highlights the focus point.
    | {
        type: 'clipping';
        image: string;
        focus?: {x: number; y: number; w?: number; h?: number}; // 0..1 in the image
        label?: string; // typewriter label under the clipping
        mark?: 'circle' | 'underline' | 'highlight';
      }
    // vox: a page of real text; the camera pushes in and a marker sweeps over
    // the verbatim quote (it must appear inside body).
    | {type: 'document'; title?: string; body: string; quote: string; source?: string}
    // explainer: nodes stacked vertically, joined by animated beams that fire one per beat.
    | {type: 'flow'; title?: string; nodes: {icon?: string; label: string; desc?: string}[]}
    // neon: bento grid of tiles popping in one per beat; the first tile is the hero.
    | {type: 'bento'; title?: string; tiles: {title: string; desc?: string; icon?: string; image?: string}[]}
    // terminal: streaming CLI output. "$ " lines are typed commands, "+ "/"! "/"> " lines
    // print as ok / warn / info output. Real commands only.
    | {type: 'log'; title?: string; lines: string[]}
    // huashu art engine (packages/art-engine): a painting cutaway in one of its
    // art styles (id "09_postimp"…), as a metaphor beat; needs public/huashu.
    | {type: 'art'; id: string; label?: string; focusX?: number; offset?: number}
    // huashu explainer clip: a grammar spec json (path inside public/, e.g.
    // "clips/s4.json"); its duration sets the scene's minimum length.
    | {type: 'clip'; spec: string}
    // Real-world photos (paths inside public/, fetched with `shorts photos`):
    // one = full-bleed documentary shot creeping toward focus (0..1); two or
    // three = taped prints slapped in one per beat. credit: "Photo: X / CC BY".
    // Brute force shown: a key's bytes (all 00 but the last) with the last one
    // spinning like a slot reel until it lands on value; a padlock springs open
    // and a stamp (label, default "Key found") slams on.
    | {type: 'crack'; value: number; bytes?: number; title?: string; label?: string}
    // Real 3D on a dark stage with a moving camera and depth of field
    // (scenes/Space.tsx). swarm: sheets (and `images`) multiply through space
    // while the camera pulls back, `words` flash at different depths, a counter
    // runs up to `total` + `label`, then `title` lands. gallery: `images` as
    // tilted cards strung out in depth, the camera flying from one to the next
    // (`labels` under each). vortex: points spiral into a disc around `image`
    // / `title`, then flare.
    | {type: 'space'; mode: 'swarm' | 'gallery' | 'vortex'; images?: string[]; labels?: string[]; words?: string[]; title?: string; label?: string; count?: number; total?: number; image?: string}
    // A custom motion graphic drawn for this episode: an .svg inside public/
    // whose elements carry data-in / data-at / data-loop attributes (see
    // scenes/Svg.tsx). caption lands at captionAt beats (default 1).
    | {type: 'svg'; file: string; caption?: string; captionAt?: number}
    // photo `behind` + `cutout`: one huge word sits between the photo and its
    // subject (cutout = the subject as a transparent PNG from `shorts cutout`,
    // same framing as images[0]): the text-behind-subject mask edit. behindAt =
    // the word's centre as a share of the height (default 0.44); raise it so the
    // letters stand clear above a wide subject.
    | {type: 'photo'; images: string[]; mode?: 'montage' | 'prints'; every?: number; caption?: string; label?: string; credit?: string; focus?: {x: number; y: number}; behind?: string; cutout?: string; behindAt?: number}
    // toybox: app-icon tiles popping in one per beat (icon = emoji or a path
    // inside public/). strike: a tile that gets crossed out ("Claude can't
    // hear"); sticker: a tilted badge ("FREE") slapped on the tile at `badgeOn`.
    | {
        type: 'tiles';
        title?: string;
        tiles: {icon: string; label?: string}[];
        strike?: number;
        check?: number;
        sticker?: string;
        badgeOn?: number;
      }
    // 3d: layers of a system shown as an exploded stack; the layers pull apart
    // one per beat and the camera orbits. The top layer is the headline.
    | {type: 'stack'; title?: string; layers: {label: string; desc?: string; icon?: string}[]}
  );

export type SceneOf<T extends Scene['type']> = Extract<Scene, {type: T}>;

export type LaunchConfig = {
  style?: StyleName; // default 'radar'
  brand: {
    name: string;
    tagline?: string;
    url: string;
    logo?: string; // path inside public/, transparent PNG/SVG preferred
    logoIsWordmark?: boolean; // logo already spells the name → don't repeat it
    colors: {
      bg: string;
      fg: string;
      muted: string;
      accent: string;
      accent2: string;
    };
    font: FontName;
    displayFont?: FontName;
  };
  format: Format;
  fps: number;
  bpm: number;
  music?: string; // path inside public/
  musicVolume: number;
  sfx: boolean;
  sfxVolume: number;
  look: {
    grain: number; // 0..0.15
    vignette: number; // 0..0.6
    lightLeaks: boolean;
    cameraDrift: boolean;
    motionBlur: boolean; // slow: multiplies render time by ~6
    particles?: boolean; // particle burst on every hit (default true)
    backdrop?: boolean; // false: the host composition draws the background (long-form sets)
    sceneCamera?: boolean; // long-form: per-scene camera glides between areas of interest (components/SceneCamera)
  };
  scenes: Scene[];
};
