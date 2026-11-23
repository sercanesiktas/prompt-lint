// Her kural { id, seviye, kontrol(prompt, secenek) } biçimindedir; kontrol bulguların dizisini döner.

/** Difüzyon modellerinin okunur yazı basmakta zorlandığı prompt türleri. */
const YAZI_AGIRLIKLI = [
  'infographic', 'poster', 'flyer', 'thumbnail', 'banner', 'slide', 'presentation', 'brochure',
  'magazine cover', 'book cover', 'logo', 'wordmark', 'typography', 'text overlay', 'caption',
  'headline', 'chart', 'diagram', 'menu', 'invoice', 'certificate', 'resume', 'newspaper', 'comic',
  'manga', 'storyboard', 'subtitle', 'label', 'packaging', 'billboard', 'ui', 'ux', 'app screen',
  'dashboard', 'website', 'landing page', 'mockup',
];

const kacir = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const YAZI_DESENI = new RegExp(`\\b(?:${YAZI_AGIRLIKLI.map(kacir).join('|')})\\b`, 'i');

/** Tırnak içinde, harfi harfine yazılması istenen metin: text "SALE", the word 'Merhaba'. */
const TIRNAKLI_YAZI = /\b(?:text|word|words|writes?|written|says?|reads?|title|slogan|caption|label)\b[^"'\n]{0,30}["“'‘]([^"”'’\n]{2,80})["”'’]/i;

/**
 * Şablon değişkeni kalıpları. Varsayılan değeri olanlar doldurulmasa da kullanılabilir (bilgi),
 * olmayanlar model tarafından harfi harfine okunur (hata).
 */
const DEGISKENLER = [
  { desen: /\{argument name="[^"]*"[^}]*\bdefault="[^"]*"[^}]*\}/g, ad: '{argument name="..." default="..."}', varsayilanli: true },
  { desen: /\{argument name="[^"]*"(?![^}]*\bdefault=)[^}]*\}/g, ad: '{argument name="..."}', varsayilanli: false },
  { desen: /\$\{[^}:]+:[^}]*\}/g, ad: '${ad:varsayılan}', varsayilanli: true },
  { desen: /\$\{[^}:]+\}/g, ad: '${ad}', varsayilanli: false },
  { desen: /\{\{[^}]+\}\}/g, ad: '{{ad}}', varsayilanli: false },
  { desen: /\[[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9 _-]{2,}\]/g, ad: '[BÜYÜK HARFLİ YER TUTUCU]', varsayilanli: false },
];

/** Referans görsel isteyen kalıplar. */
const REFERANS = /\b(?:reference image|uploaded (?:photo|image|picture)|attached (?:photo|image)|the (?:person|face|man|woman) in the (?:photo|image|reference)|same (?:face|person) as (?:in )?the (?:reference|photo|image)|identity lock)\b/i;

/** Aynı kelimenin art arda en az üç kez geçmesi: "very very very", "masterpiece, masterpiece, masterpiece". */
const TEKRAR = /(?<![\p{L}\p{N}])(\p{L}{2,})(?:[\s,;]+\1(?![\p{L}\p{N}])){2,}/giu;

export const KURALLAR = [
  {
    id: 'bos',
    seviye: 'hata',
    kontrol(prompt) {
      return prompt.trim() === '' ? [{ mesaj: 'Prompt boş.' }] : [];
    },
  },
  {
    id: 'uzunluk',
    seviye: 'hata',
    kontrol(prompt, { limit }) {
      const uzunluk = [...prompt].length;
      return uzunluk > limit
        ? [{ mesaj: `Prompt ${uzunluk} karakter, sınır ${limit}. Sağlayıcı kırpabilir ya da reddedebilir.` }]
        : [];
    },
  },
  {
    id: 'okunur-yazi',
    seviye: 'uyari',
    kontrol(prompt) {
      const bulgular = [];
      const tirnakli = prompt.match(TIRNAKLI_YAZI);
      if (tirnakli) {
        bulgular.push({
          mesaj: `Belirli bir metnin yazılmasını istiyor ("${tirnakli[1]}"). Difüzyon modelleri harfi harfine yazı basamaz, çıktı genelde harfe benzeyen anlamsız şekillerle dolar.`,
          ornek: tirnakli[0],
        });
      } else {
        const tur = prompt.match(YAZI_DESENI);
        if (tur) {
          bulgular.push({
            mesaj: `"${tur[0]}" yazı ağırlıklı bir iş. Difüzyon modelleri okunur yazı basamıyor, yazı alanını sonradan eklemeyi düşün.`,
            ornek: tur[0],
          });
        }
      }
      return bulgular;
    },
  },
  {
    id: 'degisken',
    seviye: 'hata',
    kontrol(prompt) {
      const bulgular = [];
      for (const { desen, ad, varsayilanli } of DEGISKENLER) {
        const eslesen = prompt.match(desen);
        if (!eslesen) continue;
        const liste = `${eslesen.slice(0, 3).join(', ')}${eslesen.length > 3 ? ' ...' : ''}`;
        bulgular.push(
          varsayilanli
            ? {
                seviye: 'bilgi',
                mesaj: `Varsayılan değerli şablon değişkeni var (${ad}): ${liste}. Doldurmadan gönderirsen model bunu harfi harfine okur, önce varsayılanı yerleştir.`,
                ornek: eslesen[0],
              }
            : {
                mesaj: `Doldurulması gereken değişken var (${ad}): ${liste}. Varsayılan değeri yok, model bunu harfi harfine okur.`,
                ornek: eslesen[0],
              },
        );
      }
      return bulgular;
    },
  },
  {
    id: 'tekrar',
    seviye: 'uyari',
    kontrol(prompt) {
      return [...prompt.matchAll(TEKRAR)].map((m) => ({
        mesaj: `"${m[1]}" kelimesi art arda ${m[0].split(/[\s,;]+/).length} kez geçiyor. Tekrar çıktıyı güçlendirmez, bazı modellerde kalite düşürür ve sağlayıcı sınırına karakter harcar.`,
        ornek: m[0],
      }));
    },
  },
  {
    id: 'json-sarmali',
    seviye: 'bilgi',
    kontrol(prompt) {
      const t = prompt.trim();
      if (!/^[{[]/.test(t)) return [];
      try {
        JSON.parse(t);
        return [{ mesaj: 'Prompt JSON biçiminde. Bazı modeller bunu düz metne göre kötü anlar, anahtar adlarını da metinmiş gibi okuyabilir.' }];
      } catch {
        return [{ mesaj: 'Prompt JSON gibi başlıyor ama geçerli JSON değil (kırpılmış olabilir).' }];
      }
    },
  },
  {
    id: 'referans-gorsel',
    seviye: 'bilgi',
    kontrol(prompt) {
      const m = prompt.match(REFERANS);
      return m
        ? [{ mesaj: `Bir referans görsel gerektiriyor ("${m[0]}"). Yalnızca metinle çalıştırılırsa istenen kişi ya da öğe olmaz.`, ornek: m[0] }]
        : [];
    },
  },
];

export const VARSAYILAN_LIMIT = 2048;
