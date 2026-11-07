// Portraits des passagers (SVG dessiné en code) : teint, coiffe et tenue selon le profil, motif wax sur le vêtement.
const SKINS = ['#6e4229', '#7f4e33', '#8f5c3c', '#5c3521', '#9c6845'];
const WAX = [['#1f4fa0', '#f2c230'], ['#0f7a4a', '#f08a24'], ['#7b2f8f', '#f4c430'], ['#d4581f', '#1b4d3a'], ['#b8262b', '#1a1a1a'], ['#2b8a9a', '#ffffff'], ['#c8322b', '#f4c430'], ['#6a2f8f', '#f08a24']];
const BG = ['#e9b53a', '#d9a273', '#9fc3a0', '#b7c7de', '#e3c6a8', '#c9b3d6'];

function rngOf(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pk = (r, a) => a[Math.floor(r() * a.length)];

function waxPattern(id, [c1, c2], kind) {
  const motif = [
    `<circle cx="4" cy="4" r="2.4" fill="${c2}"/><circle cx="4" cy="4" r="1" fill="${c1}"/>`,
    `<path d="M0 4h8M4 0v8" stroke="${c2}" stroke-width="1.6"/>`,
    `<path d="M4 0l4 4-4 4-4-4z" fill="${c2}"/>`,
    `<circle cx="0" cy="0" r="3" fill="${c2}"/><circle cx="8" cy="8" r="3" fill="${c2}"/><circle cx="4" cy="4" r="1.4" fill="${c2}"/>`,
  ][kind % 4];
  return `<pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(${kind * 20})"><rect width="8" height="8" fill="${c1}"/>${motif}</pattern>`;
}

export function portraitSVG(p, size = 48) {
  const r = rngOf((p.look ?? p.id * 7919) + 13);
  const skin = pk(r, SKINS);
  const wax = pk(r, WAX);
  const wax2 = pk(r, WAX);
  const pid = `wx${p.id}`;
  const pid2 = `wy${p.id}`;
  const old = p.trait === 'ancien';
  const f = p.female;
  const bg = pk(r, BG);
  const defs = waxPattern(pid, wax, Math.floor(r() * 4)) + waxPattern(pid2, wax2, Math.floor(r() * 4));
  const dark = '#1b1410';
  let body = '', head = '', top = '', extra = '';

  // vêtement
  if (p.trait === 'agent' && !f) body = `<path d="M8 64c2-13 12-17 24-17s22 4 24 17z" fill="#e9e6dc"/><path d="M28 47l4 6 4-6" fill="#cfcabd"/><path d="M31 51h2l1.2 10h-4.4z" fill="#2f5f9f"/>`;
  else if (p.trait === 'etudiant') body = `<path d="M8 64c2-13 12-17 24-17s22 4 24 17z" fill="${f ? `url(#${pid})` : '#c9ad74'}"/><path d="M18 50l-3 14M46 50l3 14" stroke="#2f5f9f" stroke-width="3"/>`;
  else body = `<path d="M8 64c2-13 12-17 24-17s22 4 24 17z" fill="url(#${pid})"/>${!f && old ? '<path d="M24 47l8 9 8-9" fill="#e9e6dc"/>' : ''}`;

  // visage
  head = `<rect x="28" y="38" width="8" height="10" rx="3" fill="${skin}"/>
    <ellipse cx="20.6" cy="30" rx="2" ry="3" fill="${skin}"/><ellipse cx="43.4" cy="30" rx="2" ry="3" fill="${skin}"/>
    <ellipse cx="32" cy="29" rx="11.5" ry="13.5" fill="${skin}"/>
    <ellipse cx="27.5" cy="29.5" rx="1.5" ry="1.7" fill="${dark}"/><ellipse cx="36.5" cy="29.5" rx="1.5" ry="1.7" fill="${dark}"/>
    <circle cx="28" cy="29" r=".5" fill="#fff"/><circle cx="37" cy="29" r=".5" fill="#fff"/>
    <path d="M25 26.2q2.5-1.4 5 0M34 26.2q2.5-1.4 5 0" stroke="${dark}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M30.6 34.6q1.4 1 2.8 0" stroke="#4a2a1a" stroke-width="1" fill="none"/>
    <path d="M28.4 38q3.6 ${p.trait === 'malade' ? '-1' : '2.2'} 7.2 0" stroke="#5a2e22" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  if (p.trait === 'malade') extra += `<ellipse cx="32" cy="30" rx="11.5" ry="13.5" fill="#7fae5a" opacity=".16"/>`;

  // coiffe
  if (f) {
    if (p.trait === 'etudiant' && r() < 0.6) top = `<path d="M20 28c0-11 6-15 12-15s12 4 12 15c-2-6-6-8-12-8s-10 2-12 8z" fill="${dark}"/>${[22, 26, 30, 34, 38, 42].map((x) => `<path d="M${x} 21v${10 + (x % 3)}" stroke="${dark}" stroke-width="1.6"/>`).join('')}`;
    else top = `<path d="M18.5 27c-1-11 6-17 13.5-17s15 5 13.5 17c-3-4-8-6-13.5-6s-10.5 2-13.5 6z" fill="url(#${pid2})"/>
      <path d="M38 12c6-4 10 0 8 4-3-1-5-1-8 1z" fill="url(#${pid2})"/><path d="M26 12c-6-4-10 0-8 4 3-1 5-1 8 1z" fill="url(#${pid2})"/>`;
    if (r() < 0.6) extra += `<circle cx="20.6" cy="33.5" r="1.1" fill="#f2c230"/><circle cx="43.4" cy="33.5" r="1.1" fill="#f2c230"/>`;
  } else if (old || (p.trait === 'commerce' && r() < 0.5)) {
    top = `<path d="M20.5 24c0-7 5-10 11.5-10s11.5 3 11.5 10z" fill="${old ? '#f2efe6' : `url(#${pid2})`}"/>`;
  } else if (p.trait === 'chevre') {
    // chapeau conique des bergers peuls
    top = `<path d="M10 22q22-6 44 0l-3 2q-19-4-38 0z" fill="#b8954f"/><path d="M19 21q13-15 26 0z" fill="#c9a660"/><path d="M19 21q13-3 26 0" stroke="#7a2230" stroke-width="1.5" fill="none"/>`;
  } else if (p.trait === 'etudiant' || (p.trait === 'presse' && r() < 0.5)) {
    top = `<path d="M20.5 25c0-8 5-11.5 11.5-11.5S43.5 17 43.5 25z" fill="${pk(r, ['#c8322b', '#2f5f9f', '#1d1c1a', '#0f7a4a'])}"/><path d="M32 23h15q1 2-1 3H32z" fill="#1d1c1a" opacity=".85"/>`;
  } else {
    top = `<path d="M20.5 26c0-9 5-12 11.5-12s11.5 3 11.5 12c-2-3-6-5-11.5-5s-9.5 2-11.5 5z" fill="${dark}"/>`;
  }
  if (old) {
    extra += `<circle cx="27.5" cy="29.5" r="3.2" stroke="#3a3530" stroke-width=".9" fill="none"/><circle cx="36.5" cy="29.5" r="3.2" stroke="#3a3530" stroke-width=".9" fill="none"/><path d="M30.7 29.5h2.6" stroke="#3a3530" stroke-width=".9"/>`;
    if (!f) extra += `<path d="M23 34q9 13 18 0q-2 4-9 5t-9-5z" fill="#ece8de"/>`;
  }
  if (p.trait === 'presse' && !old) extra += `<rect x="24" y="27.6" width="7" height="4" rx="1.4" fill="#1b1a17" opacity=".85"/><rect x="33" y="27.6" width="7" height="4" rx="1.4" fill="#1b1a17" opacity=".85"/><path d="M31 29h2" stroke="#1b1a17"/>`;

  return `<svg class="portrait" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><defs>${defs}<clipPath id="c${pid}"><circle cx="32" cy="32" r="32"/></clipPath></defs>
    <g clip-path="url(#c${pid})"><rect width="64" height="64" fill="${bg}"/>${body}${head}${top}${extra}</g></svg>`;
}
