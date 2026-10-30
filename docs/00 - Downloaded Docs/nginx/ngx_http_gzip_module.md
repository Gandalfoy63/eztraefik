# ngx_http_gzip_module

Source: https://nginx.org/en/docs/http/ngx_http_gzip_module.html (only the directives eztraefik reads).

## gzip

Syntax:

            `gzip on` | `off`;

            Default:

```nginx
gzip off;
```

            Context:

            `http`, `server`, `location`, `if in location`

Enables or disables gzipping of responses.
