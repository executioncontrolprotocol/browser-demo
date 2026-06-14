import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { loader } from "@monaco-editor/react"
import { App } from "./App.js"
import { configureFluentMonaco } from "./lib/fluent-monaco-config.js"
import "./styles/globals.css"

void loader.init().then((monaco) => {
  configureFluentMonaco(monaco)
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
