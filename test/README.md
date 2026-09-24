# Tests

## Lokaal zonder externe side-effects

Installeer Node.js met npm en voer vanuit de repository uit:

```sh
npm run test:unit
```

Er zijn geen dependencies; `npm install` is niet nodig. Rechtstreeks uitvoeren kan
ook met `node scripts/run-unit-tests.cjs`.

De runner voert de acht bestaande unit-tests uit met tijdzone `Europe/Brussels`.
Elke test krijgt een nieuwe VM-context. Alleen expliciet vermelde bronbestanden
worden geladen; Script Properties, Google-services en externe libraries worden
niet aangeroepen. Configuratiewaarden en UUID-generatie worden gestubd.
De runner meldt elke uitslag en geeft exitcode 1 als een test mislukt.

Voeg nieuwe tests expliciet toe aan `suites` in `scripts/run-unit-tests.cjs`, met
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
