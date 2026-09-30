# Cahier des charges — extracted source

Verbatim body text extracted from the supplied DOCX in document order. Formatting is simplified. The original DOCX remains authoritative for source wording. Questions and hypotheses in this document are not confirmed client answers.

Cahier des charges

Plateforme de pratique de la frappe au clavier

1 Vision du produit

La plateforme permet aux jeunes de 10 à 12 ans de pratiquer la frappe en français et en anglais au moyen de courses multijoueurs. La compétition, un univers visuel engageant et le suivi des progrès doivent encourager une pratique régulière. La vitesse compte, mais la précision doit aussi influencer les résultats. Un élève peut participer avec ou sans compte; un compte conserve sa progression entre les séances.

2 Glossaire

Salle  Espace commun où les participants attendent, règlent une course et restent entre deux courses.

Course  Épreuve chronométrée de saisie d’un texte, depuis le départ commun jusqu’aux résultats.

Hôte  Personne qui gère la salle, configure les courses et lance leur départ.

Invité  Participant sans compte. Sa séance regroupe les courses effectuées pendant sa visite.

MPM  Mots par minute, équivalent de WPM. La méthode de calcul proposée figure en H3.

Classement  Ordre des participants selon leur performance et les pénalités retenues.

Bot  Participant automatisé dont la vitesse et le taux d’erreurs dépendent d’un niveau.

Bonus  Effet de rattrapage qui aide un participant en retard ou gêne un meneur.

3 Exigences numérotées par thème

Les exigences décrivent les besoins du produit. Les règles non précisées par le client sont proposées dans les hypothèses H1 à H8. Leur priorité de réalisation figure à la section 7.

Comptes et accès

AUTH-1  Permettre de créer un compte et de se connecter avec GitHub ou Discord, ainsi qu’avec un nom d’utilisateur unique et un mot de passe, sans adresse courriel ni fonction de récupération de mot de passe.

AUTH-2  Permettre une photo de profil, importée du fournisseur lorsque disponible ou ajoutée par l’utilisateur. Proposer une option « Se souvenir de moi ».

AUTH-3  Permettre aux invités d’accéder aux fonctionnalités de jeu, dont la création et la participation aux courses. Afficher leurs statistiques de course et de séance.

AUTH-4  Lorsqu’un invité crée un compte, rattacher à ce nouveau compte les courses de sa séance. Conserver l’historique et les statistiques de toutes les courses des comptes.



Salles et participation

SAL-1  Offrir trois accès : une salle publique listée sur le site, une salle non listée accessible par code, et une salle fermée accessible par liens d’invitation uniques générés par l’hôte.

SAL-2  Le bouton « Faire une course » de l’accueil rejoint la salle publique admissible la plus remplie. S’il n’en existe aucune, créer une salle pour le participant; la notion de salle admissible est précisée en H1.

SAL-3  Présenter une salle d’attente où les participants se rassemblent avant que l’hôte lance la course. Exiger au moins deux personnes pour démarrer. Le client souhaite ne pas fixer de maximum; la capacité technique reste à valider.

SAL-4  Après une course, permettre à l’hôte de relancer la préparation avec le même groupe et de modifier les paramètres. Permettre aussi de fermer la salle et de renvoyer tous les participants à l’accueil. Prévoir le transfert du rôle d’hôte comme amélioration.

Textes et configuration

TXT-1  Permettre à l’hôte de personnaliser le texte en français ou en anglais, indépendamment de la langue de l’interface de chaque participant. Le texte initial doit être identique pour tous.

TXT-2  Permettre des phrases ou une suite de mots dans le désordre. L’hôte choisit la longueur en mots et plusieurs caractères à pratiquer, qui doivent apparaître à répétition, notamment les accents et le « ç ».

TXT-3  Prévoir des textes comportant des majuscules, des symboles et des chiffres. La fréquence de ces éléments et le mécanisme de personnalisation restent à préciser.

Déroulement et classement

JEU-1  Faire partir les participants ensemble et afficher leur progression ainsi qu’un classement actualisé en temps réel. Signaler discrètement lorsqu’un participant dépasse quelqu’un ou se fait dépasser.

JEU-2  Offrir deux modes d’erreurs : saisie libre avec erreurs marquées en rouge à la fin et pénalité au classement; saisie bloquée sur un caractère incorrect jusqu’à correction, avec une petite pénalité par erreur. La règle de classement est proposée en H3.

JEU-3  Fixer une durée maximale de course. Terminer lorsque tous les participants ont fini ou que cette durée est atteinte; les abandons et déconnexions sont traités selon H4.

JEU-4  Gérer les pertes de connexion sans bloquer indéfiniment la course. Prévoir une fin automatique en cas d’inactivité générale et un délai de sécurité lorsque tous les participants sont déconnectés; les seuils sont proposés en H4.

JEU-5  Offrir un bouton pour abandonner la course tout en restant spectateur dans la salle, et un autre bouton pour quitter la salle.

JEU-6  Prévoir des bots de plusieurs niveaux, avec une vitesse moyenne en MPM et un taux d’erreurs propres au niveau, afin qu’ils ne tapent pas tous parfaitement.

JEU-7  Prévoir des bonus plus puissants pour les participants en retard : ajouter des mots aux meneurs, retirer des mots aux participants derrière ou flouter le texte des meneurs. Leur activation et leurs limites restent à définir.



Résultats et progression

STAT-1  À la fin d’une course, présenter les résultats de chacun, un podium des trois premiers lorsque possible et des statistiques de performance. Les indicateurs de base proposés sont les MPM, la précision, les erreurs et le résultat final.

STAT-2  Pour chaque compte, rendre consultables l’historique complet des courses et l’évolution des MPM au fil du temps. Distinguer les conditions de jeu qui influencent la comparaison des performances, selon H5.

STAT-3  Présenter un clavier virtuel avec une carte de chaleur du taux d’erreurs par touche. Encourager la progression par des jalons, notifications ou récompenses; leur forme précise reste à choisir.

Interface et expérience

UX-1  Créer une direction artistique originale et cohérente, dynamique et adaptée aux 10 à 12 ans, qui soutient la pratique et rend les courses engageantes.

UX-2  Proposer des thèmes clair et sombre. Adapter les pages aux différentes tailles d’écran; l’écran de course est exclu de cette demande d’adaptation et sa cible est précisée en H8.

Contraintes techniques et qualité

TECH-1  Développer avec React et Next.js, en TypeScript pour le code applicatif, sans JavaScript applicatif, avec Tailwind CSS pour les styles et PostgreSQL pour les données.

TECH-2  Déployer sur AWS ou Vercel et rendre le site accessible en HTTPS. Utiliser un service gratuit pour les échanges en temps réel ou réaliser ce mécanisme dans le projet.

TECH-3  Conserver le code sur GitHub avec une documentation permettant l’installation, la configuration, l’exécution des tests et le déploiement. Exécuter automatiquement les tests unitaires et de bout en bout dans le pipeline.

4 Contradictions et zones floues

C1  Équité et bonus : le client veut le même texte pour tous et une victoire à la vitesse, mais les bonus changent la quantité de texte ou sa lisibilité. Des performances ainsi obtenues ne sont pas directement comparables.

C2  Vitesse et précision : « le plus vite gagne » ne définit pas comment appliquer les pénalités, départager une égalité ou classer les participants qui ne terminent pas.

C3  Invités et permanence : l’accès à toute la plateforme ne précise pas comment conserver les statistiques d’un invité après sa visite, ni comment identifier sa séance au moment de l’inscription.

C4  Capacité et ressources : une course « sans maximum » ne peut pas être garantie sur une infrastructure finie. Le nombre attendu de joueurs simultanés et les moyens disponibles sont inconnus.

C5  Fin de course : durée maximale, inactivité de 2 à 3 minutes et délai caché d’environ 30 minutes peuvent se concurrencer. Le sort des déconnectés et de l’hôte absent n’est pas défini.

C6  Règles incomplètes : minimum de personnes face aux bots, usage unique des liens, personnalisation des textes, dispositions de clavier, récupération des comptes et portée des récompenses restent à préciser.



5 Questions au client

Ces questions doivent permettre de valider les règles avant leur développement. Les réponses n’ont pas encore été obtenues.

Q1 • C1  Acceptez-vous de séparer les courses classiques, au texte identique, et les courses avec bonus? Les courses avec bonus doivent-elles contribuer aux records personnels?

Q2 • C2  Validez-vous un classement par MPM corrigés proposé en H3, ou préférez-vous l’ordre d’arrivée assorti de secondes de pénalité? Quelle pénalité souhaitez-vous dans chaque mode d’erreurs?

Q3 • C2  À la limite de temps, faut-il classer les participants ayant un texte incomplet avec les autres? Comment départager deux résultats identiques et afficher les abandons?

Q4 • C3  Les résultats d’un invité doivent-ils disparaître à la fin de sa séance? Le rattachement vise-t-il seulement un nouveau compte ou aussi la connexion à un compte existant?

Q5 • C4  Combien de participants faut-il supporter dans une salle et sur le site simultanément? Quel budget et quel fournisseur d’hébergement sont disponibles?

Q6 • C5  Quelle durée maximale de course faut-il utiliser? Validez-vous une fin après 3 minutes sans activité, y compris si tous sont déconnectés, avec un plafond de sécurité de 30 minutes?

Q7 • C5  Pendant combien de temps un joueur peut-il revenir après une déconnexion? La course continue-t-elle pendant son absence? Que doit-il se passer si l’hôte quitte la salle?

Q8 • C6  Faut-il deux humains pour démarrer, ou un humain et un bot suffisent-ils? Les bots figurent-ils au podium et dans les statistiques au même titre que les humains?

Q9 • C6  Les liens d’une salle fermée doivent-ils être utilisables une seule fois, expirer, ou être associés à une personne? Un invité sans compte peut-il les utiliser?

Q10 • C6  L’hôte peut-il saisir son propre texte, choisir un texte existant ou générer un texte selon ses critères? Combien d’occurrences faut-il pour chaque caractère choisi, et que faire si la longueur est insuffisante?

Q11 • C6  Quelles dispositions de clavier faut-il représenter dans la carte de chaleur? Faut-il compter chaque frappe incorrecte ou seulement les erreurs restant dans le texte final?

Q12 • C6  Confirmez-vous qu’un mot de passe local oublié rend le compte inaccessible sans aide? Faut-il un mécanisme de réinitialisation par un responsable, malgré l’absence de récupération autonome?

Q13 • C1 et C6  Les bonus sont-ils automatiques ou déclenchés par un joueur? À quelle fréquence et avec quelles limites? Les jalons, les récompenses et le transfert d’hôte sont-ils nécessaires dès la première livraison?



6 Hypothèses et décisions proposées

Les décisions ci-dessous servent de base de développement jusqu’à validation par le client. Elles ne constituent pas des réponses déjà fournies par celui-ci.

H1 • Salles  Le client ne précise pas l’admission en cours de jeu. Je suppose qu’on rejoint seulement une salle en attente et que son créateur devient hôte, afin de préserver un départ commun. Une salle fermée accepte un invité muni d’un lien unique utilisable une fois, pour limiter le partage d’accès.

H2 • Séance invitée  La durée de conservation n’est pas précisée. Je suppose que la séance est liée au même navigateur et reste récupérable pendant sa visite; seule la création d’un compte transfère ses résultats. Cette règle permet le suivi demandé sans inventer une identité permanente pour l’invité.

H3 • Mesure et classement  La formule étant absente, je propose une unité de cinq caractères par mot. Les MPM bruts valent caractères saisis ÷ 5 ÷ minutes écoulées. Le score est ce débit moins les erreurs pénalisables par minute, sans descendre sous zéro : erreurs finales en saisie libre, frappes refusées en saisie bloquée. La précision vaut frappes correctes ÷ frappes totales. Le classement utilise le score décroissant, puis la précision, puis le temps de fin; une égalité persistante reste ex æquo. Les non-finissants sont évalués au délai maximal et les abandons affichés à part, pour rendre chaque issue explicite.

H4 • Interruptions  Le client ne tranche pas les délais. Je retiens 3 minutes sans activité de jeu et un plafond de sécurité de 30 minutes depuis le départ; la première condition de fin atteinte prévaut, y compris la durée normale. Une déconnexion ne suspend pas le chronomètre : le joueur peut revenir avant la fin et retrouver sa progression. Les abandons ne retardent pas la fin lorsque les autres ont terminé. Ces choix évitent les salles bloquées.

H5 • Comparabilité  Les effets des bonus ne sont pas cadrés. Je propose un mode classique par défaut et un mode bonus distinct. Les records de pratique proviennent du mode classique; l’historique indique langue, mode d’erreurs et présence de bonus, afin de comparer des résultats compréhensibles.

H6 • Joueurs et capacité  Le mot « personnes » suggère deux humains; je conserve ce minimum même avec des bots. Je suppose une capacité technique finie à dimensionner après Q5, car aucune infrastructure ne garantit un nombre illimité de connexions.

H7 • Textes  Le nombre de répétitions est absent. Je propose au moins trois occurrences de chaque caractère sélectionné. Si les critères sont incompatibles avec la longueur, l’interface demande leur ajustement avant le départ, afin de ne pas produire un exercice trompeur.

H8 • Écran de course  Le matériel cible est absent. Je suppose un ordinateur avec clavier physique pour les courses; les autres pages restent utilisables sur téléphone et tablette. Cette cible correspond à la pratique de frappe demandée.

7 Priorisation de la réalisation

Cette priorisation proposée ordonne les livraisons; elle ne supprime aucun besoin exprimé.

Essentiel  AUTH-1, AUTH-3 et AUTH-4; SAL-1 à SAL-3 et relance/fermeture de SAL-4; TXT-1 à TXT-3; JEU-1 à JEU-5; STAT-1 et STAT-2; UX-1 et UX-2; TECH-1 à TECH-3. Ce socle couvre la pratique, l’accès, les courses fiables, les progrès et les contraintes imposées.

Souhaitable  Photo de profil de AUTH-2, bots de JEU-6 et clavier avec carte de chaleur de STAT-3 : ils enrichissent la personnalisation et le retour pédagogique après stabilisation du socle.

Moins prioritaire  Option de connexion persistante de AUTH-2, transfert d’hôte de SAL-4, bonus de JEU-7 et récompenses ou notifications de STAT-3 : leur ajout vient après validation des règles et de l’équité du jeu.
