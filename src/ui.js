import { CITIES, STAGES, TRAITS, PRICES, SEATS, ROOF, TANK, TOTAL_KM, WEATHER_LABEL, traitLabel } from './data.js';
import { fmtMoney, fmtClock, fmtDuration, clamp } from './util.js';
import { VEHICLES, PALETTE, STRIPES, RIMS, SLOGANS, cleanText } from './garage.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function show(id) {
  for (const el of document.querySelectorAll('.screen:not(.modal)')) el.classList.toggle('on', el.id === id);
}
export function modal(id, on) { $('#' + id).classList.toggle('on', on); }
export function hud(on) {
  $('#hud').hidden = !on;
  $('#touch').hidden = !(on && document.body.classList.contains('touch'));
}
export function loaded() { $('#loading').classList.add('done'); }

/* ------------------------------------------------------------ toasts */
const toastsEl = () => $('#toasts');
export function toast(html, kind = 'info', ms = 2800) {
  const box = toastsEl();
  while (box.children.length > 2) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = html;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, ms);
}
export function clearToasts() { toastsEl().innerHTML = ''; }

/* ------------------------------------------------------------ HUD */
let citiesBuilt = false;
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
    $('#h-cities').innerHTML = CITIES.map((c, i) => `<span data-i="${i}" class="${i % 2 ? 'up' : ''}" style="left:${cityPos[i] * 100}%">${esc(c.name)}</span>`).join('');
    citiesBuilt = true;
  }
  $('#h-stage').textContent = `Étape ${d.stage + 1}/${STAGES.length} · ${d.weatherLabel}`;
  $('#h-route').textContent = `${CITIES[d.stage].name} → ${CITIES[d.stage + 1].name}`;
  $('#h-dist').textContent = Math.max(0, Math.round(d.kmLeft));
  $('#h-pax').textContent = `${d.pax}/${SEATS} passagers`;
  $('#h-money').textContent = fmtMoney(d.money);
  $('#h-clock').textContent = fmtClock(d.hour);
  $('#h-speed').textContent = Math.round(Math.abs(d.speed) * 3.6);
  const prog = cityPos[d.stage] + (cityPos[d.stage + 1] - cityPos[d.stage]) * clamp(d.stageProgress, 0, 1);
  $('#h-fill').style.width = prog * 100 + '%';
  $('#h-dot').style.left = prog * 100 + '%';
  for (const sp of document.querySelectorAll('#h-cities span')) sp.classList.toggle('cur', +sp.dataset.i === d.stage + 1);
  setBar($('#g-fuel'), d.fuel / TANK);
  $('#g-fuel-t').textContent = d.fuel.toFixed(d.fuel < 10 ? 1 : 0) + ' L';
  setBar($('#g-hp'), d.hp / 100);
  $('#g-hp-t').textContent = Math.round(d.hp) + ' %';
  setBar($('#g-comfort'), d.comfort / 100);
  $('#g-pax').textContent = d.pax ? Math.round(d.comfort) + ' %' : '—';
}

/* ------------------------------------------------------------ titre */
export function renderTitle({ best, onStart, onGarage, vehicle }) {
  const el = $('#s-title');
  const strip = CITIES.map((c) => `<span>${esc(c.name)}</span>`).join('<i></i>');
  el.innerHTML = `
    <div class="title-wrap">
      <div class="n1-badge"><div class="n">N1</div><div class="r"><b>Taxi-brousse</b><span>Lomé → Dapaong · ~${TOTAL_KM} km</span></div></div>
      <h1>Traverse le Togo<br><em>avec ton taxi plein.</em></h1>
      <p class="lead">Charge tes passagers à la gare, double les camions, garde un œil sur l’essence et monte la faille d’Alédjo sans perdre les sacs du toit. Six étapes, de la côte au Sahel.</p>
      <div class="route-strip">${strip}</div>
      <div class="title-actions">
        <button class="btn" id="t-start">Ouvrir la gare de Lomé <span class="kbd">Entrée</span></button>
        <button class="btn ghost" id="t-garage">Garage</button>
      </div>
      <div class="title-meta">${best ? `<span>Record : <b>${fmtMoney(best.money)}</b> à ${esc(CITIES[best.reached].name)}</span>` : '<span>Pas encore de record. À toi de l’ouvrir.</span>'}<span>Véhicule : <b>${esc(vehicle)}</b></span><span>Gratuit · PC et mobile</span></div>
      <div class="howto">
        <h3>Comment on joue</h3>
        <ul>
          <li><b>À la gare</b> : choisis tes passagers (7 places, 6 colis sur le toit), fais le plein et répare.</li>
          <li><b>Sur la route</b> : ${document.body.classList.contains('touch') ? 'boutons Gaz, Frein, ◀ ▶ et Klaxon' : '<span class="kbd">↑</span> gaz, <span class="kbd">↓</span> frein et marche arrière, <span class="kbd">←</span> <span class="kbd">→</span> direction, <span class="kbd">Espace</span> klaxon'}.</li>
          <li><b>Klaxonne</b> derrière un camion : il se range à droite pour te laisser doubler. Regarde d’abord en face.</li>
          <li><b>Contrôles routiers</b> : passe sous 20 km/h ou paie l’amende. <b>Nids-de-poule</b> : ralentis ou casse le taxi.</li>
          <li><b>Essence</b> : arrête-toi sur le bas-côté droit devant les vendeuses au bord de la route.</li>
        </ul>
      </div>
    </div>`;
  el.querySelector('#t-start').onclick = onStart;
  el.querySelector('#t-garage').onclick = onGarage;
}

/* ------------------------------------------------------------ gare routière */
export function renderGare(ctx) {
  const { run, offers, weather, onToggle, onFuel, onRepair, onGo } = ctx;
  const el = $('#s-gare');
  const city = CITIES[run.stage];
  const next = CITIES[run.stage + 1];
  const S = STAGES[run.stage];
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
    const dest = CITIES[p.to].name;
    const bags = p.bags ? ` · ${p.bags} colis` : '';
    const cls = state === 'aboard' ? 'pax aboard' : `pax${state === 'on' ? ' on' : ''}${state === 'full' ? ' full' : ''}`;
    const tag = state === 'aboard' ? 'div' : 'button';
    return `<${tag} class="${cls}" data-id="${p.id}" ${tag === 'button' ? 'type="button"' : ''} aria-pressed="${state === 'on'}">
      <div class="ic">${T.icon}</div>
      <div><div class="nm">${esc(p.name)} <span style="font-weight:600;color:var(--ink-2)">→ ${esc(dest)}</span></div>
      <div class="tr">${esc(traitLabel(p))}${bags} · ${esc(T.desc)}</div></div>
      <div class="fare">${state === 'aboard' ? `${Math.round(p.sat)}%` : fmtMoney(p.fare)}<small>${state === 'aboard' ? 'satisfaction' : `${p.km} km`}</small></div>
    </${tag}>`;
  };

  const aboard = run.passengers.filter((p) => !offers.some((o) => o.id === p.id));
  const offerCards = offers.map((o) => {
    const on = run.passengers.some((p) => p.id === o.id);
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
          <div class="eyebrow">Étape ${run.stage + 1} sur ${STAGES.length} · ${fmtClock(run.hour)}</div>
          <h2>${esc(city.gare)}</h2>
          <div class="next">Prochaine ville : <b>${esc(next.name)}</b> · ~${S.km} km de N1 · <span class="weather">${weather === 'rain' ? '🌧' : weather === 'harmattan' ? '🌫' : '☀'} ${WEATHER_LABEL[weather]}</span>${S.landmark ? ` · passage de la <b>${esc(S.landmark)}</b>` : ''}</div>
        </div>
        <div class="cash"><div class="eyebrow">${run.money < 0 ? 'Dette' : 'En caisse'}</div><b style="${run.money < 0 ? 'color:var(--red)' : ''}">${fmtMoney(run.money)}</b></div>
      </div></div>

      <div class="card panel">
        <h3>Sur le quai <small>${offers.length} personnes attendent</small></h3>
        <p class="hint">Le prix du voyage est payé à la montée. À l’arrivée, un passager content laisse un pourboire ; un passager secoué discute le prix.</p>
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

  for (const b of el.querySelectorAll('button.pax')) b.onclick = () => onToggle(+b.dataset.id);
  el.querySelector('#f10').onclick = () => onFuel(fuel10, price(fuel10));
  el.querySelector('#ffull').onclick = () => onFuel(fullL, price(fullL));
  el.querySelector('#r25').onclick = () => onRepair(rep25, rprice(rep25));
  el.querySelector('#rall').onclick = () => onRepair(repAll, rprice(repAll));
  el.querySelector('#g-go').onclick = onGo;
}

/* ------------------------------------------------------------ arrivée d'étape */
export function renderArrival({ run, city, lines, extra, stageTime, onNext, last }) {
  const el = $('#s-arrival');
  const rows = lines.map((l) => {
    const cls = l.amount > 0 ? 'pos' : l.amount < 0 ? 'neg' : '';
    return `<div class="l"><span>${l.label}</span><b class="${cls}">${l.amount ? (l.amount > 0 ? '+' : '') + fmtMoney(l.amount) : '—'}</b></div>`;
  }).join('');
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Arrivée · ${fmtClock(run.hour)} · étape bouclée en ${fmtDuration(stageTime)}</div>
      <h2>${esc(city.name)}</h2>
      <p class="sub">${lines.length ? 'Les passagers descendent et règlent leurs comptes.' : 'Personne ne descend ici.'} ${extra || ''}</p>
      <div class="ledger">${rows}<div class="l total"><span>En caisse</span><b>${fmtMoney(run.money)}</b></div></div>
      <div class="actions"><button class="btn green" id="a-next">${last ? 'Voir le bilan' : `Entrer en gare de ${esc(city.name)}`} <span class="kbd">Entrée</span></button></div>
    </div></div>`;
  el.querySelector('#a-next').onclick = onNext;
}

/* ------------------------------------------------------------ fin */
export function renderEnd({ win, reason, run, best, isRecord, onRestart, onShare }) {
  const el = $('#s-end');
  const s = run.stats;
  const reached = CITIES[run.reached].name;
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">${win ? 'Terminus' : 'Fin du voyage'} · ${fmtClock(run.hour)}</div>
      <h2>${win ? 'Dapaong, enfin !' : esc(reason.title)}</h2>
      <p class="sub">${win ? `Tu as relié Lomé à Dapaong par la N1. ${isRecord ? '<b>Nouveau record !</b>' : ''}` : esc(reason.text)}</p>
      <div class="stats">
        <div><b>${fmtMoney(run.money)}</b><span>En caisse</span></div>
        <div><b>${esc(reached)}</b><span>Ville atteinte</span></div>
        <div><b>${s.carried}</b><span>Passagers déposés</span></div>
        <div><b>${fmtMoney(s.tips)}</b><span>Pourboires nets</span></div>
        <div><b>${s.fines}</b><span>Amendes</span></div>
        <div><b>${s.crashes}</b><span>Accrochages</span></div>
      </div>
      ${best ? `<p class="sub">Record : <b>${fmtMoney(best.money)}</b> (${esc(CITIES[best.reached].name)})</p>` : ''}
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
export function renderPause({ onResume, onRestart, onQuit }) {
  const el = $('#s-pause');
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Pause</div>
      <h2>Le moteur tourne au ralenti</h2>
      <p class="sub">Le chrono est arrêté. <span class="kbd">P</span> ou <span class="kbd">Échap</span> pour reprendre.</p>
      <div class="actions">
        <button class="btn green" id="p-resume">Reprendre</button>
        <button class="btn ghost" id="p-restart">Recommencer l’étape</button>
        <button class="btn ghost" id="p-quit">Abandonner</button>
      </div>
    </div></div>`;
  el.querySelector('#p-resume').onclick = onResume;
  el.querySelector('#p-restart').onclick = onRestart;
  el.querySelector('#p-quit').onclick = onQuit;
}

export function renderRescue({ money, onPay, onGiveUp }) {
  const el = $('#s-modal');
  const can = money >= PRICES.rescue;
  el.innerHTML = `
    <div class="card sheet"><div class="stripe"></div><div class="inner">
      <div class="eyebrow">Panne sèche</div>
      <h2>Plus une goutte d’essence</h2>
      <p class="sub">${can ? `Un zémidjan qui passe propose d’aller chercher ${PRICES.rescueLiters} litres au village pour <b>${fmtMoney(PRICES.rescue)}</b>.` : `Un zémidjan propose son aide pour ${fmtMoney(PRICES.rescue)}, mais tu n’as que ${fmtMoney(money)} en caisse.`}</p>
      <div class="actions">
        ${can ? `<button class="btn green" id="m-pay">Payer le zém (${fmtMoney(PRICES.rescue)})</button>` : ''}
        <button class="btn ${can ? 'ghost' : 'red'}" id="m-quit">Abandonner le voyage</button>
      </div>
    </div></div>`;
  if (can) el.querySelector('#m-pay').onclick = onPay;
  el.querySelector('#m-quit').onclick = onGiveUp;
}

/* ------------------------------------------------------------ garage */
export function renderGarage({ cfg, onChange, onSave, onCancel }) {
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
        <div class="g-sec"><h3>Plaque</h3><input class="txt" id="g-plate" maxlength="10" value="${esc(cfg.plate)}" autocomplete="off"></div>
        <div class="g-actions"><button class="btn green" id="g-save">Valider <span class="kbd">Entrée</span></button><button class="btn ghost" id="g-cancel">Annuler</button></div>
      </div>
    </div>`;
  const set = (patch) => onChange({ ...cfg, ...patch });
  for (const b of el.querySelectorAll('[data-model]')) b.onclick = () => set({ model: b.dataset.model });
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
