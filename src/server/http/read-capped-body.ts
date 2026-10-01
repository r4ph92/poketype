export type CappedBody = { kind: 'text'; text: string } | { kind: 'too-large' } | { kind: 'unreadable' };

const tooLarge: CappedBody = { kind: 'too-large' };

// Reads the stream itself rather than trusting Content-Length, which a chunked request leaves out.
export async function readCappedBody(request: Request, maxBytes: number): Promise<CappedBody> {
  if (!request.body) return { kind: 'text', text: '' };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    totalBytes += chunk.value.byteLength;
    if (totalBytes > maxBytes) return reader.cancel().then(() => tooLarge);
    chunks.push(chunk.value);
  }
  return decodeUtf8(chunks, totalBytes);
}

function decodeUtf8(chunks: Uint8Array[], totalBytes: number): CappedBody {
  const bytes = new Uint8Array(totalBytes);
  chunks.reduce((offset, chunk) => {
    bytes.set(chunk, offset);
    return offset + chunk.byteLength;
  }, 0);
  try {
    return { kind: 'text', text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { kind: 'unreadable' };
  }
}
