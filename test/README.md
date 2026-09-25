# Tests

## Lokaal zonder externe side-effects

Installeer Node.js met npm. Zorg dat het gedeelde package `mqt-test-runner`
naast deze repository staat (zie [de runnerhandleiding](../../mqt-test-runner/README.md)).
Voer vanuit de repository uit:

```sh
npm ci
npm run test:unit
```

Het npm-script gebruikt de gedeelde runner via een lokale development dependency.
Suites, mocks en assertions blijven in deze repository.
Wijzigingen aan de gedeelde runner gelden direct voor alle lokaal gekoppelde projecten.

## Coverage

Installeer de development dependencies vanuit de lockfile en voer uit:

```sh
npm ci
npm run test:coverage
```

Dit draait dezelfde unit-tests met c8/V8-coverage. De terminal toont statements,
branches, functies en regels. Open `coverage/index.html` voor het HTML-rapport.
Machineleesbare resultaten staan in `coverage/coverage-summary.json` en
`coverage/coverage-final.json`. Er geldt geen minimaal dekkingspercentage.

De selectie in `package.json` omvat alle productie-JavaScript, inclusief niet
geladen bestanden met 0% dekking. Tests, mocks en runner tellen niet mee.
Niet-geteste bestanden worden alleen gelezen voor het rapport, niet uitgevoerd.
Absolute VM-bestandsnamen koppelen de metingen aan de bronbestanden.

Coverage meet uitvoering, niet de kwaliteit van assertions. V8/c8 gebruikt voor
volledig ongeladen bestanden synthetische nuldekking; vooral totale functie- en
branchpercentages zijn daarom geen exacte telling van alle functies en beslissingen
in die bestanden. Beoordeel ook de afzonderlijke bestanden en hun ontbrekende paden.

De rapporten en `node_modules/` worden uitgesloten van Git en clasp. De lockfile
wordt wel gecommit, maar niet geüpload naar Apps Script. Zie ook de
[c8-documentatie](https://github.com/bcoe/c8).

De runner voert de unit-tests uit met tijdzone `Europe/Brussels`.
Elke test krijgt een nieuwe VM-context. Alleen expliciet vermelde bronbestanden
worden geladen; Script Properties, Google-services en externe libraries worden
niet aangeroepen. Configuratiewaarden en UUID-generatie worden gestubd.
De runner meldt elke uitslag en geeft exitcode 1 als een test mislukt.

Voeg nieuwe tests expliciet toe aan `suites` in `scripts/unit-test-suites.cjs`, met
de benodigde bronbestanden in laadvolgorde en eventuele in-memory mocks. Houd
tests synchroon. De VM is bedoeld voor isolatie van vertrouwde repositorytests,
niet als beveiligingssandbox voor onbekende code.

## Domeintests

Alle 17 services onder `domain/` hebben een eigen suite, inclusief de bestaande
gig-datum/tijd- en vluchtmappertests. De gedeelde Calendar- en synccontracttests
worden apart voor elk domein uitgevoerd. De uitvoer vermeldt daarom ook de suitenaam.

`scripts/domain-test-support.cjs` bouwt per test een nieuwe in-memory fixture voor
Sheets, Calendar, Gmail, HTTP, logging en notificaties. Alleen de service onder
test wordt echt geladen (met waar nodig de gedeelde datumhelpers en CONFIG).
Parser- en Notify-libraries worden niet uitgevoerd; deze tests controleren hun
lokale aanroepen, niet de externe implementaties. De datumformatterstub ondersteunt
uitsluitend de gebruikte formaten en bewijst niet het gedrag van Utilities zelf.

De nieuwe `domain-*-tests.js` zijn uitsluitend bedoeld voor de lokale runner.
Een guard stopt ze vóór serviceaanroepen als de lokale fixture ontbreekt.
Ze overschrijven geen services in het echte Apps Script-project.

## Audit-tests

De suite `audit` test `BaseAuditEntry`, de vier domeinklassen, de entry-factory en
`auditService`. De tests controleren de vaste auditkolommen, Session-fallbacks,
ontbrekende recordvelden, append-only writes en foutafhandeling.
`scripts/audit-test-support.cjs` vervangt Session, Sheets en logging door in-memory
mocks. Een guard voorkomt uitvoering buiten de lokale runner.
De tests leggen ook het bestaande vluchtgedrag vast: ontbrekende luchthavencodes
verschijnen als `undefined` in de routetitel.

## Common-tests

De `common-*` suites testen de overige services in `common/`, naast de bestaande
audit-tests. Dit omvat Script Properties, datum/tijd, logging, Sheets en caching,
statusovergangen, editcontext en editafhandeling, foutnotificaties, menu en
kolombeveiliging. `config.js` wordt gebruikt door de tests voor deze contracten;
er is geen aparte test die alleen de configuratieconstanten herhaalt.

`scripts/common-test-support.cjs` levert per suite in-memory mocks. Iedere suite
laadt de te testen service met alleen de benodigde configuratie en testhelpers.
De guards in `test/helpers/common-unit-util.js` blokkeren uitvoering buiten de
lokale runner. De notificatietests controleren de aanroepen aan Notify, niet de
externe fingerprintimplementatie, queue of aflevering. Ook de datumformatter is
een stub: de tests controleren het meegegeven formaat en de tijdzone.

## Indeling

- `unit/`: tests met lokale invoer en eventueel mocks, zonder externe mutaties.
- `helpers/`: gedeelde assertions.
- `integration/`: handmatige tests en helpers met echte services. Deze kunnen
  API-quota gebruiken, Sheets of Gmail-labels wijzigen en notificaties publiceren
  of verwerken. Voer ze uitsluitend uit met expliciete toestemming, na controle
  van hun side-effects. De lokale runner laadt deze bestanden niet.

De bestaande testfuncties blijven bruikbaar in Apps Script. `.claspignore` sluit
de lokale runner en npm-configuratie uit van uploads. Lokale tests verifiëren
JavaScript-logica; ze bewijzen niet het gedrag van echte Apps Script-services.
