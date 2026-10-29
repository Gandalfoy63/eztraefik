---
title: Docker Hub Page
tags: [deployment, docker, brand]
version: 1.2.4+13
related: ["[[08 - Deployment/Docker Image|Docker Image]]", "[[05 - UI-UX/Logo|Logo]]", "[[99 - Changelog/1.2.2+10|1.2.2+10]]", "[[04 - Architecture/Code Map|Code Map]]", "[[99 - Changelog/1.2.3+11|1.2.3+11]]"]
---

# Docker Hub Page

The repository page **[gandasdevstudio/eztraefik](https://hub.docker.com/r/gandasdevstudio/eztraefik)**: its short description and overview come from this repository.

| Part | Source | How it gets there |
|---|---|---|
| Short description (max 100 characters) | [marketing/dockerhub/description.txt](../../marketing/dockerhub/description.txt) | `publish.py` |
| Overview | [marketing/dockerhub/overview.template.md](../../marketing/dockerhub/overview.template.md) | `publish.py` |
| Logo at the top of the overview | `marketing/logo/final/png/lockup/lockup-light-256h.png` | linked by URL from the public GitHub repository |
| Avatar next to the repository name | `marketing/logo/final/web/dockerhub-avatar-1024.png` | your account avatar (Docker Hub has no per-repository logo for personal accounts); set by the owner |

## Updating
```bash
DOCKERHUB_USERNAME=gandasdevstudio DOCKERHUB_TOKEN=<personal access token, Read & Write> \
IMAGE_BASE_URL=https://raw.githubusercontent.com/<user>/eztraefik/main/marketing/logo/final \
python3 marketing/dockerhub/publish.py
```
`--dry-run` prints the overview without sending it. The script signs in to `https://hub.docker.com/v2/users/login` with the token and sends a `PATCH` to `/v2/repositories/<repo>/` ([publish.py](../../marketing/dockerhub/publish.py)). The token is only read from the environment, never stored.

Without `IMAGE_BASE_URL` the overview starts with the name as a heading. The logo is the PNG because `raw.githubusercontent.com` serves SVG as `text/plain`, which browsers refuse in `<img>`.

## State (1.2.4+13)
- Description and overview are live, the overview opens with the logo (`IMAGE_BASE_URL=https://raw.githubusercontent.com/Gandalfoy63/eztraefik/main/marketing/logo/final`) and links to the source.
- Source: **[github.com/Gandalfoy63/eztraefik](https://github.com/Gandalfoy63/eztraefik)**, public, MIT.
- Image tags `1.2.1`, `1.2`, `latest` carry the new logo in the app.
- Still for the owner: the account avatar (`marketing/logo/final/web/dockerhub-avatar-1024.png`).

- [[04 - Architecture/Code Map|Code Map]]
- [[99 - Changelog/1.2.3+11|1.2.3+11]]
