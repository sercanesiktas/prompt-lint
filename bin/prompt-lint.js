#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { denetle, KURALLAR, VARSAYILAN_LIMIT } from '../src/index.js';
import { csvAyristir } from '../src/csv.js';

const KULLANIM = `Kullanım:
  prompt-lint <dosya> [dosya...]   Dosyalardaki promptları denetler
  prompt-lint -                    Promptu standart girdiden okur
  prompt-lint --csv <dosya>        CSV'deki promptları toplu denetler, özet yazar

Seçenekler:
  --limit <n>        Karakter sınırı (varsayılan ${VARSAYILAN_LIMIT})
  --kapat <a,b>      Bu kuralları kapat. Kurallar: ${KURALLAR.map((k) => k.id).join(', ')}
  --sutun <ad>       CSV'de prompt sütunu (varsayılan prompt)
  --tur <deger>      CSV'de type sütunu bu değerde olanları denetle (örn. image)
  --json             Sonucu JSON olarak yaz
  --siki             Uyarı bulunursa da 1 ile çık (varsayılan: yalnızca hata)
  -h, --help         Bu yardım
`;

function argumanlar(argv) {
  const a = { dosyalar: [], secenek: {} };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const deger = () => {
      if (i + 1 >= argv.length) throw new Error(`${x} için değer gerekli`);
      return argv[++i];
    };
    if (x === '-h' || x === '--help') a.yardim = true;
    else if (x === '--json') a.json = true;
    else if (x === '--siki') a.siki = true;
    else if (x === '--csv') a.csv = deger();
    else if (x === '--sutun') a.sutun = deger();
    else if (x === '--tur') a.tur = deger();
    else if (x === '--limit') a.secenek.limit = Number(deger());
    else if (x === '--kapat') a.secenek.kapat = deger().split(',').map((s) => s.trim());
    else if (x.startsWith('-') && x !== '-') throw new Error(`Bilinmeyen seçenek: ${x}`);
    else a.dosyalar.push(x);
  }
  if (a.secenek.limit !== undefined && !(a.secenek.limit > 0)) throw new Error('--limit pozitif bir sayı olmalı');
  return a;
}

function toplu(a) {
  const satirlar = csvAyristir(readFileSync(a.csv, 'utf8'));
  const sutun = a.sutun ?? 'prompt';
  if (!satirlar.length || !(sutun in satirlar[0])) throw new Error(`CSV'de "${sutun}" sütunu yok`);

  const secili = a.tur ? satirlar.filter((s) => s.type === a.tur) : satirlar;
  const sayac = {}; // "kural/seviye" -> o bulguyu içeren prompt sayısı
  let hatali = 0;
  let uyarili = 0;
  for (const s of secili) {
    const bulgular = denetle(s[sutun], a.secenek);
    for (const k of new Set(bulgular.map((b) => `${b.kural}/${b.seviye}`))) sayac[k] = (sayac[k] ?? 0) + 1;
    if (bulgular.some((b) => b.seviye === 'hata')) hatali++;
    if (bulgular.some((b) => b.seviye === 'uyari')) uyarili++;
  }

  const ozet = { toplam: secili.length, hataliPrompt: hatali, uyariliPrompt: uyarili, bulgular: sayac };
  if (a.json) {
    console.log(JSON.stringify(ozet, null, 2));
  } else {
    const yuzde = (n) => `${((n / secili.length) * 100).toFixed(1)}%`;
    const sira = { hata: 0, uyari: 1, bilgi: 2 };
    console.log(`${secili.length} prompt denetlendi, ${hatali} tanesinde hata (${yuzde(hatali)})`);
    Object.entries(sayac)
      .sort(([x], [y]) => sira[x.split('/')[1]] - sira[y.split('/')[1]] || x.localeCompare(y))
      .forEach(([anahtar, n]) => {
        const [kural, seviye] = anahtar.split('/');
        console.log(`  ${seviye.padEnd(5)} ${kural.padEnd(16)} ${String(n).padStart(6)}  ${yuzde(n)}`);
      });
  }
  return 0;
}

function denetleDosya(yol, a) {
  const metin = yol === '-' ? readFileSync(0, 'utf8') : readFileSync(yol, 'utf8');
  return denetle(metin, a.secenek);
}

function cikisKodu(bulgular, a) {
  const hata = bulgular.some((b) => b.seviye === 'hata');
  const uyari = bulgular.some((b) => b.seviye === 'uyari');
  return hata || (a.siki && uyari) ? 1 : 0;
}

function yazdir(bulgular) {
  if (!bulgular.length) console.log('Sorun bulunamadı.');
  else for (const b of bulgular) console.log(`[${b.seviye}] ${b.kural}: ${b.mesaj}`);
}

function tek(a) {
  const bulgular = denetleDosya(a.dosyalar[0], a);
  if (a.json) console.log(JSON.stringify(bulgular, null, 2));
  else yazdir(bulgular);
  return cikisKodu(bulgular, a);
}

/** Birden fazla dosya: her dosya kendi başlığıyla yazılır, çıkış kodu en yüksek olandır. */
function cokluDosya(a) {
  const sonuclar = a.dosyalar.map((yol) => [yol, denetleDosya(yol, a)]);
  if (a.json) {
    console.log(JSON.stringify(Object.fromEntries(sonuclar), null, 2));
  } else {
    sonuclar.forEach(([yol, bulgular], i) => {
      if (i) console.log('');
      console.log(`${yol}:`);
      yazdir(bulgular);
    });
  }
  return Math.max(...sonuclar.map(([, b]) => cikisKodu(b, a)));
}

try {
  const a = argumanlar(process.argv.slice(2));
  if (a.yardim || (!a.dosyalar.length && !a.csv)) {
    process.stdout.write(KULLANIM);
    process.exit(a.yardim ? 0 : 2);
  }
  process.exit(a.csv ? toplu(a) : a.dosyalar.length > 1 ? cokluDosya(a) : tek(a));
} catch (e) {
  console.error(`Hata: ${e.message}`);
  process.exit(2);
}
