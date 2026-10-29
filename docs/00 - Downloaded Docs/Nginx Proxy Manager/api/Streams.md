# NPM API: Streams

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/streams/get.json

```json
{
  "operationId": "getStreams",
  "summary": "Get all streams",
  "tags": [
    "streams"
  ],
  "security": [
    {
      "bearerAuth": [
        "streams.view"
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
                  "created_on": "2024-10-09T02:33:45.000Z",
                  "modified_on": "2024-10-09T02:33:45.000Z",
                  "owner_user_id": 1,
                  "incoming_port": 9090,
                  "forwarding_host": "router.internal",
                  "forwarding_port": 80,
                  "tcp_forwarding": true,
                  "udp_forwarding": false,
                  "meta": {
                    "nginx_online": true,
                    "nginx_err": null
                  },
                  "enabled": true,
                  "certificate_id": 0
                }
              ]
            }
          },
          "schema": {
            "$ref": "../../../components/stream-list.json"
          }
        }
      }
    }
  }
}
```

## components/stream-object.json

```json
{
  "type": "object",
  "description": "Stream object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "incoming_port",
    "forwarding_host",
    "forwarding_port",
    "tcp_forwarding",
    "udp_forwarding",
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
    "incoming_port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "example": 9090
    },
    "forwarding_host": {
      "anyOf": [
        {
          "description": "Domain Name",
          "type": "string",
          "pattern": "^(?:[^.*]+\\.?)+[^.]$",
          "example": "example.com"
        },
        {
          "type": "string",
          "format": "^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$"
        },
        {
          "type": "string",
          "format": "ipv6"
        }
      ],
      "example": "example.com"
    },
    "forwarding_port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "example": 80
    },
    "tcp_forwarding": {
      "type": "boolean",
      "example": true
    },
    "udp_forwarding": {
      "type": "boolean",
      "example": false
    },
    "enabled": {
      "$ref": "../common.json#/properties/enabled"
    },
    "certificate_id": {
      "$ref": "../common.json#/properties/certificate_id"
    },
    "meta": {
      "type": "object",
      "example": {}
    },
    "certificate": {
      "oneOf": [
        {
          "type": "null"
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
