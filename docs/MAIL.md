# Serveur mail self-hosted (thomasgudin.com)

Petit serveur mail basé sur [docker-mailserver](https://docker-mailserver.github.io/docker-mailserver/)
(Postfix + Dovecot + Rspamd pour l'anti-spam et la signature DKIM).

- **Hôte mail** : `mail.thomasgudin.com`
- **Domaine des adresses** : `@thomasgudin.com` (ex : `play@thomasgudin.com`)
- **TLS** : certificats Let's Encrypt déjà émis par Traefik (`letsencrypt/acme.json`).
- **Fichiers** : `docker-compose.mail.yml`, `mailserver.env`, données dans `docker-data/` (ignoré par git).

> ⚠️ En activant ce serveur, le mail du domaine n'est **plus géré par OVH** :
> il faut faire pointer l'enregistrement MX vers ce serveur (étape 1).

---

## Vue d'ensemble (ordre des opérations)

1. Configurer le DNS (A, MX, SPF, DMARC).
2. Configurer le **reverse DNS (PTR)** de l'IP chez OVH.
3. Déployer le conteneur et laisser Traefik émettre la certif `mail.thomasgudin.com`.
4. Créer la (les) boîte(s) mail.
5. Générer la clé **DKIM** et publier l'enregistrement DNS correspondant.
6. Tester (réception, envoi, score de délivrabilité).
7. Configurer le client (Gmail / Thunderbird / iOS) ou l'usage Play Console.

---

## 1. Enregistrements DNS

À créer dans la zone DNS de `thomasgudin.com` (OVH Manager → *Domaines* → *Zone DNS*).
IP du serveur : **146.59.204.55**

| Type  | Nom                     | Valeur / Cible                         | Remarque                          |
| ----- | ----------------------- | -------------------------------------- | --------------------------------- |
| A     | `mail`                  | `146.59.204.55`                        | hôte du serveur mail              |
| MX    | `@` (racine)            | `mail.thomasgudin.com.` priorité `10`  | **supprimer les MX OVH existants**|
| TXT   | `@` (racine)            | `v=spf1 a:mail.thomasgudin.com -all`   | SPF (remplace `v=spf1 -all`)      |
| TXT   | `_dmarc`                | `v=DMARC1; p=quarantine; rua=mailto:postmaster@thomasgudin.com; adkim=s; aspf=s` | DMARC |

> La ligne **DKIM** (`mail._domainkey`) est générée à l'étape 5, après le premier démarrage.

---

## 2. Reverse DNS (PTR) — indispensable pour l'envoi

Le PTR actuel de l'IP est `d2-2-gra7...` (défaut OVH). Sans PTR cohérent, Gmail/Outlook
rejettent ou classent en spam les mails sortants.

Dans **OVH Manager → Bare Metal / VPS / Public Cloud → ton serveur → Réseau / IP → "Reverse DNS"** :

```
146.59.204.55  ->  mail.thomasgudin.com
```

Le PTR doit correspondre exactement au `hostname` du conteneur (`mail.thomasgudin.com`)
et l'enregistrement A de cet hôte doit pointer vers la même IP (cohérence FCrDNS).

---

## 3. Déploiement

Sur le serveur (le repo est dans `/srv/thomasgudin.com`) :

```bash
cd /srv/thomasgudin.com
git pull

# Démarre le serveur mail + le service factice qui déclenche la certif Traefik
docker compose -f docker-compose.mail.yml up -d

# Vérifier que Traefik a bien émis le certificat pour mail.thomasgudin.com
docker compose logs traefik 2>/dev/null | grep -i mail.thomasgudin.com
# ou tester directement :
echo | openssl s_client -connect mail.thomasgudin.com:443 -servername mail.thomasgudin.com 2>/dev/null | openssl x509 -noout -subject
```

Une fois la certif présente dans `letsencrypt/acme.json`, docker-mailserver la détecte
automatiquement (`SSL_TYPE=letsencrypt`). Si besoin, relancer :

```bash
docker compose -f docker-compose.mail.yml restart mailserver
```

---

## 4. Créer une boîte mail

```bash
# Crée la boîte et demande le mot de passe de façon interactive
docker exec -it mailserver setup email add play@thomasgudin.com

# Lister les comptes
docker exec -it mailserver setup email list
```

Alias utiles (optionnel) :

```bash
docker exec -it mailserver setup alias add postmaster@thomasgudin.com play@thomasgudin.com
docker exec -it mailserver setup alias add contact@thomasgudin.com  play@thomasgudin.com
```

---

## 5. DKIM

Générer la clé (Rspamd) une fois au moins un domaine configuré :

```bash
docker exec -it mailserver setup config dkim
```

Afficher l'enregistrement DNS à publier :

```bash
cat docker-data/dms/config/rspamd/dkim/mail.thomasgudin.com.*.public.dns 2>/dev/null \
  || docker exec -it mailserver cat /tmp/docker-mailserver/rspamd/dkim/*.public.dns
```

Publier le TXT obtenu (le sélecteur est `mail` par défaut) :

| Type | Nom                              | Valeur                          |
| ---- | -------------------------------- | ------------------------------- |
| TXT  | `mail._domainkey.thomasgudin.com`| `v=DKIM1; k=rsa; p=...` (clé)   |

Puis recharger :

```bash
docker compose -f docker-compose.mail.yml restart mailserver
```

---

## 6. Tests

- **Propagation DNS** :
  ```bash
  dig +short MX thomasgudin.com
  dig +short A   mail.thomasgudin.com
  dig +short TXT thomasgudin.com
  dig +short TXT mail._domainkey.thomasgudin.com
  dig +short -x 146.59.204.55      # PTR
  ```
- **Réception** : envoyer un mail depuis Gmail vers `play@thomasgudin.com`, vérifier l'arrivée.
- **Envoi + score global** : envoyer un mail vers l'adresse fournie par
  [mail-tester.com](https://www.mail-tester.com) (vise 9–10/10).
- **TLS submission** :
  ```bash
  openssl s_client -connect mail.thomasgudin.com:465 -servername mail.thomasgudin.com
  ```

---

## 7. Paramètres client (Gmail « autre compte », Thunderbird, iOS…)

| Réglage          | Valeur                          |
| ---------------- | ------------------------------- |
| IMAP (réception) | `mail.thomasgudin.com`, port `993`, SSL/TLS |
| SMTP (envoi)     | `mail.thomasgudin.com`, port `465`, SSL/TLS (ou `587` STARTTLS) |
| Identifiant      | adresse complète (`play@thomasgudin.com`) |
| Mot de passe     | celui défini à l'étape 4        |

Pour le **Google Play Console** : il suffit de pouvoir **recevoir** les mails de
vérification sur `play@thomasgudin.com` (étapes 1, 3, 4 suffisent pour la réception ;
2 et 5 améliorent fortement l'envoi/la délivrabilité).

---

## Exploitation

```bash
# Logs
docker compose -f docker-compose.mail.yml logs -f mailserver

# Mettre à jour l'image
docker compose -f docker-compose.mail.yml pull && \
docker compose -f docker-compose.mail.yml up -d

# Sauvegarde : tout est dans docker-data/ (boîtes, état, clés DKIM)
tar czf mail-backup-$(date +%F).tgz docker-data/
```
