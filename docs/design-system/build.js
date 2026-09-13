// Regenerates previews/*.html. Each card is a self-contained HTML document whose
// first line is an @dsCard marker (indexed by the Claude Design pane).
// Run: node docs/design-system/build.js
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'previews');
fs.mkdirSync(OUT, { recursive: true });

const BASE_CSS = `
:root{--gold:#c9a84c;--gold-light:#e3c77a;--bg:#1a1a2e;--surface:#16213e;--deep:#0d1526;--raised:#1f2a4a;--border:#2a3a5c;
--text:#fff;--body:#e0e0e0;--warm:#e0d5b5;--quote:#e8e0d0;--muted:#888;--faint:#555;--success:#4caf50;--danger:#ff4444;--evening:#4a6fa5;
--sans:-apple-system,"SF Pro Text",Inter,system-ui,sans-serif;--serif:"Cormorant Garamond",Georgia,serif;--mono:"JetBrains Mono","Courier New",monospace}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--bg);color:var(--text);font-family:var(--sans);-webkit-font-smoothing:antialiased;padding:24px}
h1.ds{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:700;margin:0 0 4px}
p.ds{font-size:13px;color:var(--muted);margin:0 0 20px;line-height:19px;max-width:640px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.col{display:flex;flex-direction:column;gap:12px}
.stack{display:flex;flex-direction:column;gap:10px}
.lbl{font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold);font-weight:700}
.lbl.dim{color:rgba(201,168,76,.53)}
.eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:700}
.card{background:var(--surface);border:1px solid rgba(201,168,76,.2);border-radius:14px;padding:16px}
.card.sel{border:2px solid var(--gold)}
.card.hair{border-color:rgba(201,168,76,.13)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;border-radius:14px;padding:16px 24px;background:var(--gold);color:var(--bg);font-weight:700;font-size:17px;letter-spacing:.2px;border:0;font-family:inherit;cursor:pointer}
.btn.md{padding:11px 18px;font-size:14px;border-radius:10px}
.btn.sm{padding:8px 18px;font-size:13px;border-radius:10px}
.btn.pill{border-radius:999px;padding:7px 14px;font-size:10px;letter-spacing:1.2px;text-transform:uppercase}
.btn.secondary{background:rgba(201,168,76,.13);border:1px solid rgba(201,168,76,.53);color:var(--gold)}
.btn.ghost{background:transparent;color:var(--muted);font-weight:600}
.btn.danger{background:var(--danger);color:#fff}
.btn.disabled{opacity:.5}
.btn.outline-dashed{background:transparent;border:1px dashed rgba(201,168,76,.27);color:var(--gold);font-size:15px;font-weight:600;padding:16px;width:100%}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;background:var(--surface);border:1px solid rgba(201,168,76,.13);color:var(--muted);font-size:13px;font-weight:600}
.chip.on{background:rgba(201,168,76,.2);border-color:var(--gold);color:var(--gold)}
.seg{display:flex;background:var(--surface);border-radius:12px;padding:4px;gap:0}
.seg>div{flex:1;text-align:center;padding:10px;border-radius:10px;color:var(--muted);font-size:14px;font-weight:600}
.seg>div.on{background:var(--gold);color:var(--bg)}
.utabs{display:flex;background:var(--surface);border-bottom:1px solid rgba(201,168,76,.13)}
.utabs>div{flex:1;text-align:center;padding:12px;color:var(--muted);font-size:14px;font-weight:600;border-bottom:2px solid transparent}
.utabs>div.on{color:var(--gold);border-bottom-color:var(--gold)}
.badge{display:inline-block;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;text-transform:capitalize}
.input{background:var(--bg);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:12px 16px;color:#fff;font-size:16px;font-family:inherit;width:100%}
.input::placeholder{color:#555}
.swatch{width:120px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08)}
.swatch>div:first-child{height:64px}.swatch>div:last-child{padding:8px 10px;background:#0d1526}
.swatch b{display:block;font-size:11px;color:#e0e0e0}.swatch span{font-size:10px;color:#888;font-family:var(--mono)}
.phone{width:375px;min-height:640px;background:var(--bg);border-radius:32px;border:1px solid rgba(255,255,255,.1);overflow:hidden;position:relative;display:flex;flex-direction:column}
.phone .screen{flex:1;padding:25px;padding-top:56px;overflow:hidden}
.tabbar{height:60px;background:var(--bg);display:flex;align-items:center;justify-content:space-around;padding-bottom:5px}
.tabbar div{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9px;color:gray}
.tabbar div.on{color:var(--gold)}
.tabbar svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.ico{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.well{width:44px;height:44px;border-radius:22px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;color:var(--gold)}
.rule{width:100%;height:1px;background:rgba(201,168,76,.13)}
`;

const svg = {
  home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>',
  lib:'<svg viewBox="0 0 24 24"><path d="M4 4h3v16H4zM9 4h3v16H9zM14 5l3-1 4 15-3 1z"/></svg>',
  news:'<svg viewBox="0 0 24 24"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h6M7 13h6"/></svg>',
  trophy:'<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg>',
  send:'<svg viewBox="0 0 24 24"><path d="M3 11l18-8-7 18-3-7z"/></svg>',
  chev:'<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  flame:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 10V8a5 5 0 0 1 10 0v2h1v11H6V10zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>',
  plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>',
};
const ico = (k, extra = '') => svg[k].replace('<svg', `<svg class="ico"${extra ? ` style="${extra}"` : ''}`);
const tabbar = (on) => `<div class="tabbar">${[['home','Home'],['sun','Morning'],['moon','Evening'],['mic','Cabinet'],['book','Journal'],['lib','Focus'],['news','Scrolls'],['trophy','Progress']].map(([k,l])=>`<div class="${l===on?'on':''}">${svg[k]}<span>${l}</span></div>`).join('')}</div>`;

function page(meta, body, extraCss = '') {
  const attrs = Object.entries(meta).map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
  return `<!-- @dsCard ${attrs} -->
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arete DS: ${meta.name}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@400;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>${BASE_CSS}${extraCss}</style></head><body>${body}</body></html>`;
}

const cards = [];
const add = (file, meta, body, css) => cards.push({ file, html: page(meta, body, css) });

// Shared fragments reused by component cards and screen mockups.
const quoteCard = (q, who) => `<div class="card hair" style="border-left:3px solid var(--gold);display:flex;gap:12px;padding:20px"><div style="font-size:44px;line-height:44px;color:var(--gold);font-weight:700;margin-top:-4px">“</div><div><div style="font-size:14px;font-style:italic;line-height:22px;color:var(--quote)">${q}</div><div style="font-size:12px;font-weight:600;color:var(--gold);margin-top:8px">${who}</div></div></div>`;
const promptCard = (q, who) => `<div class="card" style="border-left:3px solid var(--gold);display:flex;gap:12px;align-items:center;padding:20px"><div style="flex:1"><div class="lbl dim">Today's question</div><div style="font-size:15px;line-height:22px;margin-top:6px">${q}</div><div style="font-size:12px;font-weight:600;color:var(--gold);margin-top:4px">${who}</div></div>${ico('chev','color:#888')}</div>`;
const streakCard = `<div class="card" style="display:flex;gap:16px;align-items:center;padding:24px"><div style="font-size:52px;font-weight:700;color:var(--gold);line-height:56px">14</div><div><div style="font-size:16px;font-weight:600">day streak</div><div style="font-size:12px;color:#666;font-style:italic;margin-top:3px">Keep the chain unbroken</div></div></div>`;
const taskOpen = (t, n) => `<div class="card" style="display:flex;gap:14px;align-items:center;padding:18px"><div style="width:22px;height:22px;border-radius:11px;border:2px solid rgba(201,168,76,.4)"></div><div><div style="font-size:16px">${t}</div>${n?`<div style="font-size:12px;color:var(--muted);margin-top:2px">${n}</div>`:''}</div></div>`;
const taskDone = (t) => `<div class="card" style="background:var(--gold);border-color:var(--gold);display:flex;gap:14px;align-items:center;padding:18px"><div style="width:22px;height:22px;border-radius:11px;background:var(--bg);color:var(--gold);display:flex;align-items:center;justify-content:center">${ico('check','width:14px;height:14px')}</div><div style="font-size:16px;font-weight:700;color:var(--bg);text-decoration:line-through">${t}</div></div>`;
const userBubble = (t) => `<div style="display:flex;justify-content:flex-end"><div style="max-width:80%;background:rgba(201,168,76,.15);border:1px solid var(--gold);border-radius:16px;border-bottom-right-radius:4px;padding:14px;font-size:15px;line-height:22px">${t}</div></div>`;
const counselorBubble = (who, t) => `<div style="display:flex"><div style="max-width:85%;background:var(--surface);border:1px solid rgba(201,168,76,.2);border-radius:16px;border-bottom-left-radius:4px;padding:14px"><div class="lbl" style="letter-spacing:.5px;margin-bottom:6px">${who}</div><div style="font-size:15px;line-height:24px;color:var(--body)">${t}</div></div></div>`;
const thinking = (who) => `<div class="row" style="gap:10px"><div style="width:16px;height:16px;border:2px solid var(--gold);border-right-color:transparent;border-radius:8px"></div><span style="font-size:14px;font-style:italic;color:var(--muted)">${who} is considering...</span></div>`;
const inputBar = (margin = '') => `<div style="display:flex;gap:10px;align-items:flex-end;background:var(--surface);border-top:1px solid rgba(201,168,76,.13);padding:12px 12px 16px;${margin}"><div style="flex:1;background:var(--bg);border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:10px 16px;font-size:15px;color:#555">Speak to your cabinet</div><div style="width:40px;height:40px;border-radius:20px;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center">${ico('send')}</div></div>`;
const progress = (label, pct) => `<div><div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:15px;font-weight:600">${label}</span><span style="font-size:15px;font-weight:700;color:var(--gold)">${pct}%</span></div><div style="height:12px;border-radius:10px;background:var(--deep);overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--gold);border-radius:10px"></div></div></div>`;
const planCard = (hi, name, sub, price, per, badge) => `<div style="background:#0f1e38;border:1px solid ${hi?'rgba(201,168,76,.33)':'#1e3050'};border-radius:14px;padding:16px">${badge?`<span style="display:inline-block;background:var(--gold);color:#0a1628;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:800;letter-spacing:1px;margin-bottom:10px">${badge}</span>`:''}<div class="row" style="justify-content:space-between"><div><div style="font-size:15px;font-weight:600;color:#e8edf5">${name}</div><div style="font-size:12px;color:#8a9bb0;line-height:17px">${sub}</div></div><div style="text-align:right"><div style="font-size:17px;font-weight:700;color:#e8edf5">${price}</div><div style="font-size:11px;color:#8a9bb0">${per}</div></div></div></div>`;
const routinePills = `<div class="row" style="gap:10px;margin-bottom:20px"><div style="flex:1;background:var(--surface);border:1px solid #2a2a3e;border-radius:50px;padding:13px;text-align:center"><div style="font-size:18px">☀️</div><div style="font-size:10px;font-weight:700;color:#444;letter-spacing:.6px;text-transform:uppercase">Morning</div></div><div style="flex:1;background:rgba(201,168,76,.09);border:1px solid var(--gold);border-radius:50px;padding:13px;text-align:center"><div style="font-size:18px">🌙</div><div style="font-size:10px;font-weight:700;color:var(--gold);letter-spacing:.6px;text-transform:uppercase">Evening</div></div></div>`;

// ─── Foundations ─────────────────────────────────────────────────────────────
const sw = (hex, name, note='') => `<div class="swatch"><div style="background:${hex}"></div><div><b>${name}</b><span>${hex}</span>${note?`<span style="display:block;color:#666;font-family:var(--sans)">${note}</span>`:''}</div></div>`;
add('foundations/colors.html', { name:'Palette', group:'Colors', subtitle:'Ink surfaces, one gold, semantic states', width:760, height:620 }, `
<h1 class="ds">Colors</h1><p class="ds">Deep blue-black surfaces and a single antique gold. Gold does the work of every accent, usually at reduced opacity. Semantic hues appear only for state.</p>
<div class="lbl" style="margin-bottom:8px">Brand gold</div>
<div class="row" style="margin-bottom:20px">${sw('#c9a84c','Gold','the only accent')}${sw('#e3c77a','Gold light','library highlights')}${sw('#9a7a32','Gold deep','academy dim')}</div>
<div class="lbl" style="margin-bottom:8px">Mobile app surfaces</div>
<div class="row" style="margin-bottom:20px">${sw('#1a1a2e','Background','screen')}${sw('#16213e','Surface','cards, sheets, tab tracks')}${sw('#0d1526','Deep','progress track')}${sw('#1f2a4a','Raised','dispatch card')}${sw('#2a3a5c','Border','counselor cards')}</div>
<div class="lbl" style="margin-bottom:8px">Web app v2 and Academy surfaces</div>
<div class="row" style="margin-bottom:20px">${sw('#0f1724','Web bg')}${sw('#161f2e','Web surface solid')}${sw('#0a1628','Academy navy')}${sw('#0f1e38','Academy surface')}${sw('#111d30','Academy card')}${sw('#1e3258','Academy border')}</div>
<div class="lbl" style="margin-bottom:8px">Text</div>
<div class="row" style="margin-bottom:20px">${sw('#ffffff','Primary')}${sw('#e0e0e0','Body')}${sw('#e0d5b5','Warm','titles on cards')}${sw('#e8e0d0','Quote')}${sw('#888888','Muted')}${sw('#555555','Faint','dates, footers')}${sw('#f5edd6','Cream','academy')}${sw('#f4ead5','Ivory','library')}</div>
<div class="lbl" style="margin-bottom:8px">Semantic</div>
<div class="row">${sw('#4caf50','Success','done, under budget')}${sw('#ff4444','Danger','stop, over budget')}${sw('#4a6fa5','Evening','evening dots')}${sw('#b39ddb','Insight','journal insight')}</div>
`);

add('foundations/gold-opacity.html', { name:'Gold opacity scale', group:'Colors', subtitle:'Hairlines, tints and washes from 5% to 55%', width:760, height:300 }, `
<h1 class="ds">Gold opacity</h1><p class="ds">Most "color" in Arete is gold at low alpha over ink. Hairline borders at 13 to 27%, tints at 9 to 20%, selected borders at 100%.</p>
<div class="row">${[['0.05','#c9a84c0d','wash, mark buttons'],['0.09','#c9a84c17','banner tint'],['0.13','#c9a84c22','hairline border'],['0.15','rgba(201,168,76,.15)','user bubble, icon wells'],['0.2','#c9a84c33','card border, active chip'],['0.27','#c9a84c44','dashed add, nudge card'],['0.33','#c9a84c55','plan highlight border'],['0.53','#c9a84c88','secondary button border'],['1','#c9a84c','selected, CTA']].map(([a,c,n])=>`<div class="swatch"><div style="background:${c};border-bottom:1px solid rgba(255,255,255,.06)"></div><div><b>${a}</b><span>${c}</span><span style="display:block;color:#666;font-family:var(--sans)">${n}</span></div></div>`).join('')}</div>
`);

add('foundations/type.html', { name:'Typography', group:'Type', subtitle:'System sans in the app, serif on the web', width:760, height:900 }, `
<h1 class="ds">Type</h1><p class="ds">The app uses the platform font and builds hierarchy from weight, size and gold. The web and academy add Cormorant Garamond or Playfair Display for reading and headings, Inter for UI, JetBrains Mono for code.</p>
<div class="stack" style="gap:18px">
<div><div class="lbl dim">Display 72 / 700 / tracking 4 (focus timer)</div><div style="font-size:72px;font-weight:700;color:var(--gold);letter-spacing:4px;line-height:1">25:00</div></div>
<div><div class="lbl dim">Hero number 52 to 64 / 700 (streaks)</div><div style="font-size:52px;font-weight:700;color:var(--gold);line-height:56px">14</div></div>
<div><div class="lbl dim">Name 32 / 700 white, greeting 20 muted</div><div style="font-size:20px;color:var(--muted)">Good evening,</div><div style="font-size:32px;font-weight:700">Kyle</div></div>
<div><div class="lbl dim">Screen title 26 / 700 gold</div><div style="font-size:26px;font-weight:700;color:var(--gold)">The Cabinet</div></div>
<div><div class="lbl dim">Section title 16 / 700 gold, card title 16 / 700 white</div><div style="font-size:16px;font-weight:700;color:var(--gold)">Reading list</div><div style="font-size:16px;font-weight:700">Marcus Aurelius</div></div>
<div><div class="lbl dim">Eyebrow 11 / 700 / tracking 3 uppercase, kicker 10 / 700 / tracking 1.2</div><div class="eyebrow">Arete Premium</div><div class="lbl" style="margin-top:6px">Today's question</div></div>
<div><div class="lbl dim">Body 15 / 22, counselor reply 15 / 24</div><div style="font-size:15px;line-height:22px;color:var(--body);max-width:520px">You have power over your mind, not outside events. Realize this, and you will find strength.</div></div>
<div><div class="lbl dim">Quote 14 italic / 22 warm, attribution 12 / 600 gold</div><div style="font-size:14px;font-style:italic;line-height:22px;color:var(--quote);max-width:520px">Waste no more time arguing about what a good man should be. Be one.</div><div style="font-size:12px;font-weight:600;color:var(--gold);margin-top:6px">Marcus Aurelius</div></div>
<div><div class="lbl dim">Caption 12 muted, meta 11 faint</div><div style="font-size:12px;color:var(--muted)">Tap to open the full dispatch</div><div style="font-size:11px;color:var(--faint)">Sep 13, 2026</div></div>
<div class="rule"></div>
<div><div class="lbl dim">Web and Library serif: Cormorant Garamond</div><div style="font-family:var(--serif);font-size:34px;color:#f4ead5;line-height:1.15">The Library of Arete</div><div style="font-family:var(--serif);font-size:19px;color:#e8e4d6;line-height:1.5;max-width:520px;margin-top:6px">A reading room where the texts answer back, and every note you leave is a claim someone else may test.</div></div>
<div><div class="lbl dim">Academy serif: Playfair Display, with the gold text gradient</div><div style="font-family:'Playfair Display',Georgia,serif;font-size:30px;background:linear-gradient(135deg,#c9a84c,#e8c96a 50%,#c9a84c);-webkit-background-clip:text;background-clip:text;color:transparent">Pursue Arete</div></div>
<div><div class="lbl dim">Mono: JetBrains Mono</div><div style="font-family:var(--mono);font-size:12px;color:var(--muted)">text_type = concordance · review_by 2027-01-01</div></div>
</div>
`);

add('foundations/shape-spacing.html', { name:'Radii, borders, spacing', group:'Spacing', subtitle:'Card radii 12 to 20, hairline 1px, accent rule 3px', width:760, height:420 }, `
<h1 class="ds">Shape and spacing</h1><p class="ds">Cards are flat: 1px borders, no shadows. Radii step 10 (buttons), 12 (cards), 14 (routine cards), 16 (panels), 20 (hero), 999 (pills). A 3px gold left rule marks quotations.</p>
<div class="row" style="align-items:flex-end;margin-bottom:24px">${[[6,'badge'],[8,'chip'],[10,'button'],[12,'card'],[14,'card lg'],[16,'panel'],[18,'sheet'],[20,'hero'],[999,'pill']].map(([r,n])=>`<div style="text-align:center"><div style="width:72px;height:56px;background:var(--surface);border:1px solid rgba(201,168,76,.33);border-radius:${r}px"></div><div style="font-size:10px;color:var(--muted);margin-top:6px">${r} ${n}</div></div>`).join('')}</div>
<div class="row" style="margin-bottom:24px">
<div style="width:200px;height:64px;background:var(--surface);border:1px solid rgba(201,168,76,.13);border-radius:14px;display:flex;align-items:center;padding:0 14px;font-size:12px;color:var(--muted)">1px hairline 13%</div>
<div style="width:200px;height:64px;background:var(--surface);border:2px solid var(--gold);border-radius:14px;display:flex;align-items:center;padding:0 14px;font-size:12px;color:var(--gold)">2px selected</div>
<div style="width:200px;height:64px;background:var(--surface);border-left:3px solid var(--gold);border-radius:14px;display:flex;align-items:center;padding:0 14px;font-size:12px;color:var(--quote);font-style:italic">3px accent rule</div>
</div>
<div class="lbl" style="margin-bottom:8px">Spacing steps</div>
<div class="row" style="align-items:flex-end">${[4,8,10,12,14,16,20,25,28].map(s=>`<div style="text-align:center"><div style="width:${s*2}px;height:${s*2}px;background:rgba(201,168,76,.2);border:1px solid rgba(201,168,76,.4);border-radius:4px"></div><div style="font-size:10px;color:var(--muted);margin-top:4px">${s}</div></div>`).join('')}</div>
`);

add('foundations/iconography.html', { name:'Iconography', group:'Brand', subtitle:'Ionicons outline set, gold icon wells, app icon', width:760, height:300 }, `
<h1 class="ds">Icons and brand mark</h1><p class="ds">Ionicons, outline variants. Filled only for state (flame, checkmark, lock). Icons sit in 38 to 48px circular wells with a 15% gold fill and a 30% gold hairline.</p>
<div class="row" style="gap:20px">
<img src="../../assets/icon.png" alt="Arete app icon" style="width:96px;height:96px;border-radius:22px;border:1px solid rgba(255,255,255,.1)">
${['home','sun','moon','mic','book','lib','news','trophy','send','flame','check','lock'].map(k=>`<div class="well">${ico(k)}</div>`).join('')}
</div>
<div style="margin-top:20px;font-size:13px;font-weight:800;letter-spacing:3px;color:var(--gold)">ARETE</div>
<div style="font-size:11px;font-style:italic;color:#556">Counsel from the ancients, for the life you are living</div>
`);

// ─── Components ──────────────────────────────────────────────────────────────
add('components/buttons.html', { name:'Buttons', group:'Actions', subtitle:'Primary, medium, small, pill, secondary, ghost, danger, dashed add', width:720, height:420 }, `
<h1 class="ds">Buttons</h1><p class="ds">Primary is a solid gold block with ink text. Secondary is a gold tint with a 53% gold border. Tertiary is bare muted text. Destructive is red. Adding something is a dashed gold outline.</p>
<div class="stack" style="gap:16px;max-width:560px">
<div class="row"><button class="btn">${ico('sun')} Start your morning</button><button class="btn disabled">Continue</button></div>
<div class="row"><button class="btn md">Subscribe</button><button class="btn sm">Add</button><button class="btn pill">Set up</button><button class="btn secondary sm">Retry</button><button class="btn ghost sm">Later</button><button class="btn danger sm">Stop</button></div>
<button class="btn outline-dashed">${ico('plus')} Add a task</button>
<div class="row"><div style="width:56px;height:56px;border-radius:28px;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700">+</div><div style="width:40px;height:40px;border-radius:20px;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center">${ico('send')}</div><div style="width:40px;height:40px;border-radius:20px;background:var(--surface);border:1px solid #555;color:#555;display:flex;align-items:center;justify-content:center">${ico('send')}</div><span style="font-size:12px;color:var(--muted)">FAB 56, send 40, send disabled</span></div>
</div>
`);

add('components/chips-tabs.html', { name:'Chips, pills and tabs', group:'Navigation', subtitle:'Filter chips, segmented control, underline tabs, bottom tab bar', width:720, height:460 }, `
<h1 class="ds">Chips and tabs</h1><p class="ds">Chips are fully rounded with a gold hairline; active turns to a 20% gold tint with a solid gold border. Two tab idioms: a segmented track whose active segment is solid gold, and top tabs with a 2px gold underline. The bottom tab bar is ink with gold active tint.</p>
<div class="stack" style="gap:18px;max-width:600px">
<div class="row"><span class="chip on">All</span><span class="chip">Reflections</span><span class="chip">Quotes</span><span class="chip">Goals</span><span class="chip">Dispatches</span></div>
<div class="seg"><div class="on">Read</div><div>Books</div><div>History</div></div>
<div class="utabs"><div class="on">Cabinet</div><div>Counselors</div><div>Sessions</div></div>
${routinePills}
<div style="width:375px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.08)">${tabbar('Cabinet')}</div>
</div>
`);

add('components/badges.html', { name:'Badges and labels', group:'Components', subtitle:'Counselor categories, challenge levels, starter, lock, plan badge', width:720, height:340 }, `
<h1 class="ds">Badges</h1><p class="ds">Six counselor categories and three challenge levels each get a tinted badge (20% or 15% alpha of a hue, pastel text). Starter and lock badges are small caps. The paywall badge is solid gold with ink text.</p>
<div class="stack" style="gap:14px">
<div class="row">${Object.entries({stoics:['rgba(201,168,76,.2)','#c9a84c'],warriors:['rgba(239,68,68,.2)','#fca5a5'],athletes:['rgba(59,130,246,.2)','#93c5fd'],builders:['rgba(34,197,94,.2)','#86efac'],writers:['rgba(168,85,247,.2)','#d8b4fe'],spiritual:['rgba(99,102,241,.2)','#a5b4fc']}).map(([k,[b,t]])=>`<span class="badge" style="background:${b};color:${t}">${k}</span>`).join('')}</div>
<div class="row">${Object.entries({direct:['rgba(239,68,68,.15)','#f87171'],firm:['rgba(234,179,8,.15)','#fde047'],gentle:['rgba(34,197,94,.15)','#86efac']}).map(([k,[b,t]])=>`<span class="badge" style="background:${b};color:${t}">${k}</span>`).join('')}</div>
<div class="row">
<span style="background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.33);border-radius:6px;padding:2px 7px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--gold)">Starter</span>
<span style="display:inline-flex;gap:4px;align-items:center;background:#222;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:600;color:#888">${ico('lock','width:12px;height:12px')} Arete</span>
<span style="background:var(--gold);color:#0a1628;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:800;letter-spacing:1px">MOST POPULAR</span>
<span style="background:rgba(201,168,76,.13);border:1px solid rgba(201,168,76,.33);border-radius:20px;padding:5px 12px;font-size:14px;font-weight:700;color:var(--gold)">${ico('flame','width:14px;height:14px;vertical-align:-2px')} 14</span>
<span style="background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;color:var(--gold)">Read</span>
</div>
<div class="row"><span class="lbl">Today's question</span><span class="lbl dim">Prompt</span><span class="eyebrow">Arete Premium</span><span style="font-size:11px;color:rgba(201,168,76,.6);font-variant:small-caps;letter-spacing:.5px">Marcus · Seneca · Epictetus</span></div>
</div>
`);

add('components/cards.html', { name:'Cards', group:'Components', subtitle:'Quote, prompt, streak, stat, task, plan, dispatch, insight', width:760, height:900 }, `
<h1 class="ds">Cards</h1><p class="ds">Flat surfaces on <code style="font-family:var(--mono)">#16213e</code> with a gold hairline. Emphasis comes from a 3px gold left rule, a solid gold border, or a hero number. Done states invert to solid gold with ink text.</p>
<div class="row" style="align-items:flex-start;gap:16px">
<div class="stack" style="width:340px">
${quoteCard('The impediment to action advances action. What stands in the way becomes the way.','Marcus Aurelius')}
${promptCard('What did you avoid today that you knew you should face?','Seneca')}
${streakCard}
<div class="row" style="gap:12px">${[['32','Reflections'],['6','Books read'],['4h','Focus this week']].map(([n,l])=>`<div class="card hair" style="flex:1;text-align:center;padding:14px"><div style="font-size:22px;font-weight:700;color:var(--gold)">${n}</div><div style="font-size:11px;color:var(--muted);line-height:16px">${l}</div></div>`).join('')}</div>
${taskOpen('Read 20 pages of Meditations','Book II')}
${taskDone('Cold shower')}
</div>
<div class="stack" style="width:340px">
<div class="card" style="background:var(--raised);border-color:rgba(201,168,76,.33)"><div class="row" style="justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gold)">Dispatch from Epictetus</span><span style="font-size:11px;color:#555">Today</span></div><div style="font-size:16px;font-weight:700;line-height:22px;margin-bottom:4px">On the things not up to us</div><div style="font-size:14px;line-height:21px;color:#ccc">You wrote that the meeting went badly. Which part of that was yours to command?</div><div style="font-size:13px;font-weight:700;color:var(--gold);text-align:right;margin-top:10px">Read more</div></div>
<div class="card" style="background:#241f3d;border-color:rgba(123,94,167,.33)"><div style="font-size:13px;font-weight:700;font-style:italic;color:#b39ddb;margin-bottom:6px">Pattern: avoidance</div><div style="font-size:14px;line-height:22px;color:#ccc">Three entries this week circle the same unsent message.</div></div>
<div class="card hair" style="padding:16px"><div class="row" style="justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;font-weight:700;color:var(--gold)">Reflection</span><span style="font-size:11px;color:#555">Sep 12</span></div><div style="font-size:13px;font-style:italic;color:var(--muted);line-height:20px;margin-bottom:6px">What would your future self thank you for?</div><div style="font-size:14px;line-height:22px;color:#ccc">Finishing the draft instead of rereading it. I keep polishing the first page as a way of not writing the last one.</div></div>
${planCard(true,'Annual','Two months free','$59.99','per year','BEST VALUE')}
<div class="card" style="border-color:rgba(201,168,76,.27);display:flex;gap:12px"><div class="well" style="width:38px;height:38px;border:0;background:rgba(201,168,76,.08)">${ico('news')}</div><div style="flex:1"><div style="font-size:15px;font-weight:700;color:var(--warm);margin-bottom:3px">Daily dispatches</div><div style="font-size:13px;line-height:19px;color:var(--muted)">Let your counselors write to you each morning.</div><div class="row" style="justify-content:flex-end;margin-top:12px;gap:10px"><button class="btn ghost sm">Later</button><button class="btn sm">Enable</button></div></div></div>
</div>
</div>
`);

add('components/counselor-card.html', { name:'Counselor card', group:'Components', subtitle:'Default, selected, Future Self, locked', width:760, height:520 }, `
<h1 class="ds">Counselor card</h1><p class="ds">The card that builds a Cabinet. Category and challenge badges, name, one line. Selection is a 2px gold border with a gold check. Future Self is always present. Locked cards dim to 55% with a grey lock badge.</p>
<div class="row" style="align-items:flex-start;gap:14px">
${[
 ['stoics','rgba(201,168,76,.2)','#c9a84c','direct','rgba(239,68,68,.15)','#f87171','Marcus Aurelius','Emperor who wrote to himself at night about how to be a decent man by morning.','',''],
 ['stoics','rgba(201,168,76,.2)','#c9a84c','firm','rgba(234,179,8,.15)','#fde047','Seneca','Rich, compromised, honest about both. Letters to a friend who was trying.','sel','<div style="position:absolute;bottom:10px;right:14px;color:var(--gold);font-size:18px;font-weight:700">✓</div>'],
 ['spiritual','rgba(99,102,241,.2)','#a5b4fc','gentle','rgba(34,197,94,.15)','#86efac','Future Self','The person you are becoming, who already knows how this turns out.','sel','<div style="color:var(--gold);font-size:12px;font-weight:600;margin-top:8px">Always Present</div>'],
 ['warriors','rgba(239,68,68,.2)','#fca5a5','direct','rgba(239,68,68,.15)','#f87171','Musashi','No wasted motion. The way is in training.','lock','<div style="position:absolute;bottom:10px;right:14px;display:inline-flex;gap:4px;align-items:center;background:#222;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:600;color:#888">'+ico('lock','width:12px;height:12px')+' Arete</div>'],
].map(([cat,cb,ct,ch,hb,ht,name,line,state,extra])=>`<div style="position:relative;width:230px;background:var(--surface);border:${state==='sel'?'2px solid var(--gold)':state==='lock'?'1px solid #333':'1px solid #2a3a5c'};border-radius:12px;padding:14px;${state==='lock'?'opacity:.55':''}">
<div class="row" style="gap:8px;margin-bottom:8px"><span class="badge" style="background:${cb};color:${ct}">${cat}</span><span class="badge" style="background:${hb};color:${ht}">${ch}</span></div>
<div style="font-size:16px;font-weight:700;color:var(--body);margin-bottom:4px">${name}</div>
<div style="font-size:13px;line-height:18px;color:var(--muted)">${line}</div>${extra}</div>`).join('')}
</div>
<div style="margin-top:16px" class="row"><span class="lbl dim">Cabinet member pills</span>
<span style="border:1px solid rgba(201,168,76,.2);background:var(--bg);border-radius:20px;padding:7px 14px;font-size:13px;font-weight:500;color:var(--body)">Marcus Aurelius</span>
<span style="border:1px solid rgba(201,168,76,.2);background:var(--bg);border-radius:20px;padding:7px 14px;font-size:13px;font-weight:500;color:var(--body)">Seneca</span>
<span style="border:1px solid var(--gold);background:rgba(201,168,76,.1);border-radius:20px;padding:7px 14px;font-size:13px;font-weight:600;color:var(--gold)">Future Self</span></div>
`);

add('components/chat.html', { name:'Cabinet conversation', group:'Components', subtitle:'User and counselor bubbles, thinking state, input bar', width:420, height:640 }, `
<h1 class="ds">Conversation</h1><p class="ds">User messages sit right in a 15% gold wash with a solid gold border and a 4px tail. Counselors sit left on surface with a gold hairline, their name as a kicker, and looser 24px line-height.</p>
<div style="width:375px;display:flex;flex-direction:column;gap:12px">
${userBubble('I keep putting off the conversation with my brother.')}
${counselorBubble('Marcus Aurelius','You call it putting off. I would call it rehearsing his reaction, which is not yours to script. Say the true thing plainly, then let him be who he is.')}
${counselorBubble('Seneca','And notice how much of the day the unsent sentence has already cost you.')}
${thinking('Epictetus')}
${inputBar('margin:8px -24px -24px')}
</div>
`);

add('components/inputs.html', { name:'Inputs and editors', group:'Forms', subtitle:'Text field, search, focused editor card, sheet, progress bar', width:720, height:560 }, `
<h1 class="ds">Inputs</h1><p class="ds">Fields are ink on surface with a gold hairline. An editing card gets a solid gold border and an underline field. Search is a rounded surface bar. Bottom sheets rise on surface with an 18px top radius over a 65% black scrim.</p>
<div class="row" style="align-items:flex-start;gap:20px">
<div class="stack" style="width:340px">
<input class="input" placeholder="What should we call you?">
<div style="display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid rgba(201,168,76,.13);border-radius:12px;padding:10px;color:#888;font-size:14px">${ico('search','width:16px;height:16px;color:#888')} Search entries</div>
<div class="card" style="border:1px solid var(--gold);padding:16px"><div style="font-size:16px;color:#fff;padding-bottom:8px;border-bottom:1px solid rgba(201,168,76,.2);margin-bottom:12px">Walk before checking the phone</div><div class="row" style="justify-content:flex-end;gap:10px"><button class="btn ghost sm">Cancel</button><button class="btn sm">Add</button></div></div>
${progress('Morning routine',60)}
</div>
<div style="width:300px;background:rgba(0,0,0,.65);border-radius:20px;padding:40px 0 0;overflow:hidden"><div style="background:var(--surface);border-radius:18px 18px 0 0;padding:20px;display:flex;flex-direction:column;gap:12px"><div style="font-size:20px;font-weight:700;color:var(--gold)">Request a scroll</div><div style="font-size:14px;color:var(--muted);margin-top:-6px">Ask a counselor to write on a theme</div><div class="input" style="min-height:80px;color:#555;font-size:15px">On patience with slow progress</div><button class="btn md" style="width:100%">Send request</button><div style="text-align:center;font-size:15px;color:var(--muted)">Cancel</div></div></div>
</div>
`);

add('components/list-rows.html', { name:'List rows and menus', group:'Navigation', subtitle:'Side menu items, counselor rows, week dots, library tiles', width:720, height:520 }, `
<h1 class="ds">Rows and menus</h1><p class="ds">Menu rows: 40px icon well, warm title, muted subtitle, 5% white divider. The side panel is surface with a gold hairline on its leading edge and a tracked uppercase title.</p>
<div class="row" style="align-items:flex-start;gap:20px">
<div style="width:300px;background:var(--surface);border-left:1px solid rgba(201,168,76,.2);padding:18px;border-radius:0 16px 16px 0"><div class="row" style="justify-content:space-between;margin-bottom:22px"><span style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--gold)">Arete</span>${ico('close','color:#888')}</div>
${[['book','Know Thyself','Your philosophical portrait'],['lib','Library','Read with the texts'],['mic','My Cabinet','Choose your counselors'],['trophy','Weekly review','Sunday, with your counselors']].map(([k,t,s])=>`<div style="display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.05)"><div class="well" style="width:40px;height:40px;background:rgba(201,168,76,.08);border-color:rgba(201,168,76,.2)">${ico(k)}</div><div><div style="font-size:16px;font-weight:600;color:var(--warm)">${t}</div><div style="font-size:12px;color:var(--muted);line-height:17px;margin-top:2px">${s}</div></div></div>`).join('')}
<div style="text-align:center;font-size:11px;font-style:italic;color:#555;margin-top:18px">Build 89</div></div>
<div class="stack" style="width:340px">
<div class="card hair" style="display:flex;gap:12px;align-items:center;padding:16px"><div class="well" style="width:48px;height:48px">M</div><div style="flex:1"><div style="font-size:16px;font-weight:700;color:var(--body)">Marcus Aurelius</div><div style="font-size:12px;color:var(--muted)">Stoic · direct</div></div>${ico('chev','color:#555')}</div>
<div class="card hair"><div class="lbl" style="margin-bottom:12px">This week</div><div class="row" style="justify-content:space-between">${['M','T','W','T','F','S','S'].map((d,i)=>`<div style="text-align:center"><div style="font-size:11px;color:#888">${d}</div><div style="font-size:13px;font-weight:${i===5?700:600};color:${i===5?'var(--gold)':'#fff'}">${8+i}</div><div class="row" style="gap:3px;justify-content:center;margin-top:4px"><span style="width:8px;height:8px;border-radius:4px;background:${i<6?'var(--gold)':'#333'}"></span><span style="width:8px;height:8px;border-radius:4px;background:${i<4?'var(--evening)':'#333'}"></span></div></div>`).join('')}</div></div>
<div class="row" style="gap:10px">${[['lib','Library','Read with notes'],['news','Scrolls','Letters to you']].map(([k,t,s])=>`<div class="card hair" style="flex:1;padding:14px"><div style="color:var(--gold)">${ico(k)}</div><div style="font-size:14px;font-weight:700;margin-top:4px">${t}</div><div style="font-size:11px;color:#666;line-height:15px">${s}</div></div>`).join('')}</div>
</div>
</div>
`);

// ─── Screens ─────────────────────────────────────────────────────────────────
const PHONE_CSS = 'body{padding:0}.phone{border:0;border-radius:0;min-height:812px}';

add('screens/home.html', { name:'Home screen', group:'Screens', subtitle:'Greeting, quote card, routine pills, CTA, streak', width:375, height:812 }, `
<div class="phone"><div class="screen">
<div class="row" style="justify-content:space-between;align-items:flex-start;margin-bottom:25px"><div><div style="font-size:20px;color:var(--muted)">Good evening,</div><div style="font-size:32px;font-weight:700">Kyle</div></div><div style="background:var(--surface);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:10px;margin-top:5px;color:var(--gold)">${ico('lib')}</div></div>
<div style="margin-bottom:20px">${quoteCard('Begin at once to live, and count each separate day as a separate life.','Seneca')}</div>
${routinePills}
<button class="btn" style="width:100%;margin-bottom:20px">${ico('moon')} Evening reflection</button>
${streakCard}
<div style="margin-top:16px">${promptCard('What did you avoid today?','Epictetus')}</div>
</div>${tabbar('Home')}</div>
`, PHONE_CSS);

add('screens/cabinet.html', { name:'Cabinet screen', group:'Screens', subtitle:'Header, top tabs, thread, input bar', width:375, height:812 }, `
<div class="phone"><div style="padding:52px 20px 14px;border-bottom:1px solid rgba(201,168,76,.13)"><div class="row" style="justify-content:space-between"><div><div style="font-size:26px;font-weight:700;color:var(--gold)">The Cabinet</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Your counselors, in session</div><div style="font-size:11px;color:rgba(201,168,76,.6);font-variant:small-caps;letter-spacing:.5px;margin-top:4px">Marcus · Seneca · Epictetus · Future Self</div></div><div style="background:var(--surface);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:10px;color:var(--gold)">${ico('plus')}</div></div></div>
<div class="utabs"><div class="on">Cabinet</div><div>Counselors</div><div>Sessions</div></div>
<div style="flex:1;padding:16px;display:flex;flex-direction:column;gap:12px">
${userBubble('I keep putting off the conversation with my brother.')}
${counselorBubble('Marcus Aurelius','You call it putting off. I would call it rehearsing his reaction, which is not yours to script.')}
${counselorBubble('Future Self','I remember this week. You called on Thursday. It was shorter than you feared.')}
${thinking('Seneca')}
</div>
${inputBar()}
${tabbar('Cabinet')}</div>
`, PHONE_CSS);

add('screens/morning.html', { name:'Morning routine', group:'Screens', subtitle:'Affirmation, progress, task cards, dashed add', width:375, height:812 }, `
<div class="phone"><div class="screen" style="padding-top:52px">
<div class="row" style="justify-content:space-between;margin-bottom:20px"><div style="font-size:26px;font-weight:700;color:var(--gold)">Morning</div><span style="background:rgba(201,168,76,.13);border:1px solid rgba(201,168,76,.33);border-radius:20px;padding:5px 12px;font-size:14px;font-weight:700;color:var(--gold)">${ico('flame','width:14px;height:14px;vertical-align:-2px')} 14</span></div>
<div class="card hair" style="border-left:3px solid var(--gold);display:flex;gap:10px;padding:18px;margin-bottom:22px"><span style="color:var(--gold)">${ico('sun')}</span><div style="font-size:14px;font-style:italic;line-height:22px;color:var(--gold)">At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work, as a human being.</div></div>
<div style="margin-bottom:22px">${progress('2 of 4 complete',50)}</div>
<div class="stack" style="gap:12px;margin-bottom:20px">
${taskDone('Cold shower')}
${taskDone('Ten minutes of stillness')}
${taskOpen('Read 20 pages of Meditations','Book II')}
${taskOpen('Walk before the phone')}
</div>
<button class="btn outline-dashed">${ico('plus')} Add a task</button>
</div>${tabbar('Morning')}</div>
`, PHONE_CSS);

add('screens/focus.html', { name:'Focus timer', group:'Screens', subtitle:'Segmented tabs, 72px display, round controls, book list', width:375, height:812 }, `
<div class="phone"><div class="screen" style="padding-top:52px;padding-left:20px;padding-right:20px">
<div style="font-size:28px;font-weight:700;color:var(--gold);margin-bottom:16px">Focus</div>
<div class="seg" style="margin-bottom:20px"><div class="on">Read</div><div>Books</div><div>History</div></div>
<div class="card hair" style="border-radius:12px;display:flex;justify-content:space-between;align-items:center;padding:14px;margin-bottom:16px"><span style="font-size:12px;color:var(--muted)">Today</span><span style="font-size:18px;font-weight:700;color:var(--gold)">1h 12m</span></div>
<div class="card" style="border:1px solid var(--gold);border-radius:16px;text-align:center;padding:28px 20px;margin-bottom:20px"><div style="font-size:72px;font-weight:700;color:var(--gold);letter-spacing:4px;line-height:1">25:00</div><div style="font-size:13px;color:var(--muted);margin-top:10px">Meditations · Marcus Aurelius</div><div class="row" style="justify-content:center;gap:12px;margin-top:22px"><div style="background:var(--gold);color:var(--bg);border-radius:50px;padding:14px 28px;font-size:13px;font-weight:700">START</div></div></div>
<div class="card hair" style="border-radius:16px;padding:20px"><div class="row" style="justify-content:space-between;margin-bottom:15px"><span style="font-size:16px;font-weight:700;color:var(--gold)">Your books</span><div style="width:32px;height:32px;border-radius:20px;background:var(--gold);color:var(--bg);display:flex;align-items:center;justify-content:center">${ico('plus')}</div></div>
<div style="border:1px solid var(--gold);background:rgba(201,168,76,.07);border-radius:10px;padding:12px;margin-bottom:8px"><div style="font-size:14px;font-weight:600">Meditations</div><div style="font-size:12px;color:var(--muted)">Marcus Aurelius · p. 84</div></div>
<div style="border:1px solid #333;border-radius:10px;padding:12px"><div style="font-size:14px;font-weight:600">Letters from a Stoic</div><div style="font-size:12px;color:var(--muted)">Seneca · p. 12</div></div></div>
</div>${tabbar('Focus')}</div>
`, PHONE_CSS);

add('screens/paywall.html', { name:'Paywall', group:'Screens', subtitle:'Academy navy palette inside the app, eyebrow, plan cards', width:375, height:812 }, `
<div class="phone" style="background:#0a1628"><div style="padding:60px 20px 20px;flex:1">
<div style="position:absolute;top:56px;right:20px;width:36px;height:36px;border-radius:18px;background:#0f1e38;display:flex;align-items:center;justify-content:center;color:#8a9bb0">${ico('close')}</div>
<div style="text-align:center;margin:12px 0 28px"><div class="eyebrow" style="margin-bottom:8px">Arete Premium</div><div style="font-size:28px;font-weight:700;color:#e8edf5;letter-spacing:.3px;margin-bottom:10px">The full Cabinet</div><div style="font-size:14px;line-height:21px;color:#8a9bb0">Every counselor, daily dispatches, the Library, and your longitudinal portrait.</div><div style="font-size:13px;font-weight:600;color:var(--gold);margin-top:10px">7 days free, then your plan</div></div>
<div style="border:1px solid #1e3050;border-radius:12px;overflow:hidden;margin-bottom:24px;font-size:12px"><div style="display:flex;background:#0f1e38;padding:10px 12px;font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:#8a9bb0"><span style="flex:1.4"></span><span style="flex:1;text-align:center">Free</span><span style="flex:1;text-align:center;color:var(--gold)">Arete</span></div>
${[['Counselors','3','All'],['Dispatches','Weekly','Daily'],['Library','Reading','Marginalia'],['Portrait','','Weekly']].map(([a,b,c],i)=>`<div style="display:flex;padding:10px 12px;${i%2?'background:#0d1a30':''}"><span style="flex:1.4;color:#8a9bb0">${a}</span><span style="flex:1;text-align:center;color:#e8edf5">${b||'·'}</span><span style="flex:1;text-align:center;color:#e8edf5">${c}</span></div>`).join('')}</div>
<div class="stack" style="gap:10px;margin-bottom:20px">
${planCard(true,'Annual','Two months free','$59.99','per year','BEST VALUE')}
${planCard(false,'Monthly','Cancel any time','$7.99','per month','')}
</div>
<div style="background:var(--gold);color:#0a1628;border-radius:14px;padding:16px;text-align:center;font-size:16px;font-weight:700;letter-spacing:.3px;margin-bottom:14px">Start free trial</div>
<div style="font-size:11px;line-height:16px;color:#4a5a70;text-align:center">Billed through the App Store. Restore purchases · Terms · Privacy</div>
</div></div>
`, PHONE_CSS);

add('screens/share-card.html', { name:'Quote share card', group:'Brand', subtitle:'The exported social card: ink, gold rule, ARETE wordmark', width:420, height:520 }, `
<h1 class="ds">Share card</h1><p class="ds">What leaves the app. Deeper ink, a 33% gold border, glyph, 19px quote, short gold rule, counselor in tracked caps, wordmark and tagline.</p>
<div style="width:340px;background:#101a30;border:1px solid rgba(201,168,76,.33);border-radius:18px;padding:28px 24px"><div style="font-size:40px;line-height:1;color:var(--gold)">“</div><div style="font-size:19px;line-height:1.5;color:#e8e2cf;margin:8px 0 18px">You could leave life right now. Let that determine what you do and say and think.</div><div style="width:40px;height:2px;background:var(--gold);margin-bottom:12px"></div><div style="font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold)">Marcus Aurelius</div><div style="font-size:11px;color:#667;margin-top:2px">via the Cabinet</div><div class="row" style="justify-content:space-between;margin-top:26px"><span style="font-size:13px;font-weight:800;letter-spacing:3px;color:var(--gold)">ARETE</span><span style="font-size:11px;font-style:italic;color:#556">pursuearete.com</span></div></div>
`);

add('web/academy-web.html', { name:'Academy and web idiom', group:'Brand', subtitle:'Editorial navy, Playfair headings, square academic cards, glass surfaces', width:760, height:560 }, `
<h1 class="ds">Web and Academy</h1><p class="ds">The same gold on a deeper navy. Academy pages are editorial: Playfair Display headings, square-cornered cards, tracked uppercase buttons, a short centered gold rule. The web app v2 uses glass surfaces (4% white, 12px blur) with Cormorant Garamond.</p>
<div class="row" style="align-items:flex-start;gap:20px">
<div style="width:360px;background:#0a1628;border:1px solid #1e3258;padding:28px;font-family:Inter,system-ui,sans-serif"><div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.7);margin-bottom:8px">The Academy</div><div style="font-family:'Playfair Display',Georgia,serif;font-size:30px;color:#f5edd6;line-height:1.15">Read the way the Greeks argued</div><div style="width:64px;height:1px;background:var(--gold);margin:16px 0"></div><div style="font-size:14px;line-height:1.6;color:#e8d9b0;margin-bottom:20px">Seminar-style courses on the texts, with an interlocutor who has read everything in the room.</div><div style="background:#111d30;border:1px solid #1e3258;border-radius:2px;padding:20px;margin-bottom:16px"><div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.7);margin-bottom:8px">Course</div><div style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#f5edd6">Nicomachean Ethics, Book I</div></div><div class="row" style="gap:10px"><span style="background:var(--gold);color:#0a1628;font-weight:600;letter-spacing:.15em;text-transform:uppercase;font-size:12px;padding:12px 28px">Enroll</span><span style="border:1px solid var(--gold);color:var(--gold);font-weight:600;letter-spacing:.15em;text-transform:uppercase;font-size:12px;padding:12px 28px">Syllabus</span></div></div>
<div style="width:340px;background:#0f1724;padding:28px;font-family:Inter,system-ui,sans-serif"><div style="font-family:var(--serif);font-size:32px;color:#e6eef8;line-height:1.1;margin-bottom:6px">The Cabinet, <span style="background:linear-gradient(135deg,#c9a84c,#e8c96a 50%,#c9a84c);-webkit-background-clip:text;background-clip:text;color:transparent">replayed</span></div><div style="font-size:13px;color:#9aa0a6;margin-bottom:18px">Your sessions, on the web.</div><div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;backdrop-filter:blur(12px);margin-bottom:12px"><div class="lbl" style="letter-spacing:.5px;margin-bottom:6px">Marcus Aurelius</div><div style="font-family:var(--serif);font-size:17px;line-height:1.5;color:#e6eef8">Confine yourself to the present.</div></div><div style="background:rgba(201,168,76,.15);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px"><div style="font-size:14px;line-height:1.5;color:#e6eef8">How, when the calendar is next week?</div></div></div>
</div>
`);

for (const c of cards) {
  const f = path.join(OUT, c.file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, c.html);
}
console.log(`wrote ${cards.length} previews to ${OUT}`);
