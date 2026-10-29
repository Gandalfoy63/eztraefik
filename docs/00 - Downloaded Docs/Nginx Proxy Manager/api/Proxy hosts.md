# NPM API: Proxy hosts

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/proxy-hosts/get.json

```json
{
  "operationId": "getProxyHosts",
  "summary": "Get all proxy hosts",
  "tags": [
    "proxy-hosts"
  ],
  "security": [
    {
      "bearerAuth": [
        "proxy_hosts.view"
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
          "access_list",
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
                  "created_on": "2025-10-28T01:10:26.000Z",
                  "modified_on": "2025-10-28T04:07:16.000Z",
                  "owner_user_id": 1,
                  "domain_names": [
                    "test.jc21com"
                  ],
                  "forward_host": "127.0.0.1",
                  "forward_port": 8081,
                  "access_list_id": 1,
                  "certificate_id": 1,
                  "ssl_forced": false,
                  "caching_enabled": false,
                  "block_exploits": false,
                  "advanced_config": "",
                  "meta": {
                    "nginx_online": true,
                    "nginx_err": null
                  },
                  "allow_websocket_upgrade": false,
                  "http2_support": false,
                  "forward_scheme": "http",
                  "enabled": true,
                  "locations": [],
                  "hsts_enabled": false,
                  "hsts_subdomains": false,
                  "trust_forwarded_proto": false
                }
              ]
            }
          },
          "schema": {
            "$ref": "../../../components/proxy-host-list.json"
          }
        }
      }
    }
  }
}
```

## components/proxy-host-object.json

```json
{
  "type": "object",
  "description": "Proxy Host object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "domain_names",
    "forward_host",
    "forward_port",
    "access_list_id",
    "certificate_id",
    "ssl_forced",
    "caching_enabled",
    "block_exploits",
    "advanced_config",
    "meta",
    "allow_websocket_upgrade",
    "http2_support",
    "forward_scheme",
    "enabled",
    "locations",
    "hsts_enabled",
    "hsts_subdomains",
    "trust_forwarded_proto"
  ],
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
    "forward_host": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "example": "127.0.0.1"
    },
    "forward_port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "example": 8080
    },
    "access_list_id": {
      "$ref": "../common.json#/properties/access_list_id"
    },
    "certificate_id": {
      "$ref": "../common.json#/properties/certificate_id"
    },
    "ssl_forced": {
      "$ref": "../common.json#/properties/ssl_forced"
    },
    "caching_enabled": {
      "$ref": "../common.json#/properties/caching_enabled"
    },
    "block_exploits": {
      "$ref": "../common.json#/properties/block_exploits"
    },
    "advanced_config": {
      "type": "string",
      "example": ""
    },
    "meta": {
      "type": "object",
      "example": {
        "nginx_online": true,
        "nginx_err": null
      }
    },
    "allow_websocket_upgrade": {
      "description": "Allow Websocket Upgrade for all paths",
      "type": "boolean",
      "example": true
    },
    "http2_support": {
      "$ref": "../common.json#/properties/http2_support"
    },
    "forward_scheme": {
      "type": "string",
      "enum": [
        "http",
        "https"
      ],
      "example": "http"
    },
    "enabled": {
      "$ref": "../common.json#/properties/enabled"
    },
    "locations": {
      "type": "array",
      "minItems": 0,
      "items": {
        "type": "object",
        "required": [
          "forward_scheme",
          "forward_host",
          "forward_port",
          "path"
        ],
        "additionalProperties": false,
        "properties": {
          "id": {
            "type": [
              "integer",
              "null"
            ]
          },
          "path": {
            "type": "string",
            "minLength": 1
          },
          "forward_scheme": {
            "$ref": "#/properties/forward_scheme"
          },
          "forward_host": {
            "$ref": "#/properties/forward_host"
          },
          "forward_port": {
            "$ref": "#/properties/forward_port"
          },
          "forward_path": {
            "type": "string"
          },
          "advanced_config": {
            "type": "string"
          }
        }
      },
      "example": [
        {
          "path": "/app",
          "forward_scheme": "http",
          "forward_host": "example.com",
          "forward_port": 80
        }
      ]
    },
    "hsts_enabled": {
      "$ref": "../common.json#/properties/hsts_enabled"
    },
    "hsts_subdomains": {
      "$ref": "../common.json#/properties/hsts_subdomains"
    },
    "trust_forwarded_proto": {
      "type": "boolean",
      "description": "Trust the forwarded headers",
      "example": false
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
    },
    "access_list": {
      "oneOf": [
        {
          "type": "null",
          "example": null
        },
        {
          "$ref": "./access-list-object.json"
        }
      ],
      "example": null
    }
  }
}
```

## components/proxy-host-list.json

```json
{
  "type": "array",
  "description": "Proxy Hosts list",
  "items": {
    "$ref": "./proxy-host-object.json"
  }
}
```
