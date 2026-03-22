# TinyWhale Tauri

Desktop chat app backed by `llama-cpp-rs` and the default GGUF model:

- Repo: `unsloth/Qwen3.5-0.8B-GGUF`
- File: `Qwen3.5-0.8B-Q4_K_M.gguf`

## Run

From the workspace root:

```bash
pnpm run dev:tauri
```

The first model preparation downloads the GGUF into the local Hugging Face cache, then loads it into memory for chat requests.

## Notes

- `llama-cpp-rs` uses `bindgen`, so `clang` must be available on the machine.
- The current setup is a basic local chat slice: one default model, fixed generation settings, no streaming yet.
