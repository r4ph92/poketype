# Utilisation de l'IA dans PokéType

> Les parties factuelles (outils, fichiers d'instructions, pistes d'incidents) sont tirées du dépôt. Les trois situations et la réflexion sont à rédiger par l'étudiant.

## Agents et outils

### Outil principal

- Claude Code (application de bureau), qui exécute les agents ci-dessous.

### Rôles d'agents et modèles

Règles de la maison : la réflexion approfondie et la sécurité utilisent le modèle le plus puissant (Fable), les revues utilisent Opus, l'implémentation utilise Sonnet ou Opus selon la complexité, et Sonnet à faible effort pour les changements triviaux. Si Fable est indisponible ou son quota épuisé, on retombe sur Opus.

| Rôle | Mission | Modèle (catégorie de la règle de la maison) |
| --- | --- | --- |
| team lead | Mène une histoire de bout en bout et coordonne les autres rôles | Fable (réflexion approfondie) |
| explorer | Cartographie le code touché avant le plan | Selon la tâche |
| plan-reviewer | Critique le plan avant l'implémentation | Opus (revue) |
| implementer | Implémente, teste et refactorise une histoire S ou M | Sonnet ou Opus selon la complexité |
| implementer-light | Changement trivial (texte, valeur de configuration) | Sonnet à faible effort |
| implementer-heavy | Histoire L ou transversale (modèle de données, concurrence) | Opus |
| qa-feature | Teste le comportement contre les critères d'acceptation | Opus (revue) |
| qa-code | Revoit la qualité du code de l'histoire | Opus (revue) |
| ui-reviewer | Revoit les écrans rendus (design, accessibilité) | Opus (revue) |
| pentester | Attaque la nouvelle surface d'attaque | Fable (sécurité) |
| product-owner | Découpe un besoin en épopées et histoires avec critères | Selon la tâche |
| expert | Répond aux questions difficiles de conception ou de sécurité | Fable (réflexion approfondie) |
| arbiter | Tranche une action bloquée par un garde-fou | Selon la tâche |

Les modèles précis par rôle sont définis dans les fichiers d'agents de `~/.claude/agents/` (voir la section suivante), non versionnés dans ce dépôt : à vérifier par l'étudiant.

### Autres outils

- `gh` (GitHub CLI) : tickets, tableau de projet, pull requests.
- Le tableau GitHub Project « PokéType » : suivi des histoires.
- Playwright : tests de bout en bout (`tests/e2e/`, commande `npm run test:e2e`).
- Vitest : tests unitaires (`tests/unit/`).

## Fichiers d'instructions

### Dans le dépôt (versionnés)

| Fichier | Rôle |
| --- | --- |
| `CLAUDE.md` | Instructions du projet : but, pile technique, source de vérité, conventions |
| `.claude/settings.json` | Permissions autorisées pour l'agent dans ce projet (configuration, pas des instructions rédigées) |
| `.claude/board.json` | Configuration du tableau de projet utilisée par la boucle de travail |

### Hors du dépôt (NON versionnés)

Ces fichiers vivent dans le dossier personnel `~/.claude` et ne sont pas commités dans le dépôt :

- `~/.claude/CLAUDE.md` : instructions globales (façon de travailler, code, commits, modèles).
- `~/.claude/agents/` : définitions des agents (rôles ci-dessus).
- `~/.claude/skills/` : compétences, notamment `story`, `board`, `groom`, `implementing`, `clean-code`, `ui-design`, `retro`.

Question ouverte pour l'étudiant : le cahier des charges demande que les fichiers d'instructions soient versionnés. Faut-il copier ces fichiers de `~/.claude` dans le dépôt ?

## Trois situations où l'IA s'est trompée

### Pistes

Incidents réels de l'historique du dépôt où une correction a rattrapé une erreur d'un changement précédent écrit avec l'IA.

1. [`ca0b1e0`](https://github.com/r4ph92/poketype/commit/ca0b1e03e1d033b9820c4728725d7316fb19dabf) : l'ordre des directions dans les feuilles de sprites était supposé (sud, sud-ouest, ouest...) alors que les feuilles vont dans le sens horaire ; les coureurs ne regardaient pas dans la bonne direction.
2. [`df31886`](https://github.com/r4ph92/poketype/commit/df318864e2121124a2ca728cec207d0982186622) (PR [#112](https://github.com/r4ph92/poketype/pull/112)) : le départ de la course ne retenait que l'espèce du partenaire, donc avec plusieurs Pokémon de la même espèce l'XP pouvait aller au mauvais ; on enregistre maintenant la ligne exacte.
3. [`1c41b6b`](https://github.com/r4ph92/poketype/commit/1c41b6b8bb99f7c897391a1d52185a103829a501) : le test du hash altéré changeait le dernier caractère encodé, ce qui ne modifie pas toujours un octet décodé (test peu fiable) ; on modifie un caractère au milieu.
4. [`851820d`](https://github.com/r4ph92/poketype/commit/851820db7260cffa1aea1ed307246670bba2d376) : le test de rafale de hachage tournait sur le serveur partagé avec d'autres tests de bout en bout ; il passe sur son propre serveur.
5. [`be03d1b`](https://github.com/r4ph92/poketype/commit/be03d1bcafba965d68b7d0797de14396b5df0acd) : le déploiement lançait les migrations et le seed aussi sur les prévisualisations, qui partagent la base de production ; seul le déploiement de production migre désormais.
6. [`545891b`](https://github.com/r4ph92/poketype/commit/545891b70cca9697bddac986a5e2769f9dc1b71f) : les liens de la liste des salons publics étaient préchargés automatiquement par Next.js alors que ce préchargement n'était pas voulu pour un lien d'adhésion ; il est désactivé.
7. [`598eca4`](https://github.com/r4ph92/poketype/commit/598eca4704f8ca1c457fb36326f4a9849eb60fe9) : en quittant un salon, les mises à jour en direct continuaient et réinscrivaient le joueur parti ; on les arrête avant de quitter.
8. [`b455212`](https://github.com/r4ph92/poketype/commit/b4552125770c46f917ed40da5a3265137c8c0cd3) : le rapport de progression envoyait tout l'état de frappe, et le serveur refuse les champs inconnus ; on n'envoie plus que les compteurs.

### Situation 1

À rédiger par l'étudiant

### Situation 2

À rédiger par l'étudiant

### Situation 3

À rédiger par l'étudiant

## Réflexion

À rédiger par l'étudiant
