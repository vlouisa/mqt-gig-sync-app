# AGENTS.md

## Doel

Deze repository bevat de Google Apps Script-applicatie voor **Miracle Queen Tribute Gig Sync**.

Google Sheets is de administratieve bron voor optredens, vluchten, hotels en niet-beschikbaarheid. De applicatie publiceert deze gegevens naar Google Calendar, importeert boekingsgegevens uit Gmail en publiceert notificaties.

Dit bestand bevat instructies voor coding agents die in deze repository werken.

Volg deze regels bij het analyseren en wijzigen van de codebase.

---

## Kernregels

### Behoud bestaand gedrag

Kies bij voorkeur de kleinste wijziging die het gevraagde probleem oplost.

Doe niet automatisch het volgende:

* refactor code die niet bij de wijziging betrokken is;
* hernoem publieke of globale functies zonder alle callers en stringreferenties te controleren;
* wijzig Sheet-schema's als onderdeel van een niet-gerelateerde wijziging;
* wijzig statusovergangen tenzij dit expliciet nodig is;
* wijzig impliciet contracten van externe libraries;
* introduceer nieuwe architectuurpatronen alleen om bestaande code uniformer te maken;
* beschouw verschillen tussen bestaande implementaties automatisch als fouten.

Als een bredere refactoring nuttig lijkt, rapporteer deze dan afzonderlijk in plaats van hem automatisch mee te nemen.

### Begrijp de code voordat je deze wijzigt

Controleer bij een niet-triviale wijziging eerst:

1. de relevante implementatie;
2. de callers;
3. gerelateerde configuratie;
4. relevante tests;
5. mogelijke externe side effects;
6. of externe MQT-libraries betrokken zijn.

Baseer gedrag niet uitsluitend op comments of JSDoc wanneer de daadwerkelijke implementatie en callers beschikbaar zijn.

### Houd wijzigingen gericht

Bij het uitvoeren van een wijziging:

* wijzig alleen bestanden die noodzakelijk zijn;
* volg de bestaande lokale architectuur en codestijl;
* behoud publieke service-interfaces tenzij een wijziging daarvan expliciet nodig is;
* voeg gerichte tests toe of pas deze aan wanneer gedrag verandert;
* rapporteer welke bestanden zijn gewijzigd;
* rapporteer welke tests daadwerkelijk zijn uitgevoerd.

---

## Runtime en platform

Dit is een **Google Apps Script V8**-project.

Ga er niet vanuit dat Node.js- of browser-API's beschikbaar zijn.

De applicatie gebruikt onder andere:

* `SpreadsheetApp`
* `CalendarApp`
* `GmailApp`
* `ScriptApp`
* `PropertiesService`
* `CacheService`
* `LockService`
* `Session`
* `Utilities`
* `UrlFetchApp`
* `Logger`

Globale entrypoints worden vanuit spreadsheetmenu's en geïnstalleerde triggers bij naam aangeroepen.

Mappen vormen binnen Apps Script geen JavaScript-namespaces.

Het Apps Script-manifest configureert momenteel:

* V8-runtime;
* tijdzone `Europe/Brussels`;
* STACKDRIVER-exceptionlogging.

`.clasp.json` neemt submappen mee en bevat geen expliciete `filePushOrder`.

Er is een `package.json` met `npm run test:unit`. De gedeelde Node.js-runner staat in
`../mqt-test-runner` en wordt als lokale npm-development dependency gebruikt.
De expliciete suites blijven in `scripts/unit-test-suites.cjs`.
Er is geen lokale buildstap, CI-pipeline of extern testframework.

---

## Deployment en clasp

De lokale repository is de broncode waarop wijzigingen worden uitgevoerd.

Gebruik `clasp` voor synchronisatie met Google Apps Script.

### Verplichte regels

Voer nooit zonder expliciete toestemming van de gebruiker uit:

- `clasp push`
- `clasp deploy`
- `clasp redeploy`
- andere commando's die remote Apps Script-code of deployments wijzigen.

Een normale wijzigingsworkflow is:

1. wijzig lokale bestanden;
2. voer veilige tests en controles uit;
3. toon of beschrijf de relevante diff;
4. wacht op expliciete toestemming;
5. voer pas daarna `clasp push` uit.

Gebruik `clasp pull` niet automatisch wanneer lokaal niet-gecommitte wijzigingen
aanwezig zijn. Controleer eerst of hierdoor lokale wijzigingen kunnen worden
overschreven.

### Expliciete releasecommando's

Na review van wijzigingen kan de gebruiker de volgende korte opdrachten geven.

#### `git commit`

Dit betekent:

1. controleer de huidige wijzigingen met Git;
2. commit alleen de wijzigingen die bij de huidige taak horen;
3. gebruik een korte, duidelijke commit message in het Nederlands;
4. gebruik voor de commit message altijd het formaat `<onderwerp>: <message>`;
5. schrijf zowel `<onderwerp>` als `<message>` in kleine letters, behalve waar hoofdletters inhoudelijk noodzakelijk zijn;
6. formuleer `<message>` als een korte beschrijving van wat de commit wijzigt;
7. voer geen `clasp push` uit;
8. rapporteer de gebruikte commit message en of de commit succesvol was.

Voorbeelden van correcte commit messages:

- `test: voeg geïsoleerde unit-tests toe voor alle domeinservices`
- `docs: actualiseer JSDoc en documenteer contracten en side-effects`
- `fix: voorkom dubbele import van vluchtgegevens`
- `feat: voeg ondersteuning voor geblokkeerde datums toe`

Gebruik een onderwerp dat de aard van de wijziging beschrijft, bijvoorbeeld
`feat`, `fix`, `test`, `docs`, `refactor` of `chore`.

#### `clasp push`

Dit betekent:

1. voer geen nieuwe inhoudelijke codewijzigingen uit;
2. push de gereviewde lokale Apps Script-code met `clasp push`;
3. maak geen Git-commit;
4. rapporteer of de push succesvol was.

#### `git commit + clasp push`

Dit betekent:

1. controleer de huidige wijzigingen met Git;
2. commit alleen de wijzigingen die bij de huidige taak horen;
3. gebruik een korte, duidelijke commit message in het Nederlands;
4. gebruik voor de commit message altijd het formaat `<onderwerp>: <message>`;
5. schrijf zowel `<onderwerp>` als `<message>` in kleine letters, behalve waar hoofdletters inhoudelijk noodzakelijk zijn;
6. formuleer `<message>` als een korte beschrijving van wat de commit wijzigt;
7. voer alleen na een succesvolle commit `clasp push` uit;
8. stop wanneer de commit mislukt en voer dan geen `clasp push` uit;
9. rapporteer de gebruikte commit message en het resultaat van zowel de commit als de push.

Voorbeelden van correcte commit messages:

- `test: voeg geïsoleerde unit-tests toe voor alle domeinservices`
- `docs: actualiseer JSDoc en documenteer contracten en side-effects`
- `fix: voorkom dubbele import van vluchtgegevens`
- `feat: voeg ondersteuning voor geblokkeerde datums toe`

Gebruik een onderwerp dat de aard van de wijziging beschrijft, bijvoorbeeld
`feat`, `fix`, `test`, `docs`, `refactor` of `chore`.

Deze drie opdrachten gelden als expliciete toestemming voor uitsluitend de
hierboven beschreven Git- en/of clasp-operaties.

Voer zonder een van deze opdrachten of een andere expliciete toestemming
geen `git commit` of `clasp push` uit.

Voer nooit automatisch `git push`, `clasp deploy`, `clasp redeploy` of andere
remote/deployment-operaties uit wanneer alleen bovenstaande opdrachten zijn gegeven.

### `authenticatie`

`clasp` gebruikt lokaal opgeslagen Google OAuth-credentials.

- Voer `clasp login` alleen interactief uit wanneer authenticatie nodig is.
- Vraag de gebruiker zelf de Google OAuth-flow in de browser te voltooien.
- Lees, toon, kopieer of wijzig `.clasprc.json` niet.
- Neem OAuth-tokens nooit op in logs, prompts, commits of documentatie.
- Probeer ontbrekende authenticatie niet automatisch te herstellen met
  alternatieve credentials.

Wanneer `clasp` een authenticatiefout geeft, rapporteer deze en laat de
gebruiker indien nodig zelf `clasp login` uitvoeren.

---

## Projectstructuur

Belangrijke onderdelen van de repository zijn:

* `appsscript.json` — Apps Script-runtime, tijdzone en externe libraries.
* `.clasp.json` — koppeling met het Apps Script-project en uploadconfiguratie.
* `appInit.js` — initialiseert de externe notificatielibrary.
* `trigger-service.js` — globale entrypoints, Calendar-synchronisatie, mailimport, notificatieverwerking en triggerbeheer.
* `common/menu.js` — spreadsheetmenu voor het ingestelde adminaccount.
* `common/config.js` — tabbladnamen, kolomnamen, statusovergangen, importinstellingen, notificatieconfiguratie en systeemstatusconfiguratie.
* `common/app-properties-service.js` — verplichte applicatie-instellingen uit Script Properties.
* `common/sheet-service.js` — Sheets, headers, rij-objecten, celupdates en caching van kolomindexen.
* `common/calendar-service.js` — gedeelde datum/tijd-combinatie.
* `common/on-edit-*.js` — editcontext, dispatch, recordwijzigingen en validatie van handmatige statuswijzigingen.
* `common/sync-status-service.js` — validatie en uitvoering van statusovergangen.
* `common/_log-service.js` — gestructureerde technische logging.
* `common/audit/` — audit-entryklassen, factory en append-only auditlog.
* `common/sheet-protection-service.js` — bescherming van technische kolommen.
* `domain/gig/` — synchronisatie, Calendar-events, datum/tijd en notificaties voor optredens.
* `domain/flight/` — mailimport, AeroDataBox-integratie, mapping, import naar Sheets, synchronisatie en Calendar-events.
* `domain/hotel/` — mailimport, mapping/import, synchronisatie en Calendar-events.
* `domain/blocked-date/` — synchronisatie en Calendar-events voor niet-beschikbaarheid.
* `domain/user/` — automatische User ID-toekenning.
* `infrastructure/notification/` — eventcodes en notificatieberichtfactory.
* `infrastructure/system/` — systeemstatus op basis van geïnstalleerde triggers.
* `test/` — Apps Script-testfuncties en handmatige integratiehulpen.
* `util/util.js` — gedeelde datumformattering en diagnostische cachehulpen.

---

## Architectuur

Services gebruiken meestal een IIFE-gebaseerd modulepatroon:

```javascript
const exampleService = (() => {
  function execute() {
    // ...
  }

  function helper_() {
    // ...
  }

  return {
    execute
  };
})();
```

Het teruggegeven object vormt de publieke service-interface.

Afhankelijkheden worden meestal rechtstreeks via globale namen gebruikt. Er zijn geen ES-module-imports, CommonJS-modules of dependency-injectioncontainer.

Expliciete dependency injection bij de initialisatie van notificaties is een bestaande uitzondering.

### Verantwoordelijkheden per domein

Voor gesynchroniseerde domeinen zijn verantwoordelijkheden doorgaans als volgt verdeeld:

* `*SyncService` — selecteert verwerkbare rijen, valideert gegevens, roept Calendar-operaties aan en schrijft status, technische velden en auditregels.
* `*CalendarService` — bouwt eventgegevens en maakt, wijzigt of verwijdert Calendar-events.
* `*MailImportService` — leest Gmail-threads, roept parsers aan, controleert duplicaten en beheert Gmail-labels.
* `*ImportToSheetService` — organiseert het toevoegen van geïmporteerde records aan Sheets.
* mappers — zetten externe gegevens om naar Sheet-records waar een aparte mapper aanwezig is.

Forceer deze verdeling niet wanneer een bestaand domein bewust anders is opgebouwd.

Hotelmapping bevindt zich bijvoorbeeld momenteel in de importservice en niet in een aparte mapper.

Bestaande Calendar- en mailservices mogen Google API's rechtstreeks gebruiken. Introduceer niet uitsluitend voor architecturale uniformiteit extra abstractielagen.

### Auditlogging

Auditlogging gebruikt `BaseAuditEntry` en domeinspecifieke subclasses.

Entries worden via de bestaande factory aangemaakt en geschreven met:

```javascript
auditService.log(...)
```

Auditlogging staat los van technische logging.

---

## Externe MQT-libraries

Deze repository is afhankelijk van afzonderlijke Google Apps Script-libraries.

Belangrijke externe libraries zijn:

* `Flight`
* `Hotel`
* `Notify`

De implementaties daarvan worden buiten deze repository beheerd.

Het manifest verwijst momenteel naar deze libraries in development mode.

### Verantwoordelijkheden

`Flight` is verantwoordelijk voor het parsen van vluchtmails en provider-specifieke flight parsers.

`Hotel` is verantwoordelijk voor het parsen van hotelmails.

`Notify` is verantwoordelijk voor het afleveren van notificaties.

Deze repository gebruikt de publieke contracten van deze libraries.

### Regels voor externe libraries

Doe niet het volgende:

* dupliceer implementatielogica van externe libraries in deze repository;
* verplaats parsinglogica naar Gig Sync alleen omdat de implementatie lokaal niet zichtbaar is;
* leid het volledige contract van een library uitsluitend af uit de lokale call sites;
* wijzig stilzwijgend aannames over het gedrag van externe libraries.

Wanneer een taak betrekking heeft op parsing, notificatieafhandeling of een ander contract van een externe library, inspecteer dan de betreffende library-repository wanneer deze beschikbaar is.

Wanneer de implementatie niet beschikbaar is, benoem dan expliciet welk gedrag niet geverifieerd kan worden.

Behandel wijzigingen aan externe librarycontracten of deploymentconfiguratie als afzonderlijke wijzigingen en beschrijf de impact expliciet.

---

## Sheets en datacontracten

Kolomnamen worden normaal benaderd via:

```javascript
CONFIG.entities.<entity>.columns
```

Tabbladnamen komen normaal uit `CONFIG`.

`sheetService` gaat uit van:

* rij 1 als header;
* 1-based rij- en kolomnummers voor Google Sheets;
* rij-objecten met de exacte headernamen als keys;
* een extra `rowNumber` op rij-objecten;
* headergestuurde mapping bij het toevoegen van rijen;
* mogelijke caching van kolomindexen via Script Cache.

Hardcode geen kolomposities wanneer headergestuurde toegang beschikbaar is.

Bestaande uitzonderingen zijn onder andere de flight-cache en auditregels met een vaste kolomvolgorde. Gebruik deze uitzonderingen niet zonder reden als patroon voor nieuwe code.

### IDs

IDs worden aangemaakt met:

```javascript
Utilities.getUuid()
```

User IDs gebruiken het voorvoegsel `USER-`.

Behoud het bestaande ID-gedrag tenzij de wijziging expliciet betrekking heeft op ID-generatie.

### Schemawijzigingen

Behandel wijzigingen aan Sheet-headers als potentieel breaking.

Controleer vóór een headerwijziging minimaal:

* `CONFIG`;
* kolomindexcaching;
* bescherming van technische kolommen;
* auditstructuren;
* syncservices;
* importlogica;
* afhankelijkheden van externe libraries;
* stringreferenties.

Hernoem Sheet-headers niet zonder deze impactanalyse.

---

## Synchronisatiemodel

De synchronisatie loopt primair als volgt:

```text
Google Sheets
     ↓
Google Calendar
```

Er is geen algemene Calendar-naar-Sheets-synchronisatie.

Statussen en toegestane overgangen zijn vastgelegd in `CONFIG`.

De bestaande workflow bevat onder andere:

* handmatig aangemaakte records die `DRAFT` krijgen;
* geïmporteerde vluchten en hotels die als `NEEDS_SYNC` worden toegevoegd;
* syncservices die `NEEDS_SYNC` en `DELETE_REQUESTED` verwerken;
* succesvolle publicatie die resulteert in `SYNCED`;
* succesvolle verwijdering die resulteert in `DELETED`;
* wijzigingen aan eerder gepubliceerde records of records met `ERROR` die opnieuw synchronisatie nodig maken;
* `CalendarEventId` als koppeling tussen een Sheet-record en een Calendar-event.

Gebruik `syncStatusService.setStatus()` voor statuswijzigingen waar de bestaande workflow dit doet.

Introduceer geen nieuwe statussen of statusovergangen zonder expliciet de gevolgen te analyseren voor:

* editafhandeling;
* syncservices;
* auditlogging;
* notificaties;
* Calendar-operaties.

---

## Datum en tijd

Datum- en tijdgedrag verschilt per domein.

Ga er niet vanuit dat alle `Date`-, datumstring- en tijdstringwaarden hetzelfde concept vertegenwoordigen.

Bepaal bij wijzigingen aan datum/tijd-logica expliciet of een waarde staat voor:

* een lokale kalenderdatum;
* een lokale kloktijd;
* een exact tijdstip;
* een timestamp met offset;
* een inclusieve einddatum;
* een exclusieve einddatum.

Bestaand gedrag omvat onder andere:

* `calendarService` combineert datum en tijd tot een `Date`;
* een gig-eindtijd die vóór de starttijd ligt wordt naar de volgende dag verschoven;
* gelijke start- en eindtijden zijn voor gigpublicatie ongeldig;
* hoteldata worden als lokale kalenderdatums behandeld;
* bij blocked dates wordt de inclusieve einddatum voor Calendar met één dag verhoogd;
* flightvelden voor datum/tijd worden uit lokale API-timestampstrings gehaald.

Introduceer niet als onderdeel van een niet-gerelateerde wijziging een repositorybrede nieuwe timezone- of normalisatiestrategie.

Gebruik de ingestelde Apps Script-tijdzone waar de bestaande implementatie dat verwacht.

---

## Parsing en normalisatie

Mailparsing wordt gedelegeerd aan de externe `Flight`- en `Hotel`-libraries.

De huidige Gig Sync-call sites gebruiken:

```javascript
Flight.FlightEmailParserService.parse(rawText)
Hotel.HotelEmailParserService.parse(rawText)
```

met de plain-text Gmail-body.

Flight-import kan meerdere berichten en meerdere kandidaten verwerken.

Hotel-import verwerkt momenteel het laatste bericht en één geparseerde boeking.

Normalisatie is momenteel domeinspecifiek.

Introduceer niet alleen voor uniformiteit een generieke normalisatielaag.

Controleer bij wijzigingen aan duplicaatdetectie of lookupgedrag welke normalisatie voor dat specifieke domein daadwerkelijk wordt gebruikt.

---

## Foutafhandeling

Validatiefuncties gebruiken doorgaans:

```javascript
throw new Error(...)
```

Syncservices handelen fouten normaal per record af.

Gebruikelijke foutafhandeling tijdens synchronisatie omvat:

* schrijven van `LastError`;
* status wijzigen naar `ERROR`;
* schrijven van een auditregel;
* publiceren van een foutnotificatie wanneer het betreffende domein dit ondersteunt.

Behoud isolatie per record bij wijzigingen aan synchronisatieflows.

Ga er niet vanuit dat foutafhandeling zelf niet kan falen. Logging, Sheet-updates, notificaties en externe calls kunnen eveneens fouten opleveren.

Er is geen algemene transactie- of retrylaag.

Introduceer geen retrygedrag zonder rekening te houden met mogelijke dubbele Calendar-events, dubbele imports, notificaties en andere side effects.

---

## Technische logging

Het normale loggingpatroon is:

```javascript
const log = logService.forModule(MODULE_NAME);

log.info('action-code', 'Beschrijving.', 'Context');
log.warn('action-code', 'Beschrijving.', 'Context');
log.error('action-code', 'Beschrijving.', 'Context');
```

De modulelogger biedt:

* `info`
* `warn`
* `error`

De logging is gestructureerd en bevat onder andere timestamp, level, module, action, message en details.

Kopieer geen incidentele loggingaanroepen die niet overeenkomen met de publieke interface van de logger.

Technische logging en auditlogging hebben verschillende doelen en blijven gescheiden.

---

## Secrets en configuratie

Verplichte applicatieconfiguratie wordt opgeslagen in Script Properties.

Bestaande properties bevatten onder andere waarden zoals:

* `MQT_CALENDAR_ID`
* `MQT_ADMIN_EMAIL`
* `AERODATABOX_API_KEY`

Doe nooit het volgende:

* credentials, API-keys of tokens hardcoden;
* secrets committen;
* Script Properties voor geheime waarden vervangen door source-codeconstanten;
* secrets naar logs schrijven;
* echte credentials opnemen in tests of fixtures;
* secrets opnemen in foutmeldingen.

Nieuwe credentials horen in Script Properties tenzij voor de betreffende taak expliciet een ander veilig configuratiemechanisme wordt ingevoerd.

---

## Externe services

AeroDataBox wordt via RapidAPI en `UrlFetchApp` aangeroepen.

De API-wrapper controleert HTTP-statuscodes en parseert JSON.

Responses kunnen in het verborgen flight-cache-tabblad worden opgeslagen.

Houd er rekening mee dat API-calls:

* externe quota kunnen gebruiken;
* veranderlijke gegevens kunnen retourneren;
* cachestatus kunnen wijzigen;
* tests niet-deterministisch kunnen maken.

Voer externe API-operaties niet onnodig uit.

---

## Concurrency en triggers

Het Calendar-synchronisatie-entrypoint gebruikt een scriptlock en geeft dit in `finally` weer vrij.

Verwijder locking niet zonder de gevolgen voor concurrency te analyseren.

Ga er niet vanuit dat alle entrypoints momenteel dezelfde lockingstrategie gebruiken.

Triggerinstallatie verwijdert eerst bestaande triggers voor dezelfde handler voordat nieuwe worden aangemaakt.

Globale trigger-handlernamen maken deel uit van het runtimecontract.

Controleer vóór het hernoemen of verwijderen van een globale handler:

* triggerinstallatie;
* menureferenties;
* stringreferenties;
* documentatie;
* tests.

---

## Veilig testen

Tests zijn Apps Script-functies. De unit-tests onder `test/unit/` kunnen ook lokaal
in geïsoleerde VM-contexten met mocks worden uitgevoerd. Integratiehulpen staan
onder `test/integration/`; gedeelde assertions onder `test/helpers/`.

De lokale runner voert uitsluitend expliciet geselecteerde unit-tests uit, zonder
Google-services of externe libraries. Er is geen extern testframework.

Sommige tests en diagnostische helpers hebben echte externe side effects.

Ze kunnen bijvoorbeeld:

* AeroDataBox aanroepen;
* de flight-cache wijzigen;
* echte Sheet-rijen toevoegen;
* echte Gmail-threads verwerken;
* Gmail-labels wijzigen;
* entries aan de notificatiequeue toevoegen;
* de notificatiequeue verwerken;
* echte notificaties versturen;
* Calendar of andere Google-services wijzigen.

### Verplichte regel

**Voer nooit een test of diagnostische functie uit die productiegegevens, Gmail, Calendar, notificaties of externe services kan wijzigen zonder expliciete toestemming van de gebruiker.**

Controleer vóór het uitvoeren van zo'n test:

1. de implementatie van de test;
2. externe afhankelijkheden;
3. mogelijke side effects;
4. welke echte gegevens of services geraakt kunnen worden.

Rapporteer deze side effects en vraag toestemming wanneer echte data of externe services geraakt kunnen worden.

Een functie met `test` in de naam is niet automatisch veilig.

### Bij gedragswijzigingen

Voeg waar praktisch gerichte tests toe of pas bestaande tests aan.

Sluit aan op de bestaande Apps Script-testconventies in plaats van als onderdeel van een niet-gerelateerde taak een nieuw testframework te introduceren.

Wijzig assertions niet alleen om een foutieve implementatie groen te krijgen.

Maak bij afronding duidelijk onderscheid tussen:

* tests die daadwerkelijk zijn uitgevoerd;
* tests die alleen zijn geïnspecteerd;
* tests die vanwege side effects niet veilig zijn uitgevoerd;
* handmatige verificatie die nog nodig is.

---

## Codestijl

Volg primair de lokale stijl van de bestanden die worden gewijzigd.

Dominante conventies zijn:

* Engelse identifiers;
* voornamelijk Nederlandse comments en JSDoc;
* `camelCase` voor functies, variabelen en serviceobjecten;
* `PascalCase` voor audit-entryklassen;
* `UPPER_SNAKE_CASE` voor constanten, statussen en eventwaarden;
* voornamelijk kebab-case voor bestandsnamen;
* afsluitende `_` voor interne helperfuncties;
* twee spaties inspringing;
* puntkomma's;
* voornamelijk enkele quotes;
* template literals voor interpolatie;
* kleine functies;
* guard clauses;
* expliciete publieke return-objecten voor services;
* JSDoc voor parameters, resultaattypen en relevante foutvoorwaarden.

Dit zijn dominante conventies en geen garantie dat alle bestaande code volledig uniform is.

Voer geen formatting-only wijzigingen uit in bestanden die niet bij de taak betrokken zijn.

---
## Feature refinement

Wanneer de gebruiker vraagt om een feature te refinen, onderzoek en ontwerp de feature dan eerst zonder code te wijzigen.

Het doel van refinement is om vóór implementatie duidelijk te krijgen:

* welk probleem de feature oplost;
* welke functionele requirements gelden;
* welke bestaande componenten geraakt worden;
* welke bestaande infrastructuur kan worden hergebruikt;
* welke nieuwe componenten eventueel nodig zijn;
* welke risico's en edge cases bestaan;
* hoe de feature getest kan worden;
* wanneer de feature als afgerond kan worden beschouwd.

### Werkwijze

Voer bij een refinement eerst onderzoek uit in de bestaande repository.

Bekijk daarbij alleen waar relevant:

1. bestaande domeinmodellen en services;
2. callers en afhankelijkheden van geraakte componenten;
3. bestaande infrastructuur die voor de feature kan worden hergebruikt;
4. Sheets en bestaande datacontracten;
5. configuratie;
6. triggers;
7. logging en audit;
8. externe MQT-libraries en hun contracten;
9. bestaande tests;
10. bestaande mechanismen voor foutafhandeling, idempotency en concurrency.

Ga niet uit van een nieuwe architectuur wanneer de bestaande architectuur het probleem al kan ondersteunen.

Geef de voorkeur aan uitbreiding en hergebruik van bestaande componenten boven het introduceren van parallelle infrastructuur.

### Refinement-resultaat

Werk na het repositoryonderzoek minimaal de volgende onderdelen uit:

1. **Probleem en waarde**
   Beschrijf welk concreet probleem wordt opgelost en waarom de feature waarde toevoegt.

2. **Huidige situatie**
   Beschrijf welke bestaande componenten, processen en datacontracten relevant zijn.

3. **Functionele requirements**
   Beschrijf wat de feature functioneel moet doen.

4. **Voorgestelde oplossing**
   Beschrijf hoe de feature binnen de bestaande architectuur kan worden gerealiseerd.

5. **Impact op bestaande componenten**
   Benoem welke bestaande bestanden, services, domeinobjecten, Sheets, triggers of externe libraries waarschijnlijk aangepast moeten worden.

6. **Nieuwe componenten**
   Benoem alleen nieuwe componenten die daadwerkelijk nodig zijn en leg uit waarom bestaande componenten niet volstaan.

7. **Data en persistentie**
   Beschrijf eventuele wijzigingen aan Sheets, properties, configuratie of andere persistente data.

8. **Foutscenario's en edge cases**
   Beschrijf relevante grensgevallen, foutscenario's, concurrencyproblemen en risico's op dubbele verwerking.

9. **Teststrategie**
   Beschrijf welke unit-tests en eventuele integratietests nodig zijn.

10. **Acceptance criteria**
    Formuleer concrete en verifieerbare criteria waaraan de implementatie moet voldoen.

11. **Openstaande beslissingen**
    Benoem keuzes waarvoor input van de gebruiker nodig is voordat implementatie verstandig is.

### Grenzen van refinement

Tijdens refinement:

* wijzig geen productiecode;
* voeg geen tests toe;
* wijzig geen Sheets;
* voer geen `git commit` uit;
* voer geen `clasp push`, `clasp deploy` of `clasp redeploy` uit;
* presenteer aannames expliciet als aannames;
* stel gerichte vragen wanneer een functionele keuze niet uit de repository of opdracht kan worden afgeleid.

Begin pas met implementeren nadat de gebruiker daar expliciet opdracht voor geeft.

---

## Werkwijze bij wijzigingen

Gebruik bij niet-triviale taken de volgende werkwijze.

### 1. Analyseer

Bepaal:

* het betrokken domein;
* relevante services;
* callers;
* afhankelijkheden uit `CONFIG`;
* Sheet-contracten;
* statusovergangen;
* betrokken externe libraries;
* side effects op Google-services;
* bestaande relevante tests.

### 2. Maak een plan

Beschrijf de kleinste implementatie waarmee aan de vraag wordt voldaan.

Benoem expliciet:

* wijzigingen aan publieke contracten;
* schemawijzigingen;
* wijzigingen aan externe libraries;
* side effects;
* eventuele migratiestappen;
* risicovolle aannames.

### 3. Implementeer

Na goedkeuring wanneer daarom is gevraagd:

* voer gerichte wijzigingen uit;
* behoud bestaande interfaces waar mogelijk;
* volg de bestaande architectuur;
* vermijd niet-gerelateerde refactoring.

### 4. Verifieer

Inspecteer relevante tests voordat ze worden uitgevoerd.

Voer alleen tests uit die veilig zijn of waarvoor expliciet toestemming is gegeven.

Controleer daarnaast waar relevant statisch:

* callers;
* `CONFIG`-referenties;
* globale functiereferenties;
* stringgebaseerde referenties.

### 5. Rapporteer

Geef na afronding een overzicht van:

* gewijzigde bestanden;
* gewijzigde functionaliteit;
* uitgevoerde tests;
* niet-uitgevoerde tests en de reden;
* nog benodigde handmatige verificatie;
* relevante risico's;
* mogelijke vervolgverbeteringen die bewust niet zijn meegenomen.

---

## Code review

Wanneer de gebruiker vraagt om code of wijzigingen te reviewen, voer dan een kritische review uit zonder de code automatisch te wijzigen.

Een review heeft als doel concrete fouten, regressierisico's en relevante technische problemen te vinden. Een review is niet bedoeld om de code naar persoonlijke voorkeur te herschrijven of zonder noodzaak een andere architectuur voor te stellen.

### Doel van de review

Zoek primair naar concrete problemen die invloed hebben op:

* correctheid;
* bestaand gedrag;
* regressierisico;
* foutafhandeling;
* side effects;
* dataconsistentie;
* security en secrets;
* Apps Script-runtimegedrag;
* Google Sheets-, Calendar- en Gmail-integraties;
* externe MQT-librarycontracten;
* concurrency en triggers;
* onderhoudbaarheid wanneer dit een concreet risico oplevert.

Geef functionele problemen en regressierisico's voorrang boven stijlvoorkeuren.

### Scope van de review

Controleer bij een review niet alleen de gewijzigde regels.

Inspecteer waar relevant ook:

1. de volledige gewijzigde functie of service;
2. callers van gewijzigde publieke functies;
3. gebruikte `CONFIG`-waarden;
4. statusovergangen;
5. Sheet-contracten en headers;
6. externe librarycontracten;
7. relevante tests;
8. foutafhandeling en logging;
9. mogelijke side effects;
10. globale functies en stringreferenties wanneer namen zijn gewijzigd.

Beoordeel een wijziging binnen de bestaande architectuur van het project.

Adviseer geen brede refactoring wanneer de wijziging binnen de bestaande architectuur correct, begrijpelijk en voldoende onderhoudbaar is.

Bestaande technische schuld buiten de scope van de wijziging is geen finding, tenzij de nieuwe wijziging deze aantoonbaar verergert of daardoor fout gedrag ontstaat.

### Onafhankelijke review

Voer een code review waar mogelijk uit met een ander AI-model dan het model dat de betreffende wijzigingen heeft geïmplementeerd.

Het doel hiervan is een onafhankelijke beoordeling van de implementatie en het verkleinen van blinde vlekken van het implementerende model.

De reviewer:

* beoordeelt de daadwerkelijke wijzigingen onafhankelijk;
* wijzigt tijdens de review geen code;
* krijgt de relevante repository- en projectinstructies als context;
* beoordeelt de daadwerkelijke implementatie en niet de intentie of redenering van het implementerende model;
* rapporteert uitsluitend concrete findings volgens de regels in deze sectie;
* neemt eerdere conclusies van het implementerende model niet automatisch over.

Wanneer geen ander model beschikbaar is, mag hetzelfde model de review uitvoeren.

Vermeld in dat geval expliciet dat geen onafhankelijke modelreview heeft plaatsgevonden.

### Findings

Rapporteer alleen concrete findings waarvoor een redelijke technische onderbouwing bestaat.

Classificeer findings als:

* **Kritiek** — kan leiden tot dataverlies, securityproblemen, verkeerde productiegegevens of ernstige uitval.
* **Hoog** — waarschijnlijk functioneel probleem of aanzienlijk regressierisico.
* **Middel** — daadwerkelijk probleem, maar met beperkte impact of alleen onder specifieke omstandigheden.
* **Laag** — kleine maar concrete verbetering die relevant genoeg is om te melden.

Vermeld per finding:

* bestand en relevante functie of regel;
* wat het probleem is;
* onder welke omstandigheden het optreedt;
* wat het mogelijke gevolg is;
* een gerichte oplossingsrichting.

Maak duidelijk onderscheid tussen:

* een aangetoond probleem;
* een waarschijnlijk probleem;
* een mogelijk risico dat niet volledig uit de beschikbare code kan worden vastgesteld.

Presenteer onzekerheid niet als een vastgesteld defect.

### Wat geen finding is

Rapporteer iets niet als finding wanneer het uitsluitend gaat om:

* persoonlijke stijlvoorkeur;
* theoretische architecturale zuiverheid;
* formatting zonder functionele gevolgen;
* bestaande code buiten de scope van de wijziging;
* een hypothetisch probleem zonder realistisch uitvoeringspad;
* een suggestie voor een bredere refactoring die niet nodig is voor de correctheid van de wijziging;
* een afwijking van een patroon die functioneel correct is en binnen deze codebase bewust of acceptabel kan zijn.

Een review moet signal-to-noise maximaliseren. Meld liever enkele goed onderbouwde findings dan een lange lijst speculatieve verbeterpunten.

### Review van tests

Controleer waar relevant of tests:

* het gewijzigde gedrag daadwerkelijk afdekken;
* relevante grens- en foutscenario's meenemen;
* betekenisvolle assertions bevatten;
* niet alleen zijn aangepast om de implementatie groen te krijgen;
* regressies op bestaand gedrag voldoende afdekken.

Ontbrekende tests zijn alleen een finding wanneer daardoor een betekenisvol regressierisico onvoldoende wordt afgedekt.

Voer tests tijdens een review niet automatisch uit wanneer deze externe side effects kunnen hebben.

De regels uit `## Veilig testen` blijven volledig van toepassing.

### Reviewresultaat

Begin het reviewresultaat met de findings, gesorteerd van hoogste naar laagste ernst.

Als er geen concrete findings zijn, vermeld dit expliciet.

Geef daarna indien relevant kort aan:

* resterende risico's of onzekerheden;
* tests die niet zijn uitgevoerd;
* gedrag dat niet uit de beschikbare repository kon worden vastgesteld;
* vragen die eerst beantwoord moeten worden voordat een mogelijke finding kan worden bevestigd.

Maak tijdens een review geen codewijzigingen tenzij de gebruiker daar expliciet om vraagt.

### Afhandeling na de review

Na een onafhankelijke review wordt de verdere afhandeling waar mogelijk teruggegeven aan het oorspronkelijke implementerende model.

Het oorspronkelijke model beoordeelt iedere finding afzonderlijk.

Het implementerende model:

1. controleert of de finding technisch correct is;
2. accepteert een finding niet automatisch;
3. controleert de finding tegen de daadwerkelijke implementatie, callers en projectcontracten;
4. legt kort uit wanneer een finding niet van toepassing, onjuist of bewust acceptabel is;
5. verwerkt terechte findings met de kleinst mogelijke gerichte wijziging;
6. controleert na aanpassingen opnieuw de relevante code;
7. past relevante tests aan of voegt deze toe wanneer dat nodig is;
8. rapporteert welke findings zijn verwerkt en welke gemotiveerd zijn afgewezen.

Een finding van het reviewmodel is advies en geen automatische opdracht tot wijziging.

Wanneer het verwerken van een finding een bredere architectuurwijziging, schemawijziging, wijziging van een extern librarycontract of andere ingrijpende wijziging vereist, voer deze dan niet automatisch uit. Leg eerst de impact voor aan de gebruiker.

### Herreview na aanpassingen

Wanneer naar aanleiding van de review code is gewijzigd, controleer dan of de oorspronkelijke finding daadwerkelijk is opgelost en of de oplossing geen nieuwe regressie introduceert.

Gebruik waar praktisch opnieuw een onafhankelijke review wanneer:

* een finding met ernst **Kritiek** of **Hoog** is opgelost;
* de oplossing meerdere onderdelen van de applicatie raakt;
* de oplossing een publiek contract wijzigt;
* de oplossing status-, synchronisatie- of datagedrag verandert.

Voorkom eindeloze reviewcycli voor kleine wijzigingen.

Wanneer alle terechte findings zijn verwerkt en geen nieuwe relevante problemen zijn gevonden, rapporteer dat de reviewafhandeling gereed is.

### Review en release

Een afgeronde review geeft op zichzelf geen toestemming voor een Git-commit, `clasp push` of andere releasehandeling.

Ook na een succesvolle review blijven de regels uit `## Deployment en clasp` van toepassing.

Wacht op expliciete toestemming van de gebruiker, bijvoorbeeld:

* `git commit`
* `clasp push`
* `git commit + clasp push`

voordat de bijbehorende handelingen worden uitgevoerd.

--

## Leidende principes

Bij werkzaamheden aan MQT Gig Sync gelden de volgende principes:

**Geef correctheid voorrang boven opschonen.**

**Geef een gerichte wijziging voorrang boven een brede refactoring.**

**Behoud bestaande contracten tenzij het wijzigen daarvan onderdeel van de taak is.**

**Behandel Sheets, Calendar, Gmail en notificaties als echte externe systemen met side effects.**

**Ga er nooit vanuit dat een test onschadelijk is alleen omdat deze een test heet.**

**Respecteer de verantwoordelijkheidsgrenzen tussen Gig Sync en de externe Flight-, Hotel- en Notify-libraries.**

**Inspecteer bij twijfel de implementatie en callers in plaats van gedrag te gokken.**
