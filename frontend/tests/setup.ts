/**
 * jsdom's Blob/File implementation predates `text()` and `arrayBuffer()`,
 * which every supported browser has. Without them, anything that reads a
 * File fails in tests only. Polyfill via FileReader, which jsdom does have.
 */
function readAs(blob: Blob, as: "text" | "arrayBuffer"): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string | ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    if (as === "text") reader.readAsText(blob);
    else reader.readAsArrayBuffer(blob);
  });
}

if (typeof Blob !== "undefined") {
  if (typeof Blob.prototype.text !== "function") {
    Blob.prototype.text = function text(this: Blob) {
      return readAs(this, "text") as Promise<string>;
    };
  }
  if (typeof Blob.prototype.arrayBuffer !== "function") {
    Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob) {
      return readAs(this, "arrayBuffer") as Promise<ArrayBuffer>;
    };
  }
}
