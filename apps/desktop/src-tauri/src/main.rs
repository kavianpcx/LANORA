#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{io::Write, path::PathBuf, process::Stdio};
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct Engine {
    child: Mutex<Option<tokio::process::Child>>,
    config: Mutex<Option<PathBuf>>,
    rpc_port: Mutex<u16>,
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
    app.path().resource_dir().map(|p| p.join("resources").join("easytier")).map_err(|e| e.to_string())
}

#[tauri::command]
async fn engine_start(state: State<'_, Engine>, app: tauri::AppHandle, cfg: EngineConfig) -> Result<(), String> {
    if !valid_config(&cfg) { return Err("Invalid room network configuration".into()); }
    let mut child = state.child.lock().await;
    if child.is_some() { return Err("Network engine is already running".into()); }
    let data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    // Bind-check an ephemeral local RPC port instead of colliding with another
    // EasyTier installation on its default 15888 port.
    let listener = std::net::TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let config = data_dir.join(format!("network-{}-{}.toml", std::process::id(), port));
    let quote = |s: &str| serde_json::to_string(s).unwrap();
    // DHCP is assigned by EasyTier. No exit node or default route is configured.
    let contents = format!("instance_name = \"lanora-room\"\ndhcp = true\nstun_servers = []\nstun_servers_v6 = []\nrpc_portal = \"127.0.0.1:{port}\"\nlisteners = []\nexit_nodes = []\n\n[[peer]]\nuri = {}\n\n[network_identity]\nnetwork_name = {}\nnetwork_secret = {}\n\n[flags]\nenable_encryption = true\nenable_exit_node = false\n", quote(&cfg.peer_url), quote(&cfg.network_name), quote(&cfg.network_secret));
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)] {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let written = options.open(&config).and_then(|mut file| file.write_all(contents.as_bytes()));
    if let Err(e) = written { let _ = std::fs::remove_file(&config); return Err(e.to_string()); }
    drop(listener);
    #[cfg(windows)] let binary = "easytier-core.exe";
    #[cfg(not(windows))] let binary = "easytier-core";
    let directory = match core_dir(&app) { Ok(path) => path, Err(e) => { let _ = std::fs::remove_file(&config); return Err(e); } };
    let mut command = tokio::process::Command::new(directory.join(binary));
    #[cfg(windows)] command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    let launched = command
        .arg("--config-file").arg(&config).arg("--disable-env-parsing")
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null())
        .kill_on_drop(true).spawn();
    match launched {
        Ok(process) => { *child = Some(process); *state.config.lock().await = Some(config); *state.rpc_port.lock().await = port; Ok(()) }
        Err(e) => { let _ = std::fs::remove_file(&config); Err(format!("Could not start EasyTier: {e}")) }
    }
}

// v2.6.4 `-o json node` exposes ipv4_addr. Never search arbitrary nested
// fields: those include public/interface IPs and configuration secrets.
fn find_ip(value: &Value) -> Option<String> {
    let raw = value.get("ipv4_addr")?.as_str()?.split('/').next()?;
    let ip = raw.parse::<std::net::Ipv4Addr>().ok()?;
    if ip.is_unspecified() || ip.is_loopback() || ip.is_multicast() || ip.is_broadcast() { return None; }
    Some(ip.to_string())
}

#[tauri::command]
async fn engine_status(state: State<'_, Engine>, app: tauri::AppHandle) -> Result<EngineStatus, String> {
    let mut child = state.child.lock().await;
    let Some(process) = child.as_mut() else { return Ok(EngineStatus { running: false, virtual_ip: None, state: "stopped", error: None }); };
    if let Some(code) = process.try_wait().map_err(|e| e.to_string())? {
        *child = None;
        if let Some(path) = state.config.lock().await.take() { let _ = std::fs::remove_file(path); }
        return Ok(EngineStatus { running: false, virtual_ip: None, state: "failed", error: Some(format!("EasyTier exited: {code}")) });
    }
    let portal = format!("127.0.0.1:{}", *state.rpc_port.lock().await);
    #[cfg(windows)] let binary = "easytier-cli.exe";
    #[cfg(not(windows))] let binary = "easytier-cli";
    let mut command = tokio::process::Command::new(core_dir(&app)?.join(binary));
    #[cfg(windows)] command.creation_flags(0x08000000);
    let output = tokio::time::timeout(std::time::Duration::from_secs(4),
        command.args(["-p", &portal, "-n", "lanora-room", "-o", "json", "node"])
            .stdin(Stdio::null()).kill_on_drop(true).output()).await;
    let ip = match output {
        Ok(Ok(out)) if out.status.success() => serde_json::from_slice::<Value>(&out.stdout).ok().and_then(|v| find_ip(&v)),
        _ => None,
    };
    Ok(EngineStatus { running: true, state: if ip.is_some() { "tunnel_ready" } else { "connecting" }, virtual_ip: ip, error: None })
}

#[tauri::command]
async fn engine_stop(state: State<'_, Engine>) -> Result<(), String> {
    let mut guard = state.child.lock().await;
    if let Some(child) = guard.as_mut() {
        if child.try_wait().map_err(|e| e.to_string())?.is_none() {
            child.kill().await.map_err(|e| e.to_string())?;
        }
    }
    *guard = None;
    if let Some(path) = state.config.lock().await.take() { let _ = std::fs::remove_file(path); }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .manage(Engine { child: Mutex::new(None), config: Mutex::new(None), rpc_port: Mutex::new(0) })
        .invoke_handler(tauri::generate_handler![engine_start, engine_status, engine_stop])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let window = window.clone();
                tauri::async_runtime::spawn(async move {
                    if engine_stop(window.state::<Engine>()).await.is_ok() {
                        let _ = window.destroy();
                    }
                });
            }
        })
        .run(tauri::generate_context!()).expect("failed to run LANORA");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn reads_only_reported_overlay_ip() {
        assert_eq!(find_ip(&serde_json::json!({"ipv4_addr":"10.126.1.2/24"})), Some("10.126.1.2".into()));
        assert_eq!(find_ip(&serde_json::json!({"ip_list":{"ipv4":"192.168.1.2"}})), None);
        assert_eq!(find_ip(&serde_json::json!({"ipv4_addr":"0.0.0.0"})), None);
        assert_eq!(find_ip(&serde_json::json!({"ipv4_addr":"not an address"})), None);
    }
    #[test] fn refuses_commands_and_untrusted_network_names() {
        let mut c=EngineConfig{network_name:format!("lanora-{}","a".repeat(32)),network_secret:"b".repeat(64),peer_url:"tcp://example.org:11010".into()};
        assert!(valid_config(&c)); c.peer_url="tcp://user:password@example.org:11010".into(); assert!(!valid_config(&c));
        c.peer_url="file:///bin/sh".into(); assert!(!valid_config(&c));
    }
}
