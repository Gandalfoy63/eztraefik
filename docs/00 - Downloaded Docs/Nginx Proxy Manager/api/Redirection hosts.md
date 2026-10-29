# NPM API: Redirection hosts

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/redirection-hosts/get.json

```json
{
  "operationId": "getRedirectionHosts",
  "summary": "Get all Redirection hosts",
  "tags": [
    "redirection-hosts"
  ],
  "security": [
    {
      "bearerAuth": [
        "redirection_hosts.view"
      ]
    }
  ],
  "parameters": [
    {
      "in": "query",
      "name": "expand",
      "description": "Expansions",
      "schema": {
        "type": "string",
        "enum": [
          "owner",
          "certificate"
        ]
      }
    }
  ],
  "responses": {
    "200": {
      "description": "200 response",
      "content": {
        "application/json": {
          "examples": {
            "default": {
              "value": [
                {
                  "id": 1,
                  "created_on": "2024-10-09T01:13:12.000Z",
                  "modified_on": "2024-10-09T01:13:13.000Z",
                  "owner_user_id": 1,
                  "domain_names": [
                    "test.example.com"
                  ],
                  "forward_domain_name": "something-else.com",
                  "preserve_path": false,
                  "certificate_id": 0,
                  "ssl_forced": false,
                  "block_exploits": false,
                  "advanced_config": "",
                  "meta": {
                    "nginx_online": true,
                    "nginx_err": null
                  },
                  "http2_support": false,
                  "enabled": true,
                  "hsts_enabled": false,
                  "hsts_subdomains": false,
                  "forward_scheme": "http",
                  "forward_http_code": 301
                }
              ]
            }
          },
          "schema": {
            "$ref": "../../../components/redirection-host-list.json"
          }
        }
      }
    }
  }
}
```

## components/redirection-host-object.json

```json
{
  "type": "object",
  "description": "Redirection Host object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "domain_names",
    "forward_http_code",
    "forward_scheme",
    "forward_domain_name",
    "preserve_path",
    "certificate_id",
    "ssl_forced",
    "hsts_enabled",
    "hsts_subdomains",
    "http2_support",
    "block_exploits",
    "advanced_config",
    "enabled",
    "meta"
  ],
  "additionalProperties": false,
  "properties": {
    "id": {
      "$ref": "../common.json#/properties/id"
    },
    "created_on": {
      "$ref": "../common.json#/properties/created_on"
    },
    "modified_on": {
      "$ref": "../common.json#/properties/modified_on"
    },
    "owner_user_id": {
      "$ref": "../common.json#/properties/user_id"
    },
    "domain_names": {
      "$ref": "../common.json#/properties/domain_names"
    },
    "forward_http_code": {
      "description": "Redirect HTTP Status Code",
      "type": "integer",
      "minimum": 300,
      "maximum": 308,
      "example": 302
    },
    "forward_scheme": {
      "type": "string",
      "enum": [
        "auto",
        "http",
        "https"
      ],
      "example": "http"
    },
    "forward_domain_name": {
      "description": "Domain Name",
      "type": "string",
      "pattern": "^(?:[^.*]+\\.?)+[^.]$",
      "example": "jc21.com"
    },
    "preserve_path": {
      "description": "Should the path be preserved",
      "type": "boolean",
      "example": true
    },
    "certificate_id": {
      "$ref": "../common.json#/properties/certificate_id"
    },
    "ssl_forced": {
      "$ref": "../common.json#/properties/ssl_forced"
    },
    "hsts_enabled": {
      "$ref": "../common.json#/properties/hsts_enabled"
    },
    "hsts_subdomains": {
      "$ref": "../common.json#/properties/hsts_subdomains"
    },
    "http2_support": {
      "$ref": "../common.json#/properties/http2_support"
    },
    "block_exploits": {
      "$ref": "../common.json#/properties/block_exploits"
    },
    "advanced_config": {
      "type": "string",
      "example": ""
    },
    "enabled": {
      "$ref": "../common.json#/properties/enabled"
    },
    "meta": {
      "type": "object",
      "example": {
        "nginx_online": true,
        "nginx_err": null
      }
    },
    "certificate": {
      "oneOf": [
        {
          "type": "null",
          "example": null
        },
        {
          "$ref": "./certificate-object.json"
        }
      ],
      "example": null
    },
    "owner": {
      "$ref": "./user-object.json"
    }
  }
}
```
