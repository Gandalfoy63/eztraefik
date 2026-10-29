# Docker Engine API v1.47: Container

Source: https://docs.docker.com/reference/api/engine/version/v1.47/

## GET /containers/json

List containers

Returns a list of containers. For details on the format, see the
[inspect endpoint](#operation/ContainerInspect).

Note that it uses a different, smaller representation of a container
than inspecting a single container. For example, the list of linked
containers is not propagated .

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| all | query | boolean |  | Return all containers. By default, only running containers are shown. |
| limit | query | integer |  | Return this number of most recently created containers, including non-running ones. |
| size | query | boolean |  | Return the size of container as fields `SizeRw` and `SizeRootFs`. |
| filters | query | string |  | Filters to process on the container list, encoded as JSON (a `map[string][]string`). For example, `{"status": ["paused"]}` will only return paused containers. Available filters: - `ancestor`=(`<image-name>[:<tag>]`, `<image id>`, or `<image@digest>`) - `before`=(`<container id>` or `<container name>`) - `expose`=(`<port>[/<proto>]`\|`<startport-endport>/[<proto>]`) - `exited=<int>` containers with exit code of `<int>` - `health`=(`starting`\|`healthy`\|`unhealthy`\|`none`) - `id=<ID>` a container's ID - `isolation=`(`default`\|`process`\|`hyperv`) (Windows daemon only) - `is-task=`(`true`\|`false`) - `label=key` or `label="key=value"` of a container label - `name=<name>` a container's name - `network`=(`<network id>` or `<network name>`) - `publish`=(`<port>[/<proto>]`\|`<startport-endport>/[<proto>]`) - `since`=(`<container id>` or `<container name>`) - `status=`(`created`\|`restarting`\|`running`\|`removing`\|`paused`\|`exited`\|`dead`) - `volume`=(`<volume name>` or `<mount point destination>`) |

Responses:

- `200` no error
- `400` bad parameter (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## POST /containers/create

Create a container



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| name | query | string |  | Assign the specified name to the container. Must match `/?[a-zA-Z0-9][a-zA-Z0-9_.-]+`. |
| platform | query | string |  | Platform in the format `os[/arch[/variant]]` used for image lookup. When specified, the daemon checks if the requested image is present in the local image cache with the given OS and Architecture, and otherwise returns a `404` status. If the option is not set, the host's native OS and Architecture are used to look up the image in the image cache. However, if no platform is passed and the given image does exist in the local image cache, but its OS or architecture does not match, the container is created with the available image, and a warning is added to the `Warnings` field in the response, for example; WARNING: The requested image's platform (linux/arm64/v8) does not match the detected host platform (linux/amd64) and no specific platform was requested |
| body | body |  | yes | Container to create |

Responses:

- `201` Container created successfully (schema `ContainerCreateResponse`)
- `400` bad parameter (schema `ErrorResponse`)
- `404` no such image (schema `ErrorResponse`)
- `409` conflict (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## GET /containers/{id}/json

Inspect a container

Return low-level information about a container.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| size | query | boolean |  | Return the size of container as fields `SizeRw` and `SizeRootFs` |

Responses:

- `200` no error
- `404` no such container (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## POST /containers/{id}/start

Start a container



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| detachKeys | query | string |  | Override the key sequence for detaching a container. Format is a single character `[a-Z]` or `ctrl-<value>` where `<value>` is one of: `a-z`, `@`, `^`, `[`, `,` or `_`. |

Responses:

- `204` no error
- `304` container already started
- `400` bad parameter, including an invalid checkpoint ID (schema `ErrorResponse`)
- `404` no such container (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## POST /containers/{id}/stop

Stop a container



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| signal | query | string |  | Signal to send to the container as an integer or string (e.g. `SIGINT`). |
| t | query | integer |  | Number of seconds to wait before killing the container |

Responses:

- `204` no error
- `304` container already stopped
- `404` no such container (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## POST /containers/{id}/restart

Restart a container



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| signal | query | string |  | Signal to send to the container as an integer or string (e.g. `SIGINT`). |
| t | query | integer |  | Number of seconds to wait before killing the container |

Responses:

- `204` no error
- `404` no such container (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## DELETE /containers/{id}

Remove a container



| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| v | query | boolean |  | Remove anonymous volumes associated with the container. |
| force | query | boolean |  | If the container is running, kill it before removing it. |
| link | query | boolean |  | Remove the specified link associated with the container. |

Responses:

- `204` no error
- `400` bad parameter (schema `ErrorResponse`)
- `404` no such container (schema `ErrorResponse`)
- `409` conflict (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## GET /containers/{id}/logs

Get container logs

Get `stdout` and `stderr` logs from a container.

Note: This endpoint works only for containers with the `json-file` or
`journald` logging driver.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| follow | query | boolean |  | Keep connection after returning logs. |
| stdout | query | boolean |  | Return logs from `stdout` |
| stderr | query | boolean |  | Return logs from `stderr` |
| since | query | integer |  | Only return logs since this time, as a UNIX timestamp |
| until | query | integer |  | Only return logs before this time, as a UNIX timestamp |
| timestamps | query | boolean |  | Add timestamps to every log line |
| tail | query | string |  | Only return this number of log lines from the end of the logs. Specify as an integer or `all` to output all log lines. |

Responses:

- `200` logs returned as a stream in response body. For the stream format, [see the documentation for the attach endpoint](#operation/ContainerAttach). Note that unlike the attach endpoint, the logs endpoint does not upgrade the connection and does not set Content-Type.
- `404` no such container (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## HEAD /containers/{id}/archive

Get information about files in a container

A response header `X-Docker-Container-Path-Stat` is returned, containing
a base64 - encoded JSON object with some filesystem header information
about the path.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| path | query | string | yes | Resource in the container’s filesystem to archive. |

Responses:

- `200` no error
- `400` Bad parameter (schema `ErrorResponse`)
- `404` Container or path does not exist (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

## GET /containers/{id}/archive

Get an archive of a filesystem resource in a container

Get a tar archive of a resource in the filesystem of container id.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| path | query | string | yes | Resource in the container’s filesystem to archive. |

Responses:

- `200` no error
- `400` Bad parameter (schema `ErrorResponse`)
- `404` Container or path does not exist (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## PUT /containers/{id}/archive

Extract an archive of files or folders to a directory in a container

Upload a tar archive to be extracted to a path in the filesystem of container id.
`path` parameter is asserted to be a directory. If it exists as a file, 400 error
will be returned with message "not a directory".

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| id | path | string | yes | ID or name of the container |
| path | query | string | yes | Path to a directory in the container to extract the archive’s contents into. |
| noOverwriteDirNonDir | query | string |  | If `1`, `true`, or `True` then it will be an error if unpacking the given content would cause an existing directory to be replaced with a non-directory and vice versa. |
| copyUIDGID | query | string |  | If `1`, `true`, then it will copy UID/GID maps to the dest file or dir |
| inputStream | body | string | yes | The input stream must be a tar archive compressed with one of the following algorithms: `identity` (no compression), `gzip`, `bzip2`, or `xz`. |

Responses:

- `200` The content was extracted successfully
- `400` Bad parameter (schema `ErrorResponse`)
- `403` Permission denied, the volume or container rootfs is marked as read-only. (schema `ErrorResponse`)
- `404` No such container or path does not exist inside the container (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

