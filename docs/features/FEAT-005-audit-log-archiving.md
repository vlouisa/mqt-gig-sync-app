# Auditlog archiveren en opschonen

## Gebruik en configuratie

Start als de geconfigureerde MQT-admin via **MQT Gig Sync → Systeem → Archiveer en schoon auditlog op**. Iedere menuactie verwerkt maximaal één batch. Er wordt geen trigger geïnstalleerd. Het archief bevat uitsluitend de verwijderbare oude regels, niet alle actuele auditregels.

De volgende Script Properties zijn optioneel en worden pas bij deze actie gelezen:

| Property | Default | Betekenis |
| --- | --- | --- |
| `AUDIT_ARCHIVE_FOLDER_ID` | `1AQ9lp0c6wkIytIVaXDhhY-SpUlbouWfF` | Bestaande Drive-map voor archieven |
| `AUDIT_RETENTION_DAYS` | `30` | Positief geheel aantal dagen bewaren |
| `AUDIT_ARCHIVE_BATCH_SIZE` | `250` | Positief geheel maximumaantal meldingen per actie |

Een ontbrekende property gebruikt de default; expliciet lege of ongeldige instellingen worden afgewezen. De uitvoerende admin moet bestanden in de doelmap kunnen aanmaken en auditrijen kunnen verwijderen. Bij eerste gebruik kan Google aanvullende Drive-autorisatie vragen. De opgegeven map en eventuele Shared Drive-beperkingen zijn niet live getest.

Een regel is oud wanneer de timestamp strikt vóór het startmoment min `retentionDays × 24 uur` ligt. De exacte grens blijft behouden. Selectie gebeurt van oudste naar nieuwste timestamp, bij gelijke timestamps op oorspronkelijke rijvolgorde. Identieke meldingen blijven afzonderlijke gebeurtenissen. Ongeldige/lege datums worden behouden en geteld in de terugkoppeling.

## Bestanden en Sheet-contract

Per batch worden twee bestanden aangemaakt:

- `audit-log_<UTC-tijd>_<batch-id>.jsonl`: één JSON-object per regel, met `timestamp`, `action`, `entityId`, `entityTitle`, `oldStatus`, `newStatus`, `userEmail`, `details`.
- Dezelfde basisnaam met `.manifest.json`: schemaversie, batch-ID, bronspreadsheet, sheet-ID, oorspronkelijke headers/rijnummers, bewaartermijn, grensdatum, aantal regels, SHA-256 van de JSON Lines-inhoud en van de oorspronkelijke Sheet-snapshot.

Timestamps in het archief zijn ISO 8601 in UTC. JSON-escaping bewaart pipes, quotes, Unicode en regeleinden. Er wordt geen entityType verzonnen: het huidige Sheet-contract bevat dat veld niet. Het manifest heeft status `ARCHIVED`: dit bevestigt de archivering, niet dat de daaropvolgende opschoning is voltooid.

Het auditblad moet een header met acht verschillende, niet-lege namen hebben en de bestaande vaste kolomvolgorde van `BaseAuditEntry.toRow()` volgen. De operatie behoudt de header en verwijdert uitsluitend geselecteerde datarijen. Resterende regels schuiven omhoog en behouden hun onderlinge volgorde. Bestaande losse lege rijen worden niet afzonderlijk opgeschoond.

Beide Drive-bestanden worden teruggelezen en exact vergeleken vóór verwijdering. Verwijderen gebeurt in aaneengesloten rijblokken van onder naar boven, zonder de sheet eerst leeg te maken. Verwijdering van alle datarijen laat de header bestaan.

## Gelijktijdigheid en grenzen

De beheeractie gebruikt het bestaande scriptlock. `auditService.log()` gebruikt nu een apart documentlock rond append en flush; de maintenance-service gebruikt datzelfde lock voor snapshots en verwijdering. Drive-upload en verificatie gebeuren buiten het documentlock. Nieuwe auditwrites tijdens de upload blijven daardoor mogelijk en worden behouden. Vóór verwijdering wordt de oorspronkelijke snapshot opnieuw vergeleken; uitsluitend extra aangehangen rijen zijn toegestaan.

Een auditwriter wacht maximaal vijf seconden op het documentlock en geeft daarna een fout in plaats van stilzwijgend te schrijven. De opschoner start geen volgend verwijderblok wanneer de verwijderfase al langer dan drie seconden duurt. Een afzonderlijke Google-serviceaanroep kan langer duren; dit is geen harde deadlinegarantie. Het is verstandig deze handmatige actie buiten drukke editmomenten te gebruiken. Handmatig sorteren, bewerken of verwijderen van auditrijen wordt niet door scriptlocks geblokkeerd; doe dat niet tijdens de actie.

De JSON Lines-batch is maximaal 5 MiB; verlaag bij overschrijding de batchgrootte. Na zestig seconden voorbereiding begint geen upload meer; na 120 seconden begint geen verwijderfase meer. Het volledige auditblad wordt nog gelezen voor selectie en verificatie: de batchgrootte begrenst het aantal te archiveren regels, niet de totale geheugenbehoefte. Bij zeer grote bladen is later een gepagineerde aanpak nodig.

## Fouten en handmatig herstel

Vóór de eerste Drive-write wordt `AUDIT_ARCHIVE_PENDING` in Script Properties opgeslagen. Zolang deze property bestaat, is een volgende archivering geblokkeerd. Auditlogging blijft wel werken. Er is geen automatische retry of hervatting met verouderde rijnummers.

| Fase in de property | Betekenis en herstel |
| --- | --- |
| `CREATING` | De eerste create kan zijn uitgevoerd ondanks een fout/timeout. Zoek in de geregistreerde map op de unieke basisnaam. Sheet-verwijdering is nog niet gestart. |
| `VERIFYING` | Archief-ID is bekend; archief- of manifestcontrole kan zijn onderbroken. Sheet-verwijdering is nog niet gestart. |
| `DELETING` | Verwijdering kan deels of volledig zijn uitgevoerd. Controleer het JSON Lines-bestand, manifest en de huidige sheet handmatig. Gebruik oorspronkelijke rijnummers niet blind opnieuw. |
| `COMPLETED` | Alle verwijderblokken en de flush zijn afgerond; alleen het wissen van de batchproperty kan zijn mislukt. |

Voer herstel uit wanneer geen archivering actief is. Voor `CREATING`/`VERIFYING`: controleer aanwezige batchbestanden en bewaar ze als herstelmateriaal of verwijder de aantoonbaar ongebruikte kopieën bewust voordat opnieuw wordt gestart. Wis daarna de pending-property handmatig. Een nieuwe poging kan anders dezelfde oude regels opnieuw archiveren.

Voor `DELETING`: bepaal welke gearchiveerde regels nog in de sheet staan. Identieke records mogen niet als één gebeurtenis worden behandeld. Rond herstel alleen af wanneer de aantallen en inhoud eenduidig zijn vastgesteld; bij twijfel behoud gegevens en de blokkering. Wis de pending-property pas na die controle. Voor `COMPLETED` kan na controle de pending-property worden gewist zonder opnieuw dezelfde batch uit te voeren.

Archief-ID en manifest-ID staan waar beschikbaar in de property. Ook zonder ID kan op `name`/`batchId` worden gezocht. Archiveer bestanden niet opnieuw en verwijder geen auditregels op basis van alleen een foutmelding. Drive-archieven worden niet automatisch opgeschoond.

## Verificatie

Lokale unit-tests gebruiken uitsluitend Sheet-, Drive- en lockmocks. Ze dekken defaults en ongeldige instellingen, exacte datumgrens, batchselectie, escaping, identieke meldingen, gelijktijdige append, behoud van ongeldige datums, Drive-/verificatiefouten, gewijzigde snapshots, onzekere verwijdering en admincontrole.

Voor ingebruikname blijft een expliciet toegestane integratietest met een aparte testsheet en testmap nodig, inclusief maprechten en daadwerkelijke rijverschuiving. Geen productiearchivering of Drive-write is tijdens implementatie uitgevoerd.
