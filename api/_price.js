// Prijslogica aan de serverkant (zelfde als de configurator). Zo kan niemand de prijs aanpassen in de browser.
const MATERIAL = { glass: -20, c3k: 0, c12k: 30, c18k: 50 };
const CORE = { soft: 0, medium: 0, hard: 10 };
const FINISH = { gloss: 0, matte: 0, metal: 10 };
const DESIGN = { solid: 0, stripes: 10, fade: 10, split: 10, waves: 12, geo: 15, halftone: 15, bolt: 12 };
const BASE = 139;

export function priceOf(s) {
  if (!(s.material in MATERIAL) || !(s.core in CORE) || !(s.finish in FINISH) || !(s.design in DESIGN)) return null;
  let p = BASE + MATERIAL[s.material] + CORE[s.core] + FINISH[s.finish] + DESIGN[s.design];
  (Array.isArray(s.stickers) ? s.stickers.slice(0, 40) : []).forEach(x => { p += x && x.type === 'image' ? 15 : 3; });
  if (typeof s.text === 'string' && s.text.trim()) p += 12;
  if (typeof s.gripText === 'string' && s.gripText.trim()) p += 5;
  if (s.protector) p += 9; if (s.overgrip) p += 6; if (s.cover) p += 15;
  return p;
}
