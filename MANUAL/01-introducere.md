# MANUAL – Aplicația „Terenuri”

## 01. Introducere

### Ce este acest proiect?

Acest proiect este o **aplicație web reală**, construită pas cu pas, care permite:

- afișarea terenurilor pe hartă (Leaflet / OpenStreetMap)
- mutarea pinilor pe hartă
- salvarea automată a coordonatelor
- confirmarea / blocarea poziției unui teren
- gestionarea unei liste de terenuri (adăugare / ștergere)
- salvarea datelor în browser (localStorage)

Aplicația NU este un exercițiu teoretic.  
Este un proiect **practic**, funcțional, care poate fi extins și folosit real.

---

### Scopul acestui manual

Acest MANUAL are 4 scopuri clare:

1. Să înțelegi **ce face fiecare fișier**
2. Să înțelegi **de ce funcționează codul**
3. Să poți **modifica aplicația fără frică**
4. Să poți **reconstrui proiectul de la zero**, dacă vrei

Manualul este scris:
- fără limbaj complicat
- fără presupuneri
- ca pentru cineva care **învață serios**, nu „copiește orbește”

---

### Ce tehnologii folosim (pe scurt)

- **Next.js** – framework React modern
- **React** – pentru interfață
- **TypeScript** – pentru cod mai sigur
- **Leaflet** – pentru hartă
- **OpenStreetMap** – hărți gratuite
- **localStorage** – salvare date în browser
- **Visual Studio Code** – editorul principal

Nu trebuie să le știi pe toate dinainte.  
Le înveți **din proiect**, nu din teorie.

---

### Structura proiectului (privire de ansamblu)

Proiectul se numește:

