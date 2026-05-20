// ================================================================
// engine.js v11 — Logique de jeu pure (zéro DOM)
// ================================================================

var META = fixMeta(loadMeta()) || mkMeta();
var P    = {atk:0,aspd:1,dps:0,mHp:0,mSh:0,rgn:0,mult:1,crit:0,dodge:0,pros:100,dmgRed:0,spPwrBonus:0,
             power:0,core:0,protocol:0,pa:4,pm:1,po:1,init:100,cc:0.01,esq:0.01,respa:0,respm:0,
             vitality:0,heal:1,regen:0,loot:0,xpBonus:0,credits:0,invoc:1,labAtq:{}};
var CRAFT= {enhItem:null, enhRels:[], mode:null, tab:'enhance'};
var PRE  = {atk:0,hp:0,sh:0,aspd:0}; // stats globales hors améliorations (pour affichage renderUpg)
var UID  = Date.now();

// ── META ─────────────────────────────────────────────────────────
function mkMeta(){
  return{gems:0,heroId:null,bought:[],cr:0,activeSp:[],boutSeed:Date.now(),hbCamFollow:false,
    hero:{lv:1,xp:0,skPts:0,spPts:0,passBonus:0,name:null,
      st:{power:0,core:0,protocol:0},
      spLvPwr:{},spLvCd:{},spTree:{},power:0,core:0,protocol:0,equippedSpells:[]},
    upgLv:{},labQueue:{},inv:[],missions:[],
    eq:{arme:null,armure:null,casque:null,chaussures:null,implant1:null,implant2:null},
    slots:[null,null,null,null],activeSlot:0};
}

function fixMeta(m){
  if(!m)return null;
  if(!m.hero)m.hero=mkMeta().hero;
  // Migration ancien système → Power/Core/Protocol
  if(!m.hero.st || m.hero.st.force !== undefined) {
    var _oldPts = m.hero.st ? Object.keys(m.hero.st).reduce(function(a,k){ return a+(m.hero.st[k]||0); },0) : 0;
    m.hero.skPts = (m.hero.skPts||0) + _oldPts;
    m.hero.st = {power:0,core:0,protocol:0};
  }
  if(!m.hero.spLvPwr)m.hero.spLvPwr={};
  if(!m.hero.spLvCd)m.hero.spLvCd={};
  if(!m.hero.spTree)m.hero.spTree={};
  if(!m.hero.power)m.hero.power=0;
  if(!m.hero.core)m.hero.core=0;
  if(!m.hero.protocol)m.hero.protocol=0;
  if(!m.hero.equippedSpells)m.hero.equippedSpells=[];
  if(!m.labQueue)m.labQueue={};
  if(m.hero.passBonus===undefined)m.hero.passBonus=0;
  if(m.hero.name===undefined)m.hero.name=null;
  if(!m.upgLv)m.upgLv={};
  if(!m.inv)m.inv=[];
  // Migration : vider les items au vieux format (stats atk/aspd/dpct)
  m.inv = m.inv.filter(function(it){
    if(!it) return false;
    // Conserver les spare parts et reliques même sans .st
    if(it.type==='spare' || it.type==='relique') return true;
    if(!it.st) return false;
    var oldKeys=['atk','aspd','dpct','hp','sh','rgn','crit','dodge','pros','spPwrBonus'];
    return !oldKeys.some(function(k){return it.st[k]!==undefined;});
  });
  // Arrondir les stats entières + nettoyer les équipements legacy
  var _legacyKeys=['atk','aspd','dpct','hp','sh','rgn','crit','dodge','pros','spPwrBonus'];
  function _isLegacy(it){ return it&&it.st&&_legacyKeys.some(function(k){return it.st[k]!==undefined;}); }

  // Nettoyer META.inv
  m.inv = m.inv.filter(function(it){ return !_isLegacy(it); });

  // Nettoyer les slots équipés
  if(m.eq){
    Object.keys(m.eq).forEach(function(sl){
      var uid=m.eq[sl];if(!uid)return;
      var it=(m.inv||[]).find(function(x){return x.uid===uid;});
      if(!it||_isLegacy(it)) m.eq[sl]=null;
    });
  }

  // Arrondir les décimales sur les items restants
  m.inv.forEach(function(it){
    if(!it||!it.st)return;
    Object.keys(it.st).forEach(function(k){
      var v=it.st[k];
      if(typeof v==='number' && v>=1 && v!==Math.round(v)) it.st[k]=Math.round(v);
    });
  });
  if(m.boutSeed===undefined)m.boutSeed=Date.now();
  if(!('hbCamFollow' in m))m.hbCamFollow=false;
  // Migration eq: armure → skin
  if(!m.eq)m.eq={arme:null,armure:null,casque:null,chaussures:null,implant1:null,implant2:null};
  // Migration: ancien slot 'skin' → 'armure'
  if(m.eq.skin!==undefined){m.eq.armure=m.eq.armure||m.eq.skin;delete m.eq.skin;}
  if(!m.eq.casque)m.eq.casque=null;
  if(!m.eq.armure)m.eq.armure=null;
  if(m.eq.implant!==undefined){m.eq.implant1=m.eq.implant;delete m.eq.implant;}
  if(m.eq.implant2===undefined)m.eq.implant2=null;
  if(m.eq.chaussures===undefined)m.eq.chaussures=null;
  if(!m.bought)m.bought=[];
  if(m.cr===undefined)m.cr=0;
  if(m.gems===undefined)m.gems=0;
  if(!m.activeSp)m.activeSp=[];
  // Migration items: armure → skin dans l'inventaire
  // Migration: on garde sl='armure' pour les armures (plus de conversion vers skin)
  // ── Multi-slot migration ──────────────────────────────────────
  if(!m.slots){m.slots=[null,null,null,null];}
  while(m.slots.length<4)m.slots.push(null);
  if(m.activeSlot===undefined)m.activeSlot=0;
  if(m.activeSlot<0||m.activeSlot>=m.slots.length)m.activeSlot=0;
  // Migrate legacy single-hero save → slot 0
  if(m.heroId&&!m.slots[0])m.slots[0]={heroId:m.heroId,hero:m.hero,eq:m.eq,activeSp:m.activeSp||[]};
  // If activeSlot is empty, find first filled slot
  if(!m.slots[m.activeSlot]){for(var _si=0;_si<m.slots.length;_si++){if(m.slots[_si]){m.activeSlot=_si;break;}}}
  // Restore active slot aliases
  if(m.slots[m.activeSlot]){var _as=m.slots[m.activeSlot];m.heroId=_as.heroId;m.hero=_as.hero;m.eq=_as.eq;if(_as.activeSp)m.activeSp=_as.activeSp;}
  return m;
}
function saveMeta(){
  // Sync active slot before saving
  if(META.slots[META.activeSlot]){META.slots[META.activeSlot].hero=META.hero;META.slots[META.activeSlot].eq=META.eq;META.slots[META.activeSlot].activeSp=META.activeSp;}
  try{localStorage.setItem('ci_v11',JSON.stringify(META));}catch(e){}
}
function loadMeta(){try{var r=localStorage.getItem('ci_v11')||localStorage.getItem('ci_v10');return r?JSON.parse(r):null;}catch(e){return null;}}

// ── MULTI-SLOT ────────────────────────────────────────────────────
var SLOT_UNLOCK_LV=[1,1,40,60];
function globalMaxLv(){var mx=1;META.slots.forEach(function(s){if(s&&s.hero&&s.hero.lv)mx=Math.max(mx,s.hero.lv);});return mx;}

function loadSlot(idx){
  var s=META.slots[idx];if(!s)return;
  if(META.slots[META.activeSlot]){META.slots[META.activeSlot].hero=META.hero;META.slots[META.activeSlot].eq=META.eq;META.slots[META.activeSlot].activeSp=META.activeSp;}
  META.activeSlot=idx;META.heroId=s.heroId;META.hero=s.hero;META.eq=s.eq;
  META.activeSp=s.activeSp||[];
  saveMeta();recompute();
}

function createCharacter(idx,heroId,customName){
  var h={lv:1,xp:0,skPts:0,spPts:0,passBonus:0,name:customName||null,
          st:{power:0,core:0,protocol:0},spLvPwr:{},spLvCd:{},spTree:{},
          power:0,core:0,protocol:0,equippedSpells:[]};
  META.slots[idx]={heroId:heroId,hero:h,eq:{arme:null,armure:null,casque:null,chaussures:null,implant1:null,implant2:null},activeSp:[]};
  META.activeSlot=idx;META.heroId=heroId;META.hero=h;META.eq=META.slots[idx].eq;META.activeSp=[];
  initActiveSp();recompute();saveMeta();
}

function deleteCharacter(idx){
  if(!confirm('Supprimer ce personnage ? Irréversible.'))return;
  META.slots[idx]=null;
  if(META.activeSlot===idx){
    var ni=-1;META.slots.forEach(function(s,i){if(s&&ni===-1)ni=i;});
    if(ni!==-1){loadSlot(ni);navigate('home');}
    else{META.activeSlot=0;META.heroId=null;META.hero=mkMeta().hero;META.eq=mkMeta().eq;META.activeSp=[];saveMeta();navigate('char-select');}
  }else{saveMeta();navigate('char-select');}
}

// ── SORTS ACTIFS ─────────────────────────────────────────────────
function initActiveSp(){
  var hero=getH(META.heroId),count=0;META.activeSp=[];
  for(var i=0;i<hero.spells.length&&count<CFG.MAX_ACTIVE_SP;i++)
    if(!hero.spells[i].passive){META.activeSp.push(hero.spells[i].id);count++;}
}
function isActive(sid){return META.activeSp.indexOf(sid)!==-1;}
function toggleActiveSp(sid){
  var sp=findSpell(sid);if(!sp||sp.passive)return;
  var idx=META.activeSp.indexOf(sid);
  if(idx!==-1)META.activeSp.splice(idx,1);
  else{if(META.activeSp.length>=CFG.MAX_ACTIVE_SP)return;META.activeSp.push(sid);}
  saveMeta();
}

// ── SLOTS D'ÉQUIPEMENT ───────────────────────────────────────────
var EQ_SLOTS = ['arme','armure','casque','chaussures','implant1','implant2'];
function isEquipped(uid){return EQ_SLOTS.some(function(sl){return META.eq[sl]===uid;});}
function getSlotForItem(it){
  // Si implant, cherche implant1 ou implant2 libre
  if(it.sl==='implant'){
    if(!META.eq.implant1)return'implant1';
    if(!META.eq.implant2)return'implant2';
    return'implant1'; // remplace implant1 par défaut
  }
  return it.sl;
}
function equippedInSlot(sl){return META.eq[sl]?byUid(META.eq[sl]):null;}

// ── STATS CALCULÉES ──────────────────────────────────────────────
// Améliorations : +N% du stat de BASE du héros par niveau
// ex: up_force nv.50 + berserker baseAtk=12 → +6 ATQ (50% de 12)
function recompute(){
  // Recalcule les bonus passifs de l'arbre de sorts
  if (typeof SPELL_TREES !== 'undefined' && SPELL_TREES[META.heroId]) {
    var _st = META.hero.spTree || {};
    var _pwr=0,_cor=0,_pro=0,_rgn=0,_dg=0,_pb=0;
    SPELL_TREES[META.heroId].forEach(function(tree){
      tree.nodes.forEach(function(nd){
        var lv=_st[nd.id]||0;
        if(!lv||!nd.passive||!nd.bonus) return;
        var b=nd.bonus;
        if(b.power)     _pwr+=b.power*lv;
        if(b.core)      _cor+=b.core*lv;
        if(b.protocol)  _pro+=b.protocol*lv;
        if(b.rgn)       _rgn+=b.rgn*lv;
        if(b.dodge)     _dg +=b.dodge*lv;
        if(b.passBonus) _pb +=b.passBonus*lv;
      });
    });
    META.hero.power    = _pwr;
    META.hero.core     = _cor;
    META.hero.protocol = _pro;
    if(_rgn)  META.hero.rgnBonus  = _rgn;
    if(_pb)   META.hero.passBonus = (META.hero.passBonus||0)+_pb;
  }
  var bd=computeBreakdown();
  // Champs run-mode (backward compat)
  P.atk =bd.atk.total; P.aspd=bd.aspd.total; P.dps=bd.dps;
  P.mSh =bd.sh.total;  P.rgn =bd.rgn.total;
  P.mult=bd.mult.total; P.dodge=bd.dodge.total;
  P.pros=Math.max(10,bd.pros.total);  // Scan base 10 P.dmgRed=bd.dmgRed; P.spPwrBonus=bd.spPwrBonus;
  PRE={atk:bd.preAtk,hp:bd.preHp,sh:bd.preSh,aspd:bd.preAspd};

  // ── Nouveaux stats (Power/Core/Protocol) ──────────────────────
  var _h = META.hero;
  P.power    = (_h.st.power   ||0) + (_h.power   ||0); // skill + tree passifs
  P.core     = (_h.st.core    ||0) + (_h.core    ||0);
  P.protocol = (_h.st.protocol||0) + (_h.protocol||0);

  // PV inclut Vitalité (Core×10) — recalcul après power/core/protocol
  P.mHp  = bd.hp.base + (_h.st.core||0)*10 + bd.hp.upg + bd.hp.equip;
  P.crit = Math.min(0.50, 0.01 + P.power * 0.005 + (bd.crit.equip||0) + (bd.crit.upg||0));
  P.cc   = P.crit; // alias
  P.ccMult  = 0.5;  // multiplicateur CC base +50% (= dégâts × 1.5)
  P.tacle   = 5;    // tacle joueur base (% blocage par ennemi adjacent)
  P.pushDmg = 0.1;  // dégâts de poussée base (10% des dégâts / case bloquée)

  // Stats hex depuis équipements
  var _pmBonus=0, _paBonus=0, _poBonus=0;
  if(typeof EQ_SLOTS!=='undefined') EQ_SLOTS.forEach(function(sl){
    var uid=META.eq[sl]; if(!uid) return;
    var it=byUid(uid); if(!it||!it.st) return;
    if(it.st.pm) _pmBonus+=it.st.pm;
    if(it.st.pa) _paBonus+=it.st.pa;
    if(it.st.po) _poBonus+=it.st.po;
  });
  P.pm = ((getH(META.heroId||'berserker')||{}).basePm || 1) + _pmBonus;
  P.pa = 4 + Math.floor((_h.lv||1) / 50) + _paBonus;
  P.po = 1 + _poBonus;
  P.init   = Math.round((P.power + P.core + P.protocol) / 3);
  P.respa  = parseFloat((P.protocol * 0.02).toFixed(3));
  P.respm  = parseFloat((P.protocol * 0.02).toFixed(3));
  P.esq    = Math.min(0.05, 0.01 + (bd.dodge.equip||0));

  // Soins & regen
  P.vitality = P.core * 10;
  P.heal     = parseFloat((1 + P.core * 0.02).toFixed(3));
  P.regen    = bd.rgn.total;

  // Utilitaires (base = 0, viendront des équips plus tard)
  P.loot    = 0; P.xpBonus = 0; P.credits = 0; P.invoc = 1;
  P.thorn = 0; P.lifesteal = 0; P.soin = 0;
  P.resPlas = 0; P.resNeon = 0; P.resGlitch = 0; P.resNegate = 0; P.resSpell = 0;
  P.panoLoot = 0; P.panoCredits = 0; P.panoXp = 0;

  // ── Accumulation des stats depuis tous les équipements ──────────
  if(typeof EQ_SLOTS !== 'undefined') EQ_SLOTS.forEach(function(sl) {
    var uid = META.eq[sl]; if(!uid) return;
    var it = byUid(uid); if(!it || !it.st) return;
    var s = it.st;
    // Stats de combat de base
    if(s.power)    P.power    += s.power;
    if(s.core)     P.core     += s.core;
    if(s.protocol) P.protocol += s.protocol;
    if(s.vit)      P.mHp      += s.vit;       // Vitalité → PV directs
    if(s.cc)       P.crit      = Math.min(0.95, P.crit + s.cc);
    if(s.esq)      P.esq       = Math.min(0.05, P.esq  + s.esq);
    if(s.respa || s.esqPa)  P.respa += (s.respa || s.esqPa || 0);
    if(s.respm || s.esqPm)  P.respm += (s.respm || s.esqPm || 0);
    if(s.init)     P.init      = (P.init||0) + s.init;
    if(s.thorn)    P.thorn    += s.thorn;
    if(s.lifesteal)P.lifesteal+= s.lifesteal;
    if(s.soin)     P.soin      = (P.soin||0) + s.soin;
    if(s.rgn)      P.regen    += s.rgn;
    // Utilitaires
    if(s.loot)     P.loot     += s.loot;
    if(s.xp)       P.xpBonus  += s.xp;
    if(s.credits)  P.credits  += s.credits;
    // Résistances
    if(s.resPlas)   P.resPlas   += s.resPlas;
    if(s.resNeon)   P.resNeon   += s.resNeon;
    if(s.resGlitch) P.resGlitch += s.resGlitch;
    if(s.resNegate) P.resNegate += s.resNegate;
    if(s.resSpell)  P.resSpell  += s.resSpell;
    // Nouveaux stats combat
    if(s.ccMult)   P.ccMult   += s.ccMult;
    if(s.tacle)    P.tacle    += s.tacle;
    if(s.pushDmg)  P.pushDmg  += s.pushDmg;
  });

  // ── Bonus labs ATQ (hex) ─────────────────────────────────────────
  P.labAtq = {
    Plasma: (META.upgLv.up_atq_plasma || 0) * 0.004,
    Neon:   (META.upgLv.up_atq_neon   || 0) * 0.004,
    Glitch: (META.upgLv.up_atq_glitch || 0) * 0.004,
    Negate: (META.upgLv.up_atq_negate || 0) * 0.004,
    sort:   (META.upgLv.up_atq_sort   || 0) * 0.004,
    arme:   (META.upgLv.up_atq_arme   || 0) * 0.004,
    cac:    (META.upgLv.up_atq_cac    || 0) * 0.004,
    dist:   (META.upgLv.up_atq_dist   || 0) * 0.004,
  };

  // ── Bonus panoplies actifs ───────────────────────────────────────
  if (typeof PANO_DEFS !== 'undefined') {
    Object.keys(PANO_DEFS).forEach(function(panoNm) {
      var bonus = panoActiveBonus(panoNm);
      if (!bonus || !bonus.stats) return;
      var s = bonus.stats;
      if (s.loot)    P.panoLoot    += s.loot;
      if (s.credits) P.panoCredits += s.credits;
      if (s.xp)      P.panoXp      += s.xp;
      // Cumuler dans P.loot etc. aussi
      if (s.loot)    P.loot        += s.loot;
      if (s.credits) P.credits     += s.credits;
      if (s.xp)      P.xpBonus     += s.xp;
    });
  }
  // Labs multiplient le bonus équipement : total = (stuff × labs_mult) + base
  var _lootM = 1 + (META.upgLv.up_loot   ||0) * 0.01;
  var _xpM   = 1 + (META.upgLv.up_xp     ||0) * 0.01;
  var _crM   = 1 + (META.upgLv.up_credits ||0) * 0.01;
  P.loot    = parseFloat((P.loot    * _lootM).toFixed(4));
  P.xpBonus = parseFloat((P.xpBonus * _xpM  ).toFixed(4));
  P.credits = parseFloat((P.credits * _crM  ).toFixed(4));

  // Hero innate passive bonuses (not amplified by labs)
  var _hdef = HEROES.find(function(h){ return h.id === META.heroId; });
  if (_hdef) {
    if (_hdef.credits) P.credits += _hdef.credits;
    if (_hdef.xp)      P.xpBonus += _hdef.xp;
    if (_hdef.loot)    P.loot    += _hdef.loot;
  }

  return bd;
}

function computeBreakdown(){
  var h=META.hero,hero=getH(META.heroId||'berserker');
  var r={
    atk:{base:hero.baseAtk,skills:0,passive:0,upg:0,equip:0,total:0},
    aspd:{base:hero.baseAspd,skills:0,upg:0,equip:0,total:0},
    hp:{base:hero.baseHp,skills:0,upg:0,equip:0,total:0},
    sh:{base:hero.baseSh,skills:0,upg:0,equip:0,total:0},
    rgn:{base:hero.baseRgn,skills:0,upg:0,equip:0,total:0},
    mult:{base:1,upg:0,total:1},
    crit:{base:0,skills:0,upg:0,equip:0,total:0},
    dodge:{base:0,skills:0,equip:0,total:0},
    pros:{base:10,skills:0,total:10},
    dpct:0,dpFlat:0,dmgRed:0,spPwrBonus:0,dps:0,
  };
  // Compétences : Power → CC, Core → PV (Vitalité), Protocol → (appliqué dans recompute)
  r.crit.skills  += (h.st.power||0)    * 0.005;   // Power +0.5% CC/pt
  r.hp.skills    += (h.st.core||0)     * 10;       // Core +10 PV/pt (Vitalité)
  // Protocol : ESQpa/ESQpm traité dans recompute après computeBreakdown
  // Passifs
  if(META.heroId==='berserker')r.atk.passive=h.passBonus;
  if(META.heroId==='warden')r.dmgRed=0.05;
  // Totaux pré-amélioration (base + compétences + passifs + équipements)
  // Les améliorations donnent N% de ces totaux (N = niveau de l'amélioration)
  var upgLv=META.upgLv;
  r.preAtk  = r.atk.base +r.atk.skills +r.atk.passive+r.atk.equip;
  r.preHp   = r.hp.base  +r.hp.skills  +r.hp.equip;
  r.preSh   = r.sh.base  +r.sh.skills  +r.sh.equip;
  r.preAspd = Math.max(0.1, r.aspd.base+r.aspd.equip);  // aspd : équip seulement
  // Exemple : preAtk=850 ATQ, up_force nv.10 → +10% de 850 = +85 ATQ
  r.atk.upg  = Math.floor(r.preAtk  * (upgLv.up_force||0) * 0.01);
  r.crit.upg = (upgLv.up_dex||0) * 0.005;
  r.hp.upg   = Math.floor(r.preHp   * (upgLv.up_end  ||0) * 0.01);
  r.spPwrBonus= (upgLv.up_int||0) * 0.005;
  r.aspd.upg = parseFloat((r.preAspd * (upgLv.up_agi  ||0) * 0.01).toFixed(3));
  r.sh.upg   = Math.floor(r.preSh   * (upgLv.up_res  ||0) * 0.01);
  r.pros.skills += (upgLv.up_cha||0) * 0.5;
  r.mult.upg  = (upgLv.up_per||0) * 0.005;
  // Équipements (5 slots : arme, skin, implant1, implant2, chaussures)
  EQ_SLOTS.forEach(function(sl){
    var uid=META.eq[sl];if(!uid)return;
    var it=byUid(uid);if(!it)return;var s=it.st;
    if(s.atk)r.atk.equip+=s.atk;if(s.aspd)r.aspd.equip+=s.aspd;
    if(s.hp)r.hp.equip+=s.hp;if(s.sh)r.sh.equip+=s.sh;
    if(s.rgn)r.rgn.equip+=s.rgn;if(s.crit)r.crit.equip+=s.crit;
    if(s.dodge)r.dodge.equip+=s.dodge;if(s.dpct)r.dpct+=s.dpct;
  });
  // Totaux
  r.atk.total=Math.floor(r.atk.base+r.atk.skills+r.atk.passive+r.atk.upg+r.atk.equip);
  r.aspd.total=parseFloat(Math.max(0.1,r.aspd.base+r.aspd.upg+r.aspd.equip).toFixed(2));
  r.hp.total=Math.floor(r.hp.base+r.hp.skills+r.hp.upg+r.hp.equip);
  r.sh.total=Math.floor(r.sh.base+r.sh.skills+r.sh.upg+r.sh.equip);
  r.rgn.total=parseFloat((r.rgn.base+r.rgn.skills+r.rgn.upg+r.rgn.equip).toFixed(1));
  r.mult.total=parseFloat((r.mult.base+r.mult.upg).toFixed(3));
  r.crit.total=Math.min(0.95,parseFloat((r.crit.base+r.crit.skills+r.crit.upg+r.crit.equip).toFixed(3)));
  r.dodge.total=Math.min(0.80,parseFloat((r.dodge.base+r.dodge.skills+r.dodge.equip).toFixed(3)));
  r.pros.total=Math.max(0,Math.floor(r.pros.base+r.pros.skills));
  var raw=r.atk.total*r.aspd.total+r.dpFlat;
  r.dps=Math.floor(raw*(1+r.dpct)*(1+r.crit.total));
  return r;
}

function spCd(sp){var cd=(META.hero.spLvCd[sp.id]||0)*0.10;return CFG.SP_CD*Math.max(0.3,1-cd);}
function spPwr(sp){return sp.pwr*(1+(META.hero.spLvPwr[sp.id]||0)*0.25+P.spPwrBonus);}

function gainXP(amt){
  var h=META.hero;if(h.lv>=CFG.H_MAX_LV)return;
  amt = Math.floor(amt * (typeof PREMIUM_MODE !== 'undefined' && PREMIUM_MODE ? (typeof PREMIUM_MULT!=='undefined'?PREMIUM_MULT:2) : 1));
  h.xp+=amt;
  while(h.lv<CFG.H_MAX_LV&&h.xp>=xpReq(h.lv)){
    h.xp-=xpReq(h.lv);h.lv++;h.skPts+=2;h.spPts+=1;
    recompute();
    if(typeof setNotif==='function') setNotif('hero-notif-dot', true);
  }
}
function xpReq(lv){return Math.floor(CFG.XP_BASE*Math.pow(CFG.XP_SC,lv-1));}

// ── LOOT ─────────────────────────────────────────────────────────
var EQUIP_SLOTS_ALL=['arme','skin','implant','chaussures'];
function rollLoot(){
  if(Math.random()<0.45){META.gems++;addLog('loot','💎 +1 Gemme');saveMeta();return;}
  if(typeof STUFF_DEFS==='undefined'||!STUFF_DEFS.length)return;
  // Filtrer les items dont le niveau requis est accessible
  var hlv=META.hero.lv||1;
  var pool=STUFF_DEFS.filter(function(d){return d.lrq<=(hlv+5);});
  if(!pool.length)pool=STUFF_DEFS;
  var def=pool[Math.floor(Math.random()*pool.length)];
  var it=rollItem(def.id);
  if(!it)return;
  it.type='equip';it.perm=false;it.relicCount=0;
  var rarMap={1:'c',2:'r',3:'e'};
  it.rar=rarMap[def.rar]||'c';
  it.nm=def.nm;it.sl=def.sl;it.lrq=def.lrq;it.icon=def.icon;
  META.inv.push(it);
  addLog('loot','🎁 '+def.nm+' ['+RAR[it.rar].lbl+']');
  saveMeta();
}
function rollRelique(){
  var rt2=REL_TYPES[Math.floor(Math.random()*REL_TYPES.length)];
  var rk=rollRar(RAR_WL_REL); // pas de commun
  META.inv.push({uid:'R'+(UID++),type:'relique',subtype:rt2.id,nm:rt2.nm,rar:rk,perm:false});
  addLog('loot','⚗ Relique: '+rt2.nm+' ['+RAR[rk].lbl+']');saveMeta();
}

// ── CRAFT par recette ─────────────────────────────────────────────────────────
function craftFromRecipe(recipeId) {
  var recipe = (typeof CRAFT_RECIPES !== 'undefined') && CRAFT_RECIPES.find(function(r){ return r.id === recipeId; });
  if (!recipe) return { ok:false, msg:'Recette introuvable' };
  // Vérifier que le joueur a les ingrédients requis
  for (var i = 0; i < recipe.ingredients.length; i++) {
    var ing = recipe.ingredients[i];
    var count = META.inv.filter(function(it){ return it.type==='spare' && it.partId===ing.partId; }).length;
    if (count < ing.qty) return { ok:false, msg:'Il manque: ' + ing.partNm + ' x' + (ing.qty-count) };
  }
  // Retirer les ingrédients
  recipe.ingredients.forEach(function(ing) {
    var removed = 0;
    META.inv = META.inv.filter(function(it){
      if (it.type==='spare' && it.partId===ing.partId && removed < ing.qty) { removed++; return false; }
      return true;
    });
  });
  // Créer l'item résultant
  var resultDef = (typeof STUFF_DEFS !== 'undefined') && STUFF_DEFS.find(function(d){ return d.id === recipe.resultId; });
  if (!resultDef) return { ok:false, msg:'Item résultant introuvable' };
  var newItem = rollItem(recipe.resultId);
  if (!newItem) return { ok:false, msg:'Erreur de création' };
  META.inv.push(newItem);
  saveMeta();
  return { ok:true, item:newItem, msg:'✅ ' + recipe.nm + ' forgé !' };
}


// ── REROLL ─────────────────────────────────────────────────────────────────
function calcRerollCost(item, lockedKeys) {
  var baseCost = item.lrq || 1;          // 1 gem par niveau requis
  var locked   = (lockedKeys||[]).length;
  var mult = Math.pow(1.5, locked);      // +50% par stat verrouillée
  return Math.ceil(baseCost * mult);
}

// Reroll toutes les stats non verrouillées d'un item
// Retourne un objet {newSt, newRoll} sans modifier l'item
function previewReroll(item, lockedKeys) {
  var def = (typeof STUFF_DEFS !== 'undefined') && STUFF_DEFS.find(function(d){ return d.id === item.id; });
  if (!def || !def.stats) return null;
  var newRoll = Math.random();
  var newSt   = {};
  def.stats.forEach(function(s) {
    if ((lockedKeys||[]).indexOf(s.key) !== -1) {
      // Verrouillée: conserver l'ancienne valeur
      newSt[s.key] = item.st[s.key];
    } else {
      // Libre: nouvelle valeur aléatoire dans [min, max]
      var span = s.max - s.min;
      var raw  = span > 0 ? s.min + span * newRoll : s.min;
      newSt[s.key] = s.max >= 1 ? Math.round(raw) : parseFloat(raw.toFixed(4));
    }
  });
  return { newSt: newSt, newRoll: newRoll };
}

// Appliquer un reroll prévisualisé à l'item dans META.inv
function applyReroll(uid, newSt, newRoll) {
  var it = byUid(uid);
  if (!it) return false;
  it.st   = newSt;
  it.roll = newRoll;
  recompute();
  saveMeta();
  return true;
}


// ── ACHATS ───────────────────────────────────────────────────────
function uCost(u){return Math.floor(u.bCost*Math.pow(u.sc,META.upgLv[u.id]||0));}
function buyUpg(id){
  var u=findUpg(id);if(!u)return;
  var lv=META.upgLv[u.id]||0;if(lv>=u.max)return;
  if(META.labQueue[id])return;            // timer déjà en cours
  var c=uCost(u);if(META.cr<c)return;
  META.cr-=c;
  var dur=typeof labTimeSec==='function'?labTimeSec(lv+1):60;
  META.labQueue[id]={startTime:Date.now(),durationSec:dur,targetLv:lv+1};
  saveMeta();
  if(typeof renderUpg==='function')renderUpg();
  updateTop();
}

function labFinish(id){
  var q=META.labQueue[id];if(!q)return false;
  if((Date.now()-q.startTime)/1000<q.durationSec)return false;
  META.upgLv[id]=q.targetLv;
  delete META.labQueue[id];
  recompute();saveMeta();
  if(typeof renderUpg==='function')renderUpg();
  updateTop();
  return true;
}

function labSkip(id){
  // Terminer immédiatement le timer
  var q=META.labQueue[id];if(!q)return;
  META.upgLv[id]=q.targetLv;
  delete META.labQueue[id];
  recompute();saveMeta();
  if(typeof renderUpg==='function')renderUpg();
  updateTop();
}

function labCancel(id){
  var q=META.labQueue[id];if(!q)return;
  var u=findUpg(id);
  if(u){META.cr+=Math.floor(uCost(u));}
  delete META.labQueue[id];
  saveMeta();
  if(typeof renderUpg==='function')renderUpg();
  updateTop();
}

function pollLabs(){
  if(!META||!META.labQueue)return;
  Object.keys(META.labQueue).forEach(function(id){labFinish(id);});
}
function getBoutDisplay(){
  var seed=META.boutSeed||0;
  var types=['arme','armure','casque','implant','chaussures'];
  var result=[];
  types.forEach(function(tp,ti){
    var pool=BOUT.filter(function(b){return b.sl===tp;});
    if(!pool.length)return;
    var start=(seed+ti*7)%pool.length;
    for(var k=0;k<Math.min(4,pool.length);k++){
      result.push(pool[(start+k)%pool.length]);
    }
  });
  return result;
}
function rerollBout(){
  if(META.cr<CFG.BOUT_REROLL_COST)return;
  META.cr-=CFG.BOUT_REROLL_COST;
  META.boutSeed=Date.now();
  saveMeta();updateTop();renderBout();
}

function buyBout(id){
  var b=findBout(id);if(!b)return;
  if(META.bought.indexOf(id)!==-1)return;
  if(b.cost>0&&META.gems<b.cost)return;
  if(b.costCr>0&&META.cr<b.costCr)return;
  if(b.cost>0)META.gems-=b.cost;if(b.costCr>0)META.cr-=b.costCr;
  META.bought.push(id);
  var _bDef=(typeof STUFF_DEFS!=='undefined')&&STUFF_DEFS.find(function(d){return d.id===id;});
  var it={uid:'B'+id,id:id,type:'equip',sl:b.sl,nm:b.nm,rar:b.rar,lrq:b.lrq,st:b.st,perm:true,icon:b.icon,img:(_bDef&&_bDef.img)||null,relicCount:0};
  META.inv.push(it);
  // Auto-équiper si slot libre
  if(b.sl==='implant'){if(!META.eq.implant1){META.eq.implant1='B'+id;recompute();}}
  else if(!META.eq[b.sl]){META.eq[b.sl]='B'+id;recompute();}
  saveMeta();updateTop();renderBout();if(PG==='inv')renderInv();
}

function equipIt(uid,slotHint){
  var it=byUid(uid);if(!it||it.type!=='equip'||META.hero.lv<(it.lrq||1))return;
  var sl=slotHint||getSlotForItem(it);
  META.eq[sl]=uid;recompute();renderInv();saveMeta();
}
function unequip(sl){META.eq[sl]=null;recompute();renderInv();saveMeta();}

function sellItem(uid){
  var it=byUid(uid);if(!it||it.perm)return;
  var price=SELL[it.rar]||30;
  if(it.relicCount)price=Math.floor(price*(1+it.relicCount*0.2));
  META.cr+=price;
  EQ_SLOTS.forEach(function(sl){if(META.eq[sl]===uid)META.eq[sl]=null;});
  META.inv=META.inv.filter(function(x){return x.uid!==uid;});
  recompute();updateTop();renderInv();saveMeta();
}

// Vendre tous les items d'un type et rareté (non perm, non équipés)
function sellAll(type,rar){
  var toSell=META.inv.filter(function(it){
    return it.type===type&&it.rar===rar&&!it.perm&&!isEquipped(it.uid);
  });
  if(!toSell.length)return;
  var total=0;
  toSell.forEach(function(it){
    var price=SELL[it.rar]||30;
    if(it.relicCount)price=Math.floor(price*(1+it.relicCount*0.2));
    total+=price;
  });
  META.cr+=total;
  var sellUids=toSell.map(function(x){return x.uid;});
  META.inv=META.inv.filter(function(x){return sellUids.indexOf(x.uid)===-1;});
  recompute();updateTop();renderInv();saveMeta();
  addLog('loot','₵ Vendu '+toSell.length+' items pour '+fmt(total)+'₵');
}

function spendSt(sid){var h=META.hero;if(h.skPts<=0)return;h.st[sid]++;h.skPts--;recompute();renderHero();saveMeta();}

// ── ARBRE DE SORTS ────────────────────────────────────────────────
function getHeroTrees(heroId){
  return (typeof SPELL_TREES!=='undefined' && SPELL_TREES[heroId||META.heroId]) || [];
}
function getTreeNode(heroId, nodeId){
  var trees=getHeroTrees(heroId);
  for(var t=0;t<trees.length;t++){
    for(var n=0;n<trees[t].nodes.length;n++){
      if(trees[t].nodes[n].id===nodeId) return {tree:trees[t], node:trees[t].nodes[n]};
    }
  }
  return null;
}
// Retourne les stats d'un nœud au niveau donné (fallback sur base si lvStats absent)
function getNodeStats(nd, lv) {
  var s = (lv && lv >= 1 && nd.lvStats && nd.lvStats[lv - 1]) || {};
  return {
    dmgMin  : s.dmgMin   !== undefined ? s.dmgMin   : (nd.dmgMin  || 0),
    dmgMax  : s.dmgMax   !== undefined ? s.dmgMax   : (nd.dmgMax  || 0),
    pa      : s.pa       !== undefined ? s.pa       : (nd.pa      || 0),
    range   : s.range    !== undefined ? s.range    : (nd.range   || 0),
    cdMax   : s.cdMax    !== undefined ? s.cdMax    : (nd.cdMax   || 0),
    lifesteal: s.lifesteal !== undefined ? s.lifesteal : (nd.lifesteal || 0),
    minRange: nd.minRange !== undefined ? nd.minRange : 1,
    dur     : nd.dur     || 0,
    hits    : nd.hits    || 1,
    bonus   : s.bonus    !== undefined ? s.bonus    : (nd.bonus   || null),
  };
}

function canUnlockNode(nodeId) {
  var h = META.hero, r = getTreeNode(META.heroId, nodeId);
  if (!r) return false;
  if ((h.spTree[nodeId] || 0) >= 1) return false;  // déjà débloqué
  if (h.spPts < 1) return false;                    // coût fixe : 1 pt
  return r.node.prereqs.every(function(pid){ return (h.spTree[pid]||0) > 0; });
}

function unlockTreeNode(nodeId) {
  if (!canUnlockNode(nodeId)) return;
  var h = META.hero;
  h.spTree[nodeId] = 1;
  h.spPts -= 1;
  recompute(); saveMeta();
  if (typeof renderSpellTree === 'function') renderSpellTree();
}

function canLevelUpNode(nodeId) {
  var h = META.hero;
  var r = getTreeNode(META.heroId, nodeId);
  if (!r) return false;
  var curLv = h.spTree[nodeId] || 0;
  var maxLv = r.node.maxLv || 1;
  return curLv >= 1 && curLv < maxLv && h.spPts >= 1 + curLv;
}

function levelUpNode(nodeId) {
  if (!canLevelUpNode(nodeId)) return;
  var h = META.hero;
  var curLv = h.spTree[nodeId] || 0;
  h.spTree[nodeId] = curLv + 1;
  h.spPts -= 1 + curLv;
  recompute(); saveMeta();
  if (typeof renderSpellTree === 'function') renderSpellTree();
}

function toggleEquipSpell(nodeId) {
  var h = META.hero;
  if (!(h.spTree[nodeId] || 0)) return; // pas débloqué
  var r = getTreeNode(META.heroId, nodeId);
  if (!r || r.node.passive) return;     // pas les passifs
  // Purge des anciens IDs qui n'existent plus dans l'arbre actuel
  var validIds = {};
  getHeroTrees(META.heroId).forEach(function(t){
    t.nodes.forEach(function(n){ validIds[n.id] = true; });
  });
  var eq = (h.equippedSpells || []).filter(function(id){ return !!validIds[id]; });
  var idx = eq.indexOf(nodeId);
  if (idx !== -1) {
    h.equippedSpells = eq.filter(function(id){ return id !== nodeId; });
  } else {
    if (eq.length >= 5) {
      h.equippedSpells = eq.slice(0,4).concat([nodeId]);
    } else {
      h.equippedSpells = eq.concat([nodeId]);
    }
  }
  saveMeta();
}
function resetSpellTree(){
  var h=META.hero;
  var spent=0;
  Object.keys(h.spTree).forEach(function(nid){
    var lv=h.spTree[nid]||0;
    spent += lv*(lv+1)/2;

  });
  h.spTree={};
  h.spPts+=spent;
  recompute(); saveMeta();
  if(typeof renderSpellTree==='function') renderSpellTree();
  if(typeof renderHero==='function') renderHero();
}

function upgSpPwr(spId){var h=META.hero;if(h.spPts<=0)return;var lv=h.spLvPwr[spId]||0;if(lv>=CFG.SP_MAX_LV)return;h.spLvPwr[spId]=lv+1;h.spPts--;renderHero();saveMeta();}
function upgSpCd(spId){var h=META.hero;if(h.spPts<=0)return;var lv=h.spLvCd[spId]||0;if(lv>=CFG.SP_MAX_LV)return;h.spLvCd[spId]=lv+1;h.spPts--;renderHero();saveMeta();}

// ── CRAFT — RELIQUES (multi-select, max 2 par item) ───────────────
function isRelicCompatible(relic, item){
  if(!item||!relic)return false;
  if((item.relicCount||0)>=CFG.MAX_RELICS_PER_ITEM)return false;
  if(relic.subtype==='univ')return true;
  var sm={atk:'atk',aspd:'aspd',vit:'hp',res:'sh',rgn:'rgn'};
  var targetStat=sm[relic.subtype];
  return !!(targetStat&&item.st&&item.st[targetStat]!==undefined);
}

function toggleCraftRelic(uid){
  var idx=CRAFT.enhRels.indexOf(uid);
  if(idx!==-1){CRAFT.enhRels.splice(idx,1);}
  else{
    if(CRAFT.enhRels.length>=2)return; // max 2 reliques
    CRAFT.enhRels.push(uid);
  }
  renderCraft();
}

function doEnhance(){
  var item=byUid(CRAFT.enhItem);
  if(!item||!CRAFT.enhRels.length)return;
  var sm={atk:'atk',aspd:'aspd',vit:'hp',res:'sh',rgn:'rgn'};
  var applied=0;
  CRAFT.enhRels.forEach(function(relUid){
    var rel=byUid(relUid);if(!rel)return;
    if((item.relicCount||0)>=CFG.MAX_RELICS_PER_ITEM)return;
    var pct=REL_BONUS[rel.rar]||0.08;
    var stat=rel.subtype==='univ'?mainStat(item.st):sm[rel.subtype];
    if(stat&&item.st[stat]!==undefined){
      item.st[stat]+=Math.floor(item.st[stat]*pct);
      item.relicCount=(item.relicCount||0)+1;
      META.inv=META.inv.filter(function(x){return x.uid!==rel.uid;});
      applied++;
    }
  });
  if(applied>0){
    CRAFT.enhItem=null;CRAFT.enhRels=[];
    recompute();saveMeta();
    document.getElementById('ce-log').textContent='⚗ '+applied+' relique(s) fusionnée(s) !';
    renderCraft();if(PG==='inv')renderInv();
  }
}

function canCraft(rec){var i,req,c,j;for(i=0;i<rec.req.length;i++){req=rec.req[i];c=0;for(j=0;j<META.inv.length;j++)if(META.inv[j].type===req.type&&META.inv[j].rar===req.rar)c++;if(c<req.count)return false;}return true;}
function doCraft(rid){
  var rec=null,i;for(i=0;i<RECIPES.length;i++)if(RECIPES[i].id===rid){rec=RECIPES[i];break;}
  if(!rec||!canCraft(rec))return;
  var req,j,c;for(i=0;i<rec.req.length;i++){req=rec.req[i];c=req.count;for(j=META.inv.length-1;j>=0&&c>0;j--){if(META.inv[j].type===req.type&&META.inv[j].rar===req.rar){META.inv.splice(j,1);c--;}}}
  var slots=rec.resultType?[rec.resultType]:EQUIP_SLOTS_ALL;
  var sl=slots[Math.floor(Math.random()*slots.length)];
  var rk=rec.result,rm=RAR[rk].m,w=Math.max(5,META.hero.lv);
  var nms=LOOT_NAMES[sl]||LOOT_NAMES.arme;
  var nm=nms[Math.floor(Math.random()*nms.length)];
  var lrq=Math.max(1,META.hero.lv-5),st={};
  if(sl==='arme'){st.atk=Math.floor((w*3+6)*rm);st.aspd=parseFloat((rm*0.04).toFixed(2));}
  else if(sl==='armure'){st.vit=Math.floor((w*30+80)*rm);}
  else if(sl==='chaussures'){st.aspd=parseFloat((0.06*rm).toFixed(2));st.dodge=parseFloat((0.03*rm).toFixed(2));if(rm>=2.8)st.crit=parseFloat((0.02*rm).toFixed(2));}
  else{st.dpct=parseFloat(Math.min(0.80,0.06*rm).toFixed(2));st.rgn=parseFloat((1.8*rm).toFixed(1));if(rm>=2.8)st.crit=parseFloat((0.02*rm).toFixed(2));}
  var craft={uid:'C'+(UID++),type:'equip',sl:sl,nm:nm,rar:rk,lrq:lrq,st:st,perm:false,relicCount:0};
  META.inv.push(craft);
  if(typeof incMissionStat==='function')incMissionStat('forges',1);
  saveMeta();renderCraft();  document.getElementById('ce-log').textContent='🔨 Créé: '+nm+' ['+RAR[rk].lbl+'] '+stStr(craft.st);
}
function countInv(type,rar){var c=0,i;for(i=0;i<META.inv.length;i++)if(META.inv[i].type===type&&META.inv[i].rar===rar)c++;return c;}
function mainStat(st){if(!st)return null;if(st.atk)return'atk';if(st.hp)return'hp';if(st.sh)return'sh';if(st.rgn)return'rgn';if(st.aspd)return'aspd';return null;}

// ── UTILS ────────────────────────────────────────────────────────
function getH(id){for(var i=0;i<HEROES.length;i++)if(HEROES[i].id===id)return HEROES[i];return HEROES[0];}
function findSpell(sid){var hero=getH(META.heroId||'berserker');for(var i=0;i<hero.spells.length;i++)if(hero.spells[i].id===sid)return hero.spells[i];return null;}
function findUpg(id){for(var i=0;i<UPGRADES.length;i++)if(UPGRADES[i].id===id)return UPGRADES[i];return null;}
function findBout(id){for(var i=0;i<BOUT.length;i++)if(BOUT[i].id===id)return BOUT[i];return null;}
function byUid(uid){for(var i=0;i<META.inv.length;i++)if(META.inv[i].uid===uid)return META.inv[i];return null;}
function stStr(s){
  if(!s)return'—';var p=[];
  // Nouveaux stats (Power/Core/Protocol)
  if(s.power)   p.push('+'+s.power+' Power');
  if(s.core)    p.push('+'+s.core+' Core');
  if(s.protocol)p.push('+'+s.protocol+' Protocol');
  if(s.vit)     p.push('+'+s.vit+' Vitalité');
  if(s.pm)      p.push('+'+s.pm+' PM');
  if(s.po)      p.push('+'+s.po+' PO');
  if(s.init)    p.push('+'+s.init+' Init');
  if(s.cc)      p.push('+'+Math.round(s.cc*100)+'% CC');
  if(s.esq)     p.push('+'+Math.round(s.esq*100)+'% Esq');
  if(s.respa||s.esqPa) p.push('+'+Math.round((s.respa||s.esqPa)*100)+'% RESpa');
  if(s.respm||s.esqPm) p.push('+'+Math.round((s.respm||s.esqPm)*100)+'% RESpm');
  if(s.rgn)     p.push('+'+s.rgn+' Rgn');
  if(s.soin)    p.push('+'+Math.round(s.soin*100)+'% Soins');
  if(s.resPlas) p.push('+'+Math.round(s.resPlas*100)+'% RES Plas');
  if(s.resNeon) p.push('+'+Math.round(s.resNeon*100)+'% RES Neon');
  if(s.resSpell)p.push('+'+Math.round(s.resSpell*100)+'% RES Sort');
  if(s.loot)    p.push('+'+Math.round(s.loot*100)+'% Loot');
  if(s.thorn)   p.push('+'+Math.round(s.thorn*100)+'% Thorn');
  if(s.lifesteal)p.push('+'+Math.round(s.lifesteal*100)+'% Lifesteal');
  // Legacy (ne devraient plus apparaître)
  if(s.atk)  p.push('+'+s.atk+' ATQ[old]');
  if(s.aspd) p.push('+'+s.aspd+' VitAtq[old]');
  if(s.dodge)p.push('+'+Math.round(s.dodge*100)+'% Esq[old]');
  if(s.dpct) p.push('+'+Math.round(s.dpct*100)+'% DmgRed[old]');
  if(s.hp)   p.push('+'+s.hp+' PV[old]');
  return p.join(', ')||'—';
}
function fmt(n){n=Math.floor(n||0);if(n>=1e9)return(n/1e9).toFixed(2)+'G';if(n>=1e6)return(n/1e6).toFixed(2)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'k';return String(n);}
function pct(v,m){return m>0?Math.max(0,Math.min(100,v/m*100)).toFixed(1):0;}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function fmtT(s){s=Math.floor(s||0);return pad(Math.floor(s/3600))+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);}
function pad(n){return n<10?'0'+n:String(n);}
function setText(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function setBar(id,v,m){var e=document.getElementById(id);if(e)e.style.width=pct(v,m)+'%';}
// ── MISSIONS ─────────────────────────────────────────────────────
var MISSION_POOL=[
  {id:'kills',   lbl:'Éliminer {n} ennemis en run',    key:'kills',   rewardCr:200, rewardGems:1},
  {id:'waves',   lbl:'Compléter {n} vagues',           key:'waves',   rewardCr:300, rewardGems:1},
  {id:'duels',   lbl:'Remporter {n} duel(s)',          key:'duels',   rewardCr:250, rewardGems:2},
  {id:'craft',   lbl:'Forger {n} équipement(s)',       key:'forges',  rewardCr:180, rewardGems:1},
  {id:'credits', lbl:'Accumuler {n} crédits',         key:'credits', rewardCr:0,   rewardGems:3},
];
var MISSION_STATS={kills:0,waves:0,duels:0,forges:0,credits:0};

function generateMissions(){
  if(!META.missions)META.missions=[];
  if(META.missions.length===3)return;
  var pool=MISSION_POOL.slice(),missions=[];
  var lv=META.hero.lv||1;
  while(missions.length<3&&pool.length){
    var idx=Math.floor(Math.random()*pool.length);
    var tpl=pool.splice(idx,1)[0];
    var target=tpl.id==='kills'?10+lv*2:tpl.id==='waves'?5+lv:tpl.id==='duels'?1+Math.floor(lv/10):tpl.id==='craft'?2+Math.floor(lv/5):500+lv*50;
    missions.push({id:tpl.id,lbl:tpl.lbl.replace('{n}',target),key:tpl.key,target:target,progress:0,done:false,claimed:false,rewardCr:tpl.rewardCr,rewardGems:tpl.rewardGems});
  }
  META.missions=missions;
  saveMeta();
}
function incMissionStat(key,n){
  MISSION_STATS[key]=(MISSION_STATS[key]||0)+(n||1);
  if(META.missions){META.missions.forEach(function(m){if(m.key===key&&!m.claimed){m.progress=Math.min(m.target,m.progress+(n||1));if(m.progress>=m.target&&!m.done){m.done=true;if(typeof setNotif==='function')setNotif('mission-notif-dot',true);}}});}
}
function claimMission(idx){
  var m=META.missions&&META.missions[idx];
  if(!m||!m.done||m.claimed)return;
  m.claimed=true;
  META.cr+=m.rewardCr;META.gems+=m.rewardGems;
  saveMeta();updateTop();
  if(PG==='missions')renderMissions();
}
function restartMissions(){META.missions=[];generateMissions();if(PG==='missions')renderMissions();}
function rollRar(){
  var r=Math.random()*100;
  if(r<2)return'l';
  if(r<10)return'e';
  if(r<30)return'r';
  if(r<55)return'p';
  return'c';
}
