// ================================================================
// hexBattle.js — Mode Combat Hexagonal (Étape 1 : Grille + Rendu)
// ================================================================
// Dépendances globales lues depuis le jeu principal :
//   META, P, getH, spPwr, gainXP, fmt, escapeHtml, saveMeta,
//   navigate, updateTop
// Aucune modification des autres fichiers JS côté logique.
// ================================================================

// ── ÉTAT GLOBAL ─────────────────────────────────────────────────
var HB = null;  // état du combat hexagonal (null = pas de combat)

// Fallback local si ui.js n'est pas encore chargé
function hbEscape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// ── CONFIGURATION ────────────────────────────────────────────────
var HB_CFG = {
  MAP_RADIUS  : 3,     // rayon de la carte en hexs (rayon 3 = 37 cases)
 WEAPON_RANGE : 2,
  PM_PLAYER   : 3,     // points de mouvement joueur par tour
  PA_PLAYER   : 6,     // points d'action joueur par tour
  PM_ENEMY    : 2,
  PA_ENEMY    : 6,
  PA_BASIC_ATK: 4,     // coût PA attaque de base
  AI_DELAY    : 500,   // ms entre chaque action IA
  REWARD_CR_BASE  : 120,
  REWARD_XP_BASE  : 40,
};

// ── COORDONNÉES HEXAGONALES (système cube) ────────────────────────
// Layout isométrique vue 3/4 (flat-top compressé sur y)
// Conversion cube (q,r,s) ↔ pixel
var HB_HEX = (function() {
  var SIZE  = 36;    // rayon d'un hex
  var ISO   = 0.54;  // compression verticale (vue 3/4)
  var DEPTH = 10;    // hauteur du mur isométrique en px

  var DIRS = [
    {q:1,r:0,s:-1},{q:1,r:-1,s:0},{q:0,r:-1,s:1},
    {q:-1,r:0,s:1},{q:-1,r:1,s:0},{q:0,r:1,s:-1}
  ];

  // cube → pixel isométrique
  function toPixel(q, r, ox, oy) {
    var x = SIZE * (3/2 * q);
    var y = SIZE * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x: Math.round(x + ox), y: Math.round(y * ISO + oy) };
  }

  // pixel → cube (annule le squish ISO avant calcul)
  function fromPixel(px, py, ox, oy) {
    var x = px - ox;
    var y = (py - oy) / ISO;
    var q = (2/3 * x) / SIZE;
    var r = (-1/3 * x + Math.sqrt(3)/3 * y) / SIZE;
    var s = -q - r;
    var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    var dq = Math.abs(rq-q), dr = Math.abs(rr-r), ds = Math.abs(rs-s);
    if (dq > dr && dq > ds) rq = -rr-rs;
    else if (dr > ds) rr = -rq-rs;
    return { q: rq, r: rr, s: -rq-rr };
  }

  function dist(a, b) {
    return (Math.abs(a.q-b.q) + Math.abs(a.r-b.r) + Math.abs(a.s-b.s)) / 2;
  }

  function neighbors(h) {
    return DIRS.map(function(d){ return {q:h.q+d.q, r:h.r+d.r, s:h.s+d.s}; });
  }

  function hexesInRadius(R) {
    var result = [];
    for (var q = -R; q <= R; q++) {
      var r1 = Math.max(-R, -q-R), r2 = Math.min(R, -q+R);
      for (var r = r1; r <= r2; r++) {
        result.push({ q: q, r: r, s: -q-r });
      }
    }
    return result;
  }

  // Coins avec compression ISO sur y
  function corners(cx, cy) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var angle = Math.PI / 180 * (60 * i);
      pts.push({ x: cx + SIZE * Math.cos(angle),
                 y: cy + SIZE * Math.sin(angle) * ISO });
    }
    return pts;
  }

  // Grille rectangulaire : qR = demi-largeur, rR = demi-hauteur
  function hexesInBounds(qR, rR) {
    var R = Math.max(qR, rR);
    var result = [];
    for (var q = -R; q <= R; q++) {
      var r1 = Math.max(-R, -q-R), r2 = Math.min(R, -q+R);
      for (var r = r1; r <= r2; r++) {
        if (Math.abs(q) <= qR && Math.abs(r) <= rR)
          result.push({ q: q, r: r, s: -q-r });
      }
    }
    return result;
  }

  return { SIZE: SIZE, ISO: ISO, DEPTH: DEPTH, DIRS: DIRS,
           toPixel: toPixel, fromPixel: fromPixel,
           dist: dist, neighbors: neighbors, hexesInRadius: hexesInRadius,
           hexesInBounds: hexesInBounds, corners: corners };
}());

// ── CLÉ HEX ─────────────────────────────────────────────────────
function hKey(h) { return h.q + ',' + h.r; }
function hEq(a, b) { return a.q === b.q && a.r === b.r; }

// ── PATHFINDING BFS ──────────────────────────────────────────────
// Retourne les hexs atteignables en ≤ maxPM pas depuis `from`
// en évitant les hexs bloqués ou occupés (sauf exclure une unité)
function hbReachable(from, maxPM, excludeUnit) {
  var result = [], visited = {}, queue = [{ h: from, dist: 0 }];
  visited[hKey(from)] = true;
  while (queue.length) {
    var cur = queue.shift();
    if (cur.dist > 0) result.push(cur.h);
    if (cur.dist >= maxPM) continue;
    HB_HEX.neighbors(cur.h).forEach(function(nb) {
      var k = hKey(nb);
      if (visited[k]) return;
      if (!hbIsWalkable(nb, excludeUnit)) return;
      visited[k] = true;
      queue.push({ h: nb, dist: cur.dist + 1 });
    });
  }
  return result;
}

// BFS chemin complet de src à dst
function hbPath(src, dst, excludeUnit) {
  if (hEq(src, dst)) return [];
  var visited = {}, prev = {}, queue = [src];
  visited[hKey(src)] = true;
  while (queue.length) {
    var cur = queue.shift();
    if (hEq(cur, dst)) {
      // Reconstruit le chemin
      var path = [], k = hKey(dst);
      while (k && k !== hKey(src)) {
        var parts = k.split(',');
        var h = { q: +parts[0], r: +parts[1], s: -parts[0]-parts[1] };
        path.unshift(h);
        k = prev[k];
      }
      return path;
    }
    HB_HEX.neighbors(cur).forEach(function(nb) {
      var k = hKey(nb);
      if (visited[k]) return;
      if (!hbIsWalkable(nb, excludeUnit) && !hEq(nb, dst)) return;
      visited[k] = true;
      prev[k] = hKey(cur);
      queue.push(nb);
    });
  }
  return [];
}

// ── HELPERS ÉTAT ─────────────────────────────────────────────────
function hbIsWalkable(h, excludeUnit) {
  if (!HB) return false;
  // Doit être une case valide de la carte
  if (!HB.hexMap[hKey(h)]) return false;
  // Obstacle
  if (HB.hexMap[hKey(h)].obstacle) return false;
  // Occupé par une unité vivante
  return !HB.units.some(function(u) {
    return u.alive && u !== excludeUnit && hEq(u.pos, h);
  });
}

function hbUnitAt(h) {
  if (!HB) return null;
  return HB.units.find(function(u){ return u.alive && hEq(u.pos, h); }) || null;
}

// ── LIGNE DE VUE (raycast cube lerp) ─────────────────────────────
// Retourne true si le chemin from→to est dégagé.
// blockUnits=true : les unités vivantes intermédiaires bloquent aussi.
function hbHasLOS(from, to, blockUnits) {
  var N = HB_HEX.dist(from, to);
  if (N === 0) return true;
  for (var i = 1; i < N; i++) {
    var t  = i / N;
    // Nudge epsilon pour éviter les cas d'arête ambigus
    var q  = from.q*(1-t) + to.q*t + 1e-6;
    var r  = from.r*(1-t) + to.r*t + 1e-6;
    var s  = from.s*(1-t) + to.s*t - 2e-6;
    var rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    var dq = Math.abs(rq-q), dr = Math.abs(rr-r), ds = Math.abs(rs-s);
    if (dq>dr&&dq>ds) rq=-rr-rs; else if (dr>ds) rr=-rq-rs; else rs=-rq-rr;
    var cell = HB.hexMap[hKey({q:rq,r:rr,s:rs})];
    // seuls les murs ('wall') coupent la ligne de vue ; les trous ('pit') laissent passer
    if (!cell || (cell.obstacle && cell.obstacleType !== 'pit')) return false;
    if (blockUnits) {
      var occ = hbUnitAt({q:rq,r:rr,s:rs});
      if (occ) return false;
    }
  }
  return true;
}

function hbLog(msg) {
  if (!HB) return;
  HB.log.unshift(msg);
  if (HB.log.length > 30) HB.log.pop();
}
function hbToggleInfo(id){
  var u=HB&&HB.enemies.find(function(x){return x.id===id;});
  HB.infoUnit=(HB.infoUnit===u?null:u);
  renderHexHUD();
}
function hbRenderInfoPanel() {
  var el = document.getElementById('hb-info-panel');
  if (!el) return;
  if (!HB || !HB.infoUnit || !HB.infoUnit.alive) {
    el.style.display = 'none';
    return;
  }
  var u = HB.infoUnit;
  el.style.display = 'block';
  var lvlStr = u.mobLv ? ' · Lvl ' + u.mobLv : (u.isPlayer ? ' · Lvl ' + (META.hero.lv||1) : '');
  var esqPct = u.esq > 0 ? Math.round(u.esq*100)+'%' : '0%';
  var thornStr = u.thorn > 0 ? Math.round(u.thorn*100)+'%' : null;
  var resPlas = u.resPlas > 0 ? Math.round(u.resPlas*100)+'%' : null;
  var resNeon = u.resNeon > 0 ? Math.round(u.resNeon*100)+'%' : null;
  var resGlitch = u.resGlitch > 0 ? Math.round(u.resGlitch*100)+'%' : null;
  var bossTag = u.boss ? '<span style="font-size:.55rem;color:var(--gold);background:rgba(251,191,36,.15);border-radius:4px;padding:0 4px;margin-left:4px">BOSS</span>' : '';
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-weight:700;font-size:.78rem;color:var(--text)">'+hbEscape(u.name)+bossTag+'</div>'
    +'<div style="font-size:.58rem;color:'+u.col+'">'+u.id.split('_')[0]+lvlStr+'</div>'
    +'</div>'
    +'<span onclick="HB.infoUnit=null;hbRenderInfoPanel()" style="cursor:pointer;color:var(--text4);font-size:1.1rem;line-height:1">✕</span>'
    +'</div>'
    +'<div style="font-size:.65rem;color:var(--text3);display:flex;flex-direction:column;gap:2px">'
    +'<div>♥ PV : '+Math.round(u.hp)+' / '+Math.round(u.mHp)+'</div>'
    +'<div>⚡ PM : '+u.pmMax+' · PA : '+u.paMax+' · Esq : '+esqPct+'</div>'
    +(thornStr?'<div>↩ Thorn : '+thornStr+'</div>':'')
    +((resPlas||resNeon||resGlitch)?'<div style="color:var(--cyan)">🛡 '+(resPlas?'Plas:'+resPlas+' ':'')+''+(resNeon?'Neon:'+resNeon+' ':'')+''+(resGlitch?'Glt:'+resGlitch:'')+'</div>':'')
    +(u.effs&&u.effs.length?'<div style="color:var(--gold)">'+u.effs.map(function(e){return(e.label||e.type)+'('+e.turns+'t)';}).join(' · ')+'</div>':'')
    +'</div>';
}
function hbCurrentUnit() {
  if (!HB) return null;
  return HB.units[HB.turnIdx % HB.units.length];
}

// ── CONSTRUCTION DE LA CARTE ──────────────────────────────────────
// ── DÉFINITIONS DES MAPS ──────────────────────────────────────────
var HB_MAP_DEFS = {

  // MAP 1 — Couloir industriel
  // qR=2 (4 cases large) rR=4 (8 cases haut) — format portrait téléphone
  'corridor': {
    qR: 3, rR: 6,   // +50% (était 2,4)
    bgImage: 'assets/hexmaps/corridor.png',
    // Spawns intérieurs: rR-1=5 (bord rR=6 est mur), 6 cases par camp
    playerSpawns: [{q:-2,r:5},{q:-1,r:5},{q:0,r:5},{q:1,r:5},{q:2,r:5},{q:0,r:4}],
    enemySpawns:  [{q:-2,r:-5},{q:-1,r:-5},{q:0,r:-5},{q:1,r:-5},{q:2,r:-5},{q:0,r:-4}],
    obstacles: [
      // Murs centraux (scalés x1.5)
      {q:0,r:-2,type:'wall'},{q:0,r:-1,type:'wall'},{q:0,r:0,type:'wall'},{q:0,r:1,type:'wall'},{q:0,r:2,type:'wall'},
      // Obstacles latéraux
      {q:2,r:-4,type:'wall'},{q:-2,r:4,type:'pit'},
    ],
    terrain: function(h, qR, rR) {
      if (Math.abs(h.q)===qR || Math.abs(h.r)===rR) return 'edge';
      if (h.q === 0) return 'energy';
      return 'metal';
    }
  },

  // MAP 2 — Place ouverte (un peu plus large)
  'plaza': {
    qR: 5, rR: 6,   // +50% (était 3,4 → arrondi 4.5→5, 6)
    bgImage: 'assets/hexmaps/plaza.png',
    playerSpawns: [{q:-3,r:5},{q:-2,r:5},{q:-1,r:5},{q:0,r:5},{q:1,r:5},{q:2,r:5}],
    enemySpawns:  [{q:-3,r:-5},{q:-2,r:-5},{q:-1,r:-5},{q:0,r:-5},{q:1,r:-5},{q:2,r:-5}],
    obstacles: [
      // Obstacles scalés x1.5
      {q:3,r:-3,type:'wall'},{q:-3,r:3,type:'wall'},
      {q:3,r:0,type:'wall'},{q:-3,r:0,type:'wall'},
      {q:0,r:3,type:'pit'},{q:0,r:-3,type:'pit'},
    ],
    terrain: function(h, qR, rR) {
      if (Math.abs(h.q)===qR || Math.abs(h.r)===rR) return 'edge';
      if (Math.abs(h.q)<=2 && Math.abs(h.r)<=2) return 'energy';
      return 'metal';
    }
  },

  // MAP 3 — Toits cyberpunk
  'rooftops': {
    qR: 3, rR: 6,   // +50% (était 2,4)
    bgImage: 'assets/hexmaps/rooftops.png',
    playerSpawns: [{q:-2,r:5},{q:-1,r:5},{q:0,r:5},{q:1,r:5},{q:2,r:5},{q:0,r:4}],
    enemySpawns:  [{q:-2,r:-5},{q:-1,r:-5},{q:0,r:-5},{q:1,r:-5},{q:2,r:-5},{q:0,r:-4}],
    obstacles: [
      // Obstacles scalés x1.5
      {q:2,r:-3,type:'wall'},{q:3,r:-2,type:'wall'},
      {q:-2,r:3,type:'pit'},{q:-3,r:2,type:'pit'},
      {q:2,r:2,type:'wall'},{q:1,r:2,type:'wall'},
    ],
    terrain: function(h, qR, rR) {
      if (Math.abs(h.q)===qR || Math.abs(h.r)===rR) return 'edge';
      if (Math.random() < 0.07) return 'energy';
      return 'metal';
    }
  },
  // MAP 4 — Ruelle Néon (corridor2)
  // Bâtiments denses des deux côtés, corridor central pavé
  'corridor2': {
    qR: 6, rR: 12,
    bgImage: 'assets/hexmaps/corridor2.png',
    spawns: [{q:-1,r:9},{q:0,r:9},{q:1,r:9},{q:0,r:8}],
    enemySpawns: [{q:-2,r:-8},{q:-1,r:-8},{q:1,r:-8},{q:2,r:-8}],
    obstacles: [
      // BLOC HAUT (kaffe/hotel/fleurs)
      {q:-6,r:-12,type:'wall'},{q:-5,r:-12,type:'wall'},{q:-4,r:-12,type:'wall'},{q:-3,r:-12,type:'wall'},{q:-2,r:-12,type:'wall'},{q:-1,r:-12,type:'wall'},{q:0,r:-12,type:'wall'},{q:1,r:-12,type:'wall'},{q:2,r:-12,type:'wall'},{q:3,r:-12,type:'wall'},{q:4,r:-12,type:'wall'},{q:5,r:-12,type:'wall'},{q:6,r:-12,type:'wall'},
      {q:-6,r:-11,type:'wall'},{q:-5,r:-11,type:'wall'},{q:-4,r:-11,type:'wall'},{q:-3,r:-11,type:'wall'},{q:-2,r:-11,type:'wall'},{q:-1,r:-11,type:'wall'},{q:0,r:-11,type:'wall'},{q:1,r:-11,type:'wall'},{q:2,r:-11,type:'wall'},{q:3,r:-11,type:'wall'},{q:4,r:-11,type:'wall'},{q:5,r:-11,type:'wall'},{q:6,r:-11,type:'wall'},
      {q:-6,r:-10,type:'wall'},{q:-5,r:-10,type:'wall'},{q:-4,r:-10,type:'wall'},{q:-3,r:-10,type:'wall'},{q:-2,r:-10,type:'wall'},{q:-1,r:-10,type:'wall'},{q:0,r:-10,type:'wall'},{q:1,r:-10,type:'wall'},{q:2,r:-10,type:'wall'},{q:3,r:-10,type:'wall'},{q:4,r:-10,type:'wall'},{q:5,r:-10,type:'wall'},{q:6,r:-10,type:'wall'},
      {q:-6,r:-9,type:'wall'},{q:-5,r:-9,type:'wall'},{q:-4,r:-9,type:'wall'},{q:-3,r:-9,type:'wall'},{q:3,r:-9,type:'wall'},{q:4,r:-9,type:'wall'},{q:5,r:-9,type:'wall'},{q:6,r:-9,type:'wall'},
      // BATIMENTS GAUCHE (修理屋/メカニック)
      {q:-6,r:-8,type:'wall'},{q:-5,r:-8,type:'wall'},{q:-4,r:-8,type:'wall'},{q:-3,r:-8,type:'wall'},
      {q:-6,r:-7,type:'wall'},{q:-5,r:-7,type:'wall'},{q:-4,r:-7,type:'wall'},{q:-3,r:-7,type:'wall'},
      {q:-6,r:-6,type:'wall'},{q:-5,r:-6,type:'wall'},{q:-4,r:-6,type:'wall'},{q:-3,r:-6,type:'wall'},
      {q:-6,r:-5,type:'wall'},{q:-5,r:-5,type:'wall'},{q:-4,r:-5,type:'wall'},{q:-3,r:-5,type:'wall'},
      {q:-6,r:-4,type:'wall'},{q:-5,r:-4,type:'wall'},{q:-4,r:-4,type:'wall'},{q:-3,r:-4,type:'wall'},
      {q:-6,r:-3,type:'wall'},{q:-5,r:-3,type:'wall'},{q:-4,r:-3,type:'wall'},{q:-3,r:-3,type:'wall'},
      {q:-6,r:-2,type:'wall'},{q:-5,r:-2,type:'wall'},{q:-4,r:-2,type:'wall'},{q:-3,r:-2,type:'wall'},
      {q:-6,r:-1,type:'wall'},{q:-5,r:-1,type:'wall'},{q:-4,r:-1,type:'wall'},{q:-3,r:-1,type:'wall'},
      {q:-6,r:0,type:'wall'},{q:-5,r:0,type:'wall'},{q:-4,r:0,type:'wall'},{q:-3,r:0,type:'wall'},
      {q:-6,r:1,type:'wall'},{q:-5,r:1,type:'wall'},{q:-4,r:1,type:'wall'},{q:-3,r:1,type:'wall'},
      {q:-6,r:2,type:'wall'},{q:-5,r:2,type:'wall'},{q:-4,r:2,type:'wall'},{q:-3,r:2,type:'wall'},
      {q:-6,r:3,type:'wall'},{q:-5,r:3,type:'wall'},{q:-4,r:3,type:'wall'},{q:-3,r:3,type:'wall'},
      {q:-6,r:4,type:'wall'},{q:-5,r:4,type:'wall'},{q:-4,r:4,type:'wall'},
      {q:-6,r:5,type:'wall'},{q:-5,r:5,type:'wall'},{q:-4,r:5,type:'wall'},
      {q:-6,r:6,type:'wall'},{q:-5,r:6,type:'wall'},{q:-4,r:6,type:'wall'},
      // BATIMENTS DROITE (武器商人/薬局)
      {q:3,r:-8,type:'wall'},{q:4,r:-8,type:'wall'},{q:5,r:-8,type:'wall'},{q:6,r:-8,type:'wall'},
      {q:3,r:-7,type:'wall'},{q:4,r:-7,type:'wall'},{q:5,r:-7,type:'wall'},{q:6,r:-7,type:'wall'},
      {q:3,r:-6,type:'wall'},{q:4,r:-6,type:'wall'},{q:5,r:-6,type:'wall'},{q:6,r:-6,type:'wall'},
      {q:3,r:-5,type:'wall'},{q:4,r:-5,type:'wall'},{q:5,r:-5,type:'wall'},{q:6,r:-5,type:'wall'},
      {q:3,r:-4,type:'wall'},{q:4,r:-4,type:'wall'},{q:5,r:-4,type:'wall'},{q:6,r:-4,type:'wall'},
      {q:3,r:-3,type:'wall'},{q:4,r:-3,type:'wall'},{q:5,r:-3,type:'wall'},{q:6,r:-3,type:'wall'},
      {q:3,r:-2,type:'wall'},{q:4,r:-2,type:'wall'},{q:5,r:-2,type:'wall'},{q:6,r:-2,type:'wall'},
      {q:3,r:-1,type:'wall'},{q:4,r:-1,type:'wall'},{q:5,r:-1,type:'wall'},{q:6,r:-1,type:'wall'},
      {q:3,r:0,type:'wall'},{q:4,r:0,type:'wall'},{q:5,r:0,type:'wall'},{q:6,r:0,type:'wall'},
      {q:3,r:1,type:'wall'},{q:4,r:1,type:'wall'},{q:5,r:1,type:'wall'},{q:6,r:1,type:'wall'},
      {q:3,r:2,type:'wall'},{q:4,r:2,type:'wall'},{q:5,r:2,type:'wall'},{q:6,r:2,type:'wall'},
      {q:3,r:3,type:'wall'},{q:4,r:3,type:'wall'},{q:5,r:3,type:'wall'},{q:6,r:3,type:'wall'},
      {q:4,r:4,type:'wall'},{q:5,r:4,type:'wall'},{q:6,r:4,type:'wall'},
      {q:4,r:5,type:'wall'},{q:5,r:5,type:'wall'},{q:6,r:5,type:'wall'},
      {q:4,r:6,type:'wall'},{q:5,r:6,type:'wall'},{q:6,r:6,type:'wall'},
      // REVERBERES (lampadaires dans la rue)
      {q:0,r:-5,type:'wall'},{q:-1,r:1,type:'wall'},{q:1,r:7,type:'wall'},
      // BLOC BAS (データセンター/メカニック bas)
      {q:-6,r:7,type:'wall'},{q:-5,r:7,type:'wall'},{q:-4,r:7,type:'wall'},{q:-3,r:7,type:'wall'},
      {q:3,r:7,type:'wall'},{q:4,r:7,type:'wall'},{q:5,r:7,type:'wall'},{q:6,r:7,type:'wall'},
      {q:-6,r:8,type:'wall'},{q:-5,r:8,type:'wall'},{q:-4,r:8,type:'wall'},{q:-3,r:8,type:'wall'},
      {q:3,r:8,type:'wall'},{q:4,r:8,type:'wall'},{q:5,r:8,type:'wall'},{q:6,r:8,type:'wall'},
      {q:-6,r:9,type:'wall'},{q:-5,r:9,type:'wall'},{q:-4,r:9,type:'wall'},{q:-3,r:9,type:'wall'},
      {q:3,r:9,type:'wall'},{q:4,r:9,type:'wall'},{q:5,r:9,type:'wall'},{q:6,r:9,type:'wall'},
      {q:-6,r:10,type:'wall'},{q:-5,r:10,type:'wall'},{q:-4,r:10,type:'wall'},{q:-3,r:10,type:'wall'},{q:-2,r:10,type:'wall'},{q:-1,r:10,type:'wall'},
      {q:1,r:10,type:'wall'},{q:2,r:10,type:'wall'},{q:3,r:10,type:'wall'},{q:4,r:10,type:'wall'},{q:5,r:10,type:'wall'},{q:6,r:10,type:'wall'},
      {q:-6,r:11,type:'wall'},{q:-5,r:11,type:'wall'},{q:-4,r:11,type:'wall'},{q:-3,r:11,type:'wall'},{q:-2,r:11,type:'wall'},{q:-1,r:11,type:'wall'},{q:0,r:11,type:'wall'},{q:1,r:11,type:'wall'},{q:2,r:11,type:'wall'},{q:3,r:11,type:'wall'},{q:4,r:11,type:'wall'},{q:5,r:11,type:'wall'},{q:6,r:11,type:'wall'},
      {q:-6,r:12,type:'wall'},{q:-5,r:12,type:'wall'},{q:-4,r:12,type:'wall'},{q:-3,r:12,type:'wall'},{q:-2,r:12,type:'wall'},{q:-1,r:12,type:'wall'},{q:0,r:12,type:'wall'},{q:1,r:12,type:'wall'},{q:2,r:12,type:'wall'},{q:3,r:12,type:'wall'},{q:4,r:12,type:'wall'},{q:5,r:12,type:'wall'},{q:6,r:12,type:'wall'},
    ],
    terrain: function(h, qR, rR) {
      if (Math.abs(h.q) === qR || Math.abs(h.r) === rR) return 'edge';
      if (Math.abs(h.q) <= 2) return 'energy';
      return 'metal';
    }
  },

};

function hbBuildMap(mapDef) {
  var def  = (typeof mapDef === 'string') ? HB_MAP_DEFS[mapDef] : mapDef;
  if (!def) def = HB_MAP_DEFS['corridor'];
  var qR   = def.qR !== undefined ? def.qR : (def.radius || HB_CFG.MAP_RADIUS);
  var rR   = def.rR !== undefined ? def.rR : (def.radius || HB_CFG.MAP_RADIUS);
  var hexes = HB_HEX.hexesInBounds(qR, rR);
  var map   = {};
  // obsMap : coordonnees → type ('wall' ou 'pit')
  var obsMap = {};
  (def.obstacles||[]).forEach(function(o){ obsMap[o.q+','+o.r] = o.type || 'wall'; });
  hexes.forEach(function(h) {
    var isEdgeBorder = (Math.abs(h.q) === qR || Math.abs(h.r) === rR);
    var obsType = obsMap[h.q+','+h.r] || null;
    var terrain = isEdgeBorder ? 'edge' : (def.terrain ? def.terrain(h, qR, rR) : 'metal');
    map[hKey(h)] = {
      q:h.q, r:h.r, s:h.s,
      obstacle: !!obsType,
      obstacleType: obsType,
      terrain: terrain
    };
  });
  return map;
}

// ── CONSTRUCTION DES UNITÉS ───────────────────────────────────────
function hbMakePlayer() {
  var _wItem = META.eq && META.eq.arme && typeof byUid === 'function' ? byUid(META.eq.arme) : null;
  var _wDmgType = (_wItem && _wItem.arme) ? (_wItem.arme.dmgType || 'Negate') : 'Negate';
  return {
    id       : 'player',
    isPlayer : true,
    name     : META.hero.name || getH(META.heroId).name,
    icon     : '⚔️',
    col      : '#00d4ff',
    hp       : P.mHp, mHp: P.mHp,
    sh       : 0, mSh: 0,
    atk      : P.atk,
    pm: (P.pm || HB_CFG.PM_PLAYER), pmMax: (P.pm || HB_CFG.PM_PLAYER),
    pa: (P.pa || HB_CFG.PA_PLAYER), paMax: (P.pa || HB_CFG.PA_PLAYER),
    init     : P.init || 100,
    weapDmgType: _wDmgType,
    thorn    : P.thorn || 0,
    resPlas  : P.resPlas || 0, resNeon: P.resNeon || 0,
    resGlitch: P.resGlitch || 0, resNegate: P.resNegate || 0,
    effs     : [],
    alive    : true,
    pos      : { q: -2, r: 2, s: 0 },
    spells   : hbGetActiveSpells(),
  };
}

function hbGetActiveSpells() {
  var heroId  = META.heroId || 'berserker';
  var spTree  = (META.hero && META.hero.spTree)          || {};
  var equipped= (META.hero && META.hero.equippedSpells)  || [];
  var trees   = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[heroId]) || [];
  var nodeMap = {};  // id → {tree, node}
  trees.forEach(function(t){ t.nodes.forEach(function(nd){ nodeMap[nd.id]={tree:t,node:nd}; }); });

  // Construire la liste à partir des sorts équipés
  var result = [];
  equipped.forEach(function(nid) {
    var rawLv = spTree[nid];
    // Compat: old saves stored true (bool), new stores level number
    var lv = typeof rawLv === 'boolean' ? (rawLv ? 1 : 0) : (rawLv || 0);
    if (!lv) return;
    var r = nodeMap[nid];
    if (!r || r.node.passive) return;
    var nd = r.node;
    var s = (nd.lvStats && lv >= 1 && nd.lvStats[lv - 1]) || {};
    result.push({
      id       : nd.id,
      name     : nd.name,
      type     : nd.type     || 'burst',
      pwr      : (s.dmgMin !== undefined ? (s.dmgMin + (s.dmgMax !== undefined ? s.dmgMax : s.dmgMin)) / 2 : (nd.dmgMin ? (nd.dmgMin + nd.dmgMax) / 2 : 8)) / 10,
      dmgMin   : s.dmgMin   !== undefined ? s.dmgMin   : (nd.dmgMin   || 0),
      dmgMax   : s.dmgMax   !== undefined ? s.dmgMax   : (nd.dmgMax   || 0),
      healAmt  : nd.healAmt  || 0,
      dmgType  : nd.dmgType  || 'Negate',
      stat     : nd.stat     || 'power',
      energy   : s.pa       !== undefined ? s.pa       : (nd.pa       || 3),
      lifesteal: s.lifesteal !== undefined ? s.lifesteal : (nd.lifesteal || 0),
      knockback: nd.knockback || 0,
      invocMobId: nd.invocMobId || null,
      dur      : nd.dur      || 0,
      hits     : nd.hits     || 1,
      range    : s.range    !== undefined ? s.range    : (nd.range   !== undefined ? nd.range : 3),
      minRange : nd.minRange !== undefined ? nd.minRange : 1,
      aoe      : nd.aoe      || 'single',
      linear   : !!(nd.linear || (nd.aoe && nd.aoe.indexOf('ligne') === 0)),
      cd       : 0,
      cdMax    : s.cdMax    !== undefined ? s.cdMax    : (nd.cdMax    || 0),
    });
  });

  // Fallback si aucun sort équipé → ancienne liste active
  if (result.length === 0) {
    var hero = getH(heroId);
    (hero.spells || []).forEach(function(sp) {
      if (sp.passive) return;
      if (META.hero.lv < (sp.ulv || 1)) return;
      if ((META.activeSp || []).indexOf(sp.id) === -1) return;
      result.push({
        id: sp.id, name: sp.name, type: sp.type, pwr: sp.pwr,
        energy: sp.energy, dur: sp.dur||0, hits: sp.hits||1,
        range: sp.hbRange||3, minRange: sp.hbMinRange||1,
        aoe: sp.hbAoe||'single', cd:0, cdMax: sp.energy,
      });
    });
  }

  return result.slice(0, 5);
}

// ================================================================
// HB_MOB_SPELLS — sorts des mobs en combat hex
// ================================================================
var HB_MOB_SPELLS = {
  'SP01': { id:'SP01', name:'Punch',           dmgType:'Plasma', pa:4, minRange:1, range:1, cdMax:0, aoe:'single', pwr:1.0 },
  'SP09': { id:'SP09', name:'Fire',            dmgType:'Neon',   pa:4, minRange:1, range:2, cdMax:0, aoe:'single', pwr:0.8 },
  'SP13': { id:'SP13', name:'Heavy Fire',      dmgType:'Neon',   pa:5, minRange:1, range:2, cdMax:2, aoe:'single', pwr:1.0, knockback:1 },
  'SP17': { id:'SP17', name:'Long Range Fire', dmgType:'Glitch', pa:4, minRange:1, range:4, cdMax:0, aoe:'single', pwr:0.7 },
  'SP32': { id:'SP32', name:'Push',            dmgType:'Glitch', pa:6, minRange:1, range:2, cdMax:0, aoe:'single', pwr:0.4, knockback:1 },
  'SP36': { id:'SP36', name:'Poison',          dmgType:'Neon',   pa:5, minRange:1, range:3, cdMax:1, aoe:'single', pwr:0.3, dot:true },
  'SP40': { id:'SP40', name:'Explosion',       dmgType:'Plasma', pa:6, minRange:1, range:3, cdMax:2, aoe:'cross',  pwr:0.6 },
  'SP41': { id:'SP41', name:'Explosion+',      dmgType:'Plasma', pa:5, minRange:1, range:4, cdMax:2, aoe:'cross',  pwr:0.9 },
  'SP44': { id:'SP44', name:'Lifesteal',       dmgType:'Glitch', pa:4, minRange:1, range:2, cdMax:0, aoe:'single', pwr:0.7, lifesteal:0.5 },
  'SP48': { id:'SP48', name:'Mine',            dmgType:'Glitch', pa:5, minRange:0, range:3, cdMax:3, aoe:'single', pwr:0.5 },
  'SP52': { id:'SP52', name:'Straight Shot',   dmgType:'Neon',   pa:3, minRange:1, range:3, cdMax:0, aoe:'line',   pwr:0.6 },
  'SP56': { id:'SP56', name:'Bot Deploy',      dmgType:null,     pa:6, minRange:1, range:1, cdMax:4, aoe:'single', invoc:'MO01' },
};
function hbSpellFromId(spId) {
  var base = HB_MOB_SPELLS[spId];
  if (!base) return null;
  return Object.assign({}, base, { cd: 0 });
}

// MOB_DEFS est défini dans data.js (source unique)

function hbMakeEnemy(mobId, pos) {
  var mob = MOB_DEFS.find(function(m){ return m.id === mobId; }) || MOB_DEFS[0];
  var b = mob.base;
  var heroLv = META.hero.lv || 1;
  var mobLv  = Math.min(mob.lvMax, Math.max(mob.lvMin, heroLv + Math.floor(Math.random()*11) - 5));
  var lvRange = Math.max(1, mob.lvMax - mob.lvMin);
  var lvRatio = Math.min(1, Math.max(0, (mobLv - mob.lvMin) / lvRange));
  var sc      = 0.8 + lvRatio * 0.5;
  var hpBase  = Math.max(20, Math.floor(b.hp * sc));
  var atkBase = Math.max(2,  Math.floor(b.power * sc));
  var spells  = (mob.spells || ['SP01']).map(hbSpellFromId).filter(Boolean);
  if (!spells.length) spells = [hbSpellFromId('SP01')];
  var _factionColors = {Bot:'#ff6b35', Rebel:'#f43f5e', Underground:'#a3e635', Corp:'#60a5fa', Holo:'#c084fc'};
  var col = mob.boss ? '#fbbf24' : (_factionColors[mob.lore1] || '#aaa');
  return {
    id: mobId + '_' + pos.q + '_' + pos.r, isPlayer: false,
    name: mob.nm, faction: mob.lore1,
    img: 'assets/enemies/hex/' + mob.id + '/' + mob.id + '_idle_s.png', icon: '🤖',
    col: col, boss: mob.boss || false, mobLv: mobLv,
    hp: hpBase, mHp: hpBase, sh: 0, mSh: 0, atk: atkBase,
    pm: b.pm, pmMax: b.pm, pa: b.pa, paMax: b.pa,
    init: b.init || 10,
    esq: b.esq || 0, thorn: b.thorn || 0,
    resPlas: (b.resPlas || 0) / 100, resNeon: (b.resNeon || 0) / 100,
    resGlitch: (b.resGlitch || 0) / 100, resNegate: (b.resNegate || 0) / 100,
    effs: [], alive: true,
    pos: { q: pos.q, r: pos.r, s: -pos.q - pos.r },
    spells: spells,
  };
}


var HB_SCENARIOS = [
  { id:'farm_easy',   name:'Farm Easy',   desc:'1 à 2 ennemis. Bonne mise en jambe.', diff:'e', icon:'⚡', rewardMult:1.0,
    mapId:'corridor',  enemies:'random', mobMin:1, mobMax:2,
    spawns:[{q:-2,r:2},{q:0,r:3},{q:-3,r:1}] },
  { id:'farm_medium', name:'Farm Medium', desc:'2 à 3 ennemis. Gérez les angles.',    diff:'m', icon:'⚡', rewardMult:1.6,
    mapId:'plaza',     enemies:'random', mobMin:2, mobMax:3,
    spawns:[{q:-2,r:2},{q:0,r:3},{q:-3,r:1}] },
  { id:'farm_hard',   name:'Farm Hard',   desc:'3 à 4 ennemis coordonnés.',           diff:'h', icon:'⚡', rewardMult:2.5,
    mapId:'rooftops',  enemies:'random', mobMin:3, mobMax:4,
    spawns:[{q:-2,r:2},{q:0,r:3},{q:-3,r:1}] },
  { id:'donjon_easy',   name:'Donjon Easy',   desc:'5 combats enchaînés. 1–2 ennemis. Boss garanti au 5e combat.', diff:'e', icon:'🏰', rewardMult:1.2,
    mapId:'_random_',  enemies:'random', mobMin:1, mobMax:2, donjon:true, donjonFights:5 },
  { id:'donjon_medium', name:'Donjon Medium', desc:'5 combats enchaînés. 2–3 ennemis. Boss garanti au 5e combat.', diff:'m', icon:'🏰', rewardMult:2.0,
    mapId:'_random_',  enemies:'random', mobMin:2, mobMax:3, donjon:true, donjonFights:5 },
  { id:'donjon_hard',   name:'Donjon Hard',   desc:'5 combats enchaînés. 3–4 ennemis. Boss garanti au 5e combat.', diff:'h', icon:'🏰', rewardMult:3.5,
    mapId:'_random_',  enemies:'random', mobMin:3, mobMax:4, donjon:true, donjonFights:5 },
];

var HB_DONJON = null;  // état du mode Donjon actif (null = mode normal)
var _hbSelMode = null; // écran sélection : null=menu principal, 'farm'|'donjon'|'pvp'=sous-menu

// ── CRÉATION D'UN COMBAT ──────────────────────────────────────────
var HB_MIN_LV = 1;

function startHexBattle(scenarioId) {
  if (!META.heroId) { navigate('hero'); return; }
  if (!META.hero || META.hero.lv < HB_MIN_LV) {
    var lv = (META.hero && META.hero.lv) || 1;
    alert('Mode Hex débloqué au niveau ' + HB_MIN_LV + ' ! (Actuel : ' + lv + ')');
    navigate('hexbattle');
    return;
  }
  var sc = (HB_SCENARIOS||[]).find(function(s){ return s.id===scenarioId; }) || HB_SCENARIOS[0];
  if (sc.donjon && (!HB_DONJON || !HB_DONJON.active)) {
    HB_DONJON = { active:true, scenarioId:scenarioId, fightNum:1,
                  fightTotal:sc.donjonFights||5, savedHp:null, savedHpMax:null,
                  totalCr:0, totalXp:0, totalLoot:[] };
  }
  hbStartWithSpawn(scenarioId, -2, 2);
}

function hbShowSpawnChoice(sc, scenarioId) {
  var bot = document.getElementById('bot');
  if (bot) bot.style.display = 'none';
  navigate('hexbattle');
  var el = document.getElementById('hb-sel');
  if (!el) return;
  document.getElementById('hb-active').style.display = 'none';
  document.getElementById('hb-result').style.display = 'none';
  el.style.display = '';
  var labels = ['Position Nord','Position Centre','Position Sud'];
  var icons  = ['⬆️','⏺️','⬇️'];
  el.innerHTML = '<div class="sec-hdr">⬡ ' + sc.name + ' — Position de départ</div>'
    + '<div style="padding:12px;display:flex;flex-direction:column;gap:10px">'
    + sc.spawns.map(function(sp, i) {
      return '<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid var(--cyan);border-radius:12px;padding:12px 14px;cursor:pointer" '
        +'onclick="hbStartWithSpawn(\''+scenarioId+'\','+sp.q+','+sp.r+')">'
        +'<span style="font-size:1.3rem">'+icons[i]+'</span> '
        +'<b style="color:var(--text)">'+labels[i]+'</b>'
        +'</div>';
    }).join('')
    + '</div>';
}

function hbStartWithSpawn(scenarioId, q, r) {
  // Clone le scénario — évite de polluer HB_SCENARIOS de façon permanente
  var sc = Object.assign({}, HB_SCENARIOS.find(function(s){ return s.id===scenarioId; }) || HB_SCENARIOS[0]);

  // ── 1. MAP : choisir la map EN PREMIER ──────────────────────────────────
  if (sc.mapId === '_random_') {
    var randomMaps = ['corridor', 'plaza', 'rooftops'];
    sc.mapId = randomMaps[Math.floor(Math.random() * randomMaps.length)];
  }
  var mapDef = HB_MAP_DEFS[sc.mapId] || HB_MAP_DEFS['corridor'];
  var hexMap = hbBuildMap(mapDef);

  // ── Côté aléatoire : 50% chance d'inverser les zones hero/mob ─────────────
  var flipSides = Math.random() < 0.5;

  // ── 2. JOUEUR ────────────────────────────────────────────────────────────
  var player = hbMakePlayer();
  player.pos = { q: q, r: r, s: -q - r };
  // Donjon : conserver les PV du combat précédent
  if (HB_DONJON && HB_DONJON.active && HB_DONJON.savedHp !== null) {
    player.hp  = Math.max(1, HB_DONJON.savedHp);
    player.mHp = HB_DONJON.savedHpMax;
  }

  // ── 3. ENNEMIS : roll type, nombre et niveau ────────────────────────────
  // Cases spawn valides pour les ennemis
  var _spawnSrc0 = flipSides ? (mapDef.playerSpawns || []) : (mapDef.enemySpawns || []);
  var validSpawns = _spawnSrc0.filter(function(sp) {
    var hkey = hKey({q:sp.q, r:sp.r});
    return hexMap[hkey] && !hexMap[hkey].obstacle;
  });
  // Fallback : scanner la moitié haute du hexMap si aucun spawn défini
  if (!validSpawns.length) {
    Object.keys(hexMap).forEach(function(k) {
      var _h = hexMap[k];
      if (_h.r < -1 && !_h.obstacle) validSpawns.push({ q: _h.q, r: _h.r });
    });
  }
  validSpawns.sort(function() { return Math.random() - 0.5; });

  // Roll nombre de mobs selon mobMin/mobMax du scénario
  var _mobMin = sc.mobMin || 2, _mobMax = sc.mobMax || 3;
  var count = _mobMin + Math.floor(Math.random() * (_mobMax - _mobMin + 1));
  count = Math.min(count, validSpawns.length);

  // Pool : tous les mobs non-boss (hardcore inclut tous y compris boss)
  var pool = sc.enemies === 'hardcore'
    ? MOB_DEFS.slice()
    : MOB_DEFS.filter(function(m){ return !m.boss; });

  var scEnemies = [];
  for (var ri = 0; ri < count; ri++) {
    var tpl = pool[Math.floor(Math.random() * pool.length)];
    var sp  = validSpawns[ri];
    scEnemies.push({ tpl: tpl.id, q: sp.q, r: sp.r });
  }
  // Donjon : forcer un boss au dernier combat
  if (HB_DONJON && HB_DONJON.active && HB_DONJON.fightNum === HB_DONJON.fightTotal) {
    var _bossList = MOB_DEFS.filter(function(m){ return m.boss; });
    if (_bossList.length && scEnemies.length) {
      scEnemies[0] = Object.assign({}, scEnemies[0], { tpl: _bossList[Math.floor(Math.random() * _bossList.length)].id });
    }
  }
  // Les positions sont déjà issues de validSpawns (unique + validé)
  var enemies = scEnemies.map(function(e) {
    return hbMakeEnemy(e.tpl, {q:e.q, r:e.r});
  });
  var order   = [player].concat(enemies.sort(function(){ return Math.random()-0.5; }));
  HB = {
    scenario:sc, hexMap:hexMap, units:order, player:player, enemies:enemies,
    turnIdx:0, round:1, phase:'positioning', selected:player, hovered:null,
    actionMode:'move', pendingSpell:null, hlMove:[], hlSpell:[], hlAoe:[], hlEnemy:[],
    camX:0, camY:0, zoom:1, canvasW:0, canvasH:0,
    hexOpacity: true,
    log:['⚔ '+(HB_DONJON&&HB_DONJON.active?'Donjon '+HB_DONJON.fightNum+'/'+HB_DONJON.fightTotal+' — ':'')+sc.name+' — '+player.name+' joue !'],
    over:false, won:false, rewardCr:0, rewardXP:0, infoUnit:null,
  };
  HB.flipSides = flipSides;
  HB.mapDef = mapDef;
  // Reset complet pour une nouvelle partie propre
  hbStopRAF && hbStopRAF();
  HB_ANIMS = [];
  if (HB_RAF) { cancelAnimationFrame(HB_RAF); HB_RAF = null; }
  // Précharger uniquement les sprites run (les autres chargent à la demande)
  var _spriteDirs = ['s','sw','se','ne','nw','n'];
  HB.units.forEach(function(u) {
    if (u.img) hbImg(u.img);
    if (!u.isPlayer) {
      var mc = u.id.split('_')[0];
      _spriteDirs.forEach(function(dir) {
        hbImg('assets/enemies/hex/' + mc + '/' + mc + '_run_' + dir + '.png');
      });
    }
  });
  var _heroCode = HB_HERO_CODE[META.heroId] || 'HE01';
  _spriteDirs.forEach(function(dir) {
    hbImg('assets/heroes/' + _heroCode + '/' + _heroCode + '_run_' + dir + '.png');
  });
  HB.dyingUnits = [];
  // Reset dimensions → force resize() à recalculer la vraie taille du wrapper
  // (sinon clearRect laisse les px hors-bounds de l'ancienne partie visibles)
  HB.canvasW = 0; HB.canvasH = 0;
  // Cache tous les panneaux DOM
  var _sel = document.getElementById('hb-sel');
  var _act = document.getElementById('hb-active');
  var _res = document.getElementById('hb-result');
  var _inf = document.getElementById('hb-info-panel');
  var _ban = document.getElementById('hb-banner');
  var _tip = document.getElementById('hb-tooltip');
  if (_sel) _sel.style.display = '';
  if (_act) _act.style.display = 'none';
  if (_res) _res.style.display = 'none';
  if (_inf) _inf.style.display = 'none';
  if (_ban) _ban.remove();
  if (_tip) _tip.style.display = 'none';
  hbInitPositioning();
  var bot = document.getElementById('bot');
  if (bot) bot.style.display = 'none';
  navigate('hexbattle');
  renderHexBattle();
  if (HB_AUTOPLAY) setTimeout(hbStartAutoReady, 200);
}
// ── HIGHLIGHTS ────────────────────────────────────────────────────
function hbInitPositioning() {
  if (!HB) return;
  var _mapDefRef = HB.mapDef || (HB.scenario && HB_MAP_DEFS[HB.scenario.mapId]);
  var _heroSpawnList = (HB.flipSides && _mapDefRef)
    ? (_mapDefRef.enemySpawns || [])
    : (_mapDefRef ? _mapDefRef.playerSpawns : null)
      || HB.scenario.playerSpawns || HB.scenario.spawns || [];
  var spawns = _heroSpawnList.length ? _heroSpawnList : [{q:-1,r:2},{q:0,r:2},{q:1,r:2}];
  // Filtrer les spawns invalides (hors map, obstacles, ou occupés par un ennemi)
  var enemyPosSet = {};
  (HB.enemies || []).forEach(function(e){ if(e.alive) enemyPosSet[e.pos.q+','+e.pos.r]=true; });
  HB.hlMove = spawns
    .filter(function(s){
      var k = hKey({q:s.q, r:s.r, s:-s.q-s.r});
      var cell = HB.hexMap[k];
      return cell && !cell.obstacle && !enemyPosSet[s.q+','+s.r];
    })
    .map(function(s){ return {q:s.q, r:s.r, s:-s.q-s.r}; });
  // Si aucun spawn valide → prendre la première case libre non-obstacle
  if (HB.hlMove.length === 0) {
    var allKeys = Object.keys(HB.hexMap);
    for (var ki = 0; ki < allKeys.length; ki++) {
      var cell = HB.hexMap[allKeys[ki]];
      if (!cell.obstacle && !enemyPosSet[cell.q+','+cell.r] && cell.r > 0) {
        HB.hlMove = [{q:cell.q, r:cell.r, s:cell.s}];
        break;
      }
    }
  }
  // Spawn initial sur la première case disponible
  if (HB.hlMove.length > 0) {
    var first = HB.hlMove[0];
    HB.player.pos = {q:first.q, r:first.r, s:first.s};
  }
  HB.hlSpell = [];
  HB.hlAoe   = [];
  // Calculer les cases de spawn ennemi (violet) pour les afficher pendant le positionnement
  var _mRef2 = HB.mapDef || (HB.scenario && HB_MAP_DEFS[HB.scenario.mapId]);
  if (_mRef2) {
    var _enemyList = HB.flipSides ? (_mRef2.playerSpawns||[]) : (_mRef2.enemySpawns||[]);
    HB.hlEnemy = _enemyList
      .filter(function(sp){ var k=hKey({q:sp.q,r:sp.r,s:-sp.q-sp.r}); return HB.hexMap[k]&&!HB.hexMap[k].obstacle; })
      .map(function(sp){ return {q:sp.q,r:sp.r,s:-sp.q-sp.r}; });
  } else { HB.hlEnemy = []; }
}
var _hbAutoReadyTimer = null;
var _hbAutoReadyCount = 0;
function hbStartAutoReady() {
  if (_hbAutoReadyTimer) { clearInterval(_hbAutoReadyTimer); _hbAutoReadyTimer = null; }
  _hbAutoReadyCount = 5;
  renderHexActionBar && renderHexActionBar();
  _hbAutoReadyTimer = setInterval(function() {
    _hbAutoReadyCount--;
    var cd = document.getElementById('hb-ready-cd');
    if (cd) cd.textContent = _hbAutoReadyCount + 's';
    if (_hbAutoReadyCount <= 0) {
      clearInterval(_hbAutoReadyTimer); _hbAutoReadyTimer = null;
      hbReadyUp();
    }
  }, 1000);
}
function hbCancelAutoReady() {
  if (_hbAutoReadyTimer) { clearInterval(_hbAutoReadyTimer); _hbAutoReadyTimer = null; }
  _hbAutoReadyCount = 0;
}
function hbReadyUp() {
  hbCancelAutoReady();
  if (!HB || (HB.phase !== 'positioning' && HB.phase !== 'positioning_done')) return;
  // Alternance équipes par initiative : l'équipe ayant l'init max commence,
  // puis on alterne — chaque équipe envoie son unité ayant le plus d'init restante.
  var playerTeam = HB.units.filter(function(u){ return u.isPlayer; });
  var enemyTeam  = HB.units.filter(function(u){ return !u.isPlayer; });
  playerTeam.sort(function(a, b){ return (b.init||0) - (a.init||0); });
  enemyTeam.sort(function(a, b){ return (b.init||0) - (a.init||0); });
  var pMax = playerTeam.length ? (playerTeam[0].init||0) : 0;
  var eMax = enemyTeam.length  ? (enemyTeam[0].init||0)  : 0;
  var first  = pMax >= eMax ? playerTeam : enemyTeam;
  var second = pMax >= eMax ? enemyTeam  : playerTeam;
  var ordered = [];
  for (var i = 0; i < Math.max(first.length, second.length); i++) {
    if (i < first.length)  ordered.push(first[i]);
    if (i < second.length) ordered.push(second[i]);
  }
  HB.units   = ordered;
  HB.turnIdx = 0;
  HB.round   = 0;
  hbStartRAF();
  HB.hlMove = []; HB.hlEnemy = [];
  hbNextTurn();
}
function hbRefreshHighlights() {
  if (!HB || HB.phase !== 'player') { HB.hlMove=[]; HB.hlSpell=[]; HB.hlAoe=[]; return; }
  var p = HB.player;
  HB.hlAoe = [];

  if (HB.actionMode === 'move') {
    HB.hlMove  = p.pm > 0 ? hbReachable(p.pos, p.pm, p) : [];
    HB.hlSpell = [];
  } else if (HB.actionMode === 'spell' && HB.pendingSpell) {
    HB.hlMove  = [];
    HB.hlSpell = hbSpellRange(p.pos, HB.pendingSpell);
  } else if (HB.actionMode === 'weapon') {
    HB.hlMove  = [];
    var wRange = HB.weaponRange || HB_CFG.WEAPON_RANGE;
    HB.hlSpell = [];
    Object.keys(HB.hexMap).forEach(function(k) {
      var h = HB.hexMap[k];
      if (h.obstacle) return;             // obstacles jamais en portée arme
      var d = HB_HEX.dist(p.pos, h);
      if (d >= 1 && d <= wRange && hbHasLOS(p.pos, h, true))
        HB.hlSpell.push({q:h.q, r:h.r, s:h.s});
    });
  } else {
    HB.hlMove = []; HB.hlSpell = [];
  }
}

function hbSpellRange(from, sp) {
  if (sp.hbSelfTarget) return [from];
  if (sp.range === 0) return [from];
  var isLinear = sp.linear === true || sp.ligne === true;
  var result = [];
  Object.keys(HB.hexMap).forEach(function(k) {
    var h = HB.hexMap[k];
    if (h.obstacle) return;
    var d = HB_HEX.dist(from, h);
    if (d < (sp.minRange||0) || d > sp.range) return;
    if (!hbHasLOS(from, h, true)) return;
    // Portée linéaire : uniquement les 6 axes hexagonaux
    if (isLinear) {
      var dq = h.q - from.q, dr = h.r - from.r;
      if (dq !== 0 && dr !== 0 && dq + dr !== 0) return;
    }
    result.push({ q: h.q, r: h.r, s: h.s });
  });
  return result;
}

// ── ACTIONS JOUEUR ────────────────────────────────────────────────
function hbHandleCanvasClick(px, py) {
  if (!HB || HB.over) return;
  if (HB.phase === 'positioning' || HB.phase === 'positioning_done') {
    var zoomLevels = [0.40, 0.65, 1.0, 1.35];
    var z  = zoomLevels[HB.zoom||1];
    var cx = HB.canvasW/2, cy = HB.canvasH/2;
    var worldX = (px-cx)/z+cx - HB.camX;
    var worldY = (py-cy)/z+cy - HB.camY;
    var h = HB_HEX.fromPixel(worldX, worldY, HB.canvasW/2, HB.canvasH/2);
    var isSpawn = HB.hlMove.some(function(c){ return hEq(c,h); });
    if (isSpawn) {
      HB.player.pos = {q:h.q, r:h.r, s:-h.q-h.r};
      HB.phase = 'positioning_done';
      // On garde hlMove pour que les autres cases restent visibles et re-cliquables
      HB_CVS.draw();
      renderHexActionBar();
    } else if (HB.phase === 'positioning_done') {
      // Clic sur une case non-spawn → ignore sauf info unité
    }
    // En phase de placement: clic sur unité non-spawn → popup info
    var _posUnit = hbUnitAt(h);
    if (_posUnit && !isSpawn) {
      HB.infoUnit = (HB.infoUnit === _posUnit) ? null : _posUnit;
      hbRenderInfoPanel && hbRenderInfoPanel();
    }
    return;
  }
  // Pendant le tour ennemi: autoriser seulement le clic-info sur une unité
  if (HB.phase !== 'player') {
    var zoomLevels2 = [0.40, 0.65, 1.0, 1.35];
    var z2  = zoomLevels2[HB.zoom||1];
    var cx2 = HB.canvasW/2, cy2 = HB.canvasH/2;
    var wx2 = (px - cx2) / z2 + cx2 - HB.camX;
    var wy2 = (py - cy2) / z2 + cy2 - HB.camY;
    var h2  = HB_HEX.fromPixel(wx2, wy2, cx2, cy2);
    var clicked2 = hbUnitAt(h2);
    if (clicked2) { HB.infoUnit = (HB.infoUnit === clicked2) ? null : clicked2; hbRenderInfoPanel(); }
    return;
  }
  var zoomLevels = [0.40, 0.65, 1.0, 1.35];
  var z  = zoomLevels[HB.zoom||1];
  var cx = HB.canvasW/2, cy = HB.canvasH/2;
  // Convertit le clic écran → coordonnées monde (annule zoom + caméra)
  var worldX = (px - cx) / z + cx - HB.camX;
  var worldY = (py - cy) / z + cy - HB.camY;
  var ox = HB.canvasW/2;
  var oy = HB.canvasH/2;
  var h  = HB_HEX.fromPixel(worldX, worldY, ox, oy);
  // Obstacles : inciblables et incliquables
  var _clickCell = HB.hexMap[hKey(h)];
  if (_clickCell && _clickCell.obstacle) return;
  var p  = HB.player;
  var mode = HB.actionMode;

  if (mode === 'move') {
    var inRange = HB.hlMove.some(function(c){ return hEq(c,h); });
    if (inRange && !hbUnitAt(h)) {
      hbPlayerMove(h);
      return;
    }
    // Clic sur le personnage joueur → popup info
    var _selfUnit = hbUnitAt(h);
    if (_selfUnit && _selfUnit.isPlayer) {
      HB.infoUnit = (HB.infoUnit === _selfUnit) ? null : _selfUnit;
      hbRenderInfoPanel && hbRenderInfoPanel();
      renderHexBattle();
      return;
    }
  }

  if (mode === 'weapon') {
    var wRange = HB.weaponRange || HB_CFG.WEAPON_RANGE;
    var _cell = HB.hexMap[hKey(h)];
    // Bloquer les obstacles
    if (_cell && _cell.obstacle) { HB.actionMode='move'; hbRefreshHighlights(); renderHexBattle(); return; }
    var clickedEnemy = hbUnitAt(h);
    var dClick = HB_HEX.dist(HB.player.pos, h);
    if (dClick <= wRange && dClick >= 1) {
      // Case dans la portée : attaquer l'ennemi dessus, sinon tirer sur la case vide
      if (clickedEnemy && clickedEnemy !== HB.player) {
        hbWeaponAttack(clickedEnemy);
      } else {
        // Case vide mais dans portée : animation + PA quand même (tir/coup raté)
        var _p2 = HB.player;
        if (_p2.pa >= HB_CFG.PA_BASIC_ATK) {
          _p2.pa -= HB_CFG.PA_BASIC_ATK;
          _p2._attackAnim = Date.now() + 700;
          var _vFacing = hbFacingTo(_p2.pos, h);
          if (_vFacing) _p2.facing = _vFacing;
          hbLog('Tir dans le vide !');
          var _col = '#60a5fa';
          hbAnimAttack(_p2.pos, h, _col, function(){ hbRefreshHighlights(); renderHexBattle(); });
        } else {
          HB.actionMode = 'move'; hbRefreshHighlights(); renderHexBattle();
        }
      }
      return;
    }
    // Clic hors portée → désélectionne
    HB.actionMode = 'move';
    HB.hlSpell = [];
    hbRefreshHighlights();
    renderHexBattle();
    return;
  }

  if (mode === 'spell' && HB.pendingSpell) {
    var inSpell = HB.hlSpell.some(function(c){ return hEq(c,h); });
    if (inSpell) {
      hbPlayerCastSpell(HB.pendingSpell, h);
      return;
    }
  }

  // Clic sur un ennemi → affiche ses stats (sauf si sort en cours)
  var clickedUnit = hbUnitAt(h);
  if (clickedUnit && !clickedUnit.isPlayer && mode !== 'spell') {
    HB.infoUnit = (HB.infoUnit && HB.infoUnit.id === clickedUnit.id) ? null : clickedUnit;
    hbRenderInfoPanel && hbRenderInfoPanel();
    renderHexHUD();
    return;
  }

  // Clic sur une case vide en dehors des highlights : annule la sélection
  HB.infoUnit = null;
  HB.actionMode = 'move';
  HB.pendingSpell = null;
  hbRefreshHighlights();
  renderHexBattle();
}

function hbHandleCanvasHover(px, py) {
  if (!HB) return;
  var zoomLevels = [0.40, 0.65, 1.0, 1.35];
  var z  = zoomLevels[HB.zoom||1];
  var cx = HB.canvasW/2, cy = HB.canvasH/2;
  var worldX = (px - cx) / z + cx - HB.camX;
  var worldY = (py - cy) / z + cy - HB.camY;
  var ox = HB.canvasW/2;
  var oy = HB.canvasH/2;
  var h  = HB_HEX.fromPixel(worldX, worldY, ox, oy);
  HB.hovered = HB.hexMap[hKey(h)] ? h : null;

  // Preview AOE du sort
  HB.hlAoe = [];
  if (HB.actionMode === 'spell' && HB.pendingSpell && HB.hovered) {
    var inSpell = HB.hlSpell.some(function(c){ return hEq(c, HB.hovered); });
    if (inSpell) {
      var _hlOrigin = (HB.player && HB.player.pos) ? HB.player.pos : null;
      HB.hlAoe = hbAoeCells(HB.hovered, HB.pendingSpell.aoe, _hlOrigin, HB.player);
    }
  }
  renderHexBattle();
}

function hbAoeCells(center, shape, origin, caster) {
  if (shape === 'single') return [center];

  if (shape === 'burst' || shape === 'splash1') {
    return [center].concat(HB_HEX.neighbors(center).filter(function(nb){
      return !!HB.hexMap[hKey(nb)];
    }));
  }

  if (shape === 'splash2') {
    var cells = [];
    for (var vq2 = -2; vq2 <= 2; vq2++) {
      for (var vr2 = -2; vr2 <= 2; vr2++) {
        var vs2 = -vq2-vr2;
        if (Math.max(Math.abs(vq2),Math.abs(vr2),Math.abs(vs2)) > 2) continue;
        var c2 = {q:center.q+vq2, r:center.r+vr2, s:center.s+vs2};
        if (HB.hexMap[hKey(c2)]) cells.push(c2);
      }
    }
    return cells;
  }

  if (shape === 'cross') {
    var cells = [center];
    HB_HEX.DIRS.forEach(function(d){
      for (var i=1; i<=2; i++){
        var h={q:center.q+d.q*i, r:center.r+d.r*i, s:center.s+d.s*i};
        if (HB.hexMap[hKey(h)]) cells.push(h);
      }
    });
    return cells;
  }

  if (shape === 'line' && origin) {
    var dq=center.q-origin.q, dr=center.r-origin.r;
    var len=Math.max(Math.abs(dq),Math.abs(dr),Math.abs(-dq-dr));
    if (len===0) return [center];
    var cells=[];
    for (var i=1; i<=3; i++){
      var h={q:Math.round(origin.q+dq/len*i), r:Math.round(origin.r+dr/len*i)};
      h.s=-h.q-h.r;
      if (HB.hexMap[hKey(h)]) cells.push(h);
    }
    return cells;
  }

  // ── Ligne N : depuis la case ciblée dans la direction de tir ─────
  if ((shape==='ligne2'||shape==='ligne3'||shape==='ligne4') && origin) {
    var dq=center.q-origin.q, dr=center.r-origin.r;
    var clen=Math.max(Math.abs(dq),Math.abs(dr),Math.abs(-dq-dr));
    if (clen===0) return [center];
    var ndq=dq/clen, ndr=dr/clen;
    var n = shape==='ligne2'?2 : shape==='ligne3'?3 : 4;
    var cells=[];
    for (var i=0; i<n; i++) {
      var h={q:Math.round(center.q+ndq*i), r:Math.round(center.r+ndr*i)};
      h.s=-h.q-h.r;
      if (HB.hexMap[hKey(h)]) cells.push(h);
    }
    return cells;
  }

  // ── Cone : arc ±60° depuis la case ciblée ────────────────────────
  if ((shape==='cone2'||shape==='cone3') && origin) {
    var dq=center.q-origin.q, dr=center.r-origin.r;
    var clen=Math.max(Math.abs(dq),Math.abs(dr),Math.abs(-dq-dr));
    if (clen===0) return [center];
    var depth = shape==='cone2'?1:2;
    var cells=[];
    for (var vq=-depth; vq<=depth; vq++) {
      for (var vr=-depth; vr<=depth; vr++) {
        var vs=-vq-vr;
        var dist=Math.max(Math.abs(vq),Math.abs(vr),Math.abs(vs));
        if (dist>depth) continue;
        var c={q:center.q+vq, r:center.r+vr, s:center.s+vs};
        if (!HB.hexMap[hKey(c)]) continue;
        if (dist===0) { cells.push(c); continue; }
        var dot3d=dq*vq+dr*vr+(-dq-dr)*vs;
        if (dot3d >= clen*dist) cells.push(c);
      }
    }
    return cells;
  }

  // ── Demi splash : arc autour du lanceur, basé sur facing ─────────
  if ((shape==='demiSplash1'||shape==='demiSplash2') && caster) {
    var facing = caster.facing || 'e';
    var FDIRS = {e:{q:1,r:0},ne:{q:1,r:-1},n:{q:0,r:-1},w:{q:-1,r:0},sw:{q:-1,r:1},se:{q:0,r:1},nw:{q:0,r:-1}};
    var fd = FDIRS[facing] || FDIRS['e'];
    var fdq=fd.q, fdr=fd.r;
    var flen=Math.max(Math.abs(fdq),Math.abs(fdr),Math.abs(-fdq-fdr));
    // demiSplash1 : ±60° (dot >= flen), demiSplash2 : ±120° (dot >= -flen)
    var thr = (shape==='demiSplash1') ? flen : -flen;
    var cells=[];
    HB_HEX.DIRS.forEach(function(d) {
      var c={q:center.q+d.q, r:center.r+d.r, s:center.s+d.s};
      if (!HB.hexMap[hKey(c)]) return;
      var dot3d=fdq*d.q+fdr*d.r+(-fdq-fdr)*d.s;
      if (dot3d >= thr) cells.push(c);
    });
    return cells;
  }

  return [center];
}

// ── ANIMATION DÉPLACEMENT (partagée joueur + IA) ─────────────────
function hbAnimateUnit(unit, pathToWalk, onDone) {
  var stepIdx = 0, STEP_MS = 160;
  function animStep() {
    if (!HB || stepIdx >= pathToWalk.length) {
      delete unit._animPos;
      if (onDone) onDone();
      return;
    }
    var from = { q:unit.pos.q, r:unit.pos.r, s:unit.pos.s };
    var to   = pathToWalk[stepIdx++];
    // Mise à jour de la direction avant le déplacement
    var dq = to.q - from.q, dr = to.r - from.r;
    if      (dq > 0 && dr < 0) { unit.facing = 'ne'; }
    else if (dq > 0 && dr === 0) { unit.facing = 'e';  }
    else if (dq >= 0 && dr > 0) { unit.facing = 'se'; }
    else if (dq < 0 && dr > 0) { unit.facing = 'sw'; }
    else if (dq < 0 && dr === 0) { unit.facing = 'w';  }
    else if (dq === 0 && dr < 0) { unit.facing = 'n';  }
    else if (dq < 0 && dr < 0)  { unit.facing = 'nw'; }
    unit.pos = to;
    var t0   = Date.now();
    (function interp() {
      if (!HB) return;
      if (!unit.alive) {
        var _f = Math.min(1, (Date.now() - t0) / STEP_MS);
        unit.pos = _f >= 0.5 ? {q:to.q, r:to.r, s:to.s} : {q:from.q, r:from.r, s:from.s};
        delete unit._animPos;
        return;
      }
      var frac = Math.min(1, (Date.now()-t0)/STEP_MS);
      frac = 1-(1-frac)*(1-frac);
      unit._animPos = {
        q: from.q+(to.q-from.q)*frac,
        r: from.r+(to.r-from.r)*frac,
        s: from.s+(to.s-from.s)*frac
      };
      HB_CVS.draw();
      if (frac < 1) requestAnimationFrame(interp);
      else { delete unit._animPos; animStep(); }
    })();
  }
  animStep();
}

function hbPlayerMove(dest) {
  var p = HB.player;
  // ── Tacle check ── ennemis adjacents peuvent bloquer le mouvement
  var _adjE = HB.units.filter(function(u){ return u.alive && !u.isPlayer && HB_HEX.dist(p.pos, u.pos) === 1; });
  if (_adjE.length > 0) {
    var _rawFail = _adjE.reduce(function(acc, e){ return acc + ((e.tacle !== undefined ? e.tacle : 10) / 100); }, 0);
    var _failChance = Math.max(0, _rawFail - (typeof P !== 'undefined' ? (P.respm || 0) : 0));
    if (_failChance > 0 && Math.random() < _failChance) {
      p.pm = 0;
      hbLog('⚡ Taclé ! Tous les PM perdus.');
      hbSpawnFloating && hbSpawnFloating(p.pos, 'TACLÉ !', '#ef4444');
      HB.actionMode = 'none';
      hbRefreshHighlights(); renderHexBattle();
      return;
    }
  }
  var path = hbPath(p.pos, dest, p);
  var steps = Math.min(p.pm, path.length);
  if (!steps) return;
  HB.actionMode = 'none';
  HB.hlMove = []; HB.hlSpell = []; HB.hlAoe = [];
  var pathToWalk = path.slice(0, steps);
  hbAnimateUnit(p, pathToWalk, function() {
    p.pm = Math.max(0, p.pm - steps);
    if (typeof hbSpawnFloating === 'function') hbSpawnFloating(p.pos, '-'+steps+' PM', '#818cf8');
    HB.actionMode = p.pm > 0 ? 'move' : 'none';
    hbRefreshHighlights();
    renderHexBattle();
  });
}

function hbSelectWeapon() {
  if (!HB || HB.phase !== 'player' || HB.over) return;
  var p = HB.player;
  if (p.pa < HB_CFG.PA_BASIC_ATK) { hbLog('⚠ PA insuffisants'); return; }
  // Toggle : si déjà en mode weapon, désélectionne
  if (HB.actionMode === 'weapon') {
    HB.actionMode = 'move';
    HB.hlSpell = [];
    hbRefreshHighlights();
    renderHexBattle();
    return;
  }
  // Calcule la portée de l'arme équipée
  var weapUid = typeof META!=='undefined' && META.eq && META.eq.arme;
  var weap    = weapUid && typeof byUid==='function' ? byUid(weapUid) : null;
  var wRange  = HB_CFG.WEAPON_RANGE;
  if (weap) {
    if (weap.hbRange) { wRange = weap.hbRange; }
    else if (weap.nm && /arc|fusil|canon|sniper|rifle|gun|bow/i.test(weap.nm)) { wRange = 3; }
    else if (weap.st && weap.st.aspd && weap.st.aspd > 0.4) { wRange = 2; }
  }
  HB.actionMode  = 'weapon';
  HB.weaponRange = wRange;
  HB.pendingSpell = null;
  // Highlight : cases à portée occupées par un ennemi vivant
  HB.hlSpell = [];
  HB.enemies.forEach(function(e) {
    if (!e.alive) return;
    if (HB_HEX.dist(p.pos, e.pos) <= wRange) HB.hlSpell.push(e.pos);
  });
  hbRefreshHighlights();
  renderHexBattle();
}

function hbSelectSpell(idx) {
  if (!HB || HB.phase !== 'player' || HB.over) return;
  var sp = HB.player.spells[idx];
  if (!sp) return;
  var cost = sp.energy;
  if (HB.player.pa < cost) { hbLog('⚠ PA insuffisants'); return; }
  if (sp.cd > 0) { hbLog('⚠ Sort en recharge (' + sp.cd + ' tour(s))'); return; }
  if (HB.pendingSpell && HB.pendingSpell.id === sp.id) {
    HB.actionMode  = 'move';
    HB.pendingSpell = null;
  } else {
    HB.actionMode  = 'spell';
    HB.pendingSpell = sp;
  }
  hbRefreshHighlights();
  renderHexBattle();
}

function hbPlayerCastSpell(sp, targetHex) {
  var p    = HB.player;
  var cost = sp.energy;
  if (p.pa < cost) return;
  // Bloquer les sorts d'invocation si la limite est déjà atteinte (avant PA/CD)
  if (sp.type === 'invoc' || sp.invocDefId || sp.invocMobId) {
    var _maxInvP = sp.maxInvoc || 1;
    var _curInvP = HB.units.filter(function(u) {
      return u.alive && u.isInvoc && u.invocOwner === p.id;
    }).length;
    if (_curInvP >= _maxInvP) {
      hbLog('⚠ Invocation : limite atteinte (' + _maxInvP + ')');
      hbSpawnFloating && hbSpawnFloating(p.pos, 'INVOC MAX', '#ef4444');
      return;
    }
  }
  p.pa  -= cost;
  hbSpawnFloating && hbSpawnFloating(HB.player.pos, '-'+cost+' PA', '#f97316');
  sp.cd  = sp.cdMax;
  // Effacer immédiatement
  HB.pendingSpell = null; HB.actionMode = 'move';
  HB.hlSpell = []; HB.hlAoe = [];
  hbRefreshHighlights(); renderHexBattle();
  var cells = hbAoeCells(targetHex, sp.aoe, p.pos, p);
  cells.forEach(function(c) { hbApplySpell(p, sp, c); });
  HB.hlSpell = []; HB.hlAoe = [];
  if (hbCheckEnd()) return;
  // Rester en mode sort uniquement si le sort n'a pas de CD (cdMax=0) ET PA suffisant
  if (sp.cdMax === 0 && p.pa >= sp.energy) {
    HB.actionMode   = 'spell';
    HB.pendingSpell = sp;
  } else {
    HB.actionMode   = 'move';
    HB.pendingSpell = null;
  }
  hbRefreshHighlights();
  renderHexBattle();
}

// ── POUSSÉE ───────────────────────────────────────────────────────
// Repousse target de N cases dans la direction caster→target.
// Dégâts de poussée si cases bloquées : blocked * pushDmg * atkDmg
function hbPushUnit(caster, target, pushCells, atkDmg, onDone) {
  var dq = target.pos.q - caster.pos.q;
  var dr = target.pos.r - caster.pos.r;
  var sq = dq === 0 ? 0 : (dq > 0 ? 1 : -1);
  var sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1);
  if (!sq && !sr) { if (onDone) onDone(); return; }
  var path = [], blocked = 0;
  var cur = {q:target.pos.q, r:target.pos.r, s:-(target.pos.q+target.pos.r)};
  for (var i = 0; i < pushCells; i++) {
    var nq = cur.q + sq, nr = cur.r + sr, ns = -nq - nr;
    var next = {q:nq, r:nr, s:ns};
    var hex = HB.hexMap[hKey(next)];
    var occ = hbUnitAt(next) && hbUnitAt(next) !== target;
    if (!hex || hex.obstacle || occ) { blocked++; }
    else { path.push(next); cur = next; }
  }
  var bk = blocked, atk = atkDmg, finalPos = path.length ? path[path.length-1] : cur;
  function afterPush() {
    if (bk > 0 && atk > 0) {
      var mult = caster.isPlayer ? (P.pushDmg !== undefined ? P.pushDmg : 0.1) : 0.1;
      var pd = Math.floor(bk * mult * atk);
      if (pd > 0) {
        hbDamage(target, pd, null, null);
        hbLog('🪨 Impact ! ' + target.name + ' -' + pd + ' PV (' + bk + ' case(s) bloquée(s))');
        hbSpawnFloating && hbSpawnFloating(finalPos, '-'+pd, '#f97316');
      }
    }
    if (onDone) onDone();
  }
  if (path.length > 0) {
    hbAnimateUnit(target, path, afterPush);
  } else {
    afterPush();
  }
}

// ── MOTEUR DE SORTS ───────────────────────────────────────────────
// Retourne la direction hex (facing) de `from` vers `to`, ou null si même case
function hbFacingTo(from, to) {
  if (!from || !to) return null;
  var dq = to.q - from.q, dr = to.r - from.r;
  if (dq === 0 && dr === 0) return null;
  if      (dq > 0 && dr < 0)  return 'ne';
  else if (dq > 0 && dr === 0) return 'e';
  else if (dq >= 0 && dr > 0)  return 'se';
  else if (dq < 0 && dr > 0)   return 'sw';
  else if (dq < 0 && dr === 0) return 'w';
  else if (dq === 0 && dr < 0) return 'n';
  else                          return 'nw';
}

// Traduit les types existants en effets hexagonaux
function hbApplySpell(caster, sp, targetHex) {
  caster._attackAnim = Date.now() + 700;
  var _spFacing = hbFacingTo(caster.pos, targetHex);
  if (_spFacing) caster.facing = _spFacing;
  var target = hbUnitAt(targetHex);
  var pw     = caster.isPlayer ? spPwr(sp) : (sp.pwr || 1.0);
  var baseDmg = (sp.dmgMin !== undefined && sp.dmgMax > sp.dmgMin)
    ? Math.round(sp.dmgMin + Math.random() * (sp.dmgMax - sp.dmgMin))
    : (sp.dmgMin || Math.floor(caster.atk * pw));
  var isEnemy = function(u) { return u.isPlayer !== caster.isPlayer; };

  // Bonus labs ATQ pour le joueur
  if (caster.isPlayer && typeof P !== 'undefined' && P.labAtq) {
    var _labMult = 1 + (P.labAtq[sp.dmgType] || 0) + (P.labAtq.sort || 0);
    if (_labMult > 1) baseDmg = Math.floor(baseDmg * _labMult);
  }

  // Sorts mob (hbSpellFromId) n'ont pas de 'type' -> le dériver
  var spType = sp.type;
  if (!spType) {
    if (sp.invoc)                                     spType = 'invoc';
    else if (sp.dot)                                  spType = 'dot';
    else if (sp.aoe === 'cross' || sp.aoe === 'line') spType = 'aoe';
    else                                              spType = 'burst';
  }

  switch (spType) {
    case 'burst':
    case 'dpsBurst': {
      var isAoeSpell = sp.aoe && sp.aoe !== 'single';
      if (target) {
        var dmg = baseDmg;
        var col = caster.isPlayer ? '#00d4ff' : '#ff6b35';
        hbAnimAttack(caster.pos, target.pos, col, function(){
          hbDamage(target, dmg, caster, sp.dmgType || null);
          hbLog((isAoeSpell ? '💥' : '⚡') + ' ' + sp.name + ' -> ' + target.name + ' -' + dmg + ' PV');
          if (sp.lifesteal) {
            var stolen = Math.floor(dmg * sp.lifesteal);
            caster.hp = Math.min(caster.hp + stolen, caster.mHp);
            hbLog('🩸 Lifesteal +' + stolen + ' PV');
            hbSpawnFloating && hbSpawnFloating(caster.pos, '+'+stolen, '#4ade80');
          }
          if (sp.knockback) {
            hbPushUnit(caster, target, sp.knockback, dmg, function(){ hbCheckDeath(target); });
          } else {
            hbCheckDeath(target);
          }
        });
      }
      break;
    }
    case 'grip': {
      if (target) {
        var gDmg = baseDmg;
        hbDamage(target, gDmg, caster, sp.dmgType || null);
        hbAddEffect(target, {type:'hold', val:0, turns:1, label:'IMMOB'});
        target.pm = 0;
        hbLog('🤜 ' + sp.name + ' → ' + target.name + ' -' + gDmg + ' PV + immobilisé');
        hbSpawnFloating && hbSpawnFloating(target.pos, 'IMMOB', '#ef4444');
        hbCheckDeath(target);
      }
      break;
    }
    case 'teleport': {
      var tHex = targetHex;
      var tHexData = HB.hexMap[hKey(tHex)];
      var tOcc = hbUnitAt(tHex);
      if (tHexData && !tHexData.obstacle && !tOcc) {
        caster.pos = {q:tHex.q, r:tHex.r, s:tHex.s};
        hbLog('🌀 ' + caster.name + ' se téléporte !');
        hbSpawnFloating && hbSpawnFloating(caster.pos, 'TÉLÉPORT', '#22d3ee');
      }
      break;
    }
    case 'multiBurst': {
      var isAoeSpell2 = sp.aoe && sp.aoe !== 'single';
      if (target) {
        var total = 0;
        for (var i = 0; i < (sp.hits||3); i++) {
          var hd = baseDmg;
          hbDamage(target, hd, caster, sp.dmgType || null); total += hd;
        }
        hbLog((isAoeSpell2 ? '💥' : '⚡') + ' ' + sp.name + ' → ' + target.name + ' -' + total + ' PV');
        hbCheckDeath(target);
      }
      break;
    }
    case 'dot': {
      var isAoeSpell3 = sp.aoe && sp.aoe !== 'single';
      if (target) {
        hbAddEffect(target, { type:'dot', val: baseDmg, turns: sp.dur || 3, label:'DOT', dmgType: sp.dmgType || null });
        hbLog('☣ ' + sp.name + ' → ' + target.name + ' : DOT 3 tours');
      }
      break;
    }
    case 'pctKill': {
      var isAoeSpell4 = sp.aoe && sp.aoe !== 'single';
      if (target) {
        var pk = Math.floor(target.hp * pw);
        hbDamage(target, pk, caster, sp.dmgType || null);
        hbLog('☠ ' + sp.name + ' -' + pk + ' PV');
        hbCheckDeath(target);
      }
      break;
    }
    case 'heal': {
      var healTarget = (target && !isEnemy(target)) ? target : caster;
      var hl = sp.healAmt ? sp.healAmt : Math.floor(healTarget.mHp * pw * 0.6);
      healTarget.hp = Math.min(healTarget.hp + hl, healTarget.mHp);
      hbLog('💚 ' + sp.name + ' +' + hl + ' PV → ' + healTarget.name);
      hbSpawnFloating && hbSpawnFloating(healTarget.pos, '+'+hl, '#4ade80');
      break;
    }
    case 'shFull': {
      var buffTarget0 = (target && !isEnemy(target)) ? target : caster;
      buffTarget0.sh = buffTarget0.mSh;
      hbLog('🛡 ' + sp.name + ' : bouclier plein → ' + buffTarget0.name);
      break;
    }
    case 'shBoost': {
      var buffTarget1 = (target && !isEnemy(target)) ? target : caster;
      buffTarget1.sh = Math.min(buffTarget1.sh + Math.floor(pw), buffTarget1.mSh);
      hbLog('🛡 ' + sp.name + ' : +bouclier → ' + buffTarget1.name);
      break;
    }
    case 'dmgBlk':
    case 'fortress': {
      var buffTarget2 = (target && !isEnemy(target)) ? target : caster;
      hbAddEffect(buffTarget2, { type:'defBuf', val: pw, turns: 2, label:'DEF+' });
      hbLog('🧱 ' + sp.name + ' : -' + Math.round(pw*100) + '% dégâts 2 tours → ' + buffTarget2.name);
      break;
    }
    case 'invuln':
    case 'titan': {
      var buffTarget3 = (target && !isEnemy(target)) ? target : caster;
      hbAddEffect(buffTarget3, { type:'invuln', val:1, turns:1, label:'INVULN' });
      if (spType === 'titan') { var th=Math.floor(buffTarget3.mHp*0.4); buffTarget3.hp=Math.min(buffTarget3.hp+th,buffTarget3.mHp); }
      hbLog('✨ ' + sp.name + ' : invulnérable 1 tour → ' + buffTarget3.name);
      break;
    }
    case 'rgnBurst': {
      var buffTarget4 = (target && !isEnemy(target)) ? target : caster;
      hbAddEffect(buffTarget4, { type:'rgn', val: Math.floor(buffTarget4.mHp * 0.08), turns: 3, label:'RGN' });
      hbLog('⟳ ' + sp.name + ' : regen 3 tours → ' + buffTarget4.name);
      break;
    }
    case 'reflect': {
      var buffTarget5 = (target && !isEnemy(target)) ? target : caster;
      hbAddEffect(buffTarget5, { type:'reflect', val: pw, turns: 2, label:'RFLCT' });
      hbLog('🔄 ' + sp.name + ' : réflexion 2 tours → ' + buffTarget5.name);
      break;
    }
    case 'sacrifice':
      caster.hp = Math.max(1, caster.hp - Math.floor(caster.mHp * 0.2));
      hbAddEffect(caster, { type:'atkBuf', val: pw-1, turns: 2, label:'×ATQ' });
      hbLog('💀 ' + sp.name + ' : -20% PV, ATQ ×' + pw.toFixed(1));
      break;
    case 'aoe': {
      // AOE touche TOUTES les unités dans la zone (amis ET ennemis, y compris lanceur)
      var aoeRange = sp.aoeRange || 1;
      var aoeTargets = [];
      HB.units.forEach(function(u) {
        if (!u.alive) return;
        if (HB_HEX.dist(targetHex, u.pos) <= aoeRange) aoeTargets.push(u);
      });
      aoeTargets.forEach(function(t) {
        var dmgA = baseDmg;
        hbDamage(t, dmgA, caster, sp.dmgType || null);
        hbLog('💥 ' + sp.name + ' → ' + t.name + ' -' + dmgA + ' PV');
        hbCheckDeath(t);
      });
      break;
    }
    case 'invoc': {
      // Limite d'invocations simultanées
      var _maxInv = sp.maxInvoc || 1;
      var _curInv = HB.units.filter(function(u) {
        return u.alive && u.isInvoc && u.invocOwner === caster.id;
      }).length;
      if (_curInv >= _maxInv) { hbLog('🤖 Limite d\'invocation atteinte (' + _maxInv + ')'); break; }

      // Chercher une case libre (cible d'abord, puis voisines)
      var spawnHex = null;
      var spawnCandidates = [targetHex].concat(HB_HEX.neighbors(targetHex));
      for (var sci = 0; sci < spawnCandidates.length; sci++) {
        var sc = spawnCandidates[sci];
        var scData = HB.hexMap[hKey(sc)];
        if (scData && !scData.obstacle && !hbUnitAt(sc)) { spawnHex = sc; break; }
      }
      if (!spawnHex) { hbLog('🤖 Invocation : aucune case libre'); break; }

      // Résoudre les stats via INVOC_DEFS (nouveau) ou MOB_DEFS (legacy)
      var _invocDefId = sp.invocDefId;
      var _invocLvl   = sp.invocLvl || 1;
      var _iDef = _invocDefId && typeof INVOC_DEFS !== 'undefined' && INVOC_DEFS[_invocDefId];
      var invUnit;
      if (_iDef) {
        var _ist = _iDef.lvStats[Math.max(0, _invocLvl - 1)] || _iDef.lvStats[0];
        var _iCol = caster.isPlayer ? '#4ade80' : '#ff8c42';
        invUnit = {
          id: 'invoc_' + _invocDefId + '_' + Date.now(),
          isPlayer: caster.isPlayer, isInvoc: true, invocOwner: caster.id,
          mobCode: _iDef.mobCode || _invocDefId,
          name: _iDef.nm, icon:'🤖', col: _iCol,
          img: 'assets/enemies/hex/' + (_iDef.mobCode||_invocDefId) + '/' + (_iDef.mobCode||_invocDefId) + '_idle_s.png',
          pos: {q:spawnHex.q, r:spawnHex.r, s:spawnHex.s || -(spawnHex.q+spawnHex.r)},
          hp: _ist.hp, mHp: _ist.hp, sh:0, mSh:0,
          atk: _ist.atk, pm: _ist.pm, pmMax: _ist.pm, pa: _ist.pa, paMax: _ist.pa, init: _ist.init,
          esq:0, thorn:0, resPlas:0, resNeon:0, resGlitch:0, resNegate:0,
          effs:[], alive:true, facing:'s',
          spells: [hbSpellFromId('SP01')].filter(Boolean),
        };
        hbLog('🤖 ' + caster.name + ' invoque ' + invUnit.name + ' (nv.' + _invocLvl + ') !');
        hbSpawnFloating && hbSpawnFloating(spawnHex, '🤖', _iCol);
      } else {
        // Chemin legacy : MOB_DEFS
        var invocId2 = sp.invoc || sp.invocMobId;
        if (!invocId2) { hbLog('🤖 invoc: mobId manquant'); break; }
        var invocDef = null;
        for (var imi = 0; imi < MOB_DEFS.length; imi++) {
          if (MOB_DEFS[imi].id === invocId2) { invocDef = MOB_DEFS[imi]; break; }
        }
        if (!invocDef) { hbLog('🤖 Mob ' + invocId2 + ' introuvable'); break; }
        var ib = invocDef.base || {};
        invUnit = {
          id: 'invoc_' + invocId2 + '_' + Date.now(),
          isPlayer: caster.isPlayer, isInvoc: true, invocOwner: caster.id, mobCode: invocDef.id,
          name: invocDef.nm || invocId2, icon:'🤖', col: caster.isPlayer ? '#4ade80' : '#ff8c42',
          img: 'assets/enemies/hex/' + invocDef.id + '/' + invocDef.id + '_idle_s.png',
          pos: {q:spawnHex.q, r:spawnHex.r, s:spawnHex.s || -(spawnHex.q+spawnHex.r)},
          hp: ib.hp||50, mHp: ib.hp||50, sh:0, mSh:0,
          atk: ib.power||10, pm: ib.pm||2, pmMax: ib.pm||2, pa: ib.pa||4, paMax: ib.pa||4,
          init: ib.init||10,
          esq:0, thorn:0, resPlas:0, resNeon:0, resGlitch:0, resNegate:0,
          effs:[], alive:true, facing:'s',
          spells: [hbSpellFromId('SP01')].filter(Boolean),
        };
        hbLog('🤖 ' + caster.name + ' invoque ' + invUnit.name + ' !');
        hbSpawnFloating && hbSpawnFloating(spawnHex, '🤖', invUnit.col);
      }
      HB.units.splice(HB.turnIdx + 1, 0, invUnit);
      break;
    }
    case 'mine': {
      if (!HB.mines) HB.mines = [];
      var mineKey = hKey(targetHex);
      HB.mines.push({ q:targetHex.q, r:targetHex.r, s:targetHex.s, key:mineKey,
                      spellId:sp.id, caster:caster,
                      dmgMin:sp.dmgMin||0, dmgMax:sp.dmgMax||0 });
      hbLog('💣 ' + sp.name + ' : mine posée en ' + mineKey);
      hbSpawnFloating && hbSpawnFloating(targetHex, '💣', '#facc15');
      break;
    }
    case 'buff': {
      var buffUnit = (target && !isEnemy(target)) ? target : caster;
      hbAddEffect(buffUnit, { type:'atkBuf', val: pw * 0.3, turns: sp.cdMax || 2, label:'ATQ+' });
      hbLog('⚙️ ' + sp.name + ' : buff ATQ → ' + buffUnit.name);
      hbSpawnFloating && hbSpawnFloating(buffUnit.pos, 'BUFF', '#a78bfa');
      break;
    }
    default:
      hbLog('Sort ' + sp.name + ' lancé');
  }
}

function hbDamage(target, rawDmg, caster, dmgType) {
  if (!target || !target.alive) return false;
  if (hbHasEff(target, 'invuln')) {
    hbSpawnFloating && hbSpawnFloating(target.pos, 'INVULN', '#a78bfa');
    return false;
  }
  if (target === HB.player && P.esq > 0 && Math.random() < P.esq) {
    hbLog('◌ Esquive !');
    hbSpawnFloating && hbSpawnFloating(target.pos, 'ESQUIVE!', '#60a5fa');
    return false;
  }
  var isCrit = caster && caster.isPlayer && P.crit > 0 && Math.random() < P.crit;
  if (isCrit) rawDmg = Math.floor(rawDmg * (1 + (P.ccMult !== undefined ? P.ccMult : 0.5)));
  var res = 0;
  if      (dmgType === 'Plasma')  res = target.resPlas   || 0;
  else if (dmgType === 'Neon')    res = target.resNeon   || 0;
  else if (dmgType === 'Glitch')  res = target.resGlitch || 0;
  else if (dmgType === 'Negate')  res = target.resNegate || 0;
  var def = hbGetEff(target, 'defBuf');
  var dmg = Math.max(0, Math.floor(rawDmg * (1 - Math.min(res + def, 0.9))));
  target.hp = Math.max(0, target.hp - dmg);
  if (isCrit) hbLog('✦ CRITIQUE !');
  if (caster && dmg > 0 && target.thorn > 0) {
    var thornDmg = Math.floor(dmg * target.thorn);
    if (thornDmg > 0) {
      caster.hp = Math.max(0, caster.hp - thornDmg);
      hbSpawnFloating && hbSpawnFloating(caster.pos, '-' + thornDmg, '#f87171');
      hbLog('↩ Thorn : ' + caster.name + ' -' + thornDmg);
    }
  }
  return isCrit;
}

function hbAddEffect(unit, eff) {
  if (!unit.effs) unit.effs = [];
  unit.effs.push(eff);
}
function hbHasEff(unit, type) { return unit.effs && unit.effs.some(function(e){ return e.type===type; }); }
function hbGetEff(unit, type) {
  var v = 0;
  if (unit.effs) unit.effs.forEach(function(e){ if(e.type===type) v+=e.val; });
  return v;
}

function hbTickEffects(unit) {
  if (!unit.effs || !unit.effs.length) return;
  for (var i = unit.effs.length-1; i >= 0; i--) {
    var e = unit.effs[i];
    if (e.type === 'dot') { hbDamage(unit, e.val, null, e.dmgType || null); hbLog('☣ DOT → ' + unit.name + ' -' + e.val); }
    if (e.type === 'rgn') { unit.hp = Math.min(unit.hp + e.val, unit.mHp); }
    e.turns--;
    if (e.turns <= 0) unit.effs.splice(i, 1);
  }
}

function hbCheckDeath(unit) {
  if (!unit || unit.hp > 0 || !unit.alive) return;
  unit.alive = false;
  unit._dyingUntil = Date.now() + 1200;
  if (HB && HB.dyingUnits) HB.dyingUnits.push(unit);
  hbLog('💀 ' + unit.name + ' éliminé');
  // Maître mort → tous ses esclaves meurent
  if (HB && HB.units) {
    HB.units.forEach(function(slave) {
      if (slave.alive && slave.isInvoc && slave.invocOwner === unit.id) {
        slave.alive = false;
        slave._dyingUntil = Date.now() + 1200;
        if (HB.dyingUnits) HB.dyingUnits.push(slave);
        hbLog('🤖 ' + slave.name + ' hors ligne (maître éliminé)');
      }
    });
  }
  setTimeout(function(){ if(HB && !HB.over) hbCheckEnd(); }, 0);
}

var HB_TIMER_INTERVAL = null;
function hbStartTurnTimer(seconds) {
  hbClearTurnTimer();
  HB.turnTimeLeft = seconds;
  HB_TIMER_INTERVAL = setInterval(function() {
    if (!HB || HB.phase !== 'player') { hbClearTurnTimer(); return; }
    HB.turnTimeLeft--;
    renderHexHUD();
    if (HB.turnTimeLeft <= 0) {
      hbClearTurnTimer();
      hbLog('⏱ Temps écoulé — fin de tour automatique');
      hbEndPlayerTurn();
    }
  }, 1000);
}
function hbClearTurnTimer() {
  if (HB_TIMER_INTERVAL) { clearInterval(HB_TIMER_INTERVAL); HB_TIMER_INTERVAL = null; }
  if (HB) HB.turnTimeLeft = null;
}

// ── FIN DE TOUR (joueur) ──────────────────────────────────────────
function hbEndPlayerTurn() {
hbClearTurnTimer()
  if (!HB || HB.phase !== 'player' || HB.over) return;
  // Tick effets joueur
  hbTickEffects(HB.player);
  hbCheckDeath(HB.player);
  if (hbCheckEnd()) return;
  // Décrémente cooldowns sorts
  HB.player.spells.forEach(function(sp){ if(sp.cd>0)sp.cd--; });
  HB.actionMode  = 'none';
  HB.pendingSpell = null;
  HB.hlMove = []; HB.hlSpell = []; HB.hlAoe = [];
  HB.turnIdx++;
  // Filtre les unités mortes de l'ordre de jeu
  HB.units = HB.units.filter(function(u){ return u.alive; });
  hbNextTurn();
}

function hbNextTurn() {
  if (!HB || HB.over) return;
  if (HB.units.length === 0) { hbCheckEnd(); return; }
  HB.turnIdx = HB.turnIdx % HB.units.length;
  var cur = HB.units[HB.turnIdx];
  // Reset PM/PA
  cur.pm = cur.pmMax; cur.pa = cur.paMax;
  hbTickEffects(cur);
  hbCheckDeath(cur);
  if (!cur.alive) {
    HB.units.splice(HB.turnIdx, 1);
    hbNextTurn(); return;
  }
  if (hbCheckEnd()) return;

  if (cur.isPlayer && !cur.isInvoc) {
    HB.phase  = 'player';
    HB.round++;
    hbLog('— Tour ' + HB.round + ' — ' + cur.name + ' joue —');
    HB.actionMode = 'move';
    hbStartTurnTimer(60);
    hbRefreshHighlights();
    if (META.hbCamFollow && cur) hbSmoothCenterOnUnit(cur, 350);
    renderHexBattle();
    if (HB_AUTOPLAY) setTimeout(hbAutoPlayTurn, HB_CFG.AI_DELAY);
  } else if (cur.isInvoc) {
    HB.phase = 'enemy';
    hbShowTurnBanner(cur.name + ' joue', '#4ade80');
    if (META.hbCamFollow && cur) hbSmoothCenterOnUnit(cur, 200);
    renderHexBattle();
    setTimeout(function(){ hbInvocTurn(cur); }, HB_CFG.AI_DELAY);
  } else {
    HB.phase = 'enemy';
    hbShowTurnBanner(cur.name + ' joue', cur.col);
    if (META.hbCamFollow && cur) hbSmoothCenterOnUnit(cur, 350);
    renderHexBattle();
    setTimeout(function(){ hbAIMobTurn(cur); }, HB_CFG.AI_DELAY + 500);
  }
}

function hbInvocTurn(invoc) {
  if (!HB || HB.over || !invoc.alive) {
    HB.turnIdx++; HB.units = HB.units.filter(function(u){ return u.alive; }); hbNextTurn(); return;
  }
  var invocEnemies = HB.units.filter(function(u){ return u.alive && u.isPlayer !== invoc.isPlayer; });
  var invocTarget = null, invocMinD = Infinity;
  invocEnemies.forEach(function(e){ var d=HB_HEX.dist(invoc.pos,e.pos); if(d<invocMinD){invocMinD=d;invocTarget=e;} });

  function endTurn() {
    renderHexBattle();
    setTimeout(function(){ HB.turnIdx++; HB.units=HB.units.filter(function(u){return u.alive;}); hbNextTurn(); }, HB_CFG.AI_DELAY);
  }

  function tryAttack(tgt, cb) {
    if (!tgt || !tgt.alive || invoc.pa < HB_CFG.PA_BASIC_ATK || HB_HEX.dist(invoc.pos, tgt.pos) > 1) { cb(); return; }
    invoc.pa -= HB_CFG.PA_BASIC_ATK;
    var f = hbFacingTo(invoc.pos, tgt.pos); if (f) invoc.facing = f;
    invoc._attackAnim = Date.now() + 700;
    hbAnimAttack(invoc.pos, tgt.pos, '#4ade80', function() {
      var dmg = Math.max(1, Math.floor(invoc.atk));
      hbDamage(tgt, dmg, invoc, null);
      hbLog('🤖 ' + invoc.name + ' attaque ' + tgt.name + ' -' + dmg + ' PV');
      hbCheckDeath(tgt);
      if (hbCheckEnd()) return;
      renderHexBattle();
      cb();
    });
  }

  // Phase 1 : attaque si déjà adjacent
  tryAttack(invocTarget, function() {
    // Phase 2 : déplacement vers la cible
    setTimeout(function() {
      if (!HB || HB.over || !invoc.alive) { endTurn(); return; }
      if (invocTarget && invocTarget.alive && invoc.pm > 0) {
        var path = hbPath(invoc.pos, invocTarget.pos, invoc);
        var steps = Math.min(invoc.pm, Math.max(0, path.length - 1));
        if (steps > 0) {
          invoc.pm -= steps;
          hbAnimateUnit(invoc, path.slice(0, steps), function() {
            // Phase 3 : attaque après déplacement
            tryAttack(invocTarget, endTurn);
          });
          return;
        }
      }
      endTurn();
    }, HB_CFG.AI_DELAY);
  });
}

// ── IA ─────────────────────────────────────────────────────────
function hbAITurn(enemy) {
  if (!HB || HB.over || !enemy.alive) { hbNextTurn(); return; }
  var player = HB.player;

  // ── Helper: tenter d'attaquer avec le meilleur sort ou attaque de base ──
  function hbAIAttack() {
    var attacked = false;
    // Cherche le meilleur sort disponible à portée
    var bestSp = null, bestPwr = 0;
    if (enemy.spells) {
      enemy.spells.forEach(function(sp) {
        if (sp.cd > 0 || enemy.pa < (sp.pa || sp.energy || 4)) return;
        var d = HB_HEX.dist(enemy.pos, player.pos);
        if (d < (sp.minRange||1) || d > sp.range) return;
        if (!hbHasLOS(enemy.pos, player.pos, false)) return;
        var pwr = sp.pwr * (sp.hits||1);
        if (pwr > bestPwr) { bestPwr = pwr; bestSp = sp; }
      });
    }
    if (bestSp) {
      enemy.pa -= (bestSp.pa || bestSp.energy || 4);
      bestSp.cd = bestSp.cdMax;
      hbApplySpell(enemy, bestSp, player.pos);
      hbCheckDeath(player);
      renderHexBattle();
      attacked = true;
    }
    // Attaque de base si adjacent et PA restants
    if (!attacked || true) { // peut attaquer en base ET avec un sort si PA suffisant
      var dist2 = HB_HEX.dist(enemy.pos, player.pos);
      if (dist2 <= 1 && enemy.pa >= HB_CFG.PA_BASIC_ATK && player.alive) {
        enemy.pa -= HB_CFG.PA_BASIC_ATK;
        enemy._attackAnim = Date.now() + 700;
        var _eFacing = hbFacingTo(enemy.pos, player.pos);
        if (_eFacing) enemy.facing = _eFacing;
        var dmg = Math.floor(enemy.atk * (1 + hbGetEff(enemy, 'atkBuf')));
        hbDamage(player, dmg, enemy, null);
        hbLog('👾 ' + enemy.name + ' frappe ' + player.name + ' −' + dmg + ' PV');
        hbCheckDeath(player);
        renderHexBattle();
        attacked = true;
      }
    }
    return attacked;
  }

  // ── Phase 1 : attaque si déjà à portée ──────────────────────────────────
  if (hbAIAttack()) { if (hbCheckEnd()) return; }

  // ── Phase 2 : déplacement vers le joueur ────────────────────────────────
  // Portée d'arrêt = meilleure portée de sort disponible (même en CD), sinon 1
  var bestRange = 1;
  if (enemy.spells) {
    enemy.spells.forEach(function(sp){ if ((sp.range||1) > bestRange) bestRange = sp.range; });
  }
  var stopDist = Math.max(1, bestRange - 1); // s'arrête juste à portée

  setTimeout(function() {
    if (!HB || HB.over || !enemy.alive) { hbNextTurn(); return; }
    var moved = false;
    if (enemy.pm > 0 && player.alive) {
      // Tacle joueur — si adjacent au joueur, celui-ci peut bloquer la fuite
      if (HB_HEX.dist(enemy.pos, player.pos) === 1 && (P.tacle || 0) > 0) {
        if (Math.random() < P.tacle / 100) {
          enemy.pm = 0;
          hbLog('⚡ ' + enemy.name + ' taclé par le joueur !');
          hbSpawnFloating && hbSpawnFloating(enemy.pos, 'TACLÉ !', '#22d3ee');
        }
      }
      var path = hbPath(enemy.pos, player.pos, enemy);
      var steps = Math.min(enemy.pm, Math.max(0, path.length - stopDist));
      if (steps > 0) {
        moved = true;
        var pathToWalk = path.slice(0, steps);
        enemy.pm -= steps;
        hbAnimateUnit(enemy, pathToWalk, function() {
          // ── Phase 3 : attaque APRÈS déplacement ─────────────────────────
          hbAIAttack();
          if (hbCheckEnd()) return;
          if (enemy.spells) enemy.spells.forEach(function(sp){ if(sp.cd>0)sp.cd--; });
          renderHexBattle();
          setTimeout(function(){ HB.turnIdx++; hbNextTurn(); }, HB_CFG.AI_DELAY);
        });
        return;
      }
    }
    if (enemy.spells) enemy.spells.forEach(function(sp){ if(sp.cd>0)sp.cd--; });
    renderHexBattle();
    setTimeout(function(){ HB.turnIdx++; hbNextTurn(); }, HB_CFG.AI_DELAY);
  }, HB_CFG.AI_DELAY);
}

// ── FIN DE COMBAT ─────────────────────────────────────────────────
function hbCheckEnd() {
  if (!HB || HB.over) return false;
  var playerDead = !HB.player.alive || HB.player.hp <= 0;
  var allDead    = HB.enemies.every(function(e){ return !e.alive; });
  if (!playerDead && !allDead) return false;

  HB.over = true;
  HB._showResultAt = Date.now() + 2000;
  HB.won  = allDead && !playerDead;
  HB.phase = 'result';

  if (HB.won) {
var lv = META.hero.lv || 1;
    var scMult = (HB.scenario && HB.scenario.rewardMult) || 1;
    var _premMult = typeof PREMIUM_MODE !== 'undefined' && PREMIUM_MODE ? PREMIUM_MULT : 1;
    HB.rewardCr  = Math.floor((HB_CFG.REWARD_CR_BASE + lv * 12) * HB.enemies.length * scMult * _premMult * (1 + (P.credits||0)));
    HB.rewardXP  = Math.floor((HB_CFG.REWARD_XP_BASE + lv * 5) * HB.enemies.length * scMult * _premMult * (1 + (P.xpBonus||0)));
    META.cr += HB.rewardCr;
    gainXP(HB.rewardXP);
    // ── Drops hex : équipements + spare parts ────────────────────
    HB.lootItems = [];
    var _premMult2 = (typeof PREMIUM_MODE !== 'undefined' && PREMIUM_MODE ? PREMIUM_MULT : 1);
    var _killedEnemies = HB.enemies || [];

    // Drop équipement (taux fixe 55%, une chance par ennemi tué)
    _killedEnemies.forEach(function(enemy) {
      var equipChance = Math.min(0.95, (0.55 + (P.loot||0)) * _premMult2);
      if (Math.random() < equipChance && typeof STUFF_DEFS !== 'undefined') {
        var pool = STUFF_DEFS.filter(function(d){ return d.lrq <= (lv + 5); });
        if (pool.length) {
          var def = pool[Math.floor(Math.random() * pool.length)];
          if (typeof rollItem === 'function') {
            var dropped = rollItem(def.id);
            if (dropped) {
              dropped.type = 'equip'; dropped.perm = false; dropped.relicCount = 0;
              META.inv.push(dropped);
              HB.lootItems.push(dropped);
            }
          }
        }
      }

      // Drop spare parts : chaque part a son propre dropRate par ennemi tué
      if (typeof SPARE_PARTS !== 'undefined') {
        SPARE_PARTS.forEach(function(sp) {
          if (lv < sp.lrq) return; // niveau trop bas
          // dropMobs: 'all' = tous, 'MO01' = mob spécifique
          if (sp.dropMobs !== 'all' && sp.dropMobs !== enemy.id.split('_')[0]) return;
          var chance = Math.min(1.0, sp.dropRate * _premMult2);
          if (Math.random() < chance) {
            var spItem = {
              uid: 'SP' + (Math.random() * 1e9 | 0),
              type: 'spare', partId: sp.id,
              nm: sp.nm, icon: sp.icon, img: sp.img,
              rar: sp.rar, perm: false, sell: sp.sell
            };
            META.inv.push(spItem);
            HB.lootItems.push(spItem);
            hbLog(sp.icon + ' ' + sp.nm + ' trouvé !');
          }
        });
      }
    });
    saveMeta(); updateTop();
    hbLog('🏆 VICTOIRE ! +' + HB.rewardCr + '₵ +' + HB.rewardXP + ' XP');
    // Donjon : sauvegarde PV + accumulation récompenses
    if (HB_DONJON && HB_DONJON.active) {
      HB_DONJON.savedHp    = HB.player.hp;
      HB_DONJON.savedHpMax = HB.player.mHp;
      HB_DONJON.totalCr   += HB.rewardCr;
      HB_DONJON.totalXp   += HB.rewardXP;
      HB_DONJON.totalLoot  = HB_DONJON.totalLoot.concat(HB.lootItems || []);
      if (HB_DONJON.fightNum < HB_DONJON.fightTotal) {
        HB_DONJON.fightNum++;
        HB._donjonContinue = true;
      } else {
        HB._donjonFinal = true;
        HB_DONJON.active = false;
      }
    }
  } else {
    hbLog('💀 DÉFAITE…');
    if (HB_DONJON) HB_DONJON.active = false;
  }
  setTimeout(renderHexBattle, 2000);
  return true;
}

function hbToggleTacticMode() {
  if (!HB) return;
  HB.tacticMode = !HB.tacticMode;
  HB_CVS.draw();
  renderHexActionBar();
}
function hbToggleHexOpacity() { hbToggleTacticMode(); }

// ── AUTOPLAY ──────────────────────────────────────────────────────
var HB_AUTOPLAY = false;
var HB_AUTOPLAY_TIMER = null;

function hbToggleAutoPlay() {
  HB_AUTOPLAY = !HB_AUTOPLAY;
  if (HB_AUTOPLAY_TIMER) { clearInterval(HB_AUTOPLAY_TIMER); HB_AUTOPLAY_TIMER = null; }
  renderHexActionBar();
  if (HB_AUTOPLAY && HB && HB.phase === 'player' && !HB.over) {
    setTimeout(hbAutoPlayTurn, HB_CFG.AI_DELAY);
  }
}

function hbAutoPlayTurn() {
  if (!HB || HB.over || HB.phase !== 'player' || !HB_AUTOPLAY) return;
  var p = HB.player;
  var targets = HB.enemies.filter(function(e){ return e.alive; });
  if (!targets.length) { hbEndPlayerTurn(); return; }

  // Cible : ennemi le plus proche
  var target = targets.reduce(function(best, e) {
    return HB_HEX.dist(p.pos, e.pos) < HB_HEX.dist(p.pos, best.pos) ? e : best;
  }, targets[0]);

  // Meilleur sort disponible à portée
  var bestSp = null, bestPwr = 0;
  (p.spells || []).forEach(function(sp) {
    var cost = sp.energy;
    if (sp.cd > 0 || p.pa < cost) return;
    var d = HB_HEX.dist(p.pos, target.pos);
    if (d < (sp.minRange || 1) || d > (sp.range || 3)) return;
    var pwr = (sp.pwr || 0) * (sp.hits || 1);
    if (pwr > bestPwr) { bestPwr = pwr; bestSp = sp; }
  });
  if (bestSp) {
    p.pa -= bestSp.energy * 2;
    bestSp.cd = bestSp.cdMax;
    var _cells = hbAoeCells(target.pos, bestSp.aoe, p.pos, p);
    _cells.forEach(function(c){ hbApplySpell(p, bestSp, c); });
    hbLog('🤖 [AUTO] ' + p.name + ' : ' + bestSp.name);
    hbRefreshHighlights(); renderHexBattle();
    if (hbCheckEnd()) return;
  }

  // Attaque de base si adjacent
  if (p.pa >= HB_CFG.PA_BASIC_ATK && HB_HEX.dist(p.pos, target.pos) <= 1 && target.alive) {
    p.pa -= HB_CFG.PA_BASIC_ATK;
    var dmg = Math.floor(p.atk * (1 + hbGetEff(p, 'atkBuf')));
    hbDamage(target, dmg, p, p.weapDmgType || 'Negate');
    hbLog('⚔️ [AUTO] ' + p.name + ' frappe -' + dmg + ' PV');
    hbCheckDeath(target);
    renderHexBattle();
    if (hbCheckEnd()) return;
  }

  // Déplacement + 2e attaque
  setTimeout(function() {
    if (!HB || HB.over || HB.phase !== 'player' || !HB_AUTOPLAY) return;
    var bestRange = 1;
    (p.spells || []).forEach(function(sp){ if ((sp.range || 1) > bestRange) bestRange = sp.range || 1; });
    var stopDist = Math.max(1, bestRange - 1);
    if (p.pm > 0 && target.alive) {
      var path = hbPath(p.pos, target.pos, p);
      var steps = Math.min(p.pm, Math.max(0, path.length - stopDist));
      if (steps > 0) {
        p.pm -= steps;
        hbAnimateUnit(p, path.slice(0, steps), function() {
          if (!HB || HB.over || !HB_AUTOPLAY) return;
          if (p.pa >= HB_CFG.PA_BASIC_ATK && HB_HEX.dist(p.pos, target.pos) <= 1 && target.alive) {
            p.pa -= HB_CFG.PA_BASIC_ATK;
            var dmg2 = Math.floor(p.atk * (1 + hbGetEff(p, 'atkBuf')));
            hbDamage(target, dmg2, p, p.weapDmgType || 'Negate');
            hbLog('⚔️ [AUTO] ' + p.name + ' frappe -' + dmg2 + ' PV');
            hbCheckDeath(target);
            renderHexBattle();
            if (hbCheckEnd()) return;
          }
          setTimeout(hbEndPlayerTurn, 300);
        });
        return;
      }
    }
    hbEndPlayerTurn();
  }, HB_CFG.AI_DELAY);
}

function hbQuit() {
  hbClearTurnTimer();
  hbCancelAutoReady();
  HB_DONJON = null;
  _hbSelMode = null;
  HB = null;
  navigate('home');
}

function hbDonjonNextFight() {
  if (!HB_DONJON || !HB_DONJON.active) return;
  startHexBattle(HB_DONJON.scenarioId);
}

function hbDonjonAbandon() {
  HB_DONJON = null;
  hbClearTurnTimer();
  hbCancelAutoReady();
  _hbSelMode = null;
  HB = null;
  navigate('home');
}

// ── RENDU CANVAS ─────────────────────────────────────────────────
// ── CACHE IMAGES SPRITES ─────────────────────────────────────────
// Mapping hero id → asset code (HE01, HE02, ...)
var HB_HERO_CODE = { berserker: 'HE01', warden: 'HE02', hacker: 'HE03' };
// Mapping hero code → attack animation name (HE01/HE02/HE03 use attack_spell)
var HB_ATTACK_ANIM = { HE01: 'attack_spell', HE02: 'attack', HE03: 'attack_spell' };
// Mapping hex facing → sprite dir suffix used in filenames
var HB_DIR_MAP = { se:'s', sw:'sw', ne:'ne', nw:'nw', n:'n', e:'se', w:'nw' };
var HB_IMG = {};
var HB_IMG_404 = {}; // chemins définitivement absents — évite de retenter les mêmes 404
function hbImg(src) {
  if (!src || HB_IMG_404[src]) return null;
  if (!HB_IMG[src]) {
    var img = new Image();
    img.onload = function(){ if(HB && !HB.over) HB_CVS.draw(); };
    img.onerror = function(){ HB_IMG_404[src] = true; delete HB_IMG[src]; };
    img.src = src;
    HB_IMG[src] = img;
  }
  return HB_IMG[src];
}

var HB_CVS = (function() {
  var _canvas = null, _ctx = null, _dpr = 1, _bound = false;
  var _drag   = { on:false, sx:0, sy:0, cx:0, cy:0, moved:false };

  function init() {
    var el = document.getElementById('hb-canvas');
    if (!el) return;
    var firstInit = (_canvas !== el);
    if (firstInit) { _canvas = el; _ctx = el.getContext('2d'); _bound = false; }
    resize();   // toujours recalculer — sans ça canvasW/H peut rester à 390/300
                // alors que la hauteur réelle est différente (→ clearRect incomplet)
    if (!_bound) { bindEvents(); _bound = true; }
  }

  function resize() {
    if (!_canvas) return;
    var wrap = document.getElementById('hb-canvas-wrap');
    var W = wrap ? Math.round(wrap.clientWidth)  : 390;
    var H = wrap ? Math.round(wrap.clientHeight) : 300;
    if (H < 200) H = 300;
    _dpr = window.devicePixelRatio || 1;
    var newW = Math.round(W * _dpr);
    var newH = Math.round(H * _dpr);
    // Ne réassigne les dimensions que si elles changent vraiment
    // (assigner canvas.width/height efface le canvas et cause un saut visuel)
    if (_canvas.width !== newW || _canvas.height !== newH) {
      _canvas.width  = newW;
      _canvas.height = newH;
      _canvas.style.width  = W + 'px';
      _canvas.style.height = H + 'px';
    }
    _ctx.setTransform(1,0,0,1,0,0);
    _ctx.scale(_dpr, _dpr);
    if (HB) { HB.canvasW = W; HB.canvasH = H; }
  }

  function bindEvents() {
_canvas.addEventListener('mousedown',  onDown);
    _canvas.addEventListener('mousemove',  onMove);
    // mouseup sur document : évite que le drag reste bloqué si on relâche hors canvas
    document.addEventListener('mouseup', function(e){
      if (!_drag.on) return;
      var p = cxy(e);
      if (!_drag.moved) hbHandleCanvasClick(p.x, p.y);
      _drag.on = false; _drag.moved = false;
    });
  _canvas.addEventListener('touchstart', function(e){
      var p=txy(e); if(!p) return;
      _drag = { on:true, sx:p.x, sy:p.y, cx:HB?HB.camX:0, cy:HB?HB.camY:0, moved:false };
    }, {passive:true});
    _canvas.addEventListener('touchmove', function(e){
      var p=txy(e); if(!p||!_drag.on) return;
      var dx=p.x-_drag.sx, dy=p.y-_drag.sy;
      if (Math.abs(dx)>8||Math.abs(dy)>8) _drag.moved=true;  // seuil plus grand sur mobile
      if (_drag.moved && HB) { HB.camX=Math.round(_drag.cx+dx); HB.camY=Math.round(_drag.cy+dy); HB_CVS.draw(); }
    }, {passive:true});
    _canvas.addEventListener('touchend', function(e){
      var t=e.changedTouches&&e.changedTouches[0]; if(!t) return;
      var r=_canvas.getBoundingClientRect();
      var px=t.clientX-r.left, py=t.clientY-r.top;
      if (!_drag.moved) hbHandleCanvasClick(px, py);
      _drag.on=false; _drag.moved=false;
    });
    window.addEventListener('resize', resize);
// ── ZOOM scroll (PC) ─────────────────────────────────────────
_canvas.addEventListener('wheel', function(e) {
  e.preventDefault();
  if (!HB) return;
  var delta = e.deltaY > 0 ? -1 : 1;
  HB.zoom = Math.max(0, Math.min(3, (HB.zoom||1) + delta));
  HB_CVS.draw();
}, {passive: false});

// ── ZOOM pinch (mobile) ───────────────────────────────────────
var _pinchDist = null;
_canvas.addEventListener('touchstart', function(e) {
  if (e.touches.length === 2) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    _pinchDist = Math.sqrt(dx*dx + dy*dy);
  }
}, {passive: true});
_canvas.addEventListener('touchmove', function(e) {
  if (e.touches.length === 2 && _pinchDist && HB) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    var d  = Math.sqrt(dx*dx + dy*dy);
    if (d > _pinchDist + 30)      { HB.zoom = Math.min(3, (HB.zoom||1)+1); _pinchDist = d; HB_CVS.draw(); }
    else if (d < _pinchDist - 30) { HB.zoom = Math.max(0, (HB.zoom||1)-1); _pinchDist = d; HB_CVS.draw(); }
  }
}, {passive: true});
_canvas.addEventListener('touchend', function(e) {
  if (e.touches.length < 2) _pinchDist = null;
});
  }

  function txy(e) {
    if (!e.touches || !e.touches.length) return null;
    var r = _canvas.getBoundingClientRect();
    return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
  }
  function cxy(e) {
    var r = _canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    if (e.button !== 0) return;
    var p = cxy(e);
    _drag = { on:true, sx:p.x, sy:p.y, cx:HB?HB.camX:0, cy:HB?HB.camY:0, moved:false };
  }
  function onMove(e) {
    if (!HB) return;
    var p = cxy(e);
    if (_drag.on) {
      var dx = p.x-_drag.sx, dy = p.y-_drag.sy;
      if (Math.abs(dx)>4||Math.abs(dy)>4) _drag.moved = true;
      if (_drag.moved) { HB.camX = Math.round(_drag.cx+dx); HB.camY = Math.round(_drag.cy+dy); }
    }
    hbHandleCanvasHover(p.x, p.y);
  }
  function onUp(e) {
    if (!HB) { _drag.on=false; return; }
    var p = cxy(e);
    if (!_drag.moved) hbHandleCanvasClick(p.x, p.y);
    _drag.on = false; _drag.moved = false;
  }

  // ── DRAW ────────────────────────────────────────────────────────
  function draw() {
    if (!_canvas || !_ctx || !HB) return;
    var W = HB.canvasW || _canvas.clientWidth;
    var H = HB.canvasH || _canvas.clientHeight;
    _ctx.clearRect(0, 0, W, H);

    // Fond dégradé de base
    var bg = _ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0, '#06080f'); bg.addColorStop(1, '#0c1020');
    _ctx.fillStyle = bg; _ctx.fillRect(0,0,W,H);

    var zoomLevels = [0.40, 0.65, 1.0, 1.35];
    var z  = zoomLevels[HB.zoom||1];

    _ctx.save();
    _ctx.translate(W/2, H/2);
    _ctx.scale(z, z);
    _ctx.translate(-W/2, -H/2);

    // ox/oy calcules ici - utilises par le bg ET les tuiles
    var ox = W/2 + HB.camX, oy = H/2 + HB.camY;

    // Image de fond — masquée en mode tactic
    var _mapDef = HB.scenario && HB_MAP_DEFS[HB.scenario.mapId];
    if (_mapDef && _mapDef.bgImage && !HB.tacticMode) {
      var _bgImg = hbImg(_mapDef.bgImage);
      if (_bgImg && _bgImg.complete && _bgImg.naturalWidth) {
        _ctx.save();
        _ctx.globalAlpha = 0.52;
        var bw = _bgImg.naturalWidth, bh = _bgImg.naturalHeight;
        var bgScale = Math.max(W / bw, H / bh) / 0.65 * 1.05;
        var dw = bw * bgScale, dh = bh * bgScale;
        _ctx.drawImage(_bgImg, ox - dw/2, oy - dh/2, dw, dh);
        _ctx.restore();
      }
    }

    // Tuiles (triées par y pour Painter's algo)
    var tiles = Object.values(HB.hexMap).sort(function(a,b){
      var pa = HB_HEX.toPixel(a.q,a.r,ox,oy);
      var pb = HB_HEX.toPixel(b.q,b.r,ox,oy);
      return pa.y - pb.y;
    });

    tiles.forEach(function(h){ drawHex(h, ox, oy); });

    // Unités (triées par y) — inclut les unités en animation de mort
    if (HB.dyingUnits) HB.dyingUnits = HB.dyingUnits.filter(function(u){ return Date.now() < u._dyingUntil; });
    var _dyingNow = HB.dyingUnits || [];
    HB.units.filter(function(u){ return u.alive; })
      .concat(_dyingNow)
      .sort(function(a,b){
        return HB_HEX.toPixel(a.pos.q,a.pos.r,ox,oy).y - HB_HEX.toPixel(b.pos.q,b.pos.r,ox,oy).y;
      })
      .forEach(function(u){ drawUnit(u, ox, oy); });

    _ctx.restore();
  }

  function drawHex(h, ox, oy) {
    var p  = HB_HEX.toPixel(h.q, h.r, ox, oy);
    var cn = HB_HEX.corners(p.x, p.y);
    var D  = HB_HEX.DEPTH;

    var isHlMove  = HB.hlMove.some(function(c){ return hEq(c,h); });
    var isHlSpell = HB.hlSpell.some(function(c){ return hEq(c,h); });
    var isHlAoe   = HB.hlAoe.some(function(c){ return hEq(c,h); });
    var isHlEnemy = HB.hlEnemy && HB.hlEnemy.some(function(c){ return hEq(c,h); });
    var isHover   = HB.hovered && hEq(HB.hovered, h);
    var isObs     = h.obstacle;
    var isEdge    = (h.terrain === 'edge');
    // Toggle opacite : true (defaut) = cases visibles, false = invisible (juste bordures)
    var op = (HB.hexOpacity !== false) ? 1.0 : 0.0;

    // Priorite : highlights > obstacle > edge > normal
    // Les highlights sont testes EN PREMIER pour que les cases de bord
    // (spawn points) s affichent correctement quand elles sont en hlMove.
    var wallL, wallR, faceFill, borderCol, borderW;

    if (isHlEnemy) {
      // Cases de spawn ennemi en violet pendant le positionnement
      wallL = 'rgba(80,0,180,0.60)'; wallR = 'rgba(100,0,200,0.55)';
      faceFill  = 'rgba(168,85,247,0.30)';
      borderCol = 'rgba(192,132,252,1.0)'; borderW = 2.2;
    } else if (isHlMove) {
      wallL = 'rgba(0,60,180,0.60)'; wallR = 'rgba(0,80,200,0.55)';
      faceFill  = 'rgba(0,140,255,0.28)';
      borderCol = 'rgba(0,200,255,1.0)'; borderW = 2.2;
    } else if (isHlAoe) {
      wallL = 'rgba(130,90,0,0.60)'; wallR = 'rgba(150,110,0,0.55)';
      faceFill  = 'rgba(251,191,36,0.32)';
      borderCol = 'rgba(251,191,36,1.0)'; borderW = 2.2;
    } else if (isHlSpell) {
      wallL = 'rgba(140,10,40,0.60)'; wallR = 'rgba(160,20,50,0.55)';
      faceFill  = 'rgba(255,40,80,0.28)';
      borderCol = 'rgba(255,51,85,1.0)'; borderW = 2.2;
    } else if (isHlAoe) {
      wallL = 'rgba(130,90,0,0.60)'; wallR = 'rgba(150,110,0,0.55)';
      faceFill  = 'rgba(251,191,36,0.32)';
      borderCol = 'rgba(251,191,36,1.0)'; borderW = 2.2;
    } else if (isHover) {
      wallL = 'rgba(0,30,80,0.12)'; wallR = 'rgba(0,30,80,0.10)';
      faceFill  = 'rgba(0,212,255,0.08)';
      borderCol = 'rgba(255,255,255,0.80)'; borderW = 1.8;
    } else if (isObs && h.obstacleType === 'pit') {
      // Trou : fond noir, contour rouge fonce
      wallL = 'rgba(0,0,0,0)'; wallR = 'rgba(0,0,0,0)';
      faceFill  = 'rgba(8,0,0,0.88)';
      borderCol = 'rgba(180,30,30,0.90)'; borderW = 2.0;
    } else if (isObs) {
      // Mur : fond sombre, contour rouge fonce
      wallL = 'rgba(20,8,8,0.95)'; wallR = 'rgba(15,5,5,0.95)';
      faceFill  = 'rgba(25,8,8,0.95)';
      borderCol = 'rgba(160,30,30,0.90)'; borderW = 2.0;
    } else {
      // Toutes les cases normales ET edge : identiques, blanc uniforme
      wallL = 'rgba(0,15,40,0.12)';
      wallR = 'rgba(0,22,55,0.12)';
      faceFill  = 'rgba(6,14,30,0.08)';
      borderCol = 'rgba(255,255,255,0.48)';
      borderW   = 1.4;
    }

    // Mur gauche
    _ctx.beginPath();
    _ctx.moveTo(cn[3].x, cn[3].y);
    _ctx.lineTo(cn[3].x, cn[3].y + D);
    _ctx.lineTo(cn[4].x, cn[4].y + D);
    _ctx.lineTo(cn[4].x, cn[4].y);
    _ctx.closePath();
    _ctx.fillStyle = wallL; _ctx.fill();

    // Mur droit
    _ctx.beginPath();
    _ctx.moveTo(cn[4].x, cn[4].y);
    _ctx.lineTo(cn[4].x, cn[4].y + D);
    _ctx.lineTo(cn[5].x, cn[5].y + D);
    _ctx.lineTo(cn[5].x, cn[5].y);
    _ctx.closePath();
    _ctx.fillStyle = wallR; _ctx.fill();

    // Face superieure
    _ctx.beginPath();
    _ctx.moveTo(cn[0].x, cn[0].y);
    for (var i = 1; i < 6; i++) _ctx.lineTo(cn[i].x, cn[i].y);
    _ctx.closePath();
    _ctx.fillStyle = faceFill; _ctx.fill();

    // Bordure neon : halo blanc sur cases normales, standard sur obstacles/HL
    _ctx.strokeStyle = borderCol;
    _ctx.lineWidth   = borderW;
    if (!isObs && !isHlMove && !isHlSpell && !isHlAoe && !isHover) {
      // Petit halo neon blanc
      _ctx.shadowColor = 'rgba(255,255,255,0.35)';
      _ctx.shadowBlur  = 4;
    }
    _ctx.stroke();
    _ctx.shadowBlur = 0;
    _ctx.shadowColor = 'transparent';

    // Obstacle 3D : mur = bloc plein, pit = bord avec croix
    if (isObs && h.obstacleType !== 'pit') {
      // Mur : bloc legèrement surélevé avec contour rouge foncé
      var lift = 5; // hauteur de surélévation en px
      _ctx.save();
      // Face surélevée (décalée vers le haut)
      _ctx.globalAlpha = 0.95;
      _ctx.fillStyle = '#1a0808';
      _ctx.beginPath();
      _ctx.moveTo(cn[0].x, cn[0].y - lift);
      for (var wi = 1; wi < 6; wi++) _ctx.lineTo(cn[wi].x, cn[wi].y - lift);
      _ctx.closePath();
      _ctx.fill();
      // Contour rouge foncé surélevé
      _ctx.strokeStyle = 'rgba(160,30,30,0.95)';
      _ctx.lineWidth = 2.0;
      _ctx.shadowColor = 'rgba(200,20,20,0.4)';
      _ctx.shadowBlur = 6;
      _ctx.stroke();
      _ctx.shadowBlur = 0;
      // Face avant 3D (bande entre hauteur normale et surélevée)
      _ctx.globalAlpha = 0.80;
      _ctx.fillStyle = '#100404';
      _ctx.beginPath();
      _ctx.moveTo(cn[3].x, cn[3].y - lift);
      _ctx.lineTo(cn[3].x, cn[3].y + D);
      _ctx.lineTo(cn[5].x, cn[5].y + D);
      _ctx.lineTo(cn[5].x, cn[5].y - lift);
      _ctx.closePath();
      _ctx.fill();
      // Éclat rouge sur l'arête haute gauche
      _ctx.globalAlpha = 0.50;
      _ctx.strokeStyle = '#ef4444';
      _ctx.lineWidth = 1;
      _ctx.beginPath();
      _ctx.moveTo(cn[3].x, cn[3].y - lift);
      _ctx.lineTo(cn[3].x, cn[3].y - lift + D*0.5);
      _ctx.stroke();
      _ctx.restore();
    } else if (isObs && h.obstacleType === 'pit') {
      // Trou : fond noir + croix rouge
      _ctx.save();
      // Fond sombre
      _ctx.globalAlpha = 0.85;
      _ctx.fillStyle = '#0a0000';
      _ctx.beginPath();
      _ctx.moveTo(cn[0].x, cn[0].y);
      for (var pi = 1; pi < 6; pi++) _ctx.lineTo(cn[pi].x, cn[pi].y);
      _ctx.closePath();
      _ctx.fill();
      // Croix rouge
      _ctx.globalAlpha = 0.90;
      _ctx.strokeStyle = '#cc2020';
      _ctx.lineWidth = 2.5;
      _ctx.lineCap = 'round';
      var Rp = HB_HEX.SIZE * 0.38;
      _ctx.beginPath();
      _ctx.moveTo(p.x - Rp, p.y - Rp * HB_HEX.ISO);
      _ctx.lineTo(p.x + Rp, p.y + Rp * HB_HEX.ISO);
      _ctx.moveTo(p.x + Rp, p.y - Rp * HB_HEX.ISO);
      _ctx.lineTo(p.x - Rp, p.y + Rp * HB_HEX.ISO);
      _ctx.stroke();
      // Contour rouge foncé
      _ctx.globalAlpha = 0.90;
      _ctx.strokeStyle = 'rgba(180,30,30,0.90)';
      _ctx.lineWidth = 2.0;
      _ctx.beginPath();
      _ctx.moveTo(cn[0].x, cn[0].y);
      for (var pi2 = 1; pi2 < 6; pi2++) _ctx.lineTo(cn[pi2].x, cn[pi2].y);
      _ctx.closePath();
      _ctx.stroke();
      _ctx.restore();
    }
  }

  var _hbSilCache = {};
  function _hbGetSil(img, frame) {
    var key = img.src + '_' + frame;
    if (_hbSilCache[key]) return _hbSilCache[key];
    var fw = img.naturalHeight;
    var oc = document.createElement('canvas');
    oc.width = fw; oc.height = fw;
    var octx = oc.getContext('2d');
    octx.drawImage(img, frame * fw, 0, fw, fw, 0, 0, fw, fw);
    octx.globalCompositeOperation = 'source-in';
    octx.fillStyle = '#000000';
    octx.fillRect(0, 0, fw, fw);
    _hbSilCache[key] = oc;
    return oc;
  }

  function drawUnit(unit, ox, oy) {
    var pos = (unit._animPos) ? unit._animPos : unit.pos;
    var p   = HB_HEX.toPixel(pos.q, pos.r, ox, oy);
    var S   = HB_HEX.SIZE;
    var R   = S * 0.68;
    var D   = HB_HEX.DEPTH;
    var isSel = (HB.player === unit);
    var cn  = HB_HEX.corners(p.x, p.y);

    // Ombre isométrique aplatie — save/restore isolé pour éviter
    // d'hériter d'un shadowBlur actif d'une unité précédente
    _ctx.save();
    _ctx.shadowBlur = 0; _ctx.shadowColor = 'transparent';
    _ctx.beginPath();
    _ctx.ellipse(p.x, p.y + D * 0.5, R * 0.78, R * 0.20, 0, 0, Math.PI * 2);
    _ctx.fillStyle = 'rgba(0,0,0,0.50)';
    _ctx.fill();
    _ctx.restore();

    // Sprite joueur : portrait clipé en hexagone
    var drawnSprite = false;
    if (unit.isPlayer && !unit.isInvoc) {
      var hd = (typeof getH === 'function') ? getH(META.heroId || 'berserker') : null;
      if (hd) {
        var facing   = unit.facing || 'se';
        var pAnimSt  = !unit.alive ? 'die'
          : unit._animPos ? 'run'
          : (unit._attackAnim && Date.now() < unit._attackAnim) ? 'attack'
          : 'idle';
        var heroCode  = HB_HERO_CODE[META.heroId] || 'HE01';
        var pFileAnim = (pAnimSt === 'attack') ? (HB_ATTACK_ANIM[heroCode] || 'attack') : pAnimSt;
        var pDir      = HB_DIR_MAP[facing] || 's';
        var pPath     = 'assets/heroes/' + heroCode + '/' + heroCode + '_' + pFileAnim + '_' + pDir + '.png';
        var img = hbImg(pPath);
        // Fallback n → ne pour cette direction
        if ((!img || !img.complete || !img.naturalWidth) && facing === 'n') img = hbImg('assets/heroes/' + heroCode + '/' + heroCode + '_' + pFileAnim + '_ne.png');
        // Fallback attack → attack_spell (HE01 n'a que attack_spell)
        if ((!img || !img.complete || !img.naturalWidth) && pFileAnim === 'attack') img = hbImg('assets/heroes/' + heroCode + '/' + heroCode + '_attack_spell_' + pDir + '.png');
        // Fallback attack → idle si le sprite attack n'existe pas
        if ((!img || !img.complete || !img.naturalWidth) && pFileAnim === 'attack') img = hbImg('assets/heroes/' + heroCode + '/' + heroCode + '_idle_' + pDir + '.png');
        // Fallback die/idle → run si le sprite n'existe pas encore
        if ((!img || !img.complete || !img.naturalWidth) && pFileAnim !== 'run') img = hbImg('assets/heroes/' + heroCode + '/' + heroCode + '_run_' + pDir + '.png');
        // Fallbacks anciens chemins (data.js)
        if (!img || !img.complete || !img.naturalWidth) img = hbImg((hd.sprites && hd.sprites[facing]) || hd.portrait);
        if (!img || !img.complete || !img.naturalWidth) img = hbImg(hd.portrait);
        if (img && img.complete && img.naturalWidth) {
          var scale = unit.spriteScale || 1.0;
          var sw = S * 4.3 * scale, sh = S * 4.8 * scale;
          var _pAnchor = 0.68;
          var sx = p.x - sw / 2, sy = p.y - sh * _pAnchor;
          _ctx.save();
          _ctx.beginPath();
          cn.forEach(function(c,i){ i===0?_ctx.moveTo(c.x,c.y):_ctx.lineTo(c.x,c.y); });
          _ctx.closePath();
          _ctx.strokeStyle = isSel ? '#00d4ff' : 'rgba(0,212,255,0.35)';
          _ctx.lineWidth   = isSel ? 2.5 : 1.0;
          if (isSel) { _ctx.shadowColor='#00d4ff'; _ctx.shadowBlur=14; }
          _ctx.stroke();
          _ctx.restore();
          var pFrames = Math.max(1, Math.floor(img.naturalWidth / img.naturalHeight));
          var pFrame  = pAnimSt === 'die'
            ? Math.min(pFrames - 1, Math.floor(Math.max(0, Date.now() - (unit._dyingUntil - 1200)) / 80))
            : Math.floor(Date.now() / 80) % pFrames;
          var _pSil = _hbGetSil(img, pFrame);
          [[-2,0],[2,0],[0,-2],[0,2]].forEach(function(d){ _ctx.drawImage(_pSil, sx+d[0], sy+d[1], sw, sh); });
          _ctx.drawImage(img, pFrame * img.naturalHeight, 0, img.naturalHeight, img.naturalHeight, sx, sy, sw, sh);
          drawnSprite = true;
        }
      }
    }

    // Ennemis : sprite directionnel dans sous-dossier, fallback sur portrait statique
    if (!drawnSprite && (!unit.isPlayer || unit.isInvoc)) {
      var mobCode   = unit.mobCode || unit.id.split('_')[0];
      var mFacing   = unit.facing || 'se';
      var mAnimSt   = !unit.alive ? 'die'
        : unit._animPos ? 'run'
        : (unit._attackAnim && Date.now() < unit._attackAnim) ? 'attack'
        : 'idle';
      var mFileAnim = (mAnimSt === 'attack') ? 'attack_spell' : mAnimSt;
      var mDir      = HB_DIR_MAP[mFacing] || 's';
      var mNewPath  = 'assets/enemies/hex/' + mobCode + '/' + mobCode + '_' + mFileAnim + '_' + mDir + '.png';
      var mobImg    = hbImg(mNewPath);
      // Fallback n → ne
      if ((!mobImg || !mobImg.complete || !mobImg.naturalWidth) && mFacing === 'n') mobImg = hbImg('assets/enemies/hex/' + mobCode + '/' + mobCode + '_' + mFileAnim + '_ne.png');
      // Fallback attack_spell → attack (MO04 uniquement)
      if ((!mobImg || !mobImg.complete || !mobImg.naturalWidth) && mFileAnim === 'attack_spell') mobImg = hbImg('assets/enemies/hex/' + mobCode + '/' + mobCode + '_attack_' + mDir + '.png');
      // Fallback attack_spell → idle
      if ((!mobImg || !mobImg.complete || !mobImg.naturalWidth) && mFileAnim === 'attack_spell') mobImg = hbImg('assets/enemies/hex/' + mobCode + '/' + mobCode + '_idle_' + mDir + '.png');
      // Fallback → run
      if ((!mobImg || !mobImg.complete || !mobImg.naturalWidth) && mFileAnim !== 'run') mobImg = hbImg('assets/enemies/hex/' + mobCode + '/' + mobCode + '_run_' + mDir + '.png');
      // Fallback portrait statique
      if (!mobImg || !mobImg.complete || !mobImg.naturalWidth) mobImg = unit.img ? hbImg(unit.img) : null;
      if (mobImg && mobImg.complete && mobImg.naturalWidth) {
        _ctx.save();
        _ctx.beginPath();
        cn.forEach(function(c,i){ i===0?_ctx.moveTo(c.x,c.y):_ctx.lineTo(c.x,c.y); });
        _ctx.closePath();
        _ctx.strokeStyle = unit.boss ? '#fbbf24' : hexToRgba(unit.col, 0.9);
        _ctx.lineWidth   = unit.boss ? 2.5 : 1.5;
        if (unit.boss) { _ctx.shadowColor='#fbbf24'; _ctx.shadowBlur=12; }
        _ctx.stroke(); _ctx.shadowBlur=0;
        _ctx.restore();
        var mFrames = Math.max(1, Math.floor(mobImg.naturalWidth / mobImg.naturalHeight));
        var mFrame  = mAnimSt === 'die'
          ? Math.min(mFrames - 1, Math.floor(Math.max(0, Date.now() - (unit._dyingUntil - 1200)) / 80))
          : Math.floor(Date.now() / 80) % mFrames;
        var mw = S * 4.0, mh = S * 4.4;
        var _mAnchor = 0.68;
        var _mSil = _hbGetSil(mobImg, mFrame);
        var _msx = p.x - mw/2, _msy = p.y - mh * _mAnchor;
        [[-2,0],[2,0],[0,-2],[0,2]].forEach(function(d){ _ctx.drawImage(_mSil, _msx+d[0], _msy+d[1], mw, mh); });
        _ctx.drawImage(mobImg, mFrame * mobImg.naturalHeight, 0, mobImg.naturalHeight, mobImg.naturalHeight, _msx, _msy, mw, mh);
        drawnSprite = true;
      }
    }

    // Fallback final (image non chargée ou pas d'image)
    if (!drawnSprite) {
      // Fond coloré clipé en hexagone
      _ctx.save();
      _ctx.beginPath();
      cn.forEach(function(c,i){ i===0?_ctx.moveTo(c.x,c.y):_ctx.lineTo(c.x,c.y); });
      _ctx.closePath();
      var grad = _ctx.createRadialGradient(p.x, p.y-R*0.25, R*0.08, p.x, p.y, R);
      grad.addColorStop(0, hexToRgba(unit.col, 0.92));
      grad.addColorStop(1, hexToRgba(unit.col, 0.30));
      _ctx.fillStyle = grad; _ctx.fill();
      _ctx.strokeStyle = unit.boss ? '#fbbf24' : hexToRgba(unit.col, 0.85);
      _ctx.lineWidth   = unit.boss ? 2.5 : 1.1;
      if (unit.boss) { _ctx.shadowColor='#fbbf24'; _ctx.shadowBlur=12; }
      _ctx.stroke(); _ctx.shadowBlur=0;
      _ctx.restore();
      // Icône emoji centré
      _ctx.font = Math.round(R * 0.95) + 'px serif';
      _ctx.textAlign = 'center'; _ctx.textBaseline = 'middle';
      _ctx.fillStyle = '#fff';
      _ctx.fillText(unit.icon || '🤖', p.x, p.y);
    }

    // Flash dégâts
    if (unit._flash && unit._flash > 0) {
      _ctx.save();
      _ctx.globalAlpha = unit._flash / 8 * 0.52;
      _ctx.beginPath();
      cn.forEach(function(c,i){ i===0?_ctx.moveTo(c.x,c.y):_ctx.lineTo(c.x,c.y); });
      _ctx.closePath();
      _ctx.fillStyle = unit.isPlayer ? '#f87171' : '#fbbf24';
      _ctx.fill();
      _ctx.restore();
      unit._flash--;
    }

    // Barres HP + bouclier sous la case
    var bw = S * 1.5, bh = 4;
    var bx = p.x - bw/2, by = p.y + R * 0.55 + D;
    _ctx.fillStyle = 'rgba(0,0,0,0.72)';
    _ctx.fillRect(bx-1, by-1, bw+2, bh+2);
    var hpR = unit.hp / unit.mHp;
    _ctx.fillStyle = hpR > 0.4 ? '#22c55e' : '#ef4444';
    _ctx.fillRect(bx, by, Math.max(0, bw * hpR), bh);
    if (unit.mSh > 0) {
      _ctx.fillStyle = 'rgba(0,0,0,0.5)'; _ctx.fillRect(bx, by+5, bw, 3);
      _ctx.fillStyle = '#60a5fa';
      _ctx.fillRect(bx, by+5, Math.max(0, bw*(unit.sh/unit.mSh)), 3);
    }

    // Effets actifs (icônes colorés à droite)
    if (unit.effs && unit.effs.length) {
      _ctx.font = '7px sans-serif';
      _ctx.textAlign = 'left'; _ctx.textBaseline = 'top';
      var efColors = {dot:'#f87171',atkBuf:'#fbbf24',defBuf:'#60a5fa',invuln:'#a78bfa',rgn:'#4ade80'};
      unit.effs.slice(0,3).forEach(function(e, i) {
        _ctx.fillStyle = efColors[e.type] || '#aaa';
        _ctx.fillText(e.label||e.type, p.x+R+3, p.y-R*0.5+i*9);
      });
    }
  }
  function hexToRgba(hex, a) {
    if (!hex || hex[0]!=='#') return 'rgba(128,128,128,'+a+')';
    var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  return { init:init, draw:draw, resize:resize };
}());

// ── RENDU DOM ────────────────────────────────────────────────────
function renderHexBattle() {
  var wrap   = document.getElementById('hb-wrap');
  var selDiv = document.getElementById('hb-sel');
  var actDiv = document.getElementById('hb-active');
  var resDiv = document.getElementById('hb-result');
  if (!wrap) return;

  if (!HB) {
    // Sélection de scénario
    selDiv.style.display = '';
    actDiv.style.display = 'none';
    resDiv.style.display = 'none';
    renderHexBattleSel();
    return;
  }

if (HB.over && Date.now() >= (HB._showResultAt || 0)) {
    selDiv.style.display = 'none';
    actDiv.style.display = 'none';
    resDiv.style.display = 'flex';
    renderHexBattleResult();
    return;
  }

  selDiv.style.display = 'none';
  actDiv.style.display = 'flex';
  resDiv.style.display = 'none';

  // ── DOM EN PREMIER — les mises à jour HUD/log/actions changent la
  // hauteur des blocs entourant le canvas ; on les fait AVANT d'initialiser
  // le canvas pour que resize() lise les bonnes dimensions du wrapper.
  renderHexHUD();
  renderHexLog();
  renderHexActionBar(); // appelle renderHexOpts() en interne

  // ── CANVAS APRÈS — resize() lit clientWidth/Height post-reflow
  HB_CVS.init();
  HB_CVS.resize();   // force le recalcul des dimensions canvas après DOM
  HB_CVS.draw();
}

function renderHexBattleSel() {
  var el = document.getElementById('hb-sel');
  if (!el) return;
  var heroLv = (META.hero && META.hero.lv) || 1;
  if (heroLv < HB_MIN_LV) {
    el.innerHTML = '<div class="sec-hdr">⬡ MODE HEXAGONAL</div>'
      +'<div style="padding:30px;text-align:center">'
      +'<div style="font-size:3rem;margin-bottom:12px">🔒</div>'
      +'<div style="font-family:var(--font-h);font-size:1rem;color:var(--text)">Débloqué au niveau '+HB_MIN_LV+'</div>'
      +'<div style="font-size:.75rem;color:var(--text3);margin-top:6px">Niveau actuel : '+heroLv+'</div>'
      +'</div>';
    return;
  }
  var diffCol = {e:'#00e87c',m:'#00d4ff',h:'#ff3355'};
  var diffLbl = {e:'FACILE',m:'NORMAL',h:'DIFFICILE'};
  var backBtn = '<div style="padding:8px 12px 0"><button class="btn" onclick="_hbSelMode=null;renderHexBattleSel()" style="font-size:.75rem;padding:5px 10px">← Retour</button></div>';

  if (!_hbSelMode) {
    el.innerHTML = '<div class="sec-hdr">⧆ MODE HEXAGONAL</div>'
      +'<div style="padding:12px;display:flex;flex-direction:column;gap:10px">'
      +'<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid #00e87c;border-radius:12px;padding:14px 16px;cursor:pointer" onclick="_hbSelMode=\'farm\';renderHexBattleSel()">'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:2rem">⚡</span>'
        +'<div style="flex:1"><div style="font-family:var(--font-h);font-size:.95rem;font-weight:700;color:#00e87c">Farm</div>'
        +'<div style="font-size:.72rem;color:var(--text3);margin-top:2px">Combats rapides — Easy, Medium, Hard</div></div>'
        +'<span style="color:#00e87c;font-weight:700">→</span></div></div>'
      +'<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid #00d4ff;border-radius:12px;padding:14px 16px;cursor:pointer" onclick="_hbSelMode=\'donjon\';renderHexBattleSel()">'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:2rem">🏰</span>'
        +'<div style="flex:1"><div style="font-family:var(--font-h);font-size:.95rem;font-weight:700;color:#00d4ff">Donjon</div>'
        +'<div style="font-size:.72rem;color:var(--text3);margin-top:2px">5 combats encha\xeen\xe9s — sans r\xe9g\xe9n\xe9ration — boss final</div></div>'
        +'<span style="color:#00d4ff;font-weight:700">→</span></div></div>'
      +'<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid #ff3355;border-radius:12px;padding:14px 16px;cursor:pointer" onclick="_hbSelMode=\'pvp\';renderHexBattleSel()">'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:2rem">⚔️</span>'
        +'<div style="flex:1"><div style="font-family:var(--font-h);font-size:.95rem;font-weight:700;color:#ff3355">PvP</div>'
        +'<div style="font-size:.72rem;color:var(--text3);margin-top:2px">Affrontez d\'autres joueurs</div></div>'
        +'<span style="color:#ff3355;font-weight:700">→</span></div></div>'
      +'</div>';
    return;
  }

  if (_hbSelMode === 'pvp') {
    el.innerHTML = '<div class="sec-hdr">⚔️ PvP</div>'
      + backBtn
      +'<div style="padding:12px;display:flex;flex-direction:column;gap:10px">'
      +'<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid #ff3355;border-radius:12px;padding:14px 16px;cursor:pointer" onclick="alert(\'À venir !\')">'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:2rem">🥊</span>'
        +'<div style="flex:1"><div style="font-family:var(--font-h);font-size:.88rem;font-weight:700;color:var(--text)">PvP 1 vs 1</div>'
        +'<div style="font-size:.72rem;color:var(--text3)">Duel individuel</div></div>'
        +'<span style="font-size:.65rem;font-weight:700;background:#ff335522;color:#ff3355;border:1px solid #ff335544;border-radius:6px;padding:2px 7px">\xc0 VENIR</span>'
        +'</div></div>'
      +'<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid #ff3355;border-radius:12px;padding:14px 16px;cursor:pointer" onclick="alert(\'À venir !\')">'
        +'<div style="display:flex;align-items:center;gap:10px">'
        +'<span style="font-size:2rem">🤝</span>'
        +'<div style="flex:1"><div style="font-family:var(--font-h);font-size:.88rem;font-weight:700;color:var(--text)">PvP 2 vs 2</div>'
        +'<div style="font-size:.72rem;color:var(--text3)">Combat en \xe9quipe</div></div>'
        +'<span style="font-size:.65rem;font-weight:700;background:#ff335522;color:#ff3355;border:1px solid #ff335544;border-radius:6px;padding:2px 7px">\xc0 VENIR</span>'
        +'</div></div>'
      +'</div>';
    return;
  }

  var modeScenarios = (HB_SCENARIOS||[]).filter(function(sc) {
    return _hbSelMode === 'farm' ? !sc.donjon : sc.donjon;
  });
  var modeTitle = _hbSelMode === 'farm' ? '⚡ Farm' : '🏰 Donjon';
  var html = '<div class="sec-hdr">'+modeTitle+'</div>' + backBtn
    +'<div style="padding:12px;display:flex;flex-direction:column;gap:10px">';
  modeScenarios.forEach(function(sc) {
    var col = diffCol[sc.diff]||'#aaa';
    var dl  = diffLbl[sc.diff]||sc.diff;
    html += '<div style="background:var(--bg1);border:1px solid var(--border);border-left:3px solid '+col+';border-radius:12px;padding:12px 14px;cursor:pointer" '
      +'onclick="startHexBattle(\''+sc.id+'\')">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:2rem">'+sc.icon+'</span>'
      +'<div style="flex:1">'
      +'<div style="font-family:var(--font-h);font-size:.88rem;font-weight:700;color:var(--text)">'+sc.name+'</div>'
      +'<div style="font-size:.72rem;color:var(--text3);margin:2px 0">'+sc.desc+'</div>'
      +'<div style="display:flex;gap:8px;margin-top:3px">'
      +'<span style="font-size:.65rem;font-weight:700;color:'+col+'">'+dl+'</span>'
      +'<span style="font-size:.62rem;color:var(--gold)">R\xe9compense \xd7'+sc.rewardMult.toFixed(1)+'</span>'
      +'<span style="font-size:.62rem;color:var(--text4)">'+sc.mobMin+'–'+sc.mobMax+' ennemis</span>'
      +'</div></div>'
      +'<span style="color:var(--cyan);font-weight:700">→</span>'
      +'</div></div>';
  });
  html += '</div>';
  el.innerHTML = html;
}
function renderHexHUD() {
  var el = document.getElementById('hb-hud');
  if (!el || !HB) return;
  var p     = HB.player;
  var alive = HB.enemies.filter(function(e){ return e.alive; });
  var isP   = HB.phase === 'player';

  // Buffs/Debuffs joueur (texte coloré)
  var _effCol = {dot:'#f87171',atkBuf:'#fbbf24',defBuf:'#60a5fa',invuln:'#a78bfa',rgn:'#4ade80',hold:'#f97316',reflect:'#22d3ee'};
  var buffParts = (p.effs||[]).map(function(e){
    return '<span style="color:'+(_effCol[e.type]||'var(--text2)')+';white-space:nowrap">'+(e.label||e.type)+' '+e.turns+'t</span>';
  });

  // Ordre d'initiative
  var initUnits = HB.units.filter(function(u){ return u.alive; });
  var curIdx    = (HB.turnIdx||0) % Math.max(1, initUnits.length);
  var initHtml  = initUnits.map(function(u, i){
    var isCur  = i === curIdx;
    var isPast = i < curIdx;
    var sty = isCur
      ? 'font-size:1.55rem;filter:drop-shadow(0 0 6px #22d3ee);opacity:1;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.38);border-radius:8px;padding:1px 5px;line-height:1.2'
      : isPast
        ? 'font-size:.82rem;opacity:.2;line-height:1.2'
        : 'font-size:.88rem;opacity:.62;line-height:1.2';
    return '<span title="'+hbEscape(u.name)+'" style="'+sty+'">'+u.icon+'</span>';
  }).join('');

  var tl   = HB.turnTimeLeft;
  var tCol = (tl != null && tl <= 10) ? 'var(--red)' : 'var(--gold)';

  var html =
    '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px 4px;background:var(--bg1);border-bottom:1px solid var(--border)">'

    // LEFT : PA / PM gros + buffs
    +'<div style="flex-shrink:0;width:90px;min-width:0">'
      +'<div style="font-size:.5rem;font-weight:700;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.04em;text-transform:uppercase">'+hbEscape(p.name)+'</div>'
      +'<div style="display:flex;align-items:baseline;gap:5px;margin:2px 0 1px">'
        +'<span style="display:flex;align-items:baseline;gap:1px">'
          +'<span style="font-size:.5rem;font-weight:700;color:var(--cyan)">PA</span>'
          +'<b style="font-size:1.05rem;color:var(--cyan);font-family:var(--font-h);line-height:1">'+p.pa+'</b>'
          +'<span style="font-size:.52rem;color:var(--text3)">/'+p.paMax+'</span>'
        +'</span>'
        +'<span style="display:flex;align-items:baseline;gap:1px">'
          +'<span style="font-size:.5rem;font-weight:700;color:#818cf8">PM</span>'
          +'<b style="font-size:1.05rem;color:#818cf8;font-family:var(--font-h);line-height:1">'+p.pm+'</b>'
          +'<span style="font-size:.52rem;color:var(--text3)">/'+p.pmMax+'</span>'
        +'</span>'
      +'</div>'
      +(buffParts.length
        ? '<div style="display:flex;flex-wrap:wrap;gap:2px;font-size:.5rem">'+buffParts.join('')+'</div>'
        : '<div style="height:12px"></div>')
    +'</div>'

    // CENTER : Initiative (PROMINENT)
    +'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;min-width:0">'
      +'<div style="font-size:.5rem;color:var(--text3);font-weight:600;letter-spacing:.04em">'
        +'Tour '+HB.round+' \xb7 '+alive.length+' ennemi'+(alive.length!==1?'s':'')
        +(HB_DONJON&&HB_DONJON.active?' \xb7 <span style="color:#00d4ff">Donjon '+HB_DONJON.fightNum+'/'+HB_DONJON.fightTotal+'</span>':'')
      +'</div>'
      +'<div style="display:flex;align-items:center;justify-content:center;gap:3px;overflow:hidden;padding:1px 0">'
        +initHtml
      +'</div>'
      +'<div style="font-size:.6rem;font-weight:700;color:'+(isP?'#4ade80':'#f97316')+'">'+(isP?'▶ Vous':'⏳ IA')+'</div>'
    +'</div>'

    // RIGHT : Timer
    +'<div style="flex-shrink:0;text-align:right;min-width:34px">'
      +(tl != null
        ? '<div style="font-size:1.2rem;font-weight:900;color:'+tCol+';font-family:var(--font-h);line-height:1">'+tl+'<span style="font-size:.48rem">s</span></div>'
        : '<div style="height:19px"></div>')
    +'</div>'

    +'</div>';

  el.innerHTML = html;
  hbRenderInfoPanel();
}
var _hbLogOpen = true;
function hbToggleLog() {
  _hbLogOpen = !_hbLogOpen;
  var inner = document.getElementById('hb-log-inner');
  if (inner) inner.style.height = _hbLogOpen ? '68px' : '0';
  var btn = document.getElementById('hb-log-toggle-btn');
  if (btn) btn.textContent = _hbLogOpen ? '▼' : '▲';
}

function _hbLogColor(l, i) {
  var a = i === 0 ? 1 : 0.55;
  if (l.charAt(0) === '—' || l.indexOf('Tour') !== -1) return 'rgba(148,163,184,'+a+')';
  if (l.indexOf('👾') !== -1) return i===0 ? '#fb7185' : 'rgba(251,113,133,.55)';
  if (l.indexOf('💀') !== -1) return i===0 ? '#f87171' : 'rgba(248,113,113,.5)';
  if (l.indexOf('💥') !== -1 || l.indexOf('☣') !== -1) return i===0 ? '#fb923c' : 'rgba(251,146,60,.55)';
  if (l.indexOf('🩸') !== -1 || l.indexOf('💚') !== -1 || l.indexOf('♥') !== -1) return i===0 ? '#4ade80' : 'rgba(74,222,128,.55)';
  if (l.indexOf('◌') !== -1 || l.indexOf('Esquive') !== -1) return i===0 ? '#fbbf24' : 'rgba(251,191,36,.55)';
  if (l.indexOf('✦') !== -1 || l.indexOf('CRIT') !== -1) return i===0 ? '#f59e0b' : 'rgba(245,158,11,.55)';
  if (l.indexOf('⚠') !== -1) return i===0 ? '#f97316' : 'rgba(249,115,22,.55)';
  if (l.indexOf('🏆') !== -1) return i===0 ? '#fbbf24' : 'rgba(251,191,36,.55)';
  return i===0 ? '#e2e8f0' : 'rgba(226,232,240,.52)';
}

function renderHexLog() {
  var el = document.getElementById('hb-log-inner');
  if (!el || !HB) return;
  el.style.height = _hbLogOpen ? '68px' : '0';
  var lines = HB.log || [];
  el.innerHTML = lines.map(function(l, i) {
    return '<div style="font-size:.59rem;color:'+_hbLogColor(l,i)+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:1px 0;line-height:1.4">'+hbEscape(l)+'</div>';
  }).join('') || '<div style="font-size:.55rem;color:rgba(255,255,255,.25)">—</div>';
  el.scrollTop = 0;
}
var _hbSpellLpTimer = null;
function hbSpellLpStart(idx) {
  _hbSpellLpTimer = setTimeout(function() {
    _hbSpellLpTimer = null;
if (idx === -1) {
      var weapU = typeof META!=='undefined'&&META.eq&&META.eq.arme&&typeof byUid==='function'?byUid(META.eq.arme):null;
      // affiche popup arme
      var div = document.createElement('div');
      div.id = 'hb-spell-popup';
      div.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)';
      div.onclick = function(){ div.remove(); };
      div.innerHTML = '<div style="background:var(--bg1);border:1px solid var(--border2);border-radius:14px;padding:18px 20px;max-width:280px;width:90%">'
        +'<div style="font-family:var(--font-h);font-size:1rem;font-weight:700;color:var(--cyan);margin-bottom:6px">'+(weapU?hbEscape(weapU.nm):'Attaque de base')+'</div>'
        +'<div style="font-size:.75rem;color:var(--text3)">Coût : '+HB_CFG.PA_BASIC_ATK+' PA · Portée : adjacent</div>'
        +'<div style="font-size:.72rem;color:var(--text2);margin-top:8px">Dégâts : '+(HB&&HB.player?HB.player.atk:0)+' ATQ</div>'
        +'<div style="font-size:.65rem;color:var(--text4);margin-top:10px;text-align:center">Appuie n\'importe où pour fermer</div>'
        +'</div>';
      document.body.appendChild(div);
      return;
    }
    var sp = HB && HB.player && HB.player.spells[idx];
    if (!sp) return;
    var existing = document.getElementById('hb-spell-popup');
    if (existing) existing.remove();
    if (typeof stShowSpellModal === 'function' && sp.id) {
      stShowSpellModal(sp.id);
      return;
    }
  }, 500);
}

function hbWeaponAttack(forcedTarget) {
  if (!HB || HB.phase !== 'player' || HB.over) return;
  var p = HB.player;
  if (p.pa < HB_CFG.PA_BASIC_ATK) { hbLog('⚠ PA insuffisants'); return; }
  var weapUid = typeof META!=='undefined' && META.eq && META.eq.arme;
  var weap    = weapUid && typeof byUid==='function' ? byUid(weapUid) : null;
  var wRange  = HB.weaponRange || HB_CFG.WEAPON_RANGE;
  var target  = forcedTarget || null;
  if (!target) {
    var minD = 999;
    HB.enemies.forEach(function(e) {
      if (!e.alive) return;
      var d = HB_HEX.dist(p.pos, e.pos);
      if (d < minD) { minD = d; target = e; }
    });
    if (!target || minD > wRange) { hbLog('⚠ Aucun ennemi à portée ('+wRange+' cases)'); return; }
  }
  p.pa -= HB_CFG.PA_BASIC_ATK;
  hbSpawnFloating && hbSpawnFloating(HB.player.pos, '-'+HB_CFG.PA_BASIC_ATK+' PA', '#f97316');
  // Effacer les highlights AVANT l'animation pour un feedback immédiat
  HB.actionMode = 'move'; HB.hlSpell = []; HB.hlAoe = [];
  hbRefreshHighlights(); renderHexBattle();
  var atk = p.atk;
  if (typeof P !== 'undefined' && P.labAtq && P.labAtq.arme) {
    atk = Math.floor(atk * (1 + P.labAtq.arme));
  }
  p._attackAnim = Date.now() + 700;
  var _wFacing = hbFacingTo(p.pos, target.pos);
  if (_wFacing) p.facing = _wFacing;
  hbAnimAttack(p.pos, target.pos, '#fbbf24', function(){
    var isCrit = hbDamage(target, atk, p, p.weapDmgType || 'Negate');
    hbLog('⚔ ' + p.name + ' frappe ' + target.name + (isCrit?' ✦CRIT':''));
    hbCheckDeath(target);
    if (hbCheckEnd()) return;
    HB.actionMode  = 'move';   // sortir du mode arme après l'attaque
    HB.hlSpell     = [];
    HB.hlAoe       = [];
    hbRefreshHighlights();
    renderHexBattle();
  });
  return;
}
function hbSpellLpEnd() {
  if (_hbSpellLpTimer) { clearTimeout(_hbSpellLpTimer); _hbSpellLpTimer = null; }
}

function renderHexBattleResult() {
  var el = document.getElementById('hb-result');
  if (!el || !HB) return;

  var won = HB.won;
  var _dc = HB._donjonContinue;
  var _df = HB._donjonFinal;
  var _prevFight = HB_DONJON ? (_dc ? HB_DONJON.fightNum - 1 : HB_DONJON.fightTotal) : 0;
  var _titleText = _dc
    ? 'Combat ' + _prevFight + '/' + (HB_DONJON ? HB_DONJON.fightTotal : 5) + ' termin\u00E9 !'
    : _df ? 'Donjon termin\u00E9 !' : (won ? 'VICTOIRE !' : 'D\u00C9FAITE');
  var _titleColor = (won || _dc || _df) ? 'var(--gold)' : 'var(--red)';
  var _icon = (won || _dc || _df) ? '\uD83C\uDFC6' : '\uD83D\uDC80';
  el.innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;padding:20px;text-align:center">'
    +'<div style="font-size:3rem">'+_icon+'</div>'
    +'<div style="font-family:var(--font-h);font-size:1.3rem;font-weight:900;color:'+_titleColor+'">'+_titleText+'</div>'
    +(_dc ? '<div style="font-size:.8rem;color:var(--cyan)">PV restants : '+HB.player.hp+' / '+HB.player.mHp+'</div>' : '')
    +(won ? '<div style="font-size:.9rem;font-weight:700;color:var(--gold)">+'+HB.rewardCr+' \u20B5 &nbsp; +'+HB.rewardXP+' XP</div>' : '')
    +(_df && HB_DONJON ? '<div style="font-size:.8rem;color:var(--text3)">Total donjon : <span style="color:var(--gold)">+'+HB_DONJON.totalCr+' \u20B5 &nbsp; +'+HB_DONJON.totalXp+' XP</span></div>' : '')
    +(_dc
      ? '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px">'
        +'<button class="btn btn-green btn-lg" onclick="hbDonjonNextFight()">\u26A4 Combat '+(HB_DONJON?HB_DONJON.fightNum:'')+'/'+(HB_DONJON?HB_DONJON.fightTotal:5)+' \u2192</button>'
        +'<button class="btn btn-lg" style="border-color:rgba(255,51,85,.4);color:var(--red)" onclick="hbDonjonAbandon()">\u2715 Abandonner</button>'
        +'</div>'
      : '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px">'
        +'<button class="btn btn-green btn-lg" id="hb-replay-btn" onclick="if(HB_AUTOPLAY_TIMER){clearInterval(HB_AUTOPLAY_TIMER);HB_AUTOPLAY_TIMER=null;}startHexBattle(\''+(HB.scenario&&HB.scenario.id||'')+'\')">\u21BA Rejouer'+(HB_AUTOPLAY?' <span id="hb-ap-cd" style="font-size:.7rem;opacity:.7">(10s)</span>':'')+'</button>'
        +'<button class="btn btn-lg" onclick="if(HB_AUTOPLAY_TIMER){clearInterval(HB_AUTOPLAY_TIMER);HB_AUTOPLAY_TIMER=null;}hbQuit()">\u2190 Quitter</button>'
        +'</div>')
    +(HB.log&&HB.log.length
      ? '<div style="margin-top:10px;width:100%;max-height:130px;overflow-y:auto;text-align:left;background:rgba(0,0,0,.35);border-radius:8px;padding:8px 10px">'
        +'<div style="font-size:.5rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Journal</div>'
        +HB.log.map(function(l){ return '<div style="font-size:.55rem;color:rgba(255,255,255,.8);padding:1px 0">'+hbEscape(l)+'</div>'; }).join('')
        +'</div>' : '')
    +'</div>';

  // Injecter le loot via DOM pour préserver les event handlers (onerror sur img)
  if (won && HB.lootItems && HB.lootItems.length) {
    var lootContainer = document.createElement('div');
    lootContainer.style.cssText = 'margin:6px 0 0;display:flex;flex-direction:column;align-items:center';
    var lootTitle = document.createElement('div');
    lootTitle.style.cssText = 'font-size:.6rem;color:var(--text4);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em';
    lootTitle.textContent = 'Butin';
    lootContainer.appendChild(lootTitle);
    var lootGrid = document.createElement('div');
    lootGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:210px';
    HB.lootItems.slice(0,9).forEach(function(it) {
      var rk2 = {1:'c',2:'r',3:'e'}[it.rar]||it.rar||'c';
      var col3 = {c:'#9ca3af',r:'#60a5fa',e:'#c084fc',p:'#4ade80',l:'#fbbf24'}[rk2]||'#9ca3af';
      var def2 = (typeof STUFF_DEFS !== 'undefined') && STUFF_DEFS.find(function(d){ return d.id===it.id; });
      var imgSrc2 = (def2&&def2.img)||it.img||(it.id?'assets/items/'+it.id+'.png':'');
      var cell = document.createElement('div');
      cell.onclick = (function(uid){ return function(){ openItemDetail(uid); }; })(it.uid);
      cell.title = it.nm;
      cell.style.cssText = 'background:rgba(0,0,0,.5);border:1px solid '+col3+';border-radius:6px;width:60px;height:60px;overflow:hidden;position:relative;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0';
      if (imgSrc2) {
        var img2 = document.createElement('img');
        img2.src = imgSrc2;
        img2.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
        img2.onerror = function(){ this.style.display='none'; var fb=this.nextSibling; if(fb) fb.style.display='flex'; };
        var fb = document.createElement('span');
        fb.style.cssText = 'display:none;position:absolute;inset:0;align-items:center;justify-content:center;font-size:.85rem;color:#ccc;text-align:center;padding:2px';
        fb.textContent = it.nm.slice(0,4);
        cell.appendChild(img2); cell.appendChild(fb);
      } else {
        cell.textContent = it.nm.slice(0,3);
        cell.style.fontSize = '1rem'; cell.style.color = '#ccc';
      }
      lootGrid.appendChild(cell);
    });
    lootContainer.appendChild(lootGrid);
    var btnsDiv = el.querySelector('.btn-green') && el.querySelector('.btn-green').parentNode;
    if (btnsDiv) el.querySelector('div').insertBefore(lootContainer, btnsDiv);
    else el.querySelector('div').appendChild(lootContainer);
  }

  // Countdown auto-rejouer si AutoPlay activé
  if (HB_AUTOPLAY_TIMER) { clearInterval(HB_AUTOPLAY_TIMER); HB_AUTOPLAY_TIMER = null; }
  if (HB_AUTOPLAY) {
    var _apScenId = HB.scenario && HB.scenario.id;
    var _apCount  = 10;
    HB_AUTOPLAY_TIMER = setInterval(function() {
      _apCount--;
      var cdEl = document.getElementById('hb-ap-cd');
      if (cdEl) cdEl.textContent = '(' + _apCount + 's)';
      if (_apCount <= 0) {
        clearInterval(HB_AUTOPLAY_TIMER); HB_AUTOPLAY_TIMER = null;
        startHexBattle(_apScenId);
      }
    }, 1000);
  }
}

function hbSetMode(mode) {
  if (!HB || HB.phase !== 'player' || HB.over) return;
  HB.actionMode  = mode;
  hbRefreshHighlights();
  navigate('hexbattle');
  renderHexBattle();
}

// ================================================================
// hexBattle.js — Étape 2 : Animations + Barre de sorts enrichie
// ================================================================

// ── SYSTÈME DE PARTICULES / NOMBRES FLOTTANTS ────────────────────
// Chaque entrée : { x, y, text, col, life, maxLife, vy }
// life décroît de 1 par frame via RAF. À 0 → supprimée.
var HB_ANIMS = [];
var HB_RAF   = null;   // id requestAnimationFrame courant
var HB_DIRTY = false;  // true = un redraw RAF est nécessaire

// Démarre la boucle RAF si elle n'est pas déjà en cours
function hbStartRAF() {
  if (HB_RAF) return;
  function loop() {
    if (!HB || (HB.over && Date.now() >= (HB._showResultAt || 0))) { HB_RAF = null; return; }
    // Avance les animations
    for (var i = HB_ANIMS.length - 1; i >= 0; i--) {
      var a = HB_ANIMS[i];
      a.life--;
      a.y  += a.vy;
      a.vy *= 0.94;  // friction douce
      if (a.life <= 0) HB_ANIMS.splice(i, 1);
    }
    HB_CVS.draw();   // redraw complet (léger car canvas ~390px)
    HB_RAF = requestAnimationFrame(loop);
  }
  HB_RAF = requestAnimationFrame(loop);
}

// Arrête la boucle RAF
function hbStopRAF() {
  if (HB_RAF) { cancelAnimationFrame(HB_RAF); HB_RAF = null; }
  HB_ANIMS = [];
}

// Centre la caméra sur l'unité donnée
function hbCenterOnUnit(unit) {
  if (!HB || !unit || !unit.pos) return;
  var p = HB_HEX.toPixel(unit.pos.q, unit.pos.r, 0, 0);
  HB.camX = Math.round(-p.x);
  HB.camY = Math.round(-p.y);
}
function hbSmoothCenterOnUnit(unit, duration) {
  if (!HB || !unit || !unit.pos) return;
  var tgt = HB_HEX.toPixel(unit.pos.q, unit.pos.r, 0, 0);
  var tx = Math.round(-tgt.x), ty = Math.round(-tgt.y);
  var sx = HB.camX, sy = HB.camY;
  if (Math.abs(tx - sx) < 1 && Math.abs(ty - sy) < 1) return;
  var startT = null, dur = duration || 350;
  function frame(now) {
    if (!HB) return;
    if (!startT) startT = now;
    var t = Math.min(1, (now - startT) / dur);
    var e = 1 - (1 - t) * (1 - t);
    HB.camX = Math.round(sx + (tx - sx) * e);
    HB.camY = Math.round(sy + (ty - sy) * e);
    HB_CVS.draw();
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Crée un nombre flottant centré sur un hex
function hbSpawnFloating(hexPos, text, col) {
  if (!HB) return;
  var ox = (HB.canvasW||390)/2 + HB.camX;
  var oy = (HB.canvasH||300)/2 + HB.camY;
  var p  = HB_HEX.toPixel(hexPos.q, hexPos.r, ox, oy);
  var mag = 1.0;
  if (text && (text[0] === '-' || text[0] === '+')) {
    var num = parseInt(text.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) mag = Math.min(2.2, 1.0 + num / 60);
  }
  HB_ANIMS.push({
    x: p.x + (Math.random() * 16 - 8),
    y: p.y - HB_HEX.SIZE * 0.8,
    text: text, col: col || '#fff',
    life: 90, maxLife: 90,
    vy: -0.52, mag: mag,
  });
  hbStartRAF();
}

// Flash rouge sur une unité touchée (state temporaire)
function hbFlashUnit(unit) {
  unit._flash = 8;  // 8 frames de flash
  hbStartRAF();
}
// Arc lumineux animé d'une unité vers une case cible
function hbAnimAttack(casterPos, targetPos, col, onDone) {
  if (!HB) { if(onDone) onDone(); return; }
  var dist = HB_HEX.dist(casterPos, targetPos);
  var isAdjacent = dist <= 1;
  var ox = (HB.canvasW||390)/2 + HB.camX;
  var oy = (HB.canvasH||300)/2 + HB.camY;
  var zl = [0.40, 0.65, 1.0, 1.35];
  var z  = zl[HB.zoom||1];
  var from = HB_HEX.toPixel(casterPos.q, casterPos.r, ox, oy);
  var to   = HB_HEX.toPixel(targetPos.q,  targetPos.r,  ox, oy);
  var t0   = Date.now();
  // Adjacent = coup de poing (rapide: 160ms) ; Distance = laser (plus long: 280ms)
  var DUR  = isAdjacent ? 160 : 280;

  function frame() {
    var canvas = document.getElementById('hb-canvas');
    if (!canvas) { if(onDone) onDone(); return; }
    var ctx = canvas.getContext('2d');
    var frac = Math.min(1, (Date.now()-t0)/DUR);
    HB_CVS.draw();
    ctx.save();
    ctx.translate(HB.canvasW/2, HB.canvasH/2);
    ctx.scale(z, z);
    ctx.translate(-HB.canvasW/2, -HB.canvasH/2);

    if (isAdjacent) {
      // ── COUP DE POING : cercle de choc qui grandit et disparaît ──────────────
      // Le "poing" voyage jusqu'à 60% puis le choc explose
      var punchFrac = Math.min(1, frac * 2.0);   // arrive vite
      var shockFrac = Math.max(0, (frac - 0.5) * 2.0); // choc en 2e moitié
      var px2 = from.x + (to.x - from.x) * Math.min(punchFrac, 0.85);
      var py2 = from.y + (to.y - from.y) * Math.min(punchFrac, 0.85);
      // Trajet du poing (petit cercle plein)
      ctx.beginPath();
      ctx.arc(px2, py2, 7, 0, Math.PI*2);
      ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Ondes de choc autour de la cible
      if (shockFrac > 0) {
        var numRings = 2;
        for (var ri = 0; ri < numRings; ri++) {
          var rf = Math.min(1, shockFrac + ri * 0.15);
          var rAlpha = (1 - rf) * 0.8;
          var rRadius = 4 + rf * 22;
          ctx.beginPath();
          ctx.arc(to.x, to.y, rRadius, 0, Math.PI*2);
          ctx.strokeStyle = col.replace(')', ','+rAlpha+')').replace('rgb','rgba');
          ctx.lineWidth = 2.5 * (1 - rf);
          ctx.shadowColor = col; ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        // Éclats (4 traits courts rayonnants)
        if (shockFrac > 0.2) {
          var sAlpha = (1 - shockFrac) * 0.9;
          for (var si = 0; si < 4; si++) {
            var angle = (si / 4) * Math.PI * 2 + shockFrac * 0.5;
            var sLen = 6 + shockFrac * 14;
            ctx.beginPath();
            ctx.moveTo(to.x + Math.cos(angle) * 6, to.y + Math.sin(angle) * 6);
            ctx.lineTo(to.x + Math.cos(angle) * sLen, to.y + Math.sin(angle) * sLen);
            ctx.strokeStyle = col;
            ctx.globalAlpha = sAlpha;
            ctx.lineWidth = 2;
            ctx.shadowColor = col; ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
          ctx.globalAlpha = 1;
        }
      }
    } else {
      // ── RAYON LASER : faisceau continu de la source à la cible ──────────────
      var beamAlpha = frac < 0.15 ? frac/0.15 : frac > 0.75 ? (1-frac)/0.25 : 1.0;
      // Corps du rayon (3 couches)
      var rgb = hexToCtx(col);
      // Couche large + diffuse
      ctx.beginPath();
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba('+rgb+','+(beamAlpha*0.25)+')';
      ctx.lineWidth = 12;
      ctx.stroke();
      // Couche médiane
      ctx.beginPath();
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba('+rgb+','+(beamAlpha*0.65)+')';
      ctx.lineWidth = 5;
      ctx.shadowColor = col; ctx.shadowBlur = 18;
      ctx.stroke();
      // Cœur blanc intense
      ctx.beginPath();
      ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgba(255,255,255,'+(beamAlpha*0.9)+')';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Point d'impact pulsé
      var impactR = 4 + Math.sin(frac * Math.PI * 6) * 2;
      ctx.beginPath();
      ctx.arc(to.x, to.y, impactR, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,'+beamAlpha+')';
      ctx.shadowColor = col; ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    if (frac < 1) requestAnimationFrame(frame);
    else { HB_CVS.draw(); if(onDone) onDone(); }
  }
  requestAnimationFrame(frame);
}

// Convertit #rrggbb → 'r,g,b' pour les rgba()
function hexToCtx(hex) {
  if (!hex||hex[0]!=='#') return '255,255,255';
  return parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16);
}


// Helper pour les images de loot (évite les imbrications de quotes)
function _lootImgErr(img) {
  img.style.display = 'none';
  var sp = img.nextElementSibling;
  if (sp) sp.style.display = 'flex';
}
// ── HOOK : remplace hbDamage pour déclencher visuels ─────────────
var _hbDamageOrig = hbDamage;
hbDamage = function(target, rawDmg, caster, dmgType) {
  if (!target || !target.alive) return false;
  var hpBefore = target.hp;
  var isCrit = _hbDamageOrig(target, rawDmg, caster, dmgType);
  var dealt = hpBefore - target.hp;
  if (dealt > 0) {
    hbSpawnFloating(target.pos, '-' + Math.round(dealt), target.isPlayer ? '#f87171' : '#fbbf24');
    hbFlashUnit(target);
  }
  return isCrit;
};

// Hook sur les soins
var _hbApplySpellOrig = hbApplySpell;
hbApplySpell = function(caster, sp, targetHex) {
  var _hpBefore2 = caster.hp;
  var _tgt2 = hbUnitAt(targetHex); var _tgtHp2 = _tgt2 ? _tgt2.hp : 0;
  _hbApplySpellOrig(caster, sp, targetHex);
  if (sp.type === 'heal' || sp.type === 'fort' || sp.type === 'rgnBurst') {
    var _gained = Math.round((caster.hp - _hpBefore2) + (_tgt2 && _tgt2 !== caster ? _tgt2.hp - _tgtHp2 : 0));
    hbSpawnFloating(caster.pos, '+' + (_gained > 0 ? _gained : 'HP'), '#4ade80');
  }
  if (sp.type === 'shFull' || sp.type === 'shBoost' || sp.type === 'nano') {
    hbSpawnFloating(caster.pos, '+boucl.', '#60a5fa');
  }
  if (sp.type === 'invuln' || sp.type === 'titan' || sp.type === 'bunk') {
    hbSpawnFloating(caster.pos, 'INVULN', '#a78bfa');
  }
};

// ── SURCHARGE drawUnit pour le flash ─────────────────────────────
// On étend le module HB_CVS sans le réécrire :
// Wrapping du draw() original pour ajouter le rendu des anims
(function() {
  var origDraw = HB_CVS.draw;

  HB_CVS.draw = function() {
    origDraw();  // rendu normal
    if (!HB || !HB_ANIMS.length) return;

    // Récupère ctx via le canvas
    var canvas = document.getElementById('hb-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    HB_ANIMS.forEach(function(a) {
      var alpha = Math.min(1, a.life / (a.maxLife * 0.5));
      var scale = 0.7 + 0.5 * (1 - a.life / a.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      var mag2 = a.mag || 1.0;
      var sz = Math.round(20 * scale * mag2);
      ctx.font = 'bold ' + sz + 'px Rajdhani, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.ceil(sz * 0.18);
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(a.text, a.x, a.y);
      ctx.shadowColor = a.col; ctx.shadowBlur = 10;
      ctx.fillStyle = a.col;
      ctx.fillText(a.text, a.x, a.y);
      ctx.shadowBlur = 0;
      ctx.restore();
    });
  };

  // Flash rouge sur les unités : intégré dans drawUnit via _flash
  var origDrawUnit = null;  // sera pris en charge via monkey-patch ci-dessous
}());

// ── SURCHARGE drawUnit via closure globale ────────────────────────
// HB_CVS est un module fermé, on ne peut pas modifier drawUnit directement.
// Solution propre : on passe _flash dans l'état de chaque unité et
// on l'applique dans la boucle RAF côté draw() étendu.
// Ajout : dessine un cercle rouge semi-transparent par-dessus l'unité flashée.
(function() {
  var origDraw2 = HB_CVS.draw;
  HB_CVS.draw = function() {
    origDraw2();
    if (!HB) return;
    var canvas = document.getElementById('hb-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var ox = (HB.canvasW||390)/2 + HB.camX;
    var oy = (HB.canvasH||300)/2 + HB.camY;
    HB.units.forEach(function(u) {
      if (!u.alive || !u._flash || u._flash <= 0) return;
      var p = HB_HEX.toPixel(u.pos.q, u.pos.r, ox, oy);
      var R = HB_HEX.SIZE * 0.72;
      ctx.save();
      ctx.globalAlpha = u._flash / 8 * 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI*2);
      ctx.fillStyle = u.isPlayer ? '#f87171' : '#fbbf24';
      ctx.fill();
      ctx.restore();
      u._flash--;
    });
  };
}());

// ── PANNEAU OPTIONS (1/3 droit du log) ───────────────────────────
function renderHexOpts() {
  var el = document.getElementById('hb-opts');
  if (!el || !HB) return;
  var tacOn = !!HB.tacticMode;
  var camOn = !!(typeof META !== 'undefined' && META.hbCamFollow);

  var toggleBtn = '<button id="hb-log-toggle-btn" onclick="hbToggleLog()"'
    +' style="background:transparent;border:1px solid rgba(255,255,255,.15);border-radius:5px;'
    +'color:rgba(255,255,255,.45);font-size:.52rem;padding:3px 6px;cursor:pointer;line-height:1;flex-shrink:0"'
    +' title="Journal">'+(_hbLogOpen?'▼':'▲')+'</button>';

  if (HB.phase === 'positioning' || HB.phase === 'positioning_done') {
    el.innerHTML = toggleBtn
      +'<button class="btn btn-green" onclick="hbReadyUp()" style="padding:5px 10px;font-weight:700;font-size:.7rem;flex-shrink:0">✔ READY'
        +(_hbAutoReadyCount > 0 ? ' <span style="opacity:.7">'+_hbAutoReadyCount+'s</span>' : '')
      +'</button>'
      +(_hbAutoReadyCount > 0 ? '<button class="btn btn-sm" onclick="hbCancelAutoReady();renderHexOpts()" style="color:var(--red)" title="Annuler">⏸</button>' : '')
      +'<button class="btn btn-sm hb-opt-btn" onclick="hbToggleTacticMode()" title="Tactic" style="opacity:'+(tacOn?1:0.4)+';color:'+(tacOn?'var(--cyan)':'var(--text3)')+'">⊞</button>'
      +'<button class="btn btn-sm hb-opt-btn" onclick="hbToggleAutoPlay()" title="AutoPlay" style="opacity:'+(HB_AUTOPLAY?1:0.4)+';color:'+(HB_AUTOPLAY?'var(--gold)':'var(--text3)')+'">🤖</button>'
      +'<button class="btn btn-sm hb-opt-btn" onclick="hbQuit()" style="color:var(--text4)" title="Quitter">✕</button>';
    return;
  }

  var isP = HB.phase === 'player' && !HB.over;
  el.innerHTML = toggleBtn
    +'<button class="btn btn-sm btn-green" onclick="hbEndPlayerTurn()" style="font-size:.7rem;padding:5px 9px;font-weight:700;flex-shrink:0" '+(isP?'':'disabled')+'>Fin ▶</button>'
    +'<button class="btn btn-sm hb-opt-btn" onclick="META.hbCamFollow=!META.hbCamFollow;saveMeta();renderHexOpts()" title="Caméra" style="opacity:'+(camOn?1:0.4)+';color:'+(camOn?'var(--cyan)':'var(--text3)')+'">🎯</button>'
    +'<button class="btn btn-sm hb-opt-btn" onclick="hbToggleTacticMode()" title="Tactic" style="opacity:'+(tacOn?1:0.4)+';color:'+(tacOn?'var(--cyan)':'var(--text3)')+'">⊞</button>'
    +'<button class="btn btn-sm hb-opt-btn" onclick="hbToggleAutoPlay()" title="AutoPlay" style="opacity:'+(HB_AUTOPLAY?1:0.4)+';color:'+(HB_AUTOPLAY?'var(--gold)':'var(--text3)')+'">🤖</button>'
    +'<button class="btn btn-sm hb-opt-btn" onclick="hbQuit()" style="color:var(--text4)" title="Quitter">✕</button>';
}

// ── BARRE DE SORTS (sorts uniquement) ────────────────────────────
renderHexActionBar = function() {
  var el = document.getElementById('hb-actions');
  if (!el || !HB) return;
  renderHexOpts();

  var p = HB.player;
  if (HB.phase === 'positioning' || HB.phase === 'positioning_done') {
    var posOk = HB.phase === 'positioning_done';
    el.innerHTML =
      '<div class="hb-spell-btn hb-spell-disabled" style="opacity:.28;pointer-events:none">'
      +'<div class="hb-spell-ico">📍</div>'
      +'<div class="hb-spell-nm">'+(posOk?'✓ Prêt':'Choisir')+'</div>'
      +'</div>'
      +'<div style="flex:1;font-size:.7rem;color:var(--text3);padding:0 10px">'
        +(posOk ? '✓ Position choisie' : 'Choisissez votre position de départ')
      +'</div>';
    return;
  }

  var isP  = HB.phase === 'player' && !HB.over;
  var mode = HB.actionMode;

  // Arme
  var weapUid = typeof META!=='undefined' && META.eq && META.eq.arme;
  var weap    = weapUid && typeof byUid==='function' ? byUid(weapUid) : null;
  var wCanUse = isP && p.pa >= HB_CFG.PA_BASIC_ATK;
  var isWeaponMode = HB.actionMode === 'weapon';
  var html = '<div class="hb-spell-btn'+(isWeaponMode?' hb-act-on':'')+(wCanUse?'':' hb-spell-disabled')+'"'
    +' onclick="'+(wCanUse?'hbSelectWeapon()':'')+'"'
    +' onmousedown="hbSpellLpStart(-1)" onmouseup="hbSpellLpEnd()" onmouseleave="hbSpellLpEnd()"'
    +' ontouchstart="hbSpellLpStart(-1)" ontouchend="hbSpellLpEnd()">'
    +'<div class="hb-spell-ico">'+(weap&&weap.icon?weap.icon:'⚔️')+'</div>'
    +'<div class="hb-spell-nm">'+(weap?hbEscape(weap.nm.split(' ')[0]):'Arme')+'</div>'
    +'<div class="hb-spell-cost" style="color:'+(wCanUse?'var(--gold)':'var(--text4)')+'">'+HB_CFG.PA_BASIC_ATK+' PA</div>'
    +'</div>';

  // Sorts
  if (p.spells && p.spells.length) {
    p.spells.forEach(function(sp, i) {
      var cost   = sp.energy;
      var onCd   = sp.cd > 0;
      var canUse = isP && p.pa >= cost && !onCd;
      var active = mode==='spell' && HB.pendingSpell && HB.pendingSpell.id===sp.id;
      var _stIcon = '⚡';
      if (typeof SPELL_TREES !== 'undefined') {
        var _heroId2 = META&&META.heroId||'berserker';
        var _trees2  = SPELL_TREES[_heroId2]||[];
        _trees2.forEach(function(t){t.nodes.forEach(function(n){if(n.id===sp.id)_stIcon=n.icon||'⚡';});});
      }
      html += '<div class="hb-spell-btn'+(active?' hb-act-on':'')+(canUse?'':' hb-spell-disabled')+'"'
        +' onclick="'+(canUse?'hbSelectSpell('+i+')':'')+'"'
        +' onmousedown="hbSpellLpStart('+i+')" onmouseup="hbSpellLpEnd()" onmouseleave="hbSpellLpEnd()"'
        +' ontouchstart="hbSpellLpStart('+i+')" ontouchend="hbSpellLpEnd()">'
        +'<div class="hb-spell-ico">'+_stIcon+'</div>'
        +'<div class="hb-spell-nm">'+hbEscape(sp.name.split(' ')[0])+'</div>'
        +'<div class="hb-spell-cost" style="color:'+(canUse?'var(--gold)':'var(--text4)')+'">'+cost+' PA</div>'
        +(onCd?'<div class="hb-spell-cd-overlay"><span>'+sp.cd+'</span></div>':'')
        +'</div>';
    });
  }

  el.innerHTML = html;
};

// Raccourcis clavier AZERTY (& e " ' = 1 2 3 4)
(function() {
  document.addEventListener('keydown', function(e) {
    if (!HB || HB.over || HB.phase !== 'player') return;
    var k = e.key;
    if (k === '&' || k === '1')    { e.preventDefault(); hbSelectWeapon(); return; }
    if (k === 'é' || k === '2') { e.preventDefault(); hbSelectSpell(0); return; }
    if (k === '"' || k === '3')    { e.preventDefault(); hbSelectSpell(1); return; }
    if (k === "'" || k === '4')    { e.preventDefault(); hbSelectSpell(2); return; }
  });
})();

// ── NETTOYAGE au quit ─────────────────────────────────────────────
var _hbQuitOrig = hbQuit;
hbQuit = function() {
  hbStopRAF();
  var bot = document.getElementById('bot');
  if (bot) bot.style.display = '';
  _hbQuitOrig();
};

var _hbCheckEndOrig = hbCheckEnd;
hbCheckEnd = function() {
  var result = _hbCheckEndOrig();
  if (result) setTimeout(hbStopRAF, Math.max(50, (HB._showResultAt || 0) - Date.now()));
  return result;
};
function hbShowTurnBanner(label, col) {
  var wrap = document.getElementById('hb-canvas-wrap');
  if (!wrap) return;
  var old = document.getElementById('hb-banner');
  if (old) old.remove();
  var div = document.createElement('div');
  div.id = 'hb-banner';
  div.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:15';
  div.innerHTML = '<div style="font-family:var(--font-h);font-size:1.1rem;font-weight:900;color:'+(col||'#fff')+';letter-spacing:.1em;background:rgba(6,8,15,.82);padding:8px 22px;border-radius:10px;border:1px solid '+(col||'#aaa')+';opacity:1;transition:opacity .6s ease .4s">'+hbEscape(label)+'</div>';
  wrap.appendChild(div);
  setTimeout(function(){
    var inner = div.querySelector('div');
    if (inner) inner.style.opacity='0';
    setTimeout(function(){ div.remove(); }, 1000);
  }, 600);
}
