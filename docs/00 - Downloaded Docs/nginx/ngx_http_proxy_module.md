# ngx_http_proxy_module

Source: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (only the directives eztraefik reads).

## proxy_buffering

Syntax:

            `proxy_buffering on` | `off`;

            Default:

```nginx
proxy_buffering on;
```

            Context:

            `http`, `server`, `location`

Enables or disables buffering of responses from the proxied server.

When buffering is enabled, nginx receives a response from the proxied server
as soon as possible, saving it into the buffers set by the
proxy_buffer_size and proxy_buffers directives.
If the whole response does not fit into memory, a part of it can be saved
to a temporary file on the disk.
Writing to temporary files is controlled by the
proxy_max_temp_file_size and
proxy_temp_file_write_size directives.

When buffering is disabled, the response is passed to a client synchronously,
immediately as it is received.
nginx will not try to read the whole response from the proxied server.
The maximum size of the data that nginx can receive from the server
at a time is set by the proxy_buffer_size directive.

Buffering can also be enabled or disabled by passing
“`yes`” or “`no`” in the
“X-Accel-Buffering” response header field.
This capability can be disabled using the
proxy_ignore_headers directive.

## proxy_connect_timeout

Syntax:

            `proxy_connect_timeout time`;

            Default:

```nginx
proxy_connect_timeout 60s;
```

            Context:

            `http`, `server`, `location`

Defines a timeout for establishing a connection with a proxied server.
It should be noted that this timeout cannot usually exceed 75 seconds.

## proxy_hide_header

Syntax:

            `proxy_hide_header field`;

            Default:

            —

            Context:

            `http`, `server`, `location`

By default,
nginx does not pass the header fields “Date”,
“Server”, “X-Pad”, and
“X-Accel-...” from the response of a proxied
server to a client.
The `proxy_hide_header` directive sets additional fields
that will not be passed.
If, on the contrary, the passing of fields needs to be permitted,
the proxy_pass_header directive can be used.

## proxy_http_version

Syntax:

            `proxy_http_version
    1.0` | `1.1` |
    `2`;

            Default:

```nginx
proxy_http_version 1.1;
```

            Context:

            `http`, `server`, `location`

            This directive appeared in version 1.1.4.

Sets the HTTP protocol version for proxying.
Since 1.29.7, version 1.1 is used by default.
Before 1.29.7, version 1.0 was used by default.
Version 1.1 or 2 (1.29.4) is recommended for use with
keepalive
connections and
NTLM authentication.

Version 2 requires the
ngx_http_v2_module module.

## proxy_read_timeout

Syntax:

            `proxy_read_timeout time`;

            Default:

```nginx
proxy_read_timeout 60s;
```

            Context:

            `http`, `server`, `location`

Defines a timeout for reading a response from the proxied server.
The timeout is set only between two successive read operations,
not for the transmission of the whole response.
If the proxied server does not transmit anything within this time,
the connection is closed.

## proxy_redirect

Syntax:

            `proxy_redirect default`;`proxy_redirect off`;`proxy_redirect redirect` `replacement`;

            Default:

```nginx
proxy_redirect default;
```

            Context:

            `http`, `server`, `location`

Sets the text that should be changed in the “Location”
and “Refresh” header fields of a proxied server response.
Suppose a proxied server returned the header field
“`Location: http://localhost:8000/two/some/uri/`”.
The directive

```nginx
proxy_redirect http://localhost:8000/two/ http://frontend/one/;
```

will rewrite this string to
“`Location: http://frontend/one/some/uri/`”.

A server name may be omitted in the `replacement` string:

```nginx
proxy_redirect http://localhost:8000/two/ /;
```

then the primary server’s name and port, if different from 80,
will be inserted.

The default replacement specified by the `default` parameter
uses the parameters of the
location and
proxy_pass directives.
Hence, the two configurations below are equivalent:

```nginx
location /one/ {
    proxy_pass     http://upstream:port/two/;
    proxy_redirect default;
```

```nginx
location /one/ {
    proxy_pass     http://upstream:port/two/;
    proxy_redirect http://upstream:port/two/ /one/;
```

The `default` parameter is not permitted if
proxy_pass is specified using variables.

A `replacement` string can contain variables:

```nginx
proxy_redirect http://localhost:8000/ http://$host:$server_port/;
```

A `redirect` can also contain (1.1.11) variables:

```nginx
proxy_redirect http://$proxy_host:8000/ /;
```

The directive can be specified (1.1.11) using regular expressions.
In this case, `redirect` should either start with
the “`~`” symbol for a case-sensitive matching,
or with the “`~*`” symbols for case-insensitive
matching.
The regular expression can contain named and positional captures,
and `replacement` can reference them:

```nginx
proxy_redirect ~^(http://[^:]+):\d+(/.+)$ $1$2;
proxy_redirect ~*/user/([^/]+)/(.+)$      http://$1.example.com/$2;
```

Several `proxy_redirect` directives
can be specified on the same level:

```nginx
proxy_redirect default;
proxy_redirect http://localhost:8000/  /;
proxy_redirect http://www.example.com/ /;
```

If several directives can be applied to
the header fields of a proxied server response,
the first matching directive will be chosen.

The `off` parameter cancels the effect
of the `proxy_redirect` directives
inherited from the previous configuration level.

Using this directive, it is also possible to add host names to relative
redirects issued by a proxied server:

```nginx
proxy_redirect / /;
```

## proxy_request_buffering

Syntax:

            `proxy_request_buffering on` | `off`;

            Default:

```nginx
proxy_request_buffering on;
```

            Context:

            `http`, `server`, `location`

            This directive appeared in version 1.7.11.

Enables or disables buffering of a client request body.

When buffering is enabled, the entire request body is
read
from the client before sending the request to a proxied server.

When buffering is disabled, the request body is sent to the proxied server
immediately as it is received.
In this case, the request cannot be passed to the
next server
if nginx already started sending the request body.

When HTTP/1.1 chunked transfer encoding is used
to send the original request body,
the request body will be buffered regardless of the directive value unless
HTTP/1.1 or HTTP/2 is enabled for proxying.

## proxy_send_timeout

Syntax:

            `proxy_send_timeout time`;

            Default:

```nginx
proxy_send_timeout 60s;
```

            Context:

            `http`, `server`, `location`

Sets a timeout for transmitting a request to the proxied server.
The timeout is set only between two successive write operations,
not for the transmission of the whole request.
If the proxied server does not receive anything within this time,
the connection is closed.

## proxy_set_header

Syntax:

            `proxy_set_header field` `value`;

            Default:

```nginx
proxy_set_header Host $proxy_host;
```

```nginx
proxy_set_header Connection close;
```

            Context:

            `http`, `server`, `location`

Allows redefining or appending fields to the request header
passed to the proxied server.
The `value` can contain text, variables, and their combinations.
These directives are inherited from the previous configuration level
if and only if there are no `proxy_set_header` directives
defined on the current level.

By default, the header fields
“Host”
and
“Connection”
from the original request are not passed to the proxied server.
If HTTP/1.0 or HTTP/1.1 is
enabled for proxying,
these fields are redefined:

```nginx
proxy_set_header Host       $proxy_host;
proxy_set_header Connection close;
```

For HTTP/2, the
“:authority”
pseudo-header field with the
`$proxy_host`
value is sent by default,
unless it is replaced with an explicit “Host” header field.

If caching is enabled, the header fields
“If-Modified-Since”,
“If-Unmodified-Since”,
“If-None-Match”,
“If-Match”,
“Range”,
and
“If-Range”
from the original request are not passed to the proxied server.

An unchanged “Host” request header field can be passed like this:

```nginx
proxy_set_header Host       $http_host;
```

However, if this field is not present in a client request header then
nothing will be passed.
In such a case it is better to use the `$host` variable - its
value equals the server name in the “Host” request header
field or the primary server name if this field is not present:

```nginx
proxy_set_header Host       $host;
```

In addition, the server name can be passed together with the port of the
proxied server:

```nginx
proxy_set_header Host       $host:$proxy_port;
```

If the value of a header field is an empty string then this
field will not be passed to a proxied server:

```nginx
proxy_set_header Accept-Encoding "";
```

## proxy_ssl_verify

Syntax:

            `proxy_ssl_verify on` | `off`;

            Default:

```nginx
proxy_ssl_verify off;
```

            Context:

            `http`, `server`, `location`

            This directive appeared in version 1.7.0.

Enables or disables verification of the proxied HTTPS server certificate.
