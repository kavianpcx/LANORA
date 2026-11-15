#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{path::PathBuf, process::Stdio};
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct Engine {
    child: Mutex<Option<tokio::process::Child>>,
    config: Mutex<Option<PathBuf>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EngineConfig {
    network_name: String,
    network_secret: String,
    peer_url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    running: bool,
    virtual_ip: Option<String>,
    state: &'static str,
    error: Option<String>,
}

fn valid_config(cfg: &EngineConfig) -> bool {
    let name = cfg.network_name.strip_prefix("lanora-");
    if name.is_none_or(|s| s.len() != 32 || !s.bytes().all(|c| c.is_ascii_hexdigit())) {
        return false;
    }
    if cfg.network_secret.len() != 64 || !cfg.network_secret.bytes().all(|c| c.is_ascii_hexdigit()) {
        return false;
    }
    let Ok(url) = url::Url::parse(&cfg.peer_url) else { return false };
    matches!(url.scheme(), "tcp" | "udp")
        && url.host_str().is_some()
        && url.port().is_some()
        && url.username().is_empty()
        && url.password().is_none()
        && url.path().is_empty()
        && url.query().is_none()
        && url.fragment().is_none()
}

fn core_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().resource_dir().map(|p| p.join("easytier")).map_err(|e| e.to_string())
}

#[tauri::command]
async fn engine_start(state: State<'_, Engine>, app: tauri::AppHandle, cfg: EngineConfig) -> Result<(), String> {
    if !valid_config(&cfg) { return Err("Invalid room network configuration".into()); }
    let mut child = state.child.lock().await;
    if child.is_some() { return Err("Network engine is already running".into()); }
    let data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let config = data_dir.join("network.toml");
    let quote = |s: &str| serde_json::to_string(s).unwrap();
    // DHCP is assigned by EasyTier. No exit node or default route is configured.
    let contents = format!("instance_name = \"lanora-room\"\ndhcp = true\nlisteners = []\nexit_nodes = []\n\n[[peer]]\nuri = {}\n\n[network_identity]\nnetwork_name = {}\nnetwork_secret = {}\n\n[flags]\nenable_encryption = true\nenable_exit_node = false\n", quote(&cfg.peer_url), quote(&cfg.network_name), quote(&cfg.network_secret));
    std::fs::write(&config, contents).map_err(|e| e.to_string())?;
    #[cfg(unix)] {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&config, std::fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    #[cfg(windows)] let binary = "easytier-core.exe";
    #[cfg(not(windows))] let binary = "easytier-core";
    let launched = tokio::process::Command::new(core_dir(&app)?.join(binary))
        .arg("--config-file").arg(&config).arg("--disable-env-parsing")
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null())
        .kill_on_drop(true).spawn();
    match launched {
        Ok(process) => { *child = Some(process); *state.config.lock().await = Some(config); Ok(()) }
        Err(e) => { let _ = std::fs::remove_file(&config); Err(format!("Could not start EasyTier: {e}")) }
    }
}

fn find_ip(value: &Value) -> Option<String> {
    let obj = value.as_object()?;
    for key in ["virtual_ip", "ipv4", "virtualIp"] {
        if let Some(ip) = obj.get(key).and_then(Value::as_str) {
            if let Some(raw) = ip.split('/').next() {
                if raw.parse::<std::net::Ipv4Addr>().is_ok() { return Some(ip.to_owned()); }
            }
        }
    }
    for value in obj.values() { if let Some(ip) = find_ip(value) { return Some(ip); } }
    None
}

#[tauri::command]
async fn engine_status(state: State<'_, Engine>, app: tauri::AppHandle) -> Result<EngineStatus, String> {
    let mut child = state.child.lock().await;
    let Some(process) = child.as_mut() else { return Ok(EngineStatus { running: false, virtual_ip: None, state: "stopped", error: None }); };
    if let Some(code) = process.try_wait().map_err(|e| e.to_string())? {
        *child = None;
        drop(child);
        if let Some(path) = state.config.lock().await.take() { let _ = std::fs::remove_file(path); }
        return Ok(EngineStatus { running: false, virtual_ip: None, state: "failed", error: Some(format!("EasyTier exited: {code}")) });
    }
    drop(child);
    #[cfg(windows)] let binary = "easytier-cli.exe";
    #[cfg(not(windows))] let binary = "easytier-cli";
    let output = tokio::time::timeout(std::time::Duration::from_secs(4),
        tokio::process::Command::new(core_dir(&app)?.join(binary))
            .args(["-n", "lanora-room", "node", "-o", "json"])
            .stdin(Stdio::null()).output()).await;
    let ip = match output {
        Ok(Ok(out)) if out.status.success() => serde_json::from_slice::<Value>(&out.stdout).ok().and_then(|v| find_ip(&v)),
        _ => None,
    };
    Ok(EngineStatus { running: true, state: if ip.is_some() { "tunnel_ready" } else { "connecting" }, virtual_ip: ip, error: None })
}

#[tauri::command]
async fn engine_stop(state: State<'_, Engine>) -> Result<(), String> {
    if let Some(mut child) = state.child.lock().await.take() { child.kill().await.map_err(|e| e.to_string())?; }
    if let Some(path) = state.config.lock().await.take() { let _ = std::fs::remove_file(path); }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Engine { child: Mutex::new(None), config: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![engine_start, engine_status, engine_stop])
        .run(tauri::generate_context!()).expect("failed to run LANORA");
}
