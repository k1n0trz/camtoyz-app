import type { NavigationProp } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/routes';

export function goBackOr(
  navigation: NavigationProp<RootStackParamList>,
  fallback: keyof RootStackParamList,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.reset({ index: 0, routes: [{ name: fallback }] });
}
