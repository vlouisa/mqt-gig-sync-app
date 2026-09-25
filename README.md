# Miracle Queen Tribute Gig Sync

Google Apps Script-applicatie voor het beheren van optredens, vluchten,
hotelboekingen en niet-beschikbaarheid van Miracle Queen Tribute.
Google Sheets is de administratieve bron; de applicatie publiceert records naar
Google Calendar, importeert boekingsgegevens uit Gmail en verwerkt notificaties.

## Werking

- Optredens en niet-beschikbaarheid worden in Sheets ingevoerd.
- Vlucht- en hotelbevestigingen worden uit Gmail geïmporteerd met de externe
  `Flight`- en `Hotel`-libraries. Vluchtgegevens worden aangevuld via AeroDataBox.
- Calendar-synchronisatie verwerkt records met `NEEDS_SYNC` of
  `DELETE_REQUESTED` en schrijft de uitkomst terug naar Sheets.
- De externe `Notify`-library verwerkt notificaties via een queue.
- Een auditlog legt recordacties vast; technische logging ondersteunt diagnose.

De synchronisatierichting is **Sheets → Calendar**. Er is geen algemene
Calendar-naar-Sheets-synchronisatie. `CalendarEventId` koppelt een Sheet-record
aan het bijbehorende Calendar-event.

De belangrijkste syncstatussen zijn `DRAFT`, `NEEDS_SYNC`, `SYNCED`,
`DELETE_REQUESTED`, `DELETED` en `ERROR`. Toegestane overgangen staan in
[common/config.js](common/config.js).

## Projectstructuur

| Pad | Verantwoordelijkheid |
| --- | --- |
| [appsscript.json](appsscript.json) | Runtime, tijdzone en externe libraries |
| [appInit.js](appInit.js) | Initialisatie van de notificatielibrary |
| [trigger-service.js](trigger-service.js) | Globale entrypoints en triggerbeheer |
| [common/](common/) | Configuratie, Sheets, editafhandeling, statussen, logging en audit |
| [domain/](domain/) | Domeinservices voor gigs, flights, hotels, blocked dates en users |
| [infrastructure/](infrastructure/) | Notificatieberichten en systeemstatus |
| [util/](util/) | Gedeelde datum- en diagnostische helpers |
| [test/](test/) | Unit-tests, assertions en handmatige integratiehulpen |
| [scripts/](scripts/) | Lokale testsuites en mocks |

De applicatie draait in **Google Apps Script V8**, met tijdzone
`Europe/Brussels`. Services gebruiken doorgaans een IIFE-modulepatroon en
globale afhankelijkheden. Node.js wordt alleen gebruikt voor lokale tests;
er is geen lokale buildstap.

## Configuratie van de Apps Script-omgeving

Voor gebruik zijn een gekoppelde spreadsheet, toegang tot de doelagenda en
Gmail, en toegang tot de externe Apps Script-libraries nodig.

Stel in het Apps Script-project de volgende **Script Properties** in:

| Property | Doel |
| --- | --- |
| `MQT_CALENDAR_ID` | Doelagenda voor Calendar-publicatie |
| `MQT_ADMIN_EMAIL` | Account waarvoor het beheermenu wordt getoond |
| `AERODATABOX_API_KEY` | RapidAPI-key voor AeroDataBox-vluchtgegevens |

Bewaar credentials in Script Properties, nooit in broncode of testfixtures.
Aanvullende provider- en ontvangerinstellingen voor notificaties worden bepaald
door de externe `Notify`-library; raadpleeg daarvoor de betreffende library.

[common/config.js](common/config.js) bevat de tabbladnamen, exacte kolomheaders,
Gmail-labels, statusovergangen en notificatieconfiguratie. Gebruik deze definities
voor de inrichting van de spreadsheet, met kolomheaders op rij 1. De invoerbladen
zijn `gig-input`, `flight-input`, `hotel-input`, `blocked-date-input` en
`user-input`.

De Gmail-invoerlabels zijn `Flights/Inbox` en `Hotels/Inbox`. De importinstellingen
bevatten ook labels voor verwerkte, afgewezen en foutieve imports.

De libraries `Flight`, `Hotel` en `Notify` worden buiten deze repository beheerd.
Het manifest verwijst momenteel naar deze libraries in development mode.

## Gebruik en automatische verwerking

Het ingestelde adminaccount krijgt in de spreadsheet het menu **MQT Gig Sync**.
Dit biedt Calendar-publicatie, vlucht- en hotelimport, triggerbeheer,
notificatieverwerking, bescherming van technische kolommen en systeemstatus.

Na installatie van de bijbehorende triggers gelden de volgende intervallen:

| Verwerking | Interval |
| --- | --- |
| Calendar-synchronisatie | 5 minuten, via `CONFIG.autoSync` |
| Vlucht- en hotelimport | Elk 15 minuten, via de domeinconfiguratie |
| Notificatie-worker | 1 minuut |
| Systeemstatus | 30 minuten |

Menuacties en triggers werken met echte Sheets-, Gmail-, Calendar- en
notificatiegegevens. Activeer automatische verwerking pas nadat de omgeving en
configuratie zijn gecontroleerd.

## Testen

Zie [test/README.md](test/README.md) voor de lokale testomgeving, unit-tests,
coverage en het veilig uitvoeren van integratietests.

## Synchroniseren met Apps Script

De lokale repository is de broncode. [.clasp.json](.clasp.json) koppelt deze aan
een bestaand Apps Script-project; controleer de projectkoppeling vóór gebruik.
[.claspignore](.claspignore) sluit onder meer lokale tooling, npm-bestanden en
coverage uit van uploads.

De wijzigingsworkflow is: lokaal wijzigen, relevante tests uitvoeren, de diff
reviewen en pas na expliciete toestemming `clasp push` uitvoeren. Een Git-commit
en een clasp-upload zijn afzonderlijke handelingen. Gebruik `clasp pull` niet
zonder eerst te controleren of lokale wijzigingen kunnen worden overschreven.

Gebruik bij ontbrekende authenticatie interactief `clasp login` en voltooi zelf
de Google OAuth-flow. Bewaar de lokale OAuth-credentials buiten de repository.

Zie [AGENTS.md](AGENTS.md) voor de volledige repositoryregels, waaronder afspraken
over commits, uploads, externe libraries en veilig testen.
