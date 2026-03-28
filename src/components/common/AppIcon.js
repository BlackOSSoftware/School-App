import React from 'react';
import {StyleSheet, Text} from 'react-native';

const explicitIcons = {
  add: '+',
  close: '×',
  'chevron-back': '‹',
  'chevron-forward': '›',
  'chevron-down': '⌄',
  'chevron-up': '⌃',
  'arrow-back': '←',
  'checkmark-circle': '●',
  'checkmark-circle-outline': '◉',
  'close-circle-outline': '⊗',
  'ellipse-outline': '◌',
  'search-outline': '⌕',
  'notifications-outline': '🔔',
  'log-out-outline': '⇥',
  'lock-closed-outline': '🔒',
  'key-outline': '🗝',
  'call-outline': '☎',
  'mail-outline': '✉',
  'calendar-outline': '🗓',
  'person-outline': '👤',
  'person-circle-outline': '◎',
  'people-outline': '👥',
  'school-outline': '🎓',
  'library-outline': '📚',
  'book-outline': '📘',
  'reader-outline': '📖',
  'document-outline': '📄',
  'document-text-outline': '🧾',
  'bus-outline': '🚌',
  'business-outline': '🏢',
  'id-card-outline': '🪪',
  'megaphone-outline': '📣',
  'attach-outline': '📎',
  'download-outline': '↓',
  'open-outline': '↗',
  'create-outline': '✎',
  'trash-outline': '🗑',
  'sync-outline': '↻',
  'flash-outline': '⚡',
  'funnel-outline': '⏷',
  'play-skip-back-outline': '⏮',
  'play-skip-forward-outline': '⏭',
  'moon-outline': '☾',
  'sunny-outline': '☀',
  'navigate-outline': '➤',
  'bar-chart-outline': '▦',
  'card-outline': '💳',
  'shield-checkmark-outline': '🛡',
};

const keywordIcons = [
  ['check', '✓'],
  ['close', '×'],
  ['chevron', '›'],
  ['arrow', '→'],
  ['search', '⌕'],
  ['calendar', '🗓'],
  ['notification', '🔔'],
  ['person', '👤'],
  ['people', '👥'],
  ['mail', '✉'],
  ['call', '☎'],
  ['book', '📘'],
  ['document', '📄'],
  ['bus', '🚌'],
  ['profile', '👤'],
  ['home', '⌂'],
];

function resolveIcon(name) {
  if (!name) return '•';
  if (explicitIcons[name]) return explicitIcons[name];

  const lower = String(name).toLowerCase();
  for (const [token, icon] of keywordIcons) {
    if (lower.includes(token)) return icon;
  }
  return '•';
}

export default function AppIcon({name, size = 16, color = '#111', style, ...rest}) {
  const glyph = resolveIcon(name);
  return (
    <Text
      allowFontScaling={false}
      style={[styles.base, {fontSize: size, lineHeight: size + 2, color}, style]}
      {...rest}>
      {glyph}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
