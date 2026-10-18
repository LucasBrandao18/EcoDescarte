import { useState } from 'react';
export default function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [locationError, setError] = useState('');
  function locate() {
    setError('');
    if (!navigator.geolocation) {
      setError('Seu navegador não oferece localização. Busque pela cidade abaixo.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      (e) => {
        setError(
          e.code === 1
            ? 'Localização não autorizada. Você pode continuar buscando pela cidade.'
            : 'Não conseguimos localizar você. Busque pela cidade ou tente novamente.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return { location, setLocation, locating, locationError, locate };
}
