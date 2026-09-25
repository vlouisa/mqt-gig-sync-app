---

name: git-commit
description: Commit gereviewde wijzigingen van de huidige taak volgens de MQT Gig Sync commitconventies. Gebruik deze skill wanneer de gebruiker expliciet vraagt om een git commit.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Git commit

Commit uitsluitend de wijzigingen die bij de huidige taak horen.

## Werkwijze

1. Inspecteer de huidige Git-status en relevante diff.
2. Controleer dat alleen bedoelde wijzigingen worden meegenomen.
3. Commit geen niet-gerelateerde wijzigingen.
4. Maak de commit.
5. Rapporteer de gebruikte commit message en het resultaat.

## Commit message

Gebruik:

```text id="c8klke"
<onderwerp>: <message>
```

De commit message is in het Nederlands.

Schrijf onderwerp en message in kleine letters, behalve waar hoofdletters inhoudelijk noodzakelijk zijn.

Gebruik een passend onderwerp, bijvoorbeeld:

* `feat`
* `fix`
* `test`
* `docs`
* `refactor`
* `chore`

Voorbeelden:

```text id="43pq1e"
feat: voeg factuurreminder toe
fix: voorkom dubbele notificaties
test: voeg tests voor verlopen opties toe
docs: actualiseer projectinstructies
```

