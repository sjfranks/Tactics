'use strict';
// Balance simulator: plays whole battles with the party bot against the goblins' minds, using the rules as they stand.
//   node delve/tools/sim.js [battles] [seed]
// House rules can be switched for a run: EXPLODE=0 (crits do not explode).
const DV = require('../js/rules.js');
const n = +process.argv[2] || 2000, seed = +process.argv[3] || 1;
if (process.env.EXPLODE === '0') DV.TUNE.explode = false;
const t0 = Date.now(), r = DV.simulate(n, seed);
const pct = x => (100 * x).toFixed(1).padStart(5) + '%', f1 = x => x.toFixed(1).padStart(5);
console.log(`${n} battles in ${Date.now() - t0} ms`);
console.log(`Party wins ${pct(r.winRate)} · ${f1(r.avgRounds)} rounds · ${f1(r.avgHeroesUp)} heroes standing · ${f1(r.avgHeroHp)} party HP left · no one fell ${pct(r.flawlessRate)} · longest explosion ${r.maxChain}`);
console.log('                           dealt  taken  healed   fell   rolls  crits  (per battle)');
Object.values(r.units).forEach(q => console.log(`${(q.name + ' (' + q.cls + ')').padEnd(27)}${f1(q.avgDealt)}  ${f1(q.avgTaken)}  ${f1(q.avgHealed)}  ${pct(q.downRate)}  ${f1(q.rolls / n)}  ${(q.crits / n).toFixed(2).padStart(5)}`));
