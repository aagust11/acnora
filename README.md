# ACnora

**Clients · Projectes · Temps**

Aplicació web de seguiment de clients, projectes, tasques i hores treballades. Interfície en català, dissenyada per a ús individual i amb dades emmagatzemades localment al navegador. Construïda amb React, TypeScript, Vite i Tailwind CSS.

## Posar-la en marxa

Requereix Node.js 22 o compatible.

```bash
npm ci
npm run dev
```

Obre `http://localhost:3000/acnora/`. Comprovacions:

```bash
npm run lint
npm test
npm run build
npm run preview
```

L'aplicació es desplega a: `https://aagust11.github.io/acnora/` un cop configurat GitHub Pages.

## Desplegament a GitHub Pages

El repositori conté `.github/workflows/deploy.yml`. **No cal cap branca `gh-pages`**, ni la dependència `gh-pages`, ni configurar «Deploy from a branch».

1. Publica tots els fitxers d'aquest projecte (incloent-hi `.github/workflows/deploy.yml`) a `aagust11/acnora`, branca `main`.
2. Obre **Settings → Pages → Build and deployment → Source** i escull **GitHub Actions**.
3. A **Actions**, revisa el workflow «ACnora · Build i GitHub Pages». S'executarà després de cada `push` a `main` o manualment amb *Run workflow*.
4. Quan el desplegament sigui correcte, obre `https://aagust11.github.io/acnora/`.

El `base` de Vite ja està configurat com `/acnora/`. Si canvies el nom del repositori o utilitzes un domini personal, modifica aquesta ruta a `vite.config.ts`.

## Funcionalitats

- **Resum:** hores del dia, de la setmana i del mes, imports estimats, distribució per projecte i alertes.
- **Cronòmetre:** inicia i atura sessions associades a client, projecte i tasca opcional.
- **Registres:** alta manual, modificació, duplicació, filtres i comprovació d'incoherències.
- **Calendari:** vistes de calendari per consultar i gestionar les hores.
- **Clients:** dades de contacte, estats i notes.
- **Projectes:** client associat, pressupost d'hores, tarifa, dates, estat i color identificador.
- **Tasques:** seguiment per projectes, estats, categories i pressupostos d'hores.
- **Informes:** filtre per període, client i projecte; exportació de PDF, CSV i format de full de càlcul compatible amb Excel.
- **Configuració:** perfil professional, moneda, tarifa i preferències de visualització.
- **Dades i còpies:** obrir/importar un JSON, desar en un fitxer compatible o exportar còpies de seguretat.

Les dades de demostració **no es carreguen automàticament**. Es poden carregar expressament des de **Configuració → Dades de demostració**.

## Important: desament i privacitat

- Els canvis es desen al `localStorage` del navegador **en aquest dispositiu i perfil**, no en una base de dades remota.
- Si vincules un fitxer JSON amb Chrome/Edge, s'actualitza només quan prems **Desar / exportar JSON**. Si no hi ha fitxer vinculat, es descarrega un JSON.
- Netejar les dades del navegador, canviar d'ordinador o utilitzar un perfil diferent pot fer que les dades no estiguin disponibles. Fes **còpies periòdiques**.
- GitHub Pages publica el **codi de l'aplicació**, no les dades locals que introdueixis. El codi és visible perquè el repositori és públic.
- No existeix sistema d'usuaris, autenticació, base de dades, sincronització entre dispositius ni permisos per equip.
- Els JSON de l'aplicació anterior es poden importar mantenint els clients, projectes, tasques i registres. Les claus antigues de `localStorage` es conserven intencionadament.
- **Canviar de domini des de Google AI Studio a GitHub Pages no transporta automàticament el `localStorage`**. Exporta el JSON al lloc antic i importa'l a ACnora.

## Disseny de la versió 1.0

Interfície corporativa amb menú agrupat per funció, tipografia de sistema (sense peticions a Google Fonts), paleta principal blau marí/gris, accés directe al cronòmetre, estats funcionals en verd/ambre/vermell i pràcticament sense animacions decoratives. Els colors personalitzats dels projectes continuen disponibles.

## Notes de desenvolupament

El format JSON i el model de dades es mantenen compatibles amb la versió original. La compatibilitat d'importació es comprova amb les proves de `tests/core.test.cjs`. Per als riscos i millores pendents, consulta [l'auditoria funcional](docs/AUDITORIA.md).


## Pressupostos per tasca (v1.1)

Cada tasca pot tenir una **estimació mínima i màxima manual**, sense deduir-les d'un import rodó, i una **tarifa horària específica opcional**. Per exemple, 9–11 h a 50 €/h dona 450–550 € abans d'impostos. Si una tasca no té tarifa específica, s'aplica la tarifa del projecte i, finalment, la general. Les hores antigues d'un sol valor continuen llegint-se com a interval amb mínim i màxim iguals.

L'apartat **Pressupostos** deixa escollir el projecte i les tasques a incloure i genera un PDF amb emissor, client, descripcions, referència, dates, preus i condicions. Es pot **ocultar l'estimació d'hores** i, independentment, la tarifa; els imports estimats continuen visibles. El PDF no és una factura, no calcula impostos ni converteix el rang en un preu tancat. El pressupost parteix de l'estimació de les tasques. A partir de v1.2, el PDF emès es conserva immutable dins de les dades locals; marcar «acceptat» és una anotació manual, no una signatura contractual.

L'**adreça de l'emissor** a Configuració ara accepta salts de línia; aquests apareixen també al PDF del pressupost.

La generació del PDF és local al navegador, sense enviar informació comercial a serveis externs. Les dades JSON antigues són compatibles i els registres d'hores existents no es modifiquen.

## Blocs de treball, trams i pressupostos emesos (v1.2)

- **Blocs de treball** opcionals dins de cada projecte: fases, lliurables, funcionalitats o manteniment. Les tasques antigues sense bloc es conserven.
- **Diverses tarifes en una tasca**: cada tram té concepte, hores mínimes i màximes i tarifa pròpia. Una tarifa explícita de **0 €/h** compta com a dedicació no facturable. Les hores i imports se sumen per tram.
- **Descripcions multilínia**: els salts de línia de tasques, adreça, condicions i observacions es mantenen en el PDF.
- **Textos comercials editables abans d'emetre**: nota d'impostos, avís sobre l'estimació del preu, condicions comercials i observacions addicionals. Tots els camps admeten Enter.
- **Pressupost emès**: un cop creada l'oferta, es guarda en el JSON una instantània de les dades comercials **i els bytes del PDF original**; el PDF de l'historial no es torna a generar i els canvis posteriors de la tasca no l'afecten.
- **Registre**: es pot tornar a descarregar el PDF emès, marcar-lo com a acceptat o eliminar-lo manualment. Els pressupostos **pendents** s'eliminen automàticament a partir de l'endemà de la data de validesa, quan l'aplicació s'obre o mentre estigui en execució (comprovació cada minut). Els acceptats es conserven.
- La **data de validesa és obligatòria** en emetre una proposta, per poder aplicar una caducitat real.

### Límit d'emmagatzematge important

Els PDF es guarden dins del JSON local en Base64 per fer-los exportables juntament amb les dades. Això augmenta l'ocupació del `localStorage` i la mida de les còpies JSON. Si s'exhaureix la quota, ACnora no considera el pressupost com a emès i avisa de l'error. **Fes còpies periòdiques del JSON i dels PDF originals.** No existeix una tasca en segon pla: amb la web tancada no s'executa cap purga. Tampoc no és un sistema d'arxiu legal amb signatura digital ni un registre d'acceptació verificable per un tercer: marcar «acceptat» és una acció manual local.

## Desament automàtic del JSON (Chrome / Edge)

ACnora conserva una còpia de treball al navegador. A **Dades i còpies**, pots fer dues accions:

- **Crear JSON vinculat amb les dades actuals:** seleccionar una ubicació de l’ordinador i començar a desar automàticament els canvis en aquest fitxer.
- **Vincular / importar JSON:** obrir un JSON antic, importar-ne les dades després de confirmar la substitució i vincular-lo per a desaments futurs.

Quan el navegador disposa de permís d'escriptura, tots els canvis confirmats (clients, projectes, tasques, blocs, hores, pressupostos, configuració i caducitats) passen al JSON després d'una pausa de 600 ms, amb escriptures serialitzades. L'estat de desament és visible a la capçalera i a **Dades i còpies**. Es conserva el desament automàtic al navegador.

El navegador guarda la referència al fitxer a IndexedDB, però pot requerir tornar a autoritzar-ne l'accés en reobrir ACnora. Si un altre programa ha modificat el JSON des de l'última escriptura reconeguda, **ACnora no el sobreescriu**: mostra un conflicte i permet exportar les dades locals. Si no hi ha suport per a File System Access API, cal exportar manualment el JSON; el desament al navegador funciona igualment.

**Atenció:** no és un sistema de sincronització de diversos dispositius, ni una còpia de seguretat versionada. Mantén còpies periòdiques del fitxer.

## Pausar i reprendre una sessió de treball (v1.5)

- Des de **Inici** o **Cronòmetre**, durant una sessió activa pots prémer **Pausar** i després **Reprendre**. Pots repetir-ho totes les vegades que necessitis.
- El comptador mostra el **temps de treball efectiu** i es congela mentre la sessió està pausada. El temps de pausa es calcula per separat i **no es factura**.
- **Aturar** finalitza també una sessió encara pausada, restant tot el temps de descans (inclosa la pausa en curs).
- L'estat de pausa i el temps acumulat s'incorporen a la base de dades local i al **JSON vinculat amb desament automàtic**. Reobrir el navegador amb la sessió pausada no torna a iniciar el comptador.
- Els registres finals conserven el temps de pausa en segons (`pausaSegons`) i, quan escau, la data final real (`dataFi`). Això permet distingir el temps transcorregut del temps imputat i tractar sessions que travessen mitjanit.
- Els JSON antics, que no contenen aquests camps opcionals, continuen carregant-se i funcionen com abans. No s'ha modificat el model de pressupostos.

**Nota sobre arrodoniment:** com abans, les sessions amb treball efectiu positiu inferior a un minut es registren amb el mínim d'un minut; una sessió amb 0 ms de treball es registra amb 0 minuts. Les pauses no aporten minuts facturables.


### Pressupost: serveis a preu fix i import manual

A cada tasca pots afegir trams amb hores i tarifa. Si poses **0 h mínimes** i **0 h màximes**, l'import de la tarifa es tracta com un **preu fix del servei** (no com hores × tarifa). La línia del pressupost i el PDF no mostren 0 h ni €/h per a aquest tram. Amb hores positives i tarifa 0 €/h, en canvi, es registra treball no facturable.

El camp opcional **Import final manual de la tasca** permet substituir el resultat de tots els trams per un preu pactat (també 0 €). Les hores queden per a planificació interna, el PDF identifica l'ajustament i no exposa subtotals de trams que no quadrarien amb el preu final. Deixar el camp buit restaura el càlcul automàtic. Els pressupostos ja emesos conserven el PDF original.
