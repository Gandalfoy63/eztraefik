# Docker Engine API v1.47: Network

Source: https://docs.docker.com/reference/api/engine/version/v1.47/

## GET /networks

List networks

Returns a list of networks. For details on the format, see the
[network inspect endpoint](#operation/NetworkInspect).

Note that it uses a different, smaller representation of a network than
inspecting a single network. For example, the list of containers attached
to the network is not propagated in API versions 1.28 and up.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| filters | query | string |  | JSON encoded value of the filters (a `map[string][]string`) to process on the networks list. Available filters: - `dangling=<boolean>` When set to `true` (or `1`), returns all networks that are not in use by a container. When set to `false` (or `0`), only networks that are in use by one or more containers are returned. - `driver=<driver-name>` Matches a network's driver. - `id=<network-id>` Matches all or part of a network ID. - `label=<key>` or `label=<key>=<value>` of a network label. - `name=<network-name>` Matches all or part of a network name. - `scope=["swarm"\|"global"\|"local"]` Filters networks by scope (`swarm`, `global`, or `local`). - `type=["custom"\|"builtin"]` Filters networks by type. The `custom` keyword returns all user-defined networks. |

Responses:

- `200` No error
- `500` Server error (schema `ErrorResponse`)

## GET /networks/{id}

Inspect a network



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | Network ID or name |
| verbose | query | boolean |  | Detailed inspect output for troubleshooting |
| scope | query | string |  | Filter the network by scope (swarm, global, or local) |

Responses:

- `200` No error (schema `Network`)
- `404` Network not found (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

## DELETE /networks/{id}

Remove a network



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | Network ID or name |

Responses:

- `204` No error
- `403` operation not supported for pre-defined networks (schema `ErrorResponse`)
- `404` no such network (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

## POST /networks/create

Create a network



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| networkConfig | body | object | yes | Network configuration |

Responses:

- `201` Network created successfully (schema `NetworkCreateResponse`)
- `400` bad parameter (schema `ErrorResponse`)
- `403` Forbidden operation. This happens when trying to create a network named after a pre-defined network, or when trying to create an overlay network on a daemon which is not part of a Swarm cluster. (schema `ErrorResponse`)
- `404` plugin not found (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

## POST /networks/{id}/connect

Connect a container to a network

The network must be either a local-scoped network or a swarm-scoped network with the `attachable` option set. A network cannot be re-attached to a running container

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | Network ID or name |
| container | body | object | yes |  |

Responses:

- `200` No error
- `400` bad parameter (schema `ErrorResponse`)
- `403` Operation forbidden (schema `ErrorResponse`)
- `404` Network or container not found (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

