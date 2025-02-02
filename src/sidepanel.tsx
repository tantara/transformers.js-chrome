import "~/src/index.css"

import { MathJaxContext } from "better-react-mathjax"
import mathJaxJs from "raw:~/thirdparty/mathjax/3.2.2/es5/tex-mml-chtml.js"

import Chat from "~/components/Chat"

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
    <MathJaxContext config={config} src={mathJaxJs}>
      <Chat />
    </MathJaxContext>
  )
}

export default ChromeSidePanel
