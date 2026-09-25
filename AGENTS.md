# AGENTS.md

## Project

Deze repository bevat de Google Apps Script-applicatie voor **Miracle Queen Tribute Gig Sync**.

Google Sheets is de administratieve bron voor optredens, vluchten, hotels en niet-beschikbaarheid. De applicatie synchroniseert gegevens met Google Calendar, importeert gegevens uit Gmail en publiceert notificaties.

Beschouw de repository als bron van waarheid voor actuele structuur en gedrag.

---

## Kernregels

Behoud bestaand gedrag tenzij de gevraagde wijziging dit expliciet verandert.

Kies bij voorkeur de kleinste gerichte wijziging die het probleem oplost.

Bij niet-triviale wijzigingen:

* inspecteer eerst de relevante implementatie, callers, configuratie en tests;
* controleer mogelijke side effects;
* controleer of externe MQT-libraries betrokken zijn;
* baseer gedrag niet uitsluitend op comments of JSDoc wanneer de implementatie beschikbaar is;
* hergebruik bestaande componenten en patronen voordat nieuwe infrastructuur wordt geïntroduceerd.

Doe niet automatisch het volgende:

* refactor niet-gerelateerde code;
* hernoem publieke of globale functies zonder callers en stringreferenties te controleren;
* wijzig Sheet-schema's of statusovergangen als onderdeel van een niet-gerelateerde wijziging;
* wijzig impliciet contracten van externe libraries;
* introduceer nieuwe architectuurpatronen uitsluitend voor uniformiteit.

Rapporteer bredere verbeteringen afzonderlijk in plaats van ze automatisch mee te nemen.

---

## Runtime

Dit is een **Google Apps Script V8**-project.

Ga er niet vanuit dat Node.js- of browser-API's tijdens de Apps Script-runtime beschikbaar zijn.

Globale entrypoints kunnen vanuit spreadsheetmenu's en geïnstalleerde triggers bij naam worden aangeroepen. Mappen vormen binnen Apps Script geen JavaScript-namespaces.

Er is een lokale Node.js-unit-testrunner voor geïsoleerde unit-tests.

---

## Architectuur

Volg de bestaande architectuur van het geraakte domein.

Services gebruiken doorgaans een IIFE-gebaseerd modulepatroon met een expliciet publiek return-object. Afhankelijkheden worden meestal via globale namen gebruikt.

Behoud bestaande verantwoordelijkheidsgrenzen en introduceer geen extra abstractielagen uitsluitend voor architecturale uniformiteit.

Technische logging en auditlogging hebben verschillende verantwoordelijkheden en blijven gescheiden.

---

## Externe MQT-libraries

Gig Sync gebruikt externe Google Apps Script-libraries, waaronder:

* `Flight` — parsing van vluchtmails;
* `Hotel` — parsing van hotelmails;
* `Notify` — aflevering van notificaties.

Deze implementaties worden buiten deze repository beheerd.

Respecteer hun publieke contracten en dupliceer hun implementatielogica niet in Gig Sync.

Wanneer een wijziging afhankelijk is van gedrag van een externe library, inspecteer de betreffende library-repository wanneer deze beschikbaar is. Benoem anders expliciet welk gedrag niet kon worden geverifieerd.

---

## Sheets en synchronisatie

Google Sheets bevat operationele data en vormt een belangrijk applicatiecontract.

Gebruik bestaande `CONFIG`-waarden en headergestuurde toegang waar deze beschikbaar zijn.

Behandel wijzigingen aan Sheet-headers, statussen en statusovergangen als potentieel breaking en analyseer eerst de relevante afhankelijkheden.

De primaire synchronisatierichting is:

```text
Google Sheets
    ↓
Google Calendar
```

Introduceer geen Calendar-naar-Sheets-synchronisatie of nieuwe synchronisatiestatussen zonder expliciete functionele noodzaak.

Datum- en tijdwaarden kunnen per domein verschillende betekenissen hebben. Controleer de bestaande semantiek voordat datum- of tijdlogica wordt gewijzigd.

---

## Side effects en foutafhandeling

Behoud bij synchronisatie waar mogelijk isolatie per record.

Houd rekening met side effects op:

* Google Sheets;
* Google Calendar;
* Gmail;
* notificaties;
* externe API's;
* caches;
* externe MQT-libraries.

Introduceer retrygedrag alleen nadat risico's op dubbele Calendar-events, imports, notificaties of andere side effects zijn geanalyseerd.

---

## Secrets

Hardcode, log, commit of toon nooit credentials, API-keys, OAuth-tokens of andere secrets.

Gebruik bestaande veilige configuratiemechanismen zoals Script Properties.

Lees, toon, kopieer of wijzig `.clasprc.json` niet.

Neem echte credentials niet op in tests, fixtures, prompts, documentatie of foutmeldingen.

---

## Veilig testen

Geef voorkeur aan geïsoleerde lokale unit-tests zonder externe side effects.

Een functie met `test` in de naam is niet automatisch veilig.

Voer nooit zonder expliciete toestemming tests of diagnostische functies uit die mogelijk:

* productiegegevens wijzigen;
* Google Sheets of Calendar wijzigen;
* Gmail verwerken of labels wijzigen;
* notificaties versturen of queues verwerken;
* externe API's aanroepen;
* caches of andere persistente toestand wijzigen.

Inspecteer bij twijfel eerst de test en zijn afhankelijkheden.

Bij gedragswijzigingen:

* voeg waar praktisch gerichte tests toe of pas bestaande tests aan;
* wijzig assertions niet alleen om een foutieve implementatie groen te krijgen;
* rapporteer welke tests daadwerkelijk zijn uitgevoerd;
* benoem tests die vanwege side effects niet zijn uitgevoerd.

---

## Git en deployment

Voer geen `git commit`, `git push`, `clasp push`, `clasp deploy`, `clasp redeploy` of andere remote- of deploymenthandeling uit zonder expliciete opdracht van de gebruiker.

---

## Codestijl

Volg primair de stijl van de bestaande bestanden die worden gewijzigd.

Belangrijke conventies:

* Engelse identifiers;
* voornamelijk Nederlandse comments en JSDoc;
* `camelCase` voor functies en variabelen;
* `PascalCase` voor klassen;
* `UPPER_SNAKE_CASE` voor constanten en statussen;
* afsluitende `_` voor interne helperfuncties waar dit patroon wordt gebruikt;
* kleine functies en guard clauses;
* JSDoc voor relevante publieke contracten en foutvoorwaarden.

Voer geen formatting-only wijzigingen uit in bestanden die niet bij de taak betrokken zijn.
