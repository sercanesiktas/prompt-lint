import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(kok, 'bin', 'prompt-lint.js');
const ornekCsv = join(kok, 'test', 'veri', 'ornek.csv');

function calistir(args, girdi) {
  const r = spawnSync(process.execPath, [cli, ...args], { input: girdi, encoding: 'utf8' });
  return { kod: r.status, cikti: r.stdout, hata: r.stderr };
}

function dosya(icerik) {
  const yol = join(mkdtempSync(join(tmpdir(), 'pl-')), 'p.txt');
  writeFileSync(yol, icerik);
  return yol;
}

test('temiz prompt: çıkış kodu 0', () => {
  const r = calistir([dosya('A cat on a sofa')]);
  assert.equal(r.kod, 0);
  assert.match(r.cikti, /Sorun bulunamadı/);
});

test('hata varsa çıkış kodu 1', () => {
  const r = calistir([dosya('A photo of [PRODUCT NAME]')]);
  assert.equal(r.kod, 1);
  assert.match(r.cikti, /\[hata\] degisken/);
});

test('yalnızca uyarı: varsayılan 0, --siki ile 1', () => {
  const yol = dosya('A minimalist logo for a bakery');
  assert.equal(calistir([yol]).kod, 0);
  assert.equal(calistir([yol, '--siki']).kod, 1);
});

test('standart girdi', () => {
  const r = calistir(['-'], 'A poster with the text "SALE"');
  assert.match(r.cikti, /okunur-yazi/);
});

test('--json geçerli JSON verir', () => {
  const r = calistir([dosya('A logo'), '--json']);
  const j = JSON.parse(r.cikti);
  assert.equal(j[0].kural, 'okunur-yazi');
});

test('--limit ve --kapat', () => {
  assert.equal(calistir([dosya('a'.repeat(50)), '--limit', '10']).kod, 1);
  assert.equal(calistir([dosya('A logo'), '--kapat', 'okunur-yazi', '--siki']).kod, 0);
});

test('kullanım hataları 2 ile çıkar', () => {
  assert.equal(calistir([]).kod, 2);
  assert.equal(calistir(['--yok']).kod, 2);
  assert.equal(calistir(['x.txt', '--limit', '-5']).kod, 2);
  assert.equal(calistir(['/olmayan/dosya']).kod, 2);
  assert.equal(calistir(['--help']).kod, 0);
});

test('toplu CSV özeti', () => {
  const r = calistir(['--csv', ornekCsv, '--tur', 'image', '--json']);
  const j = JSON.parse(r.cikti);
  assert.equal(j.toplam, 5);
  assert.equal(j.bulgular['okunur-yazi/uyari'], 1);
  assert.equal(j.bulgular['degisken/hata'], 1);
  assert.equal(j.bulgular['degisken/bilgi'], 1);
  assert.equal(j.hataliPrompt, 1);
});

test('CSV: olmayan sütun hata verir', () => {
  assert.equal(calistir(['--csv', ornekCsv, '--sutun', 'yok']).kod, 2);
});

test('birden fazla dosya: her biri başlıkla yazılır, çıkış kodu en yükseği alır', () => {
  const temiz = dosya('A cat on a sofa');
  const hatali = dosya('A photo of [PRODUCT NAME]');
  const r = calistir([temiz, hatali]);
  assert.equal(r.kod, 1);
  assert.ok(r.cikti.includes(`${temiz}:\nSorun bulunamadı.`));
  assert.ok(r.cikti.includes(`${hatali}:\n[hata]`));
});

test('birden fazla dosya ve --json: dosya yoluna göre nesne', () => {
  const a = dosya('A cat on a sofa');
  const b = dosya('A photo of [PRODUCT NAME]');
  const r = calistir([a, b, '--json']);
  const nesne = JSON.parse(r.cikti);
  assert.deepEqual(nesne[a], []);
  assert.ok(nesne[b].some((x) => x.seviye === 'hata'));
});

test('tek dosyada çıktı başlıksız kalır', () => {
  const r = calistir([dosya('A cat on a sofa')]);
  assert.equal(r.cikti.trim(), 'Sorun bulunamadı.');
});
