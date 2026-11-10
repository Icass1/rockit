# Security Policy

This policy covers security reports for **RockIt!**, including its backend API,
web/PWA, native mobile app, shared packages, and repository deployment tooling.

## Reporting a vulnerability

**Do not disclose vulnerabilities in public issues, pull requests, or comments.**

Use the repository's [Security advisories page](https://github.com/Icass1/rockit/security/advisories)
and select **Report a vulnerability** if GitHub private vulnerability reporting is
enabled. Reports submitted through that feature are private to the reporter and
the maintainers handling the advisory.

If that button is unavailable, open a minimal issue titled **Private security
contact requested**. Include no vulnerability details, proof of concept,
credentials, affected instance addresses, or personal data. Ask a maintainer to
enable private reporting or arrange a private channel before sharing the report.
There is currently no dedicated security email address documented by this project.

Ordinary bugs and feature requests belong in the
[issue tracker](https://github.com/Icass1/rockit/issues), following
[CONTRIBUTING.md](CONTRIBUTING.md).

## What to include privately

Provide enough information to reproduce and assess the issue:

- A short description, potential impact, and affected component.
- The release, commit SHA, or container image tag/digest you tested.
- Relevant deployment details, such as browser/OS, authentication state, and
  reverse proxy or storage configuration, with secrets removed.
- Reproduction steps or a minimal proof of concept using test accounts and data.
- Whether exploitation needs an account, administrator access, user interaction,
  or a particular configuration.
- Redacted logs, request/response examples, and a suggested fix if available.

Never submit live session cookies, JWTs, API keys, passwords, S3 credentials,
signed media URLs, or other users' music and personal data. If a credential has
already been exposed, revoke or rotate it and describe the exposure without
repeating its value.

## Versions and fixes

Security work targets the current code on `main`. Reports against `develop` are
also welcome, but that branch contains work in progress and is not a stable
release. There is no published long-term-support or guaranteed backport schedule;
maintainers will assess older releases individually. Keep deployments updated
with the security fixes applicable to them.

A public source repository, a passing CI run, or an MIT license is not a security
audit or a guarantee that a deployment is secure.

## Scope and responsible testing

Relevant issues include authentication or authorization bypasses, access to
another user's private resources, token or credential exposure, injection, XSS,
SSRF, unsafe uploads or path handling, and dependency vulnerabilities with a
reproducible impact on RockIt!.

Test only systems and accounts you own or have explicit permission to assess.
Use an isolated instance and synthetic data where possible. Avoid disrupting
service, accessing other users' data, or testing third-party music services
without their authorization. A defect in an upstream project should also be
reported through that project's security process.

## Coordinated disclosure

Maintainers will assess reports and may request additional reproduction details.
When a fix is prepared, disclosure and reporter credit can be coordinated through
the private channel. State whether you want attribution or prefer anonymity.
Avoid publishing exploit details before that coordination is complete.

This is a community-maintained project with no published response-time commitment
or paid bug-bounty program.
