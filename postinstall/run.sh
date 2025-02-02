#!/bin/bash

rm -rf node_modules/@huggingface/transformers/dist/*.{js,cjs,mjs,map}

sed -i '' 's/const IS_BROWSER_ENV = typeof window.*$/\/\/ const IS_BROWSER_ENV = typeof window !== "undefined" \&\& typeof window.document !== "undefined";\
const IS_BROWSER_ENV = true;/' node_modules/@huggingface/transformers/src/env.js

sed -i '' 's|https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML||g' node_modules/better-react-mathjax/MathJaxContext/MathJaxContext.js
sed -i '' 's|https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js||g' node_modules/better-react-mathjax/MathJaxContext/MathJaxContext.js
sed -i '' 's|https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML||g' node_modules/better-react-mathjax/esm/MathJaxContext/MathJaxContext.js
sed -i '' 's|https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js||g' node_modules/better-react-mathjax/esm/MathJaxContext/MathJaxContext.js
