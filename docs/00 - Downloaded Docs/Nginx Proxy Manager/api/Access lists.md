# NPM API: Access lists

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/access-lists/get.json

```json
{
  "operationId": "getAccessLists",
  "summary": "Get all access lists",
  "tags": [
    "access-lists"
  ],
  "security": [
    {
      "bearerAuth": [
        "access_lists.view"
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
          "items",
          "clients",
          "proxy_hosts"
        ]
      }
    }
  ],
  "responses": {
    "200": {
      "description": "200 response",
      "content": {
        "application/json": {
          "example": {
            "id": 1,
            "created_on": "2024-10-08T22:15:40.000Z",
            "modified_on": "2024-10-08T22:15:40.000Z",
            "owner_user_id": 1,
            "name": "test1234",
            "meta": {},
            "satisfy_any": true,
            "pass_auth": false,
            "proxy_host_count": 0
          },
          "schema": {
            "$ref": "../../../components/access-list-object.json"
          }
        }
      }
    }
  }
}
```

## components/access-list-object.json

```json
{
  "type": "object",
  "description": "Access List object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "name",
    "meta",
    "satisfy_any",
    "pass_auth",
    "proxy_host_count"
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
    "name": {
      "type": "string",
      "minLength": 1,
      "example": "My Access List"
    },
    "meta": {
      "type": "object",
      "example": {}
    },
    "satisfy_any": {
      "type": "boolean",
      "example": true
    },
    "pass_auth": {
      "type": "boolean",
      "example": false
    },
    "proxy_host_count": {
      "type": "integer",
      "minimum": 0,
      "example": 3
    }
  }
}
```
