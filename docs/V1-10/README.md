# Mission V1-10 : Portail Supervision & Contrôle (ASACI / Régulateur)

## 1. Objectif

L'objectif de cette mission était de développer un module RegTech complet pour la supervision et le contrôle du marché de l'assurance par l'entité régulatrice (ASACI). Ce portail fournit des outils pour le suivi des indicateurs de marché, le contrôle de la conformité des offres, la gestion centralisée des réclamations, la vérification des attestations, la détection d'anomalies et la génération de rapports audités.

## 2. Architecture & Composants

La solution s'articule autour d'un nouveau module NestJS `SupervisionModule` et d'une nouvelle section dans l'interface d'administration. L'accès est strictement contrôlé par un système RBAC avec de nouveaux rôles spécifiques (`regulator_viewer`, `regulator_auditor`, `asaci_audit`, etc.).

### 2.1. Backend (`SupervisionModule`)

Le module backend expose 18 nouvelles routes et intègre plusieurs services spécialisés :

| Service                | Description                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `SupervisionService`   | Fournit les KPIs marché, l'analyse de l'entonnoir de conversion, le suivi des SLAs et la santé des plans. |
| `ComplaintService`     | Gère le cycle de vie complet des réclamations (CRUD, workflow, SLA).                                    |
| `AttestationService`   | Permet la vérification des attestations via un connecteur (actuellement un stub).                       |
| `ExportService`        | Génère des exports CSV, les enregistre dans un registre et en assure l'intégrité par hashage.           |
| `PiiMaskingService`    | Masque par défaut toutes les données à caractère personnel (PII).                                       |
| `SupervisionAudit`     | Intercepteur qui journalise toutes les actions sensibles effectuées dans le portail de supervision.      |

### 2.2. Frontend (Portail Admin)

Une nouvelle section "Supervision ASACI" a été ajoutée au portail d'administration, accessible uniquement aux utilisateurs avec les rôles appropriés. Elle contient 6 nouvelles pages :

- **Dashboard Marché** : Visualisation des KPIs, de l'entonnoir de conversion et des violations de SLA.
- **Contrôle Offres** : Analyse de la "santé" des plans d'assurance (complétude, validité).
- **Attestations** : Outil de vérification des attestations et historique des vérifications.
- **Réclamations** : Tableau de bord pour le suivi et la gestion des réclamations clients.
- **Anomalies** : Liste des anomalies détectées automatiquement et des signalements manuels.
- **Exports** : Génération de rapports CSV et consultation du registre des exports.

## 3. Sécurité & Conformité

La sécurité et la conformité sont au cœur de ce module :

- **RBAC strict** : Seuls les rôles de supervision peuvent accéder aux fonctionnalités.
- **Masquage PII** : Les données personnelles sont masquées par défaut. Leur démasquage est une action exceptionnelle, nécessitant une justification et qui est systématiquement auditée.
- **Audit renforcé** : Toutes les actions (consultation, export, démasquage) sont enregistrées dans un journal d'audit immuable (`SupervisionAuditLog`).
- **Intégrité des exports** : Chaque export est accompagné d'un hash SHA-256 pour garantir son intégrité.
- **Rate Limiting** : Les points d'accès sensibles sont protégés contre les abus par une limitation du nombre de requêtes.

## 4. Validation

La mission a été validée par une campagne de tests `end-to-end` complète, couvrant l'ensemble des nouvelles fonctionnalités. **41 tests sur 41 ont été exécutés avec succès**, validant :

- Le contrôle d'accès (RBAC).
- Le bon fonctionnement de tous les endpoints de l'API.
- Le masquage par défaut et le démasquage conditionnel des PII.
- Le cycle de vie des réclamations et des signalements.
- La génération et le téléchargement des exports.
- L'enregistrement des actions dans le journal d'audit.

Le script de test `v110-supervision-e2e.sh` a été ajouté au projet pour garantir la non-régression.
