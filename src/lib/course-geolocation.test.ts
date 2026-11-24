import { it } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { captureCoursePosition } from './course-position';

it('capture un GPS neuf avec sa précision et rend un refus non bloquant', async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } });
    let calls = 0;
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
      geolocation: { getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback, options: PositionOptions) => {
        calls++;
        strictEqual(options.enableHighAccuracy, true);
        strictEqual(options.maximumAge, 0);
        strictEqual(options.timeout, 10000);
        success({ coords: { latitude: 5.3, longitude: -4, accuracy: 42, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: 0 } as GeolocationPosition);
      } },
    } });
    deepStrictEqual(await captureCoursePosition(), { lat: 5.3, lng: -4, accuracy: 42, reason: null });
    strictEqual(calls, 1);
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
      geolocation: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => {
        failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'denied' });
      } },
    } });
    deepStrictEqual(await captureCoursePosition(), { lat: null, lng: null, accuracy: null, reason: 'permission-denied' });
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});