🧠 Concluzie importantă
Dacă reții doar asta, e suficient:
page.tsx = logică
map.tsx = hartă
MANUAL/ = învățare
localStorage = salvare
npm run dev = pornește aplicația
🗂 Structura generală a proiectului
terenuri-app/
│
├─ app/
│  ├─ page.tsx
│  ├─ map.tsx
│  ├─ layout.tsx
│  └─ globals.css
│
├─ public/
│
├─ MANUAL/
│  ├─ 01-introducere.md
│  └─ 02-structura-proiectului.md
│
├─ node_modules/
│
├─ package.json
├─ package-lock.json
├─ next.config.ts
├─ tsconfig.json
└─ README.md
📁 app/ – INIMA aplicației
Aici trăiește aplicația propriu-zisă.
🔹 page.tsx
👉 Pagina principală a aplicației
Rol:
gestionează lista de terenuri
salvează datele în localStorage
afișează sidebar-ul
comunică cu harta
📌 Regula de aur:
page.tsx = logica aplicației
🔹 map.tsx
👉 Componenta cu harta (Leaflet)
Rol:
afișează harta
afișează pinii
permite mutarea pinilor
trimite coordonatele către page.tsx
📌 Regula de aur:
map.tsx = doar hartă, fără logică de business
🔹 layout.tsx
👉 Scheletul HTML al aplicației
Rol:
definește <html> și <body>
se aplică tuturor paginilor
NU conține logică
📌 Gândește-l ca:
fundația unei case
🔹 globals.css
👉 Stiluri globale
Rol:
stiluri pentru tot site-ul
Leaflet are nevoie de acest fișier
setări de bază (font, culori, height)
📌 Fără acest fișier:
harta NU se afișează corect
📁 MANUAL/ – Creierul tău extern 🧠
Acest folder NU este pentru aplicație.
Este pentru TINE.
Conține:
explicații
pași
logică
decizii
📌 Orice proiect serios are documentație
📁 public/
👉 Fișiere statice:
imagini
icon-uri
fișiere accesibile direct din browser
📌 Exemplu:
/public/logo.png
→ http://localhost:3000/logo.png
📁 node_modules/
👉 Biblioteci instalate automat
❌ NU:
le editezi
le ștergi
le copiezi
📌 Dacă dispar → npm install
📄 package.json
👉 Fișierul de control al proiectului
Conține:
ce biblioteci folosim
ce comenzi există (npm run dev)
ce versiuni sunt compatibile
📌 Este „cartea de identitate” a proiectului.