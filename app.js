// Bezpieczne demo szkoleniowe. Brak backendu, brak wysyłania danych, brak zapisu haseł.
const $ = (id) => document.getElementById(id);
let mediaStream = null;
$('startBtn').addEventListener('click', () => {
  $('panel').classList.remove('hidden');
  $('statusText').textContent = 'Symulacja aktywna — pokazuj zgody krok po kroku';
  window.scrollTo({ top: $('panel').offsetTop, behavior: 'smooth' });
});
$('mediaBtn').addEventListener('click', async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('mediaResult').textContent = 'Ta przeglądarka lub adres nie pozwala na dostęp do aparatu/mikrofonu. Użyj HTTPS.';
      return;
    }
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    $('preview').srcObject = mediaStream;
    $('mediaResult').textContent = 'Zgoda udzielona. Podgląd działa lokalnie w przeglądarce. Nic nie jest nagrywane ani wysyłane.';
  } catch (e) {
    $('mediaResult').textContent = 'Odmowa lub błąd: ' + e.name + '. To dobra okazja, by pokazać, że użytkownik ma kontrolę nad zgodami.';
  }
});
$('stopMediaBtn').addEventListener('click', () => {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  $('preview').srcObject = null;
  $('mediaResult').textContent = 'Podgląd zatrzymany. Zgody można też cofnąć w ustawieniach przeglądarki/systemu.';
});
$('geoBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    $('geoResult').textContent = 'Geolokalizacja niedostępna w tej przeglądarce.';
    return;
  }
  $('geoResult').textContent = 'Oczekiwanie na decyzję użytkownika...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      $('geoResult').textContent = `Zgoda udzielona.\nSzerokość: ${latitude.toFixed(5)}\nDługość: ${longitude.toFixed(5)}\nDokładność: ok. ${Math.round(accuracy)} m\nDane pokazane tylko lokalnie.`;
    },
    err => $('geoResult').textContent = 'Odmowa lub błąd: ' + err.message,
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
  );
});
$('notifBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) {
    $('notifResult').textContent = 'Powiadomienia nie są obsługiwane w tej przeglądarce.';
    return;
  }
  const permission = await Notification.requestPermission();
  $('notifResult').textContent = 'Decyzja użytkownika: ' + permission + '. W realnym świecie fałszywe powiadomienia mogą podszywać się pod komunikaty systemowe.';
  if (permission === 'granted') {
    new Notification('Demo bezpieczeństwa', { body: 'To kontrolowane powiadomienie szkoleniowe.' });
  }
});
$('fileInput').addEventListener('change', () => {
  const file = $('fileInput').files[0];
  if (!file) return;
  $('fileResult').textContent = `Wybrano lokalnie:\nNazwa: ${file.name}\nRozmiar: ${(file.size/1024).toFixed(1)} KB\nTyp: ${file.type || 'nieznany'}\nPlik nie został wysłany.`;
  const url = URL.createObjectURL(file);
  $('localImage').src = url;
  $('localImage').style.display = 'block';
});
window.addEventListener('beforeunload', () => {
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
});
