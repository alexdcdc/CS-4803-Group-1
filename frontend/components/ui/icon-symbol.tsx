// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'magnifyingglass': 'search',
  'person.fill': 'person',
  'creditcard.fill': 'credit-card',
  'play.fill': 'play-arrow',
  'plus.circle.fill': 'add-circle',
  'arrow.up.doc.fill': 'upload-file',
  'gift.fill': 'card-giftcard',
  'dollarsign.circle.fill': 'monetization-on',
  'heart.fill': 'favorite',
  'heart': 'favorite-border',
  'xmark': 'close',
  'checkmark.circle.fill': 'check-circle',
  'arrow.down.circle.fill': 'file-download',
  'bubble.right.fill': 'chat-bubble',
  'hand.raised.fill': 'back-hand',
  'paintbrush.fill': 'brush',
  'arrow.left.arrow.right': 'swap-horiz',
  'gearshape.fill': 'settings',
  'envelope.fill': 'email',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'trash.fill': 'delete',
  'rectangle.portrait.and.arrow.right': 'logout',
  'pencil': 'edit',
  'hand.thumbsup.fill': 'thumb-up',
  'hand.thumbsdown.fill': 'thumb-down',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
