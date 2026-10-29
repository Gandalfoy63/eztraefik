# Docker Engine API v1.47: System

Source: https://docs.docker.com/reference/api/engine/version/v1.47/

## GET /_ping

Ping

This is a dummy endpoint you can use to test if the server is accessible.

Responses:

- `200` no error
- `500` server error (schema `ErrorResponse`)

## HEAD /_ping

Ping

This is a dummy endpoint you can use to test if the server is accessible.

Responses:

- `200` no error
- `500` server error (schema `ErrorResponse`)

## GET /version

Get version

Returns the version of Docker that is running and various information about the system that Docker is running on.

Responses:

- `200` no error (schema `SystemVersion`)
- `500` server error (schema `ErrorResponse`)

## GET /info

Get system information



Responses:

- `200` No error (schema `SystemInfo`)
- `500` Server error (schema `ErrorResponse`)

