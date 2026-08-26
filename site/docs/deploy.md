# Deploying without being at the computer

Both halves of shipping — Firebase and the App Store — default to credentials
that expire on a timer and demand a browser or a 2FA dialog. Neither one can be
answered by a session running unattended. This is how the machine is set up so
that they can be.

The Firebase half is machine-wide: one `fb` command that works in every repo,
not a script per project. The setup is recorded here because eduthart is where
it was written; it is not eduthart-specific.

## Firebase

```bash
fb deploy --only storage
```

`fb` (at `~/.local/bin/fb`) takes the same arguments as `firebase` and
authenticates as that project's `firebase-deployer` service account instead of
whoever is signed in. It reads the project from the nearest `.firebaserc` —
searching upward from the current directory, then one level down, so it works
from a repo root whose Firebase config lives in `site/` or `firebase/` — and
loads the key at `~/.config/firebase/<project-id>.json`.
`GOOGLE_APPLICATION_CREDENTIALS` overrides the key path;
`FIREBASE_TOOLS_SPEC` overrides the pinned `firebase-tools@15`.

Why the interactive login is not durable: `hendecalabs.com` is a Workspace
domain, and Google Cloud session control expires OAuth sessions on a timer
regardless of the refresh token. That is the `Authentication Error: Your
credentials are no longer valid` you keep meeting.

**Setting `GOOGLE_APPLICATION_CREDENTIALS` on its own does not fix it**, which
is worth knowing before you conclude the key is broken. `requireAuth` prefers
the signed-in user whenever the config store holds a refresh token, and it
tests only that the token _is there_, not that it still works — so once the
session is expired the CLI still picks that dead login and fails at refresh
time, never falling through to the service account. `fb` works by pointing
`XDG_CONFIG_HOME` at an empty directory for the length of one command, so there
is no signed-in user to prefer. Your own `firebase login` is untouched.

Don't reach for `firebase login:ci` — deprecated as of firebase-tools 15, and
bound by the same session policy anyway.

### Per-project setup

Once per Firebase project, from a machine with a live `gcloud auth login`:

```bash
gcloud iam service-accounts create firebase-deployer --project PROJECT_ID --display-name "Firebase deployer"
```

Grant it what `firebase deploy` touches. `roles/firebase.admin` alone covers
rules, indexes, hosting and storage; the rest are what deploying functions
needs, because the build lands in Artifact Registry and runs on Cloud Run, and
scheduled or event-driven functions provision Cloud Scheduler and Eventarc:

```bash
for role in firebase.admin cloudfunctions.admin run.admin artifactregistry.admin cloudscheduler.admin eventarc.admin iam.serviceAccountUser serviceusage.serviceUsageAdmin; do gcloud projects add-iam-policy-binding PROJECT_ID --member serviceAccount:firebase-deployer@PROJECT_ID.iam.gserviceaccount.com --role roles/$role --condition=None --quiet; done
```

### Per-machine setup

Each machine gets its own key, so one laptop can be revoked without touching
the other. The key does not expire.

```bash
gcloud iam service-accounts keys create ~/.config/firebase/PROJECT_ID.json --iam-account firebase-deployer@PROJECT_ID.iam.gserviceaccount.com && chmod 600 ~/.config/firebase/PROJECT_ID.json
```

Verify with something read-only:

```bash
fb --project PROJECT_ID apps:list
```

Projects set up this way: `eduthart-5dd68`, `memdojo-d62de`,
`stepslayer-32677`. What each repo actually deploys:

| Repo         | Config in           | Deploys                             |
| ------------ | ------------------- | ----------------------------------- |
| `eduthart`   | `site/`             | storage rules only — the site is on Vercel |
| `memdojo`    | repo root           | functions, firestore rules/indexes, storage |
| `stepslayer` | `firebase/`         | firestore rules and indexes         |

## App Store

Both `memdojo/ios/scripts/deploy.sh` and `stepslayer/Scripts/release.sh` sign
and upload with an App Store Connect API key rather than the Xcode account,
which is what makes them runnable from a remote session — the Xcode account's
session lapses and asks for a 2FA code in a dialog box nobody is there to
answer.

Three things, once per machine:

- **The `.p8`** at `~/.appstoreconnect/private_keys/AuthKey_<key id>.p8`. That
  path is where both `xcodebuild` and `altool` look. It is downloadable exactly
  once from App Store Connect, so on a second machine it is copied across
  rather than re-downloaded.
- **The key and issuer IDs** in `~/.config/appstoreconnect/env`, which
  `~/.zshrc` sources, so every repo sees `ASC_KEY_ID` / `ASC_ISSUER_ID` without
  a per-repo `ios/.env`.
- **The keychain's partition list**, or `codesign` opens a dialog nobody is
  there to dismiss. It asks for your login password:

  ```bash
  security set-key-partition-list -S apple-tool:,apple:,codesign: -s login.keychain-db
  ```

The key must be a **Team Key** with **Admin** or **App Manager** access _and_
**Access to Cloud Managed Distribution Certificate** ticked — that last one is a
separate per-key permission only the Account Holder can grant, and without it
export fails with `Cloud signing permission error` even though the same key
reads every other endpoint fine. It is set when the key is created; a key that
lacks it has to be replaced.

The `Apple Distribution: Hendeca Labs LLC (H5KADU9939)` certificate is already
in this machine's keychain, which is the other half of what signing needs.
