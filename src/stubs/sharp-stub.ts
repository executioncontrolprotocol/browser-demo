/** Vite stub — native sharp is unavailable in the browser bundle. */
export default function sharpStub(): never {
  throw new Error(
    "image-sharp requires the native sharp module (Node runtime). Image processing steps cannot run in the browser."
  )
}
