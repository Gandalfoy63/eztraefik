# NPM API: 404 hosts

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/dead-hosts/get.json

```json
{
  "operationId": "getDeadHosts",
  "summary": "Get all 404 hosts",
  "tags": [
    "404-hosts"
  ],
  "security": [
    {
      "bearerAuth": [
        "dead_hosts.view"
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
                  "created_on": "2024-10-09T01:38:52.000Z",
                  "modified_on": "2024-10-09T01:38:52.000Z",
                  "owner_user_id": 1,
                  "domain_names": [
                    "test.example.com"
                  ],
                  "certificate_id": 0,
                  "ssl_forced": false,
                  "advanced_config": "",
                  "meta": {
                    "nginx_online": true,
                    "nginx_err": null
                  },
                  "http2_support": false,
                  "enabled": true,
                  "hsts_enabled": false,
                  "hsts_subdomains": false
                }
              ]
            }
          },
          "schema": {
            "$ref": "../../../components/dead-host-list.json"
          }
        }
      }
    }
  }
}
```

## components/dead-host-object.json

```json
{
  "type": "object",
  "description": "404 Host object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "domain_names",
    "certificate_id",
    "ssl_forced",
    "hsts_enabled",
    "hsts_subdomains",
    "http2_support",
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
    "advanced_config": {
      "type": "string",
      "example": ""
    },
    "enabled": {
      "$ref": "../common.json#/properties/enabled"
    },
    "meta": {
      "type": "object",
      "example": {}
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
