# Docker Engine API v1.47: definitions used

## ContainerConfig

```yaml
description: |
  Configuration for a container that is portable between hosts.
type: object
properties:
  Hostname:
    description: |
      The hostname to use for the container, as a valid RFC 1123 hostname.
    type: string
    example: 439f4e91bd1d
  Domainname:
    description: |
      The domain name to use for the container.
    type: string
  User:
    description: The user that commands are run as inside the container.
    type: string
  AttachStdin:
    description: Whether to attach to `stdin`.
    type: boolean
    default: false
  AttachStdout:
    description: Whether to attach to `stdout`.
    type: boolean
    default: true
  AttachStderr:
    description: Whether to attach to `stderr`.
    type: boolean
    default: true
  ExposedPorts:
    description: |
      An object mapping ports to an empty object in the form:

      `{"<port>/<tcp|udp|sctp>": {}}`
    type: object
    x-nullable: true
    additionalProperties:
      type: object
      enum:
        - {}
      default: {}
    example:
      80/tcp: {}
      443/tcp: {}
  Tty:
    description: |
      Attach standard streams to a TTY, including `stdin` if it is not closed.
    type: boolean
    default: false
  OpenStdin:
    description: Open `stdin`
    type: boolean
    default: false
  StdinOnce:
    description: Close `stdin` after one attached client disconnects
    type: boolean
    default: false
  Env:
    description: |
      A list of environment variables to set inside the container in the
      form `["VAR=value", ...]`. A variable without `=` is removed from the
      environment, rather than to have an empty value.
    type: array
    items:
      type: string
    example:
      - PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
  Cmd:
    description: |
      Command to run specified as a string or an array of strings.
    type: array
    items:
      type: string
    example:
      - /bin/sh
  Healthcheck:
    $ref: "#/definitions/HealthConfig"
  ArgsEscaped:
    description: Command is already escaped (Windows only)
    type: boolean
    default: false
    example: false
    x-nullable: true
  Image:
    description: |
      The name (or reference) of the image to use when creating the container,
      or which was used when the container was created.
    type: string
    example: example-image:1.0
  Volumes:
    description: |
      An object mapping mount point paths inside the container to empty
      objects.
    type: object
    additionalProperties:
      type: object
      enum:
        - {}
      default: {}
  WorkingDir:
    description: The working directory for commands to run in.
    type: string
    example: /public/
  Entrypoint:
    description: |
      The entry point for the container as a string or an array of strings.

      If the array consists of exactly one empty string (`[""]`) then the
      entry point is reset to system default (i.e., the entry point used by
      docker when there is no `ENTRYPOINT` instruction in the `Dockerfile`).
    type: array
    items:
      type: string
    example: []
  NetworkDisabled:
    description: Disable networking for the container.
    type: boolean
    x-nullable: true
  MacAddress:
    description: >
      MAC address of the container.


      Deprecated: this field is deprecated in API v1.44 and up. Use
      EndpointSettings.MacAddress instead.
    type: string
    x-nullable: true
  OnBuild:
    description: |
      `ONBUILD` metadata that were defined in the image's `Dockerfile`.
    type: array
    x-nullable: true
    items:
      type: string
    example: []
  Labels:
    description: User-defined key/value metadata.
    type: object
    additionalProperties:
      type: string
    example:
      com.example.some-label: some-value
      com.example.some-other-label: some-other-value
  StopSignal:
    description: |
      Signal to stop a container as a string or unsigned integer.
    type: string
    example: SIGTERM
    x-nullable: true
  StopTimeout:
    description: |
      Timeout to stop a container in seconds. If omitted, the daemon-wide
      default is used.
    type: integer
    x-nullable: true
  Shell:
    description: |
      Shell for when `RUN`, `CMD`, and `ENTRYPOINT` uses a shell.
    type: array
    x-nullable: true
    items:
      type: string
    example:
      - /bin/sh
      - -c
```

## HostConfig

```yaml
description: Container configuration that depends on the host we are running on
allOf:
  - $ref: "#/definitions/Resources"
  - type: object
    properties:
      Binds:
        type: array
        description: >
          A list of volume bindings for this container. Each volume binding

          is a string in one of these forms:


          - `host-src:container-dest[:options]` to bind-mount a host path
            into the container. Both `host-src`, and `container-dest` must
            be an _absolute_ path.
          - `volume-name:container-dest[:options]` to bind-mount a volume
            managed by a volume driver into the container. `container-dest`
            must be an _absolute_ path.

          `options` is an optional, comma-delimited list of:


          - `nocopy` disables automatic copying of data from the container
            path to the volume. The `nocopy` flag only applies to named volumes.
          - `[ro|rw]` mounts a volume read-only or read-write, respectively.
            If omitted or set to `rw`, volumes are mounted read-write.
          - `[z|Z]` applies SELinux labels to allow or deny multiple containers
            to read and write to the same volume.
              - `z`: a _shared_ content label is applied to the content. This
                label indicates that multiple containers can share the volume
                content, for both reading and writing.
              - `Z`: a _private unshared_ label is applied to the content.
                This label indicates that only the current container can use
                a private volume. Labeling systems such as SELinux require
                proper labels to be placed on volume content that is mounted
                into a container. Without a label, the security system can
                prevent a container's processes from using the content. By
                default, the labels set by the host operating system are not
                modified.
          - `[[r]shared|[r]slave|[r]private]` specifies mount
            [propagation behavior](https://www.kernel.org/doc/Documentation/filesystems/sharedsubtree.txt).
            This only applies to bind-mounted volumes, not internal volumes
            or named volumes. Mount propagation requires the source mount
            point (the location where the source directory is mounted in the
            host operating system) to have the correct propagation properties.
            For shared volumes, the source mount point must be set to `shared`.
            For slave volumes, the mount must be set to either `shared` or
            `slave`.
        items:
          type: string
      ContainerIDFile:
        type: string
        description: Path to a file where the container ID is written
      LogConfig:
        type: object
        description: The logging configuration for this container
        properties:
          Type:
            type: string
            enum:
              - json-file
              - syslog
              - journald
              - gelf
              - fluentd
              - awslogs
              - splunk
              - etwlogs
              - none
          Config:
            type: object
            additionalProperties:
              type: string
      NetworkMode:
        type: string
        description: |
          Network mode to use for this container. Supported standard values
          are: `bridge`, `host`, `none`, and `container:<name|id>`. Any
          other value is taken as a custom network's name to which this
          container should connect to.
      PortBindings:
        $ref: "#/definitions/PortMap"
      RestartPolicy:
        $ref: "#/definitions/RestartPolicy"
      AutoRemove:
        type: boolean
        description: |
          Automatically remove the container when the container's process
          exits. This has no effect if `RestartPolicy` is set.
      VolumeDriver:
        type: string
        description: Driver that this container uses to mount volumes.
      VolumesFrom:
        type: array
        description: |
          A list of volumes to inherit from another container, specified in
          the form `<container name>[:<ro|rw>]`.
        items:
          type: string
      Mounts:
        description: |
          Specification for mounts to be added to the container.
        type: array
        items:
          $ref: "#/definitions/Mount"
      ConsoleSize:
        type: array
        description: |
          Initial console size, as an `[height, width]` array.
        x-nullable: true
        minItems: 2
        maxItems: 2
        items:
          type: integer
          minimum: 0
      Annotations:
        type: object
        description: |
          Arbitrary non-identifying metadata attached to container and
          provided to the runtime when the container is started.
        additionalProperties:
          type: string
      CapAdd:
        type: array
        description: |
          A list of kernel capabilities to add to the container. Conflicts
          with option 'Capabilities'.
        items:
          type: string
      CapDrop:
        type: array
        description: |
          A list of kernel capabilities to drop from the container. Conflicts
          with option 'Capabilities'.
        items:
          type: string
      CgroupnsMode:
        type: string
        enum:
          - private
          - host
        description: >
          cgroup namespace mode for the container. Possible values are:


          - `"private"`: the container runs in its own private cgroup namespace

          - `"host"`: use the host system's cgroup namespace


          If not specified, the daemon default is used, which can either be
          `"private"`

          or `"host"`, depending on daemon version, kernel support and
          configuration.
      Dns:
        type: array
        description: A list of DNS servers for the container to use.
        items:
          type: string
      DnsOptions:
        type: array
        description: A list of DNS options.
        items:
          type: string
      DnsSearch:
        type: array
        description: A list of DNS search domains.
        items:
          type: string
      ExtraHosts:
        type: array
        description: |
          A list of hostnames/IP mappings to add to the container's `/etc/hosts`
          file. Specified in the form `["hostname:IP"]`.
        items:
          type: string
      GroupAdd:
        type: array
        description: |
          A list of additional groups that the container process will run as.
        items:
          type: string
      IpcMode:
        type: string
        description: >
          IPC sharing mode for the container. Possible values are:


          - `"none"`: own private IPC namespace, with /dev/shm not mounted

          - `"private"`: own private IPC namespace

          - `"shareable"`: own private IPC namespace, with a possibility to
          share it with other containers

          - `"container:<name|id>"`: join another (shareable) container's IPC
          namespace

          - `"host"`: use the host system's IPC namespace


          If not specified, daemon default is used, which can either be
          `"private"`

          or `"shareable"`, depending on daemon version and configuration.
      Cgroup:
        type: string
        description: Cgroup to use for the container.
      Links:
        type: array
        description: |
          A list of links for the container in the form `container_name:alias`.
        items:
          type: string
      OomScoreAdj:
        type: integer
        description: |
          An integer value containing the score given to the container in
          order to tune OOM killer preferences.
        example: 500
      PidMode:
        type: string
        description: |
          Set the PID (Process) Namespace mode for the container. It can be
          either:

          - `"container:<name|id>"`: joins another container's PID namespace
          - `"host"`: use the host's PID namespace inside the container
      Privileged:
        type: boolean
        description: Gives the container full access to the host.
      PublishAllPorts:
        type: boolean
        description: |
          Allocates an ephemeral host port for all of a container's
          exposed ports.

          Ports are de-allocated when the container stops and allocated when
          the container starts. The allocated port might be changed when
          restarting the container.

          The port is selected from the ephemeral port range that depends on
          the kernel. For example, on Linux the range is defined by
          `/proc/sys/net/ipv4/ip_local_port_range`.
      ReadonlyRootfs:
        type: boolean
        description: Mount the container's root filesystem as read only.
      SecurityOpt:
        type: array
        description: |
          A list of string values to customize labels for MLS systems, such
          as SELinux.
        items:
          type: string
      StorageOpt:
        type: object
        description: >
          Storage driver options for this container, in the form `{"size":
          "120G"}`.
        additionalProperties:
          type: string
      Tmpfs:
        type: object
        description: |
          A map of container directories which should be replaced by tmpfs
          mounts, and their corresponding mount options. For example:

          ```
          { "/run": "rw,noexec,nosuid,size=65536k" }
          ```
        additionalProperties:
          type: string
      UTSMode:
        type: string
        description: UTS namespace to use for the container.
      UsernsMode:
        type: string
        description: |
          Sets the usernamespace mode for the container when usernamespace
          remapping option is enabled.
      ShmSize:
        type: integer
        format: int64
        description: |
          Size of `/dev/shm` in bytes. If omitted, the system uses 64MB.
        minimum: 0
      Sysctls:
        type: object
        description: |
          A list of kernel parameters (sysctls) to set in the container.
          For example:

          ```
          {"net.ipv4.ip_forward": "1"}
          ```
        additionalProperties:
          type: string
      Runtime:
        type: string
        description: Runtime to use with this container.
      Isolation:
        type: string
        description: |
          Isolation technology of the container. (Windows only)
        enum:
          - default
          - process
          - hyperv
          - ""
      MaskedPaths:
        type: array
        description: |
          The list of paths to be masked inside the container (this overrides
          the default set of paths).
        items:
          type: string
      ReadonlyPaths:
        type: array
        description: |
          The list of paths to be set as read-only inside the container
          (this overrides the default set of paths).
        items:
          type: string
```

## PortBinding

```yaml
description: |
  PortBinding represents a binding between a host IP address and a host
  port.
type: object
properties:
  HostIp:
    description: Host IP address that the container's port is mapped to.
    type: string
    example: 127.0.0.1
  HostPort:
    description: Host port number that the container's port is mapped to.
    type: string
    example: "4443"
```

## PortMap

```yaml
description: |
  PortMap describes the mapping of container ports to host ports, using the
  container's port-number and protocol as key in the format `<port>/<protocol>`,
  for example, `80/udp`.

  If a container's port is mapped for multiple protocols, separate entries
  are added to the mapping table.
type: object
additionalProperties:
  type: array
  x-nullable: true
  items:
    $ref: "#/definitions/PortBinding"
example:
  443/tcp:
    - HostIp: 127.0.0.1
      HostPort: "4443"
  80/tcp:
    - HostIp: 0.0.0.0
      HostPort: "80"
    - HostIp: 0.0.0.0
      HostPort: "8080"
  80/udp:
    - HostIp: 0.0.0.0
      HostPort: "80"
  53/udp:
    - HostIp: 0.0.0.0
      HostPort: "53"
  2377/tcp: null
```

## Mount

```yaml
type: object
properties:
  Target:
    description: Container path.
    type: string
  Source:
    description: |-
      Mount source (e.g. a volume name, a host path). The source cannot be
      specified when using `Type=tmpfs`. For `Type=bind`, the source path
      must either exist, or the `CreateMountpoint` must be set to `true` to
      create the source path on the host if missing.

      For `Type=npipe`, the pipe must exist prior to creating the container.
    type: string
  Type:
    description: >
      The mount type. Available types:


      - `bind` Mounts a file or directory from the host into the container. The
      `Source` must exist prior to creating the container.

      - `cluster` a Swarm cluster volume

      - `npipe` Mounts a named pipe from the host into the container. The
      `Source` must exist prior to creating the container.

      - `tmpfs` Create a tmpfs with the given options. The mount `Source` cannot
      be specified for tmpfs.

      - `volume` Creates a volume with the given name and options (or uses a
      pre-existing volume with the same name and options). These are **not**
      removed when the container is removed.
    allOf:
      - $ref: "#/definitions/MountType"
  ReadOnly:
    description: Whether the mount should be read-only.
    type: boolean
  Consistency:
    description: "The consistency requirement for the mount: `default`,
      `consistent`, `cached`, or `delegated`."
    type: string
  BindOptions:
    description: Optional configuration for the `bind` type.
    type: object
    properties:
      Propagation:
        description: A propagation mode with the value `[r]private`, `[r]shared`, or
          `[r]slave`.
        type: string
        enum:
          - private
          - rprivate
          - shared
          - rshared
          - slave
          - rslave
      NonRecursive:
        description: Disable recursive bind mount.
        type: boolean
        default: false
      CreateMountpoint:
        description: Create mount point on host if missing
        type: boolean
        default: false
      ReadOnlyNonRecursive:
        description: >
          Make the mount non-recursively read-only, but still leave the mount
          recursive

          (unless NonRecursive is set to `true` in conjunction).


          Added in v1.44, before that version all read-only mounts were

          non-recursive by default. To match the previous behaviour this

          will default to `true` for clients on versions prior to v1.44.
        type: boolean
        default: false
      ReadOnlyForceRecursive:
        description: Raise an error if the mount cannot be made recursively read-only.
        type: boolean
        default: false
  VolumeOptions:
    description: Optional configuration for the `volume` type.
    type: object
    properties:
      NoCopy:
        description: Populate volume with data from the target.
        type: boolean
        default: false
      Labels:
        description: User-defined key/value metadata.
        type: object
        additionalProperties:
          type: string
      DriverConfig:
        description: Map of driver specific options
        type: object
        properties:
          Name:
            description: Name of the driver to use to create the volume.
            type: string
          Options:
            description: key/value map of driver specific options.
            type: object
            additionalProperties:
              type: string
      Subpath:
        description: Source path inside the volume. Must be relative without any back
          traversals.
        type: string
        example: dir-inside-volume/subdirectory
  TmpfsOptions:
    description: Optional configuration for the `tmpfs` type.
    type: object
    properties:
      SizeBytes:
        description: The size for the tmpfs mount in bytes.
        type: integer
        format: int64
      Mode:
        description: |
          The permission mode for the tmpfs mount in an integer.
          The value must not be in octal format (e.g. 755) but rather
          the decimal representation of the octal value (e.g. 493).
        type: integer
      Options:
        description: |
          The options to be passed to the tmpfs mount. An array of arrays.
          Flag options should be provided as 1-length arrays. Other types
          should be provided as as 2-length arrays, where the first item is
          the key and the second the value.
        type: array
        items:
          type: array
          minItems: 1
          maxItems: 2
          items:
            type: string
        example:
          - - noexec
```

## RestartPolicy

```yaml
description: |
  The behavior to apply when the container exits. The default is not to
  restart.

  An ever increasing delay (double the previous delay, starting at 100ms) is
  added before each restart to prevent flooding the server.
type: object
properties:
  Name:
    type: string
    description: >
      - Empty string means not to restart

      - `no` Do not automatically restart

      - `always` Always restart

      - `unless-stopped` Restart always except when the user has manually
      stopped the container

      - `on-failure` Restart only when the container exit code is non-zero
    enum:
      - ""
      - no
      - always
      - unless-stopped
      - on-failure
  MaximumRetryCount:
    type: integer
    description: |
      If `on-failure` is used, the number of times to retry before giving up.
```

## EndpointSettings

```yaml
description: Configuration for a network endpoint.
type: object
properties:
  IPAMConfig:
    $ref: "#/definitions/EndpointIPAMConfig"
  Links:
    type: array
    items:
      type: string
    example:
      - container_1
      - container_2
  MacAddress:
    description: >
      MAC address for the endpoint on this network. The network driver might
      ignore this parameter.
    type: string
    example: 02:42:ac:11:00:04
  Aliases:
    type: array
    items:
      type: string
    example:
      - server_x
      - server_y
  DriverOpts:
    description: |
      DriverOpts is a mapping of driver options and values. These options
      are passed directly to the driver and are driver specific.
    type: object
    x-nullable: true
    additionalProperties:
      type: string
    example:
      com.example.some-label: some-value
      com.example.some-other-label: some-other-value
  NetworkID:
    description: |
      Unique ID of the network.
    type: string
    example: 08754567f1f40222263eab4102e1c733ae697e8e354aa9cd6e18d7402835292a
  EndpointID:
    description: |
      Unique ID for the service endpoint in a Sandbox.
    type: string
    example: b88f5b905aabf2893f3cbc4ee42d1ea7980bbc0a92e2c8922b1e1795298afb0b
  Gateway:
    description: |
      Gateway address for this network.
    type: string
    example: 172.17.0.1
  IPAddress:
    description: |
      IPv4 address.
    type: string
    example: 172.17.0.4
  IPPrefixLen:
    description: |
      Mask length of the IPv4 address.
    type: integer
    example: 16
  IPv6Gateway:
    description: |
      IPv6 gateway address.
    type: string
    example: 2001:db8:2::100
  GlobalIPv6Address:
    description: |
      Global IPv6 address.
    type: string
    example: 2001:db8::5689
  GlobalIPv6PrefixLen:
    description: |
      Mask length of the global IPv6 address.
    type: integer
    format: int64
    example: 64
  DNSNames:
    description: |
      List of all DNS names an endpoint has on a specific network. This
      list is based on the container name, network aliases, container short
      ID, and hostname.

      These DNS names are non-fully qualified but can contain several dots.
      You can get fully qualified DNS names by appending `.<network-name>`.
      For instance, if container name is `my.ctr` and the network is named
      `testnet`, `DNSNames` will contain `my.ctr` and the FQDN will be
      `my.ctr.testnet`.
    type: array
    items:
      type: string
    example:
      - foobar
      - server_x
      - server_y
      - my.ctr
```

## NetworkingConfig

```yaml
description: |
  NetworkingConfig represents the container's networking configuration for
  each of its interfaces.
  It is used for the networking configs specified in the `docker create`
  and `docker network connect` commands.
type: object
properties:
  EndpointsConfig:
    description: |
      A mapping of network name to endpoint configuration for that network.
      The endpoint configuration can be left empty to connect to that
      network with no particular endpoint configuration.
    type: object
    additionalProperties:
      $ref: "#/definitions/EndpointSettings"
example:
  EndpointsConfig:
    isolated_nw:
      IPAMConfig:
        IPv4Address: 172.20.30.33
        IPv6Address: 2001:db8:abcd::3033
        LinkLocalIPs:
          - 169.254.34.68
          - fe80::3468
      MacAddress: 02:42:ac:12:05:02
      Links:
        - container_1
        - container_2
      Aliases:
        - server_x
        - server_y
    database_nw: {}
```

## ContainerSummary

```yaml
type: object
properties:
  Id:
    description: The ID of this container
    type: string
    x-go-name: ID
  Names:
    description: The names that this container has been given
    type: array
    items:
      type: string
  Image:
    description: The name of the image used when creating this container
    type: string
  ImageID:
    description: The ID of the image that this container was created from
    type: string
  Command:
    description: Command to run when starting the container
    type: string
  Created:
    description: When the container was created
    type: integer
    format: int64
  Ports:
    description: The ports exposed by this container
    type: array
    items:
      $ref: "#/definitions/Port"
  SizeRw:
    description: The size of files that have been created or changed by this container
    type: integer
    format: int64
  SizeRootFs:
    description: The total size of all the files in this container
    type: integer
    format: int64
  Labels:
    description: User-defined key/value metadata.
    type: object
    additionalProperties:
      type: string
  State:
    description: The state of this container (e.g. `Exited`)
    type: string
  Status:
    description: Additional human-readable status of this container (e.g. `Exit 0`)
    type: string
  HostConfig:
    type: object
    properties:
      NetworkMode:
        type: string
      Annotations:
        description: Arbitrary key-value metadata attached to container
        type: object
        x-nullable: true
        additionalProperties:
          type: string
  NetworkSettings:
    description: A summary of the container's network settings
    type: object
    properties:
      Networks:
        type: object
        additionalProperties:
          $ref: "#/definitions/EndpointSettings"
  Mounts:
    type: array
    items:
      $ref: "#/definitions/MountPoint"
```

## ContainerState

```yaml
description: >
  ContainerState stores container's running state. It's part of
  ContainerJSONBase

  and will be returned by the "inspect" command.
type: object
x-nullable: true
properties:
  Status:
    description: |
      String representation of the container state. Can be one of "created",
      "running", "paused", "restarting", "removing", "exited", or "dead".
    type: string
    enum:
      - created
      - running
      - paused
      - restarting
      - removing
      - exited
      - dead
    example: running
  Running:
    description: >
      Whether this container is running.


      Note that a running container can be _paused_. The `Running` and `Paused`

      booleans are not mutually exclusive:


      When pausing a container (on Linux), the freezer cgroup is used to suspend

      all processes in the container. Freezing the process requires the process
      to

      be running. As a result, paused containers are both `Running` _and_
      `Paused`.


      Use the `Status` field instead to determine if a container's state is
      "running".
    type: boolean
    example: true
  Paused:
    description: Whether this container is paused.
    type: boolean
    example: false
  Restarting:
    description: Whether this container is restarting.
    type: boolean
    example: false
  OOMKilled:
    description: |
      Whether a process within this container has been killed because it ran
      out of memory since the container was last started.
    type: boolean
    example: false
  Dead:
    type: boolean
    example: false
  Pid:
    description: The process ID of this container
    type: integer
    example: 1234
  ExitCode:
    description: The last exit code of this container
    type: integer
    example: 0
  Error:
    type: string
  StartedAt:
    description: The time when this container was last started.
    type: string
    example: 2020-01-06T09:06:59.461876391Z
  FinishedAt:
    description: The time when this container last exited.
    type: string
    example: 2020-01-06T09:07:59.461876391Z
  Health:
    $ref: "#/definitions/Health"
```

## Network

```yaml
type: object
properties:
  Name:
    description: |
      Name of the network.
    type: string
    example: my_network
  Id:
    description: |
      ID that uniquely identifies a network on a single machine.
    type: string
    example: 7d86d31b1478e7cca9ebed7e73aa0fdeec46c5ca29497431d3007d2d9e15ed99
  Created:
    description: |
      Date and time at which the network was created in
      [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) format with nano-seconds.
    type: string
    format: dateTime
    example: 2016-10-19T04:33:30.360899459Z
  Scope:
    description: |
      The level at which the network exists (e.g. `swarm` for cluster-wide
      or `local` for machine level)
    type: string
    example: local
  Driver:
    description: |
      The name of the driver used to create the network (e.g. `bridge`,
      `overlay`).
    type: string
    example: overlay
  EnableIPv4:
    description: |
      Whether the network was created with IPv4 enabled.
    type: boolean
    example: true
  EnableIPv6:
    description: |
      Whether the network was created with IPv6 enabled.
    type: boolean
    example: false
  IPAM:
    $ref: "#/definitions/IPAM"
  Internal:
    description: |
      Whether the network is created to only allow internal networking
      connectivity.
    type: boolean
    default: false
    example: false
  Attachable:
    description: |
      Whether a global / swarm scope network is manually attachable by regular
      containers from workers in swarm mode.
    type: boolean
    default: false
    example: false
  Ingress:
    description: |
      Whether the network is providing the routing-mesh for the swarm cluster.
    type: boolean
    default: false
    example: false
  ConfigFrom:
    $ref: "#/definitions/ConfigReference"
  ConfigOnly:
    description: |
      Whether the network is a config-only network. Config-only networks are
      placeholder networks for network configurations to be used by other
      networks. Config-only networks cannot be used directly to run containers
      or services.
    type: boolean
    default: false
  Containers:
    description: |
      Contains endpoints attached to the network.
    type: object
    additionalProperties:
      $ref: "#/definitions/NetworkContainer"
    example:
      19a4d5d687db25203351ed79d478946f861258f018fe384f229f2efa4b23513c:
        Name: test
        EndpointID: 628cadb8bcb92de107b2a1e516cbffe463e321f548feb37697cce00ad694f21a
        MacAddress: 02:42:ac:13:00:02
        IPv4Address: 172.19.0.2/16
        IPv6Address: ""
  Options:
    description: |
      Network-specific options uses when creating the network.
    type: object
    additionalProperties:
      type: string
    example:
      com.docker.network.bridge.default_bridge: "true"
      com.docker.network.bridge.enable_icc: "true"
      com.docker.network.bridge.enable_ip_masquerade: "true"
      com.docker.network.bridge.host_binding_ipv4: 0.0.0.0
      com.docker.network.bridge.name: docker0
      com.docker.network.driver.mtu: "1500"
  Labels:
    description: User-defined key/value metadata.
    type: object
    additionalProperties:
      type: string
    example:
      com.example.some-label: some-value
      com.example.some-other-label: some-other-value
  Peers:
    description: |
      List of peer nodes for an overlay network. This field is only present
      for overlay networks, and omitted for other network types.
    type: array
    items:
      $ref: "#/definitions/PeerInfo"
    x-nullable: true
```

## Volume

```yaml
type: object
required:
  - Name
  - Driver
  - Mountpoint
  - Labels
  - Scope
  - Options
properties:
  Name:
    type: string
    description: Name of the volume.
    x-nullable: false
    example: tardis
  Driver:
    type: string
    description: Name of the volume driver used by the volume.
    x-nullable: false
    example: custom
  Mountpoint:
    type: string
    description: Mount path of the volume on the host.
    x-nullable: false
    example: /var/lib/docker/volumes/tardis
  CreatedAt:
    type: string
    format: dateTime
    description: Date/Time the volume was created.
    example: 2016-06-07T20:31:11.853781916Z
  Status:
    type: object
    description: |
      Low-level details about the volume, provided by the volume driver.
      Details are returned as a map with key/value pairs:
      `{"key":"value","key2":"value2"}`.

      The `Status` field is optional, and is omitted if the volume driver
      does not support this feature.
    additionalProperties:
      type: object
    example:
      hello: world
  Labels:
    type: object
    description: User-defined key/value metadata.
    x-nullable: false
    additionalProperties:
      type: string
    example:
      com.example.some-label: some-value
      com.example.some-other-label: some-other-value
  Scope:
    type: string
    description: |
      The level at which the volume exists. Either `global` for cluster-wide,
      or `local` for machine level.
    default: local
    x-nullable: false
    enum:
      - local
      - global
    example: local
  ClusterVolume:
    $ref: "#/definitions/ClusterVolume"
  Options:
    type: object
    description: |
      The driver specific options used when creating the volume.
    additionalProperties:
      type: string
    example:
      device: tmpfs
      o: size=100m,uid=1000
      type: tmpfs
  UsageData:
    type: object
    x-nullable: true
    x-go-name: UsageData
    required:
      - Size
      - RefCount
    description: |
      Usage details about the volume. This information is used by the
      `GET /system/df` endpoint, and omitted in other endpoints.
    properties:
      Size:
        type: integer
        format: int64
        default: -1
        description: |
          Amount of disk space used by the volume (in bytes). This information
          is only available for volumes created with the `"local"` volume
          driver. For volumes created with other volume drivers, this field
          is set to `-1` ("not available")
        x-nullable: false
      RefCount:
        type: integer
        format: int64
        default: -1
        description: |
          The number of containers referencing this volume. This field
          is set to `-1` if the reference-count is not available.
        x-nullable: false
```

## SystemVersion

```yaml
type: object
description: |
  Response of Engine API: GET "/version"
properties:
  Platform:
    type: object
    required:
      - Name
    properties:
      Name:
        type: string
  Components:
    type: array
    description: |
      Information about system components
    items:
      type: object
      x-go-name: ComponentVersion
      required:
        - Name
        - Version
      properties:
        Name:
          description: |
            Name of the component
          type: string
          example: Engine
        Version:
          description: |
            Version of the component
          type: string
          x-nullable: false
          example: 27.0.1
        Details:
          description: >
            Key/value pairs of strings with additional information about the

            component. These values are intended for informational purposes

            only, and their content is not defined, and not part of the API

            specification.


            These messages can be printed by the client as information to the
            user.
          type: object
          x-nullable: true
  Version:
    description: The version of the daemon
    type: string
    example: 27.0.1
  ApiVersion:
    description: |
      The default (and highest) API version that is supported by the daemon
    type: string
    example: "1.47"
  MinAPIVersion:
    description: |
      The minimum API version that is supported by the daemon
    type: string
    example: "1.24"
  GitCommit:
    description: |
      The Git commit of the source code that was used to build the daemon
    type: string
    example: 48a66213fe
  GoVersion:
    description: |
      The version Go used to compile the daemon, and the version of the Go
      runtime in use.
    type: string
    example: go1.21.13
  Os:
    description: |
      The operating system that the daemon is running on ("linux" or "windows")
    type: string
    example: linux
  Arch:
    description: >
      Architecture of the daemon, as returned by the Go runtime (`GOARCH`).


      A full list of possible values can be found in the [Go
      documentation](https://go.dev/doc/install/source#environment).
    type: string
    example: amd64
  KernelVersion:
    description: |
      The kernel version (`uname -r`) that the daemon is running on.

      This field is omitted when empty.
    type: string
    example: 6.8.0-31-generic
  Experimental:
    description: |
      Indicates if the daemon is started with experimental features enabled.

      This field is omitted when empty / false.
    type: boolean
    example: true
  BuildTime:
    description: |
      The date and time that the daemon was compiled.
    type: string
    example: 2020-06-22T15:49:27.000000000+00:00
```

