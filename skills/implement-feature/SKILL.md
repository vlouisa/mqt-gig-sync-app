---

name: implement-feature
description: Implementeer een feature of codewijziging in MQT Gig Sync binnen de bestaande architectuur. Gebruik deze skill wanneer de gebruiker vraagt functionaliteit te bouwen, wijzigen, repareren of implementeren.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Implement feature

Implementeer de gevraagde wijziging gericht binnen de bestaande repository.

## Onderzoek

Bepaal vóór implementatie welke bestaande code relevant is.

Inspecteer waar nodig:

* de relevante implementatie;
* callers en afhankelijkheden;
* configuratie;
* datacontracten;
* bestaande tests;
* externe MQT-librarycontracten;
* relevante side effects.

Onderzoek alleen repositoryonderdelen die nodig zijn voor de wijziging.

## Implementatie

Kies de kleinste oplossing die aan de requirements voldoet.

Tijdens implementatie:

* behoud bestaand gedrag buiten de gevraagde wijziging;
* hergebruik bestaande componenten en infrastructuur waar passend;
* volg de architectuur en stijl van het geraakte domein;
* behoud publieke interfaces waar mogelijk;
* wijzig alleen bestanden die voor de taak nodig zijn;
* vermijd niet-gerelateerde refactoring;
* introduceer geen nieuwe infrastructuur wanneer bestaande componenten het probleem voldoende ondersteunen.

Wanneer tijdens implementatie een grotere architectuur-, schema- of contractwijziging noodzakelijk blijkt die niet uit de opdracht volgt, leg de impact eerst aan de gebruiker voor.

## Tests

Voeg bij gewijzigd gedrag waar praktisch gerichte unit-tests toe of pas bestaande tests aan.

Gebruik voor het ontwerpen en uitvoeren van tests de daarvoor beschikbare test-skill.

## Verificatie

Controleer na implementatie waar relevant:

* gewijzigde code;
* callers;
* publieke contracten;
* configuratiereferenties;
* globale en stringgebaseerde referenties;
* tests.

Voer veilige relevante tests uit.

## Resultaat

Rapporteer na afronding kort:

* wat is gewijzigd;
* welke bestanden zijn gewijzigd;
* welke tests zijn uitgevoerd;
* welke relevante tests niet zijn uitgevoerd en waarom;
* eventuele resterende risico's of benodigde handmatige verificatie.
