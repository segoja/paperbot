#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tokio;

#[tauri::command]
async fn binary_loader(filepath: String) -> Vec<u8> {
  tokio::fs::read(filepath).await.unwrap().to_owned()
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![binary_loader])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}