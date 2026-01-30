// UI Design System: single source of truth for icons, labels, and badge styles.
// Keeps presentation rules consistent across ALL tabs.

const DesignSystem = (() => {
  const SLOT = {
    weapon:  { label: 'Weapon',  icon: '⚔️', badgeClass: 'badge--weapon' },
    head:    { label: 'Head',    icon: '👑', badgeClass: 'badge--head' },
    body:    { label: 'Body',    icon: '🛡️', badgeClass: 'badge--body' },
    hands:   { label: 'Hands',   icon: '🧤', badgeClass: 'badge--hands' },
    feet:    { label: 'Feet',    icon: '👟', badgeClass: 'badge--feet' },
    offhand: { label: 'Offhand', icon: '🛡️', badgeClass: 'badge--offhand' },
    ring:    { label: 'Ring',    icon: '💍', badgeClass: 'badge--ring' },
    amulet:  { label: 'Amulet',  icon: '📿', badgeClass: 'badge--amulet' },
  };

  // Power/stat “type” label treatment is handled in Utils.getStatColor(),
  // but we still standardize icons here so type presentation is consistent.
  const TYPE_ICON = {
    'Attack': '⚔️',
    'A_speed': '⚡',
    'Attack speed': '⚡',
    'Defense': '🛡️',
    'HP': '❤️',
    'Crit': '🎯',
    'Range': '🏹',
    'Gold': '🪙'
  };

  function getSlotMeta(slot) {
    if (!slot) return { label: 'Slot', icon: '📦', badgeClass: 'badge--default' };
    const key = String(slot).toLowerCase();
    return SLOT[key] || { label: Utils.formatSlot(key), icon: '📦', badgeClass: 'badge--default' };
  }

  function getTypeIcon(type) {
    if (!type) return '✨';
    return TYPE_ICON[type] || '✨';
  }

  return { getSlotMeta, getTypeIcon };
})();
