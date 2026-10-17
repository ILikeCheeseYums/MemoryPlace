/**
 * Ultra-lightweight zero-dependency client-side ZIP generator.
 * Stores files using standard ZIP specification (Store method 0, no compression).
 */

// Precomputed CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(bytes) {
  let c = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ bytes[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

export function createZip(files) {
  // files is an array of { name: string, content: string | Uint8Array }
  const localHeaders = [];
  const centralHeaders = [];
  let currentOffset = 0;

  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate()) &
    0xffff;

  const encoder = new TextEncoder();

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes =
      typeof file.content === "string"
        ? encoder.encode(file.content)
        : file.content instanceof Uint8Array
        ? file.content
        : new Uint8Array(file.content);

    const size = contentBytes.length;
    const crc = crc32(contentBytes);

    // Local Header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature
    localView.setUint16(4, 20, true); // Version needed to extract
    localView.setUint16(6, 0, true); // General purpose bit flag
    localView.setUint16(8, 0, true); // Compression method (0 = store)
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true); // Compressed size
    localView.setUint32(22, size, true); // Uncompressed size
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    // Central Directory Header (46 bytes + name length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true); // Central directory file header signature
    centralView.setUint16(4, 20, true); // Version made by
    centralView.setUint16(6, 20, true); // Version needed
    centralView.setUint16(8, 0, true); // Bit flag
    centralView.setUint16(10, 0, true); // Method
    centralView.setUint16(12, dosTime, true);
    centralView.setUint14 = dosDate;
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true); // Extra field length
    centralView.setUint16(32, 0, true); // Comment length
    centralView.setUint16(34, 0, true); // Disk start
    centralView.setUint16(36, 0, true); // Internal attributes
    centralView.setUint32(38, 0, true); // External attributes
    centralView.setUint32(42, currentOffset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    localHeaders.push(localHeader, contentBytes);
    centralHeaders.push(centralHeader);

    currentOffset += localHeader.length + contentBytes.length;
  }

  const centralDirOffset = currentOffset;
  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, files.length, true); // Total entries this disk
  eocdView.setUint16(10, files.length, true); // Total entries
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirOffset, true);
  eocdView.setUint16(20, 0, true); // Comment length

  return new Blob([...localHeaders, ...centralHeaders, eocd], {
    type: "application/zip",
  });
}

