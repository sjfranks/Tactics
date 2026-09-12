(() => {
  "use strict";

  const COLS = 30;
  const ROWS = 30;
  const MOVEMENT = 2;
  const MIN_MAP_ZOOM = 2.5;
  const MAX_MAP_ZOOM = 8;
  const OBSTACLES = [{ x: 15, y: 18, name: "Ancient pillar" }];
  const STARTING_UNITS = [
    { id: "alden", name: "Alden", mark: "A", team: "player", x: 14, y: 20, hp: 5, maxHp: 5, damage: 2 },
    { id: "mira", name: "Mira", mark: "M", team: "player", x: 16, y: 21, hp: 4, maxHp: 4, damage: 2 },
    { id: "raider-1", name: "North Raider", mark: "R", team: "enemy", x: 14, y: 15, hp: 3, maxHp: 3, damage: 1 },
    { id: "raider-2", name: "Hill Raider", mark: "R", team: "enemy", x: 17, y: 17, hp: 3, maxHp: 3, damage: 1 }
  ];

  const battlefield = document.querySelector("#battlefield");
  const battlefieldFrame = document.querySelector("#battlefield-frame");
  const playerRoster = document.querySelector("#player-roster");
  const endTurnButton = document.querySelector("#end-turn");
  const restartButton = document.querySelector("#restart");
  const settingsMenu = document.querySelector("#settings-menu");
  const restartOverlayButton = document.querySelector("#restart-overlay");
  const instruction = document.querySelector("#instruction");
  const unitDrawer = document.querySelector("#unit-drawer");
  const drawerToggle = document.querySelector("#drawer-toggle");
  const selectedName = document.querySelector("#selected-name");
  const selectedTeam = document.querySelector("#selected-team");
  const healthText = document.querySelector("#health-text");
  const attackStat = document.querySelector("#attack-stat");
  const movementStat = document.querySelector("#movement-stat");
  const portrait = document.querySelector("#portrait");
  const turnNumberLabel = document.querySelector("#turn-number");
  const turnPill = document.querySelector("#turn-pill");
  const resultOverlay = document.querySelector("#result-overlay");
  const resultTitle = document.querySelector("#result-title");
  const resultCopy = document.querySelector("#result-copy");
  const combatForecast = document.querySelector("#combat-forecast");
  const forecastMatchup = document.querySelector("#forecast-matchup");
  const forecastResult = document.querySelector("#forecast-result");

  let units = [];
  let selectedId = null;
  let turnNumber = 1;
  let phase = "player";
  let gameOver = false;
  let pendingMove = null;
  let dragState = null;
  let panState = null;
  let pinchState = null;
  let mapZoom = 5;
  const mapPointers = new Map();
  let suppressMapClick = null;
  let suppressGestureClick = null;
  let isAnimating = false;
  let activeAnimation = null;
  let resolvingAttack = null;
  let attackSequence = 0;

  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const at = (x, y) => units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y);
  const living = (team) => units.filter((unit) => unit.team === team && unit.hp > 0);
  const selected = () => units.find((unit) => unit.id === selectedId && unit.hp > 0) || null;
  const isObstacle = (x, y) => OBSTACLES.some((obstacle) => obstacle.x === x && obstacle.y === y);
  const keyOf = (x, y) => `${x},${y}`;
  const neighbors = ({ x, y }) => [
    { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }
  ].filter((cell) => cell.x >= 0 && cell.x < COLS && cell.y >= 0 && cell.y < ROWS);

  function resetGame() {
    units = STARTING_UNITS.map((unit) => ({ ...unit, acted: false }));
    selectedId = "alden";
    turnNumber = 1;
    phase = "player";
    gameOver = false;
    pendingMove = null;
    resolvingAttack = null;
    attackSequence += 1;
    stopMovementAnimation();
    clearDrag();
    resultOverlay.hidden = true;
    instruction.textContent = "Tap or drag a hero to move. Target a highlighted raider to preview an attack.";
    render();
    requestAnimationFrame(() => centerOnUnit(selected(), false));
  }

  function findRoute(start, destination, movingUnitId) {
    if (!start || !destination || isObstacle(destination.x, destination.y)) return [];
    const destinationUnit = at(destination.x, destination.y);
    if (destinationUnit && destinationUnit.id !== movingUnitId) return [];
    const startKey = keyOf(start.x, start.y);
    const endKey = keyOf(destination.x, destination.y);
    const queue = [{ x: start.x, y: start.y }];
    const previous = new Map([[startKey, null]]);

    while (queue.length) {
      const current = queue.shift();
      if (keyOf(current.x, current.y) === endKey) break;
      for (const next of neighbors(current)) {
        const nextKey = keyOf(next.x, next.y);
        const blocker = at(next.x, next.y);
        if (previous.has(nextKey) || isObstacle(next.x, next.y) || (blocker && blocker.id !== movingUnitId)) continue;
        previous.set(nextKey, current);
        queue.push(next);
      }
    }

    if (!previous.has(endKey)) return [];
    const route = [];
    let cursor = { x: destination.x, y: destination.y };
    while (cursor) {
      route.unshift(cursor);
      cursor = previous.get(keyOf(cursor.x, cursor.y));
    }
    return route;
  }

  function routeTo(unit, destination) {
    return findRoute(unit, destination, unit?.id);
  }

  function withinMovementRange(unit, x, y) {
    if (!unit || at(x, y) || isObstacle(x, y)) return false;
    if (distance(unit, { x, y }) > MOVEMENT) return false;
    const route = routeTo(unit, { x, y });
    return route.length > 1 && route.length - 1 <= MOVEMENT;
  }

  function reachable(unit, x, y) {
    return phase === "player" && unit && unit.team === "player" && !unit.acted && withinMovementRange(unit, x, y);
  }

  function attackPlan(unit, target) {
    if (!unit || !target || unit.acted || unit.team === target.team || target.hp <= 0) return null;
    const candidates = neighbors(target).map((destination) => {
      if (destination.x === unit.x && destination.y === unit.y) {
        return { ...destination, route: [{ x: unit.x, y: unit.y }] };
      }
      const route = routeTo(unit, destination);
      return route.length > 1 && route.length - 1 <= MOVEMENT ? { ...destination, route } : null;
    }).filter(Boolean);
    candidates.sort((a, b) => a.route.length - b.route.length);
    return candidates[0] || null;
  }

  function cellLabel(x, y, unit) {
    const square = `column ${x + 1}, row ${y + 1}`;
    const obstacle = OBSTACLES.find((item) => item.x === x && item.y === y);
    if (obstacle) return `${obstacle.name}, impassable, ${square}`;
    return unit ? `${unit.name}, ${unit.hp} health, ${square}` : `Empty ${square}`;
  }

  function stopMovementAnimation() {
    activeAnimation?.cancel();
    activeAnimation = null;
    isAnimating = false;
  }

  function displayedAt(x, y) {
    if (pendingMove) {
      const moving = units.find((unit) => unit.id === pendingMove.unitId);
      if (moving && pendingMove.x === x && pendingMove.y === y) return moving;
      if (moving && moving.x === x && moving.y === y) return null;
    }
    return at(x, y);
  }

  function centerOnPosition(x, y, smooth = true) {
    const cell = battlefield.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (!cell) return;
    battlefieldFrame.scrollTo({
      left: cell.offsetLeft + cell.offsetWidth / 2 - battlefieldFrame.clientWidth / 2,
      top: cell.offsetTop + cell.offsetHeight / 2 - battlefieldFrame.clientHeight / 2,
      behavior: smooth ? "smooth" : "auto"
    });
  }

  function centerOnUnit(unit, smooth = true) {
    if (unit) centerOnPosition(unit.x, unit.y, smooth);
  }

  function selectRosterUnit(unit) {
    if (phase === "player" && !resolvingAttack) {
      if (pendingMove) {
        stopMovementAnimation();
        pendingMove = null;
      }
      selectedId = unit.id;
      instruction.textContent = `${unit.name} selected.`;
      render();
    }
    requestAnimationFrame(() => centerOnUnit(unit));
  }

  function renderPlayerRoster() {
    playerRoster.innerHTML = "";
    for (const unit of living("player")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `roster-token${unit.id === selectedId ? " selected" : ""}${unit.acted ? " acted" : ""}`;
      button.textContent = unit.mark;
      button.setAttribute("aria-label", `${unit.name}, ${unit.hp} of ${unit.maxHp} health${unit.acted ? ", acted" : ""}. Select and center map.`);
      button.addEventListener("click", () => selectRosterUnit(unit));
      playerRoster.appendChild(button);
    }
  }

  function routePoints(route) {
    return route.map(({ x, y }) => {
      const cell = battlefield.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
      return {
        x: cell.offsetLeft + cell.offsetWidth / 2,
        y: cell.offsetTop + cell.offsetHeight / 2,
        size: Math.min(cell.offsetWidth, cell.offsetHeight)
      };
    });
  }

  function renderRouteOverlay(route, team) {
    if (route.length < 2) return;
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.classList.add("route-overlay");
    if (team === "enemy") svg.classList.add("enemy-route");
    svg.setAttribute("viewBox", `0 0 ${battlefield.clientWidth} ${battlefield.clientHeight}`);
    svg.setAttribute("aria-hidden", "true");

    const defs = document.createElementNS(namespace, "defs");
    const marker = document.createElementNS(namespace, "marker");
    marker.setAttribute("id", "route-arrowhead");
    marker.setAttribute("markerWidth", "14");
    marker.setAttribute("markerHeight", "14");
    marker.setAttribute("refX", "11");
    marker.setAttribute("refY", "6");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "userSpaceOnUse");
    const arrowHead = document.createElementNS(namespace, "path");
    arrowHead.setAttribute("d", "M0,0 L12,6 L0,12 Z");
    arrowHead.setAttribute("fill", team === "enemy" ? "#fff0f0" : "#eafcff");
    marker.appendChild(arrowHead);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const points = routePoints(route);
    const last = points[points.length - 1];
    const previous = points[points.length - 2];
    const dx = last.x - previous.x;
    const dy = last.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const stopDistance = last.size * 0.33;
    last.x -= (dx / length) * stopDistance;
    last.y -= (dy / length) * stopDistance;
    const pathData = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

    const outline = document.createElementNS(namespace, "path");
    outline.setAttribute("d", pathData);
    outline.classList.add("route-line", "route-line-outline");
    svg.appendChild(outline);

    const line = document.createElementNS(namespace, "path");
    line.setAttribute("d", pathData);
    line.classList.add("route-line", "route-line-core");
    line.setAttribute("marker-end", "url(#route-arrowhead)");
    svg.appendChild(line);
    battlefield.appendChild(svg);
  }

  async function animateUnitAlongRoute(unit, route) {
    if (!unit || route.length < 2) return;
    const token = battlefield.querySelector(`.unit[data-unit-id="${unit.id}"]`);
    if (!token || typeof token.animate !== "function") return;
    const points = routePoints(route);
    const endpoint = points[points.length - 1];
    const keyframes = points.map((point, index) => ({
      transform: `translate(${point.x - endpoint.x}px, ${point.y - endpoint.y}px) scale(1.05)`,
      offset: index / (points.length - 1)
    }));
    isAnimating = true;
    const animation = token.animate(keyframes, {
      duration: 260 + (route.length - 1) * 150,
      easing: "ease-in-out",
      fill: "both"
    });
    activeAnimation = animation;
    try {
      await animation.finished;
    } catch {
      // Reset or rerender can intentionally cancel an in-flight animation.
    } finally {
      if (activeAnimation === animation) {
        activeAnimation = null;
        isAnimating = false;
      }
    }
  }

  async function animateAttackTokens(attacker, target) {
    const attackerToken = battlefield.querySelector(`.unit[data-unit-id="${attacker.id}"]`);
    const targetToken = battlefield.querySelector(`.unit[data-unit-id="${target.id}"]`);
    if (!attackerToken || !targetToken || typeof attackerToken.animate !== "function") return;
    const attackerRect = attackerToken.getBoundingClientRect();
    const targetRect = targetToken.getBoundingClientRect();
    const dx = targetRect.left - attackerRect.left;
    const dy = targetRect.top - attackerRect.top;
    const length = Math.hypot(dx, dy) || 1;
    const lungeX = (dx / length) * 10;
    const lungeY = (dy / length) * 10;
    const attackerAnimation = attackerToken.animate([
      { transform: "translate(0, 0) scale(1)" },
      { transform: `translate(${lungeX}px, ${lungeY}px) scale(1.1)`, offset: .45 },
      { transform: "translate(0, 0) scale(1)" }
    ], { duration: 360, easing: "ease-out" });
    const targetAnimation = targetToken.animate([
      { transform: "translate(0, 0) rotate(0deg)" },
      { transform: "translate(-3px, 1px) rotate(-4deg)" },
      { transform: "translate(3px, -1px) rotate(4deg)" },
      { transform: "translate(-2px, 0) rotate(-3deg)" },
      { transform: "translate(0, 0) rotate(0deg)" }
    ], { duration: 430, easing: "ease-in-out" });
    await Promise.allSettled([attackerAnimation.finished, targetAnimation.finished]);
  }

  async function resolveAttack(attacker, target) {
    const sequence = ++attackSequence;
    const damage = Math.min(attacker.damage, target.hp);
    resolvingAttack = { attackerId: attacker.id, targetId: target.id };
    instruction.textContent = `${attacker.name} attacks ${target.name}…`;
    render();
    await animateAttackTokens(attacker, target);
    if (sequence !== attackSequence) return 0;

    for (let point = 0; point < damage; point += 1) {
      target.hp = Math.max(0, target.hp - 1);
      render();
      const targetToken = battlefield.querySelector(`.unit[data-unit-id="${target.id}"]`);
      targetToken?.animate([
        { transform: "translateX(0)", filter: "brightness(1)" },
        { transform: "translateX(-3px)", filter: "brightness(1.55)" },
        { transform: "translateX(3px)", filter: "brightness(1.2)" },
        { transform: "translateX(0)", filter: "brightness(1)" }
      ], { duration: 180, easing: "ease-out" });
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (sequence !== attackSequence) return 0;
    }

    resolvingAttack = null;
    return damage;
  }

  function render() {
    battlefield.innerHTML = "";
    const active = selected();
    const route = pendingMove?.route || [];
    const showMovementRange = active && !resolvingAttack
      && ((phase === "player" && (active.team === "enemy" || !active.acted))
        || (phase === "enemy" && active.team === "enemy" && !active.acted));

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const occupant = displayedAt(x, y);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", cellLabel(x, y, occupant));
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);
        if (isObstacle(x, y)) cell.classList.add("obstacle-cell");
        if (showMovementRange && withinMovementRange(active, x, y)) {
          cell.classList.add("reachable");
          if (active.team === "enemy") cell.classList.add("enemy-reachable");
        }
        if (!resolvingAttack && active?.team === "player" && occupant?.team === "enemy" && attackPlan(active, occupant)) cell.classList.add("attackable");
        if (pendingMove?.type === "attack" && pendingMove.targetId === occupant?.id) cell.classList.add("attack-target");
        if (pendingMove && pendingMove.x === x && pendingMove.y === y) cell.classList.add("pending-destination");
        if (pendingMove && active && active.x === x && active.y === y) cell.classList.add("move-origin");
        cell.addEventListener("click", (event) => {
          const actualCell = event.detail === 0 ? { x, y } : (cellAtPointer(event) || { x: -1, y: -1 });
          handleCell(actualCell.x, actualCell.y, event);
        });

        if (isObstacle(x, y)) {
          const obstacle = document.createElement("span");
          obstacle.className = "obstacle-marker";
          obstacle.setAttribute("aria-hidden", "true");
          obstacle.textContent = "◆";
          cell.appendChild(obstacle);
        } else if (occupant) {
          const token = document.createElement("span");
          token.className = `unit ${occupant.team}${occupant.acted ? " acted" : ""}${occupant.id === selectedId ? " selected" : ""}`;
          token.dataset.unitId = occupant.id;
          if (pendingMove?.unitId === occupant.id) token.classList.add("previewing");
          token.textContent = occupant.mark;
          const pips = document.createElement("span");
          pips.className = "hp-pips";
          for (let i = 0; i < occupant.maxHp; i += 1) {
            const pip = document.createElement("i");
            if (i >= occupant.hp) pip.className = "empty";
            pips.appendChild(pip);
          }
          token.appendChild(pips);
          if (occupant.team === "player") attachDragHandlers(token, occupant);
          cell.appendChild(token);
        }
        battlefield.appendChild(cell);
      }
    }
    renderRouteOverlay(route, active?.team);
    renderCombatForecast(active);
    renderPlayerRoster();

    const shown = active || living("player")[0] || living("enemy")[0];
    if (shown) {
      selectedName.textContent = shown.name;
      selectedTeam.textContent = shown.team === "enemy" ? "Enemy" : "Hero";
      portrait.textContent = shown.mark;
      portrait.classList.toggle("enemy", shown.team === "enemy");
      healthText.textContent = `${shown.hp} / ${shown.maxHp}`;
      attackStat.textContent = String(shown.damage);
      movementStat.textContent = String(MOVEMENT);
    }
    turnNumberLabel.textContent = String(turnNumber);
    turnPill.textContent = phase === "player" ? "Player" : "Enemy";
    turnPill.classList.toggle("enemy", phase === "enemy");
    const playerPending = phase === "player" ? pendingMove : null;
    endTurnButton.textContent = resolvingAttack && phase === "player"
      ? "Resolving…"
      : playerPending?.type === "attack"
      ? "Confirm Attack"
      : playerPending ? "Confirm" : "End Turn";
    endTurnButton.classList.toggle("confirm-move", playerPending?.type === "move");
    endTurnButton.classList.toggle("confirm-attack", playerPending?.type === "attack" || Boolean(resolvingAttack && phase === "player"));
    endTurnButton.disabled = phase !== "player" || gameOver || Boolean(resolvingAttack);
  }

  function renderCombatForecast(attacker) {
    combatForecast.hidden = true;
    const preview = pendingMove?.type === "attack" ? pendingMove : null;
    const resolution = resolvingAttack;
    const source = preview || resolution;
    if (!source) return;
    const shownAttacker = units.find((unit) => unit.id === (preview?.unitId || resolution.attackerId));
    const target = units.find((unit) => unit.id === (preview?.targetId || resolution.targetId));
    if (!shownAttacker || !target) return;
    const remaining = Math.max(0, target.hp - shownAttacker.damage);
    forecastMatchup.textContent = `${shownAttacker.name} → ${target.name}`;
    forecastResult.textContent = preview
      ? `${shownAttacker.damage} damage · ${target.hp} → ${remaining} HP`
      : `${target.hp} / ${target.maxHp} HP`;
    combatForecast.classList.toggle("resolving", Boolean(resolution));
    combatForecast.classList.toggle("clickable", Boolean(preview));
    combatForecast.tabIndex = preview ? 0 : -1;
    combatForecast.setAttribute("aria-label", preview
      ? `Confirm attack. ${shownAttacker.name} deals ${shownAttacker.damage} damage to ${target.name}, leaving ${remaining} health.`
      : `${shownAttacker.name} attacks ${target.name}.`);
    combatForecast.hidden = false;
  }

  function cellAtPointer(event) {
    if (!event || event.detail === 0) return null;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest(".cell");
    return cell && battlefield.contains(cell)
      ? { x: Number(cell.dataset.x), y: Number(cell.dataset.y) }
      : null;
  }

  function handleCell(x, y, event) {
    if (suppressMapClick && event?.timeStamp <= suppressMapClick.until) {
      suppressMapClick = null;
      return;
    }
    if (suppressGestureClick && event?.timeStamp <= suppressGestureClick.until) {
      suppressGestureClick = null;
      return;
    }
    if (phase !== "player" || gameOver || resolvingAttack) return;
    const occupant = at(x, y);
    const active = selected();

    if (pendingMove) {
      const moving = units.find((unit) => unit.id === pendingMove.unitId && unit.hp > 0);
      if (!moving) {
        cancelPendingMove();
        return;
      }
      const attackTarget = pendingMove.type === "attack"
        ? units.find((unit) => unit.id === pendingMove.targetId && unit.hp > 0)
        : null;
      const confirmsAttack = attackTarget && x === attackTarget.x && y === attackTarget.y;
      const confirmsMove = pendingMove.type !== "attack" && x === pendingMove.x && y === pendingMove.y;
      if (confirmsAttack || confirmsMove) {
        void confirmPendingMove();
        return;
      }
      if (occupant?.team === "enemy" && attackPlan(moving, occupant)) {
        stageAttack(moving, occupant, "retarget");
        return;
      }
      if (reachable(moving, x, y)) {
        stageMove(moving, x, y, "retarget");
        return;
      }
      cancelPendingMove();
      return;
    }

    if (occupant?.team === "player") {
      selectedId = occupant.id;
      instruction.textContent = occupant.acted ? `${occupant.name} has already acted this turn.` : `${occupant.name} selected. Move up to two tiles or target any raider within reach.`;
      render();
      return;
    }

    if (occupant?.team === "enemy") {
      selectedId = occupant.id;
      instruction.textContent = `${occupant.name} selected. Attack ${occupant.damage}, movement ${MOVEMENT}.`;
      render();
      return;
    }

    if (!active || active.acted) {
      instruction.textContent = "Select a blue unit that has not acted.";
      return;
    }

    if (reachable(active, x, y)) {
      stageMove(active, x, y, "tap");
    }
  }

  function stageMove(unit, x, y, method) {
    if (!reachable(unit, x, y)) {
      instruction.textContent = "That tile is outside this hero’s movement range.";
      render();
      return;
    }
    stopMovementAnimation();
    selectedId = unit.id;
    const route = routeTo(unit, { x, y });
    pendingMove = { type: "move", unitId: unit.id, x, y, method, route };
    const spaces = route.length - 1;
    instruction.textContent = `${unit.name}: ${spaces} ${spaces === 1 ? "space" : "spaces"}. Tap the endpoint or Confirm; choose another highlighted tile to revise.`;
    render();
    void animateUnitAlongRoute(unit, route);
  }

  function stageAttack(unit, target, method) {
    const plan = attackPlan(unit, target);
    if (!plan) {
      instruction.textContent = `${target.name} cannot be reached this turn.`;
      render();
      return;
    }
    stopMovementAnimation();
    selectedId = unit.id;
    pendingMove = {
      type: "attack",
      unitId: unit.id,
      targetId: target.id,
      x: plan.x,
      y: plan.y,
      method,
      route: plan.route
    };
    const remaining = Math.max(0, target.hp - unit.damage);
    instruction.textContent = `${unit.name} will deal ${unit.damage} damage (${target.hp} → ${remaining} HP). Tap ${target.name} or Confirm Attack.`;
    render();
    void animateUnitAlongRoute(unit, plan.route);
  }

  async function confirmPendingMove() {
    if (!pendingMove || phase !== "player" || gameOver || resolvingAttack) return;
    stopMovementAnimation();
    const unit = units.find((candidate) => candidate.id === pendingMove.unitId && candidate.hp > 0);
    if (!unit) {
      cancelPendingMove();
      return;
    }

    if (pendingMove.type === "attack") {
      const target = units.find((candidate) => candidate.id === pendingMove.targetId && candidate.hp > 0);
      const route = pendingMove.x === unit.x && pendingMove.y === unit.y
        ? [{ x: unit.x, y: unit.y }]
        : routeTo(unit, pendingMove);
      const valid = target && route.length > 0 && route.length - 1 <= MOVEMENT
        && distance(pendingMove, target) === 1;
      if (!valid) {
        cancelPendingMove();
        return;
      }
      unit.x = pendingMove.x;
      unit.y = pendingMove.y;
      unit.acted = true;
      pendingMove = null;
      const damage = await resolveAttack(unit, target);
      instruction.textContent = target.hp === 0
        ? `${unit.name} defeated ${target.name}.`
        : `${unit.name} attacked ${target.name} for ${damage} damage.`;
      selectNextReady();
      if (!checkResult()) render();
      return;
    }

    if (!reachable(unit, pendingMove.x, pendingMove.y)) {
      cancelPendingMove();
      return;
    }
    unit.x = pendingMove.x;
    unit.y = pendingMove.y;
    unit.acted = true;
    pendingMove = null;
    instruction.textContent = `${unit.name} moved. Choose another hero or end the turn.`;
    selectNextReady();
    render();
  }

  function cancelPendingMove() {
    if (!pendingMove) return;
    stopMovementAnimation();
    const unit = units.find((candidate) => candidate.id === pendingMove.unitId);
    pendingMove = null;
    instruction.textContent = unit ? `${unit.name}’s action was cancelled. Choose a new destination.` : "Action cancelled.";
    render();
  }

  function showDragRange(unit) {
    battlefield.querySelectorAll(".cell").forEach((cell) => {
      const x = Number(cell.dataset.x);
      const y = Number(cell.dataset.y);
      const occupant = at(x, y);
      cell.classList.toggle("reachable", reachable(unit, x, y));
      cell.classList.toggle("attackable", Boolean(occupant?.team === "enemy" && attackPlan(unit, occupant)));
    });
  }

  function clearDrag() {
    dragState?.token?.classList.remove("lifted");
    dragState?.ghost?.remove();
    dragState = null;
    document.body.classList.remove("unit-dragging");
    battlefield?.querySelectorAll(".drag-target, .drag-invalid").forEach((cell) => cell.classList.remove("drag-target", "drag-invalid"));
  }

  function attachDragHandlers(token, unit) {
    const redirecting = pendingMove?.unitId === unit.id;
    if (unit.acted || phase !== "player" || gameOver || (pendingMove && !redirecting)) return;
    token.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      suppressGestureClick = null;
      if (redirecting) {
        const endpointCell = token.closest(".cell");
        const rect = endpointCell?.getBoundingClientRect();
        const touchingEndpoint = rect
          && event.clientX >= rect.left && event.clientX <= rect.right
          && event.clientY >= rect.top && event.clientY <= rect.bottom;
        if (!touchingEndpoint) return;
        stopMovementAnimation();
      }
      selectedId = unit.id;
      token.classList.add("lifted");
      dragState = {
        unit,
        token,
        redirecting,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        target: null,
        ghost: null
      };
      token.setPointerCapture(event.pointerId);
      showDragRange(unit);
    });

    token.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const moved = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
      if (!dragState.dragging && moved > 7) {
        dragState.dragging = true;
        document.body.classList.add("unit-dragging");
        dragState.ghost = token.cloneNode(true);
        dragState.ghost.classList.add("drag-ghost");
        dragState.ghost.classList.remove("selected");
        document.body.appendChild(dragState.ghost);
      }
      if (!dragState.dragging) return;
      event.preventDefault();
      dragState.ghost.style.left = `${event.clientX}px`;
      dragState.ghost.style.top = `${event.clientY}px`;
      battlefield.querySelectorAll(".drag-target, .drag-invalid").forEach((cell) => cell.classList.remove("drag-target", "drag-invalid"));
      const hovered = document.elementFromPoint(event.clientX, event.clientY)?.closest(".cell");
      dragState.target = null;
      if (hovered) {
        const x = Number(hovered.dataset.x);
        const y = Number(hovered.dataset.y);
        const occupant = at(x, y);
        const plan = occupant?.team === "enemy" ? attackPlan(unit, occupant) : null;
        const valid = Boolean(plan) || reachable(unit, x, y);
        hovered.classList.add(valid ? "drag-target" : "drag-invalid");
        if (plan) dragState.target = { type: "attack", targetId: occupant.id, x, y };
        else if (valid) dragState.target = { type: "move", x, y };
      }
    });

    const finishDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const completed = dragState.dragging;
      const target = dragState.target;
      const wasRedirecting = dragState.redirecting;
      clearDrag();
      if (completed) {
        suppressGestureClick = { until: event.timeStamp + 700 };
        if (target?.type === "attack") {
          const enemy = units.find((candidate) => candidate.id === target.targetId && candidate.hp > 0);
          if (enemy) stageAttack(unit, enemy, wasRedirecting ? "redirect" : "drag");
        } else if (target) {
          stageMove(unit, target.x, target.y, wasRedirecting ? "redirect" : "drag");
        }
        else {
          instruction.textContent = wasRedirecting
            ? "That destination is not available. Drag the unit to another highlighted tile."
            : "Drag onto a highlighted tile.";
          render();
        }
      }
    };
    token.addEventListener("pointerup", finishDrag);
    token.addEventListener("pointercancel", finishDrag);
  }

  function selectNextReady() {
    const next = living("player").find((unit) => !unit.acted);
    selectedId = next?.id || selectedId;
  }

  function chooseEnemyDestination(unit, target) {
    const candidates = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (withinMovementRange(unit, x, y)) candidates.push({ x, y });
      }
    }
    candidates.sort((a, b) => distance(a, target) - distance(b, target));
    return candidates[0] || null;
  }

  async function enemyTurn() {
    if (phase !== "player" || gameOver) return;
    phase = "enemy";
    selectedId = null;
    instruction.textContent = "The raiders are moving…";
    render();

    for (const enemy of living("enemy")) {
      selectedId = enemy.id;
      instruction.textContent = `${enemy.name} is choosing a move…`;
      render();
      requestAnimationFrame(() => centerOnUnit(enemy));
      await new Promise((resolve) => setTimeout(resolve, 480));

      const targets = living("player").sort((a, b) => distance(enemy, a) - distance(enemy, b));
      const target = targets[0];
      if (!target) break;
      if (distance(enemy, target) > 1) {
        const destination = chooseEnemyDestination(enemy, target);
        if (destination) {
          const route = routeTo(enemy, destination);
          pendingMove = { type: "move", unitId: enemy.id, x: destination.x, y: destination.y, method: "enemy", route };
          instruction.textContent = `${enemy.name} advances.`;
          render();
          requestAnimationFrame(() => centerOnPosition(destination.x, destination.y));
          await animateUnitAlongRoute(enemy, route);
          await new Promise((resolve) => setTimeout(resolve, 220));
          enemy.x = destination.x;
          enemy.y = destination.y;
          pendingMove = null;
          render();
          await new Promise((resolve) => setTimeout(resolve, 260));
        }
      }
      if (distance(enemy, target) === 1) {
        const damage = await resolveAttack(enemy, target);
        instruction.textContent = `${enemy.name} attacked ${target.name} for ${damage} damage.`;
        render();
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
      if (checkResult()) return;
    }

    units.forEach((unit) => { unit.acted = false; });
    phase = "player";
    turnNumber += 1;
    selectedId = living("player")[0]?.id || null;
    instruction.textContent = "Your turn. Select a unit to move or attack.";
    render();
  }

  function checkResult() {
    if (living("enemy").length === 0) {
      finish("Victory", "The pass is secure. Both heroes survived the skirmish.");
      return true;
    }
    if (living("player").length === 0) {
      finish("Defeat", "The raiders held the pass. Rally and try a new approach.");
      return true;
    }
    return false;
  }

  function finish(title, copy) {
    gameOver = true;
    resultTitle.textContent = title;
    resultCopy.textContent = copy;
    resultOverlay.hidden = false;
    render();
  }

  function battleState() {
    return {
      turn: turnNumber,
      phase,
      gameOver,
      pendingMove,
      obstacles: OBSTACLES.map(({ x, y, name }) => ({ x, y, name })),
      units: units.filter((unit) => unit.hp > 0).map(({ id, name, team, x, y, hp, maxHp, acted }) => ({ id, name, team, x, y, hp, maxHp, acted }))
    };
  }

  function registerAgentTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const register = (tool) => Promise.resolve(context.registerTool(tool)).catch(() => undefined);
    register({
      name: "read_battle_state",
      title: "Read battle state",
      description: "Read the current tactical battle state without changing it.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => battleState()
    });
    register({
      name: "restart_battle",
      title: "Restart battle",
      description: "Restart the current tactical battle from turn one.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => { resetGame(); return battleState(); }
    });
  }

  endTurnButton.addEventListener("click", () => {
    if (pendingMove) void confirmPendingMove();
    else void enemyTurn();
  });
  combatForecast.addEventListener("click", () => {
    if (pendingMove?.type === "attack") void confirmPendingMove();
  });
  combatForecast.addEventListener("keydown", (event) => {
    if (pendingMove?.type !== "attack" || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    void confirmPendingMove();
  });
  drawerToggle.addEventListener("click", () => {
    const open = unitDrawer.classList.toggle("open");
    drawerToggle.setAttribute("aria-expanded", String(open));
    drawerToggle.setAttribute("aria-label", open ? "Hide selected unit stats" : "Show selected unit stats");
  });
  function pointerDistance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
  }

  function pointerMidpoint(first, second) {
    return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  }

  function beginPinch() {
    const points = [...mapPointers.values()].slice(0, 2);
    if (points.length < 2) return;
    const midpoint = pointerMidpoint(points[0], points[1]);
    const frameRect = battlefieldFrame.getBoundingClientRect();
    const localX = midpoint.x - frameRect.left;
    const localY = midpoint.y - frameRect.top;
    pinchState = {
      startDistance: Math.max(pointerDistance(points[0], points[1]), 1),
      startZoom: mapZoom,
      contentX: (battlefieldFrame.scrollLeft + localX) / mapZoom,
      contentY: (battlefieldFrame.scrollTop + localY) / mapZoom
    };
    panState = null;
    battlefieldFrame.classList.add("panning");
  }

  battlefield.addEventListener("pointerdown", (event) => {
    if ((event.button !== undefined && event.button !== 0) || event.target.closest(".unit")) return;
    mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    battlefieldFrame.setPointerCapture(event.pointerId);
    if (mapPointers.size >= 2) {
      beginPinch();
      return;
    }
    panState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: battlefieldFrame.scrollLeft,
      scrollTop: battlefieldFrame.scrollTop,
      dragging: false
    };
  });
  battlefieldFrame.addEventListener("pointermove", (event) => {
    if (mapPointers.has(event.pointerId)) {
      mapPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (pinchState && mapPointers.size >= 2) {
      const points = [...mapPointers.values()].slice(0, 2);
      const midpoint = pointerMidpoint(points[0], points[1]);
      const frameRect = battlefieldFrame.getBoundingClientRect();
      const localX = midpoint.x - frameRect.left;
      const localY = midpoint.y - frameRect.top;
      const nextZoom = Math.min(MAX_MAP_ZOOM, Math.max(
        MIN_MAP_ZOOM,
        pinchState.startZoom * pointerDistance(points[0], points[1]) / pinchState.startDistance
      ));
      mapZoom = nextZoom;
      battlefield.style.setProperty("--map-zoom", String(mapZoom));
      battlefieldFrame.scrollLeft = pinchState.contentX * mapZoom - localX;
      battlefieldFrame.scrollTop = pinchState.contentY * mapZoom - localY;
      event.preventDefault();
      return;
    }
    if (!panState || panState.pointerId !== event.pointerId) return;
    const dx = event.clientX - panState.startX;
    const dy = event.clientY - panState.startY;
    if (!panState.dragging && Math.hypot(dx, dy) > 6) {
      panState.dragging = true;
      battlefieldFrame.classList.add("panning");
    }
    if (!panState.dragging) return;
    event.preventDefault();
    battlefieldFrame.scrollLeft = panState.scrollLeft - dx;
    battlefieldFrame.scrollTop = panState.scrollTop - dy;
  });
  const finishPan = (event) => {
    const wasPinching = Boolean(pinchState);
    const wasDragging = panState?.pointerId === event.pointerId && panState.dragging;
    mapPointers.delete(event.pointerId);
    if (wasPinching) {
      suppressMapClick = { until: event.timeStamp + 500 };
      pinchState = null;
      const remaining = [...mapPointers.entries()][0];
      if (remaining) {
        panState = {
          pointerId: remaining[0],
          startX: remaining[1].x,
          startY: remaining[1].y,
          scrollLeft: battlefieldFrame.scrollLeft,
          scrollTop: battlefieldFrame.scrollTop,
          dragging: false
        };
      } else {
        panState = null;
        battlefieldFrame.classList.remove("panning");
      }
    } else if (panState?.pointerId === event.pointerId) {
      if (wasDragging) suppressMapClick = { until: event.timeStamp + 500 };
      panState = null;
      battlefieldFrame.classList.remove("panning");
    }
    if (battlefieldFrame.hasPointerCapture(event.pointerId)) battlefieldFrame.releasePointerCapture(event.pointerId);
  };
  battlefieldFrame.addEventListener("pointerup", finishPan);
  battlefieldFrame.addEventListener("pointercancel", finishPan);
  restartButton.addEventListener("click", () => {
    settingsMenu.open = false;
    resetGame();
  });
  restartOverlayButton.addEventListener("click", resetGame);
  document.addEventListener("pointerdown", (event) => {
    // A fresh touch is always a new command. Only the synthetic click emitted by
    // the previous drag gesture should ever be ignored.
    suppressGestureClick = null;
    if (settingsMenu.open && !settingsMenu.contains(event.target)) settingsMenu.open = false;
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && pendingMove) cancelPendingMove();
  });
  resetGame();
  registerAgentTools();
})();
