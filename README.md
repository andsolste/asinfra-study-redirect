# ASInfra Study redirect

Dette repoet eksisterer kun for legacy-videresendingen
`study.asinfra.no` → `flow.asinfra.no`.

Supporting infrastructure for [andsolste/asinfra-study#14](https://github.com/andsolste/asinfra-study/issues/14).

## Status

**Cutover gjennomført og manuelt verifisert 20. oktober 2026.** Repoet er aktivt
på `https://study.asinfra.no/` og videresender til `https://flow.asinfra.no/`.
Deep path/query/hash er testet. `CNAME` på `main` inneholder `study.asinfra.no`.
Flow PR #22 og ASInfra PR #32 er merget; `https://asinfra.no/study/` går også
direkte til Flow, og Apps-kortet peker til Flow.

Frontend eies av `andsolste/asinfra-study`; canonical backend eies fortsatt av
`andsolste/asinfra/supabase`. Dette repoet har **kun ansvar for gammel Study-
adresse**, ikke app, backend eller Auth. Samme Supabase-prosjekt og data beholdes;
ingen backend-/data-/brukermigrasjon var nødvendig for domeneflyttingen.
Supabase Site URL er Flow; Study og lokale adresser kan fortsatt beholdes i
allowed Redirect URLs.

## Arkitektur

Kun statisk HTML med innebygd CSS/JavaScript, publisert med GitHub Pages.
Ingen React, dependencies, backend, Auth-klient, analytics, cookies eller secrets.
Ingen brukerdata lagres. URL-parametre behandles kun som ufortolkede komponenter
for videresending; de logges ikke og skrives ikke i siden.

- `index.html`: redirect for gammel rotadresse.
- `404.html`: samme side for gamle dype paths. Ingen eksterne script-/asset-paths
  som kan bryte når GitHub leverer siden fra en ukjent underkatalog.
- `.nojekyll`: publiser filene uten Jekyll-behandling.
- `CNAME`: produksjonens legacy-domain `study.asinfra.no`.
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
nettleseren videre kun ved eksplisitt klikk. Testvisningen er ikke en hosted Auth-test.

Eksempler på produksjonsredirect:

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

**Kjent testavvik etter cutover:** den eksisterende testen krever fortsatt at
`CNAME` ikke finnes. Derfor gir full suite 11 beståtte og 1 feil på dagens `main`,
selv om CNAME nå er riktig. Sikkerhetsregelen var laget for klargjøringsfasen og
trenger en separat testvedlikeholdsendring. Ikke fjern produksjonens CNAME for å
gjøre testen grønn. Testkode er ikke endret i denne dokumentasjonsoppryddingen.

## Pages i produksjon

Repoets [Pages-innstillinger](https://github.com/andsolste/asinfra-study-redirect/settings/pages)
bruker branch-publisering:

- Source: **Deploy from a branch**.
- Branch: **main**; folder: **/(root)**.
- Custom domain: **study.asinfra.no**, med HTTPS.
- Eksisterende DNS CNAME: `study` → `andsolste.github.io`.

Ingen egen Actions-workflow eller build trengs. Standard prosjektadresse var
beregnet for testing før domain-binding; i produksjon brukes den gamle Study-
adressen. Automatisk JS-redirect er fortsatt begrenset til det hostname-et.

## Historikk: cutover 20. oktober 2026

Flow ble flyttet til `flow.asinfra.no` over HTTPS. Andreas verifiserte login,
reload/session, logout, eksisterende data og signup/e-postbekreftelse. Supabase
Site URL ble flyttet til Flow. Gammel Study-binding ble overført til dette
redirect-repoet, med eksisterende DNS CNAME beholdt. Begge legacy-innganger og
Apps-lenken fungerer, og deep path/query/hash er testet på Study-redirecten.
Den opprinnelige nummererte runbooken beholdes i Flow-repoet som historisk
dokumentasjon. #14 lukkes manuelt etter dokumentasjonsreview, ikke av denne PR-en.

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

Se [sluttstatus, historisk runbook og rollback](https://github.com/andsolste/asinfra-study/blob/main/docs/flow-domain-cutover.md).
Ingen hosted innstillinger endres av denne dokumentasjonsoppryddingen.

Kilder: [GitHub branch-publisering](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[prosjekt-URL og arvet domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages),
[MDN noscript](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/noscript).
