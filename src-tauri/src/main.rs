#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tokio;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![file_writer,binary_loader,text_reader])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[allow(unused_must_use)]
#[tauri::command]
async fn file_writer(filepath: String, filecontent: String) -> Result<(), String> {  
  std::fs::write(&filepath, &filecontent).map_err(|e| e.to_string());    
  Ok(())
}

#[tauri::command]
async fn binary_loader(filepath: String) -> Vec<u8> {
  tokio::fs::read(filepath).await.unwrap().to_owned()
}

#[tauri::command]
async fn text_reader(filepath: String) -> String {
    let vec =  tokio::fs::read(filepath).await.unwrap();
    std::str::from_utf8(vec.as_slice()).unwrap().to_owned()
}
