import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
let configured = false;
export const mapsAvailable = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
export async function loadMaps() {
  if (!mapsAvailable)
    throw new Error(
      'Configure a chave da API do Google Maps no arquivo .env para habilitar o mapa.',
    );
  if (!configured) {
    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    mapsWindow.gm_authFailure = () =>
      window.dispatchEvent(new Event('ecodescarte:maps-auth-failure'));
    setOptions({
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      v: 'weekly',
      language: 'pt-BR',
      region: 'BR',
    });
    configured = true;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      importLibrary('maps'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error('O mapa demorou para carregar. Use a lista de pontos ou tente novamente.'),
            ),
          12000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function geocodeAddress(address: string) {
  await loadMaps();
  await importLibrary('geocoding');
  let response: google.maps.GeocoderResponse;
  try {
    response = await new google.maps.Geocoder().geocode({ address, region: 'BR' });
  } catch {
    throw new Error(
      'Não foi possível localizar esse endereço. Confira a cidade e o estado ou use o filtro da lista.',
    );
  }
  if (!response.results.length)
    throw new Error('Endereço não encontrado. Tente incluir a cidade e o estado.');
  const result = response.results[0];
  return { lat: result.geometry.location.lat(), lng: result.geometry.location.lng() };
}
