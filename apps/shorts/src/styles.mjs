// Edit styles for the pipeline: which look an episode gets. Mirrors
// packages/motion-kit/src/styles (the renderer) and skills/short-styles (the
// writing rules). Every episode names one; consecutive episodes never repeat.

/** @typedef {'radar' | 'vox' | 'explainer' | 'neon' | 'terminal' | 'toybox' | '3d' | 'headshot'} StyleName */

/** @type {Record<StyleName, {palette: string, palettes: string[], scenes: string[], fit: RegExp}>} */
export const STYLES = {
  // The original launch-channel look: film grain, glass cards, light leaks.
  radar: {palette: 'ember', palettes: ['ember', 'signal', 'ultraviolet', 'ice', 'paper'], scenes: ['spotlight', 'features', 'screenshot', 'stat'], fit: /launch|app|product/i},
  // Newsprint, clippings, marker pens: stories, trends, controversy, "why it matters".
  vox: {palette: 'newsprint', palettes: ['newsprint', 'paper'], scenes: ['clipping', 'document', 'comment', 'versus', 'stat'], fit: /\b(why|trend\w*|debate|ban\w*|lawsuit|privacy|ads?|vs\.?|versus|everyone|controvers\w*|history|policy|i'?m a bad|i built|my story|frustrat\w*|hated?|tired of|instead of)\b/i},
  // Calm diagrams with beams: infra, protocols, "how it works".
  explainer: {palette: 'chalk', palettes: ['chalk', 'ice'], scenes: ['flow', 'steps', 'chart', 'stat'], fit: /\b(how|internals|under the hood|explained|explore|interactive|museum|visuali[sz]\w*|protocol|pipeline|infra\w*|database|storage|file ?system|zfs|sync|engine|compiler|architecture|workflow|framework|api)\b/i},
  // 21st.dev / modern SaaS: AI products, polished UIs, design tools.
  neon: {palette: 'ultraviolet', palettes: ['ultraviolet', 'ice', 'signal'], scenes: ['bento', 'spotlight', 'chat', 'stat'], fit: /\b(ai|llm|gpt|design|ui|editor|studio|generat\w*|copilot|assistant|3d|three\.js|webgl|lidar|reconstruct\w*|photos?|images?|video|render\w*|sprites?)\b/i},
  // Phosphor + CRT: CLIs, terminals, security, self-hosting, dev tooling.
  // Soft app-icon tiles, stickers, italic serif: small tools, plugins, skills, "look how easy".
  toybox: {palette: 'toybox', palettes: ['toybox', 'paper'], scenes: ['tiles', 'stat', 'steps', 'features'], fit: /\b(free|plugins?|extensions?|skills?|kit|librar(y|ies)|icons?|sounds?|sfx|emoji|widgets?|tiny|simple|one[- ]click|no[- ]code|beginners?|playful)\b/i},
  // Dark stage, cards with thickness, orbiting camera, cube flips: layered systems, 3D, spatial, games.
  '3d': {palette: 'depth', palettes: ['depth', 'ice'], scenes: ['stack', 'bento', 'stat', 'spotlight'], fit: /\b(3d|layers?|stack|spatial|depth|isometric|voxels?|gaussian|splat\w*|game ?engine|physics|mesh(es)?|blender|unity|godot)\b/i},
  // Talking-head split: a person recommending or reacting (tool lists, tips, "you need this").
  headshot: {palette: 'toybox', palettes: ['toybox', 'paper'], scenes: ['tiles', 'stat', 'screenshot', 'code'], fit: /\b(tools|tips?|tricks?|you (should|need)|stop using|mistakes?|best|top \d+|\d+ (free )?(tools|apps|ways|skills))\b/i},
  terminal: {palette: 'phosphor', palettes: ['phosphor', 'signal'], scenes: ['log', 'code', 'type', 'stat'], fit: /\b(cli|terminal|shell|command[- ]line|tui|rust|vim|git|security|exploit|pentest\w*|proxy|intercept\w*|burp|self[- ]host\w*|linux|kernel|compiler|npm|cargo)\b/i},
};

export const STYLE_NAMES = /** @type {StyleName[]} */ (Object.keys(STYLES));

/** @param {string} name @returns {name is StyleName} */
export const isStyle = (name) => Object.hasOwn(STYLES, name);

/**
 * Suggests a style for a candidate: the best keyword fit among styles not
 * used by the previous episode, falling back to the least recently used.
 * @param {{title: string, text?: string}} candidate
 * @param {string[]} recent  styles of recent episodes, most recent first
 * @returns {StyleName}
 */
export function pickStyle(candidate, recent = []) {
  const allowed = STYLE_NAMES.filter((s) => s !== recent[0]);
  // Title hits count triple: the title is the story's angle, the post text is detail.
  const hits = (/** @type {string} */ t, /** @type {StyleName} */ s) => (t.match(new RegExp(STYLES[s].fit, 'gi')) ?? []).length;
  const score = (/** @type {StyleName} */ s) => 3 * hits(candidate.title, s) + hits((candidate.text ?? '').slice(0, 400), s);
  const age = (/** @type {StyleName} */ s) => {
    const i = recent.indexOf(s);
    return i < 0 ? Infinity : i;
  };
  // Generic 'radar' only wins when nothing else matches.
  return [...allowed].sort((a, b) => score(b) - score(a) || (a === 'radar' ? 1 : 0) - (b === 'radar' ? 1 : 0) || age(b) - age(a))[0];
}
