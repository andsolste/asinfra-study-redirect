# ASInfra Study redirect

Dette repoet eksisterer kun for den planlagte videresendingen
`study.asinfra.no` → `flow.asinfra.no`.

Supporting infrastructure for [andsolste/asinfra-study#14](https://github.com/andsolste/asinfra-study/issues/14).

## Status

**Custom domain er ikke aktivert ennå.** `study.asinfra.no` peker fortsatt til
hovedappen frem til #14-cutover. Ingen DNS-, Supabase-, Auth- eller domain-endring
inngår i denne klargjøringen. PR #22 i Flow og #32 i ASInfra skal ikke merges her.

Repoet starter med én første commit på `main`; ingen kunstig
PR mot et tomt repo. Pages må aktiveres manuelt som beskrevet under. Ingen
`CNAME`-fil er lagt inn.

## Arkitektur

Kun statisk HTML med innebygd CSS/JavaScript, klargjort for GitHub Pages.
Ingen React, dependencies, backend, Auth-klient, analytics, cookies eller secrets.
Ingen brukerdata lagres. URL-parametre behandles kun som ufortolkede komponenter
for videresending; de logges ikke og skrives ikke i siden.

- `index.html`: redirect for gammel rotadresse.
- `404.html`: samme side for gamle dype paths. Ingen eksterne script-/asset-paths
  som kan bryte når GitHub leverer siden fra en ukjent underkatalog.
- `.nojekyll`: publiser filene uten Jekyll-behandling.
- `tests/redirect.test.cjs`: Node-standardbibliotek, ingen installasjon/build.

`index.html` og `404.html` er bevisst identiske og selvstendige. Rediger begge
ved endringer. Testen krever identisk innhold, slik at 404 ikke får en separat
redirectkontrakt. Et lite, delt eksternt script ville krevd base-path-håndtering
for både prosjekt-URL og dype 404-er; dette unngås her.

## Redirect og testvisning

`buildRedirectTarget` bruker alltid fast origin `https://flow.asinfra.no`.
Den kopierer `pathname`, `search` og `hash` med browserens URL-API. Den tolker
ikke `code`, tokens, `next`, referrer eller andre parametre. Query beholdes uten
`URLSearchParams` eller rekkefølgeendring, innenfor browserens vanlige URL-serialisering.

Bare **eksakt hostname `study.asinfra.no`** kjører automatisk `location.replace`.
Ingen brukerparameter velger mål-origin. Samme-origin-guard hindrer automatisk
selv-redirect dersom filen åpnes på Flow. `replace` unngår en unødvendig tilbake-loop.

På GitHub Pages-testadressen og localhost vises i stedet en liten testvisning.
Testlenke og knapp bruker bare det syntetiske eksemplet
`https://flow.asinfra.no/?foo=bar#section`, aldri faktisk query/hash fra besøket.
Ingen automatisk navigasjon skjer der når JavaScript er aktivt. Knappen sender
nettleseren videre kun ved eksplisitt klikk; den beviser ikke at Flow-domenet er klart.

Eksempler ved senere cutover:

| Gammel URL | Mål |
| --- | --- |
| `https://study.asinfra.no/` | `https://flow.asinfra.no/` |
| `https://study.asinfra.no/foo/bar?foo=bar#section` | `https://flow.asinfra.no/foo/bar?foo=bar#section` |
| `https://study.asinfra.no/?code=TEST_ONLY#access_token=TEST_ONLY&type=signup` | `https://flow.asinfra.no/?code=TEST_ONLY#access_token=TEST_ONLY&type=signup` |

Paths bevares, men Flow har ikke React Router. En ukjent path kan derfor gi 404
hos Flow; redirecten lager ikke nye app-routes. `404.html` hos GitHub leveres
med HTTP 404 før klientredirecten kjører. Dette er ikke en serverbasert 301/302.

### Uten JavaScript

Canonical og synlig lenke peker til Flow-roten. Meta refresh ligger i `noscript`,
slik at den **ikke overstyrer host-guarden eller testvisningen når JS er aktivt**.
Uten JS går fallback automatisk til Flow-roten; path/query/hash er ikke garantert.
Fragmentet kan bare håndteres eksplisitt i klienten, ikke av en HTTP-server.
Hvis JS er aktivt, men scriptet feiler, finnes fortsatt den synlige Flow-lenken.

Statisk no-JS-markup kan ikke kontrollere hostname. Den samme fallback-filen skal
derfor aldri publiseres som Flow-appen selv; JS-guarden kan ikke beskytte en slik
feilpublisering når JS er avslått. Dette repoet skal kun eie den gamle inngangen.
Referrer-policy og lenkene unngår å sende gammel URL videre som Referer-header.

## Lokal kontroll

Med Node.js 22+ fra repo-roten, uten `npm install`:

```sh
node --test tests/redirect.test.cjs
git diff --check
python -m http.server 8000
```

Åpne `http://localhost:8000/` eller `/404.html`. Vanlig Python-server bruker ikke
automatisk `404.html` på ukjente paths; testene kjører begge filenes faktiske script
med syntetisk gammel deep URL. Testene dekker root/path/query/hash, auth-lignende
verdier, ondsinnet `next`/path, host-guard, preview-knapp, loop og no-JS-markup.
Ingen test kaller hosted Auth eller navigerer til ekte tokens/adresser.

## Pages før cutover – manuell aktivering

GitHub-integrasjonen som klargjorde repoet har ikke en Pages-innstillingshandling.
Aktiver kun det nye repoets branch-publisering:

1. [Repo → Settings → Pages](https://github.com/andsolste/asinfra-study-redirect/settings/pages).
2. Source → **Deploy from a branch**.
3. Branch → **main**.
4. Folder → **/(root)**.
5. **Save**, og vent på Pages-builden.
6. La **Custom domain være tomt**. Ingen CNAME/DNS-endring nå.

Forventet standardadresse er
`https://andsolste.github.io/asinfra-study-redirect/`.
Bekreft faktisk adresse i Pages-panelet før den omtales som publisert. Dersom
kontoeierens user-site har custom domain, kan prosjektadressen arve det; ikke endre
andre sites for å få en bestemt preview-URL. Siden kjører fortsatt ikke automatisk
redirect på et annet hostname enn Study. Ingen egen Actions-workflow trengs.

## Senere cutover – ikke utført

1. Review dette repoet og de to eksisterende PR-ene. Test Pages-rot og en dyp 404.
   Godkjenn vedlikeholdsvindu og rollback: én Pages-binding kan ikke eies av to
   sites samtidig, og ny sertifikatklargjøring kan gi et tilgjengelighetsvindu.
2. Legg `https://flow.asinfra.no/` til Supabase allowed redirects. Behold Study,
   localhost/preview og andre appers returer. Ingen backend/schemaendring.
3. Merge Flow #22 når avtalt, og bind hovedappen til `flow.asinfra.no` med riktig
   DNS. Test offentlig side, assets, HTTPS, Auth/bekreftelse, recovery og data.
   Bytt Site URL først etter godkjent Auth-smoke, som beskrevet i hovedrunbooken.
4. Når gammel Study-binding er frigjort: sett **dette repoets** Pages custom domain
   til `study.asinfra.no`. GitHub kan da opprette `CNAME` på `main`; det er først
   på dette tidspunktet ønskelig. Behold `study CNAME andsolste.github.io` i Uniweb.
5. Vent på gyldig sertifikat og aktiver Enforce HTTPS. Kontroller at både rot og
   dyp 404 redirecter med path/query/hash; test ingen loop og syntetisk Auth-retur.
6. Merge ASInfra #32 etter godkjent Flow/legacy-smoke, slik at Apps og gammel
   `asinfra.no/study/` går direkte til Flow. Apex/www skal være urørt.
7. Sluttkontroller desktop/mobil og begge gamle innganger. Dokumenter resultat
   i #14 og lukk først når hele cutoveren faktisk er verifisert.

Et hostname kan måtte frigjøres før det andre repoet kan få det. Hvis ny Flow-
eller legacy-HTTPS ikke blir klart innen avtalt vindu, bruk rollback fremfor å
godkjenne HTTP/sertifikatadvarsel. Ingen null-nedetid-garanti gis.

### Rollback

Frigjør `study.asinfra.no` fra dette repoets Pages-binding først, og kontroller
at en branch-basert CNAME ikke gjeninnfører den. Sett hovedappens Pages-domain
tilbake til Study, med eksisterende CNAME/DNS og fungerende HTTPS. Gjenopprett
lagret Supabase Site URL, men behold nødvendige allowed redirects. Reverter
cutover-lenker/metadata i de andre repoene gjennom review ved behov. Ingen data,
brukere eller migrations skal endres. Ikke la to repoer konkurrere om domenet.

Se [hovedrunbooken fra preflight](https://github.com/andsolste/asinfra-study/blob/c7a38d7754c5c9da41cc24aeb313fa98b93c7cbc/docs/flow-domain-cutover.md).
Den eksisterende runbooken/PR-ene er ikke endret av denne klargjøringen.

Kilder: [GitHub branch-publisering](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[prosjekt-URL og arvet domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages),
[MDN noscript](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/noscript).
