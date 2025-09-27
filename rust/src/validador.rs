//! Validador de documentos UBL (Universal Business Language) en formato XML

use quick_xml::{Reader, events::Event};
use anyhow::Result;

/// Validador principal de documentos UBL
pub struct ValidadorUBL {
    // Elementos UBL como campos directos
    invoice: bool,
    id: bool,
    fecha: bool,
    proveedor: bool,
}

impl ValidadorUBL {
    /// Constructor - Crea un nuevo validador
    pub fn new() -> Self {
        Self {
            invoice: false,
            id: false,
            fecha: false,
            proveedor: false,
        }
    }
    
    /// Valida contenido XML directamente
    pub fn validar_contenido(&mut self, content: &str) -> Result<()> {
        self.validar_xml(content)?;
        self.extraer_elementos_ubl(content)?;
        self.verificar_completitud()?;
        Ok(())
    }
    
    /// Getter - Retorna los elementos faltantes
    pub fn elementos_faltantes(&self) -> Vec<&'static str> {
        let mut faltantes = Vec::new();
        if !self.invoice { faltantes.push("Invoice"); }
        if !self.id { faltantes.push("cbc:ID"); }
        if !self.fecha { faltantes.push("cbc:IssueDate"); }
        if !self.proveedor { faltantes.push("cac:AccountingSupplierParty"); }
        faltantes
    }
    
    // Métodos privados de la clase
    
    fn validar_xml(&self, content: &str) -> Result<()> {
        if content.trim().is_empty() {
            anyhow::bail!("El archivo está vacío");
        }
        if !content.trim().starts_with("<?xml") {
            anyhow::bail!("No es un archivo XML válido - falta declaración XML");
        }
        Ok(())
    }
    
    fn extraer_elementos_ubl(&mut self, content: &str) -> Result<()> {
        let mut reader = Reader::from_str(content);
        reader.trim_text(true);
        let mut buf = Vec::new();

        loop {
            match reader.read_event_into(&mut buf) {
                Ok(Event::Start(e)) => {
                    let name = e.name();
                    let name_bytes = name.as_ref();
                    let name_str = String::from_utf8_lossy(name_bytes);
                    self.procesar_elemento(&name_str)?;
                }
                Ok(Event::Eof) => break,
                Ok(_) => continue,
                Err(e) => anyhow::bail!("XML malformado: {}", e),
            }
            buf.clear();
        }
        Ok(())
    }
    
    fn procesar_elemento(&mut self, name: &str) -> Result<()> {
        match name {
            "Invoice" => {
                self.invoice = true;
            }
            "cbc:ID" => {
                self.id = true;
            }
            "cbc:IssueDate" => {
                self.fecha = true;
            }
            "cac:AccountingSupplierParty" => {
                self.proveedor = true;
            }
            _ => {}
        }
        Ok(())
    }
    
    fn verificar_completitud(&self) -> Result<()> {
        if !self.es_valido() {
            let faltantes = self.elementos_faltantes();
            anyhow::bail!("Faltan elementos requeridos: {}", faltantes.join(", "));
        }
        Ok(())
    }
    
    fn es_valido(&self) -> bool {
        self.invoice && self.id && self.fecha && self.proveedor
    }
}