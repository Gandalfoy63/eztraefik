# Docker Engine API v1.47: Image

Source: https://docs.docker.com/reference/api/engine/version/v1.47/

## POST /images/create

Create an image

Pull or import an image.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| fromImage | query | string |  | Name of the image to pull. The name may include a tag or digest. This parameter may only be used when pulling an image. The pull is cancelled if the HTTP connection is closed. |
| fromSrc | query | string |  | Source to import. The value may be a URL from which the image can be retrieved or `-` to read the image from the request body. This parameter may only be used when importing an image. |
| repo | query | string |  | Repository name given to an image when it is imported. The repo may include a tag. This parameter may only be used when importing an image. |
| tag | query | string |  | Tag or digest. If empty when pulling an image, this causes all tags for the given image to be pulled. |
| message | query | string |  | Set commit message for imported image. |
| inputImage | body | string |  | Image content if the value `-` has been specified in fromSrc query parameter |
| X-Registry-Auth | header | string |  | A base64url-encoded auth configuration. Refer to the [authentication section](#section/Authentication) for details. |
| changes | query | array |  | Apply `Dockerfile` instructions to the image that is created, for example: `changes=ENV DEBUG=true`. Note that `ENV DEBUG=true` should be URI component encoded. Repeat the parameter to apply multiple instructions. Supported `Dockerfile` instructions: `CMD`\|`ENTRYPOINT`\|`ENV`\|`EXPOSE`\|`ONBUILD`\|`USER`\|`VOLUME`\|`WORKDIR` |
| platform | query | string |  | Platform in the format os[/arch[/variant]]. When used in combination with the `fromImage` option, the daemon checks if the given image is present in the local image cache with the given OS and Architecture, and otherwise attempts to pull the image. If the option is not set, the host's native OS and Architecture are used. If the given image does not exist in the local image cache, the daemon attempts to pull the image with the host's native OS and Architecture. If the given image does exists in the local image cache, but its OS or architecture does not match, a warning is produced. When used with the `fromSrc` option to import an image from an archive, this option sets the platform information for the imported image. If the option is not set, the host's native OS and Architecture are used for the imported image. |

Responses:

- `200` no error
- `404` repository does not exist or no read access (schema `ErrorResponse`)
- `500` server error (schema `ErrorResponse`)

## GET /images/{name}/json

Inspect an image

Return low-level information about an image.

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| name | path | string | yes | Image name or id |

Responses:

- `200` No error (schema `ImageInspect`)
- `404` No such image (schema `ErrorResponse`)
- `500` Server error (schema `ErrorResponse`)

