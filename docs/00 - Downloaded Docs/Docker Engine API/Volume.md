# Docker Engine API v1.47: Volume

Source: https://docs.docker.com/reference/api/engine/version/v1.47/

## GET /volumes

List volumes



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| filters | query | string |  | JSON encoded value of the filters (a `map[string][]string`) to process on the volumes list. Available filters: - `dangling=<boolean>` When set to `true` (or `1`), returns all volumes that are not in use by a container. When set to `false` (or `0`), only volumes that are in use by one or more containers are returned. - `driver=<volume-driver-name>` Matches volumes based on their driver. - `label=<key>` or `label=<key>:<value>` Matches volumes based on the presence of a `label` alone or a `label` and a value. - `name=<volume-name>` Matches all or part of a volume name. |

Responses:

- `200` Summary volume data that matches the query (schema `VolumeListResponse`)
- `500` Server error (schema `ErrorResponse`)

## POST /volumes/create

Create a volume



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| volumeConfig | body | VolumeCreateOptions | yes | Volume configuration |

Responses:

- `201` The volume was created successfully (schema `Volume`)
- `500` Server error (schema `ErrorResponse`)

## GET /volumes/{name}

Inspect a volume



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| name | path | string | yes | Volume name or ID |

Responses:

- `200` No error (schema `Volume`)
- `404` No such volume (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

## PUT /volumes/{name}

"Update a volume. Valid only for Swarm cluster volumes"



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| name | path | string | yes | The name or ID of the volume |
| body | body | object |  | The spec of the volume to update. Currently, only Availability may change. All other fields must remain unchanged. |
| version | query | integer | yes | The version number of the volume being updated. This is required to avoid conflicting writes. Found in the volume's `ClusterVolume` field. |

Responses:

- `200` no error
- `400` bad parameter (schema `ErrorResponse`)
- `404` no such volume (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)
- `503` node is not part of a swarm (schema `ErrorResponse`)

## DELETE /volumes/{name}

Remove a volume

Instruct the driver to remove the volume.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| name | path | string | yes | Volume name or ID |
| force | query | boolean |  | Force the removal of the volume |

Responses:

- `204` The volume was removed
- `404` No such volume or volume driver (schema `ErrorResponse`)
- `409` Volume is in use and cannot be removed (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

