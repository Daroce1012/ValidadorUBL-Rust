use anyhow::{Context, Result};
use roxmltree::Document;
use std::process::Command;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::{NaiveDate, Utc};
use std::path::Path;

/// Validador unificado de documentos UBL
/// Estructura simplificada que usa las bibliotecas existentes
pub struct ValidadorUBL {
    errores: Vec<String>,
}

impl ValidadorUBL {
    /// Constructor - Crea un nuevo validador
    pub fn new() -> Self {
        Self {
            errores: Vec::new(),
        }
    }
    
    /// Valida contenido XML usando las bibliotecas existentes
    pub fn validar_contenido(&mut self, content: &str) -> Result<()> {
        // Usar roxmltree para parsear XML
        let doc = Document::parse(content)?;
        
        // Validaciones unificadas usando las bibliotecas
        self.validar_documento(&doc);
        
        // Intentar validación XSD si está disponible (no crítico)
        let _ = self.validar_xsd_automatico(content);
        
        // Si hay errores, retornar error
        if !self.errores.is_empty() {
            anyhow::bail!("Documento inválido: {}", self.errores.join("; "));
        }
        
        Ok(())
    }
    
    /// Valida contra XSD usando xmllint
    #[allow(dead_code)]
    pub fn validar_contra_xsd(&mut self, xml_path: &Path, xsd_path: &Path) -> Result<()> {
        // Verificar si el archivo XSD existe
        if !xsd_path.exists() {
            anyhow::bail!("Esquema XSD no encontrado: {}", xsd_path.display());
        }

        // Usar xmllint para validación XSD
        let output = Command::new("xmllint")
            .args(&["--noout", "--schema", xsd_path.to_str().unwrap(), xml_path.to_str().unwrap()])
            .output()
            .with_context(|| "Error ejecutando xmllint. ¿Está instalado xmllint?")?;

        if !output.status.success() {
            let error_msg = String::from_utf8_lossy(&output.stderr);
            anyhow::bail!("Documento no válido contra esquema XSD: {}", error_msg);
        }

        Ok(())
    }
    
    /// Intenta validar automáticamente contra esquemas XSD comunes
    /// 
    /// TODO FUTURO: Implementar validación XSD en memoria para WebAssembly
    /// - Investigar bibliotecas XSD puras en Rust (sin libxml2)
    /// - Considerar usar quick-xml + roxmltree para parsing de esquemas XSD
    /// - Validar XML directamente contra esquemas XSD sin archivos temporales
    /// - Alternativa: Incluir esquemas XSD como strings constantes en el binario
    /// 
    /// Referencias:
    /// - https://crates.io/crates/xsd-parser (si existe)
    /// - Crear validador XSD básico propio usando quick-xml
    /// - Validar elementos requeridos, tipos simples, restricciones básicas
    fn validar_xsd_automatico(&mut self, _content: &str) -> Result<()> {
        // En WebAssembly del navegador, no podemos acceder al sistema de archivos
        // Solo mostrar mensaje informativo
        println!("INFO: Validación XSD no disponible en navegador");
        return Ok(());
        
        // Código original comentado para referencia:
        /*
        // Crear archivo temporal para validación
        let temp_dir = std::env::temp_dir();
        let temp_xml = temp_dir.join("temp_ubl_validation.xml");
        std::fs::write(&temp_xml, content)
            .with_context(|| "Error creando archivo temporal")?;

        // Intentar validar contra esquemas UBL comunes
        let esquemas_ubl = vec![
            ("esquemas_xsd/UBL-Invoice-2.1.xsd", "Esquema UBL Invoice 2.1"),
            ("esquemas_xsd/UBL-Invoice-2.0.xsd", "Esquema UBL Invoice 2.0"),
        ];

        let mut validacion_exitosa = false;
        
        for (esquema, _descripcion) in esquemas_ubl {
            if let Ok(_) = self.validar_contra_xsd(&temp_xml, &Path::new(esquema)) {
                validacion_exitosa = true;
                break;
            }
        }

        // Si no se pudo validar contra ningún esquema, solo log (no error crítico)
        if !validacion_exitosa {
            // Solo agregamos un warning, no un error crítico
            println!("INFO: No se encontraron esquemas XSD oficiales UBL para validación");
        }

        // Limpiar archivo temporal
        let _ = std::fs::remove_file(&temp_xml);

        Ok(())
        */
    }

    /// Obtiene los errores encontrados
    pub fn obtener_errores(&self) -> &Vec<String> {
        &self.errores
    }
    
    // Método unificado que usa las bibliotecas existentes
    
    fn validar_documento(&mut self, doc: &Document) {
        // Validar estructura básica usando roxmltree
        let root_name = doc.root_element().tag_name().name();
        if root_name != "Invoice" {
            self.errores.push(format!("No es un documento UBL Invoice válido. Elemento raíz encontrado: {}", root_name));
            return;
        }
        
        // Validar elementos requeridos usando roxmltree
        let elementos_requeridos = [
            ("ID", "ID de factura"),
            ("IssueDate", "Fecha de emisión"),
            ("AccountingSupplierParty", "Datos del proveedor")
        ];
        
        for (tag_name, descripcion) in &elementos_requeridos {
            if doc.descendants()
                .find(|n| n.tag_name().name() == *tag_name)
                .is_none() {
                self.errores.push(format!("Falta elemento requerido: {}", descripcion));
            }
        }
        
        // Validar reglas de negocio usando las bibliotecas
        self.validar_reglas_negocio(doc);
    }
    
    fn validar_reglas_negocio(&mut self, doc: &Document) {
        // Usar roxmltree para extraer datos y validar con bibliotecas
        
        // Validar tipo de documento (usar roxmltree directamente)
        if let Some(invoice_type) = doc.descendants()
            .find(|n| n.tag_name().name() == "InvoiceTypeCode")
            .and_then(|n| n.text()) {
            
            // Aceptar códigos numéricos UBL 2.1 y códigos de texto UBL 2.0
            let valid_types = ["380", "01", "SalesInvoice", "StandardInvoice"];
            if !valid_types.contains(&invoice_type) {
                self.errores.push(format!("WARNING: InvoiceTypeCode no es válido para factura: {}", invoice_type));
            }
        }
        
        // Validar fechas usando chrono (usar chrono directamente)
        if let Some(issue_date) = doc.descendants()
            .find(|n| n.tag_name().name() == "IssueDate")
            .and_then(|n| n.text()) {
            
            match NaiveDate::parse_from_str(issue_date, "%Y-%m-%d") {
                Ok(date) => {
                    let today = Utc::now().naive_utc().date();
                    if date > today {
                        self.errores.push(format!("Fecha de emisión futura: {}", date));
                    }
                },
                Err(_) => {
                    self.errores.push(format!("Fecha de emisión inválida: {}", issue_date));
                }
            }
        }
        
        // Validar NIFs (específico de negocio)
        self.validar_nifs(doc);
        
        // Validar impuestos usando rust_decimal (específico de negocio)
        self.validar_impuestos(doc);
        
        // Validar totales usando rust_decimal (específico de negocio)
        self.validar_totales(doc);
        
        // Validar moneda (usar roxmltree directamente)
        if let Some(currency) = doc.descendants()
            .find(|n| n.tag_name().name() == "DocumentCurrencyCode")
            .and_then(|n| n.text()) {
            
            if currency != "EUR" {
                self.errores.push(format!("Moneda distinta a EUR: {}", currency));
            }
        }
        
        // Validar líneas de factura (usar roxmltree directamente)
        let invoice_lines_count = doc.descendants()
            .filter(|n| n.tag_name().name() == "InvoiceLine")
            .count();
        
        if invoice_lines_count == 0 {
            // Solo un warning, no un error crítico
            println!("INFO: La factura no tiene líneas de detalle (InvoiceLine)");
        }
    }
    
    fn validar_nifs(&mut self, doc: &Document) {
        // Usar roxmltree para extraer NIFs
        let supplier_nif = doc.descendants()
            .find(|n| n.tag_name().name() == "SupplierAssignedAccountID")
            .and_then(|n| n.text())
            .unwrap_or("");
        
        let customer_nif = doc.descendants()
            .find(|n| n.tag_name().name() == "CustomerAssignedAccountID")
            .and_then(|n| n.text())
            .unwrap_or("");
        
        // Validar NIFs solo si parecen ser españoles (empiezan con número o X/Y/Z)
        if !supplier_nif.is_empty() && self.es_nif_espanol(supplier_nif) && !self.validar_nif(supplier_nif) {
            self.errores.push(format!("NIF proveedor inválido: {}", supplier_nif));
        }
        
        if !customer_nif.is_empty() && self.es_nif_espanol(customer_nif) && !self.validar_nif(customer_nif) {
            self.errores.push(format!("NIF cliente inválido: {}", customer_nif));
        }
    }
    
    fn validar_impuestos(&mut self, doc: &Document) {
        // Usar rust_decimal para cálculos precisos
        let allowed_rates = vec![dec!(21), dec!(20), dec!(17.5), dec!(10), dec!(4), dec!(0)];
        
        for tax in doc.descendants().filter(|n| n.tag_name().name() == "TaxSubtotal") {
            let base = tax.descendants()
                .find(|n| n.tag_name().name() == "TaxableAmount")
                .and_then(|n| n.text())
                .and_then(|t| Decimal::from_str_exact(t).ok())
                .unwrap_or(dec!(0));
            
            let percent = tax.descendants()
                .find(|n| n.tag_name().name() == "Percent")
                .and_then(|n| n.text())
                .and_then(|t| Decimal::from_str_exact(t).ok())
                .unwrap_or(dec!(0));
            
            let amount = tax.descendants()
                .find(|n| n.tag_name().name() == "TaxAmount")
                .and_then(|n| n.text())
                .and_then(|t| Decimal::from_str_exact(t).ok())
                .unwrap_or(dec!(0));

            // Solo validar si tenemos tanto base como porcentaje
            if base > dec!(0) && percent > dec!(0) {
                // Usar rust_decimal para comparaciones
                if !allowed_rates.iter().any(|r| self.approx_eq(*r, percent)) {
                    self.errores.push(format!("Tipo de IVA no permitido: {}", percent));
                }
                
                // Usar rust_decimal para cálculos
                let expected = base * percent / dec!(100);
                if !self.approx_eq(expected, amount) {
                    self.errores.push(format!("TaxAmount ({}) != base*% ({})", amount, expected));
                }
            }
        }
    }
    
    fn validar_totales(&mut self, doc: &Document) {
        // Usar rust_decimal para cálculos de totales
        // Buscar TaxExclusiveAmount primero, luego LineExtensionAmount como alternativa
        let tax_exclusive = doc.descendants()
            .find(|n| n.tag_name().name() == "TaxExclusiveAmount")
            .and_then(|n| n.text())
            .and_then(|t| Decimal::from_str_exact(t).ok())
            .or_else(|| {
                // Si no hay TaxExclusiveAmount, buscar LineExtensionAmount
                doc.descendants()
                    .find(|n| n.tag_name().name() == "LineExtensionAmount")
                    .and_then(|n| n.text())
                    .and_then(|t| Decimal::from_str_exact(t).ok())
            })
            .unwrap_or(dec!(0));
        
        let tax_inclusive = doc.descendants()
            .find(|n| n.tag_name().name() == "TaxInclusiveAmount")
            .and_then(|n| n.text())
            .and_then(|t| Decimal::from_str_exact(t).ok())
            .unwrap_or(dec!(0));
        
        let payable = doc.descendants()
            .find(|n| n.tag_name().name() == "PayableAmount")
            .and_then(|n| n.text())
            .and_then(|t| Decimal::from_str_exact(t).ok());
        
        let tax_total = doc.descendants()
            .find(|n| n.tag_name().name() == "TaxAmount")
            .and_then(|n| n.text())
            .and_then(|t| Decimal::from_str_exact(t).ok())
            .unwrap_or(dec!(0));

        // Usar rust_decimal para comparaciones
        // Solo validar si TaxInclusiveAmount está presente
        if tax_inclusive > dec!(0) && tax_exclusive > dec!(0) && tax_total > dec!(0) {
            if !self.approx_eq(tax_exclusive + tax_total, tax_inclusive) {
                self.errores.push(format!("TaxInclusiveAmount ({}) != TaxExclusiveAmount + TaxTotal ({})", 
                                         tax_inclusive, tax_exclusive + tax_total));
            }
        }
        
        // PayableAmount es opcional, solo validar si está presente
        if let Some(payable_amount) = payable {
            // Buscar PrepaidAmount para calcular el PayableAmount esperado
            let prepaid_amount = doc.descendants()
                .find(|n| n.tag_name().name() == "PrepaidAmount")
                .and_then(|n| n.text())
                .and_then(|t| Decimal::from_str_exact(t).ok())
                .unwrap_or(dec!(0));
            
            let payable_rounding = doc.descendants()
                .find(|n| n.tag_name().name() == "PayableRoundingAmount")
                .and_then(|n| n.text())
                .and_then(|t| Decimal::from_str_exact(t).ok())
                .unwrap_or(dec!(0));
            
            // Calcular PayableAmount esperado
            let expected_payable = if tax_inclusive > dec!(0) {
                tax_inclusive - prepaid_amount + payable_rounding
            } else if tax_exclusive > dec!(0) && tax_total > dec!(0) {
                // Para UBL 2.0: PayableAmount = TaxExclusiveAmount + TaxTotal - prepaid + rounding
                tax_exclusive + tax_total - prepaid_amount + payable_rounding
            } else if tax_exclusive > dec!(0) {
                tax_exclusive - prepaid_amount + payable_rounding
            } else {
                payable_amount // Si no hay datos, asumir que está bien
            };
            
            if !self.approx_eq(expected_payable, payable_amount) {
                self.errores.push(format!("PayableAmount ({}) no coincide con cálculo esperado ({})", payable_amount, expected_payable));
            }
        }
    }
    
    // Métodos específicos de negocio (estos sí los mantenemos)
    
    fn es_nif_espanol(&self, nif: &str) -> bool {
        let s = nif.trim().to_uppercase();
        // Un NIF español tiene 9 caracteres y empieza con número o X/Y/Z
        s.len() == 9 && (s.chars().next().unwrap().is_digit(10) || ["X", "Y", "Z"].contains(&s.chars().next().unwrap().to_string().as_str()))
    }
    
    fn validar_nif(&self, nif: &str) -> bool {
        let s = nif.trim().to_uppercase();
        let dni_letters = "TRWAGMYFPDXBNJZSQVHLCKE";

        if s.len() == 9 && s.chars().next().unwrap().is_digit(10) {
            let (num_part, letter) = (&s[0..8], s.chars().nth(8).unwrap());
            if let Ok(n) = num_part.parse::<u32>() {
                let idx = (n % 23) as usize;
                return dni_letters.chars().nth(idx).unwrap() == letter;
            }
        }

        if s.len() == 9 {
            let first = s.chars().next().unwrap();
            if ["X", "Y", "Z"].contains(&first.to_string().as_str()) {
                let mut numeric = match first {
                    'X' => "0".to_string(),
                    'Y' => "1".to_string(),
                    'Z' => "2".to_string(),
                    _ => unreachable!(),
                };
                numeric.push_str(&s[1..8]);
                let letter = s.chars().nth(8).unwrap();
                if let Ok(n) = numeric.parse::<u32>() {
                    let idx = (n % 23) as usize;
                    return dni_letters.chars().nth(idx).unwrap() == letter;
                }
            }
        }

        if s.len() == 9 && s.chars().next().unwrap().is_alphabetic() {
            return s[1..8].chars().all(|c| c.is_digit(10));
        }
        false
    }
    
    // Usar rust_decimal para comparaciones precisas
    fn approx_eq(&self, a: Decimal, b: Decimal) -> bool {
        let diff = if a > b { a - b } else { b - a };
        diff <= dec!(0.50) // Tolerancia mayor para redondeos UBL
    }
}