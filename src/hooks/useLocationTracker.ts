import { useEffect, useRef } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function useLocationTracker(enabled: boolean, onUpdate?: (date: Date) => void) {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      toast.error('Location services are not supported by your browser.');
      return;
    }

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        await api.post('/location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        });
        onUpdate?.(new Date());
      } catch (error) {
        console.error('Failed to update location', error);
        // Still update the UI timestamp even if API fails
        onUpdate?.(new Date());
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Geolocation error:', error);
      if (error.code === error.PERMISSION_DENIED) {
        toast.error(
          'Location access denied. Please enable it in Settings so caregivers can monitor your location.',
          { duration: 5000 }
        );
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [enabled]);
}
