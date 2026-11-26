// Maakt een Stripe Checkout-sessie. Vereist STRIPE_SECRET_KEY in Vercel (Settings -> Environment Variables).
import { priceOf } from './_price.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(501).json({ error: 'not_configured' });
  const { state, link } = req.body || {};
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'bad_request' });
  const price = priceOf(state);
  if (price == null) return res.status(400).json({ error: 'bad_config' });

  const origin = process.env.SITE_URL || `https://${req.headers.host}`;
  const hasLogo = Array.isArray(state.stickers) && state.stickers.some(x => x && x.type === 'image');
  const summary = [
    `Vorm ${state.shape}`, `blad ${state.material}`, `kern ${state.core}`, `afwerking ${state.finish}`, `patroon ${state.design}`,
    state.text ? `tekst "${String(state.text).slice(0, 30)}"` : '', state.gripText ? `naam eindkap "${String(state.gripText).slice(0, 10)}"` : '',
    hasLogo ? 'EIGEN LOGO (mail na betaling)' : ''
  ].filter(Boolean).join(', ');

  const f = new URLSearchParams();
  f.set('mode', 'payment');
  f.set('success_url', `${origin}/bedankt.html`);
  f.set('cancel_url', `${origin}/configurator.html`);
  f.set('line_items[0][quantity]', '1');
  f.set('line_items[0][price_data][currency]', 'eur');
  f.set('line_items[0][price_data][unit_amount]', String(price * 100));
  f.set('line_items[0][price_data][product_data][name]', 'Eigen ontwerp padelracket - PadelForge');
  f.set('line_items[0][price_data][product_data][description]', summary.slice(0, 500));
  ['BE', 'NL', 'DE', 'FR', 'LU'].forEach((c, i) => f.set(`shipping_address_collection[allowed_countries][${i}]`, c));
  f.set('phone_number_collection[enabled]', 'true');
  f.set('metadata[prijs]', String(price));
  f.set('metadata[logo_nodig]', hasLogo ? 'ja' : 'nee');
  const url = String(link || '').slice(0, 4000);
  for (let i = 0; i * 480 < url.length && i < 8; i++) f.set(`metadata[ontwerp_${i + 1}]`, url.slice(i * 480, (i + 1) * 480));

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f
  });
  const data = await r.json();
  if (!r.ok) return res.status(502).json({ error: 'stripe_error' });
  return res.status(200).json({ url: data.url });
}
