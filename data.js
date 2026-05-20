// ================================================================
// data.js v11
// ================================================================

var CFG = {
  H_MAX_LV:100, XP_BASE:60, XP_SC:1.35,
  SP_CD:20, SP_MAX_LV:5,
  LOOT_CH:0.10, REL_CH:0.05,
  MAX_ACTIVE_SP:4, PROS_BASE:100,
  BOUT_REROLL_COST:30,
  MAX_RELICS_PER_ITEM:2,
};


// ── HÉROS ────────────────────────────────────────────────────────
var HEROES = [
  { id:'berserker', name:'SHEPPERD', arch:'DR. ELARA NYX',
    desc:'Invocatrice de robots, Protection, Distance – Type Core. Passif: +10% dégâts Core par invocation alliée. Abondance: +10% crédits.',
    credits:0.10,
portrait:'assets/heroes/HE01.png',
sprites: {
  se:  'assets/heroes/HE01.png',
  sw:  'assets/heroes/HE01.png',
  e:   'assets/heroes/HE01.png',
  w:   'assets/heroes/HE01.png',
  ne:  'assets/heroes/HE01.png',
  nw:  'assets/heroes/HE01.png',
},
    baseHp:120, basePm:2, baseSh:30, baseAtk:12, baseAspd:1.8, baseRgn:0.5,
    heroPassives:[
      {id:'dronarchie', name:'Dronarchie',  icon:'🤖', desc:'+10% dégâts Core par invocation alliée.'},
      {id:'abondance',  name:'Abondance',   icon:'💰', desc:'+10% crédits lors des combats.'},
    ],
    spells:[
      {id:'adren',name:'Adrénaline',      desc:'PASSIF — +1 ATQ permanent par kill.',               ulv:1, passive:true, type:'killBonus',  pwr:1,        energy:0},
      {id:'rage', name:'Rage Cybernétique',desc:'ATQ +80% 6s. Duel: +60% ATQ 2 tours.',             ulv:1, passive:false,type:'dpsBurst',   pwr:0.80,dur:6,energy:1},
      {id:'lame', name:'Lame Plasma',      desc:'600% ATQ instantané. Duel: 300% ATQ.',             ulv:5, passive:false,type:'burst',      pwr:6.0,      energy:2},
      {id:'nstim',name:'Nano-Stimulant',   desc:'Soigne 15% PV. Duel: idem.',                       ulv:8, passive:false,type:'heal',       pwr:0.15,     energy:1},
      {id:'ovchg',name:'Surcharge',        desc:'ATQ ×2 4s. Duel: ×1.8 2 tours.',                  ulv:12,passive:false,type:'dpsBurst',   pwr:1.0,dur:4, energy:2},
      {id:'chain',name:'Décharge Chainée', desc:'3 hits 120% ATQ. Duel: 260% ATQ.',                ulv:15,passive:false,type:'multiBurst', pwr:1.2,hits:3,energy:2, hbAoe:'cross'},
      {id:'saign',name:'Saignement Quant.',desc:'DOT 200% ATQ/s 6s. Duel: 90% ATQ/tour 3t.',       ulv:18,passive:false,type:'dot',        pwr:2.0,dur:6, energy:2},
      {id:'sacri',name:'Sacrifice Cyber.', desc:'Perd 20% PV, ATQ ×3 5s. Duel: ×2.5 2t.',         ulv:22,passive:false,type:'sacrifice',  pwr:3.0,dur:5, energy:2},
      {id:'apoc', name:'Apocalypse Chrome',desc:'Détruit 30% PV ennemi. Duel: -30% ATQ ennemi 2t.',ulv:25,passive:false,type:'pctKill',    pwr:0.30,     energy:3},
      {id:'omega',name:'Frappe Oméga',      desc:'1500% ATQ instantané. Duel: 700% ATQ.',           ulv:30,passive:false,type:'burst',      pwr:15.0,     energy:3},
    ]},
  { id:'warden', name:'RUNNER', arch:'KAIRO BLAZE',
    desc:'CaC, Déplacement, Pièges – Type Plasma. Passif: +30% dégâts Plasma avec 1 PM restant. Sélection naturelle: +10% XP.',
    xp:0.10,
    portrait:'assets/heroes/HE02.png',
    sprites:{ se:'assets/heroes/HE02.png', sw:'assets/heroes/HE02.png', e:'assets/heroes/HE02.png', w:'assets/heroes/HE02.png', ne:'assets/heroes/HE02.png', nw:'assets/heroes/HE02.png' },
    baseHp:100, basePm:2, baseSh:30, baseAtk:12, baseAspd:1.5, baseRgn:0.5,
    heroPassives:[
      {id:'instinct',  name:'Instinct Plasma',   icon:'🩸', desc:'+30% dégâts Plasma avec 1 PM restant.'},
      {id:'selection', name:'Sélection nat.',     icon:'📈', desc:'+10% XP gagné.'},
    ],
    spells:[
      {id:'armv', name:'Armure Vivante',    desc:'PASSIF — -5% dégâts reçus.',                     ulv:1, passive:true, type:'dmgRedux',  pwr:0.05,     energy:0},
      {id:'fort', name:'Forteresse',         desc:'Soigne 25% PV. Duel: idem.',                    ulv:1, passive:false,type:'heal',      pwr:0.25,     energy:1, hbSelfTarget: true, hbAoe: 'single'},
      {id:'nano', name:"Nanobots d'Urgence",desc:'Bouclier à 100%. Duel: idem.',                   ulv:5, passive:false,type:'shFull',    pwr:1.0,      energy:1, hbSelfTarget: true, hbAoe: 'single'},
      {id:'ishll',name:'Carapace de Fer',   desc:'+200 bouclier 4s. Duel: +150.',                  ulv:8, passive:false,type:'shBoost',   pwr:200,dur:4, energy:1, hbSelfTarget: true, hbAoe: 'single'},
      {id:'repdr',name:'Drone Réparateur',  desc:'Regen +15/s 8s. Duel: soigne 20% PV.',           ulv:12,passive:false,type:'rgnBurst',  pwr:15,dur:8,  energy:2},
      {id:'barr', name:'Barrière Adamantine',desc:'Dégâts -80% 6s. Duel: DEF +70% 2t.',            ulv:15,passive:false,type:'dmgBlk',    pwr:0.80,dur:6,energy:2},
      {id:'reflt',name:'Bouclier Réfléch.', desc:'Réfléchit 50% dégâts 4s.',                      ulv:18,passive:false,type:'reflect',   pwr:0.50,dur:4,energy:2},
      {id:'fortm',name:'Mode Forteresse',   desc:'Dégâts -95% 3s + soigne 10% PV.',               ulv:22,passive:false,type:'fortress',  pwr:0.95,dur:3,energy:2},
      {id:'bunk', name:'Bunker Quantique',   desc:'Invulnérabilité 5s. Duel: invuln 1 tour.',       ulv:25,passive:false,type:'invuln',    pwr:1.0,dur:5, energy:3},
      {id:'titan',name:'Protocole Titan',    desc:'Invuln 8s + soigne 40% PV.',                   ulv:30,passive:false,type:'titan',     pwr:1.0,dur:8, energy:3},
    ]},
  { id:'hacker', name:'JACQUES', arch:'HACKER',
    desc:'Debuff, Contrôle, Distance – Type Glitch. Passif: Réseau corrompu — +8% dégâts Glitch 2t quand retire PA/PM à un ennemi. Flux Crypto: +10% loot.',
    loot:0.10,
    portrait:'assets/heroes/HE03.png',
    sprites:{ se:'assets/heroes/HE03.png', sw:'assets/heroes/HE03.png', e:'assets/heroes/HE03.png', w:'assets/heroes/HE03.png', ne:'assets/heroes/HE03.png', nw:'assets/heroes/HE03.png' },
    baseHp:80, basePm:2, baseSh:20, baseAtk:10, baseAspd:1.2, baseRgn:0.5,
    heroPassives:[
      {id:'reseau', name:'Réseau corrompu', icon:'💻', desc:'+8% dégâts Glitch 2t quand retire PA/PM ennemi.'},
      {id:'flux',   name:'Flux Crypto',     icon:'📦', desc:'+10% loot.'},
    ],
    spells:[]
  },
];


// ── RELIQUES — rareté min = p (pas de commun) ─────────────────────
var RAR_WL_REL = [0, 45, 35, 15, 5];
var REL_TYPES = [
  {id:'atk', nm:"Relique d'Attaque",   effect:'atk', col:'#f86',icon:'⚔️'},
  {id:'aspd',nm:'Relique de Vitesse',  effect:'aspd',col:'#fa0',icon:'⚡'},
  {id:'vit', nm:'Relique de Vitalité', effect:'hp',  col:'#5c5',icon:'♥'},
  {id:'res', nm:'Relique de Résist.',  effect:'sh',  col:'#58e',icon:'◈'},
  {id:'rgn', nm:'Relique de Régén.',   effect:'rgn', col:'#6cf',icon:'⟳'},
  {id:'univ',nm:'Relique Universelle', effect:'all', col:'#eb2',icon:'★'},
];
var REL_BONUS = {c:0.08,p:0.15,r:0.25,e:0.40,l:0.60};

var PIECE_NAMES = {
  c:['Ferraille','Câble Usé','Chip Défaillante'],
  p:['Alliage Mineur','Circuit Renforcé'],
  r:['Alliage Quantique','Noyau Nano'],
  e:['Matrice Cybern.','Cristal Plasma'],
  l:['Noyau Absolu'],
};

// ── RECETTES CRAFT ───────────────────────────────────────────────
var RECIPES = [
  {id:'cr1', nm:'Alliage Standard',    icon:'🗡',  desc:'Forge une arme Rare.',             resultType:'arme',       req:[{type:'piece',rar:'c',count:3}],                                result:'r'},
  {id:'cr2', nm:'Forge Avancée',       icon:'⚔️', desc:'Forge un équipement Épique.',       resultType:null,         req:[{type:'piece',rar:'c',count:5},{type:'piece',rar:'r',count:2}],result:'e'},
  {id:'cr3', nm:'Œuvre Maîtresse',    icon:'✦',  desc:'Forge un item Légendaire.',          resultType:null,         req:[{type:'piece',rar:'r',count:3},{type:'piece',rar:'e',count:1}],result:'l'},
  {id:'cr4', nm:'Forge Rapide',        icon:'⚡', desc:'Forge une arme Peu Commune.',        resultType:'arme',       req:[{type:'piece',rar:'c',count:5}],                                result:'p'},
  {id:'cr5', nm:'Kit Vestimentaire',   icon:'👕', desc:'Forge un skin Rare.',               resultType:'skin',       req:[{type:'piece',rar:'c',count:4},{type:'piece',rar:'p',count:1}],result:'r'},
  {id:'cr6', nm:'Module de Mobilité', icon:'👟', desc:'Forge des chaussures Rares.',        resultType:'chaussures', req:[{type:'piece',rar:'c',count:3},{type:'piece',rar:'p',count:2}],result:'r'},
  {id:'cr7', nm:'Synthèse Neurale',    icon:'💿', desc:'Forge un implant Épique.',           resultType:'implant',    req:[{type:'piece',rar:'p',count:3},{type:'piece',rar:'r',count:1}],result:'e'},
  {id:'cr8', nm:'Propulseurs Absolus', icon:'🚀', desc:'Forge des chaussures Légendaires.', resultType:'chaussures', req:[{type:'piece',rar:'r',count:3},{type:'piece',rar:'e',count:1}],result:'l'},
  {id:'cr9', nm:'Arsenal Maîtrisé',   icon:'🔫', desc:'Forge une arme Légendaire.',         resultType:'arme',       req:[{type:'piece',rar:'r',count:2},{type:'piece',rar:'e',count:2}],result:'l'},
  {id:'cr10',nm:'Grande Transmutation',icon:'🌀', desc:'Transmute 5 Épiques en Légendaire.',resultType:null,         req:[{type:'piece',rar:'e',count:5}],                                result:'l'},
];

// ── AMÉLIORATIONS (REWORK) ────────────────────────────────────────
// 1 amélioration par stat. Boost = N × 1% du stat de base du héros.
// Niveau 100 → +100% du stat de base ajouté aux stats.
// Le calcul effectif se fait dans engine.js → computeBreakdown()
var UPGRADES = [
  // ── CARACTÉRISTIQUES ──────────────────────────────────────────────────────
  {id:'up_power',    cat:'Caractéristiques', name:'Power',       icon:'🔥', desc:'Augmente les dégâts Plasma.',                       bCost:150, sc:1.55, max:100, bonus:1,    ulv:5},
  {id:'up_core',     cat:'Caractéristiques', name:'Core',        icon:'💠', desc:'Augmente les dégâts Neon.',                     bCost:150, sc:1.55, max:100, bonus:1,    ulv:5},
  {id:'up_protocol', cat:'Caractéristiques', name:'Protocol',    icon:'⚙️', desc:'Augmente les dégâts Glitch.',                bCost:150, sc:1.55, max:100, bonus:1,    ulv:5},
  // ── POINTS DE JEU ─────────────────────────────────────────────────────────
  {id:'up_hp',       cat:'Caractéristiques', name:'PV',          icon:'♥',  desc:'+2 Points de Vie par niveau de lab',              bCost:100, sc:1.50, max:100, bonus:2,    ulv:5},
  {id:'up_pa',       cat:'Caractéristiques', name:'PA',          icon:'⚡', desc:'+1 PA (max 2 niveaux - héros lvl 50 et 100)',     bCost:5000,sc:1.00, max:2,   bonus:1,    ulv:50},
  // ── UTILITAIRE ────────────────────────────────────────────────────────────
  {id:'up_scan',     cat:'Utilitaire',       name:'Scan',        icon:'🔍', desc:'+1 Scan par niveau (permet de trouver des items)',  bCost:100, sc:1.50, max:100, bonus:1,ulv:5},
  {id:'up_loot',     cat:'Utilitaire',       name:'Loot',        icon:'💰', desc:'+1% chances de drop par niveau',                  bCost:100, sc:1.50, max:100, bonus:1, ulv:5},
  {id:'up_xp',       cat:'Utilitaire',       name:'XP',          icon:'📈', desc:"+1% d'XP par niveau",                            bCost:100, sc:1.50, max:100, bonus:1, ulv:5},
  {id:'up_credits',  cat:'Utilitaire',       name:'Crédits',     icon:'₵',  desc:'+1% crédits lootés par niveau',                  bCost:100, sc:1.50, max:100, bonus:1, ulv:5},
  // ── ATTAQUES ──────────────────────────────────────────────────────────────
  {id:'up_atq_plasma',cat:'Attaques',        name:'ATQ Plasma',  icon:'🔴', desc:'+0.4% dégâts Plasma par niveau',                 bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_neon',  cat:'Attaques',        name:'ATQ Neon',    icon:'🔵', desc:'+0.4% dégâts Neon par niveau',                  bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_glitch',cat:'Attaques',        name:'ATQ Glitch',  icon:'🟣', desc:'+0.4% dégâts Glitch par niveau',                bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_negate',cat:'Attaques',        name:'ATQ Negate',  icon:'🟡', desc:'+0.4% dégâts Negate par niveau',                bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_sort',  cat:'Attaques',        name:'ATQ Sort',    icon:'✨', desc:'+0.4% dégâts de tous les sorts par niveau',      bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_arme',  cat:'Attaques',        name:'ATQ Arme',    icon:'🗡️', desc:'+0.4% dégâts arme par niveau',                  bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_cac',   cat:'Attaques',        name:'ATQ CaC',     icon:'👊', desc:'+0.4% dégâts au corps-à-corps par niveau',       bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  {id:'up_atq_dist',  cat:'Attaques',        name:'ATQ Distance',icon:'🏹', desc:'+0.4% dégâts à distance par niveau',             bCost:200, sc:1.60, max:50,  bonus:0.004,ulv:20},
  // ── RÉSISTANCES ───────────────────────────────────────────────────────────
  {id:'up_res_physique',cat:'Résistances',   name:'RES Physique',icon:'🛡️', desc:'+0.4% résistance Physique par niveau',           bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_neon',  cat:'Résistances',     name:'RES Neon',    icon:'🔵', desc:'+0.4% résistance Neon par niveau',               bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_plasma',cat:'Résistances',     name:'RES Plasma',  icon:'🔴', desc:'+0.4% résistance Plasma par niveau',             bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_sort',  cat:'Résistances',     name:'RES Sort',    icon:'✨', desc:'+0.4% résistance aux sorts par niveau',          bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_arme',  cat:'Résistances',     name:'RES Arme',    icon:'🗡️', desc:'+0.4% résistance arme par niveau',               bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_cac',   cat:'Résistances',     name:'RES CaC',     icon:'👊', desc:'+0.4% résistance CaC par niveau',                bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
  {id:'up_res_dist',  cat:'Résistances',     name:'RES Distance',icon:'🏹', desc:'+0.4% résistance à distance par niveau',         bCost:250, sc:1.60, max:50,  bonus:0.004,ulv:60},
];

// ── DURÉE LAB (secondes) ──────────────────────────────────────────────────
// Points calibrage : lvl1=10min, lvl20=8h, lvl40=8 jours
// Interpolation log-linéaire en deux segments
function labTimeSec(level) {
  if (!level || level <= 0) return 0;
  if (level === 1) return 600;
  var logT = level <= 20
    ? 6.397 + (level - 1) * 0.2038   // 10min → 8h
    : 10.268 + (level - 20) * 0.159; // 8h → 8 jours
  return Math.round(Math.exp(logT));
}

// ── FORMATAGE DURÉE ───────────────────────────────────────────────────────
function fmtLabTime(sec) {
  if (!sec || sec <= 0) return '0s';
  var d = Math.floor(sec / 86400);
  var h = Math.floor((sec % 86400) / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = sec % 60;
  if (d > 0) return d + 'j ' + (h > 0 ? h + 'h' : '');
  if (h > 0) return h + 'h ' + (m > 0 ? m + 'mn' : '');
  if (m > 0) return m + 'mn' + (s > 0 ? ' ' + s + 's' : '');
  return s + 's';
}

// ── BOUTIQUE (Épique + Légendaire uniquement) ─────────────────────
// getBoutDisplay() in engine.js choisit 2 items/type selon boutSeed
var STUFF_DEFS = [
  // ── ARMES S01-S12 ────────────────────────────────────────────
  {id:'S01',nm:'Chaîne',                   sl:'arme',      img:'assets/items/S01.png',icon:'⚔️',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,
    arme:{dmgMin:2,dmgMax:6, paCost:2,po:1,nbAtq:1,dmgType:'Plasma'},stats:[{key:'power',   min:1, max:3}]},
  {id:'S02',nm:'Couteau rouillé',           sl:'arme',      img:'assets/items/S02.png',icon:'⚔️',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,
    arme:{dmgMin:2,dmgMax:6, paCost:2,po:1,nbAtq:1,dmgType:'Glitch'},stats:[{key:'protocol', min:1, max:3}]},
  {id:'S03',nm:'Lame Plasma Mk.I',          sl:'arme',      img:'assets/items/S03.png',icon:'⚔️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:null,
    arme:{dmgMin:3,dmgMax:7, paCost:3,po:1,nbAtq:1,dmgType:'Plasma'},stats:[{key:'power',   min:1, max:10},{key:'cc',      min:0.01,max:0.02}]},
  {id:'S04',nm:'Taser',                     sl:'arme',      img:'assets/items/S04.png',icon:'⚔️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:'Starter Kit',craftId:'CR_S04',
    arme:{dmgMin:3,dmgMax:7, paCost:3,po:1,nbAtq:1,dmgType:'Neon'},  stats:[{key:'power',   min:1, max:10},{key:'xp',      min:0.01,max:0.02}]},
  {id:'S05',nm:'Pistolet 9mm',              sl:'arme',      img:'assets/items/S05.png',icon:'⚔️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:null,
    arme:{dmgMin:2,dmgMax:6, paCost:2,po:2,nbAtq:1,dmgType:'Glitch'},stats:[{key:'protocol', min:1, max:5}, {key:'vit',     min:1,  max:5}]},
  {id:'S06',nm:'Canon Neon',                sl:'arme',      img:'assets/items/S06.png',icon:'⚔️',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:'Core > 20',pano:null,
    arme:{dmgMin:3,dmgMax:9, paCost:3,po:2,nbAtq:1,dmgType:'Neon'},  stats:[{key:'core',    min:8, max:12},{key:'vit',     min:1,  max:5}]},
  {id:'S07',nm:'Poing Réacteur',            sl:'arme',      img:'assets/items/S07.png',icon:'⚔️',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,
    arme:{dmgMin:3,dmgMax:9, paCost:3,po:1,nbAtq:1,dmgType:'Plasma'},stats:[{key:'xp',      min:0.01,max:0.05},{key:'credits',min:0.01,max:0.04}]},
  {id:'S08',nm:'Fusil Railgun',             sl:'arme',      img:'assets/items/S08.png',icon:'⚔️',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:'Protocol > 20',pano:null,
    arme:{dmgMin:3,dmgMax:9, paCost:2,po:2,nbAtq:1,dmgType:'Glitch'},stats:[{key:'protocol', min:1, max:3}]},
  {id:'S09',nm:'Fusil à Fragmentation',     sl:'arme',      img:'assets/items/S09.png',icon:'⚔️',rar:1,lrq:15, scanMin:10,sell:150, dropRate:0.02,equip:'Power > 20',pano:null,
    arme:{dmgMin:5,dmgMax:10,paCost:3,po:3,nbAtq:1,dmgType:'Plasma'},stats:[{key:'power',   min:1, max:10},{key:'credits', min:0.01,max:0.09}]},
  {id:'S10',nm:'Couteau plasma',            sl:'arme',      img:'assets/items/S10.png',icon:'⚔️',rar:1,lrq:20, scanMin:10,sell:200, dropRate:0.02,equip:null,pano:null,
    arme:{dmgMin:5,dmgMax:12,paCost:3,po:1,nbAtq:1,dmgType:'Neon'},  stats:[{key:'core',    min:1, max:12},{key:'init',    min:10, max:30},{key:'loot',min:0.01,max:0.06}]},
  {id:'S11',nm:'Lance-Grenades Plasma',     sl:'arme',      img:'assets/items/S11.png',icon:'⚔️',rar:1,lrq:25, scanMin:10,sell:250, dropRate:0.02,equip:'Power > 20',pano:null,
    arme:{dmgMin:6,dmgMax:15,paCost:3,po:3,nbAtq:1,dmgType:'Plasma'},stats:[{key:'power',   min:1, max:10},{key:'thorn',   min:0.01,max:0.02}]},
  {id:'S12',nm:'Lame Negate Omega',         sl:'arme',      img:'assets/items/S12.png',icon:'⚔️',rar:1,lrq:30, scanMin:10,sell:300, dropRate:0.02,equip:'Protocol > 50',pano:null,
    arme:{dmgMin:10,dmgMax:15,paCost:4,po:1,nbAtq:1,dmgType:'Glitch'},stats:[{key:'power',  min:1, max:20},{key:'cc',min:0.02,max:0.06},{key:'thorn',min:0.01,max:0.02},{key:'loot',min:0.02,max:0.06}]},

  // ── ARMURES S13-S18 ──────────────────────────────────────────
  {id:'S13',nm:'Veste Légère',              sl:'armure',    img:'assets/items/S13.png',icon:'🛡️',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:1,max:3}]},
  {id:'S14',nm:'Gilet Nano-Kevlar',         sl:'armure',    img:'assets/items/S14.png',icon:'🛡️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'vit',min:15,max:20},{key:'resPlas',min:0.01,max:0.04}]},
  {id:'S15',nm:'Exosquelette Léger',        sl:'armure',    img:'assets/items/S15.png',icon:'🛡️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:1,max:3},{key:'core',min:1,max:3},{key:'protocol',min:1,max:3}]},
  {id:'S16',nm:'Manteau Blindé',            sl:'armure',    img:'assets/items/S16.png',icon:'🛡️',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:1,max:10},{key:'core',min:1,max:10},{key:'protocol',min:1,max:10}]},
  {id:'S17',nm:'Armure Corpo Elite',        sl:'armure',    img:'assets/items/S17.png',icon:'🛡️',rar:1,lrq:15, scanMin:10,sell:150, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'vit',min:30,max:50},{key:'resNeon',min:0.04,max:0.08},{key:'resSpell',min:0.02,max:0.06}]},
  {id:'S18',nm:'Plastron Quantique',        sl:'armure',    img:'assets/items/S18.png',icon:'🛡️',rar:1,lrq:25, scanMin:10,sell:250, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:10,max:30},{key:'xp',min:0.01,max:0.15}]},

  // ── CASQUES S19-S24 ───────────────────────────────────────────
  {id:'S19',nm:'Casquette',                 sl:'casque',    img:'assets/items/S19.png',icon:'⛑️',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'loot',min:0.02,max:0.06}]},
  {id:'S20',nm:'Casque Tactique I',         sl:'casque',    img:'assets/items/S20.png',icon:'⛑️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'init',min:20,max:30},{key:'loot',min:0.02,max:0.06}]},
  {id:'S21',nm:'Casque léger',              sl:'casque',    img:'assets/items/S21.png',icon:'⛑️',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:'Starter Kit',craftId:'CR_S21',arme:null,
    stats:[{key:'power',min:1,max:10},{key:'xp',min:0.02,max:0.06}]},
  {id:'S22',nm:'Masque Ghost Protocol',     sl:'casque',    img:'assets/items/S22.png',icon:'⛑️',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'core',min:1,max:15},{key:'xp',min:0.01,max:0.03},{key:'loot',min:0.02,max:0.03}]},
  {id:'S23',nm:'Casque Visor Néon',         sl:'casque',    img:'assets/items/S23.png',icon:'⛑️',rar:1,lrq:15, scanMin:10,sell:150, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'protocol',min:10,max:30}]},
  {id:'S24',nm:'Masque Ghost',              sl:'casque',    img:'assets/items/S24.png',icon:'⛑️',rar:1,lrq:20, scanMin:10,sell:200, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'esq',min:0.02,max:0.06},{key:'respa',min:0.04,max:0.08},{key:'init',min:20,max:40}]},

  // ── CHAUSSURES S25-S29 ────────────────────────────────────────
  {id:'S25',nm:'Bottes Trouées',            sl:'chaussures',img:'assets/items/S25.png',icon:'👟',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'pm',min:1,max:1},{key:'esq',min:0.01,max:0.02}]},
  {id:'S26',nm:'Chaussures de Sprint',      sl:'chaussures',img:'assets/items/S26.png',icon:'👟',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:'Starter Kit',craftId:'CR_S26',arme:null,
    stats:[{key:'pm',min:1,max:1},{key:'credits',min:0.01,max:0.09}]},
  {id:'S27',nm:'Chaussures de Netrunner',   sl:'chaussures',img:'assets/items/S27.png',icon:'👟',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'pm',min:1,max:1},{key:'loot',min:0.01,max:0.09},{key:'credits',min:0.01,max:0.09}]},
  {id:'S28',nm:'Boots Glitch',              sl:'chaussures',img:'assets/items/S28.png',icon:'👟',rar:1,lrq:20, scanMin:10,sell:200, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'pm',min:1,max:1},{key:'respm',min:0.01,max:0.02},{key:'protocol',min:1,max:20}]},
  {id:'S29',nm:'Semelles Magnétiques',      sl:'chaussures',img:'assets/items/S29.png',icon:'👟',rar:1,lrq:20, scanMin:10,sell:200, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'pm',min:1,max:1},{key:'protocol',min:1,max:10},{key:'resNeon',min:0.04,max:0.08}]},

  // ── IMPLANTS S30-S37 ─────────────────────────────────────────
  {id:'S30',nm:'Implant Synapse',           sl:'implant',   img:'assets/items/S30.png',icon:'💡',rar:1,lrq:1,  scanMin:10,sell:10,  dropRate:0.03,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:2,max:5},{key:'init',min:10,max:20}]},
  {id:'S31',nm:'Œil Cybernétique Overclock',sl:'implant',   img:'assets/items/S31.png',icon:'💡',rar:1,lrq:5,  scanMin:10,sell:50,  dropRate:0.03,equip:null,pano:'Starter Kit',craftId:'CR_S31',arme:null,
    stats:[{key:'protocol',min:1,max:5},{key:'vit',min:1,max:5}]},
  {id:'S32',nm:'Cœur Artificiel',           sl:'implant',   img:'assets/items/S32.png',icon:'💡',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:1,max:20},{key:'vit',min:30,max:50}]},
  {id:'S33',nm:'Main Hacker',               sl:'implant',   img:'assets/items/S33.png',icon:'💡',rar:1,lrq:10, scanMin:10,sell:100, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'core',min:1,max:15},{key:'soin',min:0.03,max:0.06},{key:'vit',min:8,max:12}]},
  {id:'S34',nm:'Implant Cortex-X',          sl:'implant',   img:'assets/items/S34.png',icon:'💡',rar:1,lrq:15, scanMin:10,sell:150, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'power',min:10,max:30},{key:'vit',min:1,max:20}]},
  {id:'S35',nm:'Neuro-Link Occipital',       sl:'implant',   img:'assets/items/S35.png',icon:'💡',rar:1,lrq:20, scanMin:10,sell:200, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'core',min:30,max:50},{key:'vit',min:1,max:20}]},
  {id:'S36',nm:'Injecteur Lifesteal',        sl:'implant',   img:'assets/items/S36.png',icon:'💡',rar:1,lrq:30, scanMin:10,sell:300, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'lifesteal',min:0.01,max:0.1},{key:'rgn',min:2,max:3},{key:'credits',min:0.01,max:0.1}]},
  {id:'S37',nm:'Bras Mécanique Plasma',      sl:'implant',   img:'assets/items/S37.png',icon:'💡',rar:1,lrq:30, scanMin:10,sell:300, dropRate:0.02,equip:null,pano:null,arme:null,
    stats:[{key:'pa',min:1,max:1},{key:'vit',min:30,max:50}]},
];;


// ── FONCTIONS ITEM ──────────────────────────────────────────────
var _UID_CTR = Date.now();
function rollItem(defId){
  var def=(STUFF_DEFS||[]).find(function(d){return d.id===defId;});
  if(!def)return null;
  var roll=Math.random();
  var uid='u'+(++_UID_CTR);
  var item={uid:uid,id:defId,roll:roll,st:{},arme:def.arme||null,sl:def.sl,nm:def.nm,icon:def.icon,img:def.img||null,rar:def.rar,lrq:def.lrq,type:'equip',perm:false,relicCount:0};
  (def.stats||[]).forEach(function(s){
    var span=s.max-s.min;
    var raw=span>0?s.min+span*roll:s.min;
    item.st[s.key]=s.max>=1?Math.round(raw):parseFloat(raw.toFixed(4));
  });
  return item;
}
function buyItem(defId){
  var def=(STUFF_DEFS||[]).find(function(d){return d.id===defId;});
  if(!def)return null;
  var uid='u'+(++_UID_CTR);
  var item={uid:uid,id:defId,roll:1.0,st:{},arme:def.arme||null,sl:def.sl,nm:def.nm,icon:def.icon,img:def.img||null,rar:def.rar,lrq:def.lrq,type:'equip',perm:true,relicCount:0};
  (def.stats||[]).forEach(function(s){item.st[s.key]=s.max>=1?Math.round(s.max):s.max;});
  return item;
}
function improveRoll(item,delta){
  var def=(STUFF_DEFS||[]).find(function(d){return d.id===item.id;});
  if(!def)return;
  item.roll=Math.min(1.0,(item.roll||0)+(delta||0.05));
  (def.stats||[]).forEach(function(s){
    var span=s.max-s.min;
    var raw=span>0?s.min+span*item.roll:s.min;
    item.st[s.key]=s.max>=1?Math.round(raw):parseFloat(raw.toFixed(4));
  });
}

// ── MOB SPELLS ─────────────────────────────────────────────────
var MOB_SPELLS = {
  'SP01':
  {id:'SP01',nm:'Punch',lvl:1,effet:'Degats',desc:'Attaque adjacente',
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:2,dmgMax:6,
  },
  'SP02':
  {id:'SP02',nm:'Punch',lvl:2,effet:'Degats',desc:'Attaque adjacente',
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:4,dmgMax:8,
  },
  'SP03':
  {id:'SP03',nm:'Punch',lvl:3,effet:'Degats',desc:'Attaque adjacente',
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:6,dmgMax:10,
  },
  'SP04':
  {id:'SP04',nm:'Punch',lvl:4,effet:'Degats',desc:'Attaque adjacente',
   dmgType:'Plasma',stat:'Power',
   pa:3,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:8,dmgMax:12,
  },
  'SP05':
  {id:'SP05',nm:'Mega Punch',lvl:1,effet:'Degats',desc:"Attaque adjacente. Repousse la cible d'une case (dans la ligne de l'attaquant et défenseur)",
   dmgType:'Plasma',stat:'Power',
   pa:5,minRange:1,range:1,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:18,dmgMax:22,
   pushCases:1,
  },
  'SP06':
  {id:'SP06',nm:'Mega Punch',lvl:2,effet:'Degats',desc:"Attaque adjacente. Repousse la cible d'une case (dans la ligne de l'attaquant et défenseur)",
   dmgType:'Plasma',stat:'Power',
   pa:5,minRange:1,range:1,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:20,dmgMax:24,
   pushCases:1,
   buff:'Gagne +10% dégats',buffDur:0,
  },
  'SP07':
  {id:'SP07',nm:'Mega Punch',lvl:3,effet:'Degats',desc:"Attaque adjacente. Repousse la cible d'une case (dans la ligne de l'attaquant et défenseur)",
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:1,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:22,dmgMax:26,
   pushCases:2,
   buff:'Gagne +20% dégats',buffDur:0,
  },
  'SP08':
  {id:'SP08',nm:'Mega Punch',lvl:4,effet:'Degats',desc:"Attaque adjacente. Repousse la cible d'une case (dans la ligne de l'attaquant et défenseur)",
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:1,unlimited:false,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:24,dmgMax:28,
   pushCases:3,
   buff:'Gagne +30% dégats',buffDur:0,
  },
  'SP09':
  {id:'SP09',nm:'Fire',lvl:1,effet:'Degats',desc:'Tir à proximité',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:1,dmgMax:5,
  },
  'SP10':
  {id:'SP10',nm:'Fire',lvl:2,effet:'Degats',desc:'Tir à proximité',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:3,dmgMax:7,
  },
  'SP11':
  {id:'SP11',nm:'Fire',lvl:3,effet:'Degats',desc:'Tir à proximité',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:5,dmgMax:9,
  },
  'SP12':
  {id:'SP12',nm:'Fire',lvl:4,effet:'Degats',desc:'Tir à proximité',
   dmgType:'Neon',stat:'Core',
   pa:3,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:7,dmgMax:11,
  },
  'SP13':
  {id:'SP13',nm:'Heavy Fire',lvl:1,effet:'Degats',desc:'Coup lourd. Repousse la cible.',
   dmgType:'Neon',stat:'Core',
   pa:5,minRange:1,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:17,dmgMax:21,
   pushCases:1,
  },
  'SP14':
  {id:'SP14',nm:'Heavy Fire',lvl:2,effet:'Degats',desc:'Coup lourd. Repousse la cible.',
   dmgType:'Neon',stat:'Core',
   pa:5,minRange:1,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:19,dmgMax:23,
   pushCases:1,
   buff:'Gagne +10% dégats',buffDur:0,
  },
  'SP15':
  {id:'SP15',nm:'Heavy Fire',lvl:3,effet:'Degats',desc:'Coup lourd. Repousse la cible.',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   dmgMin:21,dmgMax:25,
   pushCases:1,
   buff:'Gagne +20% dégats',buffDur:0,
  },
  'SP16':
  {id:'SP16',nm:'Heavy Fire',lvl:4,effet:'Degats',desc:'Coup lourd. Repousse la cible.',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:2,unlimited:false,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:23,dmgMax:27,
   pushCases:2,
   buff:'Gagne +30% dégats',buffDur:0,
  },
  'SP17':
  {id:'SP17',nm:'Long Range Fire',lvl:1,effet:'Degats',desc:'Tir éloigné',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:4,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:1,dmgMax:4,
  },
  'SP18':
  {id:'SP18',nm:'Long Range Fire',lvl:2,effet:'Degats',desc:'Tir éloigné',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:4,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:2,dmgMax:6,
  },
  'SP19':
  {id:'SP19',nm:'Long Range Fire',lvl:3,effet:'Degats',desc:'Tir éloigné',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:4,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:4,dmgMax:8,
  },
  'SP20':
  {id:'SP20',nm:'Long Range Fire',lvl:4,effet:'Degats',desc:'Tir éloigné',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:4,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:6,dmgMax:10,
  },
  'SP21':
  {id:'SP21',nm:'Heal',lvl:1,effet:'Soins',desc:'Restaure les PV allie proche.',
   dmgType:'-',stat:'Core',
   pa:6,minRange:0,range:0,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   soin:10,
  },
  'SP22':
  {id:'SP22',nm:'Heal',lvl:2,effet:'Soins',desc:'Restaure les PV allie proche.',
   dmgType:'-',stat:'Core',
   pa:5,minRange:0,range:0,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   soin:12,
  },
  'SP23':
  {id:'SP23',nm:'Heal',lvl:3,effet:'Soins',desc:'Restaure les PV allie proche.',
   dmgType:'-',stat:'Core',
   pa:4,minRange:0,range:1,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   soin:14,
  },
  'SP24':
  {id:'SP24',nm:'Heal',lvl:4,effet:'Soins',desc:'Restaure les PV allie proche.',
   dmgType:'-',stat:'Core',
   pa:3,minRange:0,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   soin:16,
  },
  'SP25':
  {id:'SP25',nm:'Mega Heal',lvl:1,effet:'Soins',desc:'Soins puissants + regeneration.',
   dmgType:'-',stat:'Core',
   pa:6,minRange:0,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   soin:20,
  },
  'SP26':
  {id:'SP26',nm:'Mega Heal',lvl:2,effet:'Soins',desc:'Soins puissants + regeneration.',
   dmgType:'-',stat:'Core',
   pa:6,minRange:0,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   soin:20,
   buff:'Gagne +5% résistances ',buffDur:0,
  },
  'SP27':
  {id:'SP27',nm:'Mega Heal',lvl:3,effet:'Soins',desc:'Soins puissants + regeneration.',
   dmgType:'-',stat:'Core',
   pa:5,minRange:0,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   soin:20,
   buff:'Gagne +10% résistances ',buffDur:0,
  },
  'SP28':
  {id:'SP28',nm:'Mega Heal',lvl:4,effet:'Soins',desc:'Soins puissants + regeneration.',
   dmgType:'-',stat:'Core',
   pa:4,minRange:0,range:2,unlimited:false,cd:2,
   aoe:'single',los:true,ligne:false,
   soin:20,
   buff:'Gagne +15% résistances ',buffDur:0,
  },
  'SP29':
  {id:'SP29',nm:'Teleport',lvl:1,effet:'Deplacement',desc:'Se teleporte sur case libre.',
   dmgType:'-',stat:'-',
   pa:4,minRange:0,range:0,unlimited:false,cd:4,
   aoe:'single',los:false,ligne:false,
  },
  'SP30':
  {id:'SP30',nm:'Teleport',lvl:2,effet:'Deplacement',desc:'Se teleporte sur case libre.',
   dmgType:'-',stat:'-',
   pa:4,minRange:0,range:0,unlimited:false,cd:4,
   aoe:'single',los:false,ligne:false,
  },
  'SP31':
  {id:'SP31',nm:'Teleport',lvl:3,effet:'Deplacement',desc:'Se teleporte sur case libre.',
   dmgType:'-',stat:'-',
   pa:4,minRange:0,range:0,unlimited:false,cd:3,
   aoe:'single',los:false,ligne:false,
  },
  'SP32':
  {id:'SP32',nm:'Push',lvl:1,effet:'Deplacement',desc:'Repousse un ennemi hors de portee.',
   dmgType:'Glitch',stat:'Protocol',
   pa:6,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:1,dmgMax:3,
   pushCases:1,
  },
  'SP33':
  {id:'SP33',nm:'Push',lvl:2,effet:'Deplacement',desc:'Repousse un ennemi hors de portee.',
   dmgType:'Glitch',stat:'Protocol',
   pa:5,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:2,dmgMax:6,
   pushCases:2,
  },
  'SP34':
  {id:'SP34',nm:'Push',lvl:3,effet:'Deplacement',desc:'Repousse un ennemi hors de portee.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:4,dmgMax:10,
   pushCases:2,
  },
  'SP35':
  {id:'SP35',nm:'Push',lvl:4,effet:'Deplacement',desc:'Repousse un ennemi hors de portee.',
   dmgType:'Glitch',stat:'Protocol',
   pa:3,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:6,dmgMax:12,
   pushCases:3,
  },
  'SP36':
  {id:'SP36',nm:'Poison',lvl:1,effet:'Degats / DoT',desc:'Empoisonne la cible. Degats sur la duree.',
   dmgType:'Neon',stat:'Core',
   pa:5,minRange:1,range:3,unlimited:true,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:1,dmgMax:3,
   debuff:"Applique poison 1 (Au début du tour de la cible, poison inflige 1 dégat Neon (base puissance de l'attaquant, stackable)",debuffDur:0,
  },
  'SP37':
  {id:'SP37',nm:'Poison',lvl:2,effet:'Degats / DoT',desc:'Empoisonne la cible. Degats sur la duree.',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:3,unlimited:true,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:2,dmgMax:6,
   debuff:"Applique poison 2 (Au début du tour de la cible, poison inflige 1 dégat Neon (base puissance de l'attaquant, stackable)",debuffDur:0,
  },
  'SP38':
  {id:'SP38',nm:'Poison',lvl:3,effet:'Degats / DoT',desc:'Empoisonne la cible. Degats sur la duree.',
   dmgType:'Neon',stat:'Core',
   pa:4,minRange:1,range:3,unlimited:true,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:4,dmgMax:10,
   debuff:"Applique poison 3 (Au début du tour de la cible, poison inflige 1 dégat Neon (base puissance de l'attaquant, stackable)",debuffDur:0,
  },
  'SP39':
  {id:'SP39',nm:'Poison',lvl:4,effet:'Degats / DoT',desc:'Empoisonne la cible. Degats sur la duree.',
   dmgType:'Neon',stat:'Core',
   pa:3,minRange:1,range:3,unlimited:true,cd:1,
   aoe:'single',los:true,ligne:false,
   dmgMin:6,dmgMax:12,
   debuff:"Applique poison 4 (Au début du tour de la cible, poison inflige 1 dégat Neon (base puissance de l'attaquant, stackable)",debuffDur:0,
  },
  'SP40':
  {id:'SP40',nm:'Explosion',lvl:1,effet:'Degats AoE',desc:'Explosion centree. Atteint toutes les cases adjacentes.',
   dmgType:'Plasma',stat:'Power',
   pa:6,minRange:1,range:3,unlimited:false,cd:2,
   aoe:'cross',los:true,ligne:false,
   dmgMin:1,dmgMax:5,
  },
  'SP41':
  {id:'SP41',nm:'Explosion',lvl:2,effet:'Degats AoE',desc:'Explosion centree. Atteint toutes les cases adjacentes.',
   dmgType:'Plasma',stat:'Power',
   pa:5,minRange:1,range:4,unlimited:false,cd:2,
   aoe:'cross',los:true,ligne:false,
   dmgMin:3,dmgMax:10,
  },
  'SP42':
  {id:'SP42',nm:'Explosion',lvl:3,effet:'Degats AoE',desc:'Explosion centree. Atteint toutes les cases adjacentes.',
   dmgType:'Plasma',stat:'Power',
   pa:5,minRange:1,range:4,unlimited:false,cd:1,
   aoe:'cross',los:true,ligne:false,
   dmgMin:5,dmgMax:13,
  },
  'SP43':
  {id:'SP43',nm:'Explosion',lvl:4,effet:'Degats AoE',desc:'Explosion centree. Atteint toutes les cases adjacentes.',
   dmgType:'Plasma',stat:'Power',
   pa:4,minRange:1,range:4,unlimited:true,cd:0,
   aoe:'cross',los:true,ligne:false,
   dmgMin:8,dmgMax:20,
  },
  'SP44':
  {id:'SP44',nm:'Lifesteal',lvl:1,effet:'Degats+Soin',desc:'Vole la vie de la cible.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:2,unlimited:false,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:3,dmgMax:8,
   soin:50,
   lifestealPct:0.5,
  },
  'SP45':
  {id:'SP45',nm:'Lifesteal',lvl:2,effet:'Degats+Soin',desc:'Vole la vie de la cible.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:5,dmgMax:10,
   soin:50,
   lifestealPct:0.5,
  },
  'SP46':
  {id:'SP46',nm:'Lifesteal',lvl:3,effet:'Degats+Soin',desc:'Vole la vie de la cible.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:8,dmgMax:12,
   soin:50,
   lifestealPct:0.5,
  },
  'SP47':
  {id:'SP47',nm:'Lifesteal',lvl:4,effet:'Degats+Soin',desc:'Vole la vie de la cible.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:1,range:2,unlimited:true,cd:0,
   aoe:'single',los:true,ligne:false,
   dmgMin:10,dmgMax:14,
   soin:50,
   lifestealPct:0.5,
  },
  'SP48':
  {id:'SP48',nm:'Mine',lvl:1,effet:'Zone controle',desc:'Pose une zone active. Degats a chaque tour.',
   dmgType:'Glitch',stat:'Protocol',
   pa:5,minRange:0,range:3,unlimited:false,cd:3,
   aoe:'oui',los:false,ligne:false,
  },
  'SP49':
  {id:'SP49',nm:'Mine',lvl:2,effet:'Zone controle',desc:'Pose une zone active. Degats a chaque tour.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:0,range:4,unlimited:false,cd:3,
   aoe:'oui',los:false,ligne:false,
  },
  'SP50':
  {id:'SP50',nm:'Mine',lvl:3,effet:'Zone controle',desc:'Pose une zone active. Degats a chaque tour.',
   dmgType:'Glitch',stat:'Protocol',
   pa:4,minRange:0,range:5,unlimited:false,cd:3,
   aoe:'oui',los:false,ligne:false,
  },
  'SP51':
  {id:'SP51',nm:'Mine',lvl:4,effet:'Zone controle',desc:'Pose une zone active. Degats a chaque tour.',
   dmgType:'Glitch',stat:'Protocol',
   pa:3,minRange:0,range:5,unlimited:false,cd:3,
   aoe:'oui',los:false,ligne:false,
  },
  'SP52':
  {id:'SP52',nm:'Straight shot',lvl:1,effet:'Degats ligne',desc:'Tir en ligne. Atteint toutes cibles alignees.',
   dmgType:'Neon',stat:'Power',
   pa:3,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'oui',los:true,ligne:true,
   dmgMin:1,dmgMax:5,
   debuff:'Gagne +10% dégats à distance',debuffDur:0,
  },
  'SP53':
  {id:'SP53',nm:'Straight shot',lvl:2,effet:'Degats ligne',desc:'Tir en ligne. Atteint toutes cibles alignees.',
   dmgType:'Neon',stat:'Power',
   pa:3,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'oui',los:true,ligne:true,
   dmgMin:3,dmgMax:10,
   debuff:'Gagne +20% dégats à distance',debuffDur:0,
  },
  'SP54':
  {id:'SP54',nm:'Straight shot',lvl:3,effet:'Degats ligne',desc:'Tir en ligne. Atteint toutes cibles alignees.',
   dmgType:'Neon',stat:'Power',
   pa:3,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'oui',los:true,ligne:true,
   dmgMin:5,dmgMax:13,
   debuff:'Gagne +30% dégats à distance',debuffDur:0,
  },
  'SP55':
  {id:'SP55',nm:'Straight shot',lvl:4,effet:'Degats ligne',desc:'Tir en ligne. Atteint toutes cibles alignees.',
   dmgType:'Neon',stat:'Power',
   pa:3,minRange:1,range:1,unlimited:true,cd:0,
   aoe:'oui',los:true,ligne:true,
   dmgMin:8,dmgMax:20,
   debuff:'Gagne +40% dégats à distance',debuffDur:0,
  },
  'SP56':
  {id:'SP56',nm:'Bot Deployment',lvl:1,effet:'Buff esquive',desc:'Leurre holographique. Esquive elevee au prochain tour.',
   dmgType:'-',stat:'-',
   pa:6,minRange:1,range:1,unlimited:false,cd:4,
   aoe:'single',los:false,ligne:false,
   invocMobId:'MO01',invocLvl:4,
  },
  'SP57':
  {id:'SP57',nm:'Bot Deployment',lvl:2,effet:'Buff esquive',desc:'Leurre holographique. Esquive elevee au prochain tour.',
   dmgType:'-',stat:'-',
   pa:6,minRange:1,range:1,unlimited:false,cd:3,
   aoe:'single',los:false,ligne:false,
   invocMobId:'MO01',invocLvl:6,
  },
  'SP58':
  {id:'SP58',nm:'Bot Deployment',lvl:3,effet:'Buff esquive',desc:'Leurre holographique. Esquive elevee au prochain tour.',
   dmgType:'-',stat:'-',
   pa:5,minRange:1,range:1,unlimited:false,cd:2,
   aoe:'single',los:false,ligne:false,
   invocMobId:'MO01',invocLvl:8,
  },
  'SP59':
  {id:'SP59',nm:'Bot Deployment',lvl:4,effet:'Buff esquive',desc:'Leurre holographique. Esquive elevee au prochain tour.',
   dmgType:'-',stat:'-',
   pa:4,minRange:1,range:1,unlimited:false,cd:2,
   aoe:'single',los:false,ligne:false,
   invocMobId:'MO01',invocLvl:10,
  },
};

// ── MOB DEFS ─────────────────────────────────────────────────────
var MOB_DEFS = [
  {id:'MO01',nm:'Recycled bot',lore1:'Bot',lore2:'',boss:false,lvMin:2,lvMax:8,spells:['SP01'],base:{hp:50.0,pa:6,pm:2,init:10.0,power:8.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:1,xpMax:10,crMin:1,crMax:10,resPlas:0.0,resNeon:0.0,resGlitch:0.0,resNegate:0.0},asset:'assets/enemies/mo01'},
  {id:'MO02',nm:'Surveillance Drone',lore1:'Bot',lore2:'Starter',boss:false,lvMin:6,lvMax:14,spells:['SP01'],base:{hp:100.0,pa:6,pm:2,init:20.0,power:10.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo02'},
  {id:'MO03',nm:'Retired robot maker',lore1:'Bot',lore2:'',boss:true,lvMin:6,lvMax:14,spells:['SP09', 'SP56'],base:{hp:90.0,pa:6,pm:2,init:20.0,power:0,core:8.0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo03'},
  {id:'MO04',nm:'Bot M-36',lore1:'Bot',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP01', 'SP40'],base:{hp:160.0,pa:6,pm:2,init:40.0,power:10.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo04'},
  {id:'MO05',nm:'Enduring rebel',lore1:'Rebel',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP01'],base:{hp:110.0,pa:6,pm:2,init:20.0,power:12.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo05'},
  {id:'MO06',nm:'Civilian guerrilla squad',lore1:'Rebel',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP01'],base:{hp:140.0,pa:6,pm:2,init:40.0,power:12.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo06'},
  {id:'MO07',nm:'Slave of the wastelands',lore1:'Underground',lore2:'',boss:false,lvMin:2,lvMax:8,spells:['SP01'],base:{hp:60.0,pa:6,pm:2,init:10.0,power:10.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:1,xpMax:10,crMin:1,crMax:10,resPlas:0.0,resNeon:0.0,resGlitch:0.0,resNegate:0.0},asset:'assets/enemies/mo07'},
  {id:'MO08',nm:'Agressive hobo',lore1:'Underground',lore2:'',boss:false,lvMin:2,lvMax:8,spells:['SP01'],base:{hp:50.0,pa:6,pm:2,init:10.0,power:10.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:1,xpMax:10,crMin:1,crMax:10,resPlas:0.0,resNeon:0.0,resGlitch:0.0,resNegate:0.0},asset:'assets/enemies/mo08'},
  {id:'MO09',nm:'Wasteland Marksman',lore1:'Underground',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP01'],base:{hp:90.0,pa:6,pm:2,init:20.0,power:10.0,core:0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo09'},
  {id:'MO11',nm:'Mad scientist',lore1:'Underground',lore2:'',boss:true,lvMin:18,lvMax:30,spells:['SP01', 'SP41'],base:{hp:250.0,pa:6,pm:2,init:80.0,power:20.0,core:0,protocol:0,cc:0.05,esq:0.05,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:40,xpMax:80,crMin:40,crMax:80,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo11'},
  {id:'MO12',nm:'Civil protector',lore1:'Corp',lore2:'',boss:false,lvMin:2,lvMax:8,spells:['SP09'],base:{hp:60.0,pa:6,pm:2,init:10.0,power:0,core:10.0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:1,xpMax:10,crMin:1,crMax:10,resPlas:0.0,resNeon:0.0,resGlitch:0.0,resNegate:0.0},asset:'assets/enemies/mo12'},
  {id:'MO14',nm:'Tax enforcers',lore1:'Corp',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP09', 'SP52'],base:{hp:100.0,pa:6,pm:2,init:20.0,power:0,core:10.0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo14'},
  {id:'MO15',nm:'Devoted citizen',lore1:'Corp',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP09'],base:{hp:100.0,pa:6,pm:2,init:20.0,power:0,core:10.0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo15'},
  {id:'MO16',nm:'Light speeder',lore1:'Corp',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP09', 'SP13'],base:{hp:150.0,pa:6,pm:2,init:40.0,power:0,core:10.0,protocol:0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo16'},
  {id:'MO17',nm:'World magnate',lore1:'Corp',lore2:'',boss:true,lvMin:18,lvMax:30,spells:['SP09', 'SP52'],base:{hp:250.0,pa:6,pm:2,init:80.0,power:0,core:20.0,protocol:0,cc:0.05,esq:0.05,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:40,xpMax:80,crMin:40,crMax:80,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo17'},
  {id:'MO18',nm:'Distracting ad',lore1:'Holo',lore2:'Starter',boss:false,lvMin:2,lvMax:8,spells:['SP17'],base:{hp:40.0,pa:6,pm:2,init:10.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.02,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.1,respm:0.1,xpMin:1,xpMax:10,crMin:1,crMax:10,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo18'},
  {id:'MO19',nm:'Eternal illusionist',lore1:'Holo',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP17', 'SP32'],base:{hp:110.0,pa:6,pm:2,init:20.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.02,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.1,respm:0.1,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo19'},
  {id:'MO20',nm:"King's spiritual guard",lore1:'Holo',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP17', 'SP48'],base:{hp:110.0,pa:6,pm:2,init:20.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.02,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.1,respm:0.1,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo20'},
  {id:'MO22',nm:'Holo master',lore1:'Holo',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP17', 'SP44'],base:{hp:140.0,pa:6,pm:2,init:40.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.02,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.1,respm:0.1,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:10.0,resNeon:10.0,resGlitch:10.0,resNegate:0.0},asset:'assets/enemies/mo22'},
  {id:'MO24',nm:'Radioactive butterfly',lore1:'Underground',lore2:'',boss:false,lvMin:6,lvMax:14,spells:['SP17', 'SP44'],base:{hp:90.0,pa:6,pm:2,init:20.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:10,xpMax:20,crMin:10,crMax:20,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo24'},
  {id:'MO25',nm:'Cyberminded bug',lore1:'Underground',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP17', 'SP44'],base:{hp:140.0,pa:6,pm:2,init:40.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo25'},
  {id:'MO26',nm:'Irradiated soldier',lore1:'Underground',lore2:'',boss:false,lvMin:12,lvMax:20,spells:['SP17', 'SP32', 'SP48'],base:{hp:140.0,pa:6,pm:2,init:40.0,power:0,core:0,protocol:10.0,cc:0.01,esq:0.01,invoc:1,soin:1.0,rgn:0.0,thorn:0.0,lifesteal:0.0,respa:0.01,respm:0.01,xpMin:20,xpMax:40,crMin:20,crMax:40,resPlas:5.0,resNeon:5.0,resGlitch:5.0,resNegate:0.0},asset:'assets/enemies/mo26'},
];

// ── INVOC DEFS ───────────────────────────────────────────────────
// Stats prédéfinies des unités invoquées (5 niveaux).
// Liées aux sorts via sp.invocDefId + sp.invocLvl.
// Lv1 des invocations = stats de base du mob de référence (pas de scaling x%).
var INVOC_DEFS = {
  'INV01': {
    nm: 'Recycled bot', mobCode: 'MO01',
    lvStats: [
      {hp:50,  atk:8,  pa:6, pm:2, init:10},
      {hp:65,  atk:10, pa:6, pm:2, init:12},
      {hp:85,  atk:12, pa:6, pm:2, init:14},
      {hp:110, atk:15, pa:6, pm:3, init:16},
      {hp:140, atk:18, pa:6, pm:3, init:20},
    ]
  }
};

var BOUT = STUFF_DEFS.map(function(d){
  var st={};
  (d.stats||[]).forEach(function(s){st[s.key]=s.max;});
  var rarMap={1:'c',2:'r',3:'e'};
  return {id:d.id,sl:d.sl,nm:d.nm,icon:d.icon,rar:rarMap[d.rar]||'c',
    cost:0,costCr:d.lrq*100,lrq:d.lrq,st:st};
});


var SELL = {c:30,p:80,r:300,e:1000,l:4000};
var RAR   = {c:{lbl:'Commun',cls:'rc',m:1.0},p:{lbl:'Peu commun',cls:'rp',m:1.6},r:{lbl:'Rare',cls:'rb',m:2.8},e:{lbl:'Épique',cls:'re',m:5.0},l:{lbl:'Légend.',cls:'rl',m:9.0}};
var RAR_K = ['c','p','r','e','l'];
var RAR_W = [50,30,14,5,1];
var RAR_WL= [55,30,15,0,0];

var SDEF = [
  {id:'power',   nm:'Power',    icon:'🔥', d:'+3% DMG Plasma · +0.5% CC · Init'},
  {id:'core',    nm:'Core',     icon:'💠', d:'+3% DMG Neon · +10 PV (Vitalité) · Soins'},
  {id:'protocol',nm:'Protocol', icon:'⚙️', d:'+3% DMG Glitch · ESQpa/ESQpm · Init'},
];

// ================================================================
// SPELL TREES — Arbres de sorts par héros
// Chaque arbre représente un type de dégâts (Plasma / Glitch / Neon)
// Nœuds: row/col = position, prereqs = IDs à débloquer d'abord
// ================================================================
var SPELL_TREES = {
  warden: [],
  hacker: [],
  berserker: [
    {
      id:'berserk', name:'Berserk', color:'#ef4444', icon:'🔥',
      desc:'Arbre de sorts Berserker — dégâts directs intenses et attaque brute.',
      nodes:[
        // row 0
        {id:'SPH01',  row:0, col:2, cost:1, prereqs:[], passive:false,
         name:'Punch', icon:'⚡', maxLv:5,
         pa:4, range:1, minRange:1, aoe:'single', dmgType:'Plasma', stat:'power',
         dmgMin:2, dmgMax:6, type:'burst',
         lvStats:[
           {pa:4, dmgMin:2,  dmgMax:6},
           {pa:4, dmgMin:4,  dmgMax:8},
           {pa:4, dmgMin:6,  dmgMax:10},
           {pa:3, dmgMin:8,  dmgMax:12},
           {pa:3, dmgMin:10, dmgMax:15},
         ],
         desc:'Frappe Plasma adjacente. 2–6 dégâts.'},

        // row 1
        {id:'SPH100', row:1, col:1, cost:1, prereqs:['SPH01'], passive:false,
         name:'Missed target', icon:'🎯', maxLv:5,
         pa:4, range:2, minRange:1, aoe:'single', dmgType:'Plasma', stat:'power',
         dmgMin:1, dmgMax:4, type:'burst', cdMax:1,
         lvStats:[
           {pa:4, dmgMin:1, dmgMax:4,  range:2, cdMax:1},
           {pa:4, dmgMin:2, dmgMax:6,  range:2, cdMax:1},
           {pa:4, dmgMin:3, dmgMax:8,  range:3, cdMax:1},
           {pa:3, dmgMin:4, dmgMax:10, range:3, cdMax:1},
           {pa:3, dmgMin:5, dmgMax:12, range:3, cdMax:0},
         ],
         desc:'Frappe imprévisible. 1–4 dégâts Plasma. CD: 1.'},
        {id:'SPP61',  row:1, col:3, cost:1, prereqs:['SPH01'], passive:true, hybrid:'protocol',
         name:'Farmer', icon:'🌾', maxLv:5,
         stat:'loot', bonus:{loot:0.05},
         lvStats:[
           {bonus:{loot:0.05}},
           {bonus:{loot:0.07}},
           {bonus:{loot:0.09}},
           {bonus:{loot:0.12}},
           {bonus:{loot:0.15}},
         ],
         desc:'PASSIF — +5% Loot par niveau.'},

        // row 2
        {id:'SPH271', row:2, col:0, cost:1, prereqs:['SPH100'], passive:false, hybrid:'neon',
         name:'Shockwave', icon:'💢', maxLv:5,
         pa:6, range:1, minRange:1, aoe:'splash1', dmgType:'Plasma', stat:'power',
         dmgMin:1, dmgMax:2, type:'burst', knockback:1, cdMax:3,
         lvStats:[
           {pa:6, dmgMin:1, dmgMax:2, range:1, cdMax:3},
           {pa:5, dmgMin:2, dmgMax:3, range:1, cdMax:3},
           {pa:5, dmgMin:3, dmgMax:4, range:2, cdMax:3},
           {pa:4, dmgMin:4, dmgMax:6, range:2, cdMax:2},
           {pa:4, dmgMin:5, dmgMax:8, range:2, cdMax:2},
         ],
         desc:'Onde de choc. Dégâts + repousse adjacents.'},
        {id:'SPH70',  row:2, col:2, cost:1, prereqs:['SPH100','SPP61'], passive:false,
         name:'Grip of steel', icon:'🤜', maxLv:5,
         pa:5, range:1, minRange:1, aoe:'single', dmgType:'Plasma', stat:'power',
         dmgMin:10, dmgMax:15, type:'burst', cdMax:2,
         lvStats:[
           {pa:5, dmgMin:10, dmgMax:15, cdMax:2},
           {pa:5, dmgMin:12, dmgMax:18, cdMax:2},
           {pa:4, dmgMin:14, dmgMax:21, cdMax:2},
           {pa:4, dmgMin:16, dmgMax:24, cdMax:1},
           {pa:3, dmgMin:18, dmgMax:28, cdMax:1},
         ],
         desc:'Saisit l\'ennemi. Dégâts Plasma. CD: 2.'},
        {id:'SPH56',  row:2, col:4, cost:1, prereqs:['SPP61'], passive:false, hybrid:'protocol',
         name:'Bot Deployment', icon:'🤖', maxLv:5,
         pa:6, range:1, minRange:1, aoe:'single', dmgType:'Glitch', stat:'protocol',
         dmgMin:0, dmgMax:0, type:'invoc', invocMobId:'MO01', invocDefId:'INV01', maxInvoc:1, cdMax:4,
         lvStats:[
           {pa:6, cdMax:4, invocLvl:1},
           {pa:6, cdMax:3, invocLvl:2},
           {pa:5, cdMax:2, invocLvl:3},
           {pa:4, cdMax:2, invocLvl:4},
           {pa:3, cdMax:1, invocLvl:5},
         ],
         desc:'Déploie un bot allié.'},

        // row 3 — nœud central passif
        {id:'SPP46',  row:3, col:2, cost:1, prereqs:['SPH271','SPH56'], passive:true, hybrid:'protocol',
         name:'Power Core', icon:'🔋', maxLv:5,
         stat:'power', bonus:{power:5},
         lvStats:[
           {bonus:{power:5}},
           {bonus:{power:8}},
           {bonus:{power:15}},
           {bonus:{power:25}},
           {bonus:{power:40}},
         ],
         desc:'PASSIF — +Power permanent par niveau.'},

        // row 4
        {id:'SPH40',  row:4, col:1, cost:1, prereqs:['SPP46'], passive:false, hybrid:'neon',
         name:'Explosion', icon:'💥', maxLv:5,
         pa:6, range:3, minRange:1, aoe:'splash1', dmgType:'Plasma', stat:'power',
         dmgMin:1, dmgMax:5, type:'burst', cdMax:2,
         lvStats:[
           {pa:6, dmgMin:1,  dmgMax:5,  range:3, cdMax:2},
           {pa:5, dmgMin:3,  dmgMax:10, range:4, cdMax:2},
           {pa:5, dmgMin:5,  dmgMax:13, range:4, cdMax:1},
           {pa:4, dmgMin:8,  dmgMax:20, range:4, cdMax:0},
           {pa:4, dmgMin:12, dmgMax:25, range:5, cdMax:0},
         ],
         desc:'Explosion AoE Plasma. CD: 2.'},
        {id:'SPH36',  row:4, col:3, cost:1, prereqs:['SPP46'], passive:false, hybrid:'protocol',
         name:'Poison', icon:'☣️', maxLv:5,
         pa:5, range:3, minRange:1, aoe:'single', dmgType:'Neon', stat:'core',
         dmgMin:1, dmgMax:3, type:'dot', cdMax:1, dur:3,
         lvStats:[
           {pa:5, dmgMin:1, dmgMax:3,  range:3, cdMax:1},
           {pa:4, dmgMin:2, dmgMax:6,  range:3, cdMax:1},
           {pa:4, dmgMin:4, dmgMax:10, range:3, cdMax:1},
           {pa:3, dmgMin:6, dmgMax:12, range:3, cdMax:1},
           {pa:3, dmgMin:8, dmgMax:14, range:4, cdMax:1},
         ],
         desc:'Empoisonne. Dégâts Neon/tour. CD: 1.'},

        // row 5
        {id:'SPH75',  row:5, col:0, cost:1, prereqs:['SPH40'], passive:false, hybrid:'neon',
         name:'Nano shield', icon:'🛡️', maxLv:5,
         pa:6, range:1, minRange:0, aoe:'single', stat:'core',
         dmgMin:0, dmgMax:0, type:'buff', cdMax:3,
         lvStats:[
           {pa:6, range:1, cdMax:3},
           {pa:5, range:1, cdMax:3},
           {pa:5, range:2, cdMax:3},
           {pa:4, range:2, cdMax:2},
           {pa:4, range:3, cdMax:2},
         ],
         desc:'Bouclier Nano sur soi ou allié. CD: 3.'},
        {id:'SPH05',  row:5, col:1, cost:1, prereqs:['SPH40'], passive:false, hybrid:'neon',
         name:'Mega Punch', icon:'👊', maxLv:5,
         pa:5, range:1, minRange:1, aoe:'single', dmgType:'Plasma', stat:'power',
         dmgMin:18, dmgMax:22, type:'burst', cdMax:2,
         lvStats:[
           {pa:5, dmgMin:18, dmgMax:22, cdMax:2},
           {pa:5, dmgMin:20, dmgMax:24, cdMax:2},
           {pa:4, dmgMin:22, dmgMax:26, cdMax:2},
           {pa:4, dmgMin:24, dmgMax:28, cdMax:1},
           {pa:3, dmgMin:26, dmgMax:32, cdMax:1},
         ],
         desc:'Frappe Plasma dévastatrice. CD: 2.'},
        {id:'SPH52',  row:5, col:3, cost:1, prereqs:['SPH36'], passive:false, hybrid:'protocol',
         name:'Straight shot', icon:'➡️', maxLv:5,
         pa:3, range:3, minRange:1, aoe:'ligne2', dmgType:'Neon', stat:'core',
         dmgMin:1, dmgMax:5, type:'burst',
         lvStats:[
           {pa:3, dmgMin:1,  dmgMax:5},
           {pa:3, dmgMin:3,  dmgMax:10},
           {pa:3, dmgMin:5,  dmgMax:13},
           {pa:3, dmgMin:8,  dmgMax:20},
           {pa:2, dmgMin:10, dmgMax:24},
         ],
         desc:'Tir en ligne Neon.'},
        {id:'SPH44',  row:5, col:4, cost:1, prereqs:['SPH36'], passive:false, hybrid:'protocol',
         name:'Lifesteal', icon:'🩸', maxLv:5,
         pa:4, range:2, minRange:1, aoe:'single', dmgType:'Glitch', stat:'protocol',
         dmgMin:3, dmgMax:8, type:'burst', cdMax:0, lifesteal:0.5,
         lvStats:[
           {pa:4, dmgMin:3,  dmgMax:8,  lifesteal:0.5},
           {pa:4, dmgMin:5,  dmgMax:10, lifesteal:0.5},
           {pa:4, dmgMin:8,  dmgMax:12, lifesteal:0.5},
           {pa:4, dmgMin:10, dmgMax:14, lifesteal:0.5},
           {pa:3, dmgMin:12, dmgMax:18, lifesteal:0.6},
         ],
         desc:'Vol de vie. Dégâts Glitch, soigne X%.'},

        // row 6 — terminal
        {id:'SPH48',  row:6, col:2, cost:2, prereqs:['SPH05','SPH52'], passive:false,
         name:'Mine', icon:'💣', maxLv:5,
         pa:5, range:3, minRange:0, aoe:'single', dmgType:'Glitch', stat:'protocol',
         dmgMin:4, dmgMax:5, type:'mine', cdMax:3,
         lvStats:[
           {pa:5, dmgMin:4,  dmgMax:5,  range:3, cdMax:3},
           {pa:4, dmgMin:5,  dmgMax:7,  range:4, cdMax:3},
           {pa:4, dmgMin:6,  dmgMax:9,  range:5, cdMax:3},
           {pa:3, dmgMin:7,  dmgMax:11, range:5, cdMax:3},
           {pa:3, dmgMin:9,  dmgMax:13, range:6, cdMax:2},
         ],
         desc:'Pose une mine piège. CD: 3.'},
      ],
      links:[
        ['SPH01','SPH100'], ['SPH01','SPP61'],
        ['SPH100','SPH271'], ['SPH100','SPH70'],
        ['SPP61','SPH70'],   ['SPP61','SPH56'],
        ['SPH271','SPP46'],  ['SPH56','SPP46'],
        ['SPH271','SPH75'],  ['SPH56','SPH44'],
        ['SPP46','SPH40'],   ['SPP46','SPH36'],
        ['SPH40','SPH75'],   ['SPH40','SPH05'],
        ['SPH36','SPH52'],   ['SPH36','SPH44'],
        ['SPH05','SPH48'],   ['SPH52','SPH48'],
      ]
    }
  ]
};

// ── PANOPLIES ────────────────────────────────────────────────────────────────
var PANO_DEFS = {
  'Starter Kit': {
    nm: 'Starter Kit',
    items: ['S04', 'S21', 'S26', 'S31'],
    bonuses: [
      { req: 2, label: '+5% Loot',                      stats: { loot: 0.05 } },
      { req: 3, label: '+5% Loot, +5% Crédits',         stats: { loot: 0.05, credits: 0.05 } },
      { req: 4, label: '+5% Loot, +5% Crédits, +5% XP', stats: { loot: 0.05, credits: 0.05, xp: 0.05 } },
    ]
  },
};

// Compter les items d'une panoplie actuellement équipés
function panoEquippedCount(panoNm) {
  var def = PANO_DEFS[panoNm]; if (!def) return 0;
  return def.items.filter(function(id) {
    return EQ_SLOTS.some(function(sl) {
      var uid = META.eq[sl]; if (!uid) return false;
      var it = byUid(uid); return it && it.id === id;
    });
  }).length;
}

// Retourner les bonus panoplie actifs pour un niveau d'équipement donné
function panoActiveBonus(panoNm) {
  var count = panoEquippedCount(panoNm);
  var def = PANO_DEFS[panoNm]; if (!def) return null;
  var active = null;
  def.bonuses.forEach(function(b) { if (count >= b.req) active = b; });
  return active;
}


// ── SPARE PARTS — pièces détachées utilisées dans les crafts ────────────────
var SPARE_PARTS = [
  { id:'SP01', nm:'Disque Dur Corrompu', nm_en:'Corrupted Hard Drive', img:'assets/items/spare/SP01.png', icon:'💾',
    lrq:5,  rar:1, scanMin:10, dropRate:0.05, sell:50,
    dropMobs:'all', craftable:false,
    usedIn:['S04'] },
  { id:'SP02', nm:'Clé Mémoire',         nm_en:'Memory Stick',         img:'assets/items/spare/SP02.png', icon:'🔑',
    lrq:5,  rar:1, scanMin:10, dropRate:0.05, sell:50,
    dropMobs:'all', craftable:false,
    usedIn:['S04','S21'] },
  { id:'SP03', nm:'GPU Quantique',        nm_en:'Quantum GPU',          img:'assets/items/spare/SP03.png', icon:'🖥️',
    lrq:10, rar:1, scanMin:10, dropRate:0.05, sell:100,
    dropMobs:'all', craftable:false,
    usedIn:['S21','S26'] },
  { id:'SP18', nm:'Pièce Métallique',     nm_en:'Metal Scrap',          img:'assets/items/spare/SP18.png', icon:'🔧',
    lrq:10, rar:1, scanMin:10, dropRate:0.05, sell:100,
    dropMobs:'all', craftable:false,
    usedIn:['S26','S31'] },
  { id:'SP19', nm:'Pièce Plastique',      nm_en:'Plastic Part',         img:'assets/items/spare/SP19.png', icon:'🧩',
    lrq:15, rar:1, scanMin:10, dropRate:0.05, sell:150,
    dropMobs:'all', craftable:false,
    usedIn:['S31'] },
  { id:'SP26', nm:'Coque de Drone',       nm_en:'Drone Shell',          img:'assets/items/spare/SP26.png', icon:'🚁',
    lrq:15, rar:1, scanMin:10, dropRate:0.05, sell:150,
    dropMobs:'all', craftable:false,
    usedIn:[] },
  { id:'SP40', nm:'Jetons Crypto',        nm_en:'Crypto Tokens',        img:'assets/items/spare/SP40.png', icon:'🪙',
    lrq:20, rar:1, scanMin:50, dropRate:1.00, sell:200,
    dropMobs:'MO01', craftable:false,
    usedIn:[] },
];

// Helper: trouver une spare part par nom FR
function spareByName(nm) {
  return SPARE_PARTS.find(function(s){ return s.nm === nm; });
}

// ── CRAFT_RECIPES — recettes de forge pour les 4 items Starter Kit ───────────
var CRAFT_RECIPES = [
  { id:'CR_S04', resultId:'S04', nm:'Taser',
    ingredients:[
      { partId:'SP01', partNm:'Disque Dur Corrompu', qty:2 },
      { partId:'SP02', partNm:'Clé Mémoire',         qty:2 },
    ]},
  { id:'CR_S21', resultId:'S21', nm:'Casque léger',
    ingredients:[
      { partId:'SP02', partNm:'Clé Mémoire',   qty:2 },
      { partId:'SP03', partNm:'GPU Quantique',  qty:2 },
    ]},
  { id:'CR_S26', resultId:'S26', nm:'Chaussures de Sprint',
    ingredients:[
      { partId:'SP03', partNm:'GPU Quantique',    qty:2 },
      { partId:'SP18', partNm:'Pièce Métallique', qty:2 },
    ]},
  { id:'CR_S31', resultId:'S31', nm:'Œil Cybernétique Overclock',
    ingredients:[
      { partId:'SP18', partNm:'Pièce Métallique', qty:2 },
      { partId:'SP19', partNm:'Pièce Plastique',  qty:2 },
    ]},
];


// ================================================================
// DONNÉES HEX BATTLE — mobs et sorts (partagés avec hexBattle.js)
// ================================================================
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
  'SP56': { id:'SP56', name:'Bot Deploy',      dmgType:null,     pa:6, minRange:1, range:1, cdMax:4, aoe:'single', invoc:'MO01', invocDefId:'INV01', invocLvl:1, maxInvoc:1 },
};
function hbSpellFromId(spId) {
  var base = HB_MOB_SPELLS[spId];
  if (!base) return null;
  return Object.assign({}, base, { cd: 0 });
}
