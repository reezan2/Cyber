# Structure Assets — CyberIdle

## Arborescence

```
assets/
├── bg/                        # Fonds d'écran génériques (accueil, menus)
│
├── enemies/
│   ├── run/                   # Portraits ennemis mode Run
│   │   ├── drone.png
│   │   ├── merc.png
│   │   └── heavy.png
│   ├── duel/                  # Portraits ennemis mode Duel
│   │   └── *.png
│   └── hex/                   # Sprites hex par mob (sous-dossier par code)
│       ├── MO01/
│       │   ├── MO01_run_s.png
│       │   ├── MO01_run_sw.png
│       │   ├── MO01_run_se.png
│       │   ├── MO01_run_ne.png
│       │   ├── MO01_run_nw.png
│       │   ├── MO01_attack_s.png
│       │   ├── MO01_attack_sw.png
│       │   ├── MO01_attack_se.png
│       │   ├── MO01_attack_ne.png
│       │   ├── MO01_attack_nw.png
│       │   ├── MO01_die_s.png
│       │   ├── MO01_die_sw.png
│       │   ├── MO01_die_se.png
│       │   ├── MO01_die_ne.png
│       │   └── MO01_die_nw.png
│       └── MO##/ ...          # Même structure pour chaque mob (MO01–MO26)
│
├── heroes/                    # Portraits statiques + sprites directionnels
│   ├── berserker.png              ← Portrait fallback (menus, HUD)
│   ├── berserker_face.png         ← Fallback ancien système (hex SE/SW)
│   ├── berserker_face_left.png    ← Fallback (hex W)
│   ├── berserker_face_right.png   ← Fallback (hex E)
│   ├── berserker_back_left.png    ← Fallback (hex NW)
│   ├── berserker_back_right.png   ← Fallback (hex NE)
│   ├── warden.png                 ← Portrait Warden
│   ├── HE01/                      ← Sprites directionnels Berserker
│   │   ├── HE01_run_s.png
│   │   ├── HE01_run_sw.png
│   │   ├── HE01_run_se.png
│   │   ├── HE01_run_ne.png
│   │   ├── HE01_run_nw.png
│   │   ├── HE01_attack_s.png
│   │   ├── HE01_attack_sw.png
│   │   ├── HE01_attack_se.png
│   │   ├── HE01_attack_ne.png
│   │   ├── HE01_attack_nw.png
│   │   ├── HE01_die_s.png
│   │   ├── HE01_die_sw.png
│   │   ├── HE01_die_se.png
│   │   ├── HE01_die_ne.png
│   │   └── HE01_die_nw.png
│   └── HE02/                      ← Sprites directionnels Warden (à créer)
│       └── HE02_*.png
│
├── hexmaps/                   # Fonds de maps hex (PNG 1024×768 min)
│   ├── corridor.png
│   ├── corridor2.png
│   ├── plaza.png
│   └── rooftops.png
│
├── items/                     # Icônes items par slot et rareté
│   ├── arme/
│   │   ├── c.png  (Commun)
│   │   ├── p.png  (Peu commun)
│   │   ├── r.png  (Rare)
│   │   ├── e.png  (Épique)
│   │   └── l.png  (Légendaire)
│   ├── armure/    (mêmes 5 raretés)
│   ├── casque/    (mêmes 5 raretés)
│   ├── chaussures/(mêmes 5 raretés)
│   └── implant/   (mêmes 5 raretés)
│
└── spells/                    # Icônes sorts (par arbre ou ID)
    └── *.png
```

---

## Conventions

| Champ | Règle |
|---|---|
| Format | PNG fond transparent |
| Héros portraits | 256×256 px |
| Héros sprites hex | 256×256 px, personnage centré, pieds dans le tiers bas |
| Hex maps | 1024×768 min, ratio 4:3 ou 16:9, palette sombre |
| Items | 64×64 px ou 128×128 px, fond transparent |
| Sorts | 64×64 px, fond transparent |

---

## Convention de nommage sprites hex

```
{CODE}_{anim}_{dir}.png
```

| Segment | Valeurs |
|---|---|
| `CODE` | `HE01`, `HE02` (héros) — `MO01`–`MO26` (mobs) |
| `anim` | `run`, `attack`, `die` |
| `dir` | `s`, `sw`, `se`, `ne`, `nw` |

Chaque code a son propre sous-dossier : `assets/enemies/hex/{CODE}/` ou `assets/heroes/{CODE}/`

---

## Correspondance direction hex ↔ suffixe fichier

| Facing (`unit.facing`) | Fichier `dir` | Angle visuel |
|---|---|---|
| `se` | `s` | Face caméra (vers le bas) |
| `sw` | `sw` | Face caméra gauche |
| `e`  | `se` | Profil droit |
| `w`  | `nw` | Profil gauche |
| `ne` | `ne` | 3/4 dos droit |
| `nw` | `nw` | 3/4 dos gauche |

Défini dans `HB_DIR_MAP` (hexBattle.js).

---

## Fallback rendering

Si le fichier sprite directionnel n'est pas chargé :
1. Héros → ancien sprite statique (`hd.sprites[facing]`) puis `hd.portrait`
2. Mob → portrait statique `unit.img` (`assets/enemies/hex/MO##.png`)
3. Défaut → fond coloré + icône emoji

---

## Mapping héros id → code

| `META.heroId` | Code asset | Dossier |
|---|---|---|
| `berserker` | `HE01` | `assets/heroes/HE01/` |
| `warden`    | `HE02` | `assets/heroes/HE02/` |

Défini dans `HB_HERO_CODE` (hexBattle.js).

---

## Items — convention de nommage

Les icônes sont sélectionnées dynamiquement par `sl` (slot) et `rar` (rareté) :
```
assets/items/{sl}/{rar}.png
```
Exemple : `assets/items/arme/e.png` = icône arme épique.

---

## À créer

- `assets/hexmaps/corridor2.png` — fond carte Ruelle Néon
- `assets/items/*/c|p|r|e|l.png` — 25 icônes items (5 slots × 5 raretés)
- `assets/spells/*.png` — icônes sorts arbre Berserker
- `assets/heroes/HE02/*.png` — sprites directionnels Warden (15 fichiers)
- `assets/enemies/hex/MO##/*.png` — sprites pour chaque mob non encore exporté
