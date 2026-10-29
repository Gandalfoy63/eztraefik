# NPM API: Certificates

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/nginx/certificates/get.json

```json
{
  "operationId": "getCertificates",
  "summary": "Get all certificates",
  "tags": [
    "certificates"
  ],
  "security": [
    {
      "bearerAuth": [
        "certificates.view"
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
          "owner"
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
                  "id": 4,
                  "created_on": "2024-10-09T05:31:58.000Z",
                  "modified_on": "2024-10-09T05:32:11.000Z",
                  "owner_user_id": 1,
                  "provider": "letsencrypt",
                  "nice_name": "test.example.com",
                  "domain_names": [
                    "test.example.com"
                  ],
                  "expires_on": "2025-01-07T04:34:18.000Z",
                  "meta": {
                    "dns_challenge": false
                  }
                }
              ]
            }
          },
          "schema": {
            "$ref": "../../../components/certificate-list.json"
          }
        }
      }
    }
  }
}
```

## paths/nginx/certificates/certID/download/get.json

```json
{
  "operationId": "downloadCertificate",
  "summary": "Downloads a Certificate",
  "tags": [
    "certificates"
  ],
  "security": [
    {
      "bearerAuth": [
        "certificates.manage"
      ]
    }
  ],
  "parameters": [
    {
      "in": "path",
      "name": "certID",
      "description": "Certificate ID",
      "schema": {
        "type": "integer",
        "minimum": 1
      },
      "required": true,
      "example": 1
    }
  ],
  "responses": {
    "200": {
      "description": "200 response",
      "content": {
        "application/zip": {
          "schema": {
            "type": "string",
            "format": "binary"
          }
        }
      }
    }
  }
}
```

## components/certificate-object.json

```json
{
  "type": "object",
  "description": "Certificate object",
  "required": [
    "id",
    "created_on",
    "modified_on",
    "owner_user_id",
    "provider",
    "nice_name",
    "domain_names",
    "expires_on",
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
    "provider": {
      "$ref": "../common.json#/properties/ssl_provider"
    },
    "nice_name": {
      "type": "string",
      "description": "Nice Name for the custom certificate",
      "example": "My Custom Cert"
    },
    "domain_names": {
      "description": "Domain Names separated by a comma",
      "type": "array",
      "maxItems": 100,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "pattern": "^[^&| @!#%^();:/\\\\}{=+?<>,~`'\"]+$"
      },
      "example": [
        "example.com",
        "www.example.com"
      ]
    },
    "expires_on": {
      "description": "Date and time of expiration",
      "readOnly": true,
      "type": "string",
      "example": "2025-10-28T04:17:54.000Z"
    },
    "owner": {
      "$ref": "./user-object.json"
    },
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "certificate": {
          "type": "string",
          "minLength": 1
        },
        "certificate_key": {
          "type": "string",
          "minLength": 1
        },
        "dns_challenge": {
          "type": "boolean"
        },
        "dns_provider_credentials": {
          "type": "string"
        },
        "dns_provider": {
          "type": "string"
        },
        "letsencrypt_certificate": {
          "type": "object"
        },
        "propagation_seconds": {
          "type": "integer",
          "minimum": 0
        },
        "key_type": {
          "type": "string",
          "enum": [
            "rsa",
            "ecdsa"
          ],
          "default": "rsa"
        }
      },
      "example": {
        "dns_challenge": false
      }
    }
  }
}
```
