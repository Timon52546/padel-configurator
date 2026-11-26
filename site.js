// Gedeeld: ontwerp-opschoning + AI-chatwidget (werkt op elke pagina).
(function () {
  const ENUM = {
    shape: ['round', 'teardrop', 'diamond'], holes: ['small', 'big'],
    design: ['solid', 'stripes', 'fade', 'split', 'waves', 'geo', 'halftone', 'bolt'],
    material: ['glass', 'c3k', 'c12k', 'c18k'], core: ['soft', 'medium', 'hard'], finish: ['gloss', 'matte', 'metal']
  };
  const HEX = ['face', 'accent', 'accent2', 'frame', 'grip', 'textColor', 'gripTextColor'];
  window.PF = {
    sanitize(o) {
      const out = {}; if (!o || typeof o !== 'object') return out;
      for (const k in ENUM) if (ENUM[k].includes(o[k])) out[k] = o[k];
      HEX.forEach(k => { if (/^#[0-9a-f]{6}$/i.test(o[k] || '')) out[k] = o[k]; });
      if (typeof o.text === 'string') out.text = o.text.slice(0, 12).toUpperCase();
      if (typeof o.gripText === 'string') out.gripText = o.gripText.slice(0, 10);
      return out;
    },
    link(o) { return 'configurator.html#' + btoa(unescape(encodeURIComponent(JSON.stringify(window.PF.sanitize(o))))); }
  };

  const css = `
  #pfc-btn{position:fixed;left:20px;bottom:20px;z-index:90;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:#c6ff3d;color:#0b0d08;font-size:24px;box-shadow:0 10px 30px rgba(198,255,61,.3)}
  #pfc{position:fixed;left:20px;bottom:88px;z-index:90;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 120px));display:none;flex-direction:column;background:#12141b;border:1px solid #2e3340;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:Inter,system-ui,sans-serif}
  #pfc.open{display:flex}
  #pfc header{padding:14px 16px;border-bottom:1px solid #22262f;font-weight:700;font-size:14px;color:#f2f4f8;display:flex;justify-content:space-between}
  #pfc header small{color:#8a92a3;font-weight:500}
  #pfm{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
  .pfb{max-width:86%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;color:#f2f4f8}
  .pfb.bot{background:#1a1d27;align-self:flex-start}.pfb.me{background:#c6ff3d;color:#0b0d08;align-self:flex-end}
  .pfb a,.pfb button{display:inline-block;margin-top:8px;background:#c6ff3d;color:#0b0d08;border:0;border-radius:999px;padding:8px 14px;font-weight:700;font-size:13px;cursor:pointer}
  #pff{display:flex;gap:8px;padding:10px;border-top:1px solid #22262f}
  #pff input{flex:1;background:#0e1016;border:1px solid #22262f;color:#f2f4f8;border-radius:12px;padding:11px 12px;font-size:14px;font-family:inherit}
  #pff input:focus{outline:none;border-color:#c6ff3d}
  #pff button{background:#c6ff3d;border:0;border-radius:12px;padding:0 14px;font-weight:700;cursor:pointer}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const btn = document.createElement('button'); btn.id = 'pfc-btn'; btn.setAttribute('aria-label', 'Chat met de assistent'); btn.textContent = '💬';
  const box = document.createElement('div'); box.id = 'pfc';
  box.innerHTML = '<header><span>PadelForge-assistent <small>AI</small></span><span id="pfx" style="cursor:pointer">✕</span></header><div id="pfm"></div><form id="pff"><input id="pfi" placeholder="Stel een vraag of beschrijf je droomracket…" maxlength="400" autocomplete="off"><button>→</button></form>';
  document.body.append(btn, box);
  const m = box.querySelector('#pfm'), form = box.querySelector('#pff'), inp = box.querySelector('#pfi');
  const hist = [];
  const add = (cls, text) => { const d = document.createElement('div'); d.className = 'pfb ' + cls; d.textContent = text; m.appendChild(d); m.scrollTop = m.scrollHeight; return d; };
  add('bot', 'Hoi! Ik beantwoord vragen over rackets, prijzen en levering. Beschrijf je droomracket (bv. "zwart-neon, krachtig, naam TIMON") en ik stel een ontwerp voor.');
  btn.onclick = () => { box.classList.toggle('open'); if (box.classList.contains('open')) inp.focus(); };
  box.querySelector('#pfx').onclick = () => box.classList.remove('open');

  form.onsubmit = async e => {
    e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = '';
    add('me', q); hist.push({ role: 'user', content: q });
    const wait = add('bot', '…');
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist }) });
      if (r.status === 501) throw new Error('De assistent is nog niet ingeschakeld.');
      if (r.status === 429) throw new Error('Te veel vragen na elkaar, probeer het later opnieuw.');
      if (!r.ok) throw new Error('Er ging iets mis, probeer het zo opnieuw.');
      const { reply } = await r.json(); hist.push({ role: 'assistant', content: reply });
      let design = null;
      const text = reply.replace(/^DESIGN:\s*(\{.*\})\s*$/m, (_, j) => { try { design = window.PF.sanitize(JSON.parse(j)); } catch (e) {} return ''; }).trim();
      wait.textContent = text;
      if (design && Object.keys(design).length) {
        if (window.padelApplyDesign) { const b = document.createElement('button'); b.textContent = 'Toon op mijn racket'; b.onclick = () => window.padelApplyDesign(design); wait.appendChild(document.createElement('br')); wait.appendChild(b); window.padelApplyDesign(design); }
        else { const a = document.createElement('a'); a.href = window.PF.link(design); a.textContent = 'Bekijk in 3D →'; wait.appendChild(document.createElement('br')); wait.appendChild(a); }
      }
    } catch (err) { wait.textContent = err.message; }
    m.scrollTop = m.scrollHeight;
  };
})();
