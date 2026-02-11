# Configuration Scalingo

Ce projet utilise les variables d'environnement suivantes sur Scalingo :

## Variables requises

- `PORT` : Port d'écoute du serveur (automatiquement défini par Scalingo)
- `API_BASE_URL` : URL de base de l'API Groupie Trackers (optionnel, défaut: https://groupietrackers.herokuapp.com/api)
- `NOMINATIM_USER_AGENT` : User-Agent pour Nominatim (optionnel mais recommandé)

## Configuration sur Scalingo

Pour définir les variables d'environnement sur Scalingo :

```bash
# Via le dashboard Scalingo
# Environment > Add a new variable

# Ou via la CLI
scalingo -a votre-app env-set NOMINATIM_USER_AGENT="GroupieTracker/1.0 (votre-email@exemple.com)"
scalingo -a votre-app env-set API_BASE_URL="https://groupietrackers.herokuapp.com/api"
```

## Déploiement

```bash
git push scalingo main
```
