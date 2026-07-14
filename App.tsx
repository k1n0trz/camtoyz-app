import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/routes';
import { lightTheme } from '@/theme';
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
import { ConnectionStatusOverlay } from '@/components/ConnectionStatusOverlay';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: lightTheme.colors.bg },
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
            {/* Codex: registrar aquí el resto de rutas de src/navigation/routes.ts
                a medida que se construyen (Scan, PatternsAll, MultiDevice, GestureControl,
                SoundControl, MusicControl, Room*, SettingsDevice). */}
          </Stack.Navigator>
        </NavigationContainer>
        <ConnectionStatusOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
