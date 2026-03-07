import "~/src/index.css"

import { MathJaxContext } from "better-react-mathjax"

import Chat from "~/components/Chat"

const mathJaxSrc = chrome.runtime.getURL("static/mathjax/tex-mml-chtml.js")

function ChromeSidePanel() {
  const config = {
    tex: {
      inlineMath: [
        ["$", "$"],
        ["\\(", "\\)"]
      ]
    },
    svg: {
      fontCache: "global"
    }
  }
  return (
    <MathJaxContext config={config} version={3} src={mathJaxSrc}>
      <Chat />
    </MathJaxContext>
  )
}

export default ChromeSidePanel
