# Tests

## Lokaal zonder externe side-effects

Installeer Node.js met npm en voer vanuit de repository uit:

```sh
npm run test:unit
```

Gewone unit-tests hebben geen dependencies nodig. Rechtstreeks uitvoeren kan
ook met `node scripts/run-unit-tests.cjs`.

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
