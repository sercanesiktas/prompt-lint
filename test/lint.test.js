import test from 'node:test';
import assert from 'node:assert/strict';
import { denetle, VARSAYILAN_LIMIT } from '../src/index.js';
import { csvAyristir } from '../src/csv.js';

const kurallar = (prompt, secenek) => denetle(prompt, secenek).map((b) => `${b.kural}/${b.seviye}`);

test('temiz prompt sorunsuz', () => {
  assert.deepEqual(denetle('A cat sitting on a sofa, soft window light'), []);
});

test('boş prompt hata', () => {
  assert.deepEqual(kurallar('   '), ['bos/hata']);
});

test('uzunluk: sınır aşılınca hata, sınırda değil', () => {
  assert.deepEqual(kurallar('a'.repeat(VARSAYILAN_LIMIT)), []);
  assert.deepEqual(kurallar('a'.repeat(VARSAYILAN_LIMIT + 1)), ['uzunluk/hata']);
  assert.deepEqual(kurallar('a'.repeat(101), { limit: 100 }), ['uzunluk/hata']);
});

test('uzunluk: karakter sayar, bayt değil', () => {
  assert.deepEqual(kurallar('ş'.repeat(VARSAYILAN_LIMIT)), []);
});

test('okunur yazı: tırnaklı metin ve yazı ağırlıklı tür', () => {
  const t = denetle('A sign that says "OPEN" in neon');
  assert.equal(t[0].kural, 'okunur-yazi');
  assert.match(t[0].mesaj, /OPEN/);
  assert.deepEqual(kurallar('A minimalist logo for a bakery'), ['okunur-yazi/uyari']);
  assert.deepEqual(kurallar('An infographic about coffee'), ['okunur-yazi/uyari']);
});

test('okunur yazı: kelime sınırı, "ui" "guitar" içinde eşleşmez', () => {
  assert.deepEqual(kurallar('A man playing a guitar on stage'), []);
  assert.deepEqual(kurallar('A clean UI for a banking app'), ['okunur-yazi/uyari']);
});

test('değişken: varsayılansız hata, varsayılanlı bilgi', () => {
  assert.deepEqual(kurallar('A product photo of [PRODUCT NAME]'), ['degisken/hata']);
  assert.deepEqual(kurallar('Hello ${isim}'), ['degisken/hata']);
  assert.deepEqual(kurallar('Hello {{isim}}'), ['degisken/hata']);
  assert.deepEqual(kurallar('Hello ${isim:Ali}'), ['degisken/bilgi']);
  assert.deepEqual(kurallar('A view of {argument name="city" default="Rome"}'), ['degisken/bilgi']);
  assert.deepEqual(kurallar('A view of {argument name="city"}'), ['degisken/hata']);
});

test('değişken: normal köşeli parantezli küçük harf metin değişken sayılmaz', () => {
  assert.deepEqual(kurallar('Photo [taken in 1990] of a street'), []);
});

test('JSON sarmalı: geçerli ve kırpılmış', () => {
  assert.deepEqual(kurallar('{"prompt": "a cat"}'), ['json-sarmali/bilgi']);
  const k = denetle('{"prompt": "a cat');
  assert.equal(k[0].kural, 'json-sarmali');
  assert.match(k[0].mesaj, /geçerli JSON değil/);
});

test('referans görsel', () => {
  assert.deepEqual(kurallar('Using the reference image, keep the same face'), ['referans-gorsel/bilgi']);
});

test('kapat: kural devre dışı kalır', () => {
  assert.deepEqual(kurallar('A minimalist logo', { kapat: ['okunur-yazi'] }), []);
});

test('csv: tırnak, virgül ve çift tırnak', () => {
  const s = csvAyristir('a,b\n"x, y","z ""q"""\n1,2\n');
  assert.deepEqual(s, [{ a: 'x, y', b: 'z "q"' }, { a: '1', b: '2' }]);
});

test('satır: bulgunun örneğinin geçtiği ilk satır numarası döner', () => {
  const p = 'A calm lake at dawn\nsoft light\nA sign that says "OPEN" on the door';
  const b = denetle(p).find((x) => x.kural === 'okunur-yazi');
  assert.equal(b.satir, 3);
});

test('satır: aynı örnek iki yerde geçiyorsa ilki, tek satırlı promptta 1', () => {
  const b = denetle('[BRAND] ve tekrar [BRAND]').find((x) => x.kural === 'degisken');
  assert.equal(b.satir, 1);
  const c = denetle('ilk satır\n[BRAND]\n[BRAND]').find((x) => x.kural === 'degisken');
  assert.equal(c.satir, 2);
});

test('satır: örneği olmayan bulguda alan yok', () => {
  const b = denetle('   ').find((x) => x.kural === 'bos');
  assert.equal('satir' in b, false);
});
