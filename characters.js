// js/characters.js - Vrais joueurs de tennis avec leurs compétences

const CHARACTERS = [
  {
    id: 'nadal',
    name: 'Rafael Nadal',
    country: '🇪🇸',
    title: 'Le Roi de la Terre Battue',
    bio: '22 Grands Chelems · 14x Roland Garros',
    color: '#FFD700',
    secondary: '#C41E3A',
    stats: {
      power: 88,
      speed: 90,
      spin: 98,       // Topspin légendaire
      serve: 82,
      endurance: 99,  // Résistance mentale
      volley: 75
    },
    special: 'Topspin dévastateur - la balle rebondit 40% plus haut',
    specialName: 'TORO FURIOSO',
    playstyle: 'Défenseur agressif · Roi de la terre battue',
    // Bonus de gameplay
    spinBonus: 1.8,
    powerBonus: 1.0,
    speedBonus: 1.1,
    enduranceBonus: 1.5
  },
  {
    id: 'federer',
    name: 'Roger Federer',
    country: '🇨🇭',
    title: 'Le Maître Absolu',
    bio: '20 Grands Chelems · 8x Wimbledon',
    color: '#00BFFF',
    secondary: '#FF4500',
    stats: {
      power: 85,
      speed: 88,
      spin: 80,
      serve: 92,
      endurance: 88,
      volley: 98     // Meilleure volée de l'histoire
    },
    special: 'Passing shot parfait · Slice indéchiffrable',
    specialName: 'MAGIC MAESTRO',
    playstyle: 'Attaquant all-court · Finesse absolue',
    spinBonus: 1.0,
    powerBonus: 1.2,
    speedBonus: 1.0,
    enduranceBonus: 1.0
  },
  {
    id: 'djokovic',
    name: 'Novak Djokovic',
    country: '🇷🇸',
    title: 'Le Cyborg Parfait',
    bio: '24 Grands Chelems · GOAT statistique',
    color: '#00FF88',
    secondary: '#1a1a2e',
    stats: {
      power: 87,
      speed: 95,
      spin: 85,
      serve: 90,
      endurance: 97,
      volley: 88
    },
    special: 'Return invincible - renvoie tout avec précision',
    specialName: 'IRON WALL',
    playstyle: 'Défenseur élastique · Mental d\'acier',
    spinBonus: 1.1,
    powerBonus: 1.0,
    speedBonus: 1.4,
    enduranceBonus: 1.4
  },
  {
    id: 'alcaraz',
    name: 'Carlos Alcaraz',
    country: '🇪🇸',
    title: 'La Fusée Espagnole',
    bio: '4 Grands Chelems · #1 mondial à 19 ans',
    color: '#FF6B35',
    secondary: '#FFD700',
    stats: {
      power: 91,
      speed: 97,     // Le plus rapide du circuit
      spin: 90,
      serve: 88,
      endurance: 90,
      volley: 85
    },
    special: 'Drop shot impossible + Sprint surhumain',
    specialName: 'TURBO SMASH',
    playstyle: 'Attaquant explosif · Amorti dévastateur',
    spinBonus: 1.3,
    powerBonus: 1.3,
    speedBonus: 1.6,
    enduranceBonus: 1.1
  },
  {
    id: 'sinner',
    name: 'Jannik Sinner',
    country: '🇮🇹',
    title: 'La Machine Italienne',
    bio: '2 Grands Chelems · #1 mondial 2024',
    color: '#00E5FF',
    secondary: '#FF3366',
    stats: {
      power: 93,
      speed: 88,
      spin: 87,
      serve: 91,
      endurance: 92,
      volley: 82
    },
    special: 'Coup droit dévastateur · Puissance pure',
    specialName: 'LASER CANNON',
    playstyle: 'Frappeur de fond de court · Power tennis',
    spinBonus: 1.2,
    powerBonus: 1.5,
    speedBonus: 1.0,
    enduranceBonus: 1.2
  },
  {
    id: 'swiatek',
    name: 'Iga Świątek',
    country: '🇵🇱',
    title: 'La Reine de Terre',
    bio: '5 Grands Chelems · Dominance absolue 2022-2024',
    color: '#FF1493',
    secondary: '#FFD700',
    stats: {
      power: 85,
      speed: 92,
      spin: 97,      // Topspin phénoménal
      serve: 82,
      endurance: 94,
      volley: 78
    },
    special: 'Topspin fendu · Précision chirurgicale',
    specialName: 'SPIN QUEEN',
    playstyle: 'Baseline dominatrice · Terre battue reine',
    spinBonus: 1.7,
    powerBonus: 0.9,
    speedBonus: 1.2,
    enduranceBonus: 1.3
  },
  {
    id: 'serena',
    name: 'Serena Williams',
    country: '🇺🇸',
    title: 'La Lionne Américaine',
    bio: '23 Grands Chelems · Légende absolue',
    color: '#FFD700',
    secondary: '#000000',
    stats: {
      power: 98,     // Service le plus puissant
      speed: 85,
      spin: 82,
      serve: 99,     // Meilleure serveuse de l'histoire
      endurance: 90,
      volley: 80
    },
    special: 'Ace à 200km/h · Smash assassin',
    specialName: 'THUNDER SERVE',
    playstyle: 'Frappeur explosif · Puissance devastatrice',
    spinBonus: 0.9,
    powerBonus: 1.7,
    speedBonus: 0.9,
    enduranceBonus: 1.2
  },
  {
    id: 'murray',
    name: 'Andy Murray',
    country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    title: 'Le Mur Écossais',
    bio: '3 Grands Chelems · 2x Wimbledon · 2x JO Or',
    color: '#0072C6',
    secondary: '#C41E3A',
    stats: {
      power: 80,
      speed: 91,
      spin: 83,
      serve: 83,
      endurance: 96,
      volley: 90
    },
    special: 'Défense impossible · Contre-attaque létale',
    specialName: 'IRON FORTRESS',
    playstyle: 'Contre-attaquant · Défenseur de génie',
    spinBonus: 1.0,
    powerBonus: 0.9,
    speedBonus: 1.2,
    enduranceBonus: 1.5
  },
  {
    id: 'tsitsipas',
    name: 'Stefanos Tsitsipas',
    country: '🇬🇷',
    title: 'L\'Artiste Grec',
    bio: '1 Masters · Finaliste Roland Garros 2021',
    color: '#00BFA5',
    secondary: '#FFD700',
    stats: {
      power: 88,
      speed: 86,
      spin: 84,
      serve: 87,
      endurance: 85,
      volley: 90
    },
    special: 'Slice revers artistique · Volée acrobatique',
    specialName: 'GREEK FIRE',
    playstyle: 'Attaquant artistique · Net rusher',
    spinBonus: 1.1,
    powerBonus: 1.2,
    speedBonus: 1.0,
    enduranceBonus: 1.0
  },
  {
    id: 'medvedev',
    name: 'Daniil Medvedev',
    country: '🇷🇺',
    title: 'Le Robot Russe',
    bio: '1 US Open · #1 mondial · Return légendaire',
    color: '#9C27B0',
    secondary: '#E0E0E0',
    stats: {
      power: 87,
      speed: 87,
      spin: 78,
      serve: 91,
      endurance: 93,
      volley: 85
    },
    special: 'Return parfait · Jeu bas anti-topspin',
    specialName: 'FLAT DESTROYER',
    playstyle: 'Baseline technique · Return champion',
    spinBonus: 0.8,
    powerBonus: 1.1,
    speedBonus: 1.0,
    enduranceBonus: 1.3
  },
  {
    id: 'wawrinka',
    name: 'Stan Wawrinka',
    country: '🇨🇭',
    title: 'Le Canon Suisse',
    bio: '3 Grands Chelems · Revers à 1 main légendaire',
    color: '#E53935',
    secondary: '#FFFFFF',
    stats: {
      power: 94,
      speed: 80,
      spin: 85,
      serve: 87,
      endurance: 82,
      volley: 82
    },
    special: 'Revers 1 main dévastateur en smash',
    specialName: 'STAN THE MAN',
    playstyle: 'Big hitter · Coups gagnants en rafale',
    spinBonus: 1.2,
    powerBonus: 1.5,
    speedBonus: 0.9,
    enduranceBonus: 0.9
  },
  {
    id: 'williams_venus',
    name: 'Venus Williams',
    country: '🇺🇸',
    title: 'La Vénus de Wimbledon',
    bio: '7 Grands Chelems · 5x Wimbledon · Pionnière',
    color: '#FF6F00',
    secondary: '#FFFFFF',
    stats: {
      power: 93,
      speed: 90,
      spin: 78,
      serve: 95,
      endurance: 88,
      volley: 87
    },
    special: 'Service à 204km/h · Vitesse redoutable',
    specialName: 'VENUS STORM',
    playstyle: 'Attaquant puissant · Service & volée',
    spinBonus: 0.9,
    powerBonus: 1.4,
    speedBonus: 1.2,
    enduranceBonus: 1.1
  }
];

// Export
if (typeof module !== 'undefined') {
  module.exports = CHARACTERS;
}