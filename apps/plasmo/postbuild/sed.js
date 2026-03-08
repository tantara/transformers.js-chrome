const fs = require("fs")

const sed = () => {
  //   console.log("func:sed");
  //   console.log(
  //     Object.entries(process.env).filter(([key]) => key.startsWith("PLASMO_")),
  //   );
  const targetDir = `${process.env.PLASMO_BUILD_DIR}/${process.env.PLASMO_TARGET}-${process.env.PLASMO_TAG}`
  //   console.log(targetDir);

  // implement sed file
  const sedFile = `${targetDir}/static/background/index.js`
  //   console.log(sedFile);
  try {
    // Read the file content
    const content = fs.readFileSync(sedFile, "utf8")

    // Replace all occurrences of import.meta.url with self.location.href
    // This covers new URL(import.meta.url), import.meta.url comparisons, etc.
    let updatedContent = content.replace(
      /import\.meta\.url/g,
      "self.location.href"
    )

    // Parcel also inlines import.meta.url at build time into literal
    // "file:///node_modules/..." strings (e.g. for onnxruntime-web's WASM
    // path resolution and @huggingface/transformers env.js).  These paths
    // don't exist inside a Chrome extension, so replace them too.
    updatedContent = updatedContent.replace(
      /"file:\/\/\/node_modules\/[^"]+"/g,
      "self.location.href"
    )

    // Fix Parcel dep map mismatch: Parcel maps bare Node builtins (e.g. "fs")
    // to "node:fs" in the dependency map, but emits require("fs") in the code.
    // Rewrite the require calls to use the "node:" prefix so they resolve correctly.
    // Handles minified single-letter requires like e("fs") and unminified require("fs").
    const builtins = ["fs", "path", "url", "stream", "stream/promises"]
    for (const mod of builtins) {
      const patterns = [
        new RegExp(`([a-z])\\("${mod}"\\)`, "g"),
        new RegExp(`require\\("${mod}"\\)`, "g"),
      ]
      for (const pattern of patterns) {
        updatedContent = updatedContent.replace(pattern, (match) =>
          match.replace(`"${mod}"`, `"node:${mod}"`)
        )
      }
    }

    // Write the modified content back to the file
    fs.writeFileSync(sedFile, updatedContent, "utf8")

    // Copy MathJax script and fonts into the build so it can be loaded as a chrome-extension:// script
    const mathJaxSrc = `${process.cwd()}/src/thirdparty/mathjax/3.2.2/es5/tex-mml-chtml.js`
    const mathJaxDst = `${targetDir}/static/mathjax/tex-mml-chtml.js`
    fs.mkdirSync(`${targetDir}/static/mathjax`, { recursive: true })
    fs.copyFileSync(mathJaxSrc, mathJaxDst)

    // Resolve mathjax-full package location (works across monorepo layouts)
    const mathjaxDir = require.resolve("mathjax-full/package.json").replace(/\/package\.json$/, "")

    // Copy MathJax TeX extensions — MathJax autoloads these at runtime (e.g. boldsymbol, mhchem)
    const extSrc = `${mathjaxDir}/es5/input/tex/extensions`
    const extDst = `${targetDir}/static/mathjax/input/tex/extensions`
    fs.mkdirSync(extDst, { recursive: true })
    for (const file of fs.readdirSync(extSrc)) {
      fs.copyFileSync(`${extSrc}/${file}`, `${extDst}/${file}`)
    }

    // Copy MathJax CHTML fonts (woff-v2) — MathJax resolves them relative to the script location
    const fontsSrc = `${mathjaxDir}/es5/output/chtml/fonts/woff-v2`
    const fontsDst = `${targetDir}/static/mathjax/output/chtml/fonts/woff-v2`
    fs.mkdirSync(fontsDst, { recursive: true })
    for (const file of fs.readdirSync(fontsSrc)) {
      fs.copyFileSync(`${fontsSrc}/${file}`, `${fontsDst}/${file}`)
    }

    // Patch Firefox manifest: add sidebar_action and clean up Chrome-only entries
    const target = process.env.PLASMO_TARGET || ""
    if (target.startsWith("firefox")) {
      const manifestPath = `${targetDir}/manifest.json`
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

        // Firefox requires an explicit addon ID for the storage API to work
        // with temporary add-ons (about:debugging → Load Temporary Add-on)
        manifest.browser_specific_settings = {
          gecko: {
            id: "private-ai-assistant@tinywhale.com",
            strict_min_version: "109.0"
          }
        }

        // Add sidebar_action so the sidepanel page opens in Firefox's sidebar
        manifest.sidebar_action = {
          default_panel: "sidepanel.html",
          default_title: manifest.name || "Private AI Assistant",
          default_icon: manifest.icons
        }

        // Remove Chrome-only sidePanel permission (Firefox ignores it, but keep manifest clean)
        if (manifest.permissions) {
          manifest.permissions = manifest.permissions.filter(p => p !== "sidePanel")
        }

        // Firefox MV2 requires explicit host permissions for cross-origin fetch
        // (needed to download models from Hugging Face)
        if (!manifest.permissions.includes("<all_urls>")) {
          manifest.permissions.push("<all_urls>")
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8")
      } catch (e) {
        console.error("Warning: could not patch Firefox manifest:", e.message)
      }
    }
  } catch (error) {
    console.error(`Error processing file ${sedFile}:`, error)
  }
}

module.exports = sed
