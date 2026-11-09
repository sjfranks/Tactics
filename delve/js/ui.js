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
  const ui = { phase: 'intro', sel: null, busy: false, gen: 0, log: [], hp: {}, active: null, floaters: {} };
  const ST_ICON = { brace: '🛡️', taunt: '📯', blessed: '🙏', bleed: '🩸' };
  const ST_NAME = { brace: 'Braced', taunt: 'Taunting', blessed: 'Blessed', bleed: 'Bleeding' };
  const TINT = { fighter: 0xff9a8a, mage: 0x9ab4ff, cleric: 0xfff2d0, rogue: 0xc8b0f0, goblin: 0xb8e090, shaman: 0xd0a0e0 };
  const short = n => n.replace(/^Sister /, '').replace(/^Old /, '');
  const U = id => S.units[id];
  const actIcon = (u, a) => a === 'attack' ? u.hitIcon : DV.ACTIONS[a].icon;
  const faceIcon = (u, f) => f === 'hit' ? `<span class="emo">${u.hitIcon}</span>` : f === 'knack' ? `<span class="emo">${DV.KNACKS[u.knack].icon}</span>` : f === 'crit' ? ART.CRIT_SVG : '';
  const faceChip = (u, f, cls = '') => `<span class="face f-${f} ${cls}" title="${DV.FACE_NAME[f]}">${faceIcon(u, f)}</span>`;
  const wait = ms => VIEW.wait(ms);
  const sfx = (k, v) => VIEW.sfx(k, v);

  // ---------------- readout: the box above the hotbar ----------------
  const RO = {
    open(title, sub) { $('#roTitle').innerHTML = title; $('#roSub').textContent = sub || ''; $('#roChips').innerHTML = ''; $('#roText').innerHTML = ''; },
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
      b.insertAdjacentHTML('beforeend', `<span class="pc-init"></span><span class="pc-rank">${u.rank}</span><span class="pc-st"></span>
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
    const sts = Object.keys(ST_ICON).filter(k => k === 'bleed' ? u.bleed > 0 && !u.down : u[k] && !u.down).map(k => `<span title="${ST_NAME[k]}">${ST_ICON[k]}</span>`).join('');
    if (u.side === 'hero') {
      const c = $(`.pc[data-id="${id}"]`); if (!c) return;
      setBar($('.bar', c), hp, u.max); $('.pc-hp', c).textContent = `${Math.max(0, hp)}/${u.max}`;
      $('.pc-st', c).innerHTML = sts; c.classList.toggle('down', hp <= 0 && u.down);
      $('.pc-init', c).textContent = u.initTotal ? u.initTotal : '';
      c.setAttribute('aria-label', `${u.name}, ${u.cls}, ${Math.max(0, hp)} of ${u.max} HP${u.down ? ', down' : ''}`);
    } else {
      const t = $(`.tag[data-id="${id}"]`); if (!t) return;
      setBar($('.bar', t), hp, u.max); $('.st', t).innerHTML = sts;
      $('.ini', t).textContent = u.initTotal ? u.initTotal : '';
      t.classList.toggle('dead', u.down && !VIEW.alive(id));
      t.setAttribute('aria-label', `${u.name}, ${u.cls}, ${Math.max(0, hp)} of ${u.max} HP`);
    }
  }
  function drawAll() { Object.keys(S.units).forEach(drawUnit); drawOrder(); $('#roundN').textContent = S.round || '–'; }
  function drawOrder(fresh) {
    const ol = $('#order');
    if (!S.order.length) { ol.innerHTML = ''; return; }
    if (fresh || ol.children.length !== S.order.length) {
      ol.innerHTML = '';
      S.order.forEach((id, i) => {
        const u = U(id), li = el('li'), b = el('button', 'oc ' + u.side + (fresh ? ' new' : ''));
        b.type = 'button'; b.dataset.id = id; b.style.animationDelay = (i * 60) + 'ms';
        const m = el('span', 'mini'); m.appendChild(ART.portraitCanvas(u.type, variantOf(u))); b.appendChild(m);
        b.insertAdjacentHTML('beforeend', `<b>${u.initTotal}</b>`);
        b.setAttribute('aria-label', `${u.name}, initiative ${u.initTotal}`);
        b.addEventListener('click', () => openSheet(id));
        li.appendChild(b); ol.appendChild(li);
      });
    }
    const cur = S.turn;
    $$('.oc', ol).forEach((b, i) => {
      const u = U(b.dataset.id);
      b.classList.toggle('cur', i === cur && !S.over); b.classList.toggle('done', i < cur && !u.down); b.classList.toggle('out', u.down);
    });
    const c = $('.oc.cur', ol); if (c) c.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
  function diceLabel(A) {
    if (A.auto) return 'sure';
    if (!A.dice) return '';
    if (A.target === 'all') return '🎲 each';
    return `🎲${A.dice}${A.keep === 'best' ? '↑' : ''}`;
  }
  function renderHotbar() {
    const bar = $('#hotbar'); bar.innerHTML = '';
    if (ui.phase === 'intro') {
      const b = el('button', 'bigbtn', `<span class="ai">🎲</span><b>Roll initiative</b><small>Everyone rolls a d${DV.TUNE.initDie} plus their bonus, once</small>`);
      b.type = 'button'; b.id = 'rollInit'; b.onclick = startFight; bar.appendChild(b); return;
    }
    if (ui.phase === 'over') {
      const b = el('button', 'bigbtn', `<span class="ai">⚔️</span><b>Fight again</b><small>Same rules, new rolls</small>`);
      b.type = 'button'; b.onclick = newFight; bar.appendChild(b); return;
    }
    const u = S && DV.current(S);
    if (!u || u.side === 'foe' || SET.auto || ui.busy) {
      if (!u) { bar.innerHTML = `<div class="waiting hero"><span>Rolling initiative<span class="dots"></span></span></div>`; return; }
      const w = el('div', 'waiting' + (u.side === 'hero' ? ' hero' : ''));
      const m = el('span', 'mini'); m.appendChild(ART.portraitCanvas(u.type, variantOf(u))); w.appendChild(m);
      w.insertAdjacentHTML('beforeend', `<span><b>${esc(u.name)}</b> ${u.side === 'foe' ? 'acts' : SET.auto ? 'acts on its own' : 'acts'}<span class="dots"></span></span>`);
      bar.appendChild(w); return;
    }
    u.actions.forEach((a, i) => {
      const A = DV.ACTIONS[a], can = DV.canUse(S, u.id, a), b = el('button', 'abtn' + (can.ok ? '' : ' off') + (ui.sel === a ? ' sel' : ''));
      b.type = 'button'; b.dataset.act = a;
      b.innerHTML = `<span class="ai">${actIcon(u, a)}</span><span class="nm">${esc(A.name)}</span><span class="cost">${diceLabel(A)}</span><span class="hk">${i + 1}</span>${can.wait ? `<span class="cd">${can.wait}</span>` : ''}`;
      b.setAttribute('aria-label', `${A.name}${can.ok ? '' : ', ' + can.why}`);
      b.setAttribute('aria-pressed', ui.sel === a ? 'true' : 'false');
      b.onclick = () => choose(a, b);
      bar.appendChild(b);
    });
  }

  // ---------------- choosing and targeting ----------------
  function idleReadout(u) {
    RO.open(`${esc(u.name)}'s turn`, u.cls);
    RO.text(`Pick an action below, then a target.`, 'gold'); RO.text('Tap a goblin or portrait for its sheet.', 'dim');
  }
  function describeAction(u, A) {
    const parts = [];
    if (A.auto) parts.push('no roll');
    else if (A.dice) parts.push(A.target === 'all' ? '1 die per foe' : `${A.dice} ${A.dice > 1 ? 'dice' : 'die'}${A.keep === 'best' ? ', keep best' : ''}`);
    const reach = A.target === 'foe' ? (A.reach === 'unit' ? u.reach : A.reach) : null;
    if (reach) parts.push(reach);
    if (A.cd) parts.push(`then wait ${A.cd} turns`);
    return parts.join(' · ');
  }
  function choose(a, btn) {
    if (ui.busy || ui.phase !== 'fight') return;
    VIEW.audio();
    const u = DV.current(S), A = DV.ACTIONS[a], can = DV.canUse(S, u.id, a);
    if (!can.ok) { sfx('nope'); if (btn) { btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope'); } RO.note(`${esc(A.name)}: ${esc(can.why)}.`); return; }
    if (ui.sel === a) {
      if (A.target === 'none' || A.target === 'all') return commit(a, null);
      ui.sel = null; showSelection(); return;
    }
    ui.sel = a; sfx('select'); showSelection();
  }
  function showSelection() {
    const u = DV.current(S);
    renderHotbar();
    const marks = {}, A = ui.sel && DV.ACTIONS[ui.sel];
    $$('.pc').forEach(c => c.classList.remove('tgt'));
    $$('.tag .odds').forEach(o => o.textContent = '');
    if (!A) { VIEW.mark({}); idleReadout(u); return; }
    const tg = DV.targets(S, u.id, ui.sel);
    if (A.target === 'foe' || A.target === 'all') tg.forEach(id => marks[id] = A.target === 'all' ? 'hot' : 'valid');
    if (A.target === 'ally') tg.forEach(id => $(`.pc[data-id="${id}"]`).classList.add('tgt'));
    VIEW.mark(marks);
    // odds on each goblin in reach: average damage, chance to land anything, chance to finish it
    if (A.target === 'foe' || A.target === 'all') tg.forEach(id => {
      const o = DV.odds(S, u.id, ui.sel, id); if (!o) return;
      const t = $(`.tag[data-id="${id}"] .odds`);
      if (t) t.textContent = `≈${o.avg.toFixed(1)} · ${Math.round(o.hit * 100)}%${o.kill > .005 ? ` · ☠${Math.round(o.kill * 100)}%` : ''}`;
    });
    RO.open(`<span class="emo">${actIcon(u, ui.sel)}</span> ${esc(A.name)}`, describeAction(u, A));
    const prompt = A.target === 'foe' ? (A.reach === 'melee' || (A.reach === 'unit' && u.reach === 'melee') ? 'Tap a goblin in the front rank.' : 'Tap any goblin.')
      : A.target === 'ally' ? 'Tap a hero’s portrait.' : A.target === 'all' ? `Tap ${esc(A.name)} again, or any goblin, to cast it.` : `Tap ${esc(A.name)} again to use it.`;
    RO.text(prompt, 'gold');
    RO.text(esc(A.id === 'attack' ? `Blank misses, ${u.hitIcon} hits for ${u.dmg}, ${DV.KNACKS[u.knack].icon} ${DV.KNACKS[u.knack].name}, burst = critical.` : A.text));
  }
  function hoverFoe(id) {
    if (ui.phase !== 'fight' || ui.busy || !ui.sel) return;
    const u = DV.current(S), A = DV.ACTIONS[ui.sel];
    if (A.target !== 'foe') return;
    const marks = {}; DV.targets(S, u.id, ui.sel).forEach(t => marks[t] = t === id ? 'hot' : 'valid'); VIEW.mark(marks);
  }
  function tapFoe(id) {
    VIEW.audio();
    if (ui.phase === 'fight' && !ui.busy && ui.sel) {
      const u = DV.current(S), A = DV.ACTIONS[ui.sel];
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
    if (ui.phase === 'fight' && !ui.busy && ui.sel && DV.ACTIONS[ui.sel].target === 'ally') {
      const u = DV.current(S);
      if (DV.targets(S, u.id, ui.sel).includes(id)) return commit(ui.sel, id);
      sfx('nope'); RO.note(`${esc(U(id).name)} is not hurt.`); return;
    }
    openSheet(id);
  }
  async function commit(a, target) {
    ui.sel = null; ui.busy = true; VIEW.mark({});
    $$('.pc').forEach(c => c.classList.remove('tgt')); $$('.tag .odds').forEach(o => o.textContent = '');
    renderHotbar();
    const g = ui.gen;
    await play(DV.act(S, a, target));
    if (g === ui.gen) proceed();
  }
  // whose turn next: goblins (and the party, on Auto) act by themselves
  async function proceed() {
    const g = ui.gen;
    for (let guard = 0; guard < 500; guard++) {
      if (g !== ui.gen) return;
      if (S.over) return finish();
      const u = DV.current(S);
      if (u.side === 'hero' && !SET.auto) break;
      ui.busy = true; renderHotbar();
      await wait(u.side === 'foe' ? 520 : 380);
      // the goblins wait while a sheet or the menu is open
      while (!$('#modal').hidden && g === ui.gen) await new Promise(r => setTimeout(r, 200));
      if (g !== ui.gen || S.over) return;
      const c = DV.mind(S);
      await play(DV.act(S, c.act, c.target));
    }
    if (g !== ui.gen) return;
    ui.busy = false; ui.sel = null;
    renderHotbar(); idleReadout(DV.current(S));
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
      case 'init': {
        RO.open('Initiative', `d${e.die} + bonus`);
        log(`Initiative: everyone rolls a d${e.die} and adds their bonus.`);
        await VIEW.initiative(e.rolls, id => U(id).side === 'foe', id => TINT[U(id).type]);
        // a tag over each die: who rolled it and their total
        const box = $('#dieTags'); box.innerHTML = '';
        e.rolls.forEach((r, i) => {
          if (!r.mesh) return; const p = VIEW.dieAt(r.mesh);
          const t = el('span', 'dtag' + (U(r.id).side === 'foe' ? ' foe' : ''), `${esc(short(U(r.id).name))} <b>${r.total}</b>`);
          t.title = `${r.roll} ${r.bonus >= 0 ? '+' : '−'} ${Math.abs(r.bonus)}`;
          t.style.left = p.x + 'px'; t.style.top = p.y + 'px'; t.style.animationDelay = (i * 40) + 'ms'; box.appendChild(t);
          drawUnit(r.id);
        });
        e.order.forEach((id, i) => { const r = e.rolls.find(x => x.id === id); log(`${i + 1}. ${nm(id)} ${r.roll} ${r.bonus >= 0 ? '+' : '−'} ${Math.abs(r.bonus)} = ${r.total}`, lcls(id)); });
        drawOrder(true);
        RO.text(`${nm(e.order[0])} goes first. Rolls stay put for the whole fight.`);
        await wait(1500);
        box.innerHTML = '';
        break;
      }
      case 'round':
        $('#roundN').textContent = e.n; log(`Round ${e.n}`, 'rd');
        if (e.n > 1) { banner(`Round ${e.n}`); await wait(450); }
        break;
      case 'turn':
        setActive(e.id); drawUnit(e.id);
        if (u.side === 'hero') sfx('turn');
        await wait(120);
        break;
      case 'status':
        drawUnit(e.id);
        if (e.on) { floatOn(e.id, `${ST_ICON[e.key]} ${ST_NAME[e.key]}`, 'note'); log(`${nm(e.id)} is ${ST_NAME[e.key].toLowerCase()}${e.key === 'bleed' ? ` for ${e.n} turns` : ''}.`, lcls(e.id)); }
        if (e.on && e.key === 'brace' && u.side === 'hero') cardFx(e.id, 'glint', 650);
        break;
      case 'tick':
        RO.open(`${esc(u.name)} bleeds`, `${e.left} more ${e.left === 1 ? 'turn' : 'turns'}`);
        break;
      case 'act': {
        const A = DV.ACTIONS[e.act];
        RO.open(`<span class="emo">${actIcon(u, e.act)}</span> ${esc(short(u.name))} · ${esc(A.name)}${e.target ? ` → ${esc(short(U(e.target).name))}` : ''}`, '');
        log(`${nm(e.id)} uses <b>${esc(A.name)}</b>${e.target ? ` on ${nm(e.target)}` : ''}.`, lcls(e.id));
        if (u.side === 'hero') cardFx(e.id, 'acting', 420);
        if (e.act === 'missile') { sfx('zap'); await VIEW.bolt(null, e.target, 0xb0a0ff, .36); }
        else if (e.act === 'taunt') { sfx('horn'); RO.text(`${esc(short(u.name))} bellows a challenge. Goblin fighters must come at ${u.type === 'fighter' ? 'him' : 'them'}.`); await wait(450); }
        else if (e.act === 'prayer') { sfx('heal'); DV.standing(S, 'hero').forEach(h => cardFx(h.id, 'healed', 800)); await wait(400); }
        else if (e.act === 'brace') { sfx('select'); await wait(250); }
        else if (e.act === 'chant') { await VIEW.cast(e.id, 0x7dff9a); }
        else if (u.side === 'foe') { if (u.reach === 'ranged') VIEW.cast(e.id, 0xc070ff); else VIEW.hop(e.id); await wait(160); }
        break;
      }
      case 'roll': {
        const A = DV.ACTIONS[e.act], multi = e.groups.length > 1;
        if (e.blessed) RO.text('🙏 Blessed: one more die.', 'gold');
        const grp = {};
        e.groups.forEach(g => { grp[g.target] = RO.group(multi ? short(U(g.target).name) : ''); });
        await VIEW.roll({
          style: u.type, faces: u.faces, icons: { hit: u.hitIcon, knack: DV.KNACKS[u.knack].icon },
          from: u.side === 'foe' ? u.id : null, groups: e.groups, explode: DV.TUNE.explode,
          onLand: (d, g) => grp[g.target].insertAdjacentHTML('beforeend', faceChip(u, d.face, (d.extra ? 'extra ' : '') + (d.dropped ? 'dropped' : ''))),
        });
        e.groups.forEach(g => log(`${multi ? nm(g.target) + ': ' : ''}${g.dice.map(d => faceChip(u, d.face, (d.extra ? 'extra ' : '') + (d.dropped ? 'dropped' : ''))).join(' ')}`, lcls(e.id)));
        await wait(260);
        // the blow lands as the dice fell
        const hit = e.groups.filter(g => g.hits > 0 || g.dice.some(d => d.face === 'knack' && !d.dropped)).map(g => g.target);
        if (u.side === 'foe') { if (hit.length) { if (u.reach === 'ranged') await VIEW.bolt(u.id, null, 0xc070ff, .3); else await VIEW.lunge(u.id); } }
        else if (hit.length) {
          if (e.act === 'fireball') await VIEW.fireball(hit);
          else if (A.reach === 'ranged' || (A.reach === 'unit' && u.reach === 'ranged')) await Promise.all(hit.map(t => VIEW.bolt(null, t, u.type === 'mage' ? 0xa9bcff : 0xffffff, .26)));
          else hit.forEach(t => VIEW.slash(t, u.type === 'cleric' ? 0xffe6a0 : 0xffffff));
        }
        break;
      }
      case 'miss':
        floatOn(e.id, 'Miss', 'miss'); sfx('miss');
        RO.text(`${esc(short(U(e.src).name))} misses ${esc(short(U(e.id).name))}.`, 'dim');
        log(`Miss.`, lcls(e.src));
        await wait(200);
        break;
      case 'dmg': {
        ui.hp[e.id] = e.hp;
        const big = e.kind === 'crit';
        if (u.side === 'foe') { if (e.kind !== 'bleed') VIEW.hurt(e.id, { crit: big }); else VIEW.hurt(e.id, { colors: [0xc01818, 0xff4040] }); }
        else { cardFx(e.id, 'hit', 400); VIEW.shake(big ? .12 : .06); sfx('hit'); }
        floatOn(e.id, e.amount ? `−${e.amount}` : 'Blocked', e.amount ? (big ? 'dmg big' : 'dmg') : 'miss');
        drawUnit(e.id);
        const why = e.kind === 'bleed' ? ' (bleeding)' : e.kind === 'arc' ? ' (arc)' : '';
        const bl = e.braced ? ` <span class="dim">(braced, −${e.raw - e.amount})</span>` : '';
        RO.text(`${esc(short(u.name))} takes ${e.amount}${why}${bl}`, u.side === 'hero' ? 'bad' : '');
        log(`${nm(e.id)} takes <b>${e.amount}</b>${why}${e.hits > 1 ? ` from ${e.hits} hits` : ''}${bl}. ${Math.max(0, e.hp)} HP left.`, lcls(e.id));
        await wait(big ? 320 : 220);
        break;
      }
      case 'knack': {
        const K = DV.KNACKS[e.knack];
        floatOn(e.knack === 'bleed' ? e.target : e.id, `${K.icon} ${K.name}!`, 'note'); sfx('zap');
        RO.text(`<span class="emo">${K.icon}</span> ${esc(K.name)}${e.fizzle ? ': ' + esc(e.fizzle.toLowerCase()) : e.bonus ? ` +${e.bonus}` : ''}`, 'gold');
        log(`<span class="emo">${K.icon}</span> <b>${esc(K.name)}</b>${e.fizzle ? `: ${esc(e.fizzle.toLowerCase())}` : e.bonus ? `: +${e.bonus} damage` : ''}.`, lcls(e.id));
        if (e.knack === 'arc') { const others = DV.standing(S, 'foe').map(x => x.id); others.forEach(o => VIEW.bolt(e.target, o, 0xa9bcff, .18)); }
        await wait(260);
        break;
      }
      case 'heal':
        ui.hp[e.id] = e.hp; sfx('heal');
        if (u.side === 'hero') cardFx(e.id, 'healed', 700); else VIEW.sparkle(e.id);
        floatOn(e.id, `+${e.amount}`, 'heal'); drawUnit(e.id);
        if (e.raised) floatOn(e.id, 'Back up!', 'note');
        RO.text(`${esc(short(u.name))} ${e.raised ? 'gets back up with' : 'heals'} ${e.raised ? e.hp : e.amount}`, 'good');
        log(`${nm(e.id)} ${e.raised ? 'gets back up with' : 'heals'} <b>${e.raised ? e.hp : e.amount}</b>. ${e.hp} HP.`, lcls(e.id));
        await wait(300);
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
  function newFight() {
    ui.gen++; ui.phase = 'intro'; ui.sel = null; ui.busy = false; ui.log = []; ui.hp = {}; ui.active = null;
    closeModal();
    S = DV.newBattle();
    VIEW.clearDice(); VIEW.setUnits(S); VIEW.mark({});
    buildParty(); buildTags(); drawAll(); placeTags();
    $('#dieTags').innerHTML = ''; $('#floats').innerHTML = '';
    RO.open('Goblins ahead', '3 fighters, 1 shaman');
    RO.text('Roll initiative to begin. Tap any goblin or portrait to read its sheet.', 'dim');
    renderHotbar();
    if (SET.auto) setTimeout(() => { if (ui.phase === 'intro') startFight(); }, 700);
  }
  async function startFight() {
    if (ui.phase !== 'intro') return;
    VIEW.audio();
    ui.phase = 'fight'; ui.busy = true; renderHotbar();
    const g = ui.gen;
    await play(DV.rollInitiative(S));
    if (g === ui.gen) proceed();
  }
  function finish() {
    ui.phase = 'over'; ui.busy = false; setActive(null); renderHotbar(); drawAll();
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
  const perDie = u => { const c = k => u.faces.filter(f => f === k).length, C = DV.TUNE.explode ? c('crit') : 0; const hits = c('hit') + c('crit') + (DV.TUNE.knackHits ? c('knack') : 0); return C >= 6 ? Infinity : u.dmg * hits / (6 - C); };
  const hitChance = u => u.faces.filter(f => f !== 'blank' && (f !== 'knack' || DV.TUNE.knackHits)).length / u.faces.length;
  let sheetTuning = false;
  function openSheet(id, keepTuning) {
    if (!S) return;
    if (!keepTuning) sheetTuning = false;
    const u = U(id), T = DV.UNITS[u.type], K = DV.KNACKS[u.knack];
    const count = k => u.faces.filter(f => f === k).length;
    const sts = Object.keys(ST_ICON).filter(k => k === 'bleed' ? u.bleed > 0 : u[k]).map(k => `<span class="tagc"><span class="emo">${ST_ICON[k]}</span> ${ST_NAME[k]}${k === 'bleed' ? ` (${u.bleed})` : ''}</span>`);
    const cds = u.actions.filter(a => u.cd[a] > 0).map(a => `<span class="tagc dim">${esc(DV.ACTIONS[a].name)} ready in ${u.cd[a]}</span>`);
    const kin = Object.values(S.units).filter(x => x.type === u.type).length;
    const html = `
      <div class="sh-head"><div class="sh-pic"></div><div><h2>${esc(u.name)}</h2>
        <p class="sub">${esc(u.cls)} · ${u.rank === 'front' ? 'Front' : 'Back'} rank · ${u.reach === 'melee' ? 'Melee' : 'Ranged'} · ${esc(u.weapon)}</p>
        <p class="blurb">${esc(T.blurb || '')}</p></div></div>
      <div class="stats">
        <div class="stat hp"><small>HP</small><b>${Math.max(0, u.hp)}<span style="font-size:14px;color:var(--parch-dim)">/${u.max}</span></b><span class="bar"><u></u><i></i></span><span class="step"><button type="button" data-f="hp" data-d="-1" aria-label="Less max HP">−</button><button type="button" data-f="hp" data-d="1" aria-label="More max HP">+</button></span></div>
        <div class="stat"><small>Damage</small><b>${u.dmg}</b><span class="note">per hit</span><span class="step"><button type="button" data-f="dmg" data-d="-1" aria-label="Less damage">−</button><button type="button" data-f="dmg" data-d="1" aria-label="More damage">+</button></span></div>
        <div class="stat"><small>Initiative</small><b>${u.init >= 0 ? '+' : '−'}${Math.abs(u.init)}</b><span class="note">${u.initTotal ? `rolled ${u.initRoll} → ${u.initTotal}` : 'not rolled yet'}</span><span class="step"><button type="button" data-f="init" data-d="-1" aria-label="Lower initiative">−</button><button type="button" data-f="init" data-d="1" aria-label="Higher initiative">+</button></span></div>
      </div>
      <section><h3>Attack die</h3>
        <div class="faces">${u.faces.map((f, i) => `<button type="button" class="face f-${f}" data-i="${i}" title="${DV.FACE_NAME[f]}" aria-label="Face ${i + 1}: ${DV.FACE_NAME[f]}">${faceIcon(u, f)}</button>`).join('')}</div>
        <p class="legend">${count('blank')} blank (miss) · ${count('hit')} <span class="emo">${u.hitIcon}</span> hit for ${u.dmg} · ${count('knack')} <span class="emo">${K.icon}</span> power · ${count('crit')} critical. A die lands something ${Math.round(hitChance(u) * 100)}% of the time and deals about ${perDie(u).toFixed(1)} a roll${DV.TUNE.explode ? ', explosions included' : ''}.</p>
        <p class="legend tune-only" ${sheetTuning ? '' : 'hidden'}>Tap a face to change it: blank → hit → power → critical.</p>
      </section>
      <section><h3>Power face</h3>
        <div class="act knack"><span class="ai">${K.icon}</span><div><b>${esc(K.name)}</b><p>${DV.TUNE.knackHits ? 'A hit, and: ' : ''}${esc(K.text)}</p></div></div>
        <div class="act knack"><span class="ai">${ART.CRIT_SVG}</span><div><b>Critical</b><p>A hit${DV.TUNE.explode ? ', and roll one more die. That die can explode too.' : '.'}</p></div></div>
      </section>
      <section><h3>Actions</h3><div class="acts">${u.actions.map(a => { const A = DV.ACTIONS[a]; return `<div class="act"><span class="ai">${actIcon(u, a)}</span><div><b>${esc(A.name)}</b><span class="meta">${esc(describeAction(u, A))}</span><p>${esc(A.text)}</p></div></div>`; }).join('')}</div></section>
      ${sts.length || cds.length || u.down ? `<section><h3>Right now</h3><div class="tags">${u.down ? `<span class="tagc">${u.side === 'hero' ? 'Down' : 'Slain'}</span>` : ''}${sts.join('')}${cds.join('')}</div></section>` : ''}
      <section><h3>This fight</h3><div class="tags"><span class="tagc">Dealt ${u.stats.dealt}</span><span class="tagc">Taken ${u.stats.taken}</span>${u.stats.healed ? `<span class="tagc">Healed ${u.stats.healed}</span>` : ''}<span class="tagc">Dice ${u.stats.dice}</span><span class="tagc">Crits ${u.stats.crits}</span>${u.stats.kills ? `<span class="tagc">Kills ${u.stats.kills}</span>` : ''}</div></section>
      <section><h3>Tune</h3>
        <p class="legend">${sheetTuning ? `Changes apply to ${kin > 1 ? `all ${kin} ${esc(u.cls.toLowerCase())}s` : esc(short(u.name))} now and in later fights, and are kept on this device.` : 'Try other numbers: change HP, damage, initiative and the die’s faces.'}</p>
        <div class="row"><button class="btn small" type="button" id="tuneBtn" aria-pressed="${sheetTuning}">${sheetTuning ? 'Done tuning' : 'Tune'}</button>${TUNING.units[u.type] ? `<button class="btn small" type="button" id="tuneReset">Back to defaults</button>` : ''}</div>
      </section>`;
    const card = openModal(html, sheetTuning ? 'tuning' : '');
    $('.sh-pic', card).appendChild(ART.portraitCanvas(u.type, variantOf(u)));
    setBar($('.stat.hp .bar', card), u.hp, u.max);
    $('#tuneBtn', card).onclick = () => { sheetTuning = !sheetTuning; openSheet(id, true); };
    const rs = $('#tuneReset', card); if (rs) rs.onclick = () => { delete TUNING.units[u.type]; saveTuning(); retune(u.type, DV.DEFAULTS[u.type]); openSheet(id, true); };
    $$('.step button', card).forEach(b => b.onclick = () => {
      const f = b.dataset.f, d = +b.dataset.d, T2 = DV.UNITS[u.type];
      const v = Math.max(f === 'init' ? -5 : f === 'hp' ? 1 : 0, Math.min(f === 'init' ? 10 : 60, T2[f] + d));
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
    ['hp', 'dmg', 'init', 'faces'].forEach(f => { if (D[f] == null) return; T[f] = Array.isArray(D[f]) ? D[f].slice() : D[f]; });
    Object.values(S.units).filter(u => u.type === type).forEach(u => {
      if (D.hp != null && D.hp !== u.max) { const dh = D.hp - u.max; u.max = D.hp; if (!u.down) u.hp = Math.max(1, Math.min(u.max, u.hp + dh)); ui.hp[u.id] = u.hp; }
      if (D.dmg != null) u.dmg = D.dmg;
      if (D.init != null) { u.init = D.init; if (u.initRoll) u.initTotal = u.initRoll + u.init; }
      if (D.faces) u.faces = D.faces.slice();
    });
    drawAll(); if (ui.phase === 'fight' && !ui.busy) showSelection();
  }

  // ---------------- the menu ----------------
  function openMenu() {
    const sw = (id, on) => `<button class="sw" type="button" role="switch" id="${id}" aria-checked="${on}"></button>`;
    const changed = Object.keys(TUNING.units).length + Object.keys(TUNING.tune || {}).filter(k => TUNING.tune[k] !== DV.TUNE0[k]).length;
    const card = openModal(`
      <h2>Goblin Delve</h2>
      <p>A test bench for dice combat: one custom d6 per character, initiative once a fight, three goblins and their shaman.</p>
      <div class="row"><button class="btn gold" type="button" id="mNew">New fight</button><button class="btn" type="button" id="mSim">Simulate 1,000 fights</button><button class="btn" type="button" id="mLog">Combat log</button></div>
      <section><h3>Play</h3>
        <div class="set"><div><b>Auto-play the party</b><small>The heroes choose for themselves, so you can watch the rules run.</small></div>${sw('mAuto', SET.auto)}</div>
        <div class="set"><div><b>Speed</b><small>How fast dice and blows play out.</small></div><span class="seg"><button type="button" data-sp="normal" aria-pressed="${SET.speed === 'normal'}">Normal</button><button type="button" data-sp="fast" aria-pressed="${SET.speed === 'fast'}">Fast</button></span></div>
        <div class="set"><div><b>Sound</b><small>Dice, blows and spells.</small></div>${sw('mSound', !SET.mute)}</div>
      </section>
      <section><h3>House rules</h3>
        <div class="set"><div><b>The power face also hits</b><small>Off: it only triggers the power.</small></div>${sw('mKnack', DV.TUNE.knackHits)}</div>
        <div class="set"><div><b>Criticals explode</b><small>A critical rolls one more die, which can explode again.</small></div>${sw('mExplode', DV.TUNE.explode)}</div>
        <div class="set"><div><b>Tuned numbers</b><small>${changed ? `${changed} change${changed > 1 ? 's' : ''} from the defaults, kept on this device.` : 'Open any sheet and tap Tune to change stats and die faces.'}</small></div>${changed ? `<button class="btn small" type="button" id="mReset">Reset all</button>` : ''}</div>
      </section>
      <details><summary>How a fight works</summary><ul>
        <li>Everyone rolls initiative once (d${DV.TUNE.initDie} + bonus) and acts in that order every round.</li>
        <li>On a hero’s turn, pick one action from the hotbar, then a target. Goblins act on their own.</li>
        <li>An attack rolls the character’s own d6: two blank faces miss, two hit faces deal its damage, the power face triggers its power${DV.TUNE.knackHits ? ' and hits' : ''}, and the critical burst hits${DV.TUNE.explode ? ' and rolls another die, which can explode again' : ''}.</li>
        <li>Melee reaches only the front rank while anyone stands in it. Ranged attacks and spells reach anyone.</li>
        <li>Powers with a wait can’t be used again until that many of your turns have passed.</li>
        <li>Brace takes ${DV.TUNE.brace} off each hit until your next turn. A Blessed hero’s next roll adds a die.</li>
        <li>A hero at 0 HP is down until healed. The fight ends when one side has no one standing.</li>
      </ul></details>`);
    $('#mNew', card).onclick = newFight;
    $('#mSim', card).onclick = openSim;
    $('#mLog', card).onclick = openLog;
    const toggle = (id, fn) => { const b = $('#' + id, card); b.onclick = () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); fn(v); }; };
    toggle('mAuto', v => { SET.auto = v; saveSet(); if (ui.phase === 'fight' && !ui.busy && v) { ui.sel = null; VIEW.mark({}); proceed(); } else renderHotbar(); if (v && ui.phase === 'intro') startFight(); });
    toggle('mSound', v => { SET.mute = !v; VIEW.muted = SET.mute; saveSet(); if (v) VIEW.audio(); });
    toggle('mKnack', v => { DV.TUNE.knackHits = v; TUNING.tune = { ...(TUNING.tune || {}), knackHits: v }; saveTuning(); });
    toggle('mExplode', v => { DV.TUNE.explode = v; TUNING.tune = { ...(TUNING.tune || {}), explode: v }; saveTuning(); });
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
        <p>The party plays with a simple bot (it ignores the odds and never braces), so a person usually does better.</p>
        <div class="kpis"><div class="stat"><small>Party wins</small><b>${pct(r.winRate)}</b></div><div class="stat"><small>Rounds</small><b>${f1(r.avgRounds)}</b><span class="note">on average</span></div><div class="stat"><small>No one fell</small><b>${pct(r.flawlessRate)}</b><span class="note">of fights</span></div></div>
        <div class="kpis"><div class="stat"><small>Heroes up</small><b>${r.avgHeroesUp.toFixed(1)}</b><span class="note">at the end</span></div><div class="stat"><small>Party HP</small><b>${f1(r.avgHeroHp)}</b><span class="note">left of ${DV.PARTY.reduce((s, k) => s + DV.UNITS[k].hp, 0)}</span></div><div class="stat"><small>Longest chain</small><b>${r.maxChain}</b><span class="note">exploding dice</span></div></div>
        <div class="tablewrap"><table class="t"><thead><tr><th>Per fight</th><th>Dealt</th><th>Taken</th><th>Healed</th><th>Fell</th><th>Crits</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="legend">${ms} ms · House rules: power face ${DV.TUNE.knackHits ? 'hits' : 'does not hit'}, criticals ${DV.TUNE.explode ? 'explode' : 'do not explode'}.</p>
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
    if (ui.phase === 'intro' && (e.key === 'Enter' || e.key === ' ') && document.activeElement === document.body) { e.preventDefault(); return startFight(); }
    const n = +e.key;
    if (n >= 1 && n <= 9 && ui.phase === 'fight' && !ui.busy) { const u = DV.current(S); if (u && u.actions[n - 1]) choose(u.actions[n - 1], $$('#hotbar .abtn')[n - 1]); }
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
    window.DELVE = { get S() { return S; }, ui, newFight, startFight, choose, tapFoe, tapHero, SET };
  }
  boot();
})();
