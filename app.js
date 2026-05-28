// Bezpieczne demo szkoleniowe. Brak backendu, brak wysyłania danych, brak zapisu haseł.
// Moduły: zgody przeglądarki, kontakt wybrany przez użytkownika, lokalne metadane EXIF/GPS zdjęcia.
const $ = (id) => document.getElementById(id);
let mediaStream = null;

function line(name, value) { return `${name}: ${value}`; }
function yesNo(v) { return v ? 'TAK' : 'NIE'; }
function browserHint() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS / iPadOS — najlepiej testować w Safari. Contact Picker zwykle nie jest dostępny, a powiadomienia mają dodatkowe ograniczenia.';
  if (/Android/i.test(ua)) return 'Android — najlepiej testować w Chrome. Aparat, mikrofon, lokalizacja i Contact Picker wymagają HTTPS.';
  return 'Desktop / inny system — sprawdź pasek adresu i uprawnienia strony.';
}
function secureHint() {
  if (window.isSecureContext) return 'OK — strona działa w bezpiecznym kontekście.';
  return 'PROBLEM — telefon nie uznaje tej strony za bezpieczną. Użyj HTTPS, np. Netlify/GitHub Pages. Laptop może działać lokalnie, ale telefon przez HTTP zwykle nie pokaże zgód.';
}
function permissionStateText() {
  const parts = [];
  if ('Notification' in window) parts.push(line('Powiadomienia — obecny stan', Notification.permission));
  else parts.push('Powiadomienia — brak obsługi w tej przeglądarce');
  return parts.join('\n');
}

$('startBtn').addEventListener('click', () => {
  $('panel').classList.remove('hidden');
  $('statusText').textContent = 'Symulacja aktywna — pokazuj zgody krok po kroku';
  window.scrollTo({ top: $('panel').offsetTop, behavior: 'smooth' });
});

$('diagBtn').addEventListener('click', () => {
  const txt = [
    line('Adres', location.href),
    line('Protokół', location.protocol),
    line('Bezpieczny kontekst', yesNo(window.isSecureContext)),
    secureHint(),
    '',
    line('Aparat/mikrofon API', yesNo(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia))),
    line('Geolokalizacja API', yesNo(!!navigator.geolocation)),
    line('Notification API', yesNo('Notification' in window)),
    line('Contact Picker API', yesNo(!!(navigator.contacts && navigator.contacts.select))),
    line('File API', yesNo(!!(window.File && window.FileReader && window.Blob))),
    permissionStateText(),
    '',
    browserHint(),
    '',
    'Jeżeli wcześniej kliknięto BLOKUJ, telefon może już nie pytać ponownie. Wyczyść uprawnienia strony w ustawieniach przeglądarki.'
  ];
  $('diagResult').textContent = txt.join('\n');
});

async function requestMedia(constraints, label) {
  try {
    if (!window.isSecureContext) {
      $('mediaResult').textContent = 'Brak okna zgody, bo strona nie działa jako HTTPS / bezpieczny kontekst. Wgraj demo na Netlify/GitHub Pages i zeskanuj link https://...';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('mediaResult').textContent = 'Ta przeglądarka nie udostępnia getUserMedia dla tego adresu. Użyj Chrome na Androidzie albo Safari na iPhone oraz HTTPS.';
      return;
    }
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    $('mediaResult').textContent = `Oczekiwanie na zgodę: ${label}...`;
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    const hasVideo = mediaStream.getVideoTracks().length > 0;
    if (hasVideo) $('preview').srcObject = mediaStream;
    else $('preview').srcObject = null;
    $('mediaResult').textContent = `Zgoda udzielona: ${label}. Działa lokalnie w przeglądarce. Nic nie jest nagrywane ani wysyłane.`;
  } catch (e) {
    let help = '';
    if (e.name === 'NotAllowedError') help = ' Najczęściej: wcześniej zablokowano uprawnienie, brak HTTPS albo przeglądarka/system blokuje dostęp.';
    if (e.name === 'NotFoundError') help = ' Urządzenie nie znalazło wymaganego aparatu/mikrofonu.';
    if (e.name === 'NotReadableError') help = ' Kamera lub mikrofon może być zajęty przez inną aplikację.';
    $('mediaResult').textContent = `Odmowa lub błąd: ${e.name}. ${e.message || ''}${help}`;
  }
}

$('cameraBtn').addEventListener('click', () => requestMedia({ video: { facingMode: 'user' }, audio: false }, 'aparat'));
$('micBtn').addEventListener('click', () => requestMedia({ video: false, audio: true }, 'mikrofon'));
$('mediaBtn').addEventListener('click', () => requestMedia({ video: { facingMode: 'user' }, audio: true }, 'aparat + mikrofon'));

$('stopMediaBtn').addEventListener('click', () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  $('preview').srcObject = null;
  $('mediaResult').textContent = 'Podgląd zatrzymany. Zgody można też cofnąć w ustawieniach przeglądarki/systemu.';
});

$('geoBtn').addEventListener('click', () => {
  if (!window.isSecureContext) {
    $('geoResult').textContent = 'Brak okna zgody, bo telefon wymaga HTTPS dla geolokalizacji.';
    return;
  }
  if (!navigator.geolocation) {
    $('geoResult').textContent = 'Geolokalizacja niedostępna w tej przeglądarce.';
    return;
  }
  $('geoResult').textContent = 'Oczekiwanie na decyzję użytkownika...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      $('geoResult').innerHTML = `Zgoda udzielona.\nSzerokość: ${latitude.toFixed(5)}\nDługość: ${longitude.toFixed(5)}\nDokładność: ok. ${Math.round(accuracy)} m\nDane pokazane tylko lokalnie.\n\n<a href="${mapUrl}" target="_blank" rel="noopener">Otwórz położenie na mapie</a>`;
    },
    err => {
      let help = '';
      if (err.code === 1) help = ' Prawdopodobnie odmowa lub wcześniejsza blokada w ustawieniach strony/systemu.';
      if (err.code === 2) help = ' Telefon nie może ustalić lokalizacji — sprawdź GPS/usługi lokalizacji.';
      if (err.code === 3) help = ' Upłynął limit czasu — spróbuj jeszcze raz na zewnątrz lub z włączonym GPS.';
      $('geoResult').textContent = 'Odmowa lub błąd: ' + err.message + help;
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
});

$('notifBtn').addEventListener('click', async () => {
  if (!window.isSecureContext) {
    $('notifResult').textContent = 'Brak okna zgody, bo powiadomienia wymagają HTTPS / bezpiecznego kontekstu.';
    return;
  }
  if (!('Notification' in window)) {
    $('notifResult').textContent = 'Powiadomienia nie są obsługiwane w tej przeglądarce. Na iPhone spróbuj Safari; pełne web push zwykle wymaga dodania strony do ekranu początkowego jako aplikacji webowej.';
    return;
  }
  try {
    $('notifResult').textContent = 'Oczekiwanie na decyzję użytkownika... Obecny stan: ' + Notification.permission;
    const permission = await Notification.requestPermission();
    $('notifResult').textContent = 'Decyzja użytkownika: ' + permission + '. W realnym świecie fałszywe powiadomienia mogą podszywać się pod komunikaty systemowe.';
    if (permission === 'granted') {
      new Notification('Demo bezpieczeństwa', { body: 'To kontrolowane powiadomienie szkoleniowe.' });
    } else if (permission === 'denied') {
      $('notifResult').textContent += '\nJeżeli nie pojawiło się pytanie, zgoda mogła być wcześniej zablokowana w ustawieniach strony.';
    } else {
      $('notifResult').textContent += '\nStan default oznacza brak decyzji — część telefonów blokuje pytanie, gdy strona nie spełnia wymagań przeglądarki.';
    }
  } catch (e) {
    $('notifResult').textContent = 'Błąd powiadomień: ' + e.name + '. ' + (e.message || '');
  }
});

function maskValue(value) {
  if (!value) return '';
  const s = String(value);
  if (s.length <= 3) return s[0] + '**';
  if (s.includes('@')) {
    const [a, b] = s.split('@');
    return (a[0] || '*') + '***@' + (b || '***');
  }
  return s.slice(0, 2) + '***' + s.slice(-2);
}
function contactToText(contact, mask) {
  const safe = (arr) => Array.isArray(arr) ? arr.map(v => mask ? maskValue(v) : v).join(', ') : '';
  return [
    line('Imię/nazwa', safe(contact.name)),
    line('Telefon', safe(contact.tel)),
    line('E-mail', safe(contact.email)),
    contact.address ? line('Adres', '[wybrany kontakt może zawierać adres — nie pokazuj prywatnych danych na projektorze]') : null,
  ].filter(Boolean).join('\n');
}

$('contactBtn').addEventListener('click', async () => {
  if (!window.isSecureContext) {
    $('contactResult').textContent = 'Brak selektora kontaktów, bo Contact Picker wymaga HTTPS / bezpiecznego kontekstu.';
    return;
  }
  if (!(navigator.contacts && navigator.contacts.select)) {
    $('contactResult').textContent = 'Ta przeglądarka nie obsługuje Contact Picker API. Najczęściej działa w Chrome na Androidzie. Na iPhone/Safari zwykle pokaż ten punkt jako slajd i omówienie.';
    return;
  }
  try {
    const supported = await navigator.contacts.getProperties();
    const wanted = ['name', 'email', 'tel', 'address', 'icon'].filter(p => supported.includes(p));
    const contacts = await navigator.contacts.select(wanted, { multiple: false });
    if (!contacts || contacts.length === 0) {
      $('contactResult').textContent = 'Nie wybrano kontaktu.';
      return;
    }
    const mask = $('maskContacts').checked;
    $('contactResult').textContent = 'Użytkownik sam wskazał kontakt. Strona nie dostała dostępu do całej książki adresowej.\n\n' + contactToText(contacts[0], mask);
  } catch (e) {
    $('contactResult').textContent = 'Odmowa lub błąd Contact Picker: ' + e.name + '. ' + (e.message || '') + '\nTo normalne na przeglądarkach, które nie wspierają tej funkcji.';
  }
});

// Minimalny lokalny czytnik EXIF GPS dla JPEG. Nie wysyła pliku. Działa dla wielu zdjęć z telefonu, ale nie każdy telefon zapisuje GPS.
const TYPE_SIZE = {1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8};
function getString(view, offset, length) {
  let out = '';
  for (let i = 0; i < length; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out.trim();
}
function readValue(view, tiffStart, entryOffset, little) {
  const type = view.getUint16(entryOffset + 2, little);
  const count = view.getUint32(entryOffset + 4, little);
  const valueOrOffset = entryOffset + 8;
  const totalBytes = (TYPE_SIZE[type] || 1) * count;
  const valueOffset = totalBytes <= 4 ? valueOrOffset : tiffStart + view.getUint32(valueOrOffset, little);
  const readOne = (idx) => {
    const off = valueOffset + idx * (TYPE_SIZE[type] || 1);
    if (type === 1 || type === 7) return view.getUint8(off);
    if (type === 2) return getString(view, valueOffset, count);
    if (type === 3) return view.getUint16(off, little);
    if (type === 4) return view.getUint32(off, little);
    if (type === 5) {
      const num = view.getUint32(off, little);
      const den = view.getUint32(off + 4, little);
      return den ? num / den : 0;
    }
    if (type === 9) return view.getInt32(off, little);
    if (type === 10) {
      const num = view.getInt32(off, little);
      const den = view.getInt32(off + 4, little);
      return den ? num / den : 0;
    }
    return null;
  };
  if (type === 2) return readOne(0);
  if (count === 1) return readOne(0);
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(readOne(i));
  return arr;
}
function readIFD(view, tiffStart, ifdOffset, little) {
  const result = {};
  const entries = view.getUint16(tiffStart + ifdOffset, little);
  const entriesStart = tiffStart + ifdOffset + 2;
  for (let i = 0; i < entries; i++) {
    const entry = entriesStart + i * 12;
    const tag = view.getUint16(entry, little);
    result[tag] = readValue(view, tiffStart, entry, little);
  }
  return result;
}
function normalizeRef(ref) {
  return String(ref || '').trim().toUpperCase().replace(/\0/g, '');
}
function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const deg = Number(dms[0]);
  const min = Number(dms[1]);
  const sec = Number(dms[2]);
  if (![deg, min, sec].every(Number.isFinite)) return null;
  // Gdy parser trafi na puste/źle odczytane tagi, często wychodzi 0,0.
  // Nie traktujemy tego jako prawdziwej lokalizacji zdjęcia.
  if (deg === 0 && min === 0 && sec === 0) return null;
  let dec = deg + min / 60 + sec / 3600;
  const r = normalizeRef(ref);
  if (r === 'S' || r === 'W') dec *= -1;
  return dec;
}
function isValidGps(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
  // 0,0 to zwykle brak danych albo błąd parsera; na szkoleniu nie pokazujemy tego jako mapy.
  if (Math.abs(lat) < 0.000001 && Math.abs(lon) < 0.000001) return false;
  return true;
}
async function parseExifGpsLegacy(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return { error: 'To nie wygląda jak plik JPEG z EXIF.' };
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) break;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2, false);
    if (marker === 0xE1) {
      const exifHeader = getString(view, offset + 4, 6);
      if (!exifHeader.startsWith('Exif')) { offset += 2 + size; continue; }
      const tiffStart = offset + 10;
      const endian = getString(view, tiffStart, 2);
      const little = endian === 'II';
      const firstIFDOffset = view.getUint32(tiffStart + 4, little);
      const ifd0 = readIFD(view, tiffStart, firstIFDOffset, little);
      const meta = {
        make: ifd0[0x010F] || '',
        model: ifd0[0x0110] || '',
        dateTime: ifd0[0x0132] || ''
      };
      if (ifd0[0x8769]) {
        const exifIFD = readIFD(view, tiffStart, ifd0[0x8769], little);
        meta.dateOriginal = exifIFD[0x9003] || '';
      }
      if (ifd0[0x8825]) {
        const gps = readIFD(view, tiffStart, ifd0[0x8825], little);
        const lat = dmsToDecimal(gps[0x0002], gps[0x0001]);
        const lon = dmsToDecimal(gps[0x0004], gps[0x0003]);
        meta.gps = { lat, lon, latRef: gps[0x0001], lonRef: gps[0x0003], alt: gps[0x0006], date: gps[0x001D], time: gps[0x0007] };
      }
      return meta;
    }
    offset += 2 + size;
  }
  return { error: 'Nie znaleziono metadanych EXIF w tym zdjęciu.' };
}

function normalizeExifDate(value) {
  if (!value) return '';
  try {
    if (value instanceof Date && !isNaN(value.getTime())) return value.toLocaleString('pl-PL');
    return String(value);
  } catch (_) { return String(value); }
}
function pickFirstFinite(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}
function dmsArrayToDecimal(arr, ref) {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const deg = Number(arr[0]);
  const min = Number(arr[1]);
  const sec = Number(arr[2]);
  if (![deg, min, sec].every(Number.isFinite)) return null;
  if (deg === 0 && min === 0 && sec === 0) return null;
  let dec = deg + min / 60 + sec / 3600;
  const r = normalizeRef(ref);
  if (r === 'S' || r === 'W') dec *= -1;
  return dec;
}
async function parseExifGpsRobust(file) {
  const meta = { make: '', model: '', dateTime: '', dateOriginal: '', gps: null, debug: [] };

  // Główna metoda: exifr. Lepiej radzi sobie z EXIF z telefonów Samsung/Apple niż prosty parser szkoleniowy.
  if (window.exifr) {
    try {
      const parsed = await exifr.parse(file, {
        gps: true,
        xmp: true,
        tiff: true,
        ifd0: true,
        exif: true,
        interop: true,
        translateKeys: true,
        translateValues: false,
        reviveValues: true,
        mergeOutput: true
      });
      if (parsed) {
        meta.make = parsed.Make || parsed.make || '';
        meta.model = parsed.Model || parsed.model || '';
        meta.dateTime = normalizeExifDate(parsed.DateTime || parsed.ModifyDate || parsed.CreateDate || '');
        meta.dateOriginal = normalizeExifDate(parsed.DateTimeOriginal || parsed.CreateDate || parsed.dateTimeOriginal || '');

        // exifr często zwraca już gotowe pola latitude/longitude.
        let lat = pickFirstFinite(parsed.latitude, parsed.Latitude, parsed.GPSLatitudeDecimal, parsed.GPSLatitude);
        let lon = pickFirstFinite(parsed.longitude, parsed.Longitude, parsed.GPSLongitudeDecimal, parsed.GPSLongitude);

        // W niektórych plikach GPSLatitude/GPSLongitude mogą przyjść jako tablice DMS.
        if (lat === null) lat = dmsArrayToDecimal(parsed.GPSLatitude, parsed.GPSLatitudeRef);
        if (lon === null) lon = dmsArrayToDecimal(parsed.GPSLongitude, parsed.GPSLongitudeRef);

        // Czasem biblioteka podaje tablice i jednocześnie ref osobno.
        if (Array.isArray(parsed.GPSLatitude)) lat = dmsArrayToDecimal(parsed.GPSLatitude, parsed.GPSLatitudeRef) ?? lat;
        if (Array.isArray(parsed.GPSLongitude)) lon = dmsArrayToDecimal(parsed.GPSLongitude, parsed.GPSLongitudeRef) ?? lon;

        if (lat !== null || lon !== null) {
          meta.gps = {
            lat,
            lon,
            latRef: parsed.GPSLatitudeRef || '',
            lonRef: parsed.GPSLongitudeRef || '',
            alt: parsed.GPSAltitude || parsed.altitude || '',
            date: parsed.GPSDateStamp || '',
            time: parsed.GPSTimeStamp || ''
          };
        }
        meta.debug.push('Odczyt EXIF: exifr');
        return meta;
      }
    } catch (e) {
      meta.debug.push('exifr nie odczytał danych: ' + e.message);
      // Lecimy fallbackiem, żeby demo działało też bez CDN.
    }
  } else {
    meta.debug.push('Biblioteka exifr nie została załadowana — sprawdź internet/CDN albo użyj fallbacku.');
  }

  const legacy = await parseExifGpsLegacy(file);
  if (legacy && !legacy.error) {
    legacy.debug = (legacy.debug || []).concat(meta.debug, ['Odczyt EXIF: parser awaryjny']);
    return legacy;
  }
  if (legacy && legacy.error) return { ...legacy, debug: meta.debug };
  return { error: 'Nie udało się odczytać EXIF/GPS z pliku.', debug: meta.debug };
}

$('fileInput').addEventListener('change', async () => {
  const file = $('fileInput').files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  $('localImage').src = url;
  $('localImage').style.display = 'block';
  $('fileResult').textContent = `Wybrano lokalnie:\nNazwa: ${file.name}\nRozmiar: ${(file.size/1024).toFixed(1)} KB\nTyp: ${file.type || 'nieznany'}\n\nOdczyt metadanych EXIF/GPS...`;
  try {
    const meta = await parseExifGpsRobust(file);
    const rows = [
      `Wybrano lokalnie:`,
      `Nazwa: ${file.name}`,
      `Rozmiar: ${(file.size/1024).toFixed(1)} KB`,
      `Typ: ${file.type || 'nieznany'}`,
      '',
      'Metadane EXIF:',
      line('Aparat/producent', meta.make || 'brak'),
      line('Model', meta.model || 'brak'),
      line('Data zdjęcia', meta.dateOriginal || meta.dateTime || 'brak'),
      line('Silnik odczytu', (meta.debug && meta.debug.length) ? meta.debug.join(' | ') : 'exifr / fallback')
    ];
    if (meta.error) {
      rows.push('', meta.error, 'Wiele aplikacji usuwa EXIF albo telefon miał wyłączone zapisywanie lokalizacji zdjęć.');
      $('fileResult').textContent = rows.join('\n');
      return;
    }
    if (meta.gps && isValidGps(meta.gps.lat, meta.gps.lon)) {
      const lat = meta.gps.lat;
      const lon = meta.gps.lon;
      const maps = `https://www.google.com/maps?q=${lat},${lon}`;
      $('fileResult').innerHTML = rows.join('\n') + `\n\nGPS w zdjęciu:\nSzerokość: ${lat.toFixed(6)}\nDługość: ${lon.toFixed(6)}\n\n<a href="${maps}" target="_blank" rel="noopener">Pokaż miejsce wykonania zdjęcia na mapie</a>\n\nPlik nie został wysłany. Metadane odczytano lokalnie w przeglądarce.`;
    } else {
      const gpsInfo = meta.gps ? 'GPS w zdjęciu: brak poprawnych współrzędnych' : 'GPS w zdjęciu: brak';
      rows.push(
        '',
        gpsInfo,
        'Nie pokazuję mapy, bo współrzędne są puste, usunięte albo wyglądają jak 0,0 — to nie jest wiarygodna lokalizacja.',
        '',
        'Najczęstsze przyczyny:',
        '- zdjęcie wysłane przez komunikator lub skopiowane przez aplikację, która usuwa EXIF,',
        '- w aparacie wyłączono tagowanie lokalizacji,',
        '- zdjęcie jest zrzutem ekranu albo kopią po kompresji,',
        '- przeglądarka/telefon przekazał obraz bez pełnych metadanych.'
      );
      $('fileResult').textContent = rows.join('\n');
    }
  } catch (e) {
    $('fileResult').textContent += '\n\nBłąd odczytu EXIF: ' + e.message;
  }
});

window.addEventListener('beforeunload', () => {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});
