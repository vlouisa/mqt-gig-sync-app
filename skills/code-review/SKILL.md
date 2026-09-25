---

name: code-review
description: Voer een kritische code review uit op wijzigingen in MQT Gig Sync. Gebruik deze skill wanneer de gebruiker vraagt code, een implementatie, diff of recente wijzigingen te reviewen.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Code review

Review de daadwerkelijke implementatie kritisch zonder deze automatisch te wijzigen.

Zoek naar concrete problemen in correctness, gedrag, regressierisico, foutafhandeling, side effects, consistentie, security, Apps Script-runtimegedrag en bestaande contracten.

## Onderzoek

Inspecteer waar relevant:

* de volledige gewijzigde functie of service;
* callers en afhankelijkheden;
* configuratie;
* statusovergangen;
* Sheet-contracten;
* externe MQT-librarycontracten;
* bestaande tests;
* foutafhandeling en logging;
* side effects;
* globale en stringgebaseerde referenties.

Gebruik de daadwerkelijke implementatie en relevante callers als primaire bron voor bestaand gedrag; vertrouw niet uitsluitend op comments of JSDoc.

Beoordeel de wijziging binnen de bestaande architectuur. Adviseer geen brede refactoring wanneer de huidige oplossing correct en onderhoudbaar is.

## Onafhankelijke review

Gebruik waar mogelijk een ander model voor een onafhankelijke review.

Wanneer geen onafhankelijk model beschikbaar is, voer de review zelf uit en vermeld dat geen onafhankelijke modelreview is uitgevoerd.

## Findings

Classificeer concrete findings als:

* Kritiek
* Hoog
* Middel
* Laag

Beschrijf per finding:

* bestand, functie en waar mogelijk regel;
* het concrete probleem;
* onder welke omstandigheden het optreedt;
* het mogelijke gevolg;
* een gerichte oplossing.

Maak onderscheid tussen bewezen, waarschijnlijke en mogelijke problemen.

Beschouw niet automatisch als finding:

* persoonlijke stijlvoorkeuren;
* theoretische architecturale zuiverheid;
* formatting;
* bestaande problemen buiten de wijziging;
* onrealistische hypothetische scenario's;
* refactoring zonder concreet voordeel;
* afwijkingen van een patroon wanneer de gekozen oplossing correct en onderhoudbaar is.

## Findings vastleggen

Leg iedere concrete finding vast in de repository.

Gebruik:

* `docs/reviews/review-findings-overview.md` als centraal overzicht;
* een afzonderlijk Markdown-bestand in `docs/reviews/` voor de volledige details van iedere finding.

Controleer vóór het toevoegen van een finding de bestaande bestanden en volg hun huidige structuur, nummering, naamgeving en kolommen.

Voeg voor iedere nieuwe finding één regel toe aan `review-findings-overview.md`.

Maak daarnaast het bijbehorende detailbestand met minimaal:

* identificatie van de finding;
* severity;
* status;
* betrokken bestand(en) en functie(s);
* beschrijving van het probleem;
* omstandigheden waaronder het probleem optreedt;
* mogelijke gevolgen;
* voorgestelde oplossing;
* relevante verificatie of testinformatie.

Dupliceer geen bestaande finding. Controleer eerst of hetzelfde probleem al in het overzicht of een bestaand detailbestand is vastgelegd.

Wanneer tijdens de review geen concrete findings worden gevonden, voeg niets toe aan het overzicht en maak geen detailbestand aan.

## Tests

Controleer of relevante tests:

* het gewijzigde gedrag afdekken;
* belangrijke grensgevallen afdekken;
* relevante foutscenario's afdekken;
* betekenisvolle assertions bevatten;
* regressiegevoelig bestaand gedrag beschermen.

Beschouw ontbrekende tests alleen als finding wanneer daardoor een betekenisvol regressierisico ontstaat.

Volg bij het uitvoeren van tests de veiligheidsregels uit `AGENTS.md`.

## Resultaat

Rapporteer findings op aflopende ernst.

Wanneer geen concrete findings zijn gevonden, vermeld dit expliciet.

Benoem daarnaast waar relevant:

* resterende risico's;
* niet-uitgevoerde tests;
* gedrag dat niet kon worden geverifieerd;
* vragen die alleen door een functionele keuze van de gebruiker kunnen worden opgelost.

## Findings verwerken

Wanneer findings daarna worden opgelost:

* beoordeel iedere finding inhoudelijk;
* accepteer een finding niet automatisch;
* pas alleen valide findings gericht aan;
* motiveer kort waarom een finding wordt afgewezen wanneer deze niet klopt;
* werk na verwerking de status van de finding bij in de bestaande reviewdocumentatie.

Leg grotere architectuur-, schema- of externe contractwijzigingen eerst aan de gebruiker voor.

Voer opnieuw een review uit wanneer fixes betrekking hebben op kritieke of hoge findings, meerdere componenten raken, publieke contracten wijzigen of data-, status- of synchronisatiegedrag veranderen.

Voorkom eindeloze reviewcycli voor kleine of duidelijk afgebakende wijzigingen.
