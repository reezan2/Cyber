// ================================================================
// ia_mob.js — Intelligence Artificielle des Mobs (CyberIdle)
// Remplace hbAITurn(enemy) dans hexBattle.js.
// Point d'entrée : hbAIMobTurn(enemy)
// Chargé après hexBattle.js dans index.html
// ================================================================

// ── DÉTECTION DE RÔLE ────────────────────────────────────────────
// Déduit le rôle du mob depuis ses stats/sorts — pas de champ role explicite dans MOB_DEFS
function hbDetectRole(enemy) {
  if (enemy.boss) return 'boss';
  var spells = enemy.spells || [];

  // Invocateur : possède un sort avec .invoc
  if (spells.some(function(sp) { return !!sp.invoc; })) return 'invocateur';

  // Mage distance : sort offensif avec range >= 4
  var maxRange = 0;
  spells.forEach(function(sp) { if (!sp.invoc && sp.range > maxRange) maxRange = sp.range; });
  if (maxRange >= 4) return 'mage';

  // Tank : mHp élevé ou thorn > 0
  if (enemy.thorn > 0 || enemy.mHp > 150) return 'tank';

  // Assassin : esquive notable + sort burst courte portée
  if (enemy.esq > 0.05) {
    if (spells.some(function(sp) { return sp.range <= 2 && (sp.pwr || 0) >= 0.9; })) return 'assassin';
  }

  return 'dps';
}

// ── CIBLES VALIDES ───────────────────────────────────────────────
// Toutes les cibles ennemies vivantes — le scoring assure la priorité non-invoc.
function hbGetValidTargets(enemy) {
  if (!HB) return [];
  return HB.units.filter(function(u) {
    return u.alive && u.isPlayer !== enemy.isPlayer;
  }).map(function(u) {
    return {
      unit: u,
      dist: HB_HEX.dist(enemy.pos, u.pos),
      hasLOS: hbHasLOS(enemy.pos, u.pos, false)
    };
  });
}

// ── SCORING DES CIBLES ───────────────────────────────────────────
function hbAIScoreTargets(enemy, role, targets) {
  if (!targets || !targets.length) return null;
  var best = null, bestScore = -Infinity;
  targets.forEach(function(t) {
    if (!t.unit || !t.unit.alive) return;
    var u = t.unit;
    var hpPct = u.hp / (u.mHp || 1);
    var score = 0;
    score += (1 - hpPct) * 40;                                    // finir les cibles affaiblies
    score += Math.max(0, 30 - t.dist * 5);                        // préférer le plus proche
    if (!u.isInvoc) score += 50;                                   // personnages >> invocations (2e priorité)
    var threat = ((u.paMax || 6) / 6) * ((u.atk || 10) / 10);
    score += threat * 15;
    if (role === 'assassin') score += (1 - hpPct) * 30;
    else if (role === 'mage' && t.dist <= 1) score -= 20;
    else if (role === 'tank') score += threat * 10;
    score *= (0.85 + Math.random() * 0.30);                       // variation ±15%
    if (score > bestScore) { bestScore = score; best = u; }
  });
  return best;
}

// ── SORTS UTILISABLES ────────────────────────────────────────────
function hbGetUsableSpells(enemy, target) {
  if (!enemy.spells || !enemy.spells.length || !target) return [];
  var dist = HB_HEX.dist(enemy.pos, target.pos);
  return enemy.spells.filter(function(sp) {
    if ((sp.cd || 0) > 0) return false;
    if (enemy.pa < (sp.pa || 4)) return false;
    if (dist < (sp.minRange || 1)) return false;
    if (dist > sp.range) return false;
    if (sp.los !== false && !hbHasLOS(enemy.pos, target.pos, false)) return false;
    return true;
  });
}

// ── SCORING D'UN SORT ────────────────────────────────────────────
function hbAIScoreSpell(enemy, sp, target) {
  var score = 0;
  var hpPct = enemy.hp / (enemy.mHp || 1);
  if (!sp.invoc) {
    var hits = sp.hits || 1;
    var cd   = Math.max(1, sp.cdMax || 1);
    score += (sp.pwr || 1.0) * hits / cd * 50;
    if (sp.aoe && sp.aoe !== 'single' && target) {
      var nearby = HB.units.filter(function(u) {
        return u.alive && u.isPlayer !== enemy.isPlayer &&
               HB_HEX.dist(target.pos, u.pos) <= 2;
      }).length;
      score += nearby * 15;
    }
    if (sp.lifesteal && hpPct < 0.5) score += 25;
    if (sp.knockback) score += 8;
    if (target) {
      var res = 0;
      if      (sp.dmgType === 'Plasma') res = target.resPlas   || 0;
      else if (sp.dmgType === 'Neon')   res = target.resNeon   || 0;
      else if (sp.dmgType === 'Glitch') res = target.resGlitch || 0;
      else if (sp.dmgType === 'Negate') res = target.resNegate || 0;
      score -= res * 40;
    }
    if ((sp.pwr || 0) >= 1.0 && target && (target.hp / (target.mHp || 1)) < 0.4) score += 20;
  } else {
    // Sort d'invocation : bloquer si limite atteinte
    var _maxInv2 = sp.maxInvoc || 1;
    var _curInv2 = HB.units.filter(function(u) {
      return u.alive && u.isInvoc && u.invocOwner === enemy.id;
    }).length;
    if (_curInv2 >= _maxInv2) return -Infinity;
    var alliesAlive = HB.units.filter(function(u) {
      return u.alive && u.isPlayer === enemy.isPlayer && u !== enemy;
    }).length;
    score += 60 - alliesAlive * 15;
    if (hpPct < 0.4) score += 20;
  }
  score *= (0.85 + Math.random() * 0.30);
  return score;
}

// ── MEILLEUR SORT ────────────────────────────────────────────────
function hbGetBestSpell(enemy, target) {
  var usable = hbGetUsableSpells(enemy, target);
  if (!usable.length) return null;
  var best = null, bestScore = -Infinity;
  usable.forEach(function(sp) {
    var s = hbAIScoreSpell(enemy, sp, target);
    if (s > bestScore) { bestScore = s; best = sp; }
  });
  return best;
}

// ── ALLIÉ BLESSÉ ─────────────────────────────────────────────────
function hbGetWoundedAlly(enemy) {
  if (!HB) return null;
  var best = null, bestHpPct = 1;
  HB.units.forEach(function(u) {
    if (!u.alive || u === enemy || u.isPlayer !== enemy.isPlayer) return;
    var pct = u.hp / (u.mHp || 1);
    if (pct < 0.5 && pct < bestHpPct) { bestHpPct = pct; best = u; }
  });
  return best;
}

// ── HEXES DANS UN RAYON ──────────────────────────────────────────
function hbHexesInMobRadius(center, radius) {
  var result = [];
  for (var dq = -radius; dq <= radius; dq++) {
    var rMin = Math.max(-radius, -dq - radius);
    var rMax = Math.min(radius, -dq + radius);
    for (var dr = rMin; dr <= rMax; dr++) {
      result.push({ q: center.q + dq, r: center.r + dr, s: -center.q - dq - center.r - dr });
    }
  }
  return result;
}

// ── HEX DE KITE : s'éloigner de la cible avec le PM restant ─────
function hbFindKiteHex(enemy, target) {
  if (!target || enemy.pm <= 0) return null;
  var best = null, maxDist = HB_HEX.dist(enemy.pos, target.pos);
  hbHexesInMobRadius(enemy.pos, enemy.pm).forEach(function(h) {
    if (!hbIsWalkable(h, enemy)) return;
    var d = HB_HEX.dist(h, target.pos);
    if (d > maxDist) { maxDist = d; best = h; }
  });
  return best;
}

// ── POSITIONNEMENT TACTIQUE ──────────────────────────────────────
function hbPickBestPosition(enemy, role, target, bestSpell) {
  if (!target || enemy.pm <= 0) return null;
  var idealRange = bestSpell ? bestSpell.range : 1;
  var targetDist;
  if (role === 'mage' || role === 'invocateur') targetDist = Math.max(idealRange - 1, 2);
  else if (role === 'assassin')                 targetDist = 1;
  else                                          targetDist = Math.max(1, idealRange - 1);

  var candidates = hbHexesInMobRadius(enemy.pos, enemy.pm).filter(function(h) {
    if (!hbIsWalkable(h, enemy)) return false;
    if (HB._aiState && HB._aiState.reservedHexes[hKey(h)]) return false;
    return true;
  });
  if (!candidates.length) return null;

  var woundedAlly = (role === 'tank' || role === 'support') ? hbGetWoundedAlly(enemy) : null;
  var best = null, bestScore = -Infinity;

  candidates.forEach(function(h) {
    var score = 0;
    var dtt = HB_HEX.dist(h, target.pos);
    score -= Math.abs(dtt - targetDist) * 20;
    if (hbHasLOS(h, target.pos, false)) score += 15;
    if (role === 'mage' && dtt <= 1) score -= 50;
    if (role === 'invocateur') score += dtt * 5;
    if (woundedAlly) score += Math.max(0, 10 - HB_HEX.dist(h, woundedAlly.pos) * 3);
    score *= (0.90 + Math.random() * 0.20);
    if (score > bestScore) { bestScore = score; best = h; }
  });
  return best;
}

// ── COORDINATION INTER-MOBS ──────────────────────────────────────
// Réinitialisé à chaque tour de mob — un reset partiel éviterait l'accumulation
// de reservedHexes sur tous les tours du combat (bug de fuite progressive).
// La coordination intra-tour reste assurée par hbIsWalkable (positions finales dans HB.units).
function hbAIInitRoundState() {
  HB._aiState = { reservedHexes: {}, healedThisTurn: {} };
}

// ── FIN DE TOUR ──────────────────────────────────────────────────
function hbAIEndTurn(enemy) {
  if (!HB || HB.over) return;
  if (enemy.spells) enemy.spells.forEach(function(sp) { if ((sp.cd || 0) > 0) sp.cd--; });
  renderHexBattle();
  setTimeout(function() { HB.turnIdx++; hbNextTurn(); }, HB_CFG.AI_DELAY);
}

// ── EXÉCUTER UN SORT ─────────────────────────────────────────────
function hbAIExecuteAttack(enemy, sp, targetHex, cb) {
  if (!HB || HB.over || !enemy.alive) { if (cb) cb(); return; }
  var target = hbUnitAt(targetHex);
  if (!target && !sp.invoc) { if (cb) cb(); return; }

  enemy.pa -= (sp.pa || 4);
  sp.cd = sp.cdMax || 0;
  var facing = hbFacingTo(enemy.pos, targetHex);
  if (facing) enemy.facing = facing;
  enemy._attackAnim = Date.now() + 700;

  hbApplySpell(enemy, sp, targetHex);

  if (target) {
    hbCheckDeath(target);
    if (hbCheckEnd()) return;
  }
  renderHexBattle();
  if (cb) cb();
}

// ── ATTAQUE DE BASE (adjacente) ──────────────────────────────────
function hbAIBasicAttack(enemy, target, cb) {
  if (!HB || HB.over || !enemy.alive) { if (cb) cb(); return; }
  if (!target || !target.alive) { if (cb) cb(); return; }
  if (HB_HEX.dist(enemy.pos, target.pos) > 1 || enemy.pa < HB_CFG.PA_BASIC_ATK) {
    if (cb) cb(); return;
  }
  enemy.pa -= HB_CFG.PA_BASIC_ATK;
  var facing = hbFacingTo(enemy.pos, target.pos);
  if (facing) enemy.facing = facing;
  enemy._attackAnim = Date.now() + 700;

  hbAnimAttack(enemy.pos, target.pos, enemy.col || '#ff6b35', function() {
    if (!HB || HB.over) return;
    var dmg = Math.max(1, Math.floor(enemy.atk * (1 + hbGetEff(enemy, 'atkBuf'))));
    hbDamage(target, dmg, enemy, null);
    hbLog('👾 ' + enemy.name + ' frappe ' + target.name + ' −' + dmg + ' PV');
    hbCheckDeath(target);
    if (hbCheckEnd()) return;
    renderHexBattle();
    if (cb) cb();
  });
}

// ── PHASE DE DÉPLACEMENT ─────────────────────────────────────────
function hbAIDoMovePhase(enemy, destHex, cb) {
  if (!HB || HB.over || !enemy.alive || !destHex || enemy.pm <= 0) {
    if (cb) cb(); return;
  }
  if (hEq(enemy.pos, destHex)) { if (cb) cb(); return; }

  // Tacle joueur (repris de l'IA originale)
  if (typeof P !== 'undefined' && (P.tacle || 0) > 0 &&
      HB_HEX.dist(enemy.pos, HB.player.pos) === 1) {
    if (Math.random() < P.tacle / 100) {
      enemy.pm = 0;
      hbLog('⚡ ' + enemy.name + ' taclé !');
      if (hbSpawnFloating) hbSpawnFloating(enemy.pos, 'TACLÉ!', '#22d3ee');
      if (cb) cb(); return;
    }
  }

  var path  = hbPath(enemy.pos, destHex, enemy);
  var steps = Math.min(enemy.pm, path.length);
  if (steps <= 0) { if (cb) cb(); return; }

  var walkPath = path.slice(0, steps);
  enemy.pm -= steps;
  if (HB._aiState) HB._aiState.reservedHexes[hKey(walkPath[walkPath.length - 1])] = true;

  hbAnimateUnit(enemy, walkPath, function() {
    if (!HB || HB.over) return;
    renderHexBattle();
    if (cb) cb();
  });
}

// ── MEILLEURE ATTAQUE EXÉCUTABLE ────────────────────────────────
// Cherche parmi TOUTES les cibles valides la meilleure attaque qui peut être
// lancée immédiatement (portée + PA + CD). Utilisé en post-déplacement pour
// ne pas rater une invocation adjacente quand la cible principale est hors portée.
function hbAIGetBestAttack(enemy, role) {
  var targets = hbGetValidTargets(enemy);
  var best = null, bestSp = null, bestScore = -Infinity;
  targets.forEach(function(t) {
    if (!t.unit || !t.unit.alive) return;
    var tBonus = t.unit.isInvoc ? 0 : 50;
    // Sorts utilisables sur cette cible
    var usable = hbGetUsableSpells(enemy, t.unit);
    usable.forEach(function(sp) {
      var sc = hbAIScoreSpell(enemy, sp, t.unit);
      if (sc === -Infinity) return;
      sc += tBonus;
      if (sc > bestScore) { bestScore = sc; best = t.unit; bestSp = sp; }
    });
    // Attaque de base si adjacent
    if (t.dist <= 1 && enemy.pa >= HB_CFG.PA_BASIC_ATK) {
      var hpPct = t.unit.hp / (t.unit.mHp || 1);
      var sc = (1 - hpPct) * 40 + 25 + tBonus;
      if (sc > bestScore) { bestScore = sc; best = t.unit; bestSp = null; }
    }
  });
  return { target: best, spell: bestSp };
}

// ================================================================
// PIPELINES PAR RÔLE
// ================================================================

// ── DPS ──────────────────────────────────────────────────────────
function hbAIDpsBehavior(enemy, endTurn) {
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'dps', targets);
  if (!target) { endTurn(); return; }

  var sp = hbGetBestSpell(enemy, target);

  function _phase1(cb) {
    if (!HB || HB.over || !enemy.alive) return;
    if (sp) {
      hbAIExecuteAttack(enemy, sp, target.pos, function() {
        if (!HB || HB.over || !enemy.alive) return;
        hbAIBasicAttack(enemy, target, cb);
      });
    } else {
      hbAIBasicAttack(enemy, target, cb);
    }
  }

  _phase1(function() {
    if (!HB || HB.over || !enemy.alive) return;
    setTimeout(function() {
      if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
      var t2   = hbAIScoreTargets(enemy, 'dps', hbGetValidTargets(enemy));
      var sp2  = hbGetBestSpell(enemy, t2);
      var dest = hbPickBestPosition(enemy, 'dps', t2, sp2);
      hbAIDoMovePhase(enemy, dest, function() {
        if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
        var att3 = hbAIGetBestAttack(enemy, 'dps');
        if      (att3.spell && att3.target) hbAIExecuteAttack(enemy, att3.spell, att3.target.pos, endTurn);
        else if (att3.target)               hbAIBasicAttack(enemy, att3.target, endTurn);
        else                                endTurn();
      });
    }, HB_CFG.AI_DELAY);
  });
}

// ── TANK ─────────────────────────────────────────────────────────
function hbAITankBehavior(enemy, endTurn) {
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'tank', targets);
  if (!target) { endTurn(); return; }

  var sp = hbGetBestSpell(enemy, target);

  function _attack(cb) {
    if (sp) {
      hbAIExecuteAttack(enemy, sp, target.pos, function() {
        if (!HB || HB.over || !enemy.alive) return;
        hbAIBasicAttack(enemy, target, cb);
      });
    } else {
      hbAIBasicAttack(enemy, target, cb);
    }
  }

  _attack(function() {
    setTimeout(function() {
      if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
      var t2   = hbAIScoreTargets(enemy, 'tank', hbGetValidTargets(enemy));
      var dest = hbPickBestPosition(enemy, 'tank', t2, null);
      hbAIDoMovePhase(enemy, dest, function() {
        if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
        var att3 = hbAIGetBestAttack(enemy, 'tank');
        if (att3.target) hbAIBasicAttack(enemy, att3.target, endTurn);
        else             endTurn();
      });
    }, HB_CFG.AI_DELAY);
  });
}

// ── MAGE ─────────────────────────────────────────────────────────
function hbAIMageBehavior(enemy, endTurn) {
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'mage', targets);
  if (!target) { endTurn(); return; }

  var sp = hbGetBestSpell(enemy, target);

  function _shoot(cb) {
    if (!sp || !HB || HB.over || !enemy.alive) { if (cb) cb(); return; }
    hbAIExecuteAttack(enemy, sp, target.pos, function() {
      if (!HB || HB.over || !enemy.alive) return;
      var sp2 = hbGetBestSpell(enemy, target);
      if (sp2) hbAIExecuteAttack(enemy, sp2, target.pos, cb);
      else if (cb) cb();
    });
  }

  _shoot(function() {
    setTimeout(function() {
      if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
      var bestRange = 1;
      if (enemy.spells) enemy.spells.forEach(function(s) { if (s.range > bestRange) bestRange = s.range; });
      var t2   = hbAIScoreTargets(enemy, 'mage', hbGetValidTargets(enemy));
      var dest = hbPickBestPosition(enemy, 'mage', t2, { range: bestRange });
      hbAIDoMovePhase(enemy, dest, function() {
        if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
        var att3 = hbAIGetBestAttack(enemy, 'mage');
        if (att3.spell && att3.target) hbAIExecuteAttack(enemy, att3.spell, att3.target.pos, endTurn);
        else                           endTurn();
      });
    }, HB_CFG.AI_DELAY);
  });
}

// ── ASSASSIN (rush → combo → kite) ──────────────────────────────
function hbAIAssassinBehavior(enemy, endTurn) {
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'assassin', targets);
  if (!target) { endTurn(); return; }

  var sp0  = hbGetBestSpell(enemy, target) || { range: 1 };
  var dest = hbPickBestPosition(enemy, 'assassin', target, sp0);

  hbAIDoMovePhase(enemy, dest, function() {
    if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
    var t2 = hbAIScoreTargets(enemy, 'assassin', hbGetValidTargets(enemy));
    if (!t2) { endTurn(); return; }

    function _combo(cb) {
      if (!HB || HB.over || !enemy.alive || !t2.alive) { cb(); return; }
      var spC = hbGetBestSpell(enemy, t2);
      if (spC) {
        hbAIExecuteAttack(enemy, spC, t2.pos, function() {
          setTimeout(function() { _combo(cb); }, HB_CFG.AI_DELAY / 3);
        });
      } else {
        hbAIBasicAttack(enemy, t2, cb);
      }
    }

    _combo(function() {
      if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
      setTimeout(function() {
        if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
        var kiteHex = hbFindKiteHex(enemy, t2);
        if (kiteHex) hbAIDoMovePhase(enemy, kiteHex, endTurn);
        else endTurn();
      }, HB_CFG.AI_DELAY / 2);
    });
  });
}

// ── SUPPORT ──────────────────────────────────────────────────────
function hbAISupportBehavior(enemy, endTurn) {
  var woundedAlly = hbGetWoundedAlly(enemy);

  if (woundedAlly && enemy.spells) {
    var alreadyHealed = HB._aiState && HB._aiState.healedThisTurn[woundedAlly.id];
    var healSp = null;
    if (!alreadyHealed) {
      enemy.spells.forEach(function(sp) {
        if ((sp.cd || 0) > 0) return;
        if (enemy.pa < (sp.pa || 4)) return;
        if (sp.invoc) return;
        if ((sp.minRange || 0) > 0) return;
        if (HB_HEX.dist(enemy.pos, woundedAlly.pos) > sp.range) return;
        if (!healSp || (sp.pwr || 0) > (healSp.pwr || 0)) healSp = sp;
      });
    }
    if (healSp) {
      if (HB._aiState) HB._aiState.healedThisTurn[woundedAlly.id] = true;
      hbAIExecuteAttack(enemy, healSp, woundedAlly.pos, function() {
        if (!HB || HB.over || !enemy.alive) return;
        var t = hbAIScoreTargets(enemy, 'support', hbGetValidTargets(enemy));
        var sp2 = hbGetBestSpell(enemy, t);
        if (sp2 && t) hbAIExecuteAttack(enemy, sp2, t.pos, endTurn);
        else endTurn();
      });
      return;
    }
  }

  hbAIDpsBehavior(enemy, endTurn);
}

// ── INVOCATEUR ───────────────────────────────────────────────────
function hbAIInvocBehavior(enemy, endTurn) {
  var hpPct   = enemy.hp / (enemy.mHp || 1);
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'invocateur', targets);

  if (hpPct < 0.30 && enemy.pm > 0 && target) {
    var fleeHex = hbFindKiteHex(enemy, target);
    hbAIDoMovePhase(enemy, fleeHex, function() {
      if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
      _tryInvoc(endTurn);
    });
    return;
  }

  _tryInvoc(endTurn);

  function _tryInvoc(cb) {
    if (!HB || HB.over || !enemy.alive) { cb(); return; }
    var invocSp = null;
    if (enemy.spells) enemy.spells.forEach(function(sp) {
      if (!sp.invoc) return;
      if ((sp.cd || 0) > 0 || enemy.pa < (sp.pa || 4)) return;
      var _maxI = sp.maxInvoc || 1;
      var _curI = HB.units.filter(function(u) {
        return u.alive && u.isInvoc && u.invocOwner === enemy.id;
      }).length;
      if (_curI < _maxI) invocSp = sp;
    });
    if (invocSp) {
      var spawnHex = null;
      HB_HEX.neighbors(enemy.pos).forEach(function(nb) {
        if (!spawnHex && hbIsWalkable(nb, null)) spawnHex = nb;
      });
      if (spawnHex) {
        hbAIExecuteAttack(enemy, invocSp, spawnHex, function() {
          if (!HB || HB.over || !enemy.alive) return;
          setTimeout(function() { _attackPhase(cb); }, HB_CFG.AI_DELAY / 2);
        });
        return;
      }
    }
    _attackPhase(cb);
  }

  function _attackPhase(cb) {
    if (!HB || HB.over || !enemy.alive) { cb(); return; }
    var t  = hbAIScoreTargets(enemy, 'invocateur', hbGetValidTargets(enemy));
    var sp = hbGetBestSpell(enemy, t);
    if (sp && t) {
      hbAIExecuteAttack(enemy, sp, t.pos, cb);
    } else if (t) {
      setTimeout(function() {
        if (!HB || HB.over || !enemy.alive) { cb(); return; }
        var bestRange = 1;
        if (enemy.spells) enemy.spells.forEach(function(s) { if (s.range > bestRange) bestRange = s.range; });
        var dest = hbPickBestPosition(enemy, 'invocateur', t, { range: bestRange });
        hbAIDoMovePhase(enemy, dest, cb);
      }, HB_CFG.AI_DELAY);
    } else {
      cb();
    }
  }
}

// ── BOSS (phases agressif / défensif selon PV) ───────────────────
function hbAIBossBehavior(enemy, endTurn) {
  var hpPct   = enemy.hp / (enemy.mHp || 1);
  var targets = hbGetValidTargets(enemy);
  var target  = hbAIScoreTargets(enemy, 'boss', targets);
  if (!target) { endTurn(); return; }

  if (hpPct > 0.5) _bossAggressive();
  else             _bossDefensive();

  function _bossAggressive() {
    var usable = hbGetUsableSpells(enemy, target);
    usable.sort(function(a, b) {
      return hbAIScoreSpell(enemy, b, target) - hbAIScoreSpell(enemy, a, target);
    });
    function _castNext(idx, cb) {
      if (!HB || HB.over || !enemy.alive) return;
      if (idx >= usable.length || enemy.pa <= 0) { cb(); return; }
      hbAIExecuteAttack(enemy, usable[idx], target.pos, function() {
        setTimeout(function() { _castNext(idx + 1, cb); }, HB_CFG.AI_DELAY / 2);
      });
    }
    _castNext(0, function() {
      if (!HB || HB.over || !enemy.alive) return;
      hbAIBasicAttack(enemy, target, function() {
        setTimeout(function() {
          if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
          var t2   = hbAIScoreTargets(enemy, 'boss', hbGetValidTargets(enemy));
          var dest = hbPickBestPosition(enemy, 'dps', t2, null);
          hbAIDoMovePhase(enemy, dest, function() {
            if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
            var att3 = hbAIGetBestAttack(enemy, 'boss');
            if      (att3.spell && att3.target) hbAIExecuteAttack(enemy, att3.spell, att3.target.pos, endTurn);
            else if (att3.target)               hbAIBasicAttack(enemy, att3.target, endTurn);
            else                                endTurn();
          });
        }, HB_CFG.AI_DELAY);
      });
    });
  }

  function _bossDefensive() {
    var sp = hbGetBestSpell(enemy, target);
    if (sp && sp.range >= 2) {
      hbAIExecuteAttack(enemy, sp, target.pos, function() {
        if (!HB || HB.over || !enemy.alive) return;
        setTimeout(function() {
          if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
          var t2   = hbAIScoreTargets(enemy, 'boss', hbGetValidTargets(enemy));
          var dest = hbPickBestPosition(enemy, 'mage', t2, sp);
          hbAIDoMovePhase(enemy, dest, function() {
            if (!HB || HB.over || !enemy.alive) { endTurn(); return; }
            var att3 = hbAIGetBestAttack(enemy, 'boss');
            if (att3.spell && att3.target) hbAIExecuteAttack(enemy, att3.spell, att3.target.pos, endTurn);
            else                           endTurn();
          });
        }, HB_CFG.AI_DELAY);
      });
    } else {
      hbAIDpsBehavior(enemy, endTurn);
    }
  }
}

// ================================================================
// POINT D'ENTRÉE PRINCIPAL
// ================================================================
function hbAIMobTurn(enemy) {
  if (!HB || HB.over || !enemy || !enemy.alive) { hbNextTurn(); return; }

  hbAIInitRoundState();
  HB._aiState.reservedHexes[hKey(enemy.pos)] = true;

  var role = hbDetectRole(enemy);

  function endTurn() {
    if (!HB || HB.over) return;
    hbAIEndTurn(enemy);
  }

  switch (role) {
    case 'tank':       hbAITankBehavior(enemy, endTurn);      break;
    case 'assassin':   hbAIAssassinBehavior(enemy, endTurn);  break;
    case 'mage':       hbAIMageBehavior(enemy, endTurn);      break;
    case 'support':    hbAISupportBehavior(enemy, endTurn);   break;
    case 'invocateur': hbAIInvocBehavior(enemy, endTurn);     break;
    case 'boss':       hbAIBossBehavior(enemy, endTurn);      break;
    case 'dps':
    default:           hbAIDpsBehavior(enemy, endTurn);       break;
  }
}
