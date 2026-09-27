# Featureoverzicht

Deze documenten beschrijven de gerealiseerde functies, hun werking en waar relevant inrichting en beheer. Ze worden bijgewerkt wanneer het gedrag verandert. De repository blijft de bron van waarheid voor de actuele implementatie.

Elke feature heeft een vaste code `FEAT-NNN`. Gebruik die code als prefix van de bestandsnaam; nummer features op volgorde van het oorspronkelijke taakmoment (oud naar nieuw). Werk bij hernummering ook bestandsnamen en verwijzingen bij.

Timestamp vermeldt het oorspronkelijke taakbericht van de gebruiker, gereconstrueerd uit de lokale gespreksregistratie en weergegeven in Europe/Amsterdam met UTC-offset (seconden, zonder milliseconden). Dit is geen uitvoerings-, afrondings- of opvraagmoment. Latere raadpleging verandert deze datum niet.

| ID | Timestamp | Feature | Beschrijving | Details |
| --- | --- | --- | --- | --- |
| FEAT-001 | 2026-09-25 14:22:53 +02:00 | Vervallende gigopties | Selectie, meldtijdstip en inrichting van de notificatie voor opties die vandaag vervallen | [Details](FEAT-001-gig-option-expiry.md) |
| FEAT-002 | 2026-09-25 16:38:25 +02:00 | Tijdgestuurde notificaties | Periodieke controles, notificatieregels en triggerbeheer | [Details](FEAT-002-scheduled-notifications.md) |
| FEAT-003 | 2026-09-27 09:28:20 +02:00 | Informatieve gigvelden | Negen aanvullende tekstvelden in gig-input en hun bewerking zonder Calendar-sync | [Details](FEAT-003-gig-informational-fields.md) |
| FEAT-004 | 2026-09-27 11:05:39 +02:00 | Websitepublicaties | Snapshotwerkvoorraad, handmatige WordPress-concepten, inrichting en foutherstel | [Details](FEAT-004-website-publications.md) |
| FEAT-005 | 2026-09-27 17:04:06 +02:00 | Auditlog archiveren | Handmatige JSON Lines-archivering van oude auditregels naar Drive, met configurabele bewaartermijn en batchgrootte | [Details](FEAT-005-audit-log-archiving.md) |

Oorspronkelijke opdrachten staan in het [overzicht van implementatiebriefs](../implementation-briefs/implementation-briefs-overview.md). Bevindingen staan in het [reviewoverzicht](../reviews/review-findings-overview.md).
