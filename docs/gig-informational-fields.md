# Informatieve gigvelden

Voeg in `gig-input` tussen `Location` en `Description` negen kolommen in,
in deze volgorde. Bij Location in F staan ze in G t/m O en verschuift
Description naar P.

| Kolom | Header | Notatie |
| --- | --- | --- |
| G | Venue | Platte tekst |
| H | Address | Platte tekst |
| I | Zip | Platte tekst |
| J | City | Platte tekst |
| K | Country | Platte tekst |
| L | Contact Name | Platte tekst |
| M | Contact Phone | Platte tekst |
| N | Contact Email | Platte tekst |
| O | Contact Website | Platte tekst |

Selecteer de nieuwe kolommen en kies **Opmaak > Getal > Platte tekst** voordat
je waarden invoert. Zo blijven voorloopnullen in postcodes en telefoonnummers
behouden. Gebruik de headers exact zoals hierboven.

Deze velden zijn optioneel en uitsluitend informatief. Ze komen niet in
Calendar of notificatiepayloads terecht. Een bewerking in een van deze velden
verandert de syncstatus niet en maakt geen sync-auditregel aan. Ook bij een
nieuwe rij ontstaat pas DRAFT wanneer een bestaand inhoudelijk veld wordt bewerkt.
`Location` blijft het Calendar-locatieveld; er wordt geen adres uit de nieuwe
velden samengesteld.

## Handmatig invoeren

1. Publiceer de bijbehorende code na expliciete opdracht voor `clasp push`.
2. Zet automatische Calendar-synchronisatie tijdelijk uit, wacht tot een
   eventuele lopende synchronisatie klaar is en laat tijdens de schemawijziging
   niemand records bewerken of handmatig synchroniseren.
3. Voeg de negen kolommen in, stel de headers en platte tekstnotatie in.
4. Voer in Apps Script de bestaande functie `clearAllColumnIndexMapCaches` uit.
   Deze leegt de kolomcaches voor gigs, flights en hotels. Zonder legen kunnen
   status- en technische writes maximaal zes uur de oude kolomposities gebruiken.
5. Controleer bestaande kolombeveiligingen. Herstel deze indien nodig via
   `protectTechnicalColumns`, na het legen van de cache.
6. Hervat de automatische synchronisatie als die eerder actief was.

De runtime zoekt kolommen op headernaam. De legacy-configuratiewaarde
`gig.syncStatusColumnIndex` is met negen verhoogd, maar wordt niet door de
runtime gebruikt. Bestaande datums, tijden, statussen en technische headers
blijven behouden. Deze instructies zijn niet automatisch uitgevoerd.
