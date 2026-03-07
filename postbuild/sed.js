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

    // console.log(
    //   `Successfully replaced "${srcString}" with "${dstString}" in ${sedFile}`,
    // );
  } catch (error) {
    console.error(`Error processing file ${sedFile}:`, error)
  }
}

module.exports = sed
