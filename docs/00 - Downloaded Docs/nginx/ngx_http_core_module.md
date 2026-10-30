# ngx_http_core_module

Source: https://nginx.org/en/docs/http/ngx_http_core_module.html (only the directives eztraefik reads).

## client_max_body_size

Syntax:

            `client_max_body_size size`;

            Default:

```nginx
client_max_body_size 1m;
```

            Context:

            `http`, `server`, `location`

Sets the maximum allowed size of the client request body.
If the size in a request exceeds the configured value, the
413 (Request Entity Too Large)
error is returned to the client.
Please be aware that
browsers cannot correctly display
this error.
Setting `size` to 0 disables checking of client
request body size.
