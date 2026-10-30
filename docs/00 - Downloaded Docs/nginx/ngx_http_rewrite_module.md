# ngx_http_rewrite_module

Source: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html (only the directives eztraefik reads).

## rewrite

Syntax:

            `rewrite
    regex`
    `replacement`
    [`flag`];

            Default:

            —

            Context:

            `server`, `location`, `if`

If the specified regular expression matches a request URI, URI is changed
as specified in the `replacement` string.
The `rewrite` directives are executed sequentially
in order of their appearance in the configuration file.
It is possible to terminate further processing of the directives using flags.
If a replacement string starts with “`http://`”,
“`https://`”, or “`$scheme`”,
the processing stops and the redirect is returned to a client.

An optional `flag` parameter can be one of:

`last`

stops processing the current set of
`ngx_http_rewrite_module` directives and starts
a search for a new location matching the changed URI;

`break`

stops processing the current set of
`ngx_http_rewrite_module` directives
as with the break directive;

`redirect`

returns a temporary redirect with the 302 code;
used if a replacement string does not start with
“`http://`”, “`https://`”,
or “`$scheme`”;

`permanent`

returns a permanent redirect with the 301 code.

The full redirect URL is formed according to the
request scheme (`$scheme`) and the
server_name_in_redirect and
port_in_redirect directives.

Example:

```nginx
server {
    ...
    rewrite ^(/download/.*)/media/(.*)\..*$ $1/mp3/$2.mp3 last;
    rewrite ^(/download/.*)/audio/(.*)\..*$ $1/mp3/$2.ra  last;
    return  403;
    ...
}
```

But if these directives are put inside the “`/download/`”
location, the `last` flag should be replaced by
`break`, or otherwise nginx will make 10 cycles and
return the 500 error:

```nginx
location /download/ {
    rewrite ^(/download/.*)/media/(.*)\..*$ $1/mp3/$2.mp3 break;
    rewrite ^(/download/.*)/audio/(.*)\..*$ $1/mp3/$2.ra  break;
    return  403;
}
```

If a `replacement` string includes the new request arguments,
the previous request arguments are appended after them.
If this is undesired, putting a question mark at the end of a replacement
string avoids having them appended, for example:

```nginx
rewrite ^/users/(.*)$ /show?user=$1? last;
```

If a regular expression includes the “`}`”
or “`;`” characters, the whole expressions should be enclosed
in single or double quotes.

## return

Syntax:

            `return code` [`text`];`return code` `URL`;`return URL`;

            Default:

            —

            Context:

            `server`, `location`, `if`

Stops processing and returns the specified `code` to a client.
The non-standard code 444 closes a connection without sending
a response header.

Starting from version 0.8.42, it is possible to specify
either a redirect URL (for codes 301, 302, 303, 307, and 308)
or the response body `text` (for other codes).
A response body text and redirect URL can contain variables.
As a special case, a redirect URL can be specified as a URI
local to this server, in which case the full redirect URL
is formed according to the request scheme (`$scheme`) and the
server_name_in_redirect and
port_in_redirect directives.

In addition, a `URL` for temporary redirect with the code 302
can be specified as the sole parameter.
Such a parameter should start with the “`http://`”,
“`https://`”, or “`$scheme`” string.
A `URL` can contain variables.

Only the following codes could be returned before version 0.7.51:
204, 400, 402 — 406, 408, 410, 411, 413, 416, and 500 — 504.

The code 307 was not treated as a redirect until versions 1.1.16 and 1.0.13.

The code 308 was not treated as a redirect until version 1.13.0.

See also the error_page directive.
