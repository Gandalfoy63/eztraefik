---
title: Onboarding
tags: [feature, onboarding]
version: 0.1.0+1
status: planned
related: ["[[03 - Features/Traefik Container|Traefik Container]]", "[[03 - Features/Entrypoints|Entrypoints]]", "[[03 - Features/Domains|Domains]]", "[[03 - Features/Certificates|Certificates]]", "[[03 - Features/Auth|Auth]]", "[[03 - Features/Docker|Docker]]", "[[03 - Features/Features Index|Features Index]]", "[[01 - Vision/Plan|Plan]]", "[[05 - UI-UX/Preview|Preview]]"]
---

# Onboarding

Status: planned. Not implemented yet.

First-run wizard shown until finished or skipped. It can be reopened from Settings.

## Steps
1. **Welcome**: what eztraefik will do on this host, in three lines.
2. **Docker**: check the Docker socket is reachable, show the Docker version. Clear fix instructions if not.
3. **Traefik**: detect an existing Traefik container. Options: create a new one (default) or adopt the detected one. Pick the image tag.
4. **Ports**: entrypoints `web` on 80 and `websecure` on 443, toggle "Redirect HTTP to HTTPS". Add custom ports later in Entrypoints. See [[00 - Downloaded Docs/Traefik/reference/install-configuration/entrypoints|Entrypoints]].
5. **First domain**: enter a domain, eztraefik checks it resolves to this host.
6. **Certificates**: Let's Encrypt with HTTP challenge (default), DNS challenge (pick provider, enter credentials), or none for now. See [[00 - Downloaded Docs/Traefik/reference/install-configuration/tls/certificate-resolvers/acme|ACME]].
7. **Admin account**: username and password for eztraefik.
8. **Review**: summary plus the generated Traefik flags, then "Create Traefik".

## UX rules
- Progress indicator with step names, Back and Skip on every step (skip sets safe defaults).
- Each step validates inline before Next is enabled.
- Final step shows progress while the container is pulled and started, then lands on Overview.

## Related
- [[03 - Features/Traefik Container|Traefik Container]]
- [[03 - Features/Entrypoints|Entrypoints]]
- [[03 - Features/Domains|Domains]]
- [[03 - Features/Certificates|Certificates]]
- [[03 - Features/Auth|Auth]]
- [[03 - Features/Docker|Docker]]
- [[03 - Features/Features Index|Features Index]]
- [[01 - Vision/Plan|Plan]]
- [[05 - UI-UX/Preview|Preview]]
