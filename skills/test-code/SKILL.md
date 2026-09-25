---

name: test-code
description: Ontwerp, wijzig en voer tests uit voor MQT Gig Sync. Gebruik deze skill wanneer tests moeten worden toegevoegd, aangepast, uitgevoerd of wanneer een implementatie door tests moet worden geverifieerd.
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Test code

Ontwerp en voer gerichte tests uit voor het relevante gedrag.

## Onderzoek

Inspecteer vóór het wijzigen of toevoegen van tests:

* de productiecode die wordt getest;
* bestaande tests voor hetzelfde of vergelijkbaar gedrag;
* de beschikbare testinfrastructuur;
* relevante afhankelijkheden en side effects.

Sluit aan op bestaande testpatronen.

## Testgevallen

Dek waar relevant af:

* het normale scenario;
* relevante grensgevallen;
* relevante foutscenario's;
* regressiegevoelig bestaand gedrag.

Voeg alleen testgevallen toe die betekenisvol gedrag verifiëren.

Test implementatiedetails niet onnodig wanneer het publieke gedrag voldoende kan worden getest.

## Assertions

Gebruik assertions die het bedoelde gedrag daadwerkelijk verifiëren.

Wijzig bestaande assertions niet uitsluitend om een foutieve implementatie groen te krijgen.

Een falende bestaande test kan wijzen op een regressie. Onderzoek eerst waarom de test faalt voordat deze wordt aangepast.

## Uitvoeren

Geef voorkeur aan geïsoleerde lokale unit-tests.

Voer alleen tests uit die veilig kunnen worden uitgevoerd volgens de regels uit `AGENTS.md`.

Wanneer een test externe side effects kan hebben, voer deze niet uit zonder de vereiste toestemming.

## Resultaat

Rapporteer:

* welke tests zijn toegevoegd of gewijzigd;
* welke tests daadwerkelijk zijn uitgevoerd;
* het resultaat daarvan;
* welke relevante tests niet zijn uitgevoerd en waarom;
* eventuele resterende handmatige verificatie.
