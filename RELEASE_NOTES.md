# DFtpS v2.0.5 - Release Notes

## Nouveautés majeures

### Migration Deno 2.x

- Imports JSR (`@std/*`, `@db/sqlite`, `@cliffy/*`)
- Remplacement de denodb par `@db/sqlite` natif
- Hashage des mots de passe avec `@node-rs/argon2` (Argon2id)

### Sécurité

- Support TLS/SSL complet (AUTH TLS, PROT P - RFC 2228)
- Argon2id pour le hashage des mots de passe

### Conformité RFC

- RFC 959 - FTP de base (100%)
- RFC 2228 - Sécurité FTP
- RFC 2389 - Négociation de fonctionnalités (FEAT)
- RFC 2428 - Extensions IPv6 (EPSV, EPRT)
- RFC 3659 - Extensions (MDTM, SIZE, REST STREAM)

**44 commandes FTP implémentées** incluant HELP

## Installation

```bash
# Via JSR
deno add @dftp/server

# Ou télécharger le binaire depuis GitHub Releases
```

## Utilisation comme library

```ts
import { createDb, Server, Users } from "@dftp/server";
import { hash, verify } from "@node-rs/argon2";

// Initialiser la base de données
createDb({ connector: "SQLite", filepath: "./users.db" });

// Créer un utilisateur
Users.create({
  username: "admin",
  password: await hash("secret"),
  root: "/srv/ftp",
  uid: 1000,
  gid: 1000,
});

// Démarrer le serveur
const server = new Server({ port: 21 });

for await (const conn of server) {
  conn.on("login", async ({ username, password }, resolve, reject) => {
    const user = Users.findByUsername(username);
    if (user && await verify(user.password, password)) {
      resolve({ root: user.root, uid: user.uid, gid: user.gid });
    } else {
      reject();
    }
  });
}
```

## Utilisation comme CLI

```bash
# Configurer (éditer dftps.toml)
./dftps user add admin -p secret -r /srv/ftp
./dftps serve
```

## Configuration (dftps.toml)

```toml
[addr]
port = 21

[options]
pasvUrl = "127.0.0.1"
pasvMin = 1024
pasvMax = 65535

[database]
connector = "SQLite"
filepath = "./dftps.db"
```

## Qualité

| Métrique   | Valeur       |
| ---------- | ------------ |
| Tests      | 544 passants |
| Couverture | 84.8%        |
| Score JSR  | 100%         |
| Provenance | Sigstore     |

## Téléchargements

| Plateforme          | Archive                    |
| ------------------- | -------------------------- |
| Linux x64           | `dftps-linux-x64.tar.gz`   |
| macOS Intel         | `dftps-macos-x64.tar.gz`   |
| macOS Apple Silicon | `dftps-macos-arm64.tar.gz` |
| Windows x64         | `dftps-windows-x64.zip`    |

## Liens

- **JSR** : https://jsr.io/@dftp/server
- **GitHub** : https://github.com/MNLaugh/dftps
- **Releases** : https://github.com/MNLaugh/dftps/releases
