import { KURALLAR, VARSAYILAN_LIMIT } from './kurallar.js';

/**
 * Bir promptu denetler.
 * @param {string} prompt
 * @param {{ limit?: number, kapat?: string[] }} [secenek]
 * @returns {{ kural: string, seviye: 'hata'|'uyari'|'bilgi', mesaj: string, ornek?: string, satir?: number }[]}
 * `satir`, bulgunun `ornek` metninin geçtiği ilk satırdır (1'den başlar). Örneği olmayan bulgularda (boş, uzunluk, JSON) yoktur.
 */
export function denetle(prompt, secenek = {}) {
  const limit = secenek.limit ?? VARSAYILAN_LIMIT;
  const kapat = new Set(secenek.kapat ?? []);
  const sonuc = [];

  for (const kural of KURALLAR) {
    if (kapat.has(kural.id)) continue;
    for (const bulgu of kural.kontrol(prompt, { limit })) {
      const kayit = { kural: kural.id, seviye: kural.seviye, ...bulgu };
      const konum = typeof kayit.ornek === 'string' ? prompt.indexOf(kayit.ornek) : -1;
      if (konum >= 0) kayit.satir = prompt.slice(0, konum).split('\n').length;
      sonuc.push(kayit);
    }
  }
  return sonuc;
}

export { KURALLAR, VARSAYILAN_LIMIT };
