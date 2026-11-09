'use strict';
// GOBLIN DELVE · THE TABLE
// Everything round the dungeon: the party's portraits, the turn order, the dice readout, the hotbar, the sheets and
// menus, and the event player that turns the rules' events into things happening on screen.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  };
  const SET = Object.assign({ speed: 'normal', mute: false, auto: false }, store.get('delve-settings', {}));
  const saveSet = () => store.set('delve-settings', SET);
  let TUNING = store.get('delve-tuning', null) || { units: {}, tune: {} };
  DV.applyTuning(TUNING);
  const saveTuning = () => store.set('delve-tuning', TUNING);

  let S = null; // the battle
  // hero: the hero the player has picked to act next (until they act, another ready hero can be picked instead)
  const ui = { phase: 'fight', sel: null, busy: false, gen: 0, log: [], hp: {}, active: null, hero: null, floaters: {} };
  // statuses, shown as icons on portraits and nameplates
  const ST = {
    guard: { icon: '🛡️', name: 'Guard', on: u => u.guard > 0, n: u => u.guard },
    taunt: { icon: '📯', name: 'Taunting', on: u => !!u.taunt },
    ward: { icon: '🔰', name: 'Shielded', on: u => !!u.ward },
    hidden: { icon: '🌫️', name: 'Hidden', on: u => !!u.hidden },
    coat: { icon: '🧪', name: 'Poisoned blade', on: u => !!u.coat, n: u => u.coat.attacks },
    poison: { icon: '☠️', name: 'Poisoned', on: u => !!u.poison, n: u => u.poison.ticks },
    weak: { icon: '🥀', name: 'Weakened', on: u => !!u.weak, n: u => u.weak.n },
    slow: { icon: '🐌', name: 'Slowed', on: u => !!u.slow },
    blessed: { icon: '🙏', name: 'Blessed', on: u => !!u.blessed },
  };
  const statusIcons = u => u.down ? '' : Object.values(ST).filter(st => st.on(u)).map(st => `<span title="${st.name}">${st.icon}${st.n ? `<sub>${st.n(u)}</sub>` : ''}</span>`).join('');
  const short = n => n.replace(/^Sister /, '').replace(/^Old /, '');
  const U = id => S.units[id];
  const actIcon = (u, a) => a === 'attack' ? u.hitIcon : DV.ACTIONS[a].icon;
  // every die shares the same four symbols
  const SYM = ART.FACE_SVG;
  // a face as a chip: its symbol, and (for an attack) the damage it shows on the die in front of it
  const faceLabel = (u, f) => { const d = DV.faceDamage(u, f); return d.n + (d.plus ? '+' : ''); };
  const faceChip = (f, cls = '', num = null) => `<span class="face f-${f} ${num != null ? 'num ' : ''}${cls}" title="${DV.FACE_NAME[f]}${num != null ? ' ' + num : ''}">${num != null && f === 'crit' ? SYM.burst : SYM[f]}${num != null ? `<b>${num}</b>` : ''}</span>`;
  const actor = () => ui.hero && S.units[ui.hero];
  const partyPick = () => ui.phase === 'fight' && !ui.busy && !SET.auto && DV.ready(S).side === 'hero';
  const wait = ms => VIEW.wait(ms);
  const sfx = (k, v) => VIEW.sfx(k, v);

  // ---------------- readout: the box above the hotbar ----------------
  const RO = {
    open(title, sub) { $('#roTitle').innerHTML = title; $('#roSub').textContent = sub || ''; $('#roChips').innerHTML = ''; $('#roText').innerHTML = ''; },
    // a new title and prompt, keeping the dice of the last roll in view
    retitle(title, sub) { $('#roTitle').innerHTML = title; $('#roSub').textContent = sub || ''; $('#roText').innerHTML = ''; },
    chip(html) { $('#roChips').insertAdjacentHTML('beforeend', html); },
    group(label) { const g = el('span', 'chipgrp', label ? `<em>${esc(label)}</em>` : ''); $('#roChips').appendChild(g); return g; },
    text(html, cls = '') { const s = el('span', cls, html); $('#roText').appendChild(s); },
    note(html) { $('#roText').innerHTML = `<span class="gold">${html}</span>`; },
  };

  // ---------------- the log ----------------
  function log(html, cls = '') { ui.log.push({ html, cls }); }

  // ---------------- the party's portraits ----------------
  function buildParty() {
    const box = $('#party'); box.innerHTML = '';
    DV.PARTY.forEach(id => {
      const u = U(id), b = el('button', 'pc');
      b.type = 'button'; b.dataset.id = id;
      const pp = el('span', 'pp'); pp.appendChild(ART.portraitCanvas(u.type));
      b.appendChild(pp);
      b.insertAdjacentHTML('beforeend', `<span class="pc-badge"></span><span class="pc-rank">${u.rank}</span><span class="pc-st"></span>
        <span class="pc-meta"><span class="pc-name">${esc(short(u.name))}</span><span class="pc-hpl"><span class="bar"><u></u><i></i></span><span class="pc-hp num"></span></span></span><span class="pc-fx"></span>`);
      bindPress(b, () => tapHero(id), () => openSheet(id));
      box.appendChild(b);
    });
  }
  // ---------------- the goblins' nameplates and hit areas ----------------
  function buildTags() {
    const box = $('#tags'); box.innerHTML = '';
    Object.values(S.units).filter(u => u.side === 'foe').forEach(u => {
      const b = el('button', 'tag'); b.type = 'button'; b.dataset.id = u.id;
      b.style.zIndex = u.rank === 'front' ? 3 : 2;
      b.innerHTML = `<span class="plate"><span class="st"></span><span class="odds"></span><b>${esc(u.name)}</b><span class="bar"><u></u><i></i></span><span class="ini num"></span></span>`;
      bindPress(b, () => tapFoe(u.id), () => openSheet(u.id));
      // with a mouse, the goblin under the pointer lights up as the one you would hit
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hoverFoe(u.id); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hoverFoe(null); });
      box.appendChild(b);
    });
  }
  function placeTags() {
    if (!S) return;
    $$('#tags .tag').forEach(t => {
      const b = VIEW.boxOf(t.dataset.id); if (!b) return;
      // the hit area is the figure's box, trimmed at the sides (the ears are wide)
      const w = b.w * .78, x = b.cx - w / 2;
      t.style.transform = `translate(${x.toFixed(1)}px,${b.y.toFixed(1)}px)`; t.style.width = w.toFixed(1) + 'px'; t.style.height = b.h.toFixed(1) + 'px';
    });
  }
  // a tap, or a long press for the sheet
  function bindPress(node, tap, hold) {
    let timer = 0, held = false;
    node.addEventListener('pointerdown', () => { VIEW.audio(); held = false; clearTimeout(timer); timer = setTimeout(() => { held = true; hold(); }, 480); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => node.addEventListener(k, () => clearTimeout(timer)));
    node.addEventListener('click', e => { clearTimeout(timer); if (held) { held = false; e.preventDefault(); return; } tap(); });
    node.addEventListener('contextmenu', e => { e.preventDefault(); });
  }

  // ---------------- drawing the state ----------------
  function setBar(bar, hp, max) {
    const p = Math.max(0, hp) / max * 100;
    bar.querySelector('i').style.width = p + '%'; bar.querySelector('u').style.width = p + '%';
    bar.classList.toggle('low', p <= 50 && p > 25); bar.classList.toggle('crit', p <= 25);
  }
  function drawUnit(id) {
    const u = U(id), hp = ui.hp[id] ?? u.hp;
    const sts = statusIcons(u);
    if (u.side === 'hero') {
      const c = $(`.pc[data-id="${id}"]`); if (!c) return;
      setBar($('.bar', c), hp, u.max); $('.pc-hp', c).textContent = `${Math.max(0, hp)}/${u.max}`;
      $('.pc-st', c).innerHTML = sts; c.classList.toggle('down', hp <= 0 && u.down);
      const acted = S.acted.includes(id) && !S.over, rd = DV.ready(S);
      c.classList.toggle('done', acted && !u.down); c.classList.toggle('ready', rd.side === 'hero' && rd.ids.includes(id) && !SET.auto);
      $('.pc-badge', c).textContent = acted && !u.down ? '✓' : '';
      c.setAttribute('aria-label', `${u.name}, ${u.cls}, ${Math.max(0, hp)} of ${u.max} HP${u.down ? ', down' : acted ? ', has acted this round' : ''}`);
    } else {
      const t = $(`.tag[data-id="${id}"]`); if (!t) return;
      setBar($('.bar', t), hp, u.max); $('.st', t).innerHTML = sts;
      $('.ini', t).textContent = S.acted.includes(id) && !u.down && !S.over ? '✓' : '';
      t.classList.toggle('dead', u.down && !VIEW.alive(id));
      t.setAttribute('aria-label', `${u.name}, ${u.cls}, ${Math.max(0, hp)} of ${u.max} HP`);
    }
  }
  function drawAll() { Object.keys(S.units).forEach(drawUnit); drawOrder(); $('#roundN').textContent = S.round || '–'; }
  // the round at a glance: the party (any order you like), then the goblins in the order they act
  function drawOrder() {
    const ol = $('#order');
    if (ol.children.length !== DV.PARTY.length + S.order.foe.length + 1) {
      ol.innerHTML = '';
      [...S.order.hero, null, ...S.order.foe].forEach(id => {
        const li = el('li');
        if (!id) { li.className = 'osep'; li.setAttribute('aria-hidden', 'true'); ol.appendChild(li); return; }
        const u = U(id), b = el('button', 'oc ' + u.side);
        b.type = 'button'; b.dataset.id = id;
        const m = el('span', 'mini'); m.appendChild(ART.portraitCanvas(u.type, variantOf(u))); b.appendChild(m);
        b.insertAdjacentHTML('beforeend', '<b></b>');
        b.addEventListener('click', () => openSheet(id));
        li.appendChild(b); ol.appendChild(li);
      });
    }
    const rd = DV.ready(S), nextFoe = S.order.foe.find(id => !U(id).down && !S.acted.includes(id));
    $$('.oc', ol).forEach(b => {
      const id = b.dataset.id, u = U(id), done = S.acted.includes(id) && !S.over;
      const cur = id === ui.active && !S.over;
      b.classList.toggle('cur', cur); b.classList.toggle('done', done && !u.down); b.classList.toggle('out', u.down);
      b.classList.toggle('next', u.side === 'foe' && id === nextFoe && !cur && !S.over);
      $('b', b).textContent = u.down ? '' : done ? '✓' : u.side === 'foe' && id === nextFoe ? 'next' : '';
      b.setAttribute('aria-label', `${u.name}${u.down ? ', down' : done ? ', has acted' : ''}`);
    });
  }
  const variantOf = u => u.type === 'goblin' ? +u.id.replace(/\D/g, '') - 1 : 0;
  function setActive(id) {
    ui.active = id;
    $$('.pc').forEach(c => c.classList.toggle('cur', c.dataset.id === id));
    $$('.tag').forEach(t => t.classList.toggle('cur', t.dataset.id === id));
    drawOrder();
  }

  // ---------------- floaters ----------------
  function floatOn(id, text, cls) {
    const u = U(id), n = ui.floaters[id] = (ui.floaters[id] || 0) + 1;
    setTimeout(() => { ui.floaters[id]--; }, 700);
    let host, x, y;
    if (u.side === 'hero') { host = $(`.pc[data-id="${id}"] .pc-fx`); x = host.clientWidth / 2; y = host.clientHeight * .42; }
    else { const b = VIEW.boxOf(id); if (!b) return; host = $('#floats'); x = b.cx; y = b.y + b.h * .3; }
    const f = el('span', 'float ' + cls, text); f.style.left = x + 'px'; f.style.top = (y - (n - 1) * 20) + 'px';
    host.appendChild(f); setTimeout(() => f.remove(), 1400);
  }
  function cardFx(id, cls, ms = 500) { const c = $(`.pc[data-id="${id}"]`); if (!c) return; c.classList.remove(cls); void c.offsetWidth; c.classList.add(cls); setTimeout(() => c.classList.remove(cls), ms); }
  function banner(big, small) {
    const b = el('div', 'banner', `<b>${esc(big)}</b>${small ? `<small>${esc(small)}</small>` : ''}`);
    $('#view').appendChild(b); setTimeout(() => b.remove(), 1400 / VIEW.speed);
  }

  // ---------------- the hotbar ----------------
  const pips = n => '◆'.repeat(n);
  const diceLabel = (u, A) => A.kind === 'attack' ? `🎲${DV.attackDice(S, u)}` : `🎲${DV.powerDice()}↑`;
  function renderHotbar() {
    const bar = $('#hotbar'); bar.innerHTML = '';
    if (ui.phase === 'over') {
      const b = el('button', 'bigbtn', `<span class="ai">⚔️</span><b>Fight again</b><small>Same rules, new rolls</small>`);
      b.type = 'button'; b.onclick = newFight; bar.appendChild(b); return;
    }
    const u = !S ? null : partyPick() ? actor() : ui.active ? U(ui.active) : null;
    if (!u || !partyPick()) {
      if (!u) return;
      const w = el('div', 'waiting' + (u.side === 'hero' ? ' hero' : ''));
      const m = el('span', 'mini'); m.appendChild(ART.portraitCanvas(u.type, variantOf(u))); w.appendChild(m);
      w.insertAdjacentHTML('beforeend', `<span><b>${esc(u.name)}</b> ${u.side === 'foe' || !SET.auto ? 'acts' : 'acts on its own'}<span class="dots"></span></span>`);
      bar.appendChild(w); return;
    }
    const T = DV.turnOf(S, u);
    u.actions.forEach((a, i) => {
      const A = DV.ACTIONS[a], can = DV.canUse(S, u.id, a);
      const b = el('button', 'abtn' + (A.kind === 'power' ? ' pow' : '') + (can.ok ? '' : ' off') + (ui.sel === a ? ' sel' : ''));
      b.type = 'button'; b.dataset.act = a;
      b.innerHTML = `<span class="ai">${actIcon(u, a)}</span><span class="nm">${esc(A.name)}</span><span class="cost">${pips(A.cost)}</span><span class="dl">${diceLabel(u, A)}</span>${can.wait ? `<span class="cd">${can.wait}</span>` : can.used ? '<span class="cd ok">✓</span>' : ''}`;
      b.setAttribute('aria-label', `${A.name}, ${A.cost} ${A.cost > 1 ? 'actions' : 'action'}${can.ok ? '' : ', ' + can.why} (key ${i + 1})`);
      b.setAttribute('aria-pressed', ui.sel === a ? 'true' : 'false');
      b.onclick = () => choose(a, b);
      bar.appendChild(b);
    });
    const end = el('button', 'endbtn' + (T.left ? '' : ' now'), `<b>End</b><small>${T.left ? pips(T.left) : 'turn'}</small>`);
    end.type = 'button'; end.id = 'endTurn'; end.setAttribute('aria-label', `End ${u.name}'s turn (${T.left} ${T.left === 1 ? 'action' : 'actions'} left, key E)`);
    end.onclick = endTurn; bar.appendChild(end);
  }

  // ---------------- the card over the dungeon: what the chosen action does ----------------
  function faceLine(u, A) {
    const sb = A.id === 'fireball' ? 0 : (DV.SURGES[u.surge].bonus || 0);
    const sx = A.id === 'fireball' || sb ? '' : ` + ${DV.SURGES[u.surge].name}`;
    return `<span class="fl">${SYM.graze}${DV.TUNE.graze}</span><span class="fl">${SYM.hit}${u.dmg}</span><span class="fl">${SYM.surge}${u.dmg + sb}${esc(sx)}</span><span class="fl">${SYM.crit}${u.dmg}${DV.TUNE.explode ? ' + 🎲' : ''}</span>`;
  }
  function showTip(u, A) {
    const tip = $('#tip'), mods = [];
    let body = '';
    if (A.kind === 'attack') {
      const T = DV.turnOf(S, u);
      if (T.attacks) mods.push('second attack: 1 die');
      if (u.blessed) mods.push('blessed');
      if (u.hidden) mods.push(`from hiding ×${u.hidden.mult}`);
      if (u.weak) mods.push(`weakened −${u.weak.n}`);
      body = `<p class="tl">Roll ${DV.attackDice(S, u)} ${DV.attackDice(S, u) > 1 ? 'dice' : 'die'}${A.target === 'all' ? ' once; every goblin takes the total' : ', added up'}${mods.length ? ` · ${esc(mods.join(' · '))}` : ''}</p><p class="faces-line">${faceLine(u, A)}</p>`;
    } else {
      const o = DV.tierOdds(u);
      body = `<p class="tl">Roll ${DV.powerDice()} dice; the best one counts.</p>` + DV.FACE_KINDS.map(k => `<p class="tier t-${k}"><span class="syms">${SYM[k]}</span><span class="odd">${Math.round(o[k] * 100)}%</span><span>${esc(A.tiers[k])}</span></p>`).join('');
    }
    tip.innerHTML = `<b>${actIcon(u, A.id)} ${esc(A.name)} <span class="pp">${pips(A.cost)}</span></b><p class="tx">${esc(A.text)}</p>${body}`;
    tip.hidden = false;
  }
  const hideTip = () => { $('#tip').hidden = true; };

  // ---------------- choosing and targeting ----------------
  function idleReadout(u) {
    const T = DV.turnOf(S, u), started = !!S.turn && S.turn.id === u.id;
    const sub = `${T.left} ${T.left === 1 ? 'action' : 'actions'} left`;
    if (started) RO.retitle(`${esc(short(u.name))}'s turn`, sub); else RO.open(`${esc(short(u.name))}'s turn`, sub);
    if (started) RO.text(T.left ? 'Pick another action, or End the turn.' : 'End the turn.', 'gold');
    else {
      RO.text('Pick an action, then a target.', 'gold');
      RO.text(DV.ready(S).ids.length > 1 ? 'Tap another ready hero to send them first.' : 'Tap a goblin or portrait for its sheet.', 'dim');
    }
  }
  // the player picks which hero acts next (until that hero has used an action)
  function pickHero(id) {
    if (ui.hero === id || S.turn) return;
    ui.hero = id; ui.sel = null; sfx('select');
    VIEW.mark({}); $$('.pc').forEach(c => c.classList.remove('tgt')); $$('.tag .odds').forEach(o => o.textContent = ''); hideTip();
    setActive(id); drawAll(); renderHotbar(); idleReadout(actor());
  }
  function describeAction(u, A) {
    const parts = [A.cost > 1 ? 'both actions' : '1 action'];
    parts.push(A.kind === 'attack' ? (A.target === 'all' ? '2 dice at every goblin' : '2 dice added up, 1 on a second attack') : 'best of 2 dice');
    if (A.target === 'foe') parts.push(A.reach === 'unit' ? u.reach : A.reach);
    if (A.recharge) parts.push(`recharges in ${A.recharge} rounds`);
    return parts.join(' · ');
  }
  function choose(a, btn) {
    if (!partyPick()) return;
    VIEW.audio();
    const u = actor(), A = DV.ACTIONS[a], can = DV.canUse(S, u.id, a);
    if (!can.ok) { sfx('nope'); if (btn) { btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope'); } RO.note(`${esc(A.name)}: ${esc(can.why)}.`); return; }
    if (ui.sel === a) {
      if (['none', 'self', 'all'].includes(A.target)) return commit(a, null);
      ui.sel = null; showSelection(); return;
    }
    ui.sel = a; sfx('select'); showSelection();
  }
  function showSelection() {
    const u = actor(); if (!u) return;
    renderHotbar();
    const marks = {}, A = ui.sel && DV.ACTIONS[ui.sel];
    $$('.pc').forEach(c => c.classList.remove('tgt'));
    $$('.tag .odds').forEach(o => o.textContent = '');
    if (!A) { VIEW.mark({}); hideTip(); idleReadout(u); return; }
    const tg = DV.targets(S, u.id, ui.sel);
    if (A.target === 'foe' || A.target === 'all') tg.forEach(id => marks[id] = A.target === 'all' ? 'hot' : 'valid');
    if (A.target === 'ally' || A.target === 'other') tg.forEach(id => $(`.pc[data-id="${id}"]`).classList.add('tgt'));
    VIEW.mark(marks);
    // on an attack, each goblin in reach shows the average damage and the chance to finish it
    if (A.kind === 'attack') tg.forEach(id => {
      const o = DV.odds(S, u.id, ui.sel, id); if (!o) return;
      const t = $(`.tag[data-id="${id}"] .odds`);
      if (t) t.textContent = `≈${o.avg.toFixed(1)}${o.kill > .005 ? ` · ☠${Math.round(o.kill * 100)}%` : ''}`;
    });
    RO.retitle(`<span class="emo">${actIcon(u, ui.sel)}</span> ${esc(A.name)}`, `${A.cost > 1 ? 'both actions' : '1 action'}${A.recharge ? ` · recharges in ${A.recharge}` : ''}`);
    const melee = A.reach === 'melee' || (A.reach === 'unit' && u.reach === 'melee');
    const prompt = A.target === 'foe' ? (melee ? 'Tap a goblin in the front rank.' : 'Tap any goblin.')
      : A.target === 'ally' ? 'Tap a hero’s portrait.' : A.target === 'other' ? 'Tap another hero’s portrait.'
        : A.target === 'all' ? `Tap ${esc(A.name)} again, or any goblin, to cast it.` : `Tap ${esc(A.name)} again to use it.`;
    RO.text(prompt, 'gold');
    showTip(u, A);
  }
  function hoverFoe(id) {
    if (!partyPick() || !ui.sel) return;
    const u = actor(), A = DV.ACTIONS[ui.sel];
    if (A.target !== 'foe') return;
    const marks = {}; DV.targets(S, u.id, ui.sel).forEach(t => marks[t] = t === id ? 'hot' : 'valid'); VIEW.mark(marks);
  }
  function tapFoe(id) {
    VIEW.audio();
    if (partyPick() && ui.sel) {
      const u = actor(), A = DV.ACTIONS[ui.sel];
      if (A.target === 'all') return commit(ui.sel, null);
      if (A.target === 'foe') {
        if (DV.targets(S, u.id, ui.sel).includes(id)) return commit(ui.sel, id);
        sfx('nope');
        const why = U(id).down ? `${U(id).name} is already down.` : U(id).rank === 'back' ? `${U(id).name} is in the back rank: melee reaches only the front rank while any of it stands.` : `${U(id).name} is out of reach.`;
        RO.note(esc(why)); return;
      }
    }
    openSheet(id);
  }
  function tapHero(id) {
    VIEW.audio();
    if (partyPick() && ui.sel && ['ally', 'other'].includes(DV.ACTIONS[ui.sel].target)) {
      const u = actor();
      if (DV.targets(S, u.id, ui.sel).includes(id)) return commit(ui.sel, id);
      sfx('nope'); RO.note(id === u.id ? 'Pick another hero.' : `${esc(U(id).name)} ${U(id).down ? 'has fallen' : 'is not hurt'}.`); return;
    }
    // a hero still waiting to act this round: tap to send them next. Anyone else: the sheet
    if (partyPick() && !S.turn && id !== ui.hero && DV.ready(S).ids.includes(id)) return pickHero(id);
    openSheet(id);
  }
  function clearAim() { ui.sel = null; VIEW.mark({}); $$('.pc').forEach(c => c.classList.remove('tgt')); $$('.tag .odds').forEach(o => o.textContent = ''); hideTip(); }
  async function commit(a, target) {
    clearAim(); ui.busy = true; renderHotbar();
    const g = ui.gen;
    await play(DV.act(S, ui.hero, a, target));
    if (g === ui.gen) proceed();
  }
  async function endTurn() {
    if (!partyPick()) return;
    clearAim(); ui.busy = true; renderHotbar();
    const g = ui.gen;
    await play(DV.obey(S, { id: ui.hero, end: true }));
    if (g === ui.gen) proceed();
  }
  // whoever acts next: goblins (and the party, on Auto) act by themselves, one action at a time
  async function proceed() {
    const g = ui.gen;
    for (let guard = 0; guard < 2000; guard++) {
      if (g !== ui.gen) return;
      if (S.over) return finish();
      const rd = DV.ready(S);
      if (rd.side === 'hero' && !SET.auto) break;
      ui.busy = true;
      const c = DV.mind(S);
      if (c.id !== ui.active) { setActive(c.id); if (U(c.id).side === 'hero') ui.hero = c.id; renderHotbar(); }
      await wait(U(c.id).side === 'foe' ? 460 : 340);
      // the goblins wait while a sheet or the menu is open
      while (!$('#modal').hidden && g === ui.gen) await new Promise(r => setTimeout(r, 200));
      if (g !== ui.gen || S.over) return;
      await play(DV.obey(S, c));
    }
    if (g !== ui.gen) return;
    // the party's move: keep the hero already picked if they can still act, else the next one down the column
    ui.busy = false; ui.sel = null;
    const rd = DV.ready(S); if (!rd.ids.includes(ui.hero)) ui.hero = rd.ids[0];
    setActive(ui.hero); drawAll(); renderHotbar(); idleReadout(actor());
  }

  // ---------------- the event player ----------------
  async function play(evs) {
    const g = ui.gen;
    for (const e of evs) { if (g !== ui.gen) return; await handle(e); }
    if (g === ui.gen) drawAll();
  }
  const nm = id => `<b>${esc(U(id).name)}</b>`;
  const lcls = id => U(id).side === 'foe' ? 'foe' : '';
  async function handle(e) {
    const u = e.id && U(e.id);
    switch (e.t) {
      case 'round':
        $('#roundN').textContent = e.n; log(`Round ${e.n}`, 'rd');
        banner(`Round ${e.n}`, 'the party moves first'); drawAll(); await wait(e.n > 1 ? 450 : 300);
        break;
      case 'done':
        drawUnit(e.id); drawOrder();
        break;
      case 'turn':
        setActive(e.id); drawUnit(e.id);
        if (u.side === 'hero') ui.hero = e.id;
        await wait(80);
        break;
      case 'status': {
        drawUnit(e.id);
        const st = ST[e.key]; if (!st) break;
        if (e.on) {
          floatOn(e.id, `${st.icon} ${st.name}${e.n != null && e.key !== 'coat' ? ' ' + e.n : ''}`, 'note');
          log(`${nm(e.id)}: ${st.name.toLowerCase()}${e.n != null ? ' ' + e.n : ''}.`, lcls(e.id));
          if (u.side === 'hero' && ['guard', 'ward', 'blessed'].includes(e.key)) cardFx(e.id, 'glint', 650);
          if (u.side === 'foe' && ['weak', 'slow'].includes(e.key)) VIEW.sparkle(e.id, e.key === 'weak' ? 0xb070ff : 0x70c0ff);
          await wait(160);
        }
        break;
      }
      case 'tick':
        RO.open(`☠️ ${esc(short(u.name))} is poisoned`, `${e.left} more ${e.left === 1 ? 'turn' : 'turns'}`);
        break;
      case 'slowed':
        floatOn(e.id, `🐌 −${e.lost} action${e.lost > 1 ? 's' : ''}`, 'note');
        log(`${nm(e.id)} is slowed: ${e.lost} ${e.lost > 1 ? 'actions' : 'action'} lost.`, lcls(e.id));
        await wait(320);
        break;
      case 'act': {
        const A = DV.ACTIONS[e.act];
        RO.open(`<span class="emo">${actIcon(u, e.act)}</span> ${esc(short(u.name))} · ${esc(A.name)}${e.target ? ` → ${esc(short(U(e.target).name))}` : ''}`, e.left ? `${e.left} ${e.left === 1 ? 'action' : 'actions'} left` : 'last action');
        log(`${nm(e.id)} uses <b>${esc(A.name)}</b>${e.target ? ` on ${nm(e.target)}` : ''}.`, lcls(e.id));
        if (u.side === 'hero') cardFx(e.id, 'acting', 420);
        else if (e.act === 'chant') VIEW.cast(e.id, 0x7dff9a);
        else if (u.reach === 'ranged' || e.act === 'curse') VIEW.cast(e.id, 0xc070ff);
        else VIEW.hop(e.id);
        await wait(160);
        break;
      }
      case 'roll': {
        const sum = e.mode === 'sum', chip = d => faceChip(d.face, (d.extra ? 'extra ' : '') + (d.dropped ? 'dropped' : ''), sum ? faceLabel(u, d.face) : null);
        const notes = [];
        if (e.later) notes.push('2nd attack');
        if (e.blessed) notes.push('🙏');
        if (e.from) notes.push(`🌫️×${e.from}`);
        if (!sum) notes.push('best');
        const grp = RO.group(notes.join(' '));
        await VIEW.roll({
          style: u.type, faces: u.faces, labels: u.faces.map(f => faceLabel(u, f)), from: u.side === 'foe' ? u.id : null, groups: e.groups, explode: sum && DV.TUNE.explode,
          onLand: d => grp.insertAdjacentHTML('beforeend', chip(d)),
        });
        if (sum) grp.insertAdjacentHTML('beforeend', `<em class="tot">= ${e.total}</em>`);
        log(`${e.groups[0].dice.map(chip).join(' ')}${sum ? ` = <b>${e.total}</b>` : ' (best die counts)'}`, lcls(e.id));
        await wait(220);
        if (!sum) break;
        // the blow lands as the dice fell
        const A = DV.ACTIONS[e.act], tgt = e.targets || [e.groups[0].target];
        if (u.side === 'foe') { if (u.reach === 'ranged') await VIEW.bolt(u.id, null, 0xc070ff, .3); else await VIEW.lunge(u.id); }
        else if (e.act === 'fireball') await VIEW.fireball(tgt);
        else if (A.reach === 'ranged' || (A.reach === 'unit' && u.reach === 'ranged')) await VIEW.bolt(null, tgt[0], u.type === 'mage' ? 0xa9bcff : u.type === 'cleric' ? 0xffe6a0 : 0xffffff, .26);
        else VIEW.slash(tgt[0], 0xffffff);
        break;
      }
      case 'tier': {
        RO.text(`<span class="syms">${SYM[e.tier]}</span> ${esc(e.text)}`, e.tier === 'graze' ? '' : 'gold');
        log(`<span class="syms">${SYM[e.tier]}</span> ${esc(DV.FACE_NAME[e.tier])}: ${esc(e.text)}`, lcls(e.id));
        if (e.tier === 'crit') { sfx('crit'); VIEW.flashScreen(); }
        const fx = {
          taunt: () => sfx('horn'), defend: () => sfx('select'), interpose: () => sfx('select'), hide: () => sfx('throw'), poison: () => sfx('zap'),
          weaken: () => VIEW.bolt(null, e.target, 0xb070ff, .3), slow: () => VIEW.bolt(null, e.target, 0x70c0ff, .3), curse: () => VIEW.bolt(e.id, null, 0xb070ff, .3),
          heal: () => sfx('heal'), bless: () => sfx('heal'), prayer: () => sfx('heal'),
        }[e.act];
        if (fx) await fx();
        await wait(e.tier === 'graze' ? 260 : 340);
        break;
      }
      case 'interpose':
        floatOn(e.id, '🔰 Interposes!', 'note'); cardFx(e.id, 'acting', 420);
        RO.text(`${esc(short(u.name))} steps in front of ${esc(short(U(e.from).name))}`, 'gold');
        log(`${nm(e.id)} steps in front of ${nm(e.from)}.`);
        await wait(280);
        break;
      case 'dmg': {
        ui.hp[e.id] = e.hp;
        const big = e.kind === 'crit';
        if (u.side === 'foe') VIEW.hurt(e.id, e.kind === 'poison' ? { colors: [0x70d040, 0xc0ff80] } : { crit: big });
        else { cardFx(e.id, 'hit', 400); VIEW.shake(big ? .12 : .06); sfx('hit'); }
        floatOn(e.id, e.amount ? `−${e.amount}` : 'Blocked', e.amount ? (big ? 'dmg big' : 'dmg') : 'miss');
        drawUnit(e.id);
        const why = e.kind === 'poison' ? ' (poison)' : e.kind === 'arc' ? ' (arc)' : '';
        const gd = e.guarded ? ` <span class="dim">(guard −${e.guarded})</span>` : '';
        RO.text(`${esc(short(u.name))} takes ${e.amount}${why}${gd}`, u.side === 'hero' ? 'bad' : '');
        log(`${nm(e.id)} takes <b>${e.amount}</b>${why}${gd}. ${Math.max(0, e.hp)} HP left.`, lcls(e.id));
        await wait(big ? 300 : 200);
        break;
      }
      case 'surge': {
        const K = DV.SURGES[e.surge];
        floatOn(e.id, `${SYM.surge} ${esc(K.name)}!`, 'note'); sfx('zap');
        RO.text(`<span class="syms">${SYM.surge}</span> ${esc(K.name)}${e.fizzle ? ': ' + esc(e.fizzle.toLowerCase()) : e.bonus ? ` +${e.bonus}` : ''}`, 'gold');
        log(`<span class="syms">${SYM.surge}</span> <b>${esc(K.name)}</b>${e.fizzle ? `: ${esc(e.fizzle.toLowerCase())}` : e.bonus ? `: +${e.bonus} damage` : ''}.`, lcls(e.id));
        if (e.surge === 'arc') DV.standing(S, 'foe').filter(x => x.id !== e.target).forEach(o => VIEW.bolt(e.target, o.id, 0xa9bcff, .18));
        await wait(240);
        break;
      }
      case 'heal':
        ui.hp[e.id] = e.hp; sfx('heal');
        if (u.side === 'hero') cardFx(e.id, 'healed', 700); else VIEW.sparkle(e.id);
        floatOn(e.id, `+${e.amount}`, 'heal'); drawUnit(e.id);
        if (e.raised) floatOn(e.id, 'Back up!', 'note');
        RO.text(`${esc(short(u.name))} ${e.raised ? 'gets back up with' : 'heals'} ${e.raised ? e.hp : e.amount}`, 'good');
        log(`${nm(e.id)} ${e.raised ? 'gets back up with' : 'heals'} <b>${e.raised ? e.hp : e.amount}</b>. ${e.hp} HP.`, lcls(e.id));
        await wait(260);
        break;
      case 'down':
        if (u.side === 'foe') { RO.text(`${esc(short(u.name))} is slain!`, 'gold'); log(`${nm(e.id)} is slain.`, 'foe'); await VIEW.kill(e.id); }
        else { sfx('down'); RO.text(`${esc(short(u.name))} falls!`, 'bad'); log(`${nm(e.id)} falls.`); await wait(300); }
        drawUnit(e.id); drawOrder();
        break;
      case 'over':
        log(e.winner === 'hero' ? 'The goblins are beaten.' : 'The party has fallen.', 'rd');
        break;
    }
  }

  // ---------------- a fight's life ----------------
  async function newFight() {
    ui.gen++; ui.phase = 'fight'; ui.sel = null; ui.busy = true; ui.log = []; ui.hp = {}; ui.active = null; ui.hero = null;
    closeModal();
    S = DV.newBattle();
    VIEW.clearDice(); VIEW.setUnits(S); VIEW.mark({});
    buildParty(); buildTags(); drawAll(); placeTags();
    $('#floats').innerHTML = '';
    RO.open('Goblins ahead', '3 fighters, 1 shaman');
    RO.text('Each round, you choose which hero acts next.', 'dim');
    renderHotbar();
    const g = ui.gen;
    await play(DV.start(S));
    if (g === ui.gen) proceed();
  }
  function finish() {
    ui.phase = 'over'; ui.busy = false; ui.hero = null; setActive(null); renderHotbar(); drawAll();
    const won = S.over === 'hero';
    sfx(won ? 'win' : 'lose');
    banner(won ? 'Victory' : 'Defeat', won ? `in ${S.round} rounds` : 'the goblins hold the corridor');
    RO.open(won ? 'Victory' : 'Defeat', `${S.round} rounds`);
    RO.text(won ? 'The corridor is clear.' : 'The party has fallen.', won ? 'good' : 'bad');
    setTimeout(() => { if (ui.phase === 'over') showResult(); }, 1300);
  }

  // ---------------- modals ----------------
  let lastFocus = null, keyboard = false;
  document.addEventListener('keydown', () => { keyboard = true; }, true);
  document.addEventListener('pointerdown', () => { keyboard = false; }, true);
  function openModal(html, cls = '') {
    const m = $('#modal'); lastFocus = document.activeElement;
    m.innerHTML = `<div class="card ${cls}" role="dialog" aria-modal="true"><button class="x" type="button" aria-label="Close">×</button>${html}</div>`;
    m.hidden = false; $('.x', m).onclick = closeModal;
    m.onclick = e => { if (e.target === m) closeModal(); };
    if (keyboard) setTimeout(() => { const f = $('.x', m); if (f) f.focus({ preventScroll: true }); }, 30);
    return $('.card', m);
  }
  function closeModal() { const m = $('#modal'); if (m.hidden) return; m.hidden = true; m.innerHTML = ''; if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }

  // ---------------- the character sheet ----------------
  let sheetTuning = false;
  function openSheet(id, keepTuning) {
    if (!S) return;
    if (!keepTuning) sheetTuning = false;
    const u = U(id), T = DV.UNITS[u.type], K = DV.SURGES[u.surge], c = DV.counts(u.faces), odds = DV.tierOdds(u);
    const avg = DV.perDie(u, S) * DV.TUNE.dice;
    const sts = Object.values(ST).filter(st => st.on(u)).map(st => `<span class="tagc"><span class="emo">${st.icon}</span> ${st.name}${st.n ? ' ' + st.n(u) : ''}</span>`);
    const cds = u.actions.filter(a => u.cd[a] > 0).map(a => `<span class="tagc dim">${esc(DV.ACTIONS[a].name)} ready in ${u.cd[a]}</span>`);
    const kin = Object.values(S.units).filter(x => x.type === u.type).length;
    const when = S.over || u.down ? '' : S.turn && S.turn.id === id ? `Acting: ${S.turn.left} ${S.turn.left === 1 ? 'action' : 'actions'} left` : S.acted.includes(id) ? 'Has acted this round' : u.side === 'hero' ? 'Still to act this round' : `Acts ${['1st', '2nd', '3rd', '4th'][S.order.foe.indexOf(id)] || ''} among the goblins`;
    const actRow = a => {
      const A = DV.ACTIONS[a];
      const tiers = A.kind === 'power' ? `<div class="tiers">${DV.FACE_KINDS.map(k => `<p class="tier t-${k}"><span class="syms">${SYM[k]}</span><span class="odd">${Math.round(odds[k] * 100)}%</span><span>${esc(A.tiers[k])}</span></p>`).join('')}</div>` : '';
      return `<div class="act${A.kind === 'power' ? ' facedo' : ''}"><span class="ai">${actIcon(u, a)}</span><div><b>${esc(A.name)}</b> <span class="pp">${pips(A.cost)}</span><span class="meta">${esc(describeAction(u, A))}</span><p>${esc(A.text)}</p>${tiers}</div></div>`;
    };
    const html = `
      <div class="sh-head"><div class="sh-pic"></div><div><h2>${esc(u.name)}</h2>
        <p class="sub">${esc(u.cls)} · ${u.rank === 'front' ? 'Front' : 'Back'} rank · ${u.reach === 'melee' ? 'Melee' : 'Ranged'} · ${esc(u.weapon)}</p>
        <p class="blurb">${esc(T.blurb || '')}</p></div></div>
      <div class="stats">
        <div class="stat hp"><small>HP</small><b>${Math.max(0, u.hp)}<span style="font-size:14px;color:var(--parch-dim)">/${u.max}</span></b><span class="bar"><u></u><i></i></span><span class="step"><button type="button" data-f="hp" data-d="-1" aria-label="Less max HP">−</button><button type="button" data-f="hp" data-d="1" aria-label="More max HP">+</button></span></div>
        <div class="stat"><small>Damage</small><b>${u.dmg}</b><span class="note">per hit</span><span class="step"><button type="button" data-f="dmg" data-d="-1" aria-label="Less damage">−</button><button type="button" data-f="dmg" data-d="1" aria-label="More damage">+</button></span></div>
        <div class="stat"><small>Attack</small><b>${avg === Infinity ? '∞' : avg.toFixed(1)}</b><span class="note">average for ${DV.TUNE.dice} dice</span></div>
      </div>
      <section><h3>Die · d6</h3>
        <div class="faces">${u.faces.map((f, i) => `<button type="button" class="face num f-${f}" data-i="${i}" title="${DV.FACE_NAME[f]} ${faceLabel(u, f)}" aria-label="Face ${i + 1}: ${DV.FACE_NAME[f]}, ${faceLabel(u, f)} damage">${f === 'crit' ? SYM.burst : SYM[f]}<b>${faceLabel(u, f)}</b></button>`).join('')}</div>
        <div class="mix">${DV.FACE_KINDS.map(k => `<span class="mx mx-${k}" style="flex:${c[k]}" title="${DV.FACE_NAME[k]} ×${c[k]}">${c[k] ? `<span class="face f-${k}">${SYM[k]}</span><b>${c[k]}</b>` : ''}</span>`).join('')}</div>
        <p class="legend tune-only" ${sheetTuning ? '' : 'hidden'}>Tap a face to change it: graze → hit → surge → critical.</p>
      </section>
      <section><h3>On an attack · each die adds</h3>
        <div class="act facedo"><span class="ai syms">${SYM.graze}</span><div><b>Graze</b><p>${DV.TUNE.graze} damage. A glancing blow: nothing misses outright.</p></div></div>
        <div class="act facedo"><span class="ai syms">${SYM.hit}</span><div><b>Hit</b><p>${u.dmg} damage.</p></div></div>
        <div class="act facedo"><span class="ai syms">${SYM.surge}</span><div><b>Surge · ${esc(K.name)}</b><p>${u.dmg} damage. ${esc(K.text)}</p></div></div>
        <div class="act facedo"><span class="ai syms">${SYM.crit}</span><div><b>Critical</b><p>${u.dmg} damage${DV.TUNE.explode ? ', and roll one more die. That die can explode too.' : '.'}</p></div></div>
        <p class="legend">On a power, only the best die counts: graze is the weakest result, critical the strongest.</p>
      </section>
      <section><h3>Actions · ${DV.TUNE.actions} a turn</h3><div class="acts">${u.actions.map(actRow).join('')}</div></section>
      ${sts.length || cds.length || u.down || when ? `<section><h3>Right now</h3><div class="tags">${u.down ? `<span class="tagc">${u.side === 'hero' ? 'Down' : 'Slain'}</span>` : ''}${when ? `<span class="tagc">${when}</span>` : ''}${sts.join('')}${cds.join('')}</div></section>` : ''}
      <section><h3>This fight</h3><div class="tags"><span class="tagc">Dealt ${u.stats.dealt}</span><span class="tagc">Taken ${u.stats.taken}</span>${u.stats.healed ? `<span class="tagc">Healed ${u.stats.healed}</span>` : ''}<span class="tagc">Dice ${u.stats.dice}</span><span class="tagc">Grazes ${u.stats.grazes}</span><span class="tagc">Crits ${u.stats.crits}</span>${u.stats.kills ? `<span class="tagc">Kills ${u.stats.kills}</span>` : ''}</div></section>
      <section><h3>Tune</h3>
        <p class="legend">${sheetTuning ? `Changes apply to ${kin > 1 ? `all ${kin} ${esc(u.cls.toLowerCase())}s` : esc(short(u.name))} now and in later fights, and are kept on this device.` : 'Try other numbers: change HP, damage and the mix of faces on the die.'}</p>
        <div class="row"><button class="btn small" type="button" id="tuneBtn" aria-pressed="${sheetTuning}">${sheetTuning ? 'Done tuning' : 'Tune'}</button>${TUNING.units[u.type] ? `<button class="btn small" type="button" id="tuneReset">Back to defaults</button>` : ''}</div>
      </section>`;
    const card = openModal(html, sheetTuning ? 'tuning' : '');
    $('.sh-pic', card).appendChild(ART.portraitCanvas(u.type, variantOf(u)));
    setBar($('.stat.hp .bar', card), u.hp, u.max);
    $('#tuneBtn', card).onclick = () => { sheetTuning = !sheetTuning; openSheet(id, true); };
    const rs = $('#tuneReset', card); if (rs) rs.onclick = () => { delete TUNING.units[u.type]; saveTuning(); retune(u.type, DV.DEFAULTS[u.type]); openSheet(id, true); };
    $$('.step button', card).forEach(b => b.onclick = () => {
      const f = b.dataset.f, d = +b.dataset.d, T2 = DV.UNITS[u.type];
      const v = Math.max(f === 'hp' ? 1 : 0, Math.min(60, T2[f] + d));
      if (v === T2[f]) return;
      setTune(u.type, f, v); openSheet(id, true);
    });
    $$('.faces button', card).forEach(b => b.onclick = () => {
      if (!sheetTuning) return;
      const i = +b.dataset.i, kinds = DV.FACE_KINDS, f = DV.UNITS[u.type].faces.slice();
      f[i] = kinds[(kinds.indexOf(f[i]) + 1) % kinds.length];
      setTune(u.type, 'faces', f); openSheet(id, true);
    });
  }
  function setTune(type, f, v) {
    const t = TUNING.units[type] || (TUNING.units[type] = {});
    t[f] = Array.isArray(v) ? v.slice() : v; saveTuning();
    const D = {}; D[f] = v; retune(type, D);
  }
  // push a type's new numbers into its template and into everyone of that type in this fight
  function retune(type, D) {
    const T = DV.UNITS[type];
    ['hp', 'dmg', 'faces'].forEach(f => { if (D[f] == null) return; T[f] = Array.isArray(D[f]) ? D[f].slice() : D[f]; });
    Object.values(S.units).filter(u => u.type === type).forEach(u => {
      if (D.hp != null && D.hp !== u.max) { const dh = D.hp - u.max; u.max = D.hp; if (!u.down) u.hp = Math.max(1, Math.min(u.max, u.hp + dh)); ui.hp[u.id] = u.hp; }
      if (D.dmg != null) u.dmg = D.dmg;
      if (D.faces) u.faces = D.faces.slice();
    });
    drawAll(); if (partyPick()) showSelection();
  }

  // ---------------- the menu ----------------
  function openMenu() {
    const sw = (id, on) => `<button class="sw" type="button" role="switch" id="${id}" aria-checked="${on}"></button>`;
    const changed = Object.keys(TUNING.units).length + Object.keys(TUNING.tune || {}).filter(k => TUNING.tune[k] !== DV.TUNE0[k]).length;
    const card = openModal(`
      <h2>Goblin Delve</h2>
      <p>A test bench for dice combat: two actions a turn, a d6 per character with its own mix of four shared symbols and its damage on each face, powers that roll too, the party acting in the order you choose, three goblins and their shaman.</p>
      <div class="row"><button class="btn gold" type="button" id="mNew">New fight</button><button class="btn" type="button" id="mSim">Simulate 1,000 fights</button><button class="btn" type="button" id="mLog">Combat log</button></div>
      <section><h3>Play</h3>
        <div class="set"><div><b>Auto-play the party</b><small>The heroes choose for themselves, so you can watch the rules run.</small></div>${sw('mAuto', SET.auto)}</div>
        <div class="set"><div><b>Speed</b><small>How fast dice and blows play out.</small></div><span class="seg"><button type="button" data-sp="normal" aria-pressed="${SET.speed === 'normal'}">Normal</button><button type="button" data-sp="fast" aria-pressed="${SET.speed === 'fast'}">Fast</button></span></div>
        <div class="set"><div><b>Sound</b><small>Dice, blows and spells.</small></div>${sw('mSound', !SET.mute)}</div>
      </section>
      <section><h3>House rules</h3>
        <div class="set"><div><b>Turn order</b><small>Alternate: a hero, then a goblin, then a hero. Party first: all four heroes, then every goblin.</small></div><span class="seg"><button type="button" data-turns="alternate" aria-pressed="${DV.TUNE.turns === 'alternate'}">Alternate</button><button type="button" data-turns="party" aria-pressed="${DV.TUNE.turns === 'party'}">Party first</button></span></div>
        <div class="set"><div><b>Criticals explode</b><small>A critical rolls one more die, which can explode again.</small></div>${sw('mExplode', DV.TUNE.explode)}</div>
        <div class="set"><div><b>Tuned numbers</b><small>${changed ? `${changed} change${changed > 1 ? 's' : ''} from the defaults, kept on this device.` : 'Open any sheet and tap Tune to change stats and die faces.'}</small></div>${changed ? `<button class="btn small" type="button" id="mReset">Reset all</button>` : ''}</div>
      </section>
      <details><summary>How a fight works</summary><ul>
        <li>Each round, you choose which hero acts next (tap a ready portrait) until all four have acted. ${DV.TUNE.turns === 'alternate' ? 'A goblin acts after each hero' : 'Then the goblins act'}, in a fixed order: Snikk, Grub, Muckle, then Old Gnarl. The party starts every round.</li>
        <li>A turn is ${DV.TUNE.actions} actions: typically an attack and a power. Big spells take both. End the turn early with End.</li>
        <li>Every roll is a d6 with four symbols, mixed differently for each class, and each face shows the damage it deals on an attack: ${SYM.graze} graze (a partial success), ${SYM.hit} hit, ${SYM.surge} surge (a hit plus something extra) and ${SYM.crit} critical. Nothing misses.</li>
        <li>An attack rolls ${DV.TUNE.dice} dice and adds them up: a graze deals ${DV.TUNE.graze}, the rest deal the character’s damage, a surge adds the class’s extra${DV.TUNE.explode ? ', and a critical rolls another die, which can explode again' : ''}. A second attack in the same turn rolls ${DV.TUNE.laterDice} die.</li>
        <li>A power rolls ${DV.TUNE.dice} dice and the best one counts: each power says what a graze, hit, surge and critical do.</li>
        <li>Melee reaches only the front rank while anyone stands in it. Ranged attacks and spells reach anyone. Goblins cannot attack a hidden hero.</li>
        <li>A power can be used once a turn; one that recharges waits that many rounds.</li>
        <li>Over each goblin in reach of an attack: the average damage and the chance to finish it.</li>
        <li>A hero at 0 HP is down until healed. The fight ends when one side has no one standing.</li>
      </ul></details>`);
    $('#mNew', card).onclick = newFight;
    $('#mSim', card).onclick = openSim;
    $('#mLog', card).onclick = openLog;
    const toggle = (id, fn) => { const b = $('#' + id, card); b.onclick = () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); fn(v); }; };
    toggle('mAuto', v => { SET.auto = v; saveSet(); ui.sel = null; VIEW.mark({}); if (v && ui.phase === 'fight' && !ui.busy) proceed(); else { drawAll(); renderHotbar(); } });
    toggle('mSound', v => { SET.mute = !v; VIEW.muted = SET.mute; saveSet(); if (v) VIEW.audio(); });
    toggle('mExplode', v => { DV.TUNE.explode = v; TUNING.tune = { ...(TUNING.tune || {}), explode: v }; saveTuning(); });
    $$('[data-turns]', card).forEach(b => b.onclick = () => { DV.TUNE.turns = b.dataset.turns; TUNING.tune = { ...(TUNING.tune || {}), turns: DV.TUNE.turns }; saveTuning(); openMenu(); });
    $$('[data-sp]', card).forEach(b => b.onclick = () => { SET.speed = b.dataset.sp; saveSet(); applySpeed(); $$('[data-sp]', card).forEach(x => x.setAttribute('aria-pressed', x === b)); });
    const rs = $('#mReset', card); if (rs) rs.onclick = () => { TUNING = { units: {}, tune: {} }; saveTuning(); DV.applyTuning(null); Object.keys(DV.UNITS).forEach(t => retune(t, DV.UNITS[t])); openMenu(); };
  }
  function applySpeed() { VIEW.speed = SET.speed === 'fast' ? 2.2 : 1; document.documentElement.style.setProperty('--speed', VIEW.speed); }

  // ---------------- the simulator ----------------
  function openSim() {
    const card = openModal(`<h2>Simulate</h2><p>Running 1,000 fights with the rules and numbers as they stand…</p>`);
    setTimeout(() => {
      const t0 = performance.now(), r = DV.simulate(1000, (Math.random() * 1e9) | 0), ms = Math.round(performance.now() - t0);
      const pct = x => Math.round(x * 100) + '%', f1 = x => x.toFixed(1);
      const rows = Object.values(r.units).map(q => `<tr class="${q.side}"><td>${esc(q.name)}</td><td>${f1(q.avgDealt)}</td><td>${f1(q.avgTaken)}</td><td>${q.avgHealed ? f1(q.avgHealed) : '–'}</td><td>${pct(q.downRate)}</td><td>${(q.crits / r.n).toFixed(2)}</td></tr>`).join('');
      card.innerHTML = `<button class="x" type="button" aria-label="Close">×</button><h2>1,000 fights</h2>
        <p>The party plays with a simple bot (it ignores the odds), so a person usually does better.</p>
        <div class="kpis"><div class="stat"><small>Party wins</small><b>${pct(r.winRate)}</b></div><div class="stat"><small>Rounds</small><b>${f1(r.avgRounds)}</b><span class="note">on average</span></div><div class="stat"><small>No one fell</small><b>${pct(r.flawlessRate)}</b><span class="note">of fights</span></div></div>
        <div class="kpis"><div class="stat"><small>Heroes up</small><b>${r.avgHeroesUp.toFixed(1)}</b><span class="note">at the end</span></div><div class="stat"><small>Party HP</small><b>${f1(r.avgHeroHp)}</b><span class="note">left of ${DV.PARTY.reduce((s, k) => s + DV.UNITS[k].hp, 0)}</span></div><div class="stat"><small>Longest chain</small><b>${r.maxChain}</b><span class="note">exploding dice</span></div></div>
        <div class="tablewrap"><table class="t"><thead><tr><th>Per fight</th><th>Dealt</th><th>Taken</th><th>Healed</th><th>Fell</th><th>Crits</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="legend">${ms} ms · House rules: ${DV.TUNE.turns === 'alternate' ? 'heroes and goblins alternate' : 'the party goes first'}, criticals ${DV.TUNE.explode ? 'explode' : 'do not explode'}.</p>
        <div class="row"><button class="btn gold" type="button" id="sAgain">Run again</button><button class="btn" type="button" id="sBack">Back to the fight</button></div>`;
      $('.x', card).onclick = closeModal; $('#sBack', card).onclick = closeModal; $('#sAgain', card).onclick = openSim;
    }, 60);
  }
  function openLog() {
    const card = openModal(`<h2>Combat log</h2><div class="log">${ui.log.length ? ui.log.map(l => l.cls === 'rd' ? `<div class="rd">${l.html}</div>` : `<div class="ln ${l.cls}">${l.html}</div>`).join('') : '<p>Nothing has happened yet.</p>'}</div>`);
    setTimeout(() => { card.scrollTop = card.scrollHeight; }, 20);
  }
  function showResult() {
    const won = S.over === 'hero';
    const rows = Object.values(S.units).map(u => `<tr class="${u.side}"><td>${esc(u.name)}</td><td>${u.stats.dealt}</td><td>${u.stats.taken}</td><td>${u.stats.healed || '–'}</td><td>${u.stats.crits}</td><td>${u.down ? (u.side === 'hero' ? 'Down' : 'Slain') : `${u.hp}/${u.max}`}</td></tr>`).join('');
    const card = openModal(`<h2>${won ? 'Victory' : 'Defeat'}</h2>
      <p>${won ? `The goblins are beaten in ${S.round} rounds.` : `The party falls in round ${S.round}.`}</p>
      <div class="tablewrap"><table class="t"><thead><tr><th>This fight</th><th>Dealt</th><th>Taken</th><th>Healed</th><th>Crits</th><th>End</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="row"><button class="btn gold" type="button" id="rAgain">Fight again</button><button class="btn" type="button" id="rSim">Simulate 1,000</button><button class="btn" type="button" id="rLog">Log</button></div>`);
    $('#rAgain', card).onclick = newFight; $('#rSim', card).onclick = openSim; $('#rLog', card).onclick = openLog;
  }

  // ---------------- keys ----------------
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!$('#modal').hidden) return closeModal(); if (ui.sel) { ui.sel = null; showSelection(); } return; }
    if (!$('#modal').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = +e.key;
    if (n >= 1 && n <= 9 && partyPick()) { const u = actor(); if (u && u.actions[n - 1]) choose(u.actions[n - 1], $$('#hotbar .abtn')[n - 1]); }
    // H steps through the heroes still to act
    if (e.key === 'h' && partyPick()) { const ids = DV.ready(S).ids; pickHero(ids[(ids.indexOf(ui.hero) + 1) % ids.length]); }
    if ((e.key === 'e' || e.key === 'E') && partyPick()) endTurn();
  });

  // ---------------- start ----------------
  function boot() {
    try {
      VIEW.init($('#view'));
    } catch (err) {
      $('#view').innerHTML = `<p class="err">The dungeon needs WebGL, and this browser could not start it (${esc(err.message)}).</p>`;
      return;
    }
    VIEW.muted = SET.mute; applySpeed();
    VIEW.onFrame = placeTags;
    $('#menuBtn').onclick = () => { VIEW.audio(); openMenu(); };
    $('#readout').onclick = openLog;
    newFight();
    // for tools/test.js
    window.DELVE = { get S() { return S; }, ui, newFight, choose, tapFoe, tapHero, pickHero, endTurn, SET };
  }
  boot();
})();
