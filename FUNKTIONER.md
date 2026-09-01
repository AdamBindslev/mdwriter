# 📄 Flowscribe — Funktions- & Funktionsbeskrivelse

> **Flowscribe v2.4.6** — En moderne, distraktionsfri skriveplatform med tre unikke skrivemiljøer: Standard Markdown Editor, Mekanisk Skrivemaskine og Retro CRT Terminal. Fuldstændig offline-kompatibel (PWA), 100 % privatlivsbevidst og optimeret til fokuseret tekstproduktion.

---

## 🧭 Indholdsfortegnelse
1. [Overordnet Formål & Filosofi](#-overordnet-formål--filosofi)
2. [De 3 Skrivemiljøer](#-de-3-skrivemiljøer)
   - [1. Standard Markdown Editor (Splitview)](#1-standard-markdown-editor-splitview)
   - [2. Klassisk Mekanisk Skrivemaskine](#2-klassisk-mekanisk-skrivemaskine)
   - [3. Retro CRT Terminal](#3-retro-crt-terminal)
3. [Dokumenthåndtering & Metadatasystem](#-dokumenthåndtering--metadatasystem)
4. [Formatering & Markdown-motor](#-formatering--markdown-motor)
5. [Fokus-timer (Pomodoro) & Skrivefokus](#-fokus-timer-pomodoro--skrivefokus)
6. [Eksport- & Delingsmuligheder](#-eksport---delingsmuligheder)
7. [Realtidsstatistik](#-realtidsstatistik)
8. [Offline-funktionalitet & Sikkerhed (PWA)](#-offline-funktionalitet--sikkerhed-pwa)
9. [Tastaturgenveje](#-tastaturgenveje)

---

## 🎯 Overordnet Formål & Filosofi

Flowscribe er skabt til forfattere, forskere, journalister, udviklere og studerende, der ønsker et roligt, æstetisk og uforstyrret skriverum uden abonnementer, dataindsamling eller unødig kompleksitet.

- **100 % Lokal & Privat:** Alle tekster opbevares udelukkende på din egen enhed i browserens lokale hukommelse (`localStorage` / `sessionStorage`). Der sendes aldrig data til eksterne servere.
- **Offline-først (PWA):** Fungerer fuldstændigt uden internetforbindelse via Service Worker og kan installeres som en selvstændig app på macOS, Windows, Linux, iPad/iOS og Android.
- **Konsistent Arkitektur:** Dokumenter og kladder deles problemfrit på tværs af de tre skrivemiljøer.

---

## 🖥️ De 3 Skrivemiljøer

Flowscribe indeholder tre specialdesignede skrivemiljøer, som kan skiftes direkte fra toppen af programmet:

### 1. Standard Markdown Editor (`index.html`)
Det moderne arbejdsmiljø med direkte visualisering af det færdige resultat.
- **3 Visningstilstande:**
  - **Splittet (Splitview):** Editor i venstre side og formateret forhåndsvisning i højre side.
  - **Kun Editor:** Fuld skriveflade til Markdown-tekst uden visuelle forstyrrelser.
  - **Kun Preview:** Læsevisning af det færdigt renderede dokument.
- **Synkroniseret Rulning:** Når du ruller i editoren, følger forhåndsvisningen automatisk og præcist med.
- **Midterlinje-rulning (Typewriter Scroll):** Holder den aktive linje i centrum af skærmen under skrivning.
- **Mørkt & Lyst Tema:** Nemt skift mellem mørk nat-tilstand og lys dag-tilstand.
- **Visuelle Retursymboler:** Diskrete linjeskift-markører (`↵`) til tydeligt overblik over afsnit.

### 2. Klassisk Mekanisk Skrivemaskine (`skrivemaskine.html`)
En sanselig retro-skriveoplevelse inspireret af klassiske manuelle skrivemaskiner.
- **Autentisk Lydsystem:** Realistiske mekaniske tastelyde ved anslag, mellemrum, sletning (backspace) og linjeskift/vognretur. Lyd kan slås til og fra med et enkelt klik.
- **3 Udskiftelige Blækbånd:**
  - **Sort:** Klassisk mørkt blæk på let patineret papir.
  - **Rød:** Rødt korrektur- og fremhævelsesblæk.
  - **Sepia:** Varm antik tone med høj nostalgi.
- **Klassisk Typografi:** Sat op med *Courier Prime* og *Special Elite* skrifttyper for den rette taktile fornemmelse.
- **Midterlinje-fastholdelse:** Papiret ruller opad bag valsen, så skrivelinjen altid er i midten.

### 3. Retro CRT Terminal (`terminal.html`)
Inspireret af 1980'ernes grønne CRT-monitorer, VT220-terminaler og film som *WarGames* og *The Matrix*.
- **4 Phosphor Farvetemaer:**
  - **Matrix Grøn:** Klassisk grøn phosphor (VT220-stil).
  - **WarGames Amber:** Varm orange-ravfarvet phosphor (WOPR-stil).
  - **Cyberpunk Cyan:** Elektrisk cyanblå phosphor.
  - **Monochrome Hvid:** Skarp, lysende hvid papirskærm.
- **Justerbare CRT-effekter:**
  - **Scanlines:** Rektangulære rasterlinjer for autentisk billedrørsudseende.
  - **Skærmbue (Curved Screen):** Konveks skærmkrumning med vignettering.
  - **Phosphor Glow:** Skærmens tegn lyser op og eftergløder.
  - **Skærmflimmer (Flicker):** Let 50/60Hz billedrørsflimmer.
- **TTY Systemstatus:** Live statuslinje med digitalt ur, baudrate og terminalinformation.

---

## 🏷️ Dokumenthåndtering & Metadatasystem

Flowscribe opbygger automatisk en professionel Markdown-struktur:

1. **Dokumenttitel:**
   - Indtastes i titelfeltet og indsættes automatisk som dokumentets primære H1-overskrift (`# Titel`).
   - Danner automatisk grundlag for filnavnet ved eksport.
2. **Notefelt & Kategorier (Metadata):**
   - Indsættes automatisk under titlen som kursiv metadatalinje (`*Dato: ... | Sted: ... | Tags: ...*`).
   - **Hurtig-knapper (Quick-chips):**
     - `+ Dato`: Indsætter automatisk dags dato på dansk (f.eks. `Dato: 14. august 2026`).
     - `+ Sted`: Indsætter skabelon eller henter aktuel geoplacering.
     - `+ Tags`: Indsætter tag-struktur til søgning og indeksering.
3. **Automatiseret Filnavn-standard:**
   - Genererer automatisk standardiserede filnavne efter formatet:  
     `yymmdd titel.md` (f.eks. `260814 feltdagbog.md`).
   - Renser automatisk filnavnet for ugyldige systemtegn, så filerne kan bruges fejlfrit på både macOS, Windows og Linux.
4. **Drag & Drop Import:**
   - Træk en eksisterende `.md` fil direkte ind i vinduet for at indlæse tekst, titel og metadata med det samme.

---

## ✍️ Formatering & Markdown-motor

Flowscribe understøtter **GitHub Flavored Markdown (GFM)** samt udvidede diagrammer:

| Funktion | Markdown Syntaks | Værktøjsknap / Genvej |
| :--- | :--- | :--- |
| **Overskrift 1** | `# Overskrift` | `H1` / <kbd>F1</kbd> |
| **Overskrift 2** | `## Overskrift` | `H2` / <kbd>F2</kbd> |
| **Overskrift 3** | `### Overskrift` | `H3` / <kbd>F3</kbd> |
| **Fed tekst** | `**fed tekst**` | <kbd>F4</kbd> / <kbd>⌘B</kbd> |
| **Kursiv tekst** | `*kursiv tekst*` | <kbd>F5</kbd> / <kbd>⌘I</kbd> |
| **Gennemstreget** | `~~overstreget~~` | Gennemstreg-knap |
| **Inline kode** | `` `kode` `` | <kbd>F6</kbd> |
| **Citatblok** | `> Citat` | <kbd>F7</kbd> |
| **Punktopstilling** | `- Punkt` | <kbd>F8</kbd> |
| **Nummereret liste** | `1. Punkt` | <kbd>F9</kbd> |
| **Tjekliste / To-do** | `- [ ] Opgave` | <kbd>F10</kbd> |
| **Hyperlink** | `[tekst](url)` | <kbd>F11</kbd> / <kbd>⌘K</kbd> |
| **Kode- & tekstblok** | ` ``` tekst ``` ` | <kbd>F12</kbd> |
| **Mermaid Diagram** | ` ```mermaid ... ``` ` | Diagram-knap |
| **Tabel** | `\| Kolonne 1 \| Kolonne 2 \|` | Tabel-knap |
| **Vandret linje** | `---` | Skillelinje-knap |

### Intelligente Editor-funktioner
- **Smart Indrykning & Lister:** Tryk på <kbd>Enter</kbd> i en punktopstilling eller tjekliste fortsætter automatisk listen på næste linje. Tryk på <kbd>Enter</kbd> to gange for at afslutte listen.
- **Aktiv Værktøjslinje:** Knapperne i værktøjslinjen lyser automatisk op og viser den aktuelle formatering under tekstmarkøren.
- **Mermaid.js Diagrammer:** Lazy-loader Mermaid-biblioteket på anmodning for lynhurtig opstart. Understøtter flowcharts, sekvensdiagrammer og tidslinjer.

---

## ⏱️ Fokus-timer (Pomodoro) & Skrivefokus

En indbygget Pomodoro-timer hjælper med at opretholde koncentrationen og skabe gode skriveintervaller:

- **Fleksible Intervaller:**
  - **25 minutter fokus / 5 minutter pause** (Klassisk Pomodoro).
  - **50 minutter fokus / 10 minutter pause** (Dyb koncentration / Deep Work).
  - **Brugerdefineret tid** (Indstil egne minutter).
- **Web Audio Chime:** En harmonisk, syntetiseret klokkelyd markerer skiftet mellem arbejde og pause (kræver ingen eksterne lydfiler).
- **Distraktionsfri Fuldskærm:** Ved timer-start kan appen automatisk gå i fuldskærm og skjule menuer.
- **Auto-Hide UI:** Værktøjslinjer og knapper dæmpes/skjules diskret, mens du skriver, så kun teksten forbliver synlig.

---

## 💾 Eksport- & Delingsmuligheder

Dokumentet kan eksporteres og overføres på flere måder via eksport-menuen:

1. **Download Markdown (`.md`):**  
   Eksporterer den komplette Markdown-fil med dato-præfix og renset titel.
2. **Gem som PDF / Print (<kbd>⌘P</kbd> / <kbd>Ctrl+P</kbd>):**  
   Udskriver eller gemmer som PDF via browserens print-dialog. Flowscribe har et skræddersyet print-stylesheet, der fjerner al UI-støj, optimerer margener til A4 og sikrer pæne sideskift.
3. **Download som HTML (`.html`):**  
   Genererer en selvstændig, fuldt stylet HTML-fil klar til visning i enhver browser.
4. **Download som Ren Tekst (`.txt`):**  
   Eksporterer som uformateret tekstfil.
5. **Kopiér til Udklipsholder:**  
   - Kopiér ren Markdown direkte til udklipsholderen.
   - Kopiér som formateret rig tekst (HTML) til indsættelse i Word, Google Docs, e-mails osv.

---

## 📊 Realtidsstatistik

I bunden af skrivefladen viser statuslinjen altid opdateret statistik:
- **Ordantal:** Antal ord i den samlede tekst.
- **Tegnantal:** Antal tegn inklusive/eksklusive mellemrum.
- **Linjeantal:** Antal linjer i dokumentet.
- **Læsetid:** Estimeret læsetid baseret på en gennemsnitlig læsehastighed på 200 ord/minut.

---

## 🔒 Offline-funktionalitet & Sikkerhed (PWA)

- **Service Worker Caching:** Alle nødvendige scripts, ikoner, lyde og skrifttyper caches lokalt ved første indlæsning. Flowscribe fungerer 100 % uden netforbindelse.
- **Automatisk Gemmefunktion (Auto-save):** Ændringer i titel, metadata og brødtekst gemmes løbende i browseren, så intet går tabt ved utilsigtet genindlæsning eller strømsvigt.
- **XSS & Sikkerhed:** Alt indhold parses gennem `DOMPurify` for at sikre, at der ikke kan indsættes skadelig kode i forhåndsvisningen.

---

## ⌨️ Tastaturgenveje

| Tastaturgenvej | Funktion |
| :--- | :--- |
| <kbd>F1</kbd> – <kbd>F3</kbd> | Indsæt Overskrift 1, 2 eller 3 |
| <kbd>F4</kbd> | Gør tekst **fed** |
| <kbd>F5</kbd> | Gør tekst *kursiv* |
| <kbd>F6</kbd> | Indsæt `inline kode` |
| <kbd>F7</kbd> | Indsæt citatblok |
| <kbd>F8</kbd> | Punktopstilling (`-`) |
| <kbd>F9</kbd> | Nummereret liste (`1.`) |
| <kbd>F10</kbd> | Tjekliste / To-do (`- [ ]`) |
| <kbd>F11</kbd> | Indsæt hyperlink |
| <kbd>F12</kbd> | Indsæt kodeblok |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd> | Download som `.md` fil |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>P</kbd> | Gem som PDF / Udskriv |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> | Fed formatering |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>I</kbd> | Kursiv formatering |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Indsæt link |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> | Skift mellem visninger (Split / Editor / Preview) |
| <kbd>Alt</kbd> + <kbd>F</kbd> | Slå Fuldskærm / Distraktionsfri til/fra |
| <kbd>?</kbd> eller <kbd>⌘</kbd>+<kbd>/</kbd> | Åbn genvejsmenu |
| <kbd>ESC</kbd> | Forlad fuldskærm eller luk dialoger |

---

*Flowscribe er udviklet af [Adam Bindslev](https://linktr.ee/adambindslev).*
