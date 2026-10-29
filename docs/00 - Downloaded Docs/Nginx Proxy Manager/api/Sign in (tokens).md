# NPM API: Sign in (tokens)

Source: `backend/schema/` in the Nginx Proxy Manager repository, tag v2.15.1 (OpenAPI 3 schema the API validates against).

## paths/tokens/post.json

```json
{
  "operationId": "requestToken",
  "summary": "Request a new access token from credentials",
  "tags": [
    "tokens"
  ],
  "requestBody": {
    "description": "Credentials Payload",
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "additionalProperties": false,
          "properties": {
            "identity": {
              "minLength": 1,
              "type": "string",
              "example": "me@example.com"
            },
            "scope": {
              "minLength": 1,
              "type": "string",
              "enum": [
                "user"
              ],
              "example": "user"
            },
            "secret": {
              "minLength": 1,
              "type": "string",
              "example": "bigredhorsebanana"
            }
          },
          "required": [
            "identity",
            "secret"
          ],
          "type": "object"
        },
        "example": {
          "identity": "me@example.com",
          "secret": "bigredhorsebanana"
        }
      }
    }
  },
  "responses": {
    "200": {
      "content": {
        "application/json": {
          "examples": {
            "default": {
              "value": {
                "expires": "2025-02-04T20:40:46.340Z",
                "token": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4"
              }
            }
          },
          "schema": {
            "oneOf": [
              {
                "$ref": "../../components/token-object.json"
              },
              {
                "$ref": "../../components/token-challenge.json"
              }
            ]
          }
        }
      },
      "description": "200 response"
    }
  }
}
```

## paths/tokens/2fa/post.json

```json
{
  "operationId": "loginWith2FA",
  "summary": "Verify 2FA code and get full token",
  "tags": [
    "tokens"
  ],
  "requestBody": {
    "description": "2fa Challenge Payload",
    "required": true,
    "content": {
      "application/json": {
        "schema": {
          "additionalProperties": false,
          "properties": {
            "challenge_token": {
              "minLength": 1,
              "type": "string",
              "example": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4"
            },
            "code": {
              "minLength": 6,
              "maxLength": 8,
              "type": "string",
              "example": "012345"
            }
          },
          "required": [
            "challenge_token",
            "code"
          ],
          "type": "object"
        },
        "example": {
          "challenge_token": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4",
          "code": "012345"
        }
      }
    }
  },
  "responses": {
    "200": {
      "content": {
        "application/json": {
          "examples": {
            "default": {
              "value": {
                "expires": "2025-02-04T20:40:46.340Z",
                "token": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4"
              }
            }
          },
          "schema": {
            "$ref": "../../../components/token-object.json"
          }
        }
      },
      "description": "200 response"
    }
  }
}
```

## components/token-object.json

```json
{
  "type": "object",
  "description": "Token object",
  "required": [
    "expires",
    "token"
  ],
  "additionalProperties": false,
  "properties": {
    "expires": {
      "description": "Token Expiry ISO Time String",
      "example": "2025-02-04T20:40:46.340Z",
      "type": "string"
    },
    "token": {
      "description": "JWT Token",
      "example": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4",
      "type": "string"
    }
  }
}
```

## components/token-challenge.json

```json
{
  "type": "object",
  "description": "Token object",
  "required": [
    "requires_2fa",
    "challenge_token"
  ],
  "additionalProperties": false,
  "properties": {
    "requires_2fa": {
      "description": "Whether this token request requires two-factor authentication",
      "example": true,
      "type": "boolean"
    },
    "challenge_token": {
      "description": "Challenge Token used in subsequent 2FA verification",
      "example": "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.ey...xaHKYr3Kk6MvkUjcC4",
      "type": "string"
    }
  }
}
```
