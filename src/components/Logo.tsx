import { SvgXml } from 'react-native-svg';
import { CAMTOYZ_LOGO_XML } from './logoXml';
import { palette } from '@/theme';

const ASPECT = 804.79 / 115.55;

export function Logo({ width = 200, color = palette.accent }: { width?: number; color?: string }) {
  // Reemplaza el fill del wordmark por el color solicitado.
  const xml = CAMTOYZ_LOGO_XML.replace(/fill="#[0-9A-Fa-f]{6}"/, `fill="${color}"`);
  return <SvgXml xml={xml} width={width} height={width / ASPECT} />;
}
