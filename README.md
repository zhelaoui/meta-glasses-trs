# Meta CNC HUD Demo (Meta Ray-Ban Display)

Démo Web App statique d'assistant de réglage CNC pour lunettes Meta Ray-Ban Display.

## Objectif
Montrer la valeur atelier des lunettes : information contextuelle, alertes immédiates, interaction mains libres, progression locale.

## GitHub Pages
https://zhelaoui.github.io/meta-glasses-trs/

## Test local
```bash
python -m http.server 8000
```
Puis ouvrir `http://localhost:8000`.

## Commandes clavier
- `ArrowRight` / `ArrowLeft` : étape suivante / précédente
- `ArrowDown` / `ArrowUp` : item suivant / précédent
- `Enter` : valider / dévalider l’item
- `Escape` : retour étape 1
- `R` : reset démo
- `M` : changer panneau (checklist / démo lunettes)
- `A` : test audio (bip + speech si disponible)
- `G` : test GPS

## Limites Web App
- Pas d’accès caméra/photo/micro natif lunettes en Web App simple.
- Ces fonctions sont marquées **prévu via SDK mobile / Device Access Toolkit**.
- Données machine en mode simulé, code prêt pour une future API (`fetch`).

## Déploiement GitHub Pages
- Paramétrer **Settings > Pages** sur `Deploy from a branch`, branche `main`, dossier `/ (root)`.
- En cas de cache navigateur/CDN : faire un hard refresh (`Ctrl+F5`) ou ouvrir en navigation privée.
- Pour forcer un redéploiement, pousser un commit (même documentation) sur `main`.
