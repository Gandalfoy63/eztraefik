# ngx_http_access_module

Source: https://nginx.org/en/docs/http/ngx_http_access_module.html (only the directives eztraefik reads).

## allow

Syntax:

            `allow
    address` |
    `CIDR` |
    `unix:` |
    `all`;

            Default:

            —

            Context:

            `http`, `server`, `location`, `limit_except`

Allows access for the specified network or address.
If the special value `unix:` is specified (1.5.1),
allows access for all UNIX-domain sockets.

Several `allow` directives can be specified on the same level.
These directives are inherited from the previous configuration level
if and only if there are no `allow` and
`deny` directives defined on the current level.

## deny

Syntax:

            `deny
    address` |
    `CIDR` |
    `unix:` |
    `all`;

            Default:

            —

            Context:

            `http`, `server`, `location`, `limit_except`

Denies access for the specified network or address.
If the special value `unix:` is specified (1.5.1),
denies access for all UNIX-domain sockets.

Several `deny` directives can be specified on the same level.
These directives are inherited from the previous configuration level
if and only if there are no `allow` and
`deny` directives defined on the current level.
