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

Er is momenteel geen `package.json`, lokale buildstap, CI-pipeline of lokale geautomatiseerde testrunner.

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

Tests in deze repository zijn Apps Script-functies en geen volledig geïsoleerde lokale unit tests.

Er is geen centrale testrunner of extern testframework.

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

## Leidende principes

Bij werkzaamheden aan MQT Gig Sync gelden de volgende principes:

**Geef correctheid voorrang boven opschonen.**

**Geef een gerichte wijziging voorrang boven een brede refactoring.**

**Behoud bestaande contracten tenzij het wijzigen daarvan onderdeel van de taak is.**

**Behandel Sheets, Calendar, Gmail en notificaties als echte externe systemen met side effects.**

**Ga er nooit vanuit dat een test onschadelijk is alleen omdat deze een test heet.**

**Respecteer de verantwoordelijkheidsgrenzen tussen Gig Sync en de externe Flight-, Hotel- en Notify-libraries.**

**Inspecteer bij twijfel de implementatie en callers in plaats van gedrag te gokken.**
