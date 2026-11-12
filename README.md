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

L'apartat **Pressupostos** deixa escollir el projecte i les tasques a incloure i genera un PDF amb emissor, client, descripcions, referència, dates, preus i condicions. Es pot **ocultar l'estimació d'hores** i, independentment, la tarifa; els imports estimats continuen visibles. El PDF no és una factura, no calcula impostos ni converteix el rang en un preu tancat. El pressupost és una estimació editable a partir de les tasques, no un registre d'acceptació contractual ni un document amb versions persistides.

L'**adreça de l'emissor** a Configuració ara accepta salts de línia; aquests apareixen també al PDF del pressupost.

La generació del PDF és local al navegador, sense enviar informació comercial a serveis externs. Les dades JSON antigues són compatibles i els registres d'hores existents no es modifiquen.
