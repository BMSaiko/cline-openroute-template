/**
 * Fallback offline para quando a API está indisponível
 * ou o limite diário foi atingido
 */

function estimateRoute(origin, destination) {
  // Cálculo simples: linha reta + fator 1.4 para estradas
  const dx = origin[0] - destination[0];
  const dy = origin[1] - destination[1];
  const distanceKm = Math.sqrt(dx * dx + dy * dy) * 111; // graus → km aprox.
  const estimatedDistance = distanceKm * 1.4;
  const estimatedDuration = estimatedDistance / 50; // 50 km/h médio
  
  return {
    summary: {
      distance: estimatedDistance,
      duration: estimatedDuration,
      distanceUnit: 'km',
      durationUnit: 'hours',
    },
    warning: 'Offline fallback – approximate route (not from API)',
    geometry: {
      coordinates: [origin, destination],
      type: 'LineString',
    },
    _fallback: true,
  };
}

function estimateGeocode(address) {
  // Fallback básico para geocoding
  return {
    features: [
      {
        geometry: { coordinates: [0, 0] },
        properties: {
          label: address,
          confidence: 0,
          warning: 'Offline fallback – coordinates approximate',
        },
      },
    ],
    _fallback: true,
  };
}

async function fallbackRequest(context) {
  const { url, body, cache, endpoint } = context;
  
  // Tenta cache expirado primeiro
  const cacheKey = `${url}:${JSON.stringify(body)}`;
  const staleEntry = cache.get(cacheKey, true);
  if (staleEntry && staleEntry.value) {
    console.log('⚠️ Usando cache expirado (stale-while-revalidate)');
    return { ...staleEntry.value, _stale: true, _warning: 'Cache expired, but returned' };
  }
  
  // Determina o tipo de pedido pela URL
  if (url.includes('/directions/') || endpoint === 'directions') {
    const coords = body?.coordinates || body?.coords;
    if (coords && coords.length >= 2) {
      return estimateRoute(coords[0], coords[coords.length - 1]);
    }
  }
  
  if (url.includes('/geocode') || endpoint === 'geocode') {
    const address = body?.text || body?.address;
    if (address) return estimateGeocode(address);
  }
  
  throw new Error(`No fallback available for this request: ${url}`);
}

module.exports = { fallbackRequest, estimateRoute, estimateGeocode };