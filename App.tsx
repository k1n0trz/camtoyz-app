import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/routes';
import { AppPreferencesProvider, useAppTheme } from '@/preferences/AppPreferences';
import SplashScreen from '@/screens/SplashScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import ScanScreen from '@/screens/ScanScreen';
import PatternsAllScreen from '@/screens/PatternsAllScreen';
import MultiDeviceScreen from '@/screens/MultiDeviceScreen';
import GestureControlScreen from '@/screens/GestureControlScreen';
import SoundControlScreen from '@/screens/SoundControlScreen';
import MusicControlScreen from '@/screens/MusicControlScreen';
import RoomCreateScreen from '@/screens/RoomCreateScreen';
import RoomJoinScreen from '@/screens/RoomJoinScreen';
import RoomHostPanelScreen from '@/screens/RoomHostPanelScreen';
import RoomMemberSessionScreen from '@/screens/RoomMemberSessionScreen';
import RoomKickedScreen from '@/screens/RoomKickedScreen';
import RoomCameraScreen from '@/screens/RoomCameraScreen';
import SettingsDeviceScreen from '@/screens/SettingsDeviceScreen';
import { ConnectionStatusOverlay } from '@/components/ConnectionStatusOverlay';
import { useBleStore } from '@/state/bleStore';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function BluetoothRecoveryNavigation() {
  const connectionState = useBleStore((state) => state.connectionState);
  const previousState = useRef(connectionState);

  useEffect(() => {
    const lostConnection =
      connectionState === 'disconnected' &&
      (previousState.current === 'connected' || previousState.current === 'connecting' || previousState.current === 'reconnecting');
    if (lostConnection && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Scan' }] });
    }
    previousState.current = connectionState;
  }, [connectionState]);

  return null;
}

function AppContent() {
  const theme = useAppTheme();
  const baseNavigationTheme = theme.mode === 'dark' ? NavigationDarkTheme : NavigationLightTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: theme.colors.accent,
      background: theme.colors.bg,
      card: theme.colors.card,
      text: theme.colors.ink,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="PatternsAll" component={PatternsAllScreen} />
          <Stack.Screen name="MultiDevice" component={MultiDeviceScreen} />
          <Stack.Screen name="GestureControl" component={GestureControlScreen} />
          <Stack.Screen name="SoundControl" component={SoundControlScreen} />
          <Stack.Screen name="MusicControl" component={MusicControlScreen} />
          <Stack.Screen name="RoomCreate" component={RoomCreateScreen} />
          <Stack.Screen name="RoomJoin" component={RoomJoinScreen} />
          <Stack.Screen name="RoomHostPanel" component={RoomHostPanelScreen} />
          <Stack.Screen name="RoomMemberSession" component={RoomMemberSessionScreen} />
          <Stack.Screen name="RoomKicked" component={RoomKickedScreen} />
          <Stack.Screen name="RoomCamera" component={RoomCameraScreen} />
          <Stack.Screen name="SettingsDevice" component={SettingsDeviceScreen} />
        </Stack.Navigator>
        <BluetoothRecoveryNavigation />
      </NavigationContainer>
      <ConnectionStatusOverlay />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppPreferencesProvider>
        <AppContent />
      </AppPreferencesProvider>
    </GestureHandlerRootView>
  );
}
