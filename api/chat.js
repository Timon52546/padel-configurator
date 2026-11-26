// AI-assistent van PadelForge. Vereist ANTHROPIC_API_KEY in Vercel (Settings -> Environment Variables).
const SYSTEM = `Je bent de assistent van PadelForge, een Belgische webshop waar klanten hun eigen padelracket ontwerpen in een 3D-configurator. Antwoord in de taal van de klant (meestal Nederlands), kort, vriendelijk en concreet.

Feiten over de shop (verzin niets erbij; weet je iets niet, verwijs naar boonen.timon@outlook.com):
- Basisprijs 139 euro. Blad: glasvezel -20, carbon 3K inbegrepen, 12K +30, 18K +50. Kern: soft/medium inbegrepen, hard +10. Afwerking: glans/mat inbegrepen, metallic +10. Patroon: effen gratis, strepen/verloop/split +10, golven/bliksem +12, geometrisch/halftone +15. Elke vorm/sticker +3, eigen logo +15, tekst op het blad +12, naam op de eindkap +5. Extra's: frame-protector +9, 3 overgrips +6, thermo-hoes +15.
- Vormen: rond (controle, beginners), traan (allrounder), diamant (power, gevorderden).
- Elke racket wordt op bestelling gemaakt. Levertijd ongeveer 2 tot 4 weken. Gratis ontwerphulp en clubs/bedrijven (offerte vanaf 10 stuks) via de pagina's Info en Clubs.

Als de klant een ontwerp wil, stel er een voor en eindig je antwoord met EXACT één regel: DESIGN: {json}
Toegestane sleutels en waarden: shape (round|teardrop|diamond), holes (small|big), design (solid|stripes|fade|split|waves|geo|halftone|bolt), face, accent, accent2, frame, grip, textColor (hex zoals #2e7bff), text (max 12 tekens, hoofdletters), gripText (max 10 tekens), material (glass|c3k|c12k|c18k), core (soft|medium|hard), finish (gloss|matte|metal). Laat sleutels weg die de klant niet wil. Zeg erbij dat de klant het ontwerp daarna zelf kan bijsturen. Geen DESIGN-regel als de klant geen ontwerp vraagt.`;

const hits = new Map();
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: 'not_configured' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const now = Date.now(); const recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (recent.length >= 30) return res.status(429).json({ error: 'rate_limited' });
  recent.push(now); hits.set(ip, recent);

  const msgs = (Array.isArray(req.body && req.body.messages) ? req.body.messages : []).slice(-10)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1200) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'bad_request' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.CHAT_MODEL || 'claude-haiku-5-5', max_tokens: 500, system: SYSTEM, messages: msgs })
  });
  if (!r.ok) return res.status(502).json({ error: 'upstream' });
  const data = await r.json();
  const text = (data.content || []).map(c => c.text || '').join('').trim();
  return res.status(200).json({ reply: text });
}
