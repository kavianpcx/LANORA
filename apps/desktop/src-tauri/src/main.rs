#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Deserialize;
use std::{net::Ipv4Addr, path::PathBuf, process::Stdio};
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct Engine { child: Mutex<Option<tokio::process::Child>>, config: Mutex<Option<PathBuf>> }
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
struct EngineConfig { network_name: String, network_secret: String, virtual_ip: String, peer_url: String }

#[tauri::command]
async fn engine_start(state: State<'_, Engine>, app: tauri::AppHandle, cfg: EngineConfig) -> Result<String,String> {
    if cfg.network_name.len()<8 || cfg.network_name.len()>64 { return Err("نام شبکه نامعتبر است".into()); }
    if cfg.network_secret.len()<32 || cfg.network_secret.len()>128 { return Err("کلید شبکه نامعتبر است".into()); }
    if !valid_ipv4_cidr(&cfg.virtual_ip) || !valid_peer(&cfg.peer_url) { return Err("تنظیمات اتصال نامعتبر است".into()); }
    let mut child=state.child.lock().await;
    if child.is_some(){ return Err("موتور شبکه از قبل فعال است".into()); }
    let path:PathBuf=app.path().app_local_data_dir().map_err(|e|e.to_string())?;
    std::fs::create_dir_all(&path).map_err(|e|e.to_string())?;
    let config=path.join("network.toml");
    let quoted=|s:&str| serde_json::to_string(s).unwrap();
    let text=format!("instance_name = \"lanora-room\"\nipv4 = {}\ndhcp = false\nlisteners = []\nexit_nodes = []\n\n[[peer]]\nuri = {}\n\n[network_identity]\nnetwork_name = {}\nnetwork_secret = {}\n\n[flags]\ndefault_protocol = \"udp\"\nenable_encryption = true\nenable_ipv6 = false\nenable_exit_node = false\ndisable_p2p = false\n",quoted(&cfg.virtual_ip),quoted(&cfg.peer_url),quoted(&cfg.network_name),quoted(&cfg.network_secret));
    std::fs::write(&config,text).map_err(|e|e.to_string())?;
    #[cfg(unix)] { use std::os::unix::fs::PermissionsExt; std::fs::set_permissions(&config,std::fs::Permissions::from_mode(0o600)).map_err(|e|e.to_string())?; }
    let resources=app.path().resource_dir().map_err(|e|e.to_string())?;
    #[cfg(target_os="windows")] let core=resources.join("easytier-core.exe");
    #[cfg(not(target_os="windows"))] let core=resources.join("easytier-core");
    let launched=match tokio::process::Command::new(core).arg("--config-file").arg(&config).arg("--disable-env-parsing").stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).kill_on_drop(true).spawn(){Ok(child)=>child,Err(e)=>{let _=std::fs::remove_file(&config);return Err(format!("اجرای موتور شبکه ناموفق بود: {e}"));}};
    *child=Some(launched);
    *state.config.lock().await=Some(config);
    Ok("starting".into())
}

#[tauri::command]
async fn engine_stop(state:State<'_,Engine>)->Result<(),String>{let mut guard=state.child.lock().await;if let Some(mut child)=guard.take(){child.kill().await.map_err(|e|e.to_string())?;}drop(guard);if let Some(path)=state.config.lock().await.take(){let _=std::fs::remove_file(path);}Ok(())}
fn valid_peer(s:&str)->bool{let Ok(url)=url::Url::parse(s) else{return false};["udp","tcp","wg","wss","ws"].contains(&url.scheme())&&url.host_str().is_some()&&url.username().is_empty()&&url.password().is_none()&&s.len()<256}
fn valid_ipv4_cidr(s:&str)->bool{let Some((ip,prefix))=s.split_once('/') else{return false};ip.parse::<Ipv4Addr>().is_ok()&&prefix.parse::<u8>().map(|p|p<=32).unwrap_or(false)}
fn main(){tauri::Builder::default().manage(Engine{child:Mutex::new(None),config:Mutex::new(None)}).invoke_handler(tauri::generate_handler![engine_start,engine_stop]).run(tauri::generate_context!()).expect("failed to run LANORA");}
