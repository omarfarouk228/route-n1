// Tests des règles et de l'équilibrage (sans navigateur) : `npm test`
// Les modules du jeu sont chargés par Vite (imports JSON, alias) en mode SSR.
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, entries: [] } });
const load = (m) => server.ssrLoadModule(m);
let failed = 0, passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { failed++; console.log(`  ÉCHEC  ${name}\n        ${e.message}`); }
}

try {
  const D = await load('/src/data.js');
  const R = await load('/src/rules.js');
  const C = await load('/src/career.js');
  const U = await load('/src/util.js');
  const rng = U.mulberry32(1234);

  await test('les étapes du retour sont l’aller à l’envers', () => {
    for (let k = 0; k < D.LEGS; k++) {
      const a = D.legOf(1, k), b = D.legOf(-1, D.LEGS - 1 - k);
      assert.equal(b.geoIndex, a.geoIndex);
      assert.equal(b.from, a.to); assert.equal(b.to, a.from);
      assert.equal(b.zones.at(-1).until, 1);
      for (let i = 1; i < b.zones.length; i++) assert.ok(b.zones[i].until > b.zones[i - 1].until, 'zones croissantes');
      assert.deepEqual(b.zones.map((z) => z.biome), [...a.zones].reverse().map((z) => z.biome));
      assert.deepEqual(b.tolls.map((t) => t.name).sort(), a.tolls.map((t) => t.name).sort());
    }
  });

  await test('les passagers vont dans le sens du voyage', () => {
    for (const dir of [1, -1]) {
      for (let k = 0; k < D.LEGS; k++) {
        const ci = D.cityAt(dir, k);
        for (let n = 0; n < 30; n++) {
          for (const o of D.makeOffers(rng, ci, [], dir)) {
            assert.ok(o.fare >= 50 && o.km > 0, 'prix et distance');
            assert.ok(dir > 0 ? o.to > ci : o.to < ci, `destination ${o.to} depuis ${ci} (sens ${dir})`);
            assert.ok(o.to >= 0 && o.to < D.CITIES.length);
            if (o.town) {
              assert.equal(o.leg, k);
              assert.ok(D.legOf(dir, k).towns.some((t) => t.name === o.town), `village ${o.town} sur l'étape`);
            } else assert.equal(o.leg, k + Math.abs(o.to - ci) - 1);
          }
        }
      }
    }
  });

  await test('voyageurs du bord de la route : destination devant et prix réduit', () => {
    for (let n = 0; n < 50; n++) {
      const p = D.makeHailer(rng, { dir: -1, k: 2, aboard: [] });
      assert.ok(p.to < D.cityAt(-1, 2));
      assert.ok(p.fare >= 50);
    }
  });

  await test('règlement des passagers', () => {
    const p = { name: 'Ama', female: true, trait: 'agent', fare: 2000, sat: 95 };
    assert.ok(R.settle(p).total > 0);
    assert.equal(R.settle({ ...p, sat: 70 }).total, 0);
    assert.ok(R.settle({ ...p, sat: 40 }).total < 0);
    assert.ok(R.settle({ ...p, sat: 10 }).total < R.settle({ ...p, sat: 40 }).total);
    assert.ok(R.settle({ ...p, town: 'Notsé' }, { missed: true }).total < 0);
    const rush = { ...p, trait: 'presse', sat: 70 };
    assert.ok(R.settle(rush, { late: false }).total > R.settle(rush, { late: true }).total);
  });

  await test('marchandage : les étudiants refusent le plus souvent, les pressés acceptent', () => {
    const rate = (trait) => { let ok = 0; for (let n = 0; n < 2000; n++) if (R.haggle(rng, { trait, fare: 2000 }).ok) ok++; return ok / 2000; };
    assert.ok(rate('etudiant') < 0.25, 'étudiant');
    assert.ok(rate('presse') > 0.7, 'pressé');
    const h = R.haggle(() => 0, { trait: 'presse', fare: 2000 });
    assert.equal(h.fare, 2400);
  });

  await test('améliorations de l’atelier', () => {
    const base = C.vehicleSpec('break', {});
    const up = C.vehicleSpec('break', { galerie: true, reservoir: true, moteur: true, amortisseurs: true, radiateur: true, pneus: true });
    assert.equal(up.roof, base.roof + 2);
    assert.equal(up.tank, base.tank + 10);
    assert.ok(up.power > base.power && up.fuel < base.fuel);
    assert.ok(up.shock < 1 && up.heat < 1 && up.flat < 1 && up.wheelTime < base.wheelTime);
  });

  await test('équilibrage : un chauffeur correct finit l’aller avec un bénéfice raisonnable', () => {
    // estimation : taxi plein, passagers satisfaits à 80 %, essence à la gare, péages, une amende sur deux étapes
    const V = C.vehicleSpec('break', {});
    const profits = [];
    for (let trial = 0; trial < 200; trial++) {
      let money = C.START_CASH;
      for (let k = 0; k < D.LEGS; k++) {
        const offers = D.makeOffers(rng, k, [], 1).filter((o) => !o.town).slice(0, V.seats);
        let roof = 0;
        for (const o of offers) { if (roof + o.bags > V.roof) continue; roof += o.bags; money += Math.round(o.fare / Math.abs(o.to - k)); money += R.settle({ ...o, sat: 80 }).total / Math.abs(o.to - k); }
        const leg = D.legOf(1, k);
        const liters = (0.0044 * V.fuel * leg.length) / D.LEN_SCALE;
        money -= liters * D.PRICES.fuelGare + leg.tolls.length * D.PRICES.toll + (k % 2) * D.PRICES.fine;
      }
      profits.push(money - C.START_CASH);
    }
    const avg = profits.reduce((a, b) => a + b, 0) / profits.length;
    console.log(`        bénéfice moyen estimé sur l’aller : ${Math.round(avg)} F`);
    // un bon voyage paie environ une amélioration (4 000 à 9 000 F) ; marchandage, pourboires et voyageurs du bord de la route en plus
    assert.ok(avg > 2000, 'le voyage doit rapporter');
    assert.ok(avg < 20000, 'pas trop facile');
  });
} finally {
  await server.close();
}
console.log(`\n${passed} réussis, ${failed} en échec`);
process.exit(failed ? 1 : 0);
