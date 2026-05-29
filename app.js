
const VERSION = 'AUDYT-V2-20260529-CZYTELNY-150';
document.addEventListener('DOMContentLoaded', () => {document.querySelectorAll('[data-version]').forEach(e=>e.textContent=VERSION);});
let activeStream=null, audioCtx=null, analyser=null, rafId=null;
const out=(id,t)=>{const e=document.getElementById(id); if(e) e.textContent=t;};
const html=(id,t)=>{const e=document.getElementById(id); if(e) e.innerHTML=t;};
const fmt=v=>v===undefined||v===null||v===''?'brak':String(v);
const bool=x=>x?'TAK':'NIE';
function runDiagnostics(){
  const n=navigator,s=screen, lines=[];
  lines.push('Wersja kodu: '+VERSION);
  lines.push('HTTPS / bezpieczny kontekst: '+bool(window.isSecureContext));
  lines.push('Adres strony: '+location.href);
  lines.push('User-Agent: '+n.userAgent);
  lines.push('Platforma: '+fmt(n.platform));
  lines.push('Język: '+fmt(n.language));
  lines.push('Strefa czasowa: '+Intl.DateTimeFormat().resolvedOptions().timeZone);
  lines.push('Ekran: '+s.width+' × '+s.height+' px');
  lines.push('Viewport: '+innerWidth+' × '+innerHeight+' px');
  lines.push('Online: '+bool(n.onLine));
  if(n.connection) lines.push('Połączenie: '+fmt(n.connection.effectiveType)+', downlink: '+fmt(n.connection.downlink)+' Mb/s');
  lines.push('Aparat/mikrofon API: '+bool(n.mediaDevices&&n.mediaDevices.getUserMedia));
  lines.push('Lokalizacja API: '+bool(n.geolocation));
  lines.push('Powiadomienia API: '+bool('Notification' in window));
  lines.push('Kontakty API: '+bool('contacts' in n && 'ContactsManager' in window));
  out('diagOut',lines.join('\n'));
  if(n.getBattery){n.getBattery().then(b=>out('diagOut',lines.join('\n')+'\nBateria: '+Math.round(b.level*100)+'% | ładowanie: '+bool(b.charging))).catch(()=>{});}
}
function stopMedia(){
  if(activeStream){activeStream.getTracks().forEach(t=>t.stop()); activeStream=null;}
  if(audioCtx){audioCtx.close().catch(()=>{}); audioCtx=null;}
  if(rafId) cancelAnimationFrame(rafId);
  const v=document.getElementById('cameraPreview'); if(v) v.srcObject=null;
  const bar=document.getElementById('audioBar'); if(bar) bar.style.width='0%';
  out('mediaOut','Podgląd zatrzymany.');
}
async function requestMedia(mode){
  try{
    stopMedia();
    if(!navigator.mediaDevices?.getUserMedia) throw new Error('Brak MediaDevices API. Sprawdź HTTPS i przeglądarkę.');
    const constraints = mode==='camera'?{video:true,audio:false}:mode==='mic'?{audio:true,video:false}:{video:true,audio:true};
    const stream = await navigator.mediaDevices.getUserMedia(constraints); activeStream=stream;
    const tracks = stream.getTracks().map(t=>`${t.kind}: ${t.label || 'uruchomiono'}`).join('\n');
    out('mediaOut','Zgoda udzielona.\n'+tracks);
    const v=document.getElementById('cameraPreview'); if(v && stream.getVideoTracks().length){v.srcObject=stream;}
    if(stream.getAudioTracks().length) startAudioMeter(stream);
  }catch(e){out('mediaOut','Nie udało się uruchomić.\n'+e.name+': '+e.message);}
}
function startAudioMeter(stream){
  try{audioCtx=new (window.AudioContext||window.webkitAudioContext)(); const src=audioCtx.createMediaStreamSource(stream); analyser=audioCtx.createAnalyser(); analyser.fftSize=256; src.connect(analyser); const data=new Uint8Array(analyser.frequencyBinCount); const bar=document.getElementById('audioBar'); const loop=()=>{analyser.getByteFrequencyData(data); const avg=data.reduce((a,b)=>a+b,0)/data.length; if(bar) bar.style.width=Math.min(100,Math.round(avg*1.25))+'%'; rafId=requestAnimationFrame(loop);}; loop();}catch(e){}
}
function requestLocation(){
  if(!navigator.geolocation){out('locOut','Ta przeglądarka nie obsługuje geolokalizacji.'); return;}
  out('locOut','Oczekiwanie na decyzję użytkownika...');
  navigator.geolocation.getCurrentPosition(pos=>{const c=pos.coords; const url=`https://www.google.com/maps?q=${c.latitude},${c.longitude}`; html('locOut',`Zgoda udzielona.<br>Szerokość: ${c.latitude.toFixed(6)}<br>Długość: ${c.longitude.toFixed(6)}<br>Dokładność: ${Math.round(c.accuracy)} m<br><br><a target="_blank" rel="noopener" href="${url}">Otwórz położenie na mapie</a>`);},err=>out('locOut','Brak zgody albo błąd odczytu.\n'+err.message),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
async function requestNotifications(){
  if(!('Notification' in window)){out('notiOut','Ta przeglądarka nie obsługuje powiadomień.'); return;}
  try{const p=await Notification.requestPermission(); out('notiOut','Status zgody: '+p); if(p==='granted'){new Notification('Przykładowe powiadomienie szkoleniowe',{body:'Tak mogą wyglądać komunikaty zachęcające do kliknięcia.'});}}catch(e){out('notiOut','Błąd: '+e.message);}
}
async function pickContact(){
  const mask=document.getElementById('maskContact')?.checked??true;
  if(!('contacts' in navigator && 'ContactsManager' in window)){out('contactOut','Contact Picker API nie jest dostępne w tej przeglądarce. Najczęściej działa na Androidzie w Chrome i wymaga HTTPS.'); return;}
  try{const contacts=await navigator.contacts.select(['name','tel','email'],{multiple:false}); if(!contacts?.length){out('contactOut','Nie wybrano kontaktu.'); return;} const c=contacts[0]; const name=(c.name||[]).join(', ')||'brak nazwy'; let tel=(c.tel||[]).join(', ')||'brak telefonu'; let email=(c.email||[]).join(', ')||'brak e-maila'; if(mask){tel=tel.replace(/\d(?=\d{2})/g,'•'); email=email.replace(/^(.{2}).*(@.*)$/,'$1••••$2');} out('contactOut',`Wybrano kontakt:\nNazwa: ${name}\nTelefon: ${tel}\nE-mail: ${email}`);}catch(e){out('contactOut','Nie wybrano kontaktu albo odmówiono dostępu.\n'+e.message);}
}
function isValidGps(lat,lon){lat=Number(lat); lon=Number(lon); if(!Number.isFinite(lat)||!Number.isFinite(lon)) return false; if(Math.abs(lat)<0.000001 && Math.abs(lon)<0.000001) return false; if(lat<-90||lat>90||lon<-180||lon>180) return false; return true;}
async function readExifFile(input){
  const file=input.files&&input.files[0]; if(!file) return;
  const preview=document.getElementById('photoPreview'); if(preview){preview.src=URL.createObjectURL(file); preview.classList.remove('hidden');}
  const sizeMb=(file.size/1024/1024).toFixed(2); let lines=[`Wybrano plik: ${file.name}`,`Rozmiar: ${sizeMb} MB`,`Typ: ${file.type||'brak'}`];
  try{if(!window.exifr) throw new Error('Biblioteka EXIF nie została załadowana.'); const meta=await exifr.parse(file,{tiff:true,exif:true,gps:true,xmp:true,iptc:true,translateValues:false,mergeOutput:true});
    lines.push('', 'Metadane EXIF:'); lines.push('Aparat/producent: '+fmt(meta?.Make)); lines.push('Model: '+fmt(meta?.Model)); lines.push('Data zdjęcia: '+fmt(meta?.DateTimeOriginal||meta?.CreateDate||meta?.ModifyDate)); lines.push('Silnik odczytu: exifr'); const lat=meta?.latitude??meta?.GPSLatitude; const lon=meta?.longitude??meta?.GPSLongitude;
    lines.push('', 'GPS w zdjęciu:');
    if(isValidGps(lat,lon)){lines.push('Szerokość: '+Number(lat).toFixed(6)); lines.push('Długość: '+Number(lon).toFixed(6)); out('exifOut',lines.join('\n')); html('exifMap',`<a target="_blank" rel="noopener" class="btn" href="https://www.google.com/maps?q=${lat},${lon}">Pokaż miejsce wykonania zdjęcia na mapie</a>`);}else{lines.push('Brak poprawnych współrzędnych GPS w wybranym pliku.'); lines.push('Do pokazu użyj oryginalnego JPG skopiowanego kablem z DCIM/Camera.'); out('exifOut',lines.join('\n')); html('exifMap','');}}
  catch(e){lines.push('', 'Nie udało się odczytać EXIF.'); lines.push(e.message); out('exifOut',lines.join('\n')); html('exifMap','');}
}
