# prompt-lint

Görsel üretim promptlarını çalıştırmadan önce denetleyen bir komut satırı aracı. Okunur yazı isteyen promptları, sağlayıcı sınırını aşanları ve doldurulmamış şablon değişkenlerini yakalar. Çalışma zamanı bağımlılığı yoktur.

Difüzyon modelleri harfi harfine yazı basamaz, bir afişe "SALE 50%" yazdırmak çoğunlukla harfe benzeyen anlamsız şekiller üretir. Uzun promptlar bazı servislerde sessizce kırpılır ya da reddedilir. Doldurulmamış bir `[BRAND NAME]` modele olduğu gibi gider. Bunların hepsi görsel üretim ücreti ödendikten sonra fark edilir. `prompt-lint` bunları önceden gösterir.

## Kurulum

Node.js 18 veya üzeri gerekir.

```bash
git clone https://github.com/sercanesiktas/prompt-lint.git
cd prompt-lint
node bin/prompt-lint.js --help
```

Paket henüz npm'e yayımlanmamıştır.

## Kullanım

```bash
node bin/prompt-lint.js prompt.txt
echo 'A poster with the text "SALE 50%" for [BRAND NAME]' | node bin/prompt-lint.js -
```

```
[uyari] okunur-yazi: Belirli bir metnin yazılmasını istiyor ("SALE 50%"). Difüzyon modelleri harfi harfine yazı basamaz, çıktı genelde harfe benzeyen anlamsız şekillerle dolar.
[hata] degisken: Doldurulması gereken değişken var ([BÜYÜK HARFLİ YER TUTUCU]): [BRAND NAME]. Varsayılan değeri yok, model bunu harfi harfine okur.
```

Birden fazla dosya verilirse her biri kendi adıyla başlık altında yazılır. `--json` ile çıktı dosya yoluna göre bir nesne olur. Çıkış kodu, dosyalar arasındaki en yüksek koddur:

```bash
node bin/prompt-lint.js promptlar/*.txt --siki
```

Çıkış kodu `0` temiz ya da yalnızca uyarılı, `1` hata bulundu, `2` kullanım hatasıdır. `--siki` ile uyarılar da `1` verir, bu sayede CI'da kullanılabilir.

| Seçenek | Açıklama |
|---|---|
| `--limit <n>` | Karakter sınırı. Varsayılan 2048. |
| `--kapat <a,b>` | Belirtilen kuralları kapatır. |
| `--json` | Sonucu JSON olarak yazar. |
| `--siki` | Uyarı bulunursa da `1` ile çıkar. |

Kod içinden:

```js
import { denetle } from './src/index.js';

denetle('A minimalist logo for a bakery');
// [{ kural: 'okunur-yazi', seviye: 'uyari', mesaj: '"logo" yazı ağırlıklı bir iş...', ornek: 'logo' }]
```

## Kurallar

| Kural | Seviye | Ne yakalar |
|---|---|---|
| `bos` | hata | Boş prompt. |
| `uzunluk` | hata | Karakter sınırını aşan prompt. Karakter sayılır, bayt değil. |
| `okunur-yazi` | uyarı | Tırnak içinde metin yazılmasını isteyenler (`text "OPEN"`) ve yazı ağırlıklı türler (afiş, logo, infografik, arayüz, menü, kapak ve benzerleri). |
| `degisken` | hata | Varsayılan değeri olmayan `[BÜYÜK HARF]`, `${ad}`, `{{ad}}`, `{argument name="..."}`. |
| `degisken` | bilgi | Varsayılanı olan `${ad:değer}` ve `{argument name="..." default="..."}`. Doldurulmasa da varsayılan kullanılabilir. |
| `json-sarmali` | bilgi | JSON biçimindeki ya da JSON gibi başlayıp kırpılmış promptlar. |
| `referans-gorsel` | bilgi | Bir referans görsel gerektirenler. Yalnızca metinle çalıştırılırsa istenen kişi ya da öğe olmaz. |

## Toplu denetim

`--csv` ile bir veri setindeki promptların hepsi denetlenir ve özet yazılır:

```bash
node bin/prompt-lint.js --csv prompts.csv --tur image
```

`--sutun` ile prompt sütununun adı, `--tur` ile `type` sütununun değeri verilir.

### Gerçek veride ölçüm

[HayalAI](https://github.com/sercanesiktas/hayalai) veri setinin 14.947 görsel promptu üzerinde:

| Bulgu | Prompt sayısı | Oran |
|---|---:|---:|
| `uzunluk` (2048 karakterden uzun) | 4.195 | %28,1 |
| `okunur-yazi` | 3.534 | %23,6 |
| `degisken` hata (varsayılansız) | 336 | %2,2 |
| `degisken` bilgi (varsayılanlı) | 7.481 | %50,1 |
| `json-sarmali` | 6.007 | %40,2 |
| `referans-gorsel` | 1.876 | %12,6 |

HayalAI'nin kendi istatistik sayfasında yazı isteyen görsel promptlar için %20, uzunluk sınırını aşanlar için yaklaşık %25 yazıyor. Bu araç aynı kalıp listesini tüm prompt metninde arıyor, buna ek olarak tırnak içinde metin isteyenleri de sayıyor ve %23,6 buluyor. Aradaki fark bu ek kurallardan ve eşleştirmenin kapsamından (başlık, metnin ilk bölümü ya da tamamı) gelebilir, hangisinin ne kadarını açıkladığını ayrı ölçmedim. Uzunlukta %28,1 ile "yaklaşık %25" birbirine yakındır.

Değişken kuralını ilk yazdığımda promptların %50'sini hatalı işaretliyordu. Çünkü veri setinin yarısı `{argument name="..." default="..."}` biçimli şablon değişkeni içeriyor ve bunlar varsayılanlarıyla doldurulabiliyor. Bu yüzden varsayılanı olanlar `bilgi`, olmayanlar `hata` olarak ayrıldı.

## Sınırlar

- Kurallar sezgiseldir. Yazı ağırlıklı tür listesi İngilizce anahtar kelimelere bakar, Türkçe promptlarda çalışmaz. "menu" ya da "label" gibi sözcükler yazı ile ilgisiz bağlamlarda da (örneğin "menu photography" yemek fotoğrafı) uyarı üretebilir.
- Varsayılan 2048 karakter sınırı, Cloudflare Workers AI üzerindeki `flux-1-schnell` modelinin `prompt` alanı sınırına dayanır ([HayalAI sağlayıcı notları](https://github.com/sercanesiktas/hayalai/blob/main/SAGLAYICI-NOTLARI.md) ve istatistik sayfası). Bu sınırı resmi belgeyle ayrıca doğrulamadım. Başka sağlayıcılar için `--limit` ile kendi değerini ver.
- Araç promptun çıktısını denemez, yalnızca metnine bakar. Bir uyarının olmaması görselin iyi çıkacağı anlamına gelmez.
- Bir modelin yazıyı gerçekten basıp basamadığını ölçmek için [karakter-testi](https://github.com/sercanesiktas/karakter-testi) projesi vardır.

## Test

```bash
npm test
```

## Lisans

MIT, bkz. [LICENSE](LICENSE).
