import { CITIES, STAGES, TRAITS, PRICES, SEATS, ROOF, TANK, TOTAL_KM, WEATHER_LABEL, traitLabel } from './data.js';
import { fmtMoney, fmtClock, fmtDuration, clamp } from './util.js';
import { VEHICLES, PALETTE, STRIPES, RIMS, SLOGANS, cleanText } from './garage.js';
import { drawFullMap, drawMiniMap } from './map.js';
import { portraitSVG } from './portraits.js';
import { START_CASH } from './career.js';

const $ = (s) => document.querySelector(s);
const ICONS = {
  commerce: '<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.5 11h-13zM8 9V7a4 4 0 0 1 8 0v2"/></svg>',
  presse: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  malade: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 16c1-1.2 2.4-1.8 4-1.8s3 .6 4 1.8M8.5 9.5l2 1M15.5 9.5l-2 1"/></svg>',
  etudiant: '<svg viewBox="0 0 24 24"><path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>',
  ancien: '<svg viewBox="0 0 24 24"><circle cx="11" cy="5" r="2.5"/><path d="M9 21l1.5-7L8 10l3-2 2 3 3 1M14 14l3 7M18 12v9"/></svg>',
  chevre: '<svg viewBox="0 0 24 24"><path d="M5 12h10l2-3 3 1-1 3-2 1v6M7 12v7M13 12v7M17 9l-1-4M19 10l1-4"/></svg>',
  agent: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function show(id) {
  for (const el of document.querySelectorAll('.screen:not(.modal)')) el.classList.toggle('on', el.id === id);
}
export function modal(id, on) { $('#' + id).classList.toggle('on', on); }
let hudOn = false, radioView = 'open';
function applyRadioView() {
  const r = $('#radio'), pill = $('#radio-pill');
  r.hidden = !hudOn || radioView === 'hidden';
  r.classList.toggle('min', radioView === 'min');
  pill.hidden = !hudOn || radioView !== 'hidden';
  requestAnimationFrame(fitTop);
}
export function hud(on) {
  $('#hud').hidden = !on;
  hudOn = on;
  applyRadioView();
  $('#touch').hidden = !(on && document.body.classList.contains('touch'));
  if (on) requestAnimationFrame(fitTop);
}
export function loaded() { $('#loading').classList.add('done'); }

/* ------------------------------------------------------------ toasts */
const toastsEl = () => $('#toasts');
// téléphone en portrait : messages et alertes se placent juste sous la radio et les boutons du haut,
// quelle que soit la hauteur de la radio (ouverte, réduite ou masquée)
export function fitTop() {
  const hud = $('#hud'), btns = $('.hud-btns'), radio = $('#radio');
  if (!hud) return;
  const portrait = document.body.classList.contains('touch') && innerWidth <= innerHeight;
  if (!portrait) {
    hud.style.removeProperty('--top-free');
    btns.style.removeProperty('top');
    radio.style.removeProperty('top');
    $('#radio-pill')?.style.removeProperty('top');
    return;
  }
  // empilement vertical : cadre de l'étape, boutons, radio, puis messages
  const top = $('.hud-top');
  let y = top.getBoundingClientRect().bottom + 8;
  btns.style.top = Math.round(y) + 'px';
  y += btns.getBoundingClientRect().height + 8;
  const pill = $('#radio-pill');
  if (pill && !pill.hidden) { pill.style.top = Math.round(y) + 'px'; y += pill.getBoundingClientRect().height + 8; }
  if (!radio.hidden) {
    radio.style.top = Math.round(y) + 'px';
    y += radio.getBoundingClientRect().height + 8;
  }
  hud.style.setProperty('--top-free', Math.round(y) + 'px');
}
export function toast(html, kind = 'info', ms = 2800) {
  fitTop();
  const box = toastsEl();
  while (box.children.length > 2) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, ms);
}
export function clearToasts() { toastsEl().innerHTML = ''; $('#banner').innerHTML = ''; }
export function banner(kicker, title, sub = '', ms = 2800) {
  const box = $('#banner');
  box.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'bn';
  el.innerHTML = `<span class="k">${esc(kicker)}</span><span class="t">${esc(title)}</span>${sub ? `<span class="s">${esc(sub)}</span>` : ''}`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 520); }, ms);
}

/* ------------------------------------------------------------ alerte persistante (contrôle en cours, péage) */
let alertKey = '';
export function alert(a) {
  const el = $('#h-alert');
  const key = a ? a.kind + a.text + a.sub : '';
  if (key === alertKey) return;
  alertKey = key;
  el.hidden = !a;
  $('#hud').classList.toggle('has-alert', !!a);
  if (!a) return;
  fitTop();
  el.className = 'h-alert ' + a.kind;
  $('#h-al-t').textContent = a.text;
  $('#h-al-s').textContent = a.sub || '';
}

/* ------------------------------------------------------------ HUD */
let citiesBuilt = false, citiesDir = 1;
const cityPos = (() => {
  const pos = [0];
  let acc = 0;
  for (const s of STAGES) { acc += s.km; pos.push(acc / TOTAL_KM); }
  return pos;
})();

function setBar(el, frac) {
  el.style.width = clamp(frac, 0, 1) * 100 + '%';
  el.className = frac < 0.2 ? 'bad' : frac < 0.4 ? 'warn' : '';
}

export function updateHud(d) {
  if (!citiesBuilt) {
    const ticks = [];
    for (let k = 0; k <= 14; k++) {
      const a = ((135 + (k / 14) * 270) * Math.PI) / 180, r1 = k % 2 ? 56 : 52, r2 = 60;
      ticks.push(`<line x1="${85 + Math.cos(a) * r1}" y1="${85 + Math.sin(a) * r1}" x2="${85 + Math.cos(a) * r2}" y2="${85 + Math.sin(a) * r2}"/>`);
    }
    $('#sp-ticks').innerHTML = ticks.join('');
    citiesBuilt = true;
    citiesDir = 0;
  }
  // barre du trajet : au retour, Dapaong est à gauche et Lomé à droite
  if (citiesDir !== d.dir) {
    citiesDir = d.dir;
    $('#h-cities').innerHTML = CITIES.map((c, i) => `<span data-i="${i}" class="${i % 2 ? 'up' : ''}" style="left:${(d.dir > 0 ? cityPos[i] : 1 - cityPos[i]) * 100}%">${esc(c.name)}</span>`).join('');
  }
  $('#h-stage').textContent = `${d.dir > 0 ? '' : 'Retour · '}Étape ${d.stage + 1}/${STAGES.length} · ${d.weatherLabel}`;
  $('#h-route').textContent = `${d.from} → ${d.to}`;
  $('#h-dist').textContent = Math.max(0, Math.round(d.kmLeft));
  $('#h-pax').textContent = `${d.pax}/${SEATS} passagers`;
  $('#h-money').textContent = fmtMoney(d.money);
  $('#h-clock').textContent = fmtClock(d.hour);
  const kmh = Math.abs(d.speed) * 3.6;
  $('#h-speed').textContent = Math.round(kmh);
  const arc = $('#sp-arc');
  arc.style.strokeDasharray = `${(Math.min(140, kmh) / 140) * 320.4} 427.3`;
  arc.classList.toggle('hot', kmh > 100);
  $('#h-gear').textContent = d.speed < -0.3 ? 'R' : kmh < 1 ? 'N' : String(1 + [25, 47, 68, 90].filter((g) => kmh > g).length);
  const gs = d.map.stage, gf = cityPos[gs] + (cityPos[gs + 1] - cityPos[gs]) * clamp(d.map.progress, 0, 1);
  const prog = d.dir > 0 ? gf : 1 - gf;
  $('#h-fill').style.width = prog * 100 + '%';
  $('#h-dot').style.left = prog * 100 + '%';
  const cur = d.dir > 0 ? d.stage + 1 : CITIES.length - 2 - d.stage;
  for (const sp of document.querySelectorAll('#h-cities span')) sp.classList.toggle('cur', +sp.dataset.i === cur);
  setBar($('#g-fuel'), d.fuel / TANK);
  $('#g-fuel-t').textContent = d.fuel.toFixed(d.fuel < 10 ? 1 : 0) + ' L';
  setBar($('#g-hp'), d.hp / 100);
  $('#g-hp-t').textContent = Math.round(d.hp) + ' %';
  setBar($('#g-comfort'), d.comfort / 100);
  $('#g-pax').textContent = d.pax ? Math.round(d.comfort) + ' %' : '·';
}

/* ------------------------------------------------------------ titre */
const bestLabel = (b) => {
  const legs = b.legs ?? b.reached;
  if (legs >= STAGES.length * 2) return `aller-retour complet`;
  if (legs > STAGES.length) return `retour jusqu’à ${CITIES[CITIES.length - 1 - (legs - STAGES.length)].name}`;
  return `à ${CITIES[legs].name}`;
};
export function renderTitle({ best, onStart, onGarage, vehicle, career, saved }) {
  const el = $('#s-title');
  const strip = CITIES.map((c) => `<span>${esc(c.name)}</span>`).join('<i></i>');
  const touch = document.body.classList.contains('touch');
  el.innerHTML = `
    <div class="title-wrap">
      <div class="logo"><div class="n">N1</div><div class="w"><b>ROUTE</b><span>Taxi-brousse · Togo</span></div></div>
      <h1>De Lomé à Dapaong,<br><em>${TOTAL_KM} km de vraie route.</em></h1>
      <p class="lead">Charge tes passagers à la gare, double les camions surchargés, garde un œil sur l’essence et passe la faille d’Alédjo sans perdre les colis du toit. Le tracé suit la vraie N1, de la côte au Sahel.</p>
      <div class="route-strip">${strip}</div>
      <div class="title-actions">
        ${saved ? `<button class="btn" id="t-resume">Reprendre le voyage <span class="kbd">Entrée</span></button>` : ''}
        <button class="btn${saved ? ' ghost' : ''}" id="t-start">${saved ? 'Nouveau voyage' : 'Prendre la route <span class="kbd">Entrée</span>'}</button>
        <button class="btn ghost" id="t-garage">Garage et atelier</button>
      </div>
      ${saved ? `<div class="title-save">Voyage en cours : ${esc(saved.label)}</div>` : ''}
      <div class="title-meta">${best ? `<span>Record : <b>${fmtMoney(best.money)}</b> ${esc(bestLabel(best))}</span>` : '<span>Pas encore de record.</span>'}<span>Épargne : <b>${fmtMoney(career.savings)}</b></span>${career.trips ? `<span>Voyages réussis : <b>${career.trips}</b>${career.returns ? ` dont ${career.returns} aller-retour` : ''}</span>` : ''}<span>Véhicule : <b>${esc(vehicle)}</b></span><span>Gratuit · PC et mobile</span></div>
      <details class="howto">
        <summary>Comment on joue</summary>
        <ul>
          <li><b>À la gare</b> : choisis tes passagers selon la place et les colis, marchande le prix si tu oses, fais le plein, répare.</li>
          <li><b>En route</b> : dépose ceux qui descendent dans un village (bas-côté droit), prends ceux qui font signe, écoute les demandes des passagers.</li>
          <li><b>Imprévus</b> : crevaison (change la roue sur le bas-côté), moteur qui chauffe dans la faille, camion en panne, troupeau de zébus, route inondée.</li>
          <li><b>Carrière</b> : le bénéfice de chaque voyage va à ton épargne ; à l’atelier, il paie amortisseurs, pneus, radiateur… À Dapaong, tu peux faire le retour vers Lomé.</li>
          <li><b>Commandes</b> : ${touch ? 'boutons Gaz, Frein, flèches et Klaxon' : '<span class="kbd">↑</span> gaz, <span class="kbd">↓</span> frein et marche arrière, <span class="kbd">←</span> <span class="kbd">→</span> direction, <span class="kbd">Espace</span> klaxon, <span class="kbd">C</span> caméra, <span class="kbd">R</span> radio, <span class="kbd">V</span> afficher, réduire ou masquer la radio'}.</li>
          <li><b>Manette</b> (Xbox, PlayStation…) : RT accélère, LT freine, stick gauche pour tourner, X klaxonne, Y caméra, LB / RB stations, Start pause, A valide.</li>
          <li><b>Klaxonne</b> derrière un camion : il se range à droite. Regarde d’abord en face avant de doubler.</li>
          <li><b>Contrôles</b> : sous 20 km/h ou amende. <b>Ralentisseurs</b> et <b>nids-de-poule</b> : ralentis.</li>
          <li><b>Essence</b> : arrête-toi sur le bas-côté droit devant les vendeuses. À l’arrêt dans un village, les marchandes viennent aux vitres.</li>
        </ul>
      </details>
      <div class="credits">Tracé et carte : ${esc('© contributeurs OpenStreetMap (ODbL)')}. Radio : N1 Groove est une musique originale générée par le jeu.</div>
    </div>`;
  const tm = document.createElement('canvas');
  tm.className = 'title-map';
  el.appendChild(tm);
  drawFullMap(tm, { w: 300, h: Math.min(660, window.innerHeight - 80), stage: 0, progress: 0, dark: true });
  el.querySelector('#t-start').onclick = onStart;
  if (saved) el.querySelector('#t-resume').onclick = saved.onResume;
  el.querySelector('#t-garage').onclick = onGarage;
}

/* ------------------------------------------------------------ gare routière */
export function renderGare(ctx) {
  const { run, offers, weather, onToggle, onHaggle, onFuel, onRepair, onGo, here: city, next, leg: S, map } = ctx;
  const el = $('#s-gare');
  const seatsUsed = run.passengers.length;
  const roofUsed = run.bags;
  const fullL = TANK - run.fuel;
  const fuel10 = Math.min(10, fullL);
  const rep25 = Math.min(25, 100 - run.hp);
  const repAll = 100 - run.hp;
  const price = (l) => Math.ceil(l * PRICES.fuelGare / 50) * 50;
  const rprice = (p) => Math.ceil(p * PRICES.repair / 50) * 50;

  const paxCard = (p, state) => {
    const T = TRAITS[p.trait];
    const dest = p.town ? p.town : CITIES[p.to].name;
    const bags = p.bags ? ` · ${p.bags} colis` : '';
    const cls = state === 'aboard' ? 'pax aboard' : `pax${state === 'on' ? ' on' : ''}${state === 'full' ? ' full' : ''}${p.gone ? ' gone' : ''}`;
    const canHaggle = state === 'free' && !p.haggled && !p.gone;
    const quote = p.reply ? `<div class="say reply${p.gone ? ' no' : ''}">« ${esc(p.reply)} »</div>` : p.line && state !== 'aboard' ? `<div class="say">« ${esc(p.line)} »</div>` : '';
    return `<div class="${cls}" data-id="${p.id}">
      <${state === 'aboard' || p.gone ? 'div' : 'button type="button"'} class="pax-main" data-pick="${p.id}" aria-pressed="${state === 'on'}">
        <div class="ic">${portraitSVG(p, 44)}<i>${ICONS[p.trait] || ''}</i></div>
        <div><div class="nm">${esc(p.name)} <span>→ ${esc(dest)}${p.town ? ' <em class="tag-town">en route</em>' : ''}</span></div>
        <div class="tr">${esc(traitLabel(p))}${bags} · ${esc(T.desc)}</div>${quote}</div>
        <div class="fare">${state === 'aboard' ? `${Math.round(p.sat)}%` : p.gone ? '·' : fmtMoney(p.fare)}<small>${state === 'aboard' ? 'satisfaction' : p.gone ? 'parti' : p.agreed ? 'prix marchandé' : `${p.km} km`}</small></div>
      </${state === 'aboard' || p.gone ? 'div' : 'button'}>
      ${canHaggle ? `<button type="button" class="haggle" data-haggle="${p.id}" title="Demander 20 % de plus : il peut accepter, discuter ou partir">Marchander</button>` : ''}
    </div>`;
  };

  const aboard = run.passengers.filter((p) => !offers.some((o) => o.id === p.id));
  const offerCards = offers.map((o) => {
    const on = run.passengers.some((p) => p.id === o.id);
    if (o.gone) return paxCard(o, 'full');
    const fits = seatsUsed < SEATS && roofUsed + o.bags <= ROOF;
    return paxCard(o, on ? 'on' : fits ? 'free' : 'full');
  }).join('');

  const seats = Array.from({ length: SEATS }, (_, i) => `<div class="seat${i < seatsUsed ? ' on' : ''}"></div>`).join('');
  const roof = Array.from({ length: ROOF }, (_, i) => `<div class="seat roof${i < roofUsed ? ' on' : ''}"></div>`).join('');
  const earned = run.passengers.filter((p) => offers.some((o) => o.id === p.id)).reduce((a, p) => a + p.fare, 0);

  el.innerHTML = `
    <div class="gare">
      <div class="card gare-head"><div class="stripe"></div><div class="inner">
        <div>
          <div class="eyebrow">${run.dir > 0 ? 'Aller' : 'Retour'} · étape ${run.stage + 1} sur ${STAGES.length} · ${fmtClock(run.hour)}</div>
          <h2>${esc(city.gare)}</h2>
          <div class="next">Prochaine ville : <b>${esc(next.name)}</b> · ~${S.km} km de N1 · <span class="weather">${weather === 'rain' ? '🌧' : weather === 'harmattan' ? '🌫' : '☀'} ${WEATHER_LABEL[weather]}</span>${S.landmark ? ` · ${S.reverse ? 'descente' : 'passage'} de la <b>${esc(S.landmark)}</b>` : ''}</div>
        </div>
        <div class="cash"><div class="eyebrow">${run.money < 0 ? 'Dette' : 'En caisse'}</div><b style="${run.money < 0 ? 'color:var(--red)' : ''}">${fmtMoney(run.money)}</b></div>
      </div></div>

      <div class="card mapcard"><h3 style="margin:2px 4px 8px;font:13px var(--display);text-transform:uppercase">La N1 · ${esc(city.name)} → ${esc(next.name)}</h3><canvas id="gare-map"></canvas></div>
      <div class="card panel">
        <h3>Sur le quai <small>${offers.length} personnes attendent</small></h3>
        <p class="hint">Le prix du voyage est payé à la montée. À l’arrivée, un passager content laisse un pourboire ; un passager secoué discute le prix. Marchander rapporte plus, mais certains partent prendre un autre taxi. Ceux qui descendent « en route » s’arrêtent dans un village de l’étape.</p>
        <div class="pax-list">${offerCards || '<p class="hint">Personne n’attend.</p>'}</div>
      </div>

      <div class="card panel">
        <h3>Ton taxi <small>${seatsUsed}/${SEATS} places · ${roofUsed}/${ROOF} colis</small></h3>
        <div class="seats" aria-label="Places">${seats}</div>
        <div class="seats" aria-label="Toit">${roof}</div>
        ${aboard.length ? `<p class="hint" style="margin-top:10px">Déjà à bord (ils continuent) :</p><div class="pax-list">${aboard.map((p) => paxCard(p, 'aboard')).join('')}</div>` : ''}
        <div class="svc">
          <div class="row"><div class="lbl">Essence <span>${run.fuel.toFixed(1)} / ${TANK} L · ${PRICES.fuelGare} F/L</span></div>
            <div class="btns"><button type="button" id="f10" ${fuel10 < 0.5 || run.money < price(fuel10) ? 'disabled' : ''}>+${Math.round(fuel10)} L · ${fmtMoney(price(fuel10))}</button><button type="button" id="ffull" ${fullL < 0.5 || run.money < price(fullL) ? 'disabled' : ''}>Plein · ${fmtMoney(price(fullL))}</button></div>
            <div class="bar"><i style="width:${(run.fuel / TANK) * 100}%" class="${run.fuel / TANK < 0.25 ? 'bad' : ''}"></i></div></div>
          <div class="row"><div class="lbl">Mécanicien <span>état ${Math.round(run.hp)} %</span></div>
            <div class="btns"><button type="button" id="r25" ${rep25 < 1 || run.money < rprice(rep25) ? 'disabled' : ''}>+${Math.round(rep25)} % · ${fmtMoney(rprice(rep25))}</button><button type="button" id="rall" ${repAll < 1 || run.money < rprice(repAll) ? 'disabled' : ''}>Tout · ${fmtMoney(rprice(repAll))}</button></div>
            <div class="bar"><i style="width:${run.hp}%" class="${run.hp < 35 ? 'bad' : run.hp < 60 ? 'warn' : ''}"></i></div></div>
        </div>
      </div>

      <div class="card gare-go">
        <div class="sum">${earned ? `Billets vendus ici : <b>${fmtMoney(earned)}</b> · ` : ''}Charge : <b>${seatsUsed * 70 + roofUsed * 28} kg</b> ${seatsUsed + roofUsed > 9 ? '(le taxi sera lourd dans les montées)' : ''}</div>
        <button class="btn green" id="g-go">Prendre la route vers ${esc(next.name)} <span class="kbd">Entrée</span></button>
      </div>
    </div>`;

  const gm = el.querySelector('#gare-map');
  if (gm && window.innerWidth > 900) drawFullMap(gm, { w: 228, h: 520, ...map, dark: true });
  for (const b of el.querySelectorAll('button[data-pick]')) b.onclick = () => onToggle(+b.dataset.pick);
  for (const b of el.querySelectorAll('button[data-haggle]')) b.onclick = () => onHaggle(+b.dataset.haggle);
  el.querySelector('#f10').onclick = () => onFuel(fuel10, price(fuel10));
  el.querySelector('#ffull').onclick = () => onFuel(fullL, price(fullL));
  el.querySelector('#r25').onclick = () => onRepair(rep25, rprice(rep25));
  el.querySelector('#rall').onclick = () => onRepair(repAll, rprice(repAll));
  el.querySelector('#g-go').onclick = onGo;
}

/* ------------------------------------------------------------ arrivée d'étape */
export function renderArrival({ run, city, lines, extra, stageTime, onNext, last, canReturn, onReturn }) {
  const el = $('#s-arrival');
  const rows = lines.map((l) => {
    const cls = l.amount > 0 ? 'pos' : l.amount < 0 ? 'neg' : '';
    return `<div class="l"><span>${l.label}</span><b class="${cls}">${l.amount ? (l.amount > 0 ? '+' : '') + fmtMoney(l.amount) : '·'}</b></div>`;
  }).join('');
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Arrivée · ${fmtClock(run.hour)} · étape bouclée en ${fmtDuration(stageTime)}</div>
      <h2>${esc(city.name)}</h2>
      <p class="sub">${lines.length ? 'Les passagers descendent et règlent leurs comptes.' : 'Personne ne descend ici.'} ${extra || ''}</p>
      <div class="ledger">${rows}<div class="l total"><span>En caisse</span><b>${fmtMoney(run.money)}</b></div></div>
      ${canReturn ? '<p class="sub">Terminus de l’aller. Tu peux t’arrêter là, ou charger le taxi pour <b>le retour vers Lomé</b> avec ta caisse : six étapes de plus, la faille d’Alédjo en descente.</p>' : ''}
      <div class="actions">${canReturn ? '<button class="btn green" id="a-return">Faire le retour vers Lomé <span class="kbd">Entrée</span></button><button class="btn ghost" id="a-next">Terminer le voyage ici</button>'
        : `<button class="btn green" id="a-next">${last ? 'Voir le bilan' : `Entrer en gare de ${esc(city.name)}`} <span class="kbd">Entrée</span></button>`}</div>
    </div></div>`;
  el.querySelector('#a-next').onclick = onNext;
  if (canReturn) el.querySelector('#a-return').onclick = onReturn;
}

/* ------------------------------------------------------------ fin */
export function renderEnd({ win, roundTrip, reason, run, best, isRecord, profit, career, onRestart, onShare }) {
  const el = $('#s-end');
  const s = run.stats;
  const reached = CITIES[run.reached].name;
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">${win ? 'Terminus' : 'Fin du voyage'} · ${fmtClock(run.hour)}</div>
      <h2>${roundTrip ? 'Retour à Lomé !' : win ? 'Dapaong, enfin !' : esc(reason.title)}</h2>
      <p class="sub">${roundTrip ? `Aller-retour complet : ${Math.round(run.stats.km || 0)} km de N1 dans les deux sens.` : win ? 'Tu as relié Lomé à Dapaong par la N1.' : esc(reason.text)} ${isRecord ? '<b>Nouveau record !</b>' : ''}</p>
      <div class="stats">
        <div><b>${fmtMoney(run.money)}</b><span>En caisse</span></div>
        <div><b>${esc(reached)}</b><span>Ville atteinte</span></div>
        <div><b>${s.carried}</b><span>Passagers déposés</span></div>
        <div><b>${fmtMoney(s.tips)}</b><span>Pourboires nets</span></div>
        <div><b>${s.fines}</b><span>Amendes</span></div>
        <div><b>${s.crashes}</b><span>Accrochages</span></div>
      </div>
      <p class="sub">${profit > 0 ? `Bénéfice versé à ton épargne : <b>+${fmtMoney(profit)}</b> (au-delà des ${fmtMoney(START_CASH)} avancés par le patron).` : `Pas de bénéfice ce voyage : la caisse ne dépasse pas les ${fmtMoney(START_CASH)} avancés par le patron.`} Épargne : <b>${fmtMoney(career.savings)}</b>, à dépenser à l’atelier.</p>
      ${best ? `<p class="sub">Record : <b>${fmtMoney(best.money)}</b> (${esc(bestLabel(best))})</p>` : ''}
      <div class="actions">
        <button class="btn green" id="e-restart">Nouveau voyage <span class="kbd">Entrée</span></button>
        <button class="btn ghost" id="e-share">Partager mon score</button>
      </div>
      <div class="share-note" id="e-note"></div>
    </div></div>`;
  el.querySelector('#e-restart').onclick = onRestart;
  el.querySelector('#e-share').onclick = async () => {
    const msg = await onShare();
    el.querySelector('#e-note').textContent = msg;
  };
}

/* ------------------------------------------------------------ pause / modales */
export function renderPause({ onResume, onRestart, onQuit, stage, progress, rev }) {
  const el = $('#s-pause');
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Pause</div>
      <h2>Le moteur tourne au ralenti</h2>
      <p class="sub">Le chrono est arrêté.${document.body.classList.contains('touch') ? '' : ' <span class="kbd">P</span> ou <span class="kbd">Échap</span> pour reprendre.'}</p>
      <div class="actions">
        <button class="btn green" id="p-resume">Reprendre</button>
        <button class="btn ghost" id="p-restart">Recommencer l’étape</button>
        <button class="btn ghost" id="p-quit">Abandonner</button>
      </div>
      <canvas id="pause-map" style="margin-top:14px;display:block;border-radius:8px"></canvas>
    </div></div>`;
  drawFullMap(el.querySelector('#pause-map'), { w: Math.min(478, window.innerWidth - 74), h: 260, stage, progress, rev, showNeighbors: false, dark: true });
  el.querySelector('#p-resume').onclick = onResume;
  el.querySelector('#p-restart').onclick = onRestart;
  el.querySelector('#p-quit').onclick = onQuit;
}

export function renderRescue({ money, pax, onPay, onChipIn, onCredit, onGiveUp }) {
  const el = $('#s-modal');
  const can = money >= PRICES.rescue;
  const credit = PRICES.rescue + 1000;
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Panne sèche</div>
      <h2>Plus une goutte d’essence</h2>
      <p class="sub">${can ? `Un zémidjan qui passe propose d’aller chercher ${PRICES.rescueLiters} litres au village pour <b>${fmtMoney(PRICES.rescue)}</b>.` : `Un zémidjan propose d’aller chercher ${PRICES.rescueLiters} litres, mais tu n’as que ${fmtMoney(money)} en caisse. ${pax ? 'Tes passagers peuvent se cotiser (ils ne seront pas contents), ou' : 'Il peut'} te faire crédit : ${fmtMoney(credit)} à rembourser sur ta caisse.`}</p>
      <div class="actions">
        ${can ? `<button class="btn green" id="m-pay">Payer le zém (${fmtMoney(PRICES.rescue)})</button>` : ''}
        ${!can && pax ? '<button class="btn green" id="m-chip">Les passagers se cotisent</button>' : ''}
        ${!can ? `<button class="btn ${pax ? 'ghost' : 'green'}" id="m-credit">Crédit du zém (${fmtMoney(credit)})</button>` : ''}
        <button class="btn ghost" id="m-quit">Abandonner le voyage</button>
      </div>
    </div></div>`;
  if (can) el.querySelector('#m-pay').onclick = onPay;
  if (!can && pax) el.querySelector('#m-chip').onclick = onChipIn;
  if (!can) el.querySelector('#m-credit').onclick = onCredit;
  el.querySelector('#m-quit').onclick = onGiveUp;
}

/* ------------------------------------------------------------ garage */
export function renderGarage({ cfg, career, upgrades, onChange, onBuy, onSave, onCancel }) {
  const el = $('#s-garage');
  const V = VEHICLES[cfg.model];
  const bar = (v, max) => `<div class="bar"><i style="width:${clamp(v / max, 0.05, 1) * 100}%"></i></div>`;
  const cards = Object.entries(VEHICLES).map(([k, v]) => `
    <button type="button" class="vcard${k === cfg.model ? ' on' : ''}" data-model="${k}">
      <span class="eyebrow">${esc(v.tag)}</span>
      <b>${esc(v.name)}</b>
      <div class="vstats">
        <span>Places</span>${bar(v.seats, 12)}
        <span>Vitesse</span>${bar(v.vmax - 28, 13)}
        <span>Tenue</span>${bar(v.grip - 0.7, 0.45)}
        <span>Sobriété</span>${bar(2 - v.fuel, 1.25)}
      </div>
    </button>`).join('');
  const sw = (list, cur, key) => list.map(([n, c]) => `<button type="button" class="sw${c === cur ? ' on' : ''}" data-${key}="${c}" title="${esc(n)}" style="--c:${c}" aria-label="${esc(n)}"></button>`).join('');
  el.innerHTML = `
    <div class="garage">
      <div class="garage-head">
        <div class="eyebrow">Garage · Gbossimé</div>
        <h2>Ton taxi, ton style</h2>
        <p>${esc(V.desc)}</p>
      </div>
      <div class="card garage-panel">
        <div class="g-sec"><h3>Véhicule</h3><div class="vcards">${cards}</div></div>
        <div class="g-sec"><h3>Carrosserie</h3><div class="sws">${sw(PALETTE, cfg.body, 'body')}<label class="sw custom" title="Couleur libre" style="--c:${cfg.body}"><input type="color" id="g-color" value="${cfg.body}" aria-label="Couleur libre">+</label></div></div>
        <div class="g-sec"><h3>Bandes</h3><div class="chips">${STRIPES.map(([n], i) => `<button type="button" class="chip${i === cfg.stripe ? ' on' : ''}" data-stripe="${i}">${esc(n)}</button>`).join('')}</div></div>
        <div class="g-sec"><h3>Jantes</h3><div class="sws">${sw(RIMS, cfg.rims, 'rims')}</div></div>
        ${cfg.model === 'berline' ? `<div class="g-sec"><h3>Galerie de toit</h3><div class="chips"><button type="button" class="chip${cfg.rack ? ' on' : ''}" data-rack="1">Avec galerie</button><button type="button" class="chip${!cfg.rack ? ' on' : ''}" data-rack="0">Sans</button></div></div>` : ''}
        <div class="g-sec"><h3>Slogan peint</h3>
          <input class="txt" id="g-slogan" maxlength="22" value="${esc(cfg.slogan)}" placeholder="DIEU EST GRAND" autocomplete="off">
          <div class="chips">${SLOGANS.map((t) => `<button type="button" class="chip small" data-slogan="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div class="g-sec"><h3>Atelier <small>épargne : ${fmtMoney(career.savings)}</small></h3>
          <p class="g-note">Le bénéfice de chaque voyage (au-delà des ${fmtMoney(START_CASH)} avancés par le patron) va à ton épargne. Les pièces achetées servent sur tous les véhicules.</p>
          <div class="ups">${upgrades.map((u) => {
            const own = !!career.up[u.id];
            const can = !own && career.savings >= u.price;
            return `<div class="up${own ? ' own' : ''}"><div><b>${esc(u.name)}</b><span>${esc(u.desc)}</span></div>
              <button type="button" class="chip${own ? ' on' : ''}" data-buy="${u.id}" ${own || !can ? 'disabled' : ''}>${own ? 'Monté' : fmtMoney(u.price)}</button></div>`;
          }).join('')}</div></div>
        <div class="g-sec"><h3>Plaque</h3><input class="txt" id="g-plate" maxlength="10" value="${esc(cfg.plate)}" autocomplete="off"></div>
        <div class="g-actions"><button class="btn green" id="g-save">Valider <span class="kbd">Entrée</span></button><button class="btn ghost" id="g-cancel">Annuler</button></div>
      </div>
    </div>`;
  const set = (patch) => onChange({ ...cfg, ...patch });
  for (const b of el.querySelectorAll('[data-model]')) b.onclick = () => set({ model: b.dataset.model });
  for (const b of el.querySelectorAll('[data-buy]')) b.onclick = () => onBuy(b.dataset.buy);
  for (const b of el.querySelectorAll('[data-body]')) b.onclick = () => set({ body: b.dataset.body });
  for (const b of el.querySelectorAll('[data-rims]')) b.onclick = () => set({ rims: b.dataset.rims });
  for (const b of el.querySelectorAll('[data-stripe]')) b.onclick = () => set({ stripe: +b.dataset.stripe });
  for (const b of el.querySelectorAll('[data-rack]')) b.onclick = () => set({ rack: b.dataset.rack === '1' });
  for (const b of el.querySelectorAll('[data-slogan]')) b.onclick = () => set({ slogan: b.dataset.slogan });
  el.querySelector('#g-color').oninput = (e) => set({ body: e.target.value });
  const sl = el.querySelector('#g-slogan'), pl = el.querySelector('#g-plate');
  sl.onchange = () => set({ slogan: cleanText(sl.value, 22) });
  pl.onchange = () => set({ plate: cleanText(pl.value, 10) || 'TG' });
  for (const inp of [sl, pl]) inp.addEventListener('keydown', (e) => e.stopPropagation());
  el.querySelector('#g-save').onclick = () => onSave({ ...cfg, slogan: cleanText(sl.value, 22), plate: cleanText(pl.value, 10) || 'TG' });
  el.querySelector('#g-cancel').onclick = onCancel;
}

/* ------------------------------------------------------------ autoradio */
const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
export function radioUI() {
  let lastPct = -1, lastCur = '';
  return {
    view(v) { radioView = v || 'open'; applyRadioView(); },
    // appelé à chaque image : barre de progression et temps écoulé
    tick(pr) {
      const pct = pr ? pr.t / pr.d : 0;
      if (Math.abs(pct - lastPct) > 0.001) { lastPct = pct; $('#r-prog-bar').style.width = `${(pct * 100).toFixed(2)}%`; }
      const cur = pr ? mmss(pr.t) : '';
      if (cur !== lastCur) { lastCur = cur; $('#r-cur').textContent = cur; $('#r-dur').textContent = pr ? mmss(pr.d) : ''; }
    },
    render({ station, track, status, playing, muted, volume, file }) {
      $('#r-freq').textContent = station ? station.freq || 'FM' : 'OFF';
      $('#pill-freq').textContent = station ? station.freq || 'FM' : 'OFF';
      $('#r-station').textContent = station ? station.name : 'Radio éteinte';
      $('#r-track').textContent = !station ? 'Touche R ou ⏻ pour allumer' : track ? `${track.artist} · ${track.title}` : '';
      $('#r-power').classList.toggle('on', !!station);
      $('#radio').classList.toggle('playing', !!playing);
      $('#radio').classList.toggle('file', !!file);
      $('#radio-pill').classList.toggle('playing', !!playing);
      const vol = $('#r-vol'); if (document.activeElement !== vol) vol.value = volume;
      $('#r-note').textContent = !station ? ''
        : muted ? 'Son coupé (touche M).'
        : status === 'blocked' ? 'Appuie sur ▶ pour lancer la musique.'
        : status === 'broken' ? (navigator.onLine === false ? 'Hors ligne : seule N1 Groove fonctionne sans réseau.' : 'Aucun fichier lisible sur cette station.')
        : file ? '' : 'Musique originale, générée en direct.';
      requestAnimationFrame(fitTop);
    },
  };
}
export function radioVisible(on) { hudOn = on; applyRadioView(); }

let miniT = 0;
export function updateMiniMap(dt, pos) {
  miniT -= dt;
  if (miniT > 0) return;
  miniT = 0.12;
  const c = $('#minimap');
  if (!c || c.offsetParent === null) return;
  drawMiniMap(c, { size: document.body.classList.contains('touch') ? 112 : 156, ...pos });
}

/* ------------------------------------------------------------ cinématique entre deux étapes */
// la carte de la N1 se trace jusqu'à la ville d'arrivée, puis la ville se présente
export const CITY_NOTES = {
  'Lomé': 'Capitale du Togo, au bord du golfe de Guinée : le Grand marché d’Adawlato, le port, et la gare d’Agbalépédo où tout a commencé.',
  'Tsévié': 'Chef-lieu de la préfecture du Zio, à une trentaine de kilomètres de Lomé. Première vraie halte de la N1.',
  'Atakpamé': 'Ville bâtie sur les collines, chef-lieu de la région des Plateaux. Ici la route commence à grimper.',
  'Sokodé': 'Deuxième ville du pays, chef-lieu de la région Centrale, ville de la fête des couteaux (Adossa).',
  'Kara': 'Chef-lieu de la région de la Kara, au pied des monts kabyè. En juillet, les luttes de l’Evala.',
  'Mango': 'Sur la rive de l’Oti, à l’entrée du parc national de l’Oti-Kéran. Le Sahel n’est plus loin.',
  'Dapaong': 'Chef-lieu des Savanes, tout près du Burkina Faso. Non loin, les grottes de Nok dans les falaises.',
};
export function playCine({ city, region, fromName, hour, dayN, km, stageN, legs, dir, map }) {
  const el = $('#s-cine');
  el.innerHTML = `
    <canvas class="cine-map"></canvas>
    <div class="cine-txt">
      <div class="eyebrow">Jour ${dayN} · ${fmtClock(hour)} · ${dir > 0 ? 'aller' : 'retour'}, étape ${stageN}/${legs} bouclée</div>
      <div class="cine-from">${esc(fromName)} →</div>
      <h2>${esc(city)}</h2>
      <div class="cine-reg">${region ? `Région ${esc(region === 'Kara' ? 'de la Kara' : region === 'Savanes' ? 'des Savanes' : region === 'Plateaux' ? 'des Plateaux' : region === 'Centrale' ? 'Centrale' : region === 'Maritime' ? 'Maritime' : region)}` : ''} · <b>${Math.round(km)} km</b> de N1 parcourus</div>
      <p>${esc(CITY_NOTES[city] || '')}</p>
    </div>
    <button class="cine-skip" id="c-skip">Passer <span class="kbd">Entrée</span></button>`;
  show('s-cine');
  const cv = el.querySelector('.cine-map');
  const H = Math.min(innerHeight * 0.86, 720), W = Math.round(H * 0.46);
  const narrow = innerWidth < 760;
  const w = narrow ? Math.min(innerWidth - 32, 260) : W, h = narrow ? Math.round(w / 0.46 * 0.62) : H;
  return new Promise((resolve) => {
    let t = 0, last = performance.now(), done = false;
    const finish = () => { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.classList.remove('out'); resolve(); }, 350); };
    el.querySelector('#c-skip').onclick = finish;
    el.onclick = (e) => { if (e.target === el || e.target === cv) finish(); };
    const tick = (now) => {
      if (done) return;
      t += Math.min(0.05, (now - last) / 1000); last = now;
      const k = Math.min(1, t / 2.6), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = map.rev ? 1 - e : e;
      drawFullMap(cv, { w, h, stage: map.stage, progress: p, rev: map.rev, showNeighbors: !narrow, dark: true });
      if (t > 6.2) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
