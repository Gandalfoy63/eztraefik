# ngx_http_headers_module

Source: https://nginx.org/en/docs/http/ngx_http_headers_module.html (only the directives eztraefik reads).

## add_header

Syntax:

            `add_header
name` `value`
[`always`];

            Default:

            —

            Context:

            `http`, `server`, `location`, `if in location`

Adds the specified field to a response header provided that
the response code equals 200, 201 (1.3.10), 204, 206, 301, 302, 303, 304,
307 (1.1.16, 1.0.13), or 308 (1.13.0).
Parameter value can contain variables.

There could be several `add_header` directives.
These directives are inherited from the previous configuration level
if and only if there are no `add_header` directives
defined on the current level.
Inheritance rules can be redefined with the
add_header_inherit directive (1.29.3).

If the `always` parameter is specified (1.7.5),
the header field will be added regardless of the response code.
