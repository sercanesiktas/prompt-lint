/** RFC 4180: tırnak içinde virgül ve satır sonu olabilir, "" bir tırnak demek. */
export function csvAyristir(metin) {
  const satirlar = [];
  let alan = '';
  let satir = [];
  let tirnakta = false;

  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakta) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; } else { tirnakta = false; }
      } else {
        alan += c;
      }
    } else if (c === '"') {
      tirnakta = true;
    } else if (c === ',') {
      satir.push(alan); alan = '';
    } else if (c === '\n') {
      satir.push(alan); alan = '';
      satirlar.push(satir); satir = [];
    } else if (c !== '\r') {
      alan += c;
    }
  }
  if (alan !== '' || satir.length) { satir.push(alan); satirlar.push(satir); }

  const [baslik, ...govde] = satirlar;
  return govde
    .filter((s) => s.length === baslik.length)
    .map((s) => Object.fromEntries(baslik.map((b, i) => [b, s[i]])));
}
