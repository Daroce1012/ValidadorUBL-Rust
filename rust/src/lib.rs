//! Biblioteca WebAssembly para validar documentos UBL
//! Estructura simplificada y unificada

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
    let mut validador = ValidadorUBL::new();
    
    match validador.validar_contenido(xml_content) {
        Ok(_) => Ok("Válido".to_string()),
        Err(e) => {
            let errores = validador.obtener_errores();
            let mut mensaje = format!("Error: {}", e);
            
            if !errores.is_empty() {
                mensaje.push_str(&format!("\nErrores detallados: {}", errores.join("; ")));
            }
            
            Err(mensaje)
        }
    }
}

/// Obtiene la versión del validador
#[wasm_bindgen]
pub fn version() -> String {
    "2.0.0".to_string()
}

/// Obtiene información sobre los elementos UBL requeridos
#[wasm_bindgen]
pub fn elementos_requeridos() -> String {
    "Invoice, cbc:ID, cbc:IssueDate, cac:AccountingSupplierParty, NIFs válidos, Impuestos válidos, Totales válidos".to_string()
}