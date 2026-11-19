import { KURALLAR, VARSAYILAN_LIMIT } from './kurallar.js';

/**
 * Bir promptu denetler.
 * @param {string} prompt
 * @param {{ limit?: number, kapat?: string[] }} [secenek]
 * @returns {{ kural: string, seviye: 'hata'|'uyari'|'bilgi', mesaj: string, ornek?: string }[]}
 */
export function denetle(prompt, secenek = {}) {
  const limit = secenek.limit ?? VARSAYILAN_LIMIT;
  const kapat = new Set(secenek.kapat ?? []);
  const sonuc = [];

  for (const kural of KURALLAR) {
    if (kapat.has(kural.id)) continue;
    for (const bulgu of kural.kontrol(prompt, { limit })) {
      sonuc.push({ kural: kural.id, seviye: kural.seviye, ...bulgu });
    }
  }
  return sonuc;
}

export { KURALLAR, VARSAYILAN_LIMIT };
