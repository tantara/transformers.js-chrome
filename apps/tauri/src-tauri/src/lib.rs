use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use encoding_rs::UTF_8;
use hf_hub::api::sync::ApiBuilder;
use hf_hub::api::Progress;
use hf_hub::Cache;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaChatMessage, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

const DEFAULT_MODEL_URL: &str = "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF";
const DEFAULT_MAX_TOKENS: usize = 512;
const DEFAULT_CONTEXT_SIZE: u32 = 4096;
const PROGRESS_EVENT: &str = "model-progress";

static BACKEND: OnceCell<LlamaBackend> = OnceCell::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChatMessagePayload {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct ChatRequest {
    messages: Vec<ChatMessagePayload>,
    model: ModelInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ModelInfo {
    repo: String,
    url: String,
    filename: String,
    path: String,
    downloaded: bool,
}

#[derive(Debug, Clone, Serialize)]
struct ChatResponse {
    message: ChatMessagePayload,
    model: ModelInfo,
}

#[derive(Debug, Clone, Serialize)]
struct ProgressEventPayload {
    stage: String,
    message: String,
    current: Option<usize>,
    total: Option<usize>,
    progress: Option<f64>,
    done: bool,
}

#[derive(Default)]
struct ModelStore {
    current_path: Option<PathBuf>,
    model: Option<Arc<LlamaModel>>,
}

#[derive(Clone, Default)]
struct AppState {
    store: Arc<Mutex<ModelStore>>,
}

#[derive(Clone)]
struct DownloadProgress {
    app: AppHandle,
    current: usize,
    total: usize,
    last_bucket: usize,
}

impl DownloadProgress {
    fn new(app: AppHandle) -> Self {
        Self {
            app,
            current: 0,
            total: 0,
            last_bucket: 0,
        }
    }
}

impl Progress for DownloadProgress {
    fn init(&mut self, size: usize, filename: &str) {
        self.total = size;
        self.current = 0;
        self.last_bucket = 0;
        emit_progress(
            &self.app,
            "downloading",
            format!("Downloading {filename}..."),
            Some(0),
            Some(size),
            false,
        );
    }

    fn update(&mut self, size: usize) {
        self.current += size;
        if self.total == 0 {
            return;
        }

        let bucket = self.current.saturating_mul(100) / self.total;
        if bucket > self.last_bucket {
            self.last_bucket = bucket;
            emit_progress(
                &self.app,
                "downloading",
                "Downloading model...".to_string(),
                Some(self.current.min(self.total)),
                Some(self.total),
                false,
            );
        }
    }

    fn finish(&mut self) {
        emit_progress(
            &self.app,
            "downloaded",
            "Download complete.".to_string(),
            Some(self.total),
            Some(self.total),
            false,
        );
    }
}

fn emit_progress(
    app: &AppHandle,
    stage: impl Into<String>,
    message: impl Into<String>,
    current: Option<usize>,
    total: Option<usize>,
    done: bool,
) {
    let progress = match (current, total) {
        (Some(current), Some(total)) if total > 0 => Some(current as f64 / total as f64),
        _ => None,
    };

    let _ = app.emit(
        PROGRESS_EVENT,
        ProgressEventPayload {
            stage: stage.into(),
            message: message.into(),
            current,
            total,
            progress,
            done,
        },
    );
}

fn backend() -> Result<&'static LlamaBackend, String> {
    BACKEND.get_or_try_init(|| {
        let mut backend = LlamaBackend::init().map_err(|error| error.to_string())?;
        backend.void_logs();
        Ok(backend)
    })
}

fn normalize_model_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim();
    if trimmed.is_empty() {
        return Err("Enter a Hugging Face model URL.".to_string());
    }

    let stripped = trimmed
        .strip_prefix("https://huggingface.co/")
        .unwrap_or(trimmed)
        .trim_matches('/');

    let parts = stripped
        .split('/')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>();

    if parts.len() < 2 {
        return Err(
            "Use a Hugging Face model repo URL like https://huggingface.co/owner/repo".to_string(),
        );
    }

    Ok(format!("https://huggingface.co/{}/{}", parts[0], parts[1]))
}

fn repo_from_url(url: &str) -> Result<String, String> {
    let normalized = normalize_model_url(url)?;
    normalized
        .strip_prefix("https://huggingface.co/")
        .map(str::to_string)
        .ok_or_else(|| "Invalid Hugging Face URL.".to_string())
}

fn cache_path_for_model(model: &ModelInfo) -> Option<PathBuf> {
    Cache::from_env()
        .model(model.repo.clone())
        .get(&model.filename)
}

fn preferred_gguf_filename(repo: &str) -> Result<String, String> {
    let cache = Cache::from_env();
    let api = ApiBuilder::from_cache(cache)
        .with_progress(false)
        .build()
        .map_err(|error| error.to_string())?;

    let info = api
        .model(repo.to_owned())
        .info()
        .map_err(|error| error.to_string())?;

    let mut ggufs = info
        .siblings
        .into_iter()
        .map(|item| item.rfilename)
        .filter(|filename| filename.to_ascii_lowercase().ends_with(".gguf"))
        .collect::<Vec<_>>();

    if ggufs.is_empty() {
        return Err(
            "Only GGUF checkpoints are supported, and no GGUF files were found in that repo."
                .to_string(),
        );
    }

    ggufs.sort();

    if let Some(filename) = ggufs
        .iter()
        .find(|filename| filename.to_ascii_lowercase().contains("q4_k_m.gguf"))
    {
        return Ok(filename.clone());
    }

    Ok(ggufs.remove(0))
}

fn resolve_model_info(url: &str) -> Result<ModelInfo, String> {
    let normalized_url = normalize_model_url(url)?;
    let repo = repo_from_url(&normalized_url)?;
    let filename = preferred_gguf_filename(&repo)?;
    let path = cache_path_for_model(&ModelInfo {
        repo: repo.clone(),
        url: normalized_url.clone(),
        filename: filename.clone(),
        path: String::new(),
        downloaded: false,
    })
    .map(|path| path.display().to_string())
    .unwrap_or_default();

    Ok(ModelInfo {
        repo,
        url: normalized_url,
        filename,
        downloaded: !path.is_empty(),
        path,
    })
}

fn ensure_model_cached(app: &AppHandle, model: &ModelInfo) -> Result<ModelInfo, String> {
    if let Some(path) = cache_path_for_model(model) {
        emit_progress(
            app,
            "cache-hit",
            "Using cached GGUF checkpoint.".to_string(),
            None,
            None,
            false,
        );

        return Ok(ModelInfo {
            path: path.display().to_string(),
            downloaded: true,
            ..model.clone()
        });
    }

    let cache = Cache::from_env();
    let api = ApiBuilder::from_cache(cache)
        .with_progress(false)
        .build()
        .map_err(|error| error.to_string())?;

    let path = api
        .model(model.repo.clone())
        .download_with_progress(&model.filename, DownloadProgress::new(app.clone()))
        .map_err(|error| error.to_string())?;

    Ok(ModelInfo {
        path: path.display().to_string(),
        downloaded: true,
        ..model.clone()
    })
}

fn ensure_loaded_model(
    app: &AppHandle,
    store: &Arc<Mutex<ModelStore>>,
    model: &ModelInfo,
) -> Result<(Arc<LlamaModel>, ModelInfo), String> {
    let cached_model = ensure_model_cached(app, model)?;
    let model_path = PathBuf::from(&cached_model.path);

    if let Some(existing) = {
        let guard = store
            .lock()
            .map_err(|_| "Model store lock poisoned".to_string())?;
        if guard.current_path.as_ref() == Some(&model_path) {
            guard.model.clone()
        } else {
            None
        }
    } {
        emit_progress(
            app,
            "model-ready",
            "Model already loaded in memory.".to_string(),
            None,
            None,
            false,
        );
        return Ok((existing, cached_model));
    }

    emit_progress(
        app,
        "loading-model",
        "Loading model into memory...".to_string(),
        None,
        None,
        false,
    );

    let params = LlamaModelParams::default().with_n_gpu_layers(0);
    let loaded_model = Arc::new(
        LlamaModel::load_from_file(backend()?, &model_path, &params)
            .map_err(|error| error.to_string())?,
    );

    let mut guard = store
        .lock()
        .map_err(|_| "Model store lock poisoned".to_string())?;
    guard.current_path = Some(model_path);
    guard.model = Some(loaded_model.clone());

    Ok((loaded_model, cached_model))
}

fn generation_seed() -> u32 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.subsec_nanos())
        .unwrap_or(0)
}

fn thread_count() -> i32 {
    std::thread::available_parallelism()
        .map(|parallelism| parallelism.get())
        .unwrap_or(4)
        .min(i32::MAX as usize) as i32
}

fn generate_reply(
    app: &AppHandle,
    model: &LlamaModel,
    messages: &[ChatMessagePayload],
) -> Result<String, String> {
    if messages.is_empty() {
        return Err("At least one message is required.".to_string());
    }

    emit_progress(
        app,
        "preparing-prompt",
        "Preparing prompt...".to_string(),
        None,
        None,
        false,
    );

    let template = model
        .chat_template(None)
        .map_err(|error| error.to_string())?;
    let chat_messages = messages
        .iter()
        .map(|message| {
            LlamaChatMessage::new(message.role.clone(), message.content.clone())
                .map_err(|error| error.to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;

    let prompt = model
        .apply_chat_template(&template, &chat_messages, true)
        .map_err(|error| error.to_string())?;

    let prompt_tokens = model
        .str_to_token(&prompt, AddBos::Never)
        .map_err(|error| error.to_string())?;

    let context_size = DEFAULT_CONTEXT_SIZE as usize;
    if prompt_tokens.len() >= context_size.saturating_sub(32) {
        return Err("Conversation is too long for the configured context window.".to_string());
    }

    let threads = thread_count();
    let context_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(DEFAULT_CONTEXT_SIZE))
        .with_n_batch(context_size as u32)
        .with_n_threads(threads)
        .with_n_threads_batch(threads);

    let mut ctx = model
        .new_context(backend()?, context_params)
        .map_err(|error| error.to_string())?;

    emit_progress(
        app,
        "warming-up",
        "Evaluating prompt...".to_string(),
        None,
        None,
        false,
    );

    let mut prompt_batch = LlamaBatch::new(prompt_tokens.len(), 1);
    prompt_batch
        .add_sequence(&prompt_tokens, 0, false)
        .map_err(|error| error.to_string())?;
    ctx.decode(&mut prompt_batch)
        .map_err(|error| error.to_string())?;

    emit_progress(
        app,
        "generating",
        "Generating reply...".to_string(),
        None,
        None,
        false,
    );

    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::temp(0.7),
        LlamaSampler::top_k(40),
        LlamaSampler::top_p(0.95, 1),
        LlamaSampler::dist(generation_seed()),
    ]);

    let mut decoder = UTF_8.new_decoder();
    let mut output = String::new();
    let mut position = i32::try_from(prompt_tokens.len())
        .map_err(|_| "Prompt token count exceeds supported position range.".to_string())?;

    for _ in 0..DEFAULT_MAX_TOKENS {
        let mut candidates = ctx.token_data_array();
        candidates.apply_sampler(&sampler);
        let token = candidates
            .selected_token()
            .ok_or_else(|| "Sampling failed to select a token.".to_string())?;

        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        let piece = model
            .token_to_piece(token, &mut decoder, false, None)
            .map_err(|error| error.to_string())?;
        output.push_str(&piece);

        if usize::try_from(position).unwrap_or(usize::MAX) >= context_size.saturating_sub(1) {
            break;
        }

        let mut decode_batch = LlamaBatch::new(1, 1);
        decode_batch
            .add(token, position, &[0], true)
            .map_err(|error| error.to_string())?;
        ctx.decode(&mut decode_batch)
            .map_err(|error| error.to_string())?;
        position += 1;
    }

    let trimmed = output.trim().to_owned();
    if trimmed.is_empty() {
        return Err("Model returned an empty response.".to_string());
    }

    Ok(trimmed)
}

fn delete_cached_model(
    store: &Arc<Mutex<ModelStore>>,
    model: &ModelInfo,
) -> Result<ModelInfo, String> {
    let Some(pointer_path) = cache_path_for_model(model) else {
        return Ok(ModelInfo {
            path: String::new(),
            downloaded: false,
            ..model.clone()
        });
    };

    let blob_path = std::fs::canonicalize(&pointer_path).unwrap_or_else(|_| pointer_path.clone());

    {
        let mut guard = store
            .lock()
            .map_err(|_| "Model store lock poisoned".to_string())?;
        if guard.current_path.as_ref() == Some(&pointer_path) {
            guard.current_path = None;
            guard.model = None;
        }
    }

    let _ = std::fs::remove_file(&pointer_path);
    if blob_path != pointer_path {
        let _ = std::fs::remove_file(&blob_path);
    }

    Ok(ModelInfo {
        path: String::new(),
        downloaded: false,
        ..model.clone()
    })
}

#[tauri::command]
async fn default_model() -> Result<ModelInfo, String> {
    resolve_model_info(DEFAULT_MODEL_URL)
}

#[tauri::command]
async fn resolve_model(url: String) -> Result<ModelInfo, String> {
    tauri::async_runtime::spawn_blocking(move || resolve_model_info(&url))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn delete_model(
    state: tauri::State<'_, AppState>,
    model: ModelInfo,
) -> Result<ModelInfo, String> {
    let store = state.store.clone();

    tauri::async_runtime::spawn_blocking(move || delete_cached_model(&store, &model))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn chat(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    let store = state.store.clone();

    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(
            &app,
            "checking-cache",
            "Checking local model cache...".to_string(),
            None,
            None,
            false,
        );
        let (model, resolved_model) = ensure_loaded_model(&app, &store, &request.model)?;
        let reply = generate_reply(&app, &model, &request.messages)?;

        emit_progress(
            &app,
            "complete",
            "Reply ready.".to_string(),
            None,
            None,
            true,
        );

        Ok(ChatResponse {
            message: ChatMessagePayload {
                role: "assistant".to_string(),
                content: reply,
            },
            model: resolved_model,
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            default_model,
            resolve_model,
            delete_model,
            chat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
