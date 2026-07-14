import { DeviceEventEmitter, NativeModules, Platform, type EmitterSubscription } from 'react-native';

type CaptureStatus =
  | 'active'
  | 'completed'
  | 'denied'
  | 'error'
  | 'selected'
  | 'selection_cancelled'
  | 'stopped'
  | 'unsupported'
  | 'unavailable';
export interface PlaybackStatus {
  status: CaptureStatus;
  message?: string;
  trackUri?: string;
  trackName?: string;
}
export interface PlaybackSample { db: number; bassDb: number }

interface PlaybackCaptureNativeModule {
  requestCapture: () => void;
  requestLocalTrack: () => void;
  startLocalTrack: (trackUri: string) => void;
  stopCapture: () => void;
}

const nativeModule = NativeModules.PlaybackCapture as PlaybackCaptureNativeModule | undefined;

export function isPlaybackCaptureSupported(): boolean {
  return Platform.OS === 'android' && Platform.Version >= 29 && nativeModule !== undefined;
}

export function requestPlaybackCapture(): void {
  nativeModule?.requestCapture();
}

export function requestLocalTrack(): void {
  nativeModule?.requestLocalTrack();
}

export function startLocalTrack(trackUri: string): void {
  nativeModule?.startLocalTrack(trackUri);
}

export function stopPlaybackCapture(): void {
  nativeModule?.stopCapture();
}

export function subscribePlaybackLevel(listener: (sample: PlaybackSample) => void): EmitterSubscription {
  return DeviceEventEmitter.addListener('playbackCaptureLevel', (sample: PlaybackSample) => listener(sample));
}

export function subscribePlaybackStatus(listener: (event: PlaybackStatus) => void): EmitterSubscription {
  return DeviceEventEmitter.addListener('playbackCaptureStatus', (event: PlaybackStatus) => listener(event));
}
