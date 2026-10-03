# FEAT-007 — Beheerpaneel

## Doel en bediening

Het menu biedt **Open beheerpaneel**, **Publiceer events naar Calendar** en **Help**.
De bestaande globale entrypoints blijven beschikbaar voor geïnstalleerde triggers.
Het paneel is alleen toegankelijk voor `CONFIG.adminEmail`; iedere browseraanroep
controleert opnieuw het actieve account.

| Onderdeel | Inhoud |
| --- | --- |
| Overzicht | Werkvoorraad en ERROR-rijen in de vier invoerbladen en website-publications; links naar bladen en foutregels |
| Verwerking | Calendar-publicatie, vlucht- en hotelimport, notificatiecontrole en notificatieverwerking |
| Website | Werkvoorraad bijwerken en een expliciet geladen publicatie verwerken |
| Automatisering | Zeven processen met triggeraantal, geconfigureerd interval en installatie/verwijdering |
| Onderhoud | Auditarchivering, kolombeveiliging, website-inrichting en statustabblad bijwerken |
| Help | Beknopte instructies en uitleg van de statuskleuren |

Openen en **Ververs overzicht** lezen Sheets en de eigen projecttriggers zonder
tabbladen aan te maken, caches te vullen of verwerkingen te starten. Ontbrekende
bladen/headers worden per overzicht gemeld. Per blad worden maximaal tien
foutregels getoond; het totaal telt alle ERROR-rijen. Normale werkvoorraad krijgt
geen waarschuwing wegens alleen het bestaan van wachtende rijen.

## Kleuren

Witte ondergrond, subtiele lijnen en kleine statuslabels met tekst en symbool:

- Zacht groen: de genoemde controle is in orde, bijvoorbeeld één trigger aanwezig.
- Zacht oranje: controle nodig, bijvoorbeeld meerdere triggers of een onleesbaar blad.
- Zacht rood: ERROR-rijen of een ontbrekende verwachte trigger.
- Grijs: normale werkvoorraad en informatieve resultaten.

Geen volledig gekleurde kaarten. Groen bevestigt alleen de benoemde controle;
het betekent niet dat het hele systeem of een externe aflevering is gecontroleerd.

## Acties en gelijktijdigheid

Tijdens een aanroep zijn actieknoppen tijdelijk uitgeschakeld. Inrichting,
archivering, triggerwijzigingen en acties op publicaties tonen eerst de concrete
actie ter bevestiging. Een browserfout veroorzaakt geen automatische retry.
Controleer bij een onzekere uitkomst de werkelijke toestand vóór herhaling.

Websiteacties gebruiken **Laad geselecteerde publicatie**. Het paneel toont titel,
Gig ID en status. Bij uitvoering wordt de publicatie onder het bestaande
scriptlock opnieuw op ID gelezen en de inhoud vergeleken met de getoonde versie.
Een andere Sheet-selectie verandert de bedoelde publicatie niet; gewijzigde
inhoud of dubbele IDs blokkeren uitvoering. Alleen READY mag worden verwerkt.
De bestaande createblokkering en WordPress-controles blijven behouden.

Triggerbeheer in het paneel gebruikt een scriptlock. Installatie valideert het
interval waar van toepassing en maakt eerst de vervangende trigger aan. Bij een
create-fout blijft de oude trigger behouden. Mislukt verwijderen daarna, dan kan
een dubbele trigger overblijven; het overzicht maakt dit zichtbaar.
Triggers van andere accounts zijn niet zichtbaar en worden niet aangepast.

Het getoonde interval komt uit de configuratie voor een nieuwe installatie;
het is geen meting van het interval van een al bestaande trigger. Een bewust
verwijderde trigger blijft als ontbrekend zichtbaar: er is nog geen afzonderlijke
opgeslagen instelling voor gewenst uitgeschakeld gedrag.

## Resultaten en grenzen

Bekende overgeslagen Calendar- en notificatiecontroles melden een bezet lock.
Websitewerkvoorraad geeft het aantal toegevoegde publicaties terug. Rijgebonden
websiteacties controleren de eindstatus. Overige bestaande verwerkingen leveren
nog geen volledige telling van geslaagde/mislukte records terug; het paneel meldt
dat de aanroep is afgerond en verwijst naar rijstatussen en overzichten.

Uitvoeringshistorie, ouderdomsbewaking, uitgebreide inrichtingscontrole,
archiefvoorvertoning en Notify-gezondheid zijn vervolgstappen. De externe Flight-,
Hotel- en Notify-contracten zijn niet gewijzigd. Sheet-schema's en statusovergangen
blijven gelijk. Technische logging en auditlogging blijven gescheiden.

## Verificatie

Lokale unit-tests gebruiken in-memory Sheets, triggers en librarymocks. Ze dekken
autorisatie, alleen-lezen overzichten, ontbrekende/dubbele headers, foutlimieten,
actievalidatie, lockuitkomsten, veilige triggervervanging en publicatie-identiteit.

Na een expliciet opgedragen deployment: heropen de spreadsheet als beheerder,
controleer de HTML-sidebar, de links naar bladen/rijen en de Help-weergave.
Test externe acties uitsluitend in een daarvoor bedoelde omgeving met toestemming.
