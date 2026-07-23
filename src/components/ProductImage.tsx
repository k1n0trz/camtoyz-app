import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { useAppTheme } from '@/preferences/AppPreferences';
import { radii } from '@/theme/index';

interface Props {
  name?: string;
  size?: number;
}

const productAssets: Readonly<Record<string, ImageSourcePropType>> = {
  intense: require('../../assets/products/intense.png'),
  flexicurve: require('../../assets/products/flexicurve.png'),
  flexring: require('../../assets/products/flexring.png'),
  whisper: require('../../assets/products/whisper.png'),
  duoEgg: require('../../assets/products/duo-egg.jpeg'),
};

function sourceFor(name?: string): ImageSourcePropType | undefined {
  const normalized = name?.split(' · ')[0]?.trim().toLowerCase() ?? '';
  if (normalized.includes('intense')) return productAssets.intense;
  if (normalized.includes('flexicurve')) return productAssets.flexicurve;
  if (normalized.includes('flexring')) return productAssets.flexring;
  if (normalized.includes('whisper')) return productAssets.whisper;
  if (normalized.includes('duo egg')) return productAssets.duoEgg;
  return undefined;
}

/** Imagen comercial cuando existe; los modelos sin arte aprobado conservan un ícono neutro. */
export function ProductImage({ name, size = 44 }: Props) {
  const theme = useAppTheme();
  const source = sourceFor(name);
  if (source) {
    return <Image accessibilityLabel={name} source={source} resizeMode="contain" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[s.fallback, {
      width: size,
      height: size,
      borderRadius: Math.min(radii.md, size / 2),
      backgroundColor: theme.colors.tint,
      borderColor: theme.colors.border,
    }]}>
      <View style={[s.fallbackMark, {
        width: Math.round(size * 0.27),
        height: Math.round(size * 0.5),
        borderRadius: size / 4,
        borderColor: theme.colors.ink,
      }]} />
    </View>
  );
}

const s = StyleSheet.create({
  fallback: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackMark: { borderWidth: 2 },
});
