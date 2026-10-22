// cloudflare/src/logic/gzip.ts

// 文字列を、gzip圧縮したバイト列にする
export const gzipText = async (text: string): Promise<ArrayBuffer> => {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
};

// R2のオブジェクト(gzip圧縮されたJSON)を読んで、JSONとして返す
export const readGzipJson = async <T>(object: R2ObjectBody): Promise<T> => {
  const stream = object.body.pipeThrough(new DecompressionStream("gzip"));
  return (await new Response(stream).json()) as T;
};