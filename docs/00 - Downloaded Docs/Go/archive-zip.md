# Package archive/zip

Source: `go doc -all archive/zip` from Go 1.27.3 (official standard library docs, also at https://pkg.go.dev/archive/zip).

```text
package zip // import "archive/zip"

Package zip provides support for reading and writing ZIP archives.

See the ZIP specification for details.

This package does not support disk spanning.

A note about ZIP64:

To be backwards compatible the FileHeader has both 32 and 64 bit Size fields.
The 64 bit fields will always contain the correct value and for normal archives
both fields will be the same. For files requiring the ZIP64 format the 32 bit
fields will be 0xffffffff and the 64 bit fields must be used instead.

[ZIP specification]: https://support.pkware.com/pkzip/appnote

CONSTANTS

const (
	Store   uint16 = 0 // no compression
	Deflate uint16 = 8 // DEFLATE compressed
)
    Compression methods.


VARIABLES

var (
	ErrFormat       = errors.New("zip: not a valid zip file")
	ErrAlgorithm    = errors.New("zip: unsupported compression algorithm")
	ErrChecksum     = errors.New("zip: checksum error")
	ErrInsecurePath = errors.New("zip: insecure file path")
)

FUNCTIONS

func RegisterCompressor(method uint16, comp Compressor)
    RegisterCompressor registers custom compressors for a specified method ID.
    The common methods Store and Deflate are built in.

func RegisterDecompressor(method uint16, dcomp Decompressor)
    RegisterDecompressor allows custom decompressors for a specified method ID.
    The common methods Store and Deflate are built in.


TYPES

type Compressor func(w io.Writer) (io.WriteCloser, error)
    A Compressor returns a new compressing writer, writing to w.
    The WriteCloser's Close method must be used to flush pending data to w.
    The Compressor itself must be safe to invoke from multiple goroutines
    simultaneously, but each returned writer will be used only by one goroutine
    at a time.

type Decompressor func(r io.Reader) io.ReadCloser
    A Decompressor returns a new decompressing reader, reading from r. The
    io.ReadCloser's Close method must be used to release associated resources.
    The Decompressor itself must be safe to invoke from multiple goroutines
    simultaneously, but each returned reader will be used only by one goroutine
    at a time.

type File struct {
	FileHeader

	// Has unexported fields.
}
    A File is a single file in a ZIP archive. The file information is in the
    embedded FileHeader. The file content can be accessed by calling File.Open.

func (f *File) DataOffset() (offset int64, err error)
    DataOffset returns the offset of the file's possibly-compressed data,
    relative to the beginning of the zip file.

    Most callers should instead use File.Open, which transparently decompresses
    data and verifies checksums.

func (f *File) Open() (io.ReadCloser, error)
    Open returns a ReadCloser that provides access to the File's contents.
    Multiple files may be read concurrently.

func (f *File) OpenRaw() (io.Reader, error)
    OpenRaw returns a Reader that provides access to the File's contents without
    decompression.

type FileHeader struct {
	// Name is the name of the file.
	//
	// It must be a relative path, not start with a drive letter (such as "C:"),
	// and must use forward slashes instead of back slashes. A trailing slash
	// indicates that this file is a directory and should have no data.
	Name string

	// Comment is any arbitrary user-defined string shorter than 64KiB.
	Comment string

	// NonUTF8 indicates that Name and Comment are not encoded in UTF-8.
	//
	// By specification, the only other encoding permitted should be CP-437,
	// but historically many ZIP readers interpret Name and Comment as whatever
	// the system's local character encoding happens to be.
	//
	// This flag should only be set if the user intends to encode a non-portable
	// ZIP file for a specific localized region. Otherwise, the Writer
	// automatically sets the ZIP format's UTF-8 flag for valid UTF-8 strings.
	NonUTF8 bool

	CreatorVersion uint16
	ReaderVersion  uint16
	Flags          uint16

	// Method is the compression method. If zero, Store is used.
	Method uint16

	// Modified is the modified time of the file.
	//
	// When reading, an extended timestamp is preferred over the legacy MS-DOS
	// date field, and the offset between the times is used as the timezone.
	// If only the MS-DOS date is present, the timezone is assumed to be UTC.
	//
	// When writing, an extended timestamp (which is timezone-agnostic) is
	// always emitted. The legacy MS-DOS date field is encoded according to the
	// location of the Modified time.
	Modified time.Time

	// ModifiedTime is an MS-DOS-encoded time.
	//
	// Deprecated: Use Modified instead.
	ModifiedTime uint16

	// ModifiedDate is an MS-DOS-encoded date.
	//
	// Deprecated: Use Modified instead.
	ModifiedDate uint16

	// CRC32 is the CRC32 checksum of the file content.
	CRC32 uint32

	// CompressedSize is the compressed size of the file in bytes.
	// If either the uncompressed or compressed size of the file
	// does not fit in 32 bits, CompressedSize is set to ^uint32(0).
	//
	// Deprecated: Use CompressedSize64 instead.
	CompressedSize uint32

	// UncompressedSize is the uncompressed size of the file in bytes.
	// If either the uncompressed or compressed size of the file
	// does not fit in 32 bits, UncompressedSize is set to ^uint32(0).
	//
	// Deprecated: Use UncompressedSize64 instead.
	UncompressedSize uint32

	// CompressedSize64 is the compressed size of the file in bytes.
	CompressedSize64 uint64

	// UncompressedSize64 is the uncompressed size of the file in bytes.
	UncompressedSize64 uint64

	// Extra are the extensible data fields. The writer automatically includes
	// the appropriate Zip64 field if necessary, and [Writer.Close] appends the
	// Central Directory version of the Zip64 field to Extra.
	Extra []byte

	ExternalAttrs uint32 // Meaning depends on CreatorVersion
}
    FileHeader describes a file within a ZIP file. See the ZIP specification for
    details.

[ZIP specification]: https://support.pkware.com/pkzip/appnote

func FileInfoHeader(fi fs.FileInfo) (*FileHeader, error)
    FileInfoHeader creates a partially-populated FileHeader from an fs.FileInfo.
    Because fs.FileInfo's Name method returns only the base name of the file
    it describes, it may be necessary to modify the Name field of the returned
    header to provide the full path name of the file. If compression is desired,
    callers should set the FileHeader.Method field; it is unset by default.

func (h *FileHeader) FileInfo() fs.FileInfo
    FileInfo returns an fs.FileInfo for the FileHeader.

func (h *FileHeader) ModTime() time.Time
    ModTime returns the modification time in UTC using the legacy [ModifiedDate]
    and [ModifiedTime] fields.

    Deprecated: Use [Modified] instead.

func (h *FileHeader) Mode() (mode fs.FileMode)
    Mode returns the permission and mode bits for the FileHeader.

func (h *FileHeader) SetModTime(t time.Time)
    SetModTime sets the [Modified], [ModifiedTime], and [ModifiedDate] fields to
    the given time in UTC.

    Deprecated: Use [Modified] instead.

func (h *FileHeader) SetMode(mode fs.FileMode)
    SetMode changes the permission and mode bits for the FileHeader.

type ReadCloser struct {
	Reader
	// Has unexported fields.
}
    A ReadCloser is a Reader that must be closed when no longer needed.

func OpenReader(name string) (*ReadCloser, error)
    OpenReader will open the Zip file specified by name and return a ReadCloser.

    If any file inside the archive uses a non-local name (as defined by
    filepath.IsLocal) or a name containing backslashes and the GODEBUG
    environment variable contains `zipinsecurepath=0`, OpenReader returns the
    reader with an ErrInsecurePath error. A future version of Go may introduce
    this behavior by default. Programs that want to accept non-local names can
    ignore the ErrInsecurePath error and use the returned reader.

func (rc *ReadCloser) Close() error
    Close closes the Zip file, rendering it unusable for I/O.

type Reader struct {
	File    []*File
	Comment string

	// Has unexported fields.
}
    A Reader serves content from a ZIP archive.

func NewReader(r io.ReaderAt, size int64) (*Reader, error)
    NewReader returns a new Reader reading from r, which is assumed to have the
    given size in bytes.

    If any file inside the archive uses a non-local name (as defined by
    filepath.IsLocal) or a name containing backslashes and the GODEBUG
    environment variable contains `zipinsecurepath=0`, NewReader returns the
    reader with an ErrInsecurePath error. A future version of Go may introduce
    this behavior by default. Programs that want to accept non-local names can
    ignore the ErrInsecurePath error and use the returned reader.

func (r *Reader) Open(name string) (fs.File, error)
    Open opens the named file in the ZIP archive, using the semantics of
    fs.FS.Open: paths are always slash separated, with no leading / or ../
    elements.

func (r *Reader) RegisterDecompressor(method uint16, dcomp Decompressor)
    RegisterDecompressor registers or overrides a custom decompressor for a
    specific method ID. If a decompressor for a given method is not found,
    Reader will default to looking up the decompressor at the package level.

type Writer struct {
	// Has unexported fields.
}
    Writer implements a zip file writer.

func NewWriter(w io.Writer) *Writer
    NewWriter returns a new Writer writing a zip file to w.

    Note that the exact bytes written to w are not covered by the Go 1
    compatibility promise. Callers, including tests, should not depend on the
    exact written bytes.

func (w *Writer) AddFS(fsys fs.FS) error
    AddFS adds the files from fs.FS to the archive. It walks the directory tree
    starting at the root of the filesystem adding each file to the zip using
    deflate while maintaining the directory structure.

func (w *Writer) Close() error
    Close finishes writing the zip file by writing the central directory.
    It does not close the underlying writer.

func (w *Writer) Copy(f *File) error
    Copy copies the file f (obtained from a Reader) into w. It copies the raw
    form directly bypassing decompression, compression, and validation.

func (w *Writer) Create(name string) (io.Writer, error)
    Create adds a file to the zip file using the provided name. It returns a
    Writer to which the file contents should be written. The file contents will
    be compressed using the Deflate method. The name must be a relative path:
    it must not start with a drive letter (e.g. C:) or leading slash, and only
    forward slashes are allowed. To create a directory instead of a file,
    add a trailing slash to the name. Duplicate names will not overwrite
    previous entries and are appended to the zip file. The file's contents
    must be written to the io.Writer before the next call to Writer.Create,
    Writer.CreateHeader, or Writer.Close.

func (w *Writer) CreateHeader(fh *FileHeader) (io.Writer, error)
    CreateHeader adds a file to the zip archive using the provided FileHeader
    for the file metadata. Writer takes ownership of fh and may mutate its
    fields. The caller must not modify fh after calling Writer.CreateHeader.

    This returns a Writer to which the file contents should be written.
    The file's contents must be written to the io.Writer before the next call to
    Writer.Create, Writer.CreateHeader, Writer.CreateRaw, or Writer.Close.

func (w *Writer) CreateRaw(fh *FileHeader) (io.Writer, error)
    CreateRaw adds a file to the zip archive using the provided FileHeader
    and returns a Writer to which the file contents should be written.
    The file's contents must be written to the io.Writer before the next call to
    Writer.Create, Writer.CreateHeader, Writer.CreateRaw, or Writer.Close.

    In contrast to Writer.CreateHeader, the bytes passed to Writer are not
    compressed.

    CreateRaw's argument is stored in w. If the argument is a pointer to the
    embedded FileHeader in a File obtained from a Reader created from in-memory
    data, then w will refer to all of that memory.

func (w *Writer) Flush() error
    Flush flushes any buffered data to the underlying writer. Calling Flush is
    not normally necessary; calling Close is sufficient.

func (w *Writer) RegisterCompressor(method uint16, comp Compressor)
    RegisterCompressor registers or overrides a custom compressor for a specific
    method ID. If a compressor for a given method is not found, Writer will
    default to looking up the compressor at the package level.

func (w *Writer) SetComment(comment string) error
    SetComment sets the end-of-central-directory comment field. It can only be
    called before Writer.Close.

func (w *Writer) SetOffset(n int64)
    SetOffset sets the offset of the beginning of the zip data within the
    underlying writer. It should be used when the zip data is appended to an
    existing file, such as a binary executable. It must be called before any
    data is written.

```
