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

À configurer dans **OVH Manager → Web Cloud → Domaines → `thomasgudin.com` → Zone DNS**.
IP du serveur : **146.59.204.55**

État actuel de la zone (vérifié) : `A thomasgudin.com` existe déjà ; il n'y a **aucun MX**,
**aucun SPF**, **aucun DMARC**, **aucun DKIM**. Il n'y a donc rien à supprimer, uniquement
des ajouts. Le TXT existant `1|www.thomasgudin.com` est un marqueur OVH : **ne pas y toucher**.

Récapitulatif :

| # | Type | Sous-domaine    | Priorité | Cible / Valeur                                   |
|---|------|-----------------|----------|--------------------------------------------------|
| 1 | A    | `mail`          | —        | `146.59.204.55`                                  |
| 2 | MX   | *(vide)*        | `10`     | `mail.thomasgudin.com.`                          |
| 3 | TXT  | *(vide)*        | —        | `v=spf1 a:mail.thomasgudin.com ~all`             |
| 4 | TXT  | `_dmarc`        | —        | `v=DMARC1; p=none; rua=mailto:postmaster@thomasgudin.com; adkim=s; aspf=s` |
| 5 | TXT  | `mail._domainkey` | —      | *(généré à l'étape 5 — DKIM)*                    |

### Détail champ par champ (formulaire OVH « Ajouter une entrée »)

**1. A — hôte du serveur mail**
- Type : `A`
- Sous-domaine : `mail`
- TTL : *Par défaut*
- Cible : `146.59.204.55`
- → donne `mail.thomasgudin.com → 146.59.204.55`

**2. MX — où arrive le courrier du domaine**
- Type : `MX`
- Sous-domaine : *(laisser vide = la racine `thomasgudin.com`)*
- TTL : *Par défaut*
- Priorité : `10`
- Cible : `mail.thomasgudin.com.` *(le point final est important ; OVH l'ajoute en général tout seul)*
- → tout mail vers `…@thomasgudin.com` est livré à `mail.thomasgudin.com`

> ⚠️ La cible d'un MX doit être un **nom d'hôte** (jamais une IP) et ce nom doit avoir
> un enregistrement A (c'est l'entrée n°1). Ne mets donc pas `146.59.204.55` ici.

**3. TXT — SPF (qui a le droit d'envoyer pour le domaine)**
- Type : `TXT`
- Sous-domaine : *(laisser vide = la racine)*
- TTL : *Par défaut*
- Valeur : `v=spf1 a:mail.thomasgudin.com ~all`
- `a:mail.thomasgudin.com` = l'IP du A de `mail` est autorisée à envoyer.
- `~all` (softfail) le temps des tests ; passe à `-all` (strict) une fois la délivrabilité validée.
- → il ne doit exister **qu'un seul** enregistrement TXT commençant par `v=spf1`.
  Le TXT `1|www.thomasgudin.com` n'est pas un SPF : il peut coexister sans problème.

**4. TXT — DMARC (politique en cas d'échec SPF/DKIM)**
- Type : `TXT`
- Sous-domaine : `_dmarc`
- TTL : *Par défaut*
- Valeur : `v=DMARC1; p=none; rua=mailto:postmaster@thomasgudin.com; adkim=s; aspf=s`
- `p=none` = mode observation au début (tu reçois les rapports sans rien bloquer).
  Une fois SPF + DKIM OK, durcis en `p=quarantine` puis `p=reject`.

**5. TXT — DKIM** : voir l'étape 5 (généré par le serveur après le 1er démarrage,
sélecteur `mail`, donc sous-domaine `mail._domainkey`).

---

## 2. Reverse DNS (PTR) — indispensable pour l'envoi (cas Public Cloud)

Le PTR actuel de l'IP est `d2-2-gra7...` (défaut OVH). Sans PTR cohérent, Gmail/Outlook
rejettent ou classent en spam les mails sortants.

> **Prérequis bloquant** : l'entrée **A `mail.thomasgudin.com → 146.59.204.55`** (étape 1)
> doit déjà être créée **et propagée**. Au moment où tu valides le reverse, OVH vérifie
> en direct que le A pointe bien vers cette IP (cohérence FCrDNS), sinon il refuse.

### Via le panneau OVHcloud (recommandé)

1. [OVHcloud Control Panel](https://www.ovh.com/manager/) → section **Network** (« Réseau »).
2. Clique sur **Public IP Addresses** (« Adresses IP publiques »).
3. Recherche `146.59.204.55` (barre de recherche / filtre par catégorie).
4. Sur la ligne de l'IP, clique le bouton **⁝** → **Configure the reverse DNS**
   (ou l'icône **crayon** dans la colonne *Reverse DNS*).
5. Saisis le reverse **avec le point final** :
   ```
   mail.thomasgudin.com.
   ```
6. **Confirm**. (La propagation peut prendre jusqu'à 24 h.)

### Via l'API OVHcloud (alternative)

Sur [api.ovh.com](https://api.ovh.com/console/) → `POST /ip/{ip}/reverse` :

```
ip       = 146.59.204.55
ipReverse= 146.59.204.55
reverse  = mail.thomasgudin.com.
```

Vérification : `GET /ip/146.59.204.55/reverse/146.59.204.55`.

### ⚠️ Stabilité de l'IP en Public Cloud

Une IP publique d'instance Public Cloud reste attachée **tant que l'instance existe**
(un simple reboot/stop-start la conserve), mais elle est **perdue si tu supprimes/recrées
l'instance** — il faudrait alors refaire le A **et** le reverse.

Pour une IP indépendante de l'instance, utilise une **Floating IP** : son reverse se règle
soit dans *Network → Public IP Addresses* (idem ci-dessus), soit en CLI OpenStack :

```bash
openstack floating ip set --dns-domain mail.thomasgudin.com. <FLOATING_IP_ID>
```

Le PTR doit correspondre exactement au `hostname` du conteneur (`mail.thomasgudin.com`)
et le A de cet hôte doit pointer vers la même IP.

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
