import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidLatLng, parseCoordinateText, parseGoogleMapsUrl, resolveLocation } from './mapLocation.js';

describe('mapLocation', () => {
  it('reads plain "lat, lng" and space-separated pairs', () => {
    assert.deepStrictEqual(parseCoordinateText('21.4779173, 72.7234733'), { lat: 21.4779173, lng: 72.7234733 });
    assert.deepStrictEqual(parseCoordinateText('21.4779 72.7234'), { lat: 21.4779, lng: 72.7234 });
  });

  it('reads degrees-minutes-seconds as Google Maps shows them', () => {
    const p = parseCoordinateText(`21°28'40.5"N 72°43'24.5"E`)!;
    assert.ok(Math.abs(p.lat - 21.477917) < 1e-5 && Math.abs(p.lng - 72.723472) < 1e-5);
  });

  it('prefers the dropped pin over the map viewport in a place link', () => {
    const url =
      'https://www.google.com/maps/place/Olpad,+Gujarat/@21.40,72.60,12z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d21.4779173!4d72.7234733!16s';
    assert.deepStrictEqual(parseGoogleMapsUrl(url), { lat: 21.4779173, lng: 72.7234733 });
  });

  it('reads ?q=, search/ and @ links', () => {
    assert.deepStrictEqual(parseGoogleMapsUrl('https://maps.google.com/?q=21.47,72.72'), { lat: 21.47, lng: 72.72 });
    assert.deepStrictEqual(parseGoogleMapsUrl('https://www.google.com/maps/search/21.4779,+72.7234?entry=tts'), { lat: 21.4779, lng: 72.7234 });
    assert.deepStrictEqual(parseGoogleMapsUrl('https://www.google.com/maps/@21.4779,72.7234,15z'), { lat: 21.4779, lng: 72.7234 });
  });

  it('rejects out-of-range, half and 0,0 locations', () => {
    assert.strictEqual(isValidLatLng(0, 0), false);
    assert.strictEqual(isValidLatLng(95, 72), false);
    assert.strictEqual(isValidLatLng(21.4, null), false);
    assert.strictEqual(isValidLatLng('', ''), false);
    assert.strictEqual(isValidLatLng('21.4', '72.7'), true);
  });

  it('refuses links that are not Google Maps, and links without coordinates', async () => {
    await assert.rejects(resolveLocation('https://evil.example.com/?q=21.4,72.7'), /Only Google Maps/);
    await assert.rejects(resolveLocation('https://www.google.com/maps/place/Olpad'), /no coordinates/);
    await assert.rejects(resolveLocation('somewhere near Surat'), /Not a Google Maps link|Only Google Maps/);
  });

  it('resolves a full link and coordinates without any network call', async () => {
    assert.deepStrictEqual(await resolveLocation(' 21.4779, 72.7234 '), { lat: 21.4779, lng: 72.7234, source: 'coordinates' });
    assert.strictEqual((await resolveLocation('https://maps.google.com/?q=21.47,72.72')).source, 'link');
  });
});
