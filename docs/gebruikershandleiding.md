# Gebruikershandleiding MQT Gig Sync

Met MQT Gig Sync beheer je optredens, reizen en niet-beschikbaarheid in Google
Sheets. De applicatie neemt deze gegevens over in de gezamenlijke Google-agenda.
Deze handleiding gaat uit van een ingerichte omgeving met actieve automatische
verwerking. De voorbeelden bevatten fictieve gegevens.

## Snel naar

- [Beginnen](#beginnen)
- [Een optreden invoeren](#een-optreden-invoeren)
- [Wijzigen, bevestigen of annuleren](#wijzigen-bevestigen-of-annuleren)
- [Vluchten en hotels](#vluchten-en-hotels)
- [Niet-beschikbaarheid](#niet-beschikbaarheid)
- [Statussen en verwijderen](#statussen-en-verwijderen)
- [Notificaties](#notificaties)
- [Websiteconcepten](#websiteconcepten)
- [Problemen oplossen](#problemen-oplossen)

## Beginnen

Open de gedeelde spreadsheet met het account dat toegang heeft gekregen.

| Tabblad | Waarvoor gebruik je het? |
| --- | --- |
| `gig-input` | Optredens en opties beheren |
| `flight-input` | Geïmporteerde vluchten controleren |
| `hotel-input` | Geïmporteerde hotelboekingen controleren |
| `blocked-date-input` | Niet-beschikbaarheid vastleggen |
| `website-publications` | Als beheerder websiteconcepten voorbereiden |
| `system-status` | De aanwezigheid van automatische triggers bekijken |

Het menu **MQT Gig Sync** verschijnt alleen voor het ingestelde beheeraccount.
De menuacties hieronder zijn dus voor de beheerder. Andere gebruikers met
bewerkrechten kunnen de toegestane invoervelden aanpassen.

Kies **MQT Gig Sync > Open beheerpaneel**. Via **Onderdeel** ga je naar
**Overzicht**, **Verwerking**, **Website**, **Automatisering** of **Onderhoud**.
Kleine statuslabels met tekst en een symbool maken de toestand zichtbaar:
groen voor de genoemde geslaagde controle, oranje voor controlepunten, rood voor
fouten en grijs voor normale werkvoorraad. **Ververs overzicht** leest alleen de
actuele toestand. Een groene triggerstatus bevestigt dat de trigger aanwezig is;
het bewijst niet dat iedere verwerking of aflevering geslaagd is.

Werk in de invoerbladen en laat de kolomnamen op de eerste rij intact. Velden
zoals `Gig ID`, `CalendarEventId`, `CreatedAt` en `LastSyncedAt` vult de applicatie
zelf in. Neem die velden niet over wanneer je een nieuw optreden invoert.

Voer wijzigingen per rij en bij voorkeur per cel in. Bij het plakken van meerdere
rijen verwerkt de automatische editafhandeling alleen de eerste rij van het
bewerkte bereik. Controleer na plakken daarom de `SyncStatus` van iedere rij.

**Maak wijzigingen in Sheets.** Wijzigingen die je rechtstreeks in Google Calendar
maakt, worden niet teruggeschreven naar Sheets en kunnen bij een volgende
publicatie worden overschreven.

> **Screenshot 1 — later toevoegen:** het menu **MQT Gig Sync** geopend boven
> de spreadsheet, met de namen van de invoertabbladen zichtbaar. Bijschrift:
> “De beheerder kan via dit menu imports en publicatie handmatig starten.”

## Een optreden invoeren

1. Open `gig-input` en gebruik een lege gegevensrij.
2. Vul de onderstaande basisgegevens in. Na invoer van bijvoorbeeld `Title`
   krijgt een nieuwe rij automatisch `SyncStatus = DRAFT`.
3. Controleer de datum en tijden. Gebruik echte datumcellen, ook voor de vervaldatum.
4. Zet `SyncStatus` op `NEEDS_SYNC` wanneer de rij klaar is voor de agenda.
5. Wacht op de automatische verwerking, standaard iedere vijf minuten.
   De beheerder kan ook **MQT Gig Sync > Publiceer events naar Calendar** kiezen.
6. Controleer of `SyncStatus` naar `SYNCED` gaat en het optreden in de agenda staat.

De handmatige publicatie verwerkt alle klaarstaande rijen van optredens, vluchten,
hotels en niet-beschikbaarheid; de geselecteerde rij beperkt deze actie niet.

| Kolom | Wat vul je in? | Fictief voorbeeld |
| --- | --- | --- |
| `Gig Status` | `OPTION`, `CONFIRMED` of `CANCELLED` | `OPTION` |
| `Title` | Herkenbare naam van het optreden | MQT — Voorbeeldzaal |
| `Date` | Datum waarop het optreden begint | 20-11-2026 |
| `Start` | Begintijd | 21:00 |
| `End` | Eindtijd | 23:00 |
| `Location` | Locatie zoals die in de agenda moet staan | Voorbeeldzaal, Utrecht |
| `Option Expiry Date` | Vervaldatum van een optie, als die is afgesproken | 01-11-2026 |
| `Description` | Aanvullende informatie voor het agenda-item | Laden en lossen vanaf 18:00 |
| `Sound Engineer` | Geluidstechnicus, indien bekend | Voorbeeldtechnicus |

`Gig Status`, `Title`, `Date`, `Start` en `End` zijn verplicht voor publicatie.
De applicatie maakt het `Gig ID` zelf aan. Een optie kan ook in de agenda staan:
`Gig Status` beschrijft de boeking en `SyncStatus` de verwerking naar de agenda.

Eindigt het optreden na middernacht? Vul bijvoorbeeld `Start = 23:00` en
`End = 01:00` in. Een eindtijd vóór de begintijd wordt als de volgende dag gelezen.
Gelijke begin- en eindtijden worden afgewezen.

Vul zo nodig ook `Venue`, `Address`, `Zip`, `City`, `Country` en de velden
`Contact Name`, `Contact Phone`, `Contact Email` en `Contact Website` in.
Deze velden zijn aanvullende administratie; voor de agendalocatie gebruikt de app
`Location`. Locatiegegevens worden ook gebruikt bij de voorbereiding van de website.

> **Screenshot 2 — later toevoegen:** één fictief optreden in `gig-input`, met
> `Gig Status`, `Title`, `Date`, `Start`, `End` en `SyncStatus` leesbaar. Maak
> eventueel een tweede uitsnede voor `Option Expiry Date`. Bijschrift:
> “Een optie is klaar voor agendapublicatie zodra SyncStatus op NEEDS_SYNC staat.”

## Wijzigen, bevestigen of annuleren

### Gegevens aanpassen

Pas de bestaande rij aan. Bij een wijziging van bijvoorbeeld titel, datum of tijd
gaat een rij met `SYNCED` automatisch terug naar `NEEDS_SYNC`. Controleer na de
volgende verwerking de uitkomst.

Wijzigingen aan `Option Expiry Date`, adres-, venue- en contactgegevens starten
geen nieuwe Calendar-publicatie. Dat is normaal: deze velden worden niet naar
het agenda-item overgenomen. De optiecontrole leest de actuele vervaldatum wel.

### Een optie bevestigen

Zet `Gig Status` van `OPTION` naar `CONFIRMED`. Bij een al gepubliceerde rij wordt
de agendawijziging automatisch klaargezet. Staat de rij nog op `DRAFT`, zet dan
zelf `SyncStatus` op `NEEDS_SYNC` zodra de invoer compleet is.

### Een optreden annuleren

Zet `Gig Status` op `CANCELLED` en controleer de verwerking. Het agenda-item blijft
bestaan met `CANCELLED` in de titel. Wil je het agenda-item verwijderen, gebruik
dan de [verwijderprocedure](#een-agenda-item-verwijderen).

Een annulering of datumwijziging past bestaande websiteconcepten niet automatisch
aan. Controleer die afzonderlijk in WordPress.

## Vluchten en hotels

### Een boekingsmail laten importeren

1. Zorg dat de boekingsmail in de Gmail-mailbox voor de import staat.
2. Geef de mail het label `Flights/Inbox` voor een vlucht of `Hotels/Inbox` voor
   een hotel, of laat dit door de beheerder doen.
3. Wacht op de import, standaard iedere vijftien minuten. De beheerder kan via
   **MQT Gig Sync > Open beheerpaneel > Verwerking** ook **Importeer vluchtmails**
   of **Importeer hotelmails** kiezen.
4. Controleer de nieuwe rij in `flight-input` of `hotel-input` tegen de bevestiging.
   Niet ieder mailformaat wordt herkend.
5. Nieuwe imports staan op `NEEDS_SYNC` en worden automatisch naar de agenda
   verwerkt. Controleer daarna op `SYNCED`.

Controleer bij een vlucht vooral `Flight`, vertrek- en aankomstdatum, tijden en
luchthavens. Bij een nachtvlucht kunnen de vertrek- en aankomstdatum verschillen.
Laat onverwachte tijdverschillen door de beheerder controleren aan de hand van
de originele bevestiging.

Controleer bij een hotel `Hotel`, `Address`, `Check-in Date`, `Check-out Date`
en `Reservation Reference`. De uitcheckdatum is de vertrekdag: een verblijf van
20 tot 21 november omvat de nacht van 20 november.

De import verplaatst mails naar labels zoals `Flights/Processed` of
`Hotels/Processed`. Bij `Error` of `Discarded`, of als een rij ontbreekt, laat je
de beheerder de import controleren. Een verwerkte mail is nog geen bewijs dat
de Calendar-publicatie is gelukt; daarvoor controleer je de rijstatus.

> **Screenshot 3 — later toevoegen:** een fictieve hotelrij met hotelnaam,
> check-in, check-out en `SyncStatus`. Bijschrift: “Controleer de boekingsdatums
> en de publicatiestatus na de import.” Gebruik geen echte reserveringsreferentie.

## Niet-beschikbaarheid

1. Open `blocked-date-input` en gebruik een lege gegevensrij.
2. Vul `Name`, `Startdate` en `Enddate` in. Vul desgewenst `Reason` in;
   deze reden komt in de gedeelde agenda te staan.
3. Gebruik voor één dag dezelfde begin- en einddatum. `Enddate` telt mee:
   20 t/m 22 november blokkeert alle drie de dagen.
4. Zet de nieuwe rij van `DRAFT` op `NEEDS_SYNC`.
5. Controleer na verwerking op `SYNCED`. In de agenda verschijnt een
   dagvullend item met de titel `BLOCKED -` gevolgd door de naam.

Voorbeeld: `Name = Voorbeeldmuzikant`, `Startdate = 20-11-2026`,
`Enddate = 22-11-2026`, `Reason = Niet beschikbaar`.

## Statussen en verwijderen

### Wat betekent SyncStatus?

| Status | Betekenis | Wat doe je? |
| --- | --- | --- |
| `DRAFT` | Invoer staat nog niet klaar voor agendapublicatie | Maak de rij compleet en kies `NEEDS_SYNC` |
| `NEEDS_SYNC` | Wacht op aanmaken of bijwerken in de agenda | Wacht op verwerking en controleer de uitkomst |
| `SYNCED` | De laatste agendapublicatie is geslaagd | Pas zo nodig de inhoudelijke velden aan |
| `DELETE_REQUESTED` | Wacht op verwijderen uit de agenda | Wacht op `DELETED` |
| `DELETED` | De verwijderactie is afgerond | Laat de rij als historie staan |
| `ERROR` | De verwerking is mislukt | Lees `LastError` en herstel de oorzaak |

Zet `SYNCED` of `DELETED` niet zelf: de applicatie schrijft de uitkomst.
Een ongeldige handmatige statusovergang wordt teruggedraaid.

### Een agenda-item verwijderen

1. Zoek de bestaande rij in het betreffende invoerblad.
2. Zet `SyncStatus` vanuit `SYNCED` of `ERROR` op `DELETE_REQUESTED`.
3. Wacht op verwerking en controleer op `DELETED`.

Laat de Sheet-rij staan. Alleen de rij wissen verwijdert het gekoppelde
agenda-item niet. `DELETED` kan niet terug naar `NEEDS_SYNC`; vraag de beheerder
om hulp als een verwijdering onbedoeld was.

> **Screenshot 4 — later toevoegen:** een uitsnede met `SyncStatus`,
> `LastSyncedAt` en `LastError`, met een fictieve fout zoals “Verplicht veld
> ontbreekt: Title”. Bijschrift: “LastError beschrijft waarom de verwerking stopte.”

## Notificaties

Je ontvangt meldingen wanneer de beheerder het betreffende meldingstype en jouw
abonnement heeft geactiveerd. De huidige tijdgestuurde controles zijn:

| Melding | Wanneer wordt gecontroleerd? | Wat doe je? |
| --- | --- | --- |
| Optie verloopt vandaag | Op `Option Expiry Date`, bij `OPTION`, vanaf 09:00 | Neem een besluit over de optie en werk de rij bij |
| Factuur versturen | De dag na de datum van een `CONFIRMED` optreden, vanaf 09:00 | Controleer of de factuur verstuurd moet worden |
| Reisboekingen ontbreken | Vanaf veertien dagen vóór een `CONFIRMED` optreden t/m de dag ervoor, vanaf 09:00 | Controleer heenreis, terugreis en hotel |

De controle draait standaard ieder uur; 09:00 is het vroegste controletijdstip,
geen gegarandeerde bezorgtijd. De datumcontroles gebruiken de tijdzone
Europe/Brussels. Een Gig ID is nodig. Ook een rij op `DRAFT` kan voor een melding
meetellen als het ID en de vereiste gegevens aanwezig zijn; `DRAFT` blokkeert
alleen de Calendar-publicatie. `DELETE_REQUESTED` en `DELETED` zijn uitgesloten.

De factuurmelding controleert niet of de factuur al verstuurd is. De reiscontrole
vergelijkt alleen datums in de reisbladen van de zanger: heenreis met aankomst op
de gigdag of de dag ervoor, terugreis met vertrek de dag erna, en een hotel voor
de nacht na het optreden. Zij controleert geen persoon, bestemming of boekingslink
naar het optreden. Beoordeel de melding daarom zelf, ook bij lokale optredens.

Een eerder klaargezette melding kan nog aankomen nadat je de gegevens hebt
gewijzigd. Optie- en factuurmeldingen halen gemiste eerdere dagen niet in.
Ontvang je niets terwijl je wel een melding verwacht, laat de beheerder dit
controleren; het ontbreken van een melding bewijst niet dat alles compleet is.

## Websiteconcepten

Dit onderdeel is voor de beheerder. De websitewerkvoorraad staat los van de agenda.

1. Kies in het beheerpaneel **Website > Werk websitewerkvoorraad bij**, of wacht op de
   automatische uurcontrole. Bevestigde optredens van vandaag of later worden
   toegevoegd, behalve rijen met `DELETE_REQUESTED` of `DELETED`.
2. Open `website-publications`. Controleer de gegevens van de gewenste rij.
   Je kunt `Title`, `Contact Email`, `Contact Website`, `Ticket URL` en `Price`
   aanpassen.
3. Selecteer één gegevensrij met `Status = READY`.
4. Kies in het beheerpaneel **Website > Laad geselecteerde publicatie**.
   Controleer titel en Gig ID en kies **Maak WordPress-concept**. Bevestig de actie.
   Een gewijzigde Sheet-selectie verandert het geladen optreden niet. Laad de
   selectie opnieuw wanneer je een ander optreden wilt verwerken.
5. Controleer op `DRAFT_CREATED` en open `WP Draft URL`. Controleer het concept
   in WordPress en publiceer het daar wanneer het gereed is. Controleer ook de
   starttijd; de gedocumenteerde WordPress-koppeling neemt die nog niet over.

Wil je de rij overslaan? Selecteer de rij op `READY`, laad deze in het paneel en
kies **Sla publicatie over**. De status wordt `SKIPPED`.

Gegevens worden één keer per optreden overgenomen. Later synchroniseren werkt
een bestaande website-rij of een WordPress-concept niet bij. Controleer na een
wijziging aan het optreden dus ook deze gegevens.

Bij `ERROR` lees je `Last Error` en controleer je eerst in WordPress of het concept
toch is aangemaakt. Laat herstel door de beheerder uitvoeren om dubbele concepten
te voorkomen.

> **Screenshot 5 — later toevoegen:** één fictieve `READY`-rij in
> `website-publications` met **Website** in het beheerpaneel geopend. Bijschrift:
> “Selecteer één rij om een WordPress-concept te maken; publicatie volgt in WordPress.”

## Problemen oplossen

| Wat zie je? | Controleer dit |
| --- | --- |
| Geen menu **MQT Gig Sync** | Het menu is alleen zichtbaar voor het ingestelde beheeraccount. Open de spreadsheet opnieuw met dat account of vraag de beheerder. |
| Nieuwe rij blijft op `DRAFT` | Zet de complete rij op `NEEDS_SYNC`. |
| Rij blijft op `NEEDS_SYNC` | Wacht enkele minuten. Vraag de beheerder daarna om de automatische verwerking te controleren of handmatig te publiceren. |
| Rij staat op `ERROR` | Lees `LastError`. Herstel het genoemde invoerveld en controleer of de rij op `NEEDS_SYNC` komt. Vanuit `ERROR` kun je die status ook zelf kiezen voor een nieuwe publicatiepoging. |
| Verwijderen is mislukt | Herstel samen met de beheerder de oorzaak en kies opnieuw `DELETE_REQUESTED`, zodat de volgende poging verwijdert. |
| Rijstatus veranderde niet na plakken | Controleer iedere geplakte rij afzonderlijk; bewerk relevante velden per cel. |
| Boekingsmail levert geen rij op | Controleer mailbox, importlabel en de labels `Error`/`Discarded`; vraag de beheerder het mailformaat te controleren. |
| Websitegegevens lopen achter | Bestaande website-rijen en concepten worden niet automatisch bijgewerkt. Laat de beheerder ze controleren. |

Geef bij een probleem de tabbladnaam, het rijnummer, de titel en de tekst van
`LastError` door aan de beheerder. Bij websitepublicaties heet het foutveld
`Last Error`.

De beheerder kan in het paneel **Automatisering** bekijken of onder **Onderhoud**
de actie **Werk statustabblad bij** gebruiken.
Het tabblad `system-status` toont of de verwachte triggers aanwezig zijn; een
goede status bewijst niet dat elke import, publicatie of notificatie is gelukt.

## Over deze handleiding en de afbeeldingen

Deze versie is opgesteld aan de hand van de repository op 28 september 2026.
De bediening is bijgewerkt voor het beheerpaneel. De genoemde intervallen zijn de
instellingen bij installatie; bestaande triggers kunnen een ouder interval hebben.
De live spreadsheet en aflevering van notificaties zijn hiervoor niet getest.

De vijf screenshotaanwijzingen zijn plaatsen voor later toe te voegen echte
beelden. De stappen zijn ook zonder die beelden te volgen. Gebruik een
voorbeeldblad met fictieve gegevens en toon alleen de genoemde kolommen en
menu's. Maak geen productieboekingen of notificaties aan om een screenshot te
kunnen nemen. Zodra de beelden beschikbaar zijn, kunnen de aanwijzingen worden
vervangen door afbeeldingen met hetzelfde bijschrift.

Voor inrichting en technisch beheer: zie de [README](../README.md) en de
[featuredocumentatie](features/features-overview.md).
