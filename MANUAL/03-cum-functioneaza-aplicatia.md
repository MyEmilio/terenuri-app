# MANUAL – Aplicația „Terenuri”
## 03. Cum funcționează aplicația (flux complet, pas cu pas)

În capitolul ăsta înțelegi „cine face ce” în aplicație, fără magie.
Ținta: să știi unde să modifici când vrei o funcție nouă.

---

## 1) Ce face aplicația (pe scurt)

Aplicația îți permite să:
- adaugi terenuri (în listă + pe hartă)
- muți pinul (drag) și să **salvezi coordonatele**
- confirmi locația (blocare pin)
- exporți (CSV / Print PDF)
- păstrezi datele în browser (localStorage)

---

## 2) Fișierele cheie și rolul lor

### `app/page.tsx` (creierul)
Aici este „logica”:
- lista terenurilor în `useState`
- încărcare din `localStorage` la pornire
- salvare automată în `localStorage` când se schimbă ceva
- butoane: Adaugă / Șterge / Confirmă / Deblochează / Export

### `app/map.tsx` (harta)
Aici este „vizualul”:
- Leaflet map (OpenStreetMap)
- Markere pentru fiecare teren
- Drag & drop pe marker
- Popup cu detalii
- Trimite coordonatele către `page.tsx`

### `app/layout.tsx`
Structura HTML de bază.

### `app/globals.css`
Stiluri generale + setări ca harta să ocupe ecranul complet.

---

## 3) Tipul de date „Land” (teren)

În aplicație lucrăm cu un obiect teren (exemplu):

- `id` – unic (ca să știm exact ce teren modificăm)
- `title` – nume teren
- `locality` – oraș/localitate
- `link` – link către anunț
- `lat`, `lng` – coordonate pin
- `score` – scorul tău
- `negotiatedPrice` – preț negociat
- (opțional) `confirmed` – dacă pinul este blocat

Important: `id` este cheia. Fără el, nu știm ce marker ai mutat.

---

## 4) Fluxul complet: de la pornire până la salvare

### Pasul A — Pornește aplicația
Rulezi:
- `npm run dev`
și deschizi:
- `http://localhost:3000`

### Pasul B — La pornire: citim din localStorage
În `page.tsx` există un `useEffect(() => { ... }, [])`
care:
1) citește `localStorage.getItem(STORAGE_KEY)`
2) dacă există, pune în `setLands(JSON.parse(raw))`
3) dacă nu există, pune un „seed” (un teren exemplu)

Asta înseamnă:
- dacă ai salvat ieri 10 terenuri → le vezi azi automat

### Pasul C — Ori de câte ori se schimbă `lands`, salvăm automat
Tot în `page.tsx` există:
- `useEffect(() => localStorage.setItem(...), [lands])`

Asta înseamnă:
- adaugi teren → se salvează
- ștergi teren → se salvează
- muți pinul → se salvează
- confirmi / deblochezi → se salvează

---

## 5) Cum se transmite mutarea pinului (map.tsx → page.tsx)

Aici e piesa „interesantă”.

### În `map.tsx`
Când tragi markerul și îl lași (dragend), Leaflet îți dă noua poziție:
- `p.lat`, `p.lng`

Apoi trimitem un mesaj către aplicație folosind un event custom:

- `window.dispatchEvent(new CustomEvent("markerMoved", { detail: { id, lat, lng } }))`

Asta e ca și cum ai striga:
> „Markerul cu ID=XYZ s-a mutat la (lat,lng)!”
### În `page.tsx`
Noi ascultăm mesajul:
- `window.addEventListener("markerMoved", onMarkerMoved)`
Când vine event-ul:
1) luăm `id, lat, lng`
2) facem update DOAR la terenul care are acel `id`:
   - `setLands(prev => prev.map(...))`
Rezultat:
- se schimbă `lands`
- se activează autosave
- coordonatele rămân salvate
## 6) Confirmă locația (blocare pin) – cum trebuie să fie logic
Concept:
- înainte: markerul e „draggable”
- după confirmare: markerul devine „fixed” (nu se mai mișcă)
Implementare recomandată:
- adaugi în tipul `Land` un câmp: `confirmed: boolean`
Reguli:
- dacă `confirmed === true` → `draggable={false}`
- dacă `confirmed === false` → `draggable={true}`
UI:
- buton „Confirmă locația”
- buton „De-blochează”
Când apeși confirm:
- `setLands(prev => prev.map(t => t.id===id ? {...t, confirmed:true} : t))`
Când deblochezi:
- la fel, dar `confirmed:false`
## 7) Export – ce înseamnă
### Export CSV
Ideea:
- transformăm `lands` într-un text CSV:
  - coloane: title, locality, negotiatedPrice, score, lat, lng, link, confirmed
- facem un „download” în browser
### Export PDF (Print)
Simplu:
- folosim `window.print()`
- și în CSS putem face o versiune „print-friendly”
  (de ex. să ascundem harta și să arătăm doar lista)
## 8) Unde modifici când vrei ceva nou (hartă rapidă)
- Vrei câmp nou la teren (ex: suprafață, preț/mp)?
  → `page.tsx` (tipul Land + form UI) + în listă + în CSV
- Vrei să schimbi ce apare în popup?
  → `map.tsx` (Popup)
- Vrei alt centru/zoom inițial?
  → `map.tsx` (MapContainer center/zoom)
- Vrei alt stil (culori, spațiere)?
  → `globals.css` și stilurile inline din `page.tsx`
## 9) Probleme tipice și ce înseamnă
### „window is not defined”
Înseamnă că acel cod rulează pe server.
Soluții:
- `use client`
- `dynamic(() => import(...), { ssr:false })`
- nu folosi `window` în top-level (doar în `useEffect`)
### Harta nu apare / e mică
De obicei e CSS:
- `.leaflet-container` trebuie să aibă height/width.
## 10) Ce trebuie să știi pe de rost (minim)
Dacă reții doar asta, e suficient:
- `page.tsx` = logica + date + localStorage
- `map.tsx` = harta + markere + drag
- `markerMoved` = mesajul prin care coordonatele ajung în `page.tsx`
- `[lands]` în `useEffect` = autosave
## Următorul pas (capitol 04)
În 04 facem „Confirmă locația” perfect:
- confirmed în tip
- draggable controlat
- status în UI
- test clar: confirm → nu se mai mișcă, refresh → rămâne confirmat
