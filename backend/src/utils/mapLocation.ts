/**
 * Turn what people paste for a warehouse location into coordinates: plain "lat, lng",
 * degrees-minutes-seconds as Google Maps shows it, a full Google Maps link, or a short
 * maps.app.goo.gl / goo.gl link (resolved by following its redirects, Google hosts only).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export class LocationParseError extends Error {
  status = 400;
}

const GOOGLE_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]{2,6})$/i;
const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

export const isValidLatLng = (lat: unknown, lng: unknown): boolean => {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    lat !== null && lat !== '' && lng !== null && lng !== '' &&
    Number.isFinite(la) && Number.isFinite(ln) &&
    la >= -90 && la <= 90 && ln >= -180 && ln <= 180 &&
    !(la === 0 && ln === 0)
  );
};

const pair = (lat: string | number, lng: string | number): LatLng | null =>
  isValidLatLng(lat, lng) ? { lat: Number(Number(lat).toFixed(7)), lng: Number(Number(lng).toFixed(7)) } : null;

/** 21°28'40.5"N 72°43'24.5"E */
const parseDms = (text: string): LatLng | null => {
  const re = /(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*(?:"|″|'')?\s*([NSEW])/gi;
  const parts = [...text.matchAll(re)].map((m) => {
    const value = Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
    return { value: /[SW]/i.test(m[4]) ? -value : value, axis: /[NS]/i.test(m[4]) ? 'lat' : 'lng' };
  });
  const lat = parts.find((p) => p.axis === 'lat');
  const lng = parts.find((p) => p.axis === 'lng');
  return lat && lng ? pair(lat.value, lng.value) : null;
};

/** Coordinates inside a Google Maps URL. The place pin (!3d..!4d..) beats the map's viewport centre (@..). */
export const parseGoogleMapsUrl = (raw: string): LatLng | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const text = decodeURIComponent(url.href);

  const pin = text.match(new RegExp(`!3d${NUM}!4d${NUM}`));
  if (pin) return pair(pin[1], pin[2]);

  for (const key of ['q', 'query', 'll', 'destination', 'center', 'sll']) {
    const v = url.searchParams.get(key);
    const m = v?.match(new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`));
    if (m) return pair(m[1], m[2]);
  }

  const place = text.match(new RegExp(`/maps/(?:place|search|dir)/${NUM},\\s*\\+?${NUM}`));
  if (place) return pair(place[1], place[2]);

  const at = text.match(new RegExp(`@${NUM},${NUM}`));
  if (at) return pair(at[1], at[2]);

  return null;
};

/** Text that isn't a link: "21.4779, 72.7234", "21.4779 72.7234" or DMS. */
export const parseCoordinateText = (text: string): LatLng | null => {
  const plain = text.trim().match(new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`));
  if (plain) return pair(plain[1], plain[2]);
  return parseDms(text);
};

const isShortLink = (url: URL) => /^(maps\.app\.goo\.gl|goo\.gl)$/i.test(url.hostname);

/** Follow a short link's redirects (Google hosts only, max 5 hops) to the full maps URL. */
const expandShortLink = async (start: URL): Promise<string> => {
  let current = start;
  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current.href, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const next = res.headers.get('location');
    if (!next || res.status < 300 || res.status >= 400) return current.href;
    const nextUrl = new URL(next, current);
    if (nextUrl.protocol !== 'https:' || !GOOGLE_HOSTS.test(nextUrl.hostname)) {
      throw new LocationParseError('That link does not lead to Google Maps.');
    }
    if (parseGoogleMapsUrl(nextUrl.href)) return nextUrl.href;
    current = nextUrl;
  }
  return current.href;
};

export const resolveLocation = async (input: string): Promise<LatLng & { source: 'coordinates' | 'link' | 'short_link' }> => {
  const text = (input || '').trim();
  if (!text) throw new LocationParseError('Paste a Google Maps link or coordinates.');

  const fromText = parseCoordinateText(text);
  if (fromText) return { ...fromText, source: 'coordinates' };

  let url: URL;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    throw new LocationParseError('Not a Google Maps link or a "latitude, longitude" pair.');
  }
  if (url.protocol !== 'https:' || !GOOGLE_HOSTS.test(url.hostname)) {
    throw new LocationParseError('Only Google Maps links are supported.');
  }

  if (isShortLink(url)) {
    let expanded: string;
    try {
      expanded = await expandShortLink(url);
    } catch (e) {
      if (e instanceof LocationParseError) throw e;
      throw new LocationParseError('Could not open that short link. Paste the full Google Maps link or the coordinates instead.');
    }
    const found = parseGoogleMapsUrl(expanded);
    if (found) return { ...found, source: 'short_link' };
    throw new LocationParseError('That link has no exact pin. In Google Maps, drop a pin on the warehouse and share or copy that link, or paste its coordinates.');
  }

  const found = parseGoogleMapsUrl(url.href);
  if (found) return { ...found, source: 'link' };
  throw new LocationParseError('That link has no coordinates. In Google Maps, drop a pin on the warehouse and copy that link, or paste its coordinates.');
};
