# Common Hosts File Entries

Some lines in your system `hosts` file are not manually added by you. They are often created or managed by software installed on your machine.

Common sources include:

- Container tools
- Local Kubernetes tooling
- VPN clients
- Local web development tools
- Security or endpoint software

These entries are usually used to make local networking features work consistently. If you remove them, related tooling may stop working until the program restores them.

## [Docker Desktop](https://www.docker.com/) Entries

If Docker Desktop is installed, you may see entries like:

```txt
192.168.0.14  host.docker.internal
192.168.0.14  gateway.docker.internal
127.0.0.1     kubernetes.docker.internal
```

What they are for:

- `host.docker.internal`: Lets containers reach services running on your host machine.
- `gateway.docker.internal`: Resolves to Docker's gateway from container networking context.
- `kubernetes.docker.internal`: Used by Docker Desktop Kubernetes integration (often mapped to localhost).

Notes:

- Docker Desktop may update these entries automatically.
- IP values can differ by machine, network, and Docker setup.
- These are hostname-to-IP mappings only; `hosts` entries do not include URL paths or protocols.

## [DDEV](https://ddev.com/) Entries

`DDEV` (a local web development tool) may also create `hosts` entries in some setups, especially when a local DNS resolver is not being used.

Typical patterns:

```txt
127.0.0.1  myproject.ddev.site
127.0.0.1  www.myproject.ddev.site
```

What they are for:

- Map project domains to your local machine so the DDEV router can serve the right site.
- Support browser access to each local project by name instead of raw ports/IPs.

Notes:

- Exact domains depend on your project name and DDEV configuration.
- On some systems, DDEV relies primarily on DNS and may not need persistent `hosts` entries.
