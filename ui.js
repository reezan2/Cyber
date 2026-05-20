// -- Helper rendu item: image .png si dispo, sinon emoji
function _imgErr(el){el.style.display='none';if(el.nextSibling)el.nextSibling.style.display='';}
function _flashEl(el){if(!el)return;el.classList.remove('forge-reroll-flash');void el.offsetWidth;el.classList.add('forge-reroll-flash');setTimeout(function(){el.classList.remove('forge-reroll-flash');},700);}
function itemImg(it, size) {
  size = size || '1.8rem';
  if (it && it.img) {
    return '<img src="'+it.img+'" style="width:'+size+';height:'+size+';object-fit:contain;vertical-align:middle" onerror="_imgErr(this)" />'
         + '<span style="display:none;font-size:'+size+'">'+(it.icon||'?')+'</span>';
  }
  return '<span style="font-size:'+size+'">'+(it&&it.icon?it.icon:'?')+'</span>';
}

// ================================================================
// ui.js v13 — Rendu DOM
// ================================================================
var PG = 'home';
var _charCreateSlot = 0;
var _charCreateIdx  = 0;
var INV_FILTER = 'all';
var INV_SEL_MODE = false;   // mode sélection inventaire
var INV_SEL = {};           // uid → true
var INV_TOP_OPEN = true;    // top panel (hero + equip) visible
var DRAG_UID = null;
var DETAIL_UID = null;
var CRAFT_TAB = 'enhance';
var RELIC_FILTER = 'all';
var POPUP = { type: null, cb: null };

// ── Drag & Drop inventaire ────────────────────────────────────────
function allowDrop(ev) { ev.preventDefault(); }

function dragStart(ev, uid) {
  DRAG_UID = uid;
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', uid);
}

// Drop sur une cellule inventaire : échange les deux items dans META.inv
function dropCell(ev, targetUid) {
  ev.preventDefault();
  var srcUid = DRAG_UID;
  DRAG_UID = null;
  if (!srcUid || srcUid === targetUid) return;
  // Si l'item source était équipé, le déséquiper d'abord
  EQ_SLOTS.forEach(function(sl) { if (META.eq[sl] === srcUid) META.eq[sl] = null; });
  recompute(); renderInv(); saveMeta();
}

// Drop sur un slot d'équipement : équipe l'item
function dropIntoSlot(ev, slot) {
  ev.preventDefault();
  var uid = DRAG_UID;
  DRAG_UID = null;
  if (!uid) return;
  var it = byUid(uid);
  if (!it || it.type !== 'equip') return;
  // Vérifie compatibilité slot (les implants peuvent aller dans implant1 ou implant2)
  var targetBase = slot.replace(/\d+$/, ''); // 'implant1' → 'implant'
  var itemBase = (it.sl || '').replace(/\d+$/, '');
  if (itemBase !== targetBase && it.sl !== slot) return;
  equipIt(uid, slot);
}

// ── Sélection inventaire ──────────────────────────────────────────
function toggleSelMode(){
  INV_SEL_MODE=!INV_SEL_MODE; INV_SEL={};
  renderInv();
}
function toggleInvSel(uid){
  if(INV_SEL[uid])delete INV_SEL[uid]; else INV_SEL[uid]=true;
  var cell=document.querySelector('.inv-cell[data-uid="'+uid+'"]');
  if(cell){
    cell.classList.toggle('selected',!!INV_SEL[uid]);
    var chk=cell.querySelector('.sel-check');
    if(chk)chk.textContent=INV_SEL[uid]?'✓':'';
  }
  renderInvSelBar();
}
function selectRarInv(rar){
  META.inv.forEach(function(it){if(it.rar===rar&&!it.perm&&!isEquipped(it.uid))INV_SEL[it.uid]=true;});
  renderInv();
}
function clearInvSel(){INV_SEL={};renderInv();}
function toggleInvTop(){INV_TOP_OPEN=!INV_TOP_OPEN;renderInv();}
function sellSelected(){
  var uids=Object.keys(INV_SEL);var total=0;
  uids.forEach(function(uid){var it=byUid(uid);if(!it||it.perm||isEquipped(uid))return;var p=SELL[it.rar]||30;if(it.relicCount)p=Math.floor(p*(1+it.relicCount*0.2));total+=p;META.cr+=p;});
  META.inv=META.inv.filter(function(x){return!INV_SEL[x.uid]||x.perm||isEquipped(x.uid);});
  INV_SEL={};
  recompute();updateTop();renderInv();saveMeta();
}
function renderInvSelBar(){
  var bar=document.getElementById('inv-sel-bar');if(!bar)return;
  var count=Object.keys(INV_SEL).length;
  if(!count){bar.classList.add('hidden');return;}
  bar.classList.remove('hidden');
  var total=0;
  Object.keys(INV_SEL).forEach(function(uid){var it=byUid(uid);if(!it)return;var p=SELL[it.rar]||30;if(it.relicCount)p=Math.floor(p*(1+it.relicCount*0.2));total+=p;});
  bar.querySelector('#sel-count').textContent=count+' item'+(count>1?'s':'');
  bar.querySelector('#sel-total').textContent=fmt(total)+'₵';
}
// ── Reset comp / sorts ────────────────────────────────────────────
function resetSkillPts(){
  var h=META.hero,total=0;
  SDEF.forEach(function(sd){total+=h.st[sd.id]||0;h.st[sd.id]=0;});
  h.skPts+=total;recompute();renderHero();saveMeta();
}
function resetSpellPts(){
  if(typeof resetSpellTree==='function'){ resetSpellTree(); return; }
  // legacy fallback
  var h=META.hero,total=0,sp;
  for(sp in h.spLvPwr){total+=h.spLvPwr[sp]||0;h.spLvPwr[sp]=0;}
  for(sp in h.spLvCd) {total+=h.spLvCd[sp] ||0;h.spLvCd[sp]=0;}
  h.spPts+=total;renderHero();saveMeta();
}

// ── SPELL CONFIG ─────────────────────────────────────────────────
// bg: gradient de l'icône · ico: emoji/picto · pour img: assets/spells/{id}.png
var SP_CFG = {
  adren:{bg:'linear-gradient(135deg,#7c1d00,#ff4500)',ico:'⚡'},
  rage: {bg:'linear-gradient(135deg,#7f0000,#dc2626)',ico:'🔥'},
  lame: {bg:'linear-gradient(135deg,#003380,#0088ff)',ico:'⚔️'},
  nstim:{bg:'linear-gradient(135deg,#004020,#00cc55)',ico:'💉'},
  ovchg:{bg:'linear-gradient(135deg,#5a3a00,#f59e0b)',ico:'⚡'},
  chain:{bg:'linear-gradient(135deg,#003344,#00d4ff)',ico:'⛓️'},
  sacri:{bg:'linear-gradient(135deg,#440000,#cc0022)',ico:'💀'},
  saign:{bg:'linear-gradient(135deg,#550010,#ff0030)',ico:'🩸'},
  apoc: {bg:'linear-gradient(135deg,#222233,#778899)',ico:'💥'},
  omega:{bg:'linear-gradient(135deg,#3a0800,#ff4400)',ico:'Ω'},
  armv: {bg:'linear-gradient(135deg,#001a44,#2255cc)',ico:'🛡️'},
  fort: {bg:'linear-gradient(135deg,#003322,#00aa55)',ico:'🏰'},
  nano: {bg:'linear-gradient(135deg,#001844,#004499)',ico:'🔬'},
  ishll:{bg:'linear-gradient(135deg,#1a2233,#445566)',ico:'⬡'},
  repdr:{bg:'linear-gradient(135deg,#002233,#0077aa)',ico:'🚁'},
  barr: {bg:'linear-gradient(135deg,#001133,#1133aa)',ico:'▣'},
  reflt:{bg:'linear-gradient(135deg,#220055,#7733dd)',ico:'🔄'},
  fortm:{bg:'linear-gradient(135deg,#112211,#335533)',ico:'🔒'},
  bunk: {bg:'linear-gradient(135deg,#1a0044,#5500bb)',ico:'◉'},
  titan:{bg:'linear-gradient(135deg,#220055,#6600ff)',ico:'👊'},
};

function spIco(id,sz){
  var c=SP_CFG[id]||{bg:'#333',ico:'?'};
  sz=sz||36;
  var r=Math.round(sz*0.22);
  // Container position:relative · img absolute → emoji stays on top (z-index:1, relative)
  return '<div class="sp-ico-wrap" style="width:'+sz+'px;height:'+sz+'px;border-radius:'+r+'px;background:'+c.bg+'">'
    +'<img src="assets/spells/'+id+'.png" onerror="this.style.display=\'none\'" alt=""/>'
    +'<span style="font-size:'+Math.round(sz*0.52)+'px">'+c.ico+'</span>'
    +'</div>';
}

function itemIco(it,sz){
  sz=sz||36;
  if(it&&it.img) return '<img src="'+it.img+'" style="width:'+sz+'px;height:'+sz+'px;object-fit:contain" onerror="_imgErr(this)" /><span style="display:none">'+(it.icon||'📦')+'</span>';
  var ico=it.icon||{arme:'⚔️',armure:'🛡️',casque:'⛑️',skin:'👕',implant:'💡',chaussures:'👟',relique:'⚗️',piece:'🔩'}[it.sl||it.type]||'📦';
  var bg='linear-gradient(135deg,#111827,#1c2438)';
  // Image asset si disponible
  var src=it.img||(it.id?'assets/items/'+it.id+'.png':'');
return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:'+Math.round(sz*0.22)+'px;background:'+bg+';display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;flex-shrink:0">'
    +'<img src="'+src+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;position:absolute;inset:0;z-index:1" onerror="this.style.display=\'none\';this.nextElementSibling.style.visibility=\'visible\'" alt=""/>'
    +'<span style="font-size:'+Math.round(sz*0.5)+'px;line-height:1;position:relative;visibility:hidden;z-index:0">'+ico+'</span>'
    +'</div>';
}

function heroImg(hid,w,h){
  var hero=getH(hid||'berserker');
  var fallback={berserker:'⚔️',warden:'🗡️',hacker:'💻'}[hid]||'🦸';
  // img absolute fills container; span hidden by default, shown via onerror
  return '<div class="hero-img-wrap" style="width:'+w+'px;height:'+h+'px;border-radius:8px;background:linear-gradient(180deg,#1c2438,#0c1020)">'
    +'<img src="'+hero.portrait+'" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" alt=""/>'
    +'<span style="font-size:'+Math.round(w*0.5)+'px;display:none">'+fallback+'</span>'
    +'</div>';
}

function enemyImg(portrait,sz,fallback){
  sz=sz||56;
  return '<div style="width:'+sz+'px;height:'+Math.round(sz*1.2)+'px;border-radius:8px;overflow:hidden;background:var(--bg2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:'+Math.round(sz*0.6)+'px;position:relative">'
    +'<img src="'+portrait+'" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" onerror="this.style.display=\'none\'" alt=""/>'
    +(fallback||'👾')
    +'</div>';
}

// ── TOP BAR ──────────────────────────────────────────────────────
function updateTop(){
  var rc=document.getElementById('rc');
  var rg=document.getElementById('rg');
  if(rc)rc.innerHTML='<span>₵</span><strong>'+fmt(META.cr)+'</strong>';
  if(rg)rg.innerHTML='<span>💎</span><strong>'+META.gems+'</strong>';
}
// ── MODE PREMIUM (simulateur) ─────────────────────────────────────────────
var PREMIUM_MODE = false;
var PREMIUM_MULT = 2;  // multiplicateur XP, crédits, loot

function togglePremium() {
  PREMIUM_MODE = !PREMIUM_MODE;
  var btn = document.getElementById('btn-premium');
  if (btn) {
    btn.classList.toggle('premium-active', PREMIUM_MODE);
    btn.title = PREMIUM_MODE ? 'Premium ON — XP/Crédits/Loot ×2 (cliquer pour désactiver)' : 'Mode Premium (XP/Crédits/Loot ×2)';
  }
  // Petite notif inline
  var notif = document.createElement('div');
  notif.textContent = PREMIUM_MODE ? '⭐ Premium activé ×2' : 'Premium désactivé';
  notif.style.cssText = 'position:fixed;top:56px;right:10px;background:'+(PREMIUM_MODE?'rgba(251,191,36,.9)':'rgba(60,60,80,.9)')+';color:'+(PREMIUM_MODE?'#000':'#fff')+';padding:6px 14px;border-radius:8px;font-size:.75rem;font-weight:700;z-index:9999;transition:opacity .5s';
  document.body.appendChild(notif);
  setTimeout(function(){ notif.style.opacity='0'; setTimeout(function(){ notif.remove(); }, 500); }, 1500);
  if (typeof renderHero === 'function') renderHero();
}



// ── NAVIGATION ───────────────────────────────────────────────────
// Lookup RAR par clé string ou numéro (1=c, 2=r, 3=e)
var RAR_COLORS={c:'#9ca3af',p:'#4ade80',r:'#60a5fa',e:'#c084fc',l:'#fbbf24'};
function equipFromPopup(uid) {
  equipIt(uid);
  // Refresh popup after equipping
  if (DETAIL_UID) openItemDetail(DETAIL_UID);
  renderInv && renderInv();
}
function rarLookup(rar){
  var MAP={1:'c',2:'r',3:'e',4:'l'};
  var key = typeof rar === 'number' ? (MAP[rar]||'c') : (rar||'c');
  var entry = Object.assign({}, RAR[key]||RAR['c']);
  entry.color = RAR_COLORS[key]||'#9ca3af';
  return entry;
}
function navigate(pg){
  PG=pg;
  document.querySelectorAll('.pg').forEach(function(p){p.classList.remove('active');});
  var t=document.getElementById('pg-'+pg);if(t)t.classList.add('active');
  document.querySelectorAll('.nb').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-pg')===pg);});
  // Masquer top/bot pour les pages plein écran
  var _fullPg=(pg==='char-select'||pg==='char-create');
  var topEl=document.getElementById('top'),botEl=document.getElementById('bot');
  if(topEl)topEl.style.display=_fullPg?'none':'';
  if(botEl&&pg!=='hexbattle')botEl.style.display=_fullPg?'none':'';
  if(pg==='hero') setNotif('hero-notif-dot', false);
  if(pg==='missions') setNotif('mission-notif-dot', false);
  if(pg==='spell-tree') setTimeout(renderSpellTree, 0);
  refresh();
}

// ── WRAPPER DE RENDU SÉCURISÉ ────────────────────────────────────
function safeRender(name, fn) {
  try { fn(); }
  catch(e) { console.error('[render:' + name + ']', e); }
}

function refresh(){
  updateTop();
  if(PG==='char-select') safeRender('char-select', renderCharSelect);
  if(PG==='char-create') safeRender('char-create', renderCharCreate);
  if(PG==='home')    safeRender('home',    renderHome);
  if(PG==='hero')    safeRender('hero',    renderHero);
  if(PG==='upg')     safeRender('upg',     renderUpg);
  if(PG==='bout')    safeRender('bout',    renderBout);
  if(PG==='inv')     safeRender('inv',     renderInv);
  if(PG==='craft')   safeRender('craft',   renderCraft);
  if(PG==='missions')safeRender('missions',renderMissions);
  if(PG==='options') safeRender('options', renderOptions);
  if(PG==='hexbattle') {
    if(typeof renderHexBattle === 'function') {
      safeRender('hexbattle', renderHexBattle);
    } else {
      console.error('[refresh] renderHexBattle non défini — hexBattle.js chargé ?');
    }
  }
}

// ── DUEL ─────────────────────────────────────────────────────────
function renderHero(){
  var el=document.getElementById('hr-c');if(!el)return;
  var h=META.hero,hero=getH(META.heroId||'berserker'),bd=computeBreakdown();
  var xpMax=h.lv<CFG.H_MAX_LV?xpReq(h.lv):1;
  el.innerHTML='<div class="hero-page">'
    // ── RPG Card ──────────────────────────────────────────────────
    +'<div class="hero-rpg"><div class="hero-rpg-top">'
    +'<div class="hero-portrait">'+heroImg(META.heroId,94,122)+'</div>'
    +'<div class="hero-info">'
    +'<input id="hero-name-inp" class="hero-name-inp" value="'+(h.name||hero.name)+'" maxlength="20">'
    +'<div class="hero-arch">'+hero.arch+'</div>'
    +'<div class="hero-lv-row">Niveau <strong>'+h.lv+'</strong><span style="color:var(--text4)">/ '+CFG.H_MAX_LV+'</span></div>'
    +'<div class="bar-wrap" style="height:5px;margin:3px 0"><div class="bar-fill bar-xp" style="width:'+(h.lv<CFG.H_MAX_LV?pct(h.xp,xpMax):100)+'%"></div></div>'
    +'<div style="font-size:.7rem;color:var(--text3)">XP: '+fmt(h.xp)+' / '+(h.lv<CFG.H_MAX_LV?fmt(xpMax):'MAX')+'</div>'
    +'<div class="pts-chips" style="margin-top:6px">'
        +(h.spPts>0?'<span class="chip chip-sp">'+h.spPts+' sorts</span>':'')
    +'</div>'
    +'<button class="btn-reset" onclick="resetSpellPts()" title="Rembourse tous les points de sorts">↺ Sorts</button>'
    +'</div></div></div>'

    // ── Arbre de sorts + sorts équipés ────────────────────────────
    +'<div style="margin:8px 0 4px">'
    +'<button class="btn btn-full" style="background:linear-gradient(135deg,rgba(168,85,247,.15),rgba(0,212,255,.1));border:1px solid rgba(168,85,247,.4);color:var(--cyan);font-weight:700;padding:10px;font-size:.8rem" onclick="navigate(\'spell-tree\')">'    +'⬡ Arbre de sorts'
    +(h.spPts>0?'<span style="margin-left:8px;background:var(--cyan);color:#000;border-radius:10px;padding:1px 7px;font-size:.7rem">'+h.spPts+' pts</span>':'')
    +'</button>'
    +'</div>'
    // Sorts équipés : pictos seulement, long press → modal
    +(function(){
      var eq=h.equippedSpells||[];
      var trees=(typeof SPELL_TREES!=='undefined'&&SPELL_TREES[META.heroId])||[];
      var nodeMap={};
      trees.forEach(function(t){t.nodes.forEach(function(n){ nodeMap[n.id]={tree:t,node:n}; }); });
      if(!eq.length) return '<div style="font-size:.62rem;color:var(--text4);padding:2px 0 10px">Aucun sort équipé — ouvre l\'arbre pour en sélectionner</div>';
      var html='<div style="display:flex;gap:8px;padding:4px 0 12px;flex-wrap:wrap;align-items:center">';
      eq.forEach(function(nid){
        var r=nodeMap[nid]; if(!r)return;
        var nd=r.node, tr=r.tree;
        var lv=h.spTree[nid]||1;
        var lpS='stLpStart(event,\''+nid+'\')';
        var lpE='stLpEnd()';
        html+='<div title="'+nd.name+' Nv.'+lv+'"'
          +' onmousedown="'+lpS+'" onmouseup="'+lpE+'" onmouseleave="'+lpE+'"'
          +' ontouchstart="'+lpS+'" ontouchend="'+lpE+'" ontouchcancel="'+lpE+'"'
          +' style="position:relative;width:44px;height:44px;border-radius:50%;'
          +'border:2px solid '+tr.color+';background:rgba(0,0,0,.35);'
          +'display:flex;align-items:center;justify-content:center;cursor:pointer;'
          +'box-shadow:0 0 8px rgba('+hexToRgb(tr.color)+',.4);touch-action:none;flex-shrink:0">'
          +'<span style="font-size:1.35rem;line-height:1">'+nd.icon+'</span>'
          +'<div style="position:absolute;bottom:-3px;right:-3px;background:'+tr.color+';color:#000;font-size:.48rem;font-weight:900;border-radius:5px;padding:1px 3px;line-height:1">'+lv+'</div>'
          +'</div>';
      });
      return html+'</div>';
    })()

    // ── Passifs (héros + arbre appris) ───────────────────────────
    +(function(){
      var _hd2 = typeof getH === 'function' ? getH(META.heroId||'berserker') : null;
      var items = [];
      // Passifs héros permanents
      if (_hd2 && _hd2.heroPassives) {
        _hd2.heroPassives.forEach(function(hp) {
          items.push('<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;'
            + 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.28);border-radius:8px">'
            + '<span style="font-size:1.1rem;flex-shrink:0">' + hp.icon + '</span>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.65rem;font-weight:700;color:var(--gold)">' + stEscape(hp.name) + '</div>'
            + '<div style="font-size:.58rem;color:var(--text3);line-height:1.3">' + stEscape(hp.desc) + '</div>'
            + '</div></div>');
        });
      }
      // Passifs arbre appris
      var _trees2 = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[META.heroId]) || [];
      _trees2.forEach(function(tr) {
        tr.nodes.forEach(function(nd) {
          if (!nd.passive) return;
          var lv = h.spTree && h.spTree[nd.id];
          if (!lv) return;
          items.push('<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;'
            + 'background:rgba(' + hexToRgb(tr.color) + ',0.08);border:1px solid rgba(' + hexToRgb(tr.color) + ',0.3);border-radius:8px">'
            + '<span style="font-size:1.1rem;flex-shrink:0">' + nd.icon + '</span>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.65rem;font-weight:700;color:' + tr.color + '">' + stEscape(nd.name)
              + '<span style="font-size:.55rem;font-weight:400;color:var(--text3);margin-left:5px">Nv.' + lv + '</span></div>'
            + '<div style="font-size:.58rem;color:var(--text3);line-height:1.3">' + stEscape(nd.desc) + '</div>'
            + '</div></div>');
        });
      });
      if (!items.length) return '';
      return '<div style="margin-bottom:10px">'
        + '<div style="font-size:.6rem;font-weight:700;color:var(--text3);letter-spacing:.08em;'
          + 'text-transform:uppercase;padding:3px 0 6px">Passifs</div>'
        + '<div style="display:flex;flex-direction:column;gap:5px">' + items.join('') + '</div>'
        + '</div>';
    })()

    // ── Stats liste ──────────────────────────────────────────────
    +(function(){
      var canSk = h.skPts > 0;
      var _heroStatsOpen = typeof window._heroStatsOpen !== 'undefined' ? window._heroStatsOpen : false;

      // sub-caption : tooltip au clic (mobile)
      // Tooltip simple via data-tip — onclick géré globalement
      function subTip(txt){ return '<span data-tip="'+txt.replace(/"/g,'&quot;')+'" class="hero-tip-btn" style="font-size:.58rem;color:rgba(255,255,255,.35);margin-left:4px;margin-right:6px;cursor:pointer">ⓘ</span>'; }

      // Ligne Caractéristique : 5 colonnes Stat|Val|Base|Labs|Stuff|Total + bouton +
      // Largeur fixe droite : [ⓘ optionnel][valeur 40px][bouton+ 28px]
      // Quand volet ouvert, colonnes s'insèrent avant le wrapper droit
      var _rightW = 28; // largeur bouton + marge
      function sChar(ico, stat, label, val, sub, labBonus, stuffBonus) {
        var base = h.st[stat] || 0;
        var labN = labBonus  || 0;
        var stfN = stuffBonus || 0;
        var total = base + labN + stfN;
        var _shd='align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;flex-shrink:0;';
        var cols = _heroStatsOpen
          ? '<span style="'+_shd+'font-size:.63rem;color:rgba(255,255,255,.65);width:30px">'+(base||'—')+'</span>'
            +'<span style="font-size:.63rem;color:var(--cyan);width:32px;text-align:right;flex-shrink:0">'+(labN?'+'+labN:'—')+'</span>'
            +'<span style="'+_shd+'font-size:.63rem;color:var(--rar-r);width:30px">'+(stfN?'+'+stfN:'—')+'</span>'
            +'<span style="font-size:.63rem;color:#4ade80;width:32px;text-align:right;flex-shrink:0">—</span>'
            +'<span style="'+_shd+'width:36px"></span>'
            +'<span style="font-size:.63rem;font-weight:700;color:#fff;width:40px;text-align:right;flex-shrink:0">'+total+'</span>'
          : '';
        return '<div style="display:flex;align-items:center;height:32px;border-bottom:1px solid rgba(255,255,255,.06)">'
          +'<span style="font-size:1rem;width:22px;text-align:center;flex-shrink:0">'+ico+'</span>'
          +'<span style="flex:1;font-size:.72rem;color:rgba(255,255,255,.85);padding-left:6px;font-weight:700;display:flex;align-items:center">'+label+(sub?subTip(sub):'')+'</span>'
          +cols
          +(_heroStatsOpen?'':'<span style="font-size:.78rem;font-weight:800;color:#fff;width:40px;text-align:right;flex-shrink:0">'+val+'</span>')
          +'<button class="btn-stat" data-stat="'+stat+'"'+(canSk?'':' disabled')+' style="width:26px;height:22px;border-radius:5px;border:1px solid '+(canSk?'rgba(0,212,255,.5)':'rgba(255,255,255,.12)')+';background:transparent;color:'+(canSk?'var(--cyan)':'rgba(255,255,255,.2)')+';font-size:.9rem;font-weight:700;cursor:'+(canSk?'pointer':'default')+';padding:0;flex-shrink:0">+</button>'
          +'</div>';
      }
      function sLH(label, color) {
        return '<div style="display:flex;align-items:center;padding:6px 0 3px;margin-top:8px;border-bottom:1px solid rgba(255,255,255,.15)">'
          +'<span style="font-size:.65rem;font-weight:900;color:'+(color||'var(--cyan)')+';letter-spacing:.08em;text-transform:uppercase">'+label+'</span></div>';
      }
      // sLR: même structure que sChar avec colonnes Base/Labs/Stuff/Tot
      function sLR(ico, label, val, sub, base, labB, stfB) {
        var b = base !== undefined ? base : '—';
        var l = labB  || 0;
        var s = stfB  || 0;
        var hasDtl = (base !== undefined || l || s);
        // Affichage Labs/Stuff sans double-+ (les valeurs peuvent déjà avoir un préfixe)
        function _pfx(v){ if(!v) return '—'; var sv=String(v); return sv.charAt(0)==='+' || sv.charAt(0)==='-' ? sv : '+'+sv; }
        // Calcul Total = somme numérique de base+labs+stuff
        function _pn(v){ return v && v!=='—' && v!=='–' ? parseFloat(String(v).replace(/[+%\s]/g,''))||0 : 0; }
        var _isPct = [String(b||''),String(l||''),String(s||'')].some(function(v){return v.indexOf('%')!==-1;});
        var totNum = _pn(b) + _pn(l) + _pn(s);
        var totStr = hasDtl ? (Math.round(totNum) + (_isPct ? '%' : '')) : '—';
        var cols = _heroStatsOpen
          ? (hasDtl
            ? '<span style="font-size:.55rem;color:var(--text4);width:26px;text-align:right;flex-shrink:0">'+(b||'—')+'</span>'
              +'<span style="font-size:.55rem;color:var(--cyan);width:32px;text-align:right;flex-shrink:0">'+_pfx(l)+'</span>'
              +'<span style="font-size:.55rem;color:var(--rar-r);width:32px;text-align:right;flex-shrink:0">'+_pfx(s)+'</span>'
            : '<span style="width:26px;flex-shrink:0"></span><span style="width:32px;flex-shrink:0"></span><span style="width:32px;flex-shrink:0"></span>')
            +'<span style="font-size:.57rem;font-weight:700;color:#fff;width:40px;text-align:right;flex-shrink:0">'+totStr+'</span>'
          : '';
        return '<div style="display:flex;align-items:center;height:32px;border-bottom:1px solid rgba(255,255,255,.04)">'
          +'<span style="font-size:1rem;width:22px;text-align:center;flex-shrink:0">'+ico+'</span>'
          +'<span style="flex:1;font-size:.72rem;color:rgba(255,255,255,.85);padding-left:6px;font-weight:700;display:flex;align-items:center">'
            +label+(sub?subTip(sub):'')
          +'</span>'
          +cols
          +(_heroStatsOpen?'':'<span style="font-size:.78rem;font-weight:800;color:#fff;width:40px;text-align:right;flex-shrink:0">'+val+'</span>')
          +'<span style="width:26px;flex-shrink:0"></span>'
          +'</div>';
      }

      // Valeurs Labs pour les caractéristiques
      function labV(id){ var u=UPGRADES&&UPGRADES.find(function(x){return x.id===id;}); return u?(META.upgLv[u.id]||0):0; }
      function stuffV(key){ var t=0; if(typeof EQ_SLOTS!=='undefined') EQ_SLOTS.forEach(function(sl){var uid=META.eq[sl];if(!uid)return;var it=byUid&&byUid(uid);if(it&&it.st&&it.st[key])t+=it.st[key]||0;}); return t; }

      // Bonus cumulés des sorts passifs
      var _passB=(function(){
        var b={};
        if(typeof SPELL_TREES==='undefined'||!SPELL_TREES[META.heroId])return b;
        var _st=META.hero.spTree||{};
        SPELL_TREES[META.heroId].forEach(function(tree){
          tree.nodes.forEach(function(nd){
            var lv=_st[nd.id]||0;
            if(!lv||!nd.passive)return;
            var bonus=(nd.lvStats&&nd.lvStats[lv-1]&&nd.lvStats[lv-1].bonus)||nd.bonus||{};
            Object.keys(bonus).forEach(function(k){b[k]=(b[k]||0)+(bonus[k]||0);});
          });
        });
        return b;
      })();

      // sLRd : layout 7 colonnes + alternance grisée (pour Combat + Utilitaire)
      var __SHd='align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;flex-shrink:0;';
      function sLRd(ico, label, val, sub, base, labB, stfB, passif, prem) {
        var b=base!==undefined?base:'—', l=labB||0, s=stfB||0, p=passif||'—', pr=prem||'';
        var hasDtl=(base!==undefined||l||s||p!=='—');
        function _pfx(v){if(!v)return'—';var sv=String(v);return sv[0]==='+'||sv[0]==='-'?sv:'+'+sv;}
        function _pn(v){return v&&v!=='—'&&v!=='–'?parseFloat(String(v).replace(/[+%\s]/g,''))||0:0;}
        var _premOn=typeof PREMIUM_MODE!=='undefined'&&PREMIUM_MODE;
        var _isPct=[String(b||''),String(l||''),String(s||''),String(p||''),(_premOn?String(pr||''):'')].some(function(v){return v.indexOf('%')!==-1;});
        var totNum=_pn(b)+_pn(l)+_pn(s)+_pn(p)+(_premOn?_pn(pr):0);
        var _hasBase=b&&b!=='—'&&b!=='–';
        var totStr=hasDtl?((_hasBase||totNum<0?'':totNum>0?'+':'')+Math.round(totNum)+(_isPct?'%':'')):'—';
        var __FS='font-size:.63rem;';
        var _premCol=pr?'<span style="'+__SHd+__FS+'color:'+(_premOn?'#f59e0b':'rgba(255,255,255,.25)')+';width:36px">'+pr+'</span>':'<span style="'+__SHd+'width:36px"></span>';
        var cols=_heroStatsOpen
          ?(hasDtl
            ?'<span style="'+__SHd+__FS+'color:rgba(255,255,255,.65);width:30px">'+b+'</span>'
              +'<span style="'+__FS+'color:var(--cyan);width:32px;text-align:right;flex-shrink:0">'+_pfx(l)+'</span>'
              +'<span style="'+__SHd+__FS+'color:var(--rar-r);width:30px">'+_pfx(s)+'</span>'
              +'<span style="'+__FS+'color:#4ade80;width:32px;text-align:right;flex-shrink:0">'+p+'</span>'
              +_premCol
            :'<span style="'+__SHd+'width:30px"></span><span style="width:32px;flex-shrink:0"></span><span style="'+__SHd+'width:30px"></span><span style="width:32px;flex-shrink:0"></span><span style="'+__SHd+'width:36px"></span>')
            +'<span style="font-size:.63rem;font-weight:700;color:#fff;width:40px;text-align:right;flex-shrink:0">'+totStr+'</span>'
          :'';
        return '<div style="display:flex;align-items:center;height:32px;border-bottom:1px solid rgba(255,255,255,.04)">'
          +'<span style="font-size:1rem;width:22px;text-align:center;flex-shrink:0">'+ico+'</span>'
          +'<span style="flex:1;font-size:.72rem;color:rgba(255,255,255,.85);padding-left:6px;font-weight:700;display:flex;align-items:center">'+label+(sub?subTip(sub):'')+'</span>'
          +cols
          +(_heroStatsOpen?'':'<span style="font-size:.78rem;font-weight:800;color:#fff;width:40px;text-align:right;flex-shrink:0">'+val+'</span>')
          +'<span style="width:26px;flex-shrink:0"></span>'
          +'</div>';
      }

      // En-tête colonnes détails (si volet ouvert)
      var colHdr = _heroStatsOpen ? '<div style="display:flex;align-items:stretch;height:18px;opacity:.6">'
        +'<span style="width:22px;flex-shrink:0"></span>'
        +'<span style="flex:1"></span>'
        +'<span style="align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;flex-shrink:0;font-size:.52rem;color:rgba(255,255,255,.45);width:30px">Base</span>'
        +'<span style="font-size:.52rem;color:var(--cyan);width:32px;display:flex;align-items:center;justify-content:flex-end;flex-shrink:0">Labs</span>'
        +'<span style="align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;flex-shrink:0;font-size:.52rem;color:var(--rar-r);width:30px">Stuff</span>'
        +'<span style="font-size:.52rem;color:#4ade80;width:32px;display:flex;align-items:center;justify-content:flex-end;flex-shrink:0">Passif</span>'
        +'<span style="align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;flex-shrink:0;font-size:.52rem;color:#f59e0b;width:36px">Prem</span>'
        +'<span style="font-size:.52rem;color:#fff;font-weight:700;width:40px;display:flex;align-items:center;justify-content:flex-end;flex-shrink:0">Tot.</span>'
        +'<span style="width:26px;flex-shrink:0"></span>'
        +'</div>' : '';

      return '<div class="stats-sect" style="margin-top:2px">'
        +'<div style="display:flex;align-items:center;padding:6px 0 3px;border-bottom:1px solid rgba(255,255,255,.15)">'
        +'<span style="font-size:.65rem;font-weight:900;color:var(--cyan);letter-spacing:.08em;text-transform:uppercase">CARACTÉRISTIQUES</span>'
        +(h.skPts>0?'<span style="margin-left:6px;font-size:.6rem;color:var(--cyan)">'+h.skPts+' pts</span>':'')
        +'<button onclick="window._heroStatsOpen=!window._heroStatsOpen;renderHero()" style="margin-left:auto;background:transparent;border:none;color:var(--text4);font-size:.7rem;cursor:pointer;padding:0">'+(_heroStatsOpen?'▲':'▼')+'</button>'
        +'</div>'
        +colHdr
        +sChar('🔥','power',   'Power',    P.power,    'Plasma · CC',         labV('up_power'),    stuffV('power'))
        +sChar('💠','core',    'Core',     P.core,     'Neon · PV · Soins',   labV('up_core'),     stuffV('core'))
        +sChar('⚙️','protocol','Protocol', P.protocol, 'Glitch · ESQpa/pm',   labV('up_protocol'), stuffV('protocol'))
        +sLRd('⊘', 'Negate', Math.round((P.power+P.core+P.protocol)/3), 'Moy. Power · Core · Protocol', Math.round((P.power+P.core+P.protocol)/3), 0, 0, '—', '')
        +sLH('Points de jeu','var(--cyan)')
        +sLRd('\u2665', 'Points de Vie', fmt(P.mHp), null, 100, labV('up_hp')*2, stuffV('vit'), '—', '')
        +sLRd('\u26a1','Points d\'Action', P.pa, null, 4, labV('up_pa'), stuffV('pa'), '—', '')
        +sLRd('\uD83D\uDC63','Points de Mouvement', P.pm, null, 1, 0, stuffV('pm'), '—', '')
        +sLRd('\uD83C\uDFAF','Port\u00e9e (PO)', P.po, null, 1, 0, stuffV('po'), '—', '')
        +sLRd('\u2696\uFE0F','Initiative', P.init, null, 100, 0, stuffV('init'), '—', '')
                +sLH('Combat','var(--cyan)')
        +sLRd('★','Coup Critique', Math.round(P.cc*100)+'%', 'cap 50%', '1%', labV('up_power')?'+'+Math.round(labV('up_power')*0.5)+'%':0, stuffV('cc')?'+'+Math.round(stuffV('cc')*100)+'%':0, _passB.cc?'+'+Math.round(_passB.cc*100)+'%':'—')
        +sLRd('✦','Dégâts Critiques', '+'+Math.round((P.ccMult||0.5)*100)+'%', null, '+50%', 0, stuffV('ccMult')?'+'+Math.round(stuffV('ccMult')*100)+'%':0, _passB.ccMult?'+'+Math.round(_passB.ccMult*100)+'%':'—')
        +sLRd('◌','Esquive', Math.round(P.esq*100)+'%', 'cap 5%', '1%', 0, stuffV('esq')?'+'+Math.round(stuffV('esq')*100)+'%':0, _passB.esq?'+'+Math.round(_passB.esq*100)+'%':'—')
        +sLH('Utilitaire','var(--cyan)')
        +sLRd('🔍','Scan', P.pros||10, null, 10, labV('up_scan')||0, 0, '—', '')
        +sLRd('💰','Loot', P.loot?Math.round(P.loot*100)+'%':'–', null, '—', labV('up_loot')?'+'+labV('up_loot')+'%':0, stuffV('loot')?'+'+Math.round(stuffV('loot')*100)+'%':0, _passB.loot?'+'+Math.round(_passB.loot*100)+'%':'—', '+100%')
        +sLRd('📈','XP bonus', P.xpBonus?Math.round(P.xpBonus*100)+'%':'–', null, '—', labV('up_xp')?'+'+labV('up_xp')+'%':0, 0, _passB.xp?'+'+Math.round(_passB.xp*100)+'%':'—', '+100%')
        +sLRd('₵','Crédits bonus', P.credits?Math.round(P.credits*100)+'%':'–', null, '—', labV('up_credits')?'+'+labV('up_credits')+'%':0, 0, _passB.credits?'+'+Math.round(_passB.credits*100)+'%':'—', '+100%')
        +sLRd('👾','Bot disponible', P.invoc||1, null, 1, 0, stuffV('invoc')?'+'+stuffV('invoc'):0, '—', '')+'</div>';
    })()
    // ── Stats détaillées — 4 colonnes : Stat | Base | Labs | Stuff ──
    +'<details style="margin-top:8px"><summary style="font-size:.68rem;color:var(--text4);cursor:pointer;padding:4px 0">▸ Stats détaillées</summary>'
    +(function(){
      // Calcul des valeurs Labs (d'après META.upgLv)
      function labVal(id){
        var u=UPGRADES&&UPGRADES.find(function(x){return x.id===id;});
        if(!u)return 0;
        var lv=META.upgLv[u.id]||0;
        return u.bonus?lv*u.bonus:lv;
      }
      // Calcul des valeurs Stuff (somme des stats équipées)
      function stuffVal(key){
        var total=0;
        EQ_SLOTS.forEach(function(sl){
          var uid=META.eq[sl];if(!uid)return;
          var it=byUid(uid);if(!it||!it.st)return;
          var v=it.st[key];if(v)total+=parseFloat(v)||0;
        });
        return total;
      }
      function pct(v){return v?'+'+Math.round(v*100)+'%':'—';}
      function num(v){return v?'+'+v:'—';}

      // Stats détaillées — 7 colonnes : Stat | Base | Labs | Stuff | Passif | Prem | Total
      // Colonnes grises alternantes : Base (1), Stuff (3), Prem (5)
      var _SH='align-self:stretch;display:flex;align-items:center;justify-content:flex-end;background:rgba(255,255,255,.06);padding:0 3px;';
      var _FS='font-size:.60rem;';

      function drSum(parts){
        var nums=parts.filter(function(p){return p&&p!=='—'&&!isNaN(parseFloat(p.replace(/[+%]/g,'')));});
        if(!nums.length)return'—';
        if(nums.length===1)return nums[0];
        var isPct=parts.some(function(p){return p&&p.indexOf('%')!==-1;});
        var sum=nums.reduce(function(a,b){return a+parseFloat(b.replace(/[+%]/g,''));},0);
        var r=parseFloat(sum.toFixed(2));
        return (r>0?'+':'')+r+(isPct?'%':'');
      }
      function dr(label, base, lab, stuff, color, passif, prem) {
        var fmtB=base||'—',fmtL=lab||'—',fmtS=stuff||'—',fmtP=passif||'—',fmtPr=prem||'';
        var total=drSum([fmtB,fmtL,fmtS,fmtP]);
        return '<div style="display:flex;align-items:center;height:22px;border-bottom:1px solid rgba(255,255,255,.04)">'
          +'<span style="flex:1;'+_FS+'color:rgba(255,255,255,.78)">'+label+'</span>'
          +'<span style="'+_SH+_FS+'color:rgba(255,255,255,.65);width:28px">'+fmtB+'</span>'
          +'<span style="'+_FS+'color:var(--cyan);width:28px;text-align:right">'+fmtL+'</span>'
          +'<span style="'+_SH+_FS+'color:'+(color||'var(--rar-r)')+';width:28px">'+fmtS+'</span>'
          +'<span style="'+_FS+'color:#4ade80;width:30px;text-align:right">'+fmtP+'</span>'
          +(fmtPr?'<span style="'+_SH+_FS+'color:#f59e0b;width:26px">'+fmtPr+'</span>':'<span style="'+_SH+'width:26px"></span>')
          +'<span style="'+_FS+'color:#fff;font-weight:700;width:34px;text-align:right">'+total+'</span>'
          +'</div>';
      }
      function dh(label, color) {
        return '<div style="'+_FS+'font-weight:900;color:'+(color||'var(--text4)')+';padding:5px 0 2px;border-bottom:1px solid rgba(255,255,255,.1);margin-top:4px;letter-spacing:.06em">'+label+'</div>';
      }
      var colHead='<div style="display:flex;align-items:stretch;height:20px;border-bottom:1px solid rgba(255,255,255,.15);margin-bottom:2px">'
        +'<span style="flex:1;font-size:.55rem;color:rgba(255,255,255,.35);display:flex;align-items:center">Stat</span>'
        +'<span style="'+_SH+'font-size:.55rem;color:rgba(255,255,255,.45);width:28px">Base</span>'
        +'<span style="font-size:.55rem;color:var(--cyan);width:28px;display:flex;align-items:center;justify-content:flex-end">Labs</span>'
        +'<span style="'+_SH+'font-size:.55rem;color:var(--rar-r);width:28px">Stuff</span>'
        +'<span style="font-size:.55rem;color:#4ade80;width:30px;display:flex;align-items:center;justify-content:flex-end">Passif</span>'
        +'<span style="'+_SH+'font-size:.55rem;color:#f59e0b;width:26px">Prem</span>'
        +'<span style="font-size:.55rem;color:#fff;font-weight:700;width:34px;display:flex;align-items:center;justify-content:flex-end">Total</span>'
        +'</div>';

      // Bonus cumulés des sorts passifs débloqués
      var passB=(function(){
        var b={};
        if(typeof SPELL_TREES==='undefined'||!SPELL_TREES[META.heroId])return b;
        var _st=META.hero.spTree||{};
        SPELL_TREES[META.heroId].forEach(function(tree){
          tree.nodes.forEach(function(nd){
            var lv=_st[nd.id]||0;
            if(!lv||!nd.passive)return;
            var bonus=(nd.lvStats&&nd.lvStats[lv-1]&&nd.lvStats[lv-1].bonus)||nd.bonus||{};
            Object.keys(bonus).forEach(function(k){b[k]=(b[k]||0)+(bonus[k]||0);});
          });
        });
        return b;
      })();

      var pw=P.power,co=P.core,pr=P.protocol;
      var negate=Math.round((pw+co+pr)/3);

      return '<div style="margin-top:4px">'
        +colHead
        +dh('ATTAQUES','#ef4444')
        +dr('Tacle',         Math.round(P.tacle||5)+'%','—',stuffVal('tacle')?'+'+Math.round(stuffVal('tacle'))+'%':'—','#ef4444')
        +dr('Dégâts poussée',Math.round((P.pushDmg||0.1)*100)+'%','—',stuffVal('pushDmg')?'+'+Math.round(stuffVal('pushDmg')*100)+'%':'—','#f97316')
        +dr('ATQ — Plasma','—',labVal('up_atq_plasma')?'+'+parseFloat((labVal('up_atq_plasma')*100).toFixed(1))+'%':'—','—','#ef4444')
        +dr('ATQ — Neon',  '—',labVal('up_atq_neon')?'+'+parseFloat((labVal('up_atq_neon')*100).toFixed(1))+'%':'—','—','#22d3ee')
        +dr('ATQ — Glitch','—',labVal('up_atq_glitch')?'+'+parseFloat((labVal('up_atq_glitch')*100).toFixed(1))+'%':'—','—','#a855f7')
        +dr('ATQ — Negate','—',labVal('up_atq_negate')?'+'+parseFloat((labVal('up_atq_negate')*100).toFixed(1))+'%':'—','—','#fcd34d')
        +dr('ATQ Sort',    '—',labVal('up_atq_sort')?'+'+parseFloat((labVal('up_atq_sort')*100).toFixed(1))+'%':'—','—')
        +dr('ATQ Arme',    '—',labVal('up_atq_arme')?'+'+parseFloat((labVal('up_atq_arme')*100).toFixed(1))+'%':'—','—')
        +dr('ATQ CaC',     '—',labVal('up_atq_cac')?'+'+parseFloat((labVal('up_atq_cac')*100).toFixed(1))+'%':'—','—')
        +dr('ATQ Distance','—',labVal('up_atq_dist')?'+'+parseFloat((labVal('up_atq_dist')*100).toFixed(1))+'%':'—','—')
        +dh('SURVIVABILITÉ','#22c55e')
        +dr('Vitalité',    '—',labVal('up_core')?'+'+labVal('up_core')*10+' PV':'—',stuffVal('vit')?'+'+stuffVal('vit'):'—','#22c55e')
        +dr('Soin',        '—','—',stuffVal('soin')?pct(stuffVal('soin')):'—','#4ade80')
        +dr('Régénération','—','—',stuffVal('rgn')?'+'+stuffVal('rgn')+'/t':'—','#4ade80',passB.rgn?'+'+passB.rgn+'/t':'—')
        +dr('RESpa','—',P.respa>0?'+'+Math.round(P.respa*100)+'%':'—',stuffVal('respa')||stuffVal('esqPa')?pct(stuffVal('respa')||stuffVal('esqPa')):'—','#60a5fa')
        +dr('RESpm','—',P.respm>0?'+'+Math.round(P.respm*100)+'%':'—',stuffVal('respm')||stuffVal('esqPm')?pct(stuffVal('respm')||stuffVal('esqPm')):'—','#60a5fa')
        +dh('RÉSISTANCES','#3b82f6')
        +dr('RES Physique','—',labVal('up_res_physique')?pct(labVal('up_res_physique')):'—','—')
        +dr('RES Neon',   '—',labVal('up_res_neon')?pct(labVal('up_res_neon')):'—',stuffVal('resNeon')?pct(stuffVal('resNeon')):'—')
        +dr('RES Plasma', '—',labVal('up_res_plasma')?pct(labVal('up_res_plasma')):'—',stuffVal('resPlas')?pct(stuffVal('resPlas')):'—')
        +dr('RES Glitch', '—','—','—')
        +dr('RES Sort',   '—',labVal('up_res_sort')?pct(labVal('up_res_sort')):'—',stuffVal('resSpell')?pct(stuffVal('resSpell')):'—')
        +dr('RES Arme',   '—',labVal('up_res_arme')?pct(labVal('up_res_arme')):'—','—')
        +dr('RES CaC',    '—',labVal('up_res_cac')?pct(labVal('up_res_cac')):'—','—')
        +dr('RES Distance','—',labVal('up_res_dist')?pct(labVal('up_res_dist')):'—','—')
        +dh('EFFETS','#c084fc')
        +dr('Thorn',        '0','—',stuffVal('thorn')?pct(stuffVal('thorn')):'—','#c084fc',passB.thorn?pct(passB.thorn):'—')
        +dr('Lifesteal',    '0','—',stuffVal('lifesteal')?pct(stuffVal('lifesteal')):'—','#c084fc',passB.lifesteal?pct(passB.lifesteal):'—')
        +dr('Bot disponible',''+P.invoc,'—','—','#f97316')
        +dh('UTILITAIRE','#22d3ee')
        +dr('XP Bonus',     '—',labVal('up_xp')?'+'+labVal('up_xp')+'%':'—',stuffVal('xp')?pct(stuffVal('xp')):'—','#22d3ee',passB.xp?'+'+Math.round(passB.xp*100)+'%':'—','+100%')
        +dr('Crédits Bonus','—',labVal('up_credits')?'+'+labVal('up_credits')+'%':'—',stuffVal('credits')?pct(stuffVal('credits')):'—','#22d3ee',passB.credits?'+'+Math.round(passB.credits*100)+'%':'—','+100%')
        +dr('Loot Bonus',   '—',labVal('up_loot')?'+'+labVal('up_loot')+'%':'—',stuffVal('loot')?pct(stuffVal('loot')):'—','#f59e0b',passB.loot?'+'+Math.round(passB.loot*100)+'%':'—','+100%')
        +dr('Scan',         '10',labVal('up_scan')?'+'+labVal('up_scan'):'—','—','#22d3ee')
        +'</div>';
    })()
    +'</details></div>';
    document.getElementById('hr-c').querySelector('#hero-name-inp').addEventListener('change',function(){META.hero.name=this.value.trim()||null;saveMeta();});
}

function sBox(ico,lbl,val){return'<div class="stat-bx"><span class="stat-bx-ico">'+ico+'</span><span class="stat-bx-lbl">'+lbl+'</span><span class="stat-bx-val">'+val+'</span></div>';}
function fmtVal(v){if(v===0||v===undefined)return'—';var n=parseFloat(v);if(!isNaN(n)){var r=parseFloat(n.toFixed(1));return r===Math.floor(r)?Math.floor(r).toString():r.toFixed(1);}return String(v);}
function dRow(lbl,s){
  var comp=(s.skills||0)+(s.passive||0),eq=s.equip||0,lab=s.upg||0;
  return'<tr><td>'+lbl+'</td>'
    +'<td style="text-align:right">'+fmtVal(s.base)+'</td>'
    +'<td style="text-align:right;color:var(--green)">'+(comp?fmtVal(comp):'—')+'</td>'
    +'<td style="text-align:right;color:var(--rar-r)">'+(eq?fmtVal(eq):'—')+'</td>'
    +'<td style="text-align:right;color:var(--cyan)">'+(lab?fmtVal(lab):'—')+'</td>'
    +'<td style="text-align:right;font-weight:700">'+fmtVal(s.total)+'</td>'
    +'</tr>';
}

function renderHome(){
  var el=document.getElementById('home-modes');
  if(!el)return;
  el.innerHTML='<div class="run-page">'
    +'<div class="run-card" onclick="_hbSelMode=\'farm\';navigate(\'hexbattle\')" style="border-left:3px solid #00e87c;cursor:pointer">'
      +'<div class="run-card-body">'
        +'<div class="run-card-name" style="color:#00e87c">⚡ Farm</div>'
        +'<div class="run-card-desc">Combats rapides — Easy, Medium, Hard</div>'
        +'<div class="run-card-tags">1–4 ennemis &nbsp;\xb7&nbsp; R\xe9compenses vari\xe9es</div>'
      +'</div>'
      +'<div class="run-card-badge" style="background:#00e87c22;color:#00e87c;border:1px solid #00e87c44">FARM</div>'
    +'</div>'
    +'<div class="run-card" onclick="_hbSelMode=\'donjon\';navigate(\'hexbattle\')" style="border-left:3px solid #00d4ff;cursor:pointer">'
      +'<div class="run-card-body">'
        +'<div class="run-card-name" style="color:#00d4ff">🏰 Donjon</div>'
        +'<div class="run-card-desc">5 combats encha\xeen\xe9s — sans r\xe9g\xe9n\xe9ration</div>'
        +'<div class="run-card-tags">Boss au 5e combat &nbsp;\xb7&nbsp; R\xe9compenses \xd71.2–3.5</div>'
      +'</div>'
      +'<div class="run-card-badge" style="background:#00d4ff22;color:#00d4ff;border:1px solid #00d4ff44">DONJON</div>'
    +'</div>'
    +'<div class="run-card" onclick="_hbSelMode=\'pvp\';navigate(\'hexbattle\')" style="border-left:3px solid #ff3355;cursor:pointer">'
      +'<div class="run-card-body">'
        +'<div class="run-card-name" style="color:#ff3355">⚔️ PvP</div>'
        +'<div class="run-card-desc">Affrontez d\'autres joueurs</div>'
        +'<div class="run-card-tags">1 vs 1 &nbsp;\xb7&nbsp; 2 vs 2</div>'
      +'</div>'
      +'<div class="run-card-badge" style="background:#ff335522;color:#ff3355;border:1px solid #ff335544">\xc0 VENIR</div>'
    +'</div>'
    +'</div>';
}
// ── ITEM POPUP (Dofus style) ────────────────────────────────────
var _itemPopupTab = 'effets';
var _lastCraftedRid = null;

function openItemDetail(uid, itemOverride){
  DETAIL_UID = uid;
  var it = itemOverride || byUid(uid); if(!it) return;
  var def = typeof STUFF_DEFS !== 'undefined' ? STUFF_DEFS.find(function(d){return d.id===it.id;}) : null;
  var eq  = isEquipped(uid), r = rarLookup(it.rar)||{lbl:'Commun',cls:'rar-c'};
  var price = SELL[it.rar]||30;
  if(it.relicCount) price = Math.floor(price*(1+it.relicCount*0.2));
  var ico = it.icon || def && def.icon || {arme:'⚔️',armure:'🛡️',implant:'💿',chaussures:'👟',relique:'⚗️',piece:'🔩'}[it.sl||it.type] || '📦';
  var slLbl = {arme:'Arme',armure:'Armure',implant:'Implant',chaussures:'Chaussures',relique:'Relique',piece:'Pièce'}[it.sl||it.type] || (it.sl||it.type||'');
  _itemPopupTab = 'effets';

  // Build stat rows (Effets tab)
  var statIcons = {power:'🔥',core:'💠',protocol:'⚙️',vit:'♥',pm:'🦶',po:'🎯',init:'⚖️',esq:'◌',respa:'◌PA',respm:'◌PM',esqPa:'◌PA',esqPm:'◌PM',cc:'★',lifesteal:'🩸',rgn:'⟳',soin:'💚',resPlas:'🛡️P',resNeon:'🛡️N',resSpell:'🛡️S',loot:'💰',thorn:'↩',atk:'⚔️'};
  var statLabels = {power:'Power',core:'Core',protocol:'Protocol',vit:'Vitalité',pm:'PM',po:'PO',init:'Initiative',esq:'Esquive',respa:'RESpa',respm:'RESpm',esqPa:'RESpa',esqPm:'RESpm',cc:'Crit',lifesteal:'Lifesteal',rgn:'Regen',soin:'Soin',resPlas:'RES Plasma',resNeon:'RES Neon',resSpell:'RES Sorts',loot:'Loot',thorn:'Thorn',atk:'ATQ',
    // Legacy
    aspd:'[Ancien] Vit.ATQ',dodge:'[Ancien] Esquive',dpct:'[Ancien] Réduct.',sh:'[Ancien] Bouclier',crit:'[Ancien] Crit',pros:'[Ancien] Prospection'};

  function fmtVal(k,v){
    if(typeof v === 'number' && v < 1 && v > 0) return '+'+Math.round(v*100)+'%';
    if(typeof v === 'number') return v > 0 ? '+'+v : v;
    return v;
  }

  function buildEffets() {
    var st = it.st || {};
    var rows = Object.keys(st).filter(function(k){return st[k]!==0;});
    // Arme
    var armeHtml = '';
    if(def && def.arme) {
      var a = def.arme;
      armeHtml = '<div class="ipop-stat-row ipop-stripe">'
        +'<span class="ipop-stat-ico">⚔️</span>'
        +'<span class="ipop-stat-lbl">Dégâts '+a.dmgType+'</span>'
        +'<span class="ipop-stat-val">'+a.dmgMin+'–'+a.dmgMax+'</span></div>'
        +'<div class="ipop-stat-row">'
        +'<span class="ipop-stat-ico">⚡</span>'
        +'<span class="ipop-stat-lbl">Coût PA · PO · Atq/tour</span>'
        +'<span class="ipop-stat-val">'+a.paCost+' · '+a.po+' · '+a.nbAtq+'</span></div>';
    }
    var statHtml = rows.map(function(k,idx){
      var roll = it.roll !== undefined ? it.roll : 1;
      var minV = '', maxV = '';
      if(def){
        var ds = (def.stats||[]).find(function(s){return s.key===k;});
        if(ds && ds.max !== ds.min){ minV = fmtVal(k,ds.min); maxV = fmtVal(k,ds.max); }
      }
      // Preview boutique : affiche la plage min→max
      if (it._isPreview) {
        return '<div class="ipop-stat-row'+(idx%2===0?' ipop-stripe':'')+'">'
          +'<span class="ipop-stat-ico">'+(statIcons[k]||'•')+'</span>'
          +'<span class="ipop-stat-lbl">'+(statLabels[k]||k)+'</span>'
          +'<span class="ipop-stat-val" style="color:var(--gold)">'+(ds?(fmtVal(k,ds.min)+(ds.min!==ds.max?'→'+fmtVal(k,ds.max):'')):'—')+'</span></div>';
      }
      var rangeStr = minV && maxV ? ' <span style="color:var(--text4);font-size:.55rem">('+minV+'→'+maxV+')</span>' : '';
      return '<div class="ipop-stat-row'+(idx%2===0?' ipop-stripe':'')+'">'
        +'<span class="ipop-stat-ico">'+(statIcons[k]||'•')+'</span>'
        +'<span class="ipop-stat-lbl">'+(statLabels[k]||k)+''+rangeStr+'</span>'
        +'<span class="ipop-stat-val">'+fmtVal(k,it.st[k])+'</span></div>';
    }).join('');
    return armeHtml + (statHtml || '<div style="color:var(--text4);padding:8px;font-size:.68rem">Aucun effet</div>');
  }

  function buildConditions() {
    var conds = [];
    if(it.lrq > 1) conds.push({ico:'⚖️',lbl:'Niveau requis',val:''+it.lrq,ok:META.hero.lv>=it.lrq});
    if(def && def.equip) conds.push({ico:'📋',lbl:'Condition',val:def.equip,ok:true});
    if(def && def.pano) conds.push({ico:'🔗',lbl:'Panoplie',val:def.pano,ok:true});
    if(!conds.length) return '<div style="color:var(--text4);padding:8px;font-size:.68rem">Aucune condition</div>';
    return conds.map(function(c,idx){
      return '<div class="ipop-stat-row'+(idx%2===0?' ipop-stripe':'')+'">'
        +'<span class="ipop-stat-ico">'+(c.ok?c.ico:'🔒')+'</span>'
        +'<span class="ipop-stat-lbl" style="color:'+(c.ok?'var(--text)':'var(--red)')+'">'+c.lbl+'</span>'
        +'<span class="ipop-stat-val" style="color:'+(c.ok?'var(--text)':'var(--red)')+'">'+c.val+'</span></div>';
    }).join('');
  }

  var el = document.getElementById('item-detail'); if(!el) return;

  function render() {
    el.classList.remove('hidden');

    // Find craft association
    var craftRef = '';
    if(typeof RECIPES !== 'undefined') {
      var rc = RECIPES.find(function(r){return r.id===it.id;});
      if(rc) craftRef = 'Craft disponible';
    }

    el.querySelector('#item-detail-content').innerHTML =
      // ── Bandeau top ──────────────────────────────────────────────
      '<div class="ipop-header" style="background:linear-gradient(135deg,rgba(30,30,60,.9),rgba(10,10,30,.95));border-bottom:2px solid '+(r.color||'var(--border)')+'">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-family:var(--font-h);font-size:.85rem;font-weight:900;color:'+( r.color||'var(--text)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.nm+'</div>'
      +'<div style="font-size:.62rem;color:var(--text3)">'+r.lbl+' · '+slLbl+(it.lrq>1?' · Lvl '+it.lrq:'')+'</div>'
      +'</div>'
      +'<button onclick="hideItemDetail()" style="background:transparent;border:none;color:var(--text4);font-size:1.2rem;cursor:pointer;flex-shrink:0;padding:0 4px">✕</button>'
      +'</div>'
      // ── Image / icône + loupe ──────────────────────────────────────
      +'<div style="position:relative;display:flex;justify-content:center;align-items:center;padding:12px 0 10px;background:rgba(0,0,0,.3);min-height:100px">'
      +(it.img||it.id?'<img src="'+(it.img||('assets/items/'+it.id+'.png'))+'" style="max-height:90px;max-width:200px;object-fit:contain;filter:drop-shadow(0 0 14px '+(r.color||'#fff')+'66)" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\'" />':''
      +'<div style="display:'+(it.img||it.id?'none':'block')+';font-size:4rem;line-height:1;filter:drop-shadow(0 0 14px '+(r.color||'#fff')+'66)">'+ico+'</div>'
      )
      +'<button onclick="ipopShowCraft(\''+uid+'\',\''+it.id+'\')" style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.15);border-radius:6px;font-size:.9rem;cursor:pointer;color:var(--text4);padding:3px 8px" title="Craft">🔍</button>'
      +'</div>'
      // ── Onglets Effets / Conditions ───────────────────────────────
      +'<div style="display:flex;border-bottom:1px solid var(--border)">'
      +'<button onclick="_itabE()" style="flex:1;padding:7px;font-size:.68rem;font-weight:700;background:transparent;border:none;border-bottom:2px solid '+(_itemPopupTab==='effets'?r.color||'var(--cyan)':'transparent')+';color:'+(_itemPopupTab==='effets'?r.color||'var(--cyan)':'var(--text3)')+';cursor:pointer">Effets</button>'
      +'<button onclick="_itabC()" style="flex:1;padding:7px;font-size:.68rem;font-weight:700;background:transparent;border:none;border-bottom:2px solid '+(_itemPopupTab==='conditions'?r.color||'var(--cyan)':'transparent')+';color:'+(_itemPopupTab==='conditions'?r.color||'var(--cyan)':'var(--text3)')+';cursor:pointer">Conditions</button>'
      +'</div>'
      // ── Contenu onglet ────────────────────────────────────────────
      +'<div class="ipop-body">'
      +(_itemPopupTab==='effets' ? buildEffets() : buildConditions())
      +'</div>'
      // ── Footer ────────────────────────────────────────────────────
      +'<div style="display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--border);background:var(--bg)">'
      +(it.type==='equip'&&!eq&&uid!=='__preview__'?'<button class="btn btn-sm btn-green" onclick="equipFromPopup(\''+uid+'\')" style="flex:1">Équiper</button>':'')
      +(it.type==='equip'&&eq?'<button class="btn btn-sm btn-orange" style="flex:1" onclick="unequipDetail()">Retirer</button>':'')
      +(_lastCraftedRid&&uid!=='__preview__'
        ?'<button class="btn btn-sm btn-orange" onclick="_forgerEncore()" style="flex:1">🔨 Forger encore</button>'
        :(uid!=='__preview__'&&!it.perm?'<button class="btn btn-sm btn-red btn-sell" data-uid="'+uid+'" style="flex:1">'+fmt(price)+'₵</button>':uid!=='__preview__'&&it.perm?'<span style="font-size:.7rem;color:var(--text4)">Permanent</span>':''))
      +'</div>';
  }

  render();
  window._ipopRender = render;

  // Délégation des clics dans item-detail (hors de #main, donc main.js ne capture pas)
  el.onclick = function(e) {
    // Click overlay → fermer
    if (e.target === el) { hideItemDetail(); return; }
    var t = e.target;
    while (t && t !== el) {
      if (t.tagName === 'BUTTON') {
        var uid2 = t.getAttribute('data-uid') || DETAIL_UID;
        if (t.classList.contains('btn-sell')) {
          if (uid2) sellItem(uid2);
          hideItemDetail();
          if (typeof renderInv === 'function') renderInv();
          return;
        }
        if (t.classList.contains('btn-eq')) {
          if (uid2) equipIt(uid2);
          return;
        }
      }
      t = t.parentNode;
    }
  };
}

function ipopTab(tab){
  _itemPopupTab = tab;
  if(typeof window._ipopRender === 'function') window._ipopRender();
}

function hideItemDetail(){
  var el=document.getElementById('item-detail');
  if(el)el.classList.add('hidden');
  DETAIL_UID=null;
  window._ipopRender=null;
  _lastCraftedRid=null;
}

function _forgerEncore(){
  if(!_lastCraftedRid)return;
  var rid=_lastCraftedRid;
  var res=craftFromRecipe(rid);
  if(!res.ok){alert(res.msg);return;}
  renderCraft();
  _lastCraftedRid=rid;
  openItemDetail(res.item.uid);
  var content=document.getElementById('item-detail-content');
  if(content){
    content.classList.remove('forge-reroll-flash');
    void content.offsetWidth;
    content.classList.add('forge-reroll-flash');
    setTimeout(function(){content.classList.remove('forge-reroll-flash');},700);
  }
}

function unequipDetail(){
  if(!DETAIL_UID)return;
  var it=byUid(DETAIL_UID);if(!it)return;
  ['arme','armure','casque','chaussures','implant1','implant2'].forEach(function(sl){if(META.eq[sl]===DETAIL_UID)META.eq[sl]=null;});
  recompute();renderInv();saveMeta();
  if(DETAIL_UID)openItemDetail(DETAIL_UID);  // refresh popup
}


function openLabPopup(uid) {
  var UPG_ALL = typeof UPGRADES !== 'undefined' ? UPGRADES : (typeof UPG !== 'undefined' ? UPG : []);
  var u = UPG_ALL.find(function(x){ return x.id === uid; });
  if (!u) return;
  var lv = META.upgLv[uid] || 0;
  var effMax = u.max || 10;
  var q = META.labQueue && META.labQueue[uid];
  var dur = typeof labTimeSec === 'function' ? labTimeSec(lv + 1) : 60;
  var durLabel = typeof fmtLabTime === 'function' ? fmtLabTime(dur) : dur + 's';
  var c = typeof uCost === 'function' ? uCost(u) : 0;
  var isLocked = u.ulv && lv < u.ulv;
  var mx = lv >= effMax;
  function removeLab(){ var o=document.getElementById('lab-popup-overlay'); if(o)o.remove(); }
  var el = document.getElementById('lab-popup-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'lab-popup-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px';
    el.addEventListener('click', function(e){ if(e.target===el) removeLab(); });
    document.body.appendChild(el);
  }
  var timerStr = '';
  if (q) {
    var remain = Math.max(0, Math.ceil(q.durationSec - (Date.now()-q.startTime)/1000));
    timerStr = '<div style="color:var(--cyan);font-size:.8rem;margin:6px 0">En cours: ' + (typeof fmtLabTime==='function'?fmtLabTime(remain):remain+'s') + ' restant</div>';
  }
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;max-width:280px;width:100%;text-align:center';
  box.innerHTML = '<div style="font-size:2.5rem;margin-bottom:8px">'+u.icon+'</div>'
    + '<div style="font-size:1rem;font-weight:700;margin-bottom:4px">'+u.name+'</div>'
    + '<div style="font-size:.72rem;color:var(--text3);margin-bottom:10px">'+(u.desc||'')+'</div>'
    + '<div style="font-size:.75rem;color:var(--text2);margin-bottom:8px">Niveau <strong>'+lv+'</strong> / '+effMax+'</div>'
    + timerStr
    + (!mx&&!q&&!isLocked ? '<div style="font-size:.72rem;color:var(--gold);margin-bottom:2px">Cout: '+(typeof fmt==='function'?fmt(c):c)+' C</div>'
      +'<div style="font-size:.72rem;color:var(--text3);margin-bottom:8px">Duree: '+durLabel+'</div>' : '')
    + '<div id="lab-popup-btns" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:8px"></div>';
  el.innerHTML = '';
  el.appendChild(box);
  var btns = box.querySelector('#lab-popup-btns');
  if (mx) {
    var sp = document.createElement('span'); sp.style.cssText='color:var(--green);font-size:.8rem'; sp.textContent='MAX'; btns.appendChild(sp);
  } else if (!q && !isLocked) {
    var b1 = document.createElement('button'); b1.className='btn btn-green'; b1.textContent='Lancer';
    b1.onclick = function(){ buyUpg(uid); removeLab(); renderUpg(); }; btns.appendChild(b1);
  } else if (q) {
    var b2 = document.createElement('button'); b2.className='btn'; b2.style.color='var(--green)'; b2.textContent='Accelerer';
    b2.onclick = function(){ labSkip(uid); removeLab(); }; btns.appendChild(b2);
    var b3 = document.createElement('button'); b3.className='btn'; b3.textContent='Annuler';
    b3.onclick = function(){ labCancel(uid); removeLab(); }; btns.appendChild(b3);
  }
  var bC = document.createElement('button'); bC.className='btn'; bC.textContent='Fermer'; bC.onclick=removeLab; btns.appendChild(bC);
}

function renderUpg(){
  var wrap=document.getElementById('upg-grid');if(!wrap)return;
  var hlv=META.hero.lv||1;
  if(typeof pollLabs==='function')pollLabs();

  // ── Boutons de filtre ─────────────────────────────────────────
  var filterBar=document.getElementById('lab-filter-bar');
  if(filterBar){
    filterBar.innerHTML=
      '<button class="flt-btn'+(LAB_HIDE_MAX?' active':'')+'" onclick="LAB_HIDE_MAX=!LAB_HIDE_MAX;renderUpg()">'        +(LAB_HIDE_MAX?'👁 Voir max':'✕ Masquer max')+'</button>'      +'<button class="flt-btn'+(LAB_SHOW_LOCKED?' active':'')+'" onclick="LAB_SHOW_LOCKED=!LAB_SHOW_LOCKED;renderUpg()">'        +(LAB_SHOW_LOCKED?'🔒 Masquer bloqués':'🔓 Voir bloqués')+'</button>';
  }

  // ── Catégories ────────────────────────────────────────────────
  var catOrder=['Caractéristiques','Utilitaire','Attaques','Résistances'];
  var catIcons={'Caractéristiques':'🔬','Utilitaire':'🛠️','Attaques':'⚔️','Résistances':'🛡️'};
  var bycat={};
  UPGRADES.forEach(function(u){
    // PA lab: effectiveMax selon niveau héros
    var effMax=u.max;
    if(u.id==='up_pa'){
      effMax=hlv>=100?2:hlv>=50?1:0;
    }
    u._effMax=effMax;
    // Visible ?
    var isLocked=u.ulv&&hlv<u.ulv||(u.id==='up_pa'&&effMax===0);
    if(!LAB_SHOW_LOCKED&&isLocked)return;  // masqué par défaut
    var lv=META.upgLv[u.id]||0;
    if(LAB_HIDE_MAX&&lv>=effMax&&effMax>0)return;
    if(!u.cat)return;
    if(!bycat[u.cat])bycat[u.cat]=[];
    bycat[u.cat].push(u);
  });

  wrap.innerHTML=catOrder.filter(function(c){return bycat[c];}).map(function(cat){
    var items=bycat[cat];
    return '<div class="lab-cat-title">'+(catIcons[cat]||'')+' '+cat+'</div>'
      +'<div class="lab-grid3">'+items.map(function(u){
        var lv=META.upgLv[u.id]||0;
        var effMax=u._effMax!==undefined?u._effMax:u.max;
        var isLocked=u.ulv&&hlv<u.ulv||(u.id==='up_pa'&&effMax===0);
        var q=META.labQueue&&META.labQueue[u.id];
        var mx=lv>=effMax;
        var c=uCost(u),ca=!mx&&!q&&!isLocked&&META.cr>=c;
        var bp=effMax>0?Math.round(lv/effMax*100):0;
        var dur=typeof labTimeSec==='function'?labTimeSec(lv+1):60;
        var durLabel=typeof fmtLabTime==='function'?fmtLabTime(dur):'';
        var timerHtml='';
        if(q){
          var elapsed=(Date.now()-q.startTime)/1000;
          var remain=Math.max(0,Math.ceil(q.durationSec-elapsed));
          var pct2=Math.min(100,Math.round(elapsed/q.durationSec*100));
          var tLabel=typeof fmtLabTime==='function'?fmtLabTime(remain):remain+'s';
          timerHtml='<div style="font-size:.5rem;color:var(--cyan);white-space:nowrap">⏳ '+tLabel+'</div>'
            +'<div class="bar-wrap" style="height:2px;margin:1px 0;width:100%"><div class="bar-fill" style="width:'+pct2+'%;background:var(--cyan)"></div></div>'
            +'<div style="display:flex;gap:2px;width:100%">'
            +'<button class="btn btn-sm" style="flex:1;font-size:.48rem;padding:2px 0;color:var(--green);border-color:var(--green)" onclick="event.stopPropagation();labSkip(\''+u.id+'\')">⚡</button>'
            +'<button class="btn btn-sm" style="flex:1;font-size:.48rem;padding:2px 0;color:var(--text4)" onclick="event.stopPropagation();labCancel(\''+u.id+'\')">✕</button>'
            +'</div>';
        }
        // Special PA: show unlock levels
        var extraInfo='';
        if(u.id==='up_pa'){
          extraInfo='<div style="font-size:.48rem;color:var(--text4);line-height:1.3">'            +(lv<1?'Nv1 : héros 50':'')+(lv<2?' · Nv2 : héros 100':'')+'</div>';
        }
        return '<div class="lab-card3'+(isLocked?' lab-locked':'')+'" onclick="openLabPopup(\''+u.id+'\')">'          +'<div class="lab-card3-ico">'+u.icon+'</div>'          +'<div class="lab-card3-name">'+u.name+'</div>'          +'<div class="bar-wrap" style="height:2px;margin:2px 0;width:100%"><div class="bar-fill bar-xp" style="width:'+bp+'%"></div></div>'          +'<div class="lab-card3-lv">Nv.'+lv+'/'+effMax+'</div>'          +extraInfo          +(isLocked?'<div style="font-size:.48rem;color:var(--text4)">🔒 lvl '+u.ulv+'</div>'
            :timerHtml||('<div class="lab-card3-cost">'+(mx?'<span style="color:var(--green)">MAX</span>':fmt(c)+' ₵ · '+durLabel)+'</div>'              +'<button class="btn btn-sm'+(ca?' btn-green':'')+' btn-upg lab-card3-btn" data-id="'+u.id+'" '+(ca?'':' disabled')+' onclick="event.stopPropagation();buyUpg(\''+u.id+'\')">'              +(mx?'MAX':'Lancer')+'</button>'))          +'</div>';
      }).join('')+'</div>';
  }).join('');
}

var LAB_HIDE_MAX    = false;
var LAB_SHOW_LOCKED = false;
var BOUT_FILTER     = 'all';
var INV_FILTER      = 'all';
var INV_SEL         = {};
var DRAG_UID        = null;

function renderBout(){
  var items=getBoutDisplay();
  var types=[{id:'all',lbl:'Tout'},{id:'arme',lbl:'⚔️'},{id:'armure',lbl:'🛡️'},{id:'casque',lbl:'⛑️'},{id:'implant',lbl:'💡'},{id:'chaussures',lbl:'👟'}];
  document.getElementById('shop-filters').innerHTML=types.map(function(tp){
    return'<button class="flt-btn'+(BOUT_FILTER===tp.id?' active':'')+'" onclick="BOUT_FILTER=\''+tp.id+'\';renderBout()" title="'+tp.id+'">'+tp.lbl+'</button>';
  }).join('');
  var filtered=BOUT_FILTER==='all'?items:items.filter(function(b){return b.sl===BOUT_FILTER;});
  var grouped={};
  filtered.forEach(function(b){if(!grouped[b.sl])grouped[b.sl]=[];grouped[b.sl].push(b);});
  var slabs={arme:'⚔️ Armes',armure:'🛡️ Armures',casque:'⛑️ Casques',implant:'💡 Implants',chaussures:'👟 Chaussures'};
  var html='';
  ['arme','armure','casque','implant','chaussures'].forEach(function(sl){
    var grp=grouped[sl];if(!grp||!grp.length)return;
    html+='<div class="shop-cat-title">'+slabs[sl]+'</div><div class="shop-grid-img">';
    grp.slice(0,4).forEach(function(b){
      var r=rarLookup(b.rar),bought=META.bought.indexOf(b.id)!==-1;
      var okG=b.cost<=0||META.gems>=b.cost,okC=b.costCr<=0||META.cr>=b.costCr;
      var canB=!bought&&okG&&okC;
      var parts=[];if(b.cost>0)parts.push(b.cost+'💎');if(b.costCr>0)parts.push(fmt(b.costCr)+'₵');
      var def=(typeof STUFF_DEFS!=='undefined')&&STUFF_DEFS.find(function(d){return d.id===b.id;});
      var imgSrc=def&&def.img?def.img:('assets/items/'+b.id+'.png');
      html+='<div class="shop-img-card rar-'+b.rar+'" onclick="boutPreview(\''+b.id+'\')">'        +'<div style="position:relative;width:100%;aspect-ratio:1;overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.4)">'        +'<img src="'+imgSrc+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" onerror="_imgErr(this)" alt=""/>'        +'<span style="display:none;font-size:2.2rem;position:absolute;top:50%;left:50%;transform:translate(-50%,-60%)">'+(b.icon||'📦')+'</span>'        +'</div>'        +'<div class="shop-img-footer">'        +(bought?'<span style="color:var(--green);font-size:.62rem">✔</span>':'<span style="color:var(--gold);font-size:.62rem;font-weight:700">'+(parts.join('+')||'Gratuit')+'</span>')        +(bought?'':' <button class="btn btn-xs'+(canB?' btn-green':'')+' btn-bout" data-id="'+b.id+'"'+(canB?'':' disabled')+' style="padding:2px 6px;font-size:.58rem">'+(canB?'Acheter':'N/A')+'</button>')        +'</div></div>';
    });
    html+='</div>';
  });
  document.getElementById('shop-body').innerHTML=html||'<p style="color:var(--text4);padding:16px">Aucun article.</p>';
}

function stackItems() {
  var stacks = [], seen = {};
  META.inv.forEach(function(it) {
    if (it.type === 'spare') {
      var key = it.partId || it.id;
      if (seen[key]) { seen[key].count++; }
      else { var e={item:it,count:1}; seen[key]=e; stacks.push(e); }
    } else {
      stacks.push({item:it, count:1});
    }
  });
  return stacks;
}

function renderInv(){
  var hero=getH(META.heroId||'berserker'),h=META.hero;

  // ── Layout Diablo 3 ─────────────────────────────────────────────
  // Disposition : arme (gauche) | portrait héros | skin (droite)
  //               implant1 + implant2 + chaussures (bas centré)
  function makeSlot(sl,lbl,ico){
    var uid=META.eq[sl],it=uid?byUid(uid):null;
    var rar=it?rarLookup(it.rar).cls:'';
    var tooltip=it?it.nm+'\n'+stStr(it.st):'';
  var imgHtml='';
    if(it){
      var _itId=it.id||(it.uid&&it.uid.charAt(0)==='B'?it.uid.slice(1):null);
      var _itDef=_itId&&(typeof STUFF_DEFS!=='undefined')&&STUFF_DEFS.find(function(d){return d.id===_itId;});
      var imgSrc=(_itDef&&_itDef.img)||it.img||(_itId?'assets/items/'+_itId+'.png':'');
      imgHtml='<img src="'+imgSrc+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;z-index:1" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'block\'" alt=""/>'
        +'<span class="d3-slot-ico '+rar+'" style="position:relative;z-index:0;display:none">'+(it.icon||ico)+'</span>';
    } else {
      imgHtml='<span class="d3-slot-ico" style="font-size:1.8rem;opacity:0.25;filter:grayscale(1)">'+ico+'</span>';
    }
    return '<div class="d3-slot'+(it?' filled':'')+'\" '
      +'title="'+tooltip+'" '
      +(it?'onclick="openItemDetail(\''+it.uid+'\')" ':'')
      +'ondragover="allowDrop(event)" ondrop="dropIntoSlot(event,\''+sl+'\')">'
      +imgHtml
      +(it?'':'<span class="d3-slot-lbl">'+lbl+'</span>')
      +(it?'<span class="d3-slot-nm '+rar+'">'+it.nm+'</span>':'')
      +'</div>';
  }
  var heroData=getH(META.heroId||'berserker');
  var heroName=h.name||heroData.name;
  var fallbackIco={berserker:'⚔️',warden:'🗡️',hacker:'💻'}[META.heroId]||'🦸';
  var d3html=
    // Colonne gauche : arme
    '<div class="d3-col-l">'+makeSlot('arme','Arme','⚔️')+makeSlot('implant1','Impl. 1','💡')+makeSlot('armure','Armure','🛡️')+'</div>'

    // Centre : portrait héros
    +'<div class="d3-center">'
    +'<div class="d3-hero-portrait" '
    +'ondragover="allowDrop(event)">'
    +'<img src="'+heroData.portrait+'" onerror="this.style.display=\'none\'" alt=""/>'
    +'<span class="fallback-ico" style="display:none">'+fallbackIco+'</span>'
    +'</div>'
    +'<div class="d3-hero-name">'+heroName+'</div>'
    +'</div>'
    // Colonne droite : skin
    +'<div class="d3-col-r">'+makeSlot('casque','Casque','⛑️')+makeSlot('implant2','Impl. 2','💡')+makeSlot('chaussures','Chaus.','👟')+'</div>';
  document.getElementById('d3-equip').innerHTML=d3html;
  var _invHdr=document.querySelector('#pg-inv .inv-hdr');
  if(_invHdr)_invHdr.style.display=INV_TOP_OPEN?'':'none';

  // Sorts actifs
  var spRow=document.getElementById('sp-slots-row');if(spRow)spRow.innerHTML='';


  // Filtres + toggle sélection + toggle top panel
  var fltH=[{id:'all',lbl:'Tout'},{id:'equip-arme',lbl:'⚔️'},{id:'equip-armure',lbl:'🛡️'},{id:'equip-casque',lbl:'⛑️'},{id:'equip-implant',lbl:'💿'},{id:'equip-chaussures',lbl:'👟'},{id:'spare',lbl:'🔩'}].map(function(f){
    return'<button class="flt-btn'+(INV_FILTER===f.id?' active':'')+'" onclick="INV_FILTER=\''+f.id+'\';renderInv()">'+f.lbl+'</button>';
  }).join('');
  fltH+='<button class="flt-btn'+(INV_SEL_MODE?' active':'')+'" onclick="toggleSelMode()" style="margin-left:auto">☑</button>';
  fltH+='<button class="flt-btn" onclick="toggleInvTop()" title="Masquer/Afficher le panneau héros">'+(INV_TOP_OPEN?'▲':'▼')+'</button>';
  document.getElementById('inv-filters').innerHTML=fltH;

  // Sélection rapide par rareté
  var sarH='';
  if(INV_SEL_MODE){
    sarH='<span style="font-size:.68rem;color:var(--text4);padding:0 4px">Sél.:</span>';
    RAR_K.forEach(function(rk){
      var cnt=META.inv.filter(function(x){return x.rar===rk&&!x.perm&&!isEquipped(x.uid);}).length;
      if(!cnt)return;
      sarH+='<span class="rar-dot '+RAR[rk].cls+'" onclick="selectRarInv(\''+rk+'\')" title="Tout '+RAR[rk].lbl+' ('+cnt+')">'+cnt+'</span>';
    });
    sarH+='<span class="rar-dot" onclick="clearInvSel()" style="color:var(--text4)" title="Désélectionner tout">✕</span>';
  }
  document.getElementById('sell-all-row').innerHTML=sarH;

  // Grille items
  var stacked=stackItems().filter(function(s){ return !isEquipped(s.item.uid); });
  var filtered=stacked.filter(function(s){
    if(s.item.type==='relique')return false;  // reliques = page Craft uniquement
    if(s.item.type==='relique')return false;
    if(INV_FILTER==='all')return true;
    if(INV_FILTER.startsWith('equip-'))return s.item.type==='equip'&&s.item.sl===INV_FILTER.slice(6);
    return s.item.type===INV_FILTER;
  });
  var sel=INV_SEL_MODE;
  document.getElementById('inv-grid').innerHTML=filtered.map(function(s){
    var it=s.item,r=rarLookup(it.rar),eq=isEquipped(it.uid),isSel=sel&&!!INV_SEL[it.uid];
    var ico=it.icon||{arme:'⚔️',armure:'🛡️',casque:'⛑️',implant:'💡',chaussures:'👟',relique:'⚗️',piece:'🔩',spare:'🔩'}[it.sl||it.type]||'📦';
    var _def=typeof STUFF_DEFS!=='undefined'?STUFF_DEFS.find(function(d){return d.id===it.id;}):null;
    var invBg=(_def&&_def.pano)?'rgba(74,222,128,.12)':'rgba(0,0,0,.65)';
    return '<div class="inv-cell rar-'+it.rar+(isSel?' selected':'')+'\" data-uid="'+it.uid+'" style="background:'+invBg+'" '
      +'draggable="'+(sel?'false':'true')+'" ondragstart="dragStart(event,\''+it.uid+'\')" ondragover="allowDrop(event)" ondrop="dropCell(event,\''+it.uid+'\')"'
      +' onclick="'+(sel?'toggleInvSel(\''+it.uid+'\')':'openItemDetail(\''+it.uid+'\')')+'\">'
      +(eq?'<div class="inv-eq-badge">EQ</div>':'')
      +(sel?'<div class="sel-check">'+(isSel?'✓':'')+'</div>':'')
      +(s.count>1?'<div class="inv-stack-count">×'+s.count+'</div>':'')
      +'<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center">'
      +(function(){var _gId=it.id||(it.uid&&it.uid.charAt(0)==='B'?it.uid.slice(1):null);var _gDef=_gId&&(typeof STUFF_DEFS!=='undefined')&&STUFF_DEFS.find(function(d){return d.id===_gId;});var _gImg=(_gDef&&_gDef.img)||it.img||(_gId?'assets/items/'+_gId+'.png':'');return _gImg?'<img src="'+_gImg+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:inherit;z-index:1" onerror="_imgErr(this)" alt=""/><span style="font-size:1.4rem;z-index:0;display:none">'+ico+'</span>':'<span style="font-size:1.4rem;z-index:0">'+ico+'</span>';})()
      +'</div>'
      +'</div>';
  }).join('');
}
// ── SÉLECTION PERSONNAGE ─────────────────────────────────────────
function renderCharSelect(){
  var el=document.getElementById('pg-char-select');if(!el)return;
  var maxLv=globalMaxLv();
  var cards=META.slots.map(function(s,i){
    var ulv=SLOT_UNLOCK_LV[i];
    var locked=(ulv>1&&maxLv<ulv);
    var isAct=(s&&META.heroId&&i===META.activeSlot);
    if(locked){
      return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:18px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.45">'
        +'<div style="font-size:1.8rem">🔒</div>'
        +'<div style="font-size:.65rem;font-family:var(--font-h);color:var(--text3);letter-spacing:.08em">SLOT '+(i+1)+'</div>'
        +'<div style="font-size:.65rem;color:var(--text4);text-align:center">Niveau '+ulv+'<br>requis</div>'
        +'</div>';
    }
    if(!s){
      return '<div style="background:var(--bg2);border:1.5px dashed var(--border);border-radius:12px;padding:18px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer" onclick="_startCreate('+i+')">'
        +'<div style="width:60px;height:60px;border-radius:50%;background:var(--bg3);border:1.5px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:var(--text4)">+</div>'
        +'<div style="font-size:.65rem;font-family:var(--font-h);color:var(--text3);letter-spacing:.08em">SLOT '+(i+1)+'</div>'
        +'<button class="btn btn-sm btn-cyan" style="margin-top:2px;pointer-events:none">Créer</button>'
        +'</div>';
    }
    var hd=HEROES.find(function(h){return h.id===s.heroId;})||HEROES[0];
    var lv=s.hero?s.hero.lv:1;
    var border=isAct?'border:1.5px solid var(--cyan)':'border:1px solid var(--border)';
    return '<div style="background:var(--bg2);'+border+';border-radius:12px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:6px">'
      +(isAct?'<div style="font-size:.6rem;font-family:var(--font-h);color:var(--cyan);letter-spacing:.1em">● ACTIF</div>':'')
      +'<div style="border-radius:8px;overflow:hidden">'+heroImg(s.heroId,72,88)+'</div>'
      +'<div style="font-family:var(--font-h);font-size:.78rem;color:var(--text);font-weight:700;text-align:center">'+hd.name+'</div>'
      +'<div style="font-size:.62rem;color:var(--text4);text-align:center">'+hd.arch+'</div>'
      +'<div style="font-size:.68rem;color:var(--text3)">Niv. <strong style="color:var(--cyan)">'+lv+'</strong></div>'
      +'<div style="display:flex;gap:6px;margin-top:4px">'
      +'<button class="btn btn-sm btn-green" onclick="loadSlot('+i+');navigate(\'home\')">▶ Jouer</button>'
      +'<button class="btn btn-sm" onclick="deleteCharacter('+i+')" style="padding:5px 8px;background:rgba(255,51,85,.12);border-color:rgba(255,51,85,.3);color:var(--red)">✕</button>'
      +'</div>'
      +'</div>';
  }).join('');

  el.innerHTML='<div style="min-height:100vh;background:var(--bg1);display:flex;flex-direction:column">'
    +'<div style="padding:28px 16px 12px;text-align:center;flex-shrink:0">'
    +'<div style="font-family:var(--font-h);font-size:1.5rem;font-weight:900;color:var(--cyan);letter-spacing:.12em">⚡ CYBER IDLE</div>'
    +'<div style="font-size:.72rem;color:var(--text3);margin-top:6px;letter-spacing:.06em">SÉLECTION DU PERSONNAGE</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 16px 32px;align-content:start">'
    +cards
    +'</div>'
    +'</div>';
}

function _startCreate(slotIdx){ _charCreateSlot=slotIdx; _charCreateIdx=0; navigate('char-create'); }

// ── CRÉATION PERSONNAGE ──────────────────────────────────────────
function renderCharCreate(){
  var el=document.getElementById('pg-char-create');if(!el)return;
  var hd=HEROES[_charCreateIdx]||HEROES[0];
  var dots=HEROES.map(function(_,di){
    return '<div style="width:6px;height:6px;border-radius:50%;background:'+(di===_charCreateIdx?'var(--cyan)':'var(--bg3)')+';transition:background .2s"></div>';
  }).join('');
  var spells=hd.spells?hd.spells.slice(0,6).map(function(sp){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:7px;height:7px;border-radius:50%;background:'+(sp.passive?'var(--text4)':'var(--cyan)')+';flex-shrink:0"></div>'
      +'<span style="font-size:.72rem;color:var(--text2)">'+sp.name+'</span>'
      +(sp.passive?'<span style="font-size:.58rem;color:var(--text4);margin-left:auto;flex-shrink:0">PASSIF</span>':'')
      +'</div>';
  }).join(''):'';

  el.innerHTML='<div style="min-height:100vh;background:var(--bg1);display:flex;flex-direction:column">'
    // Header
    +'<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0">'
    +'<button class="btn btn-sm" onclick="navigate(\'char-select\')">← Retour</button>'
    +'<div style="font-family:var(--font-h);font-size:.8rem;color:var(--text3);letter-spacing:.08em">SLOT '+(+_charCreateSlot+1)+' — CRÉATION</div>'
    +'</div>'
    // Carousel
    +'<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:20px 16px 12px;flex-shrink:0">'
    +'<button class="tbtn" onclick="_charPrev()" style="font-size:1.1rem;width:38px;height:38px;flex-shrink:0">◄</button>'
    +'<div style="display:flex;flex-direction:column;align-items:center;gap:6px">'
    +heroImg(hd.id,100,126)
    +'<div style="font-family:var(--font-h);font-size:1rem;font-weight:700;color:var(--cyan)">'+hd.name+'</div>'
    +'<div style="font-size:.68rem;color:var(--text4)">'+hd.arch+'</div>'
    +'<div style="display:flex;gap:6px;margin-top:2px">'+dots+'</div>'
    +'</div>'
    +'<button class="tbtn" onclick="_charNext()" style="font-size:1.1rem;width:38px;height:38px;flex-shrink:0">►</button>'
    +'</div>'
    // Content
    +'<div style="flex:1;padding:0 16px 32px;display:flex;flex-direction:column;gap:10px">'
    // Nom
    +'<div style="background:var(--bg2);border-radius:10px;padding:12px">'
    +'<div style="font-size:.62rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">Nom du personnage</div>'
    +'<input id="char-create-name" class="opt-name-inp" type="text" maxlength="20" placeholder="'+hd.name+'" style="width:100%;box-sizing:border-box"/>'
    +'</div>'
    // Description
    +'<div style="background:var(--bg2);border-radius:10px;padding:12px">'
    +'<div style="font-size:.62rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">Descriptif</div>'
    +'<div style="font-size:.72rem;color:var(--text2);line-height:1.55">'+hd.desc+'</div>'
    +'</div>'
    // Sorts
    +'<div style="background:var(--bg2);border-radius:10px;padding:12px">'
    +'<div style="font-size:.62rem;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px">Sorts disponibles</div>'
    +spells
    +'</div>'
    // Créer
    +'<button class="btn btn-green btn-full" onclick="_confirmCreate()" style="padding:14px;font-size:.85rem;font-weight:700;letter-spacing:.06em">⚡ CRÉER LE PERSONNAGE</button>'
    +'</div>'
    +'</div>';
}

function _charPrev(){ _charCreateIdx=(_charCreateIdx-1+HEROES.length)%HEROES.length; renderCharCreate(); }
function _charNext(){ _charCreateIdx=(_charCreateIdx+1)%HEROES.length; renderCharCreate(); }
function _confirmCreate(){
  var inp=document.getElementById('char-create-name');
  var name=inp?inp.value.trim():'';
  createCharacter(_charCreateSlot, HEROES[_charCreateIdx].id, name||null);
  navigate('hero');
}

function showSel(){
  var el=document.getElementById('hcards');
  if(!el)return;
  el.innerHTML=HEROES.map(function(h){
    return '<div class="hcard" onclick="chooseHero(\''+h.id+'\')" style="cursor:pointer">'
      +'<img src="'+h.portrait+'" onerror="_imgErr(this)" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:8px" alt=""/>'
      +'<div style="font-family:var(--font-h);font-size:.85rem;font-weight:700;color:var(--cyan)">'+h.name+'</div>'
      +'<div style="font-size:.7rem;color:var(--text3);margin:2px 0 4px">'+h.arch+'</div>'
      +'<div style="font-size:.68rem;color:var(--text2);line-height:1.4">'+h.desc+'</div>'
      +'</div>';
  }).join('');
  document.getElementById('ov-sel').classList.remove('hidden');
}
function chooseHero(hid){META.heroId=hid;initActiveSp();saveMeta();document.getElementById('ov-sel').classList.add('hidden');navigate('hero');}

function onToggleSp(sid){
  toggleActiveSp(sid);
  if(PG==='inv')renderInv();
  if(PG==='hero')renderHero();
}

// ── CRAFT / RELIQUES ─────────────────────────────────────────────────────────

function closePopup() {
  var popup = document.getElementById('craft-popup');
  if (popup) popup.classList.add('hidden');
}
(function() {
  var popup = document.getElementById('craft-popup');
  if (popup) {
    popup.addEventListener('click', function(e) {
      if (e.target === popup) closePopup();
    });
  }
})();

function _setCraftItem(uid) {
  CRAFT.enhItem = uid; CRAFT.enhRels = [];
  if (typeof closePopup === 'function') closePopup();
  renderCraft();
}
function _toggleRelic(uid) { toggleCraftRelic(uid); }
function _forgeSl(sl)      { if (typeof forge === 'function') forge(sl); else setTimeout(renderCraft, 100); }

function renderCraft() {
  document.querySelectorAll('.craft-tab').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-tab') === CRAFT_TAB);
  });
  var enh = document.getElementById('craft-enhance');
  var rec = document.getElementById('craft-recipes');
  var rrl = document.getElementById('craft-reroll');
  if (enh) enh.classList.toggle('hidden', CRAFT_TAB !== 'enhance');
  if (rec) rec.classList.toggle('hidden', CRAFT_TAB !== 'forge');
  if (rrl) rrl.classList.toggle('hidden', CRAFT_TAB !== 'reroll');

  if (CRAFT_TAB === 'enhance') {
    var ceItem = document.getElementById('ce-item-slot');
    if (ceItem) {
      var it = CRAFT.enhItem ? byUid(CRAFT.enhItem) : null;
      if (it) {
        var src = (typeof getItemImg === 'function') ? getItemImg(it) : (it.img || '');
        ceItem.innerHTML = '<div onclick="_setCraftItem(null)" style="display:flex;align-items:center;gap:8px;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid var(--border2);border-radius:8px;padding:8px">'
          +(src?'<img src="'+src+'" style="width:36px;height:36px;object-fit:contain" onerror="_imgErr(this)" />'
               :'<span style="font-size:2rem">'+(it.icon||'📦')+'</span>')
          +'<div><div style="font-size:.78rem;font-weight:700">'+it.nm+'</div>'
          +'<div style="font-size:.6rem;color:var(--text3)">'+(typeof stStr==='function'?stStr(it.st):'')+'</div></div>'
          +'<span style="margin-left:auto;color:var(--text4);font-size:.75rem">✕</span></div>';
      } else {
        ceItem.innerHTML = '<div onclick="openCraftItemPicker()" style="display:flex;align-items:center;gap:8px;cursor:pointer;background:rgba(255,255,255,.04);border:2px dashed var(--border);border-radius:8px;padding:12px;color:var(--text4);font-size:.75rem">'
          +'<span style="font-size:1.5rem">📦</span> Choisir un équipement à améliorer</div>';
      }
    }
    var ceRel = document.getElementById('ce-rel-slot');
    if (ceRel) {
      var relics = META.inv.filter(function(x){ return x.type === 'relique'; });
      if (!relics.length) {
        ceRel.innerHTML = '<p style="font-size:.72rem;color:var(--text4)">Aucune relique disponible.</p>';
      } else {
        var d = document.createElement('div');
        d.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
        relics.forEach(function(r) {
          var btn = document.createElement('div');
          var sel = CRAFT.enhRels.indexOf(r.uid) !== -1;
          btn.onclick = function(){ _toggleRelic(r.uid); };
          btn.style.cssText = 'cursor:pointer;padding:4px 8px;border-radius:6px;font-size:.7rem;background:'+(sel?'rgba(0,212,255,.2)':'rgba(255,255,255,.05)')+';border:1px solid '+(sel?'var(--cyan)':'var(--border)');
          btn.textContent = r.nm || 'Relique';
          d.appendChild(btn);
        });
        ceRel.innerHTML = ''; ceRel.appendChild(d);
      }
    }
    var prev = document.getElementById('enhance-preview');
    if (prev) {
      if (CRAFT.enhItem && CRAFT.enhRels.length) {
        prev.textContent = '✔ Prêt (' + CRAFT.enhRels.length + ' relique' + (CRAFT.enhRels.length>1?'s':'') + ')';
        prev.style.color = 'var(--green)';
      } else {
        prev.textContent = 'Sélectionnez un équipement et une relique.';
        prev.style.color = 'var(--text4)';
      }
    }
    var btnE = document.getElementById('btn-enhance');
    if (btnE) btnE.disabled = !(CRAFT.enhItem && CRAFT.enhRels.length);
  } else if (CRAFT_TAB === 'reroll') {
    renderRerollTab();
  } else {
    var rl = document.getElementById('recipes-list');
    if (rl) {
      rl.innerHTML = '';
      var recipes = (typeof CRAFT_RECIPES !== 'undefined') ? CRAFT_RECIPES : [];
      if (!recipes.length) {
        rl.innerHTML = '<p style="font-size:.72rem;color:var(--text4);padding:12px;text-align:center">Aucune recette disponible.</p>';
      } else {
        recipes.forEach(function(recipe) {
          var def = (typeof STUFF_DEFS !== 'undefined') && STUFF_DEFS.find(function(d){ return d.id===recipe.resultId; });
          var canCraft = recipe.ingredients.every(function(ing) {
            return META.inv.filter(function(it){ return it.type==='spare'&&it.partId===ing.partId; }).length >= ing.qty;
          });
          var card = document.createElement('div');
          card.style.cssText = 'background:var(--bg1);border:1px solid '+(canCraft?'var(--green)':'var(--border)')+';border-radius:10px;padding:10px;margin-bottom:8px';
          // Header: image + nom
          var hdr = document.createElement('div');
          hdr.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
          if (def && def.img) {
            var img = document.createElement('img');
            img.src = def.img; img.style.cssText = 'width:36px;height:36px;object-fit:contain';
            img.onerror = function(){ this.style.display='none'; }; hdr.appendChild(img);
          }
          var nameEl = document.createElement('div');
          nameEl.innerHTML = '<div style="font-size:.8rem;font-weight:700">' + recipe.nm + '</div>'
            + (def ? '<div style="font-size:.6rem;color:var(--text3)">Lv.'+def.lrq+' · '+def.sl+'</div>' : '');
          hdr.appendChild(nameEl);
          card.appendChild(hdr);
          // Ingrédients
          recipe.ingredients.forEach(function(ing) {
            var have = META.inv.filter(function(it){ return it.type==='spare'&&it.partId===ing.partId; }).length;
            var ok = have >= ing.qty;
            var sp = (typeof SPARE_PARTS!=='undefined')&&SPARE_PARTS.find(function(s){return s.id===ing.partId;});
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:.68rem;padding:3px 0';
            row.innerHTML = '<span>'+(sp?sp.icon:'⚙️')+'</span>'
              +'<span style="flex:1">'+ing.partNm+'</span>'
              +'<span style="font-weight:700;color:'+(ok?'var(--green)':'var(--red)')+'">'+have+'/'+ing.qty+'</span>';
            card.appendChild(row);
          });
          // Bouton forge
          var btn = document.createElement('button');
          btn.className = 'btn'+(canCraft?' btn-green':'');
          btn.disabled = !canCraft;
          btn.style.cssText = 'width:100%;margin-top:8px;font-size:.72rem;padding:6px';
          btn.textContent = canCraft ? 'Forger' : 'Ingredients insuffisants';
          var _rid = recipe.id;
          btn.onclick = function() {
            var res = craftFromRecipe(_rid);
            if (res.ok && res.item) { renderCraft(); _lastCraftedRid = _rid; openItemDetail(res.item.uid); }
            else alert(res.msg);
          };
          card.appendChild(btn);
          rl.appendChild(card);
        });
      }
    }
  }
}

function openCraftItemPicker() {
  var items = META.inv.filter(function(x){ return x.type==='equip' && !isEquipped(x.uid); });
  var popup = document.getElementById('craft-popup');
  var list  = document.getElementById('popup-list');
  if (!popup || !list) return;
  popup.classList.remove('hidden');
  list.innerHTML = '';
  var d = document.createElement('div');
  d.style.cssText = 'display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto';
  items.forEach(function(it) {
    var src = (typeof getItemImg==='function') ? getItemImg(it) : (it.img||'');
    var row = document.createElement('div');
    row.onclick = function(){ _setCraftItem(it.uid); };
    row.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;padding:6px;border-radius:6px;background:rgba(255,255,255,.04)';
    row.innerHTML = (src?'<img src="'+src+'" style="width:28px;height:28px;object-fit:contain" onerror="_imgErr(this)" />'
                       :'<span style="font-size:1.4rem">'+(it.icon||'📦')+'</span>')
      +'<div><div style="font-size:.75rem;font-weight:700">'+it.nm+'</div>'
      +'<div style="font-size:.6rem;color:var(--text3)">'+(typeof stStr==='function'?stStr(it.st):'')+'</div></div>';
    d.appendChild(row);
  });
  list.appendChild(d);
}


// ================================================================
// REROLL
// ================================================================
var REROLL = { uid:null, locked:[], preview:null, original:null };

function renderRerollTab() {
  var slotEl    = document.getElementById('reroll-item-slot');
  var contentEl = document.getElementById('reroll-content');
  if (!slotEl || !contentEl) return;
  slotEl.innerHTML = '<div style="font-size:.65rem;color:var(--text4);padding:4px 8px;text-transform:uppercase;letter-spacing:.06em">Selectionner un equipement</div>';
  _renderRerollGrid(contentEl);
}

function _renderRerollGrid(contentEl) {
  var eligibles = META.inv.filter(function(it){ return it.type==='equip'; });
  if (!eligibles.length) {
    contentEl.innerHTML = '<p style="font-size:.75rem;color:var(--text4);padding:16px;text-align:center">Aucun equipement disponible.</p>';
    return;
  }
  var filterSlot = renderRerollTab._fs || 'all';
  var allSlots = ['arme','armure','casque','chaussures','implant'];
  var slotLabels = {arme:'Arme',armure:'Armure',casque:'Casque',chaussures:'Chaus.',implant:'Implant'};
  var rarColors = {'c':'#9ca3af','r':'#60a5fa','e':'#c084fc','p':'#4ade80','l':'#fbbf24'};
  var rarMap2 = {1:'c',2:'r',3:'e',4:'p',5:'l'};
  var filtered = filterSlot==='all' ? eligibles : eligibles.filter(function(it){ return it.sl===filterSlot; });

  contentEl.innerHTML = '';
  var fBar = document.createElement('div');
  fBar.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px';
  var allBtn = document.createElement('button');
  allBtn.className = 'flt-btn' + (filterSlot==='all'?' active':'');
  allBtn.textContent = 'Tout';
  allBtn.onclick = function(){ renderRerollTab._fs='all'; renderRerollTab(); };
  fBar.appendChild(allBtn);
  allSlots.forEach(function(sl){
    var b = document.createElement('button');
    b.className = 'flt-btn' + (filterSlot===sl?' active':'');
    b.textContent = slotLabels[sl]||sl;
    b.onclick = (function(s){ return function(){ renderRerollTab._fs=s; renderRerollTab(); }; })(sl);
    fBar.appendChild(b);
  });
  contentEl.appendChild(fBar);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px';
  filtered.forEach(function(it) {
    var imgSrc = (typeof getItemImg==='function') ? getItemImg(it) : (it.img||(it.id?'assets/items/'+it.id+'.png':''));
    var rk = (typeof it.rar==='string'&&rarColors[it.rar]) ? it.rar : (rarMap2[it.rar]||'c');
    var rc = rarColors[rk]||'#9ca3af';
    var cell = document.createElement('div');
    cell.style.cssText = 'position:relative;aspect-ratio:1;border-radius:9px;overflow:hidden;cursor:pointer;border:1.5px solid '+rc+'44;background:var(--bg1);transition:border-color .15s,transform .1s';
    cell.onmouseover = function(){ this.style.borderColor=rc; this.style.transform='scale(1.04)'; };
    cell.onmouseout  = function(){ this.style.borderColor=rc+'44'; this.style.transform='none'; };
    cell.onclick = (function(uid){ return function(){
      REROLL.uid=uid; REROLL.locked=[]; REROLL.preview=null;
      _showRerollPopup(byUid(uid));
    }; })(it.uid);
    if (imgSrc) {
      var img = document.createElement('img');
      img.src = imgSrc; img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
      img.onerror = function(){ this.style.display='none'; };
      cell.appendChild(img);
    }
    grid.appendChild(cell);
  });
  contentEl.appendChild(grid);
}

function _showRerollPopup(it) {
  if (!it) return;
  var ex = document.getElementById('reroll-popup-overlay'); if(ex) ex.remove();
  var def = (typeof STUFF_DEFS!=='undefined') && STUFF_DEFS.find(function(d){ return d.id===it.id; });
  var r = (typeof rarLookup==='function') ? rarLookup(it.rar) : {lbl:'Commun',color:'var(--text3)'};
  var slLbl = {arme:'Arme',armure:'Armure',casque:'Casque',chaussures:'Chaussures',implant:'Implant'}[it.sl]||it.sl;
  var imgSrc = (typeof getItemImg==='function') ? getItemImg(it) : (it.img||(it.id?'assets/items/'+it.id+'.png':''));
  var statLabels = {power:'Power',core:'Core',protocol:'Protocol',vit:'Vitalite',cc:'Crit',esq:'Esquive',respa:'RESpa',respm:'RESpm',esqPa:'RESpa',esqPm:'RESpm',init:'Initiative',thorn:'Renvoi',lifesteal:'Vol de vie',soin:'Soin',rgn:'Regen.',loot:'Loot',xp:'XP',credits:'Credits',resPlas:'RES Plasma',resNeon:'RES Neon',resGlitch:'RES Glitch',resSpell:'RES Sort',pm:'PM',pa:'PA',po:'PO'};

  var overlay = document.createElement('div');
  overlay.id = 'reroll-popup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:250;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.addEventListener('click', function(e){ if(e.target===overlay){ REROLL.uid=null; REROLL.preview=null; overlay.remove(); } });
  document.body.appendChild(overlay);

  var card = document.createElement('div');
  card.id = 'reroll-popup-card';
  card.style.cssText = 'background:var(--bg1);border:1px solid var(--border2);border-radius:14px;width:100%;max-width:320px;overflow:hidden;display:flex;flex-direction:column;max-height:92vh;box-shadow:0 8px 40px rgba(0,0,0,.8)';
  overlay.appendChild(card);

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 12px;background:linear-gradient(135deg,rgba(30,30,60,.9),rgba(10,10,30,.95));border-bottom:2px solid '+(r.color||'var(--border)');
  var nameDiv = document.createElement('div'); nameDiv.style.flex='1';
  nameDiv.innerHTML = '<div style="font-family:var(--font-h);font-size:.85rem;font-weight:900;color:'+(r.color||'var(--text)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.nm+'</div>'
    +'<div style="font-size:.62rem;color:var(--text3)">'+r.lbl+' - '+slLbl+(it.lrq>1?' - Lvl '+it.lrq:'')+'</div>';
  var closeBtn = document.createElement('button');
  closeBtn.style.cssText = 'background:transparent;border:none;color:var(--text4);font-size:1.2rem;cursor:pointer;flex-shrink:0;padding:0 4px';
  closeBtn.textContent = 'x';
  closeBtn.onclick = function(){ REROLL.uid=null; REROLL.preview=null; overlay.remove(); };
  hdr.appendChild(nameDiv); hdr.appendChild(closeBtn); card.appendChild(hdr);

  // Image
  var imgWrap = document.createElement('div');
  imgWrap.style.cssText = 'display:flex;justify-content:center;align-items:center;padding:12px 0;background:rgba(0,0,0,.3);min-height:90px';
  if (imgSrc) {
    var imgEl = document.createElement('img');
    imgEl.src = imgSrc;
    imgEl.style.cssText = 'max-height:80px;max-width:180px;object-fit:contain;filter:drop-shadow(0 0 12px '+(r.color||'#fff')+'66)';
    imgEl.onerror = function(){ this.style.display='none'; };
    imgWrap.appendChild(imgEl);
  }
  card.appendChild(imgWrap);

  // Stats body
  var body = document.createElement('div');
  body.className = 'ipop-body'; body.id = 'reroll-stats-list';
  card.appendChild(body);

  // Footer
  var footer = document.createElement('div');
  footer.style.cssText = 'display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--border);background:var(--bg);flex-shrink:0';
  card.appendChild(footer);

  function buildStats() {
    var hasPreview = !!REROLL.preview;
    body.innerHTML = '';
    Object.keys(it.st).forEach(function(key, idx) {
      var isLocked = REROLL.locked.indexOf(key) !== -1;
      var curVal   = it.st[key];
      var newVal   = hasPreview && REROLL.preview.newSt ? REROLL.preview.newSt[key] : null;
      var label    = statLabels[key] || key;
      function fmtV(v){ return typeof v==='number'&&Math.abs(v)<1&&v!==0?'+'+(v*100).toFixed(0)+'%':(v>=0?'+':'')+v; }

      var row = document.createElement('div');
      row.className = 'ipop-stat-row' + (idx%2===0?' ipop-stripe':'');
      row.style.cursor = 'pointer';

      var icoSpan = document.createElement('span');
      icoSpan.className = 'ipop-stat-ico'; icoSpan.textContent = '◆';
      row.appendChild(icoSpan);

      var lblSpan = document.createElement('span');
      lblSpan.className = 'ipop-stat-lbl'; lblSpan.textContent = label;
      if (def && def.stats) {
        var sd = def.stats.find(function(s){ return s.key===key; });
        if (sd) {
          var rng = document.createElement('span');
          rng.style.cssText = 'font-size:.55rem;color:var(--text4);margin-left:4px';
          rng.textContent = '('+fmtV(sd.min)+'->'+fmtV(sd.max)+')';
          lblSpan.appendChild(rng);
        }
      }
      row.appendChild(lblSpan);

      if (hasPreview && newVal !== null && !isLocked) {
        var oldV = document.createElement('span'); oldV.className='ipop-stat-val'; oldV.style.cssText='color:var(--text4);text-decoration:line-through;font-size:.6rem'; oldV.textContent=fmtV(curVal);
        var arr  = document.createElement('span'); arr.style.cssText='color:var(--text4);font-size:.6rem;margin:0 2px'; arr.textContent='->';
        var newV = document.createElement('span'); newV.className='ipop-stat-val'; newV.style.color='var(--cyan)'; newV.textContent=fmtV(newVal);
        row.appendChild(oldV); row.appendChild(arr); row.appendChild(newV);
      } else {
        var valSpan = document.createElement('span'); valSpan.className='ipop-stat-val'; valSpan.textContent=fmtV(curVal);
        row.appendChild(valSpan);
      }

      var lockIco = document.createElement('span');
      lockIco.style.cssText = 'margin-left:6px;font-size:1rem;cursor:pointer;flex-shrink:0;user-select:none';
      lockIco.textContent = isLocked ? '[L]' : '[_]';
      row.appendChild(lockIco);

      row.onclick = (function(k){ return function(){
        var i = REROLL.locked.indexOf(k);
        if (i===-1) REROLL.locked.push(k); else REROLL.locked.splice(i,1);
        buildStats(); buildFooter();
      }; })(key);
      body.appendChild(row);
    });
  }

  function buildFooter() {
    footer.innerHTML = '';
    var cost = (typeof calcRerollCost==='function') ? calcRerollCost(it, REROLL.locked) : 1;
    var canAfford = META.gems >= cost;
    var hasPreview = !!REROLL.preview;

    var btnRR = document.createElement('button');
    btnRR.className = 'btn' + (canAfford?' btn-green':'');
    btnRR.disabled = !canAfford;
    btnRR.style.cssText = 'flex:1.4;font-size:.72rem;display:flex;align-items:center;justify-content:center;gap:5px';
    var costLabel = document.createElement('span'); costLabel.style.cssText='font-size:.62rem;opacity:.8'; costLabel.textContent=cost+' gems';
    var rrLabel   = document.createElement('span'); rrLabel.textContent='Reroll';
    btnRR.appendChild(rrLabel); btnRR.appendChild(costLabel);
    btnRR.onclick = function(){
      if (META.gems < cost) return;
      if (!REROLL.original) REROLL.original = { st: JSON.parse(JSON.stringify(it.st)), roll: it.roll };
      META.gems -= cost;
      if(typeof updateTop==='function') updateTop();
      REROLL.preview = (typeof previewReroll==='function') ? previewReroll(it, REROLL.locked) : null;
      var c = document.getElementById('reroll-popup-card');
      if (c){ c.classList.add('reroll-glitch'); setTimeout(function(){ c.classList.remove('reroll-glitch'); },600); }
      setTimeout(function(){ buildStats(); buildFooter(); }, 200);
    };
    footer.appendChild(btnRR);

    if (hasPreview) {
      var btnOk = document.createElement('button');
      btnOk.className='btn btn-green'; btnOk.style.cssText='flex:1;font-size:.72rem';
      btnOk.textContent='Conserver';
      btnOk.onclick = function(){
        if(typeof applyReroll==='function') applyReroll(it.uid, REROLL.preview.newSt, REROLL.preview.newRoll);
        REROLL.original=null; REROLL.preview=null;
        overlay.remove();
      };
      footer.appendChild(btnOk);

      var btnRst = document.createElement('button');
      btnRst.className='btn'; btnRst.style.cssText='flex:1;font-size:.72rem;color:var(--red)';
      btnRst.textContent='Restaurer';
      btnRst.onclick = function(){
        if(REROLL.original){ it.st=REROLL.original.st; it.roll=REROLL.original.roll; if(typeof recompute==='function')recompute(); if(typeof saveMeta==='function')saveMeta(); }
        REROLL.original=null; REROLL.preview=null;
        buildStats(); buildFooter();
      };
      footer.appendChild(btnRst);
    }
  }

  buildStats();
  buildFooter();
}

function _claimMissionAnim(btn, i){
  var card=btn.closest?btn.closest('.mission-card'):btn.parentNode;
  _flashEl(card);
  setTimeout(function(){ claimMission(i); }, 450);
}
function renderMissions(){
  generateMissions();
  var el=document.getElementById('missions-list');if(!el)return;
  el.innerHTML=(META.missions||[]).map(function(m,i){
    if(m.claimed) return '';
    var pct=Math.round(Math.min(100,m.progress/m.target*100));
    return '<div class="mission-card">'
      +'<div class="mission-lbl">'+m.lbl+'</div>'
      +'<div class="bar-wrap" style="height:6px;margin:5px 0"><div class="bar-fill bar-xp" style="width:'+pct+'%"></div></div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-size:.7rem;color:var(--text3)">'+m.progress+' / '+m.target+'</span>'
      +'<span style="font-size:.7rem;color:var(--gold)">'+(m.rewardCr?'+'+fmt(m.rewardCr)+'₵ ':'')+( m.rewardGems?'+'+m.rewardGems+'💎':'')+'</span>'
      +'</div>'
      +(m.done?'<button class="btn btn-green btn-sm" onclick="_claimMissionAnim(this,'+i+')" style="margin-top:6px">Récupérer ▶</button>':'')
      +'</div>';
  }).join('');
}
function setNotif(id, on){
  var el=document.getElementById(id);
  if(el) el.classList.toggle('hidden', !on);
}
var _relicLPTimer=null;
function relicLongPressStart(uid){
  _relicLPTimer=setTimeout(function(){
    _relicLPTimer=null;
    var rel=byUid(uid);if(!rel)return;
    var relEntry=REL_TYPES.filter(function(x){return x.id===rel.subtype;})[0];
    var col=relEntry?relEntry.col:'#888';
    var popup=document.getElementById('craft-popup');
    var plist=popup&&popup.querySelector('#popup-list');
    if(!plist)return;
    plist.innerHTML='<div style="text-align:center;padding:10px">'
      +'<div style="font-size:2rem">'+(relEntry?relEntry.icon:'⚗️')+'</div>'
      +'<div style="color:'+col+';font-weight:700;font-size:.9rem;margin:6px 0">'+rel.nm+'</div>'
      +'<div class="'+RAR[rel.rar].cls+'" style="font-size:.8rem">'+RAR[rel.rar].lbl+'</div>'
      +'<div style="font-size:.8rem;color:var(--green);margin-top:6px">+'+Math.round((REL_BONUS[rel.rar]||0)*100)+'% du stat</div>'
      +'<div style="font-size:.72rem;color:var(--text3);margin-top:4px">Effet : '+(relEntry?relEntry.nm:'—')+'</div>'
      +'</div>';
    popup.querySelector('.popup-title').textContent='Détail relique';
    popup.classList.remove('hidden');
  }, 500);
}
function relicLongPressEnd(){
  if(_relicLPTimer){clearTimeout(_relicLPTimer);_relicLPTimer=null;}
}
// ================================================================
// SPELL TREE — Arbre de sorts (3 arbres par héros)
// ================================================================
var _stActiveTree = 'berserk';
var _stCurrentNode = null;

function renderSpellTree() {
  var el = document.getElementById('pg-spell-tree');
  if (!el) return;
  var heroId = META.heroId || 'berserker';
  var trees = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[heroId]) || [];
  var h = META.hero;

  // Trouver l'arbre actif
  var tree = trees.find(function(t){ return t.id === _stActiveTree; }) || trees[0];
  if (!tree) { el.innerHTML = '<p style="color:var(--text4);padding:20px">Aucun arbre disponible.</p>'; return; }

  // Onglets des 3 arbres
  var tabs = trees.map(function(t) {
    var active = t.id === tree.id;
    return '<button onclick="stSwitchTree(\''+t.id+'\')" style="flex:1;padding:8px 4px;border:none;border-bottom:2px solid '+(active?t.color:'transparent')+';background:transparent;color:'+(active?t.color:'var(--text3)')+';font-weight:'+(active?700:400)+';font-size:.78rem;cursor:pointer;font-family:var(--font-h)">'
      + t.icon + ' ' + t.name + '</button>';
  }).join('');

  // Grille de l'arbre
  // Layout : 5 colonnes (0–4) × N rows dynamiques
  // Col 0 = hybrides Neon, Col 4 = hybrides Protocol
  var COL_W = 64, ROW_H = 78, PAD = 8;
  var NCOLS = 5;
  var maxRow = tree.nodes.reduce(function(m,n){ return Math.max(m, n.row||0); }, 0);
  var svgW = COL_W * NCOLS + PAD * 2, svgH = ROW_H * (maxRow + 1) + PAD * 2;

  function ndColor(nd) {
    return tree.color;
  }

  // Construire les positions pixel + infos hybrides des nœuds
  var nodePos = {}; // id → {cx, cy, hybrid}
  var nodeById = {};
  tree.nodes.forEach(function(nd) {
    nodePos[nd.id] = {
      cx: PAD + nd.col * COL_W + COL_W/2,
      cy: PAD + nd.row * ROW_H + ROW_H/2
    };
    nodeById[nd.id] = nd;
  });

  // SVG des liens
  var svgLines = '<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none" viewBox="0 0 '+svgW+' '+svgH+'">';
  tree.links.forEach(function(lk) {
    var a = nodePos[lk[0]], b = nodePos[lk[1]];
    if (!a || !b) return;
    var unlocked = h.spTree[lk[0]] && h.spTree[lk[1]];
    var lColor = tree.color;
    var available = h.spTree[lk[0]];
    svgLines += '<line x1="'+a.cx+'" y1="'+a.cy+'" x2="'+b.cx+'" y2="'+b.cy+'"'
      + ' stroke="'+(unlocked?lColor:available?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.20)')+'"'
      + ' stroke-width="'+(unlocked?2:1)+'" stroke-dasharray="'+(unlocked?'none':'4 3')+'"/>';
  });
  svgLines += '</svg>';

  // Nœuds
  var nodes = tree.nodes.map(function(nd) {
    var pos = nodePos[nd.id];
    var unlocked = !!h.spTree[nd.id];
    var canUnlock = typeof canUnlockNode === 'function' ? canUnlockNode(nd.id) : false;
    var nColor = ndColor(nd);
    var sz = nd.passive ? 48 : 52;
    var x = pos.cx - sz/2, y = pos.cy - sz/2;

    var borderColor = unlocked ? nColor : canUnlock ? 'rgba('+hexToRgb(nColor)+',0.65)' : 'rgba('+hexToRgb(nColor)+',0.28)';
    var bg = unlocked ? 'rgba('+hexToRgb(nColor)+',0.18)' : canUnlock ? 'rgba(0,0,0,0.3)' : 'rgba('+hexToRgb(nColor)+',0.06)';
    var textColor = unlocked ? '#fff' : canUnlock ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)';

    var currentLevel = h.spTree[nd.id] || 0;
    var isEquipped = (h.equippedSpells||[]).indexOf(nd.id) !== -1;

    // Indicateur débloqué : point coloré sous le nœud
    var levelBadge = currentLevel > 0
      ? '<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:'+nColor+'"></div>'
      : '';

    // Badge équipé
    var equippedBadge = (isEquipped && !nd.passive)
      ? '<div style="position:absolute;top:-5px;right:-5px;background:'+nColor+';color:#000;font-size:.48rem;font-weight:900;border-radius:6px;padding:1px 4px">EQ</div>'
      : '';

    // Badge passif (point de couleur en bas)
    var passiveDot = nd.passive
      ? '<div style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:'+nColor+'"></div>'
      : levelBadge;

    var clickFn = 'stNodeClick(\''+nd.id+'\','+(canUnlock?'true':'false')+')';
    var lpStart  = 'stLpStart(event,\''+nd.id+'\')';
    var lpEnd    = 'stLpEnd()';

    return '<div onclick="'+clickFn+'" onmousedown="'+lpStart+'" onmouseup="'+lpEnd+'" onmouseleave="'+lpEnd+'" ontouchstart="'+lpStart+'" ontouchend="'+lpEnd+'" style="position:absolute;left:'+x+'px;top:'+y+'px;width:'+sz+'px;height:'+sz+'px;'
      + 'border:2px solid '+borderColor+';border-radius:'+(nd.passive?'8px':'50%')+';background:'+bg+';'
      + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      + 'cursor:pointer;transition:.2s;touch-action:none;'
      + (canUnlock||currentLevel>0?'box-shadow:0 0 8px '+borderColor+';':'')
      + '">'
      + equippedBadge + passiveDot
      + '<div style="font-size:'+(nd.passive?'.9rem':'1.1rem')+';line-height:1">'+nd.icon+'</div>'
      + '<div style="font-size:.42rem;color:'+textColor+';text-align:center;margin-top:2px;padding:0 3px;line-height:1.2;font-weight:'+(currentLevel>0?700:400)+'">'+stEscape(nd.name)+'</div>'
      + '</div>';
  }).join('');

  // ── Passifs Héros (2 slots standalone sans connexion) ─────────────
  var heroPassiveHtml = '';
  var _hHero = typeof getH === 'function' ? getH(heroId) : null;
  if (_hHero && _hHero.heroPassives) {
    var _hpCols = [0, 4];
    _hHero.heroPassives.forEach(function(hp, idx) {
      var _sz = 48;
      var _hpCol = _hpCols[idx] !== undefined ? _hpCols[idx] : idx * 4;
      var _x = PAD + _hpCol * COL_W + (COL_W - _sz) / 2;
      var _y = PAD + 0 * ROW_H + (ROW_H - _sz) / 2;
      heroPassiveHtml += '<div title="' + stEscape(hp.name) + ' — ' + stEscape(hp.desc) + '"'
        + ' style="position:absolute;left:' + _x + 'px;top:' + _y + 'px;width:' + _sz + 'px;height:' + _sz + 'px;'
        + 'border:2px solid rgba(245,158,11,0.7);border-radius:8px;background:rgba(245,158,11,0.1);'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'box-shadow:0 0 8px rgba(245,158,11,0.3);cursor:help">'
        + '<div style="font-size:.9rem;line-height:1">' + hp.icon + '</div>'
        + '<div style="font-size:.38rem;color:var(--gold);text-align:center;margin-top:2px;padding:0 2px;line-height:1.1;font-weight:600">' + stEscape(hp.name) + '</div>'
        + '</div>';
    });
  }

  var html = '<div style="display:flex;flex-direction:column;height:100%">'
    // Header avec back
    + '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px 6px;flex-shrink:0">'
    + '<button onclick="navigate(\'hero\')" style="background:transparent;border:none;color:var(--cyan);font-size:1rem;cursor:pointer;padding:0">←</button>'
    + '<div style="font-family:var(--font-h);font-weight:700;font-size:.85rem;color:'+tree.color+'">'+tree.icon+' '+tree.name.toUpperCase()+'</div>'
    + '<div style="margin-left:auto;font-size:.68rem;color:var(--text3)"><b style="color:var(--cyan)">'+h.spPts+'</b> pt'+(h.spPts!==1?'s':'')+' dispo</div>'
    + '<button onclick="resetSpellTree&&resetSpellTree()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text4);font-size:.6rem;padding:3px 7px;cursor:pointer">↺</button>'
    + '</div>'
    // Onglets
    + '<div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">'+tabs+'</div>'
    // Description arbre
    + '<div style="font-size:.62rem;color:var(--text3);padding:6px 12px;flex-shrink:0">'+stEscape(tree.desc)+'</div>'
    // Grille
    + '<div data-scroll="tree" style="flex:1;overflow-y:auto;padding:0 12px 12px" data-scroll="tree">'
    + '<div style="position:relative;width:'+svgW+'px;height:'+svgH+'px;margin:0 auto">'
    + svgLines + heroPassiveHtml + nodes
    + '</div>'
    // Tooltip panel
    + '</div>'
    // Bottom: node detail panel (static, changes when you tap a node)
    + '<div id="st-detail-panel" style="border-top:1px solid var(--border);padding:8px 12px;min-height:70px;flex-shrink:0;background:var(--bg1)"></div>'
    + '</div>';

  // Sauvegarde scroll avant rebuild
  var _scrollEl = el.querySelector('[data-scroll="tree"]');
  var _savedScroll = _scrollEl ? _scrollEl.scrollTop : 0;
  el.innerHTML = html;
  // Rebuild le panel immédiatement (évite tout décalage d'état asynchrone)
  if (_stCurrentNode) stNodeClick(_stCurrentNode, false);
  // Restaure le scroll après layout
  setTimeout(function(){
    var _se = el.querySelector('[data-scroll="tree"]');
    if (_se) _se.scrollTop = _savedScroll;
  }, 0);
}

function stSwitchTree(treeId) {
  _stActiveTree = treeId;
  renderSpellTree();
}

// unlockTreeNode est déjà global (défini dans engine.js)
// On ajoute juste le refresh UI après unlock
function stToggleEquip(nid){ if(typeof toggleEquipSpell==='function'){toggleEquipSpell(nid);} renderSpellTree(); renderHero(); }
function stLevelUp(nid){ if(typeof levelUpNode==='function'){levelUpNode(nid);} renderHero && renderHero(); var m=document.getElementById('st-modal'); if(m) m.remove(); }

function stUnlock(id) {
  if (typeof unlockTreeNode === 'function') {
    unlockTreeNode(id);  // engine calls renderSpellTree internally
  }
  renderHero();
}

function stEscape(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function hexToRgb(hex) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return r+','+g+','+b;
}

// ── NODE CLICK : affiche le détail + débloque si possible ────────
function stNodeClick(nodeId, doUnlock) {
  _stCurrentNode = nodeId;
  var heroId = META.heroId || 'berserker';
  var trees  = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[heroId]) || [];
  var nd = null, tree = null;
  trees.forEach(function(t){ t.nodes.forEach(function(n){ if(n.id===nodeId){nd=n;tree=t;} }); });
  if (!nd) return;

  var h            = META.hero;
  var currentLevel = (h.spTree && h.spTree[nodeId]) || 0;
  var isEquipped   = (h.equippedSpells||[]).indexOf(nodeId) !== -1;
  var canUnlock    = typeof canUnlockNode === 'function' ? canUnlockNode(nodeId) : false;
  var canLevelUp   = typeof canLevelUpNode === 'function' ? canLevelUpNode(nodeId) : false;
  var nextCost     = 1;
  var stats = typeof getNodeStats === 'function' ? getNodeStats(nd, currentLevel||1) : {};

  var panel = document.getElementById('st-detail-panel');
  if (panel) {
    var statsLine = '';
    if (!nd.passive) {
      var parts = [];
      var _pa = stats.pa || nd.pa;
      var _range = stats.range !== undefined ? stats.range : nd.range;
      if (_pa) parts.push(_pa + ' PA');
      if (_range !== undefined) parts.push('PO ' + (nd.minRange||0) + '–' + _range);
      if (stats.dmgMin || stats.dmgMax) parts.push(stats.dmgMin + '–' + stats.dmgMax + ' DMG');
      if (nd.dur) parts.push(nd.dur + ' tours');
      if (parts.length) statsLine = '<div style="color:var(--text3);font-size:.58rem;margin:2px 0">'+parts.join(' · ')+'</div>';
    }
    panel.innerHTML = '<div style="display:flex;align-items:flex-start;gap:8px">'
      + '<div style="font-size:1.3rem;line-height:1;flex-shrink:0">'+nd.icon+'</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-weight:700;font-size:.7rem;color:'+(currentLevel>0?tree.color:'var(--text)')+'">'+stEscape(nd.name)
      + (nd.passive ? '<span style="font-size:.58rem;color:var(--green);margin-left:4px">PASSIF</span>' : '')
      + (currentLevel>0 ? '<span style="font-size:.58rem;color:'+tree.color+';margin-left:4px">✓</span>' : '')
      + '</div>'
      + statsLine
      + '<div style="font-size:.6rem;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+stEscape(nd.desc)+'</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:row;gap:4px;flex-shrink:0;align-items:center">'
      + (canUnlock
        ? '<button onclick="stUnlock(\'' + nodeId + '\')" style="background:'+tree.color+';color:#000;border:none;border-radius:6px;padding:4px 8px;font-size:.6rem;font-weight:700;cursor:pointer;white-space:nowrap">Débl. (1pt)</button>'
        : (currentLevel >= 1 && !(nd.maxLv && currentLevel >= nd.maxLv)
          ? '<button onclick="_stFlashLevelUp(\'' + nodeId + '\')" style="background:'+(canLevelUp?tree.color:'var(--bg3)')+';color:'+(canLevelUp?'#000':'var(--text4)')+';border:none;border-radius:6px;padding:4px 8px;font-size:.6rem;font-weight:700;cursor:'+(canLevelUp?'pointer':'default')+';white-space:nowrap">Améliorer ('+(1+currentLevel)+'pt)</button>'
          : (currentLevel === 0
            ? '<div style="font-size:.55rem;color:var(--text4);text-align:center;padding:4px">'+(h.spPts<1?'pts insuf.':'prérequis')+'</div>'
            : '')))
      + (!nd.passive && currentLevel>0
        ? '<button onclick="stToggleEquip(' + "'" + nodeId + "'" + ')" style="border:1px solid '+tree.color+';background:transparent;color:'+tree.color+';border-radius:6px;padding:4px 8px;font-size:.6rem;font-weight:700;cursor:pointer">'
          +(isEquipped?'⊛ Déséq.':'⊕ Équiper')+'</button>'
        : '')
      + '</div>'
      + '</div>';
  }

  if (doUnlock && canUnlock && typeof stUnlock === 'function') stUnlock(nodeId);
}

function _stFlashLevelUp(nid){
  stLevelUp(nid);
  var panel=document.getElementById('st-detail-panel');
  if(panel){
    panel.classList.remove('st-levelup-flash');
    void panel.offsetWidth;
    panel.classList.add('st-levelup-flash');
    setTimeout(function(){ var p=document.getElementById('st-detail-panel'); if(p) p.classList.remove('st-levelup-flash'); }, 750);
  }
}
function _stFlashLevelUpModal(nid){
  var modal=document.getElementById('st-modal');
  if(modal){
    var card=modal.children[0];
    if(card) _flashEl(card);
    setTimeout(function(){
      stLevelUp(nid);        // level up + rebuild tree (supprime le modal)
      stShowSpellModal(nid); // rouvre le modal avec le niveau mis à jour
    }, 250);
  } else {
    stLevelUp(nid);
  }
}

// ── LONG PRESS (500ms) → modal fiche technique ────────────────────
var _stLpTimer = null;
function stLpStart(e, nodeId) {
  e.preventDefault && e.preventDefault();
  _stLpTimer = setTimeout(function() {
    _stLpTimer = null;
    stShowSpellModal(nodeId);
  }, 500);
}
function stLpEnd() {
  if (_stLpTimer) { clearTimeout(_stLpTimer); _stLpTimer = null; }
}

// ── MODAL FICHE TECHNIQUE COMPLÈTE ───────────────────────────────
var _stModalNodeId   = null;
var _stModalPreviewLv = 1;

var _ST_DMG_COLORS = {Plasma:'#ef4444', Neon:'#22d3ee', Glitch:'#a855f7', Negate:'#93f759'};

function _stModalBuildStats(nd, tree, lv) {
  var s = (nd.lvStats && nd.lvStats[lv - 1]) || {};
  var dmgColor = _ST_DMG_COLORS[nd.dmgType] || tree.color;

  function row(lbl, val, color) {
    if (val === null || val === undefined || val === '') return '';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">'
      + '<span style="color:var(--text3);font-size:.62rem">'+lbl+'</span>'
      + '<span style="font-weight:700;font-size:.64rem;color:'+(color||'#fff')+'">'+val+'</span>'
      + '</div>';
  }

  var html = '';
  if (!nd.passive) {
    var pa     = s.pa      !== undefined ? s.pa      : nd.pa;
    var range  = s.range   !== undefined ? s.range   : nd.range;
    var dmgMin = s.dmgMin  !== undefined ? s.dmgMin  : nd.dmgMin || 0;
    var dmgMax = s.dmgMax  !== undefined ? s.dmgMax  : nd.dmgMax || 0;
    if (dmgMin > 0 || dmgMax > 0) html += row('Dégâts', dmgMin+'–'+dmgMax, dmgColor);
    if (pa)                        html += row('Coût PA', pa+' PA');
    if (range !== undefined)       html += row('Portée', (nd.minRange||0)+'–'+range+' cases');
    if (nd.dur)                    html += row('Durée', nd.dur+' tour'+(nd.dur>1?'s':''));
    if (nd.hits > 1)               html += row('Frappes', nd.hits+'×');
    if (s.lifesteal !== undefined)  html += row('Lifesteal', Math.round(s.lifesteal*100)+'%', dmgColor);
    else if (nd.lifesteal)          html += row('Lifesteal', Math.round(nd.lifesteal*100)+'%', dmgColor);
  } else {
    var b = (s.bonus !== undefined) ? s.bonus : nd.bonus;
    if (b) {
      if (b.power)     html += row('Power',    '+'+b.power,                        '#ef4444');
      if (b.core)      html += row('Core',     '+'+b.core,                         '#22d3ee');
      if (b.protocol)  html += row('Protocol', '+'+b.protocol,                     '#a855f7');
      if (b.loot)      html += row('Loot',     '+'+(b.loot*100).toFixed(0)+'%',   '#f97316');
      if (b.dodge)     html += row('Esquive',  '+'+(b.dodge*100).toFixed(0)+'%');
      if (b.rgn)       html += row('Regen',    '+'+b.rgn+'/s');
      if (b.passBonus) html += row('Bonus ATQ/kill', '+'+b.passBonus);
    }
  }

  // Séparateur attributs
  html += '<div style="margin:7px 0 3px;font-size:.52rem;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,0.18)">ATTRIBUTS</div>';

  function boolRow(lbl, val, yesColor) {
    return row(lbl, val ? 'Oui' : 'Non', val ? (yesColor||'var(--green)') : 'var(--text4)');
  }

  var isLinear = !!(nd.linear || nd.aoe==='line' || (nd.aoe&&nd.aoe.indexOf('ligne')===0));
  var hasAoe   = !!(nd.aoe && nd.aoe !== 'single');
  var cd       = s.cdMax !== undefined ? s.cdMax : (nd.cdMax || nd.cd || 0);
  var delay    = nd.delay || 0;

  html += boolRow('Passif',       !!nd.passive,      'var(--gold)');
  if (!nd.passive) {
    html += boolRow('Linéaire',     isLinear);
    html += boolRow('Ligne de vue', nd.los !== false,  'var(--text2)');
    html += boolRow('Case vide',    !!nd.emptyCell);
    if (hasAoe) {
      html += row('Effet de zone', 'Oui · '+nd.aoe, 'var(--gold)');
    } else {
      html += row('Effet de zone', 'Non', 'var(--text4)');
    }
    html += row('Délai',          delay > 0 ? delay+' tour'+(delay>1?'s':'') : '—');
    html += row('Limite / tour',  cd > 0 ? 'CD '+cd+' tours' : 'Illimité');
  }

  return html;
}

function _stModalSetLv(lv) {
  _stModalPreviewLv = lv;
  if (!_stModalNodeId) return;
  var heroId = META.heroId || 'berserker';
  var trees  = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[heroId]) || [];
  var nd = null, tree = null;
  trees.forEach(function(t){ t.nodes.forEach(function(n){ if(n.id===_stModalNodeId){nd=n;tree=t;} }); });
  if (!nd) return;
  var statsEl = document.getElementById('st-modal-stats');
  if (statsEl) statsEl.innerHTML = _stModalBuildStats(nd, tree, lv);
  var maxLv = nd.maxLv || (typeof CFG!=='undefined'&&CFG.SP_MAX_LV) || 5;
  for (var i = 1; i <= maxLv; i++) {
    var btn = document.getElementById('st-mlv-'+i);
    if (!btn) continue;
    var active = (i === lv);
    btn.style.background    = active ? 'rgba('+hexToRgb(tree.color)+',.25)' : 'transparent';
    btn.style.borderColor   = active ? tree.color : 'rgba(255,255,255,0.12)';
    btn.style.color         = active ? tree.color : 'var(--text4)';
    btn.style.fontWeight    = active ? '700' : '400';
  }
}

function stShowSpellModal(nodeId) {
  var heroId = META.heroId || 'berserker';
  var trees  = (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[heroId]) || [];
  var nd = null, tree = null;
  trees.forEach(function(t){ t.nodes.forEach(function(n){ if(n.id===nodeId){nd=n;tree=t;} }); });
  if (!nd) return;

  _stModalNodeId    = nodeId;
  _stModalPreviewLv = 1;

  var h          = META.hero;
  var curLv      = h.spTree[nodeId] || 0;
  var isEquipped = (h.equippedSpells||[]).indexOf(nodeId) !== -1;
  var canUnlock  = typeof canUnlockNode === 'function' ? canUnlockNode(nodeId) : false;
  var canLevelUp = typeof canLevelUpNode === 'function' ? canLevelUpNode(nodeId) : false;
  var canEquip   = curLv > 0 && !nd.passive;
  var maxLv      = nd.maxLv || (typeof CFG!=='undefined'&&CFG.SP_MAX_LV) || 5;

  // ── Level pills ───────────────────────────────────────────────
  var lvHtml = '<div style="display:flex;gap:5px;margin:10px 0 6px">';
  for (var lv = 1; lv <= maxLv; lv++) {
    var isPreview = (lv === 1);
    var hasLv = (lv <= curLv);
    lvHtml += '<button id="st-mlv-'+lv+'" onclick="_stModalSetLv('+lv+')" style="'
      + 'flex:1;padding:5px 2px;border-radius:6px;cursor:pointer;font-size:.58rem;transition:.15s;'
      + 'border:1px solid '+(isPreview?tree.color:'rgba(255,255,255,0.12)')+';'
      + 'background:'+(isPreview?'rgba('+hexToRgb(tree.color)+',.25)':'transparent')+';'
      + 'color:'+(isPreview?tree.color:'var(--text4)')+';'
      + 'font-weight:'+(isPreview?700:400)+'">'
      + 'Nv.'+lv + (hasLv ? ' <span style="color:var(--green);font-size:.5rem">✓</span>' : '')
      + '</button>';
  }
  lvHtml += '</div>';

  // ── Initial stats (level 1) ───────────────────────────────────
  var initStats = _stModalBuildStats(nd, tree, 1);

  // ── Modal HTML ────────────────────────────────────────────────
  var modal = document.createElement('div');
  modal.id = 'st-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
  modal.onclick = function(e){ if(e.target===modal) modal.remove(); };

  modal.innerHTML = '<div style="background:var(--bg1);border:1px solid '+tree.color+';border-radius:16px;width:100%;max-width:320px;overflow:hidden">'

    // ── Header ─────────────────────────────────────────────────
    + '<div style="background:rgba('+hexToRgb(tree.color)+',.15);padding:12px 14px;display:flex;align-items:center;gap:10px">'
    + '<div style="font-size:2rem;line-height:1">'+nd.icon+'</div>'
    + '<div style="flex:1">'
    + '<div style="font-family:var(--font-h);font-size:.92rem;font-weight:900;color:'+tree.color+'">'+stEscape(nd.name)+'</div>'
    + (nd.passive?'<div style="font-size:.58rem;color:var(--green);margin-top:1px">PASSIF</div>':'')
    + '</div>'
    + '<button onclick="document.getElementById(\'st-modal\').remove()" style="background:transparent;border:none;color:var(--text4);font-size:1.2rem;cursor:pointer;padding:4px;line-height:1">✕</button>'
    + '</div>'

    // ── Body ───────────────────────────────────────────────────
    + '<div style="padding:10px 14px">'

    // Level pills
    + lvHtml

    // Stats section (id for live update)
    + '<div id="st-modal-stats">'
    + initStats
    + '</div>'

    // Description
    + '<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:8px 10px;margin-top:10px;font-size:.78rem;color:var(--text2);font-style:italic;line-height:1.5">'
    + stEscape(nd.desc)
    + '</div>'
    + '</div>'

    // ── Footer actions ─────────────────────────────────────────
    + '<div style="padding:10px 14px;display:flex;gap:8px;border-top:1px solid var(--border)">'
    + (canUnlock
        ? '<button onclick="stUnlock(\''+nodeId+'\');document.getElementById(\'st-modal\').remove()" style="flex:1;background:'+tree.color+';color:#000;border:none;border-radius:8px;padding:8px;font-weight:700;font-size:.8rem;cursor:pointer">Débloquer (1 pt)</button>'
        : (curLv >= 1 && !(nd.maxLv && curLv >= nd.maxLv)
            ? '<button onclick="_stFlashLevelUpModal(\''+nodeId+'\')" style="flex:1;background:'+(canLevelUp?tree.color:'var(--bg3)')+';color:'+(canLevelUp?'#000':'var(--text4)')+';border:none;border-radius:8px;padding:8px;font-weight:700;font-size:.8rem;cursor:'+(canLevelUp?'pointer':'default')+'">Améliorer ('+(1+curLv)+' pt)</button>'
            : (curLv === 0
                ? '<div style="flex:1;text-align:center;font-size:.62rem;color:var(--text4);padding:8px">'+h.spPts+' pt'+(h.spPts!==1?'s':'')+' dispo</div>'
                : '')))
    + (canEquip
        ? '<button onclick="stToggleEquip(\''+nodeId+'\');document.getElementById(\'st-modal\').remove()" style="flex:1;border:1px solid '+tree.color+';background:transparent;color:'+tree.color+';border-radius:8px;padding:8px;font-weight:700;font-size:.8rem;cursor:pointer">'
          + (isEquipped ? '⊖ Déséquiper' : '⊕ Équiper')
          + '</button>'
        : '')
    + '</div>'

    + '</div>';

  var old = document.getElementById('st-modal');
  if (old) old.remove();
  document.body.appendChild(modal);
}

// ── CLIC BOUTIQUE → fiche équipement ─────────────────────────
function boutPreview(defId) {
  var def = (typeof STUFF_DEFS!=='undefined') && STUFF_DEFS.find(function(d){return d.id===defId;});
  if (!def) return;
  // Item virtuel — jamais ajouté à META.inv
  var preview = {uid:'__preview__',id:defId,roll:1.0,st:{},arme:def.arme||null,
    sl:def.sl,nm:def.nm,icon:def.icon,rar:def.rar,lrq:def.lrq,
    type:'equip',perm:false,relicCount:0};
  // Preview: garder min et max pour affichage de la plage, pas de roll
  preview._isPreview = true;
  (def.stats||[]).forEach(function(s){ preview.st[s.key] = null; }); // null = "plage"
  openItemDetail('__preview__', preview);
}


// ── HERO STAT TOOLTIP (data-tip) ────────────────────────────────
(function(){
  var _tip = null;
  document.addEventListener('click', function(e) {
    var btn = e.target.closest ? e.target.closest('.hero-tip-btn') : null;
    if (btn) {
      e.stopPropagation();
      if (_tip) { _tip.remove(); _tip = null; }
      _tip = document.createElement('div');
      _tip.style.cssText = 'position:fixed;z-index:300;background:var(--bg2,#1a1f2e);border:1px solid var(--border,#374151);border-radius:8px;padding:6px 10px;font-size:.65rem;color:var(--text2,#d1d5db);max-width:220px;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,.5)';
      _tip.textContent = btn.getAttribute('data-tip') || '';
      document.body.appendChild(_tip);
      var r = btn.getBoundingClientRect();
      _tip.style.left = Math.min(r.left, window.innerWidth - 230) + 'px';
      _tip.style.top  = (r.bottom + 6) + 'px';
      return;
    }
    if (_tip) { _tip.remove(); _tip = null; }
  });
})();
function _itabE(){ ipopTab('effets'); }
function _itabC(){ ipopTab('conditions'); }

function ipopShowCraft(uid, itemId) {
  var recipe = (typeof CRAFT_RECIPES !== 'undefined')
    && CRAFT_RECIPES.find(function(r){ return r.resultId === itemId; });
  // Créer un overlay flottant pour la recette (visible partout, pas seulement sur pg-craft)
  var existingOverlay = document.getElementById('recipe-overlay');
  if (existingOverlay) existingOverlay.remove();
  var overlay = document.createElement('div');
  overlay.id = 'recipe-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:18px;max-width:300px;width:100%';
  overlay.appendChild(box);

  if (!recipe) {
    box.innerHTML = '<div style="font-size:.85rem;font-weight:700;margin-bottom:10px">Recette de forge</div>'
      + '<p style="font-size:.75rem;color:var(--text4)">Aucune recette disponible pour cet item.</p>'
      + '<button class="btn btn-sm" onclick="var o=document.getElementById(\'recipe-overlay\');if(o)o.remove()" style="width:100%;margin-top:10px">Fermer</button>';
    return;
  }
  // Build ingredients list via DOM
  var wrap = document.createElement('div');
  wrap.style.padding = '10px';
  var title = document.createElement('div');
  title.style.cssText = 'font-size:.65rem;color:var(--text4);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em';
  title.textContent = 'Ingredients requis';
  wrap.appendChild(title);
  recipe.ingredients.forEach(function(ing) {
    var have = META.inv.filter(function(it){ return it.type==='spare' && it.partId===ing.partId; }).length;
    var ok = have >= ing.qty;
    var sp = (typeof SPARE_PARTS !== 'undefined') && SPARE_PARTS.find(function(s){ return s.id===ing.partId; });
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)';
    row.innerHTML = '<span style="font-size:1.2rem">' + (sp ? sp.icon : '?') + '</span>'
      + '<span style="font-size:.75rem;flex:1">' + ing.partNm + '</span>'
      + '<span style="font-size:.75rem;font-weight:700;color:' + (ok ? 'var(--green)' : 'var(--red)') + '">' + have + ' / ' + ing.qty + '</span>';
    wrap.appendChild(row);
  });
  var canCraft = recipe.ingredients.every(function(ing) {
    return META.inv.filter(function(it){ return it.type==='spare' && it.partId===ing.partId; }).length >= ing.qty;
  });
  var btn = document.createElement('button');
  btn.className = 'btn' + (canCraft ? ' btn-green' : '');
  btn.disabled = !canCraft;
  btn.style.cssText = 'width:100%;margin-top:10px;font-size:.75rem';
  btn.textContent = canCraft ? 'Forger' : 'Ingredients insuffisants';
  var _rid = recipe.id;
  btn.onclick = function() {
    var r = craftFromRecipe(_rid);
    closePopup();
    if (r.ok && r.item) { _lastCraftedRid = _rid; openItemDetail(r.item.uid); }
  };
  wrap.appendChild(btn);
  // Titre
  var titleMain = document.createElement('div');
  titleMain.style.cssText = 'font-size:.85rem;font-weight:700;margin-bottom:10px';
  titleMain.textContent = 'Recette : ' + recipe.nm;
  box.appendChild(titleMain);
  box.appendChild(wrap);
  var closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-sm';
  closeBtn.style.cssText = 'width:100%;margin-top:8px';
  closeBtn.textContent = 'Fermer';
  closeBtn.onclick = function(){ overlay.remove(); };
  box.appendChild(closeBtn);
}


