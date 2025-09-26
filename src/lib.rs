//! Biblioteca WebAssembly para validar documentos UBL

use wasm_bindgen::prelude::*;
use validador::ValidadorUBL;

mod validador;

/// Valida un documento UBL desde JavaScript
/// 
/// # Argumentos
/// * `xml_content` - Contenido XML del documento UBL como string
/// 
/// # Retorna
/// * `Ok(String)` - "Válido" si el documento es válido
/// * `Err(String)` - Mensaje de error si el documento es inválido
#[wasm_bindgen]
pub fn validar_ubl(xml_content: &str) -> Result<String, String> {
    // Crear un validador
    let mut validador = ValidadorUBL::new();
    
    // Validar contenido
    match validador.validar_contenido(xml_content) {
        Ok(_) => Ok("Válido".to_string()),
        Err(e) => {
            let elementos_faltantes = validador.elementos_faltantes();
            if elementos_faltantes.is_empty() {
                Err(format!("Error: {}", e))
            } else {
                Err(format!("Faltan elementos: {}", elementos_faltantes.join(", ")))
            }
        }
    }
}

/// Obtiene la versión del validador
#[wasm_bindgen]
pub fn version() -> String {
    "1.0.0".to_string()
}

/// Obtiene información sobre los elementos UBL requeridos
#[wasm_bindgen]
pub fn elementos_requeridos() -> String {
    "Invoice, cbc:ID, cbc:IssueDate, cac:AccountingSupplierParty".to_string()
}