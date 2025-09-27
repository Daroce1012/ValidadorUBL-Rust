//! Manejador de archivos para el validador UBL

use std::fs;
use anyhow::{Result, Context};

/// Manejador de archivos para validación UBL
pub struct ArchivoHandler {
    ruta: String,
}

impl ArchivoHandler {
    /// Constructor - Crea un nuevo manejador de archivos
    pub fn new(ruta: String) -> Self {
        Self { ruta }
    }
    
    /// Valida que el archivo existe y es válido
    pub fn validar_archivo(&self) -> Result<()> {
        // Verificar que el archivo existe
        if !std::path::Path::new(&self.ruta).exists() {
            anyhow::bail!("El archivo '{}' no existe. Verifique la ruta y nombre del archivo", self.ruta);
        }
        
        // Verificar que es un archivo XML
        if !self.ruta.to_lowercase().ends_with(".xml") {
            anyhow::bail!("El archivo '{}' no tiene extensión .xml. Solo se pueden validar archivos XML", self.ruta);
        }
        
        Ok(())
    }
    
    /// Lee el contenido del archivo
    pub fn leer_contenido(&self) -> Result<String> {
        fs::read_to_string(&self.ruta)
            .with_context(|| format!("No se pudo abrir el archivo: {}", self.ruta))
    }
}
