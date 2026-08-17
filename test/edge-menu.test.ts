import { describe, expect, it } from "vitest"
import { edgeMenuPosition } from "../src/lib/edge-menu.js"

describe("edgeMenuPosition", () => {
  it("places the menu at the cursor relative to the canvas", () => {
    expect(
      edgeMenuPosition({
        clientX: 120,
        clientY: 80,
        canvas: { left: 20, top: 10 },
      })
    ).toEqual({ x: 100, y: 70 })
  })

  it("falls back to client coords when the canvas origin is missing", () => {
    expect(edgeMenuPosition({ clientX: 40, clientY: 15 })).toEqual({ x: 40, y: 15 })
  })

  it("anchors below the mid-path control", () => {
    expect(
      edgeMenuPosition({
        clientX: 0,
        clientY: 0,
        canvas: { left: 10, top: 10 },
        control: { left: 50, bottom: 30 },
      })
    ).toEqual({ x: 40, y: 24 })
  })

  it("ignores cursor coords when a control box is provided", () => {
    expect(
      edgeMenuPosition({
        clientX: 999,
        clientY: 999,
        control: { left: 8, bottom: 12 },
      })
    ).toEqual({ x: 8, y: 16 })
  })
})
