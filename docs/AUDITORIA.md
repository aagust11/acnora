# Auditoria funcional — ACnora 1.0

**Origen:** ZIP «gestió-de-temps-freelance». **Objectiu:** canvi de marca, simplificació de la interfície i preservació de la gestió del temps.

## Mantenir

| Àrea | Estat | Motiu |
|---|---|---|
| Clients, projectes i tasques | Mantingut | Nucli funcional; permet relacionar hores amb feina i amb client. |
| Cronòmetre per projecte | Mantingut | Redueix l'entrada manual i les omissions. |
| Registres editables i alta manual | Mantingut | Necessari per corregir errors i imputar hores a posteriori. |
| Pressupostos, tarifes i imports estimats | Mantingut | Imprescindible per avaluar rendibilitat i hores consumides. |
| Calendari | Mantingut | Bona alternativa visual a la taula de registres. |
| Informes PDF, CSV i compatible amb Excel | Mantingut | Resultat útil per compartir amb els clients. |
| Alertes de registres i auditoria | Mantingut | Control de qualitat i traçabilitat. |
| Fitxers JSON, càrrega i còpies locals | Mantingut | Fa possible GitHub Pages sense backend. |

## Canvis aplicats

1. Rebranding a **ACnora** a la navegació, capçalera, metadades web, títols i exports principals.
2. Estètica corporativa (blanc, blau marí, gris, tipografia de sistema). Eliminació d'animacions i elements decoratius superflus.
3. Menú reordenat en **Seguiment**, **Organització**, **Anàlisi i dades**. Accés ràpid per registrar temps des de qualsevol vista.
4. Pantalla buida orientativa: el primer ús ja no sembla un compte comercial fictici. Les dades de demostració són opcionals.
5. Clau de dades original preservada per compatibilitat. Normalització d'importacions JSON antigues.
6. Confirmació abans d'importar dades que substitueixen l'espai de treball actual.
7. Protecció davant l'eliminació de clients, projectes i tasques quan tenen dades associades.
8. Desament al navegador i exportació al fitxer clarament diferenciats. Corregit el registre d'auditoria que feia divergir els continguts després de desar.
9. Dates locals corregides per no fer servir UTC per «avui» i «aquesta setmana».
10. Corregit el percentatge de distribució per projecte (abans comparava històric amb mes actual).
11. Retirades dependències i metadades de Google AI Studio no utilitzades, sense afegir API ni serveis remots.
12. Workflow de GitHub Actions, proves automatitzades de dades/dates i documentació de desplegament.

## Què no eliminaria encara

- **Tasques**: poden semblar excessives en un sistema petit, però permeten imputar hores i separar projectes complexos.
- **Calendari**: val la pena conservar-lo mentre no tinguem dades reals d'ús.
- **Auditoria**: queda dins de Configuració, no al menú principal.
- **Exportacions diverses**: els informes continuen sent una funció diferencial.

## Millores recomanades, per ordre

### P0 — abans de fer-la eina habitual

- **Còpies automàtiques verificables**: avisos de còpia, detecció de dades no exportades i recuperació segura; idealment còpies xifrades si es tracten dades comercials.
- **Sessions que travessen mitjanit i entrades a més d'un dia**: el model actual té data, inici i fi en una sola fila, i pot marcar una sessió nocturna com a incoherent.
- **Proves d'interfície amb dades reals**: alta client → projecte → tasca → sessió → registre → informe → exportació/importació; prova mòbil i amb dades grans.
- **Evitar edició simultània en dues pestanyes**: `localStorage` no és una base de dades amb bloqueig d'escriptura.

### P1 — després de l'ús pilot

- **Filtre ràpid global** de clients i projectes i accions contextuals.
- **Tarifes i costos reals per projecte** (separar facturable/no facturable i distingir imports pendents de facturar).
- **Estat de facturació** de cada registre (pendent, facturat, cobrat) sense confondre informes amb factures legals.
- **Duplicació de projecte** i plantilles de tasques habituals.
- **Favorits i últim projecte** al cronòmetre.

### P2 — només si es transforma en producte multiusuari

- Login, permisos i rols d'equip.
- Base de dades real, sincronització i còpia al servidor.
- Accés des de diversos dispositius i registre d'auditoria robust al servidor.
- Integracions de facturació i n8n.

## Límits actuals que convé no ocultar

- El codi es pot publicar a GitHub Pages, però **no hi ha sincronització** dels clients i hores.
- Si s'esborra l'emmagatzematge del navegador i no existeix un JSON extern, **es perden les dades**.
- Una app local al navegador **no és equivalent a una aplicació SaaS corporativa amb servidor i garanties de disponibilitat**.
- **CI verificat:** GitHub Actions ha executat correctament `npm ci`, comprovació TypeScript, sis proves unitàries, compilació Vite i desplegament a Pages (12/11/2026). **Pendent:** comprovació visual i proves E2E completes al navegador.

## Evolució v1.2

- Blocs de treball entre projectes i tasques, opcionals i compatibles amb JSON antics.
- Trams de pressupost amb intervals d'hores i diverses tarifes (inclosa 0 €/h).
- Camps comercials multilínia editables, preservats en PDF.
- Historial de pressupostos emesos amb còpia immutable dels bytes originals del PDF, re-descàrrega, acceptació manual, eliminació manual i purga de propostes pendents caducades.
- Les còpies PDF desades en Base64 augmenten el JSON i poden assolir els límits del navegador. No hi ha purga remota quan l'aplicació és tancada. Recomanació a llarg termini: IndexedDB o backend amb estratègia de backup i integritat.
