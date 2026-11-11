# RockIt! documentation

Start with the [project README](../README.md) for installation and configuration.
Use the sections below for development, technical references and deployment.

| Area | Contents |
| --- | --- |
| [Frontend](frontend/README.md) | Desktop web, mobile PWA, Android, shared UI and playback adapters |
| [Backend](backend/README.md) | API layers, provider boundaries, recording metadata, storage and tests |
| [Deployment](frontend/deployment.md) | Independent desktop/mobile delivery, authentication and offline limits |
| [Containers](operations/container-deployment.md) | Docker and Compose configuration and operations |
| [Product features](features/README.md) | Downloads, social listening, accounts and discovery |
| [Project board](Kanban.md) | Planned work and changes awaiting review |

## Contributing

Read [CONTRIBUTING.md](../CONTRIBUTING.md) before submitting a change.
[Root instructions](../AGENTS.md) and the application-specific guides for
[web](../apps/web/AGENTS.md), [mobile](../apps/mobile/AGENTS.md) and
[backend](../apps/backend/AGENTS.md) define engineering conventions.

## Historical material

[Archive](archive/README.md) contains migration plans, incident investigations,
review snapshots and retired setup instructions. These preserve context; they
are not current installation instructions or evidence of production deployment.
Implementation notes distinguish controlled checks from device acceptance.

Keep new guides focused on one task. Link to the source of truth instead of
copying commands or architecture descriptions into several documents. Update
relative links when moving a guide, and keep dated evidence in the archive.

## File naming

Guide and directory names use lowercase kebab-case: `frontend/native-builds.md`,
for example. Use a specific task or subject instead of an implementation codename.
`README.md` remains the conventional directory entry point. `Kanban.md` and the
`YOUTUBE_DOWNLOADS.md` compatibility entry retain paths used by application code;
external skill source files retain their required or upstream names.
