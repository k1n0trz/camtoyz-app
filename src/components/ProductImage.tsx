import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

import { palette, radii } from '@/theme';

interface Props {
  name?: string;
  size?: number;
}

const productAssets: Readonly<Record<string, ImageSourcePropType>> = {
  intense: require('../../assets/products/intense.png'),
  flexicurve: require('../../assets/products/flexicurve.png'),
  flexring: require('../../assets/products/flexring.png'),
  whisper: require('../../assets/products/whisper.png'),
};

function sourceFor(name?: string): ImageSourcePropType | undefined {
  const normalized = name?.split(' · ')[0]?.trim().toLowerCase() ?? '';
  if (normalized.includes('intense')) return productAssets.intense;
  if (normalized.includes('flexicurve')) return productAssets.flexicurve;
  if (normalized.includes('flexring')) return productAssets.flexring;
  if (normalized.includes('whisper')) return productAssets.whisper;
  return undefined;
}

/** Imagen comercial cuando existe; los modelos sin arte aprobado conservan un ícono neutro. */
export function ProductImage({ name, size = 44 }: Props) {
  const source = sourceFor(name);
  if (source) {
    return <Image accessibilityLabel={name} source={source} resizeMode="contain" style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[s.fallback, { width: size, height: size, borderRadius: Math.min(radii.md, size / 2) }]}>
      <View style={[s.fallbackMark, { width: Math.round(size * 0.27), height: Math.round(size * 0.5), borderRadius: size / 4 }]} />
    </View>
  );
}

const s = StyleSheet.create({
  fallback: { backgroundColor: palette.tint, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  fallbackMark: { borderWidth: 2, borderColor: palette.ink },
});
