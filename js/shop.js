/**
 * Arrow Escape - Customization Shop Catalogue & State
 */

const SHOP_CATALOGUE = {
  themes: [
    { id: 'classic', name: 'Classic Slate', price: 0, desc: 'Clean, high-contrast default dark theme.', colors: ['#0f172a', '#1e293b', '#38bdf8'] },
    { id: 'neon', name: 'Neon Cyber', price: 500, desc: 'Vibrant cyberpunk grid with glowing neon edges.', colors: ['#0a051b', '#1a0d33', '#f43f5e'] },
    { id: 'forest', name: 'Enchanted Forest', price: 800, desc: 'Lush emerald foliage with mossy stone tones.', colors: ['#06231a', '#0d3b2f', '#10b981'] },
    { id: 'ice', name: 'Ice World', price: 1200, desc: 'Glacial frosted tiles with cold crystalline glow.', colors: ['#061a29', '#0d324f', '#67e8f9'] },
    { id: 'galaxy', name: 'Galaxy Cosmic', price: 1500, desc: 'Deep cosmic starfields with nebula gradients.', colors: ['#12082b', '#261159', '#a855f7'] },
    { id: 'golden', name: 'Golden Royalty', price: 2000, desc: 'Luxurious brushed gold and imperial obsidian.', colors: ['#1c1708', '#382c0b', '#fbbf24'] }
  ],
  skins: [
    { id: 'classic', name: 'Standard Arrows', price: 0, desc: 'Crisp minimalist white directional arrows.', icon: '⚡' },
    { id: 'royal', name: 'Royal Arrows', price: 1500, desc: 'Ornamented imperial gold filigree arrows.', icon: '👑' },
    { id: 'legendary', name: 'Legendary Arrows', price: 2500, desc: 'Chromatic prism trails with cosmic shine.', icon: '✨' },
    { id: 'frost', name: 'Frost Arrows', price: 1000, desc: 'Ice shards with chilling glacial tips.', icon: '❄️' },
    { id: 'inferno', name: 'Inferno Arrows', price: 1800, desc: 'Molten magma blazing with burning fury.', icon: '🔥' },
    { id: 'thunder', name: 'Thunder Arrows', price: 2000, desc: 'Electric storm bolts crackling with voltage.', icon: '⚡' },
    { id: 'emerald', name: 'Emerald Arrows', price: 1500, desc: 'Jade gemstone carvings glowing with ancient power.', icon: '💎' }
  ],
  avatars: [
    { id: 'default', name: 'Arrow Pilot', price: 0, icon: '🎯' },
    { id: 'prince', name: 'Royal Prince', price: 500, icon: '🤴' },
    { id: 'ninja', name: 'Cyber Ninja', price: 700, icon: '🥷' },
    { id: 'dragon', name: 'Baby Dragon', price: 800, icon: '🐲' },
    { id: 'astronaut', name: 'Astronaut', price: 900, icon: '🧑‍🚀' },
    { id: 'fox', name: 'Fox Gamer', price: 1000, icon: '🦊' },
    { id: 'phantom', name: 'Phantom', price: 1200, icon: '👻' }
  ],
  frames: [
    { id: 'none', name: 'No Frame', price: 0, style: 'border: 2px solid transparent;' },
    { id: 'neon', name: 'Neon Frame', price: 700, style: 'border: 3px solid #f43f5e; box-shadow: 0 0 10px #f43f5e;' },
    { id: 'royal_gold', name: 'Royal Gold Frame', price: 1000, style: 'border: 3px solid #fbbf24; box-shadow: 0 0 12px #fbbf24;' },
    { id: 'mystic', name: 'Mystic Frame', price: 1200, style: 'border: 3px solid #c084fc; box-shadow: 0 0 14px #c084fc;' },
    { id: 'diamond', name: 'Diamond Frame', price: 2000, style: 'border: 3px solid #38bdf8; box-shadow: 0 0 16px #38bdf8;' }
  ],
  effects: [
    { id: 'confetti', name: 'Confetti Rain', price: 0, icon: '🎉' },
    { id: 'star_burst', name: 'Star Burst', price: 300, icon: '⭐' },
    { id: 'lightning', name: 'Lightning Flash', price: 900, icon: '⚡' },
    { id: 'golden_victory', name: 'Golden Shower', price: 1500, icon: '🏆' }
  ],
  powerups: [
    { id: 'hints', name: 'Arrow Hint', price: 100, desc: 'Flashes one immediately escapable arrow.', icon: '💡' },
    { id: 'undos', name: 'Undo Move', price: 75, desc: 'Recovers the last escaped arrow.', icon: '↩️' },
    { id: 'safes', name: 'Safe Arrow', price: 150, desc: 'Permanently highlights an arrow with a clear path.', icon: '🛡️' }
  ]
};

window.SHOP_CATALOGUE = SHOP_CATALOGUE;
