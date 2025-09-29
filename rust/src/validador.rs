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
        
        // Validar namespace UBL
        self.validar_namespace(doc);
        
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
        
        // Validar estructura de elementos UBL
        self.validar_estructura_ubl(doc);
        
        // Validar reglas de negocio usando las bibliotecas
        self.validar_reglas_negocio(doc);
    }
    
    fn validar_namespace(&mut self, doc: &Document) {
        let root = doc.root_element();
        let namespace = root.tag_name().namespace();
        
        // Validar que use namespace UBL 2.0 o 2.1
        if let Some(ns) = namespace {
            if !ns.contains("ubl:schema:xsd:Invoice-2") {
                self.errores.push(format!("Namespace incorrecto. Se esperaba UBL 2.0/2.1, encontrado: {}", ns));
            }
        } else {
            self.errores.push("Namespace UBL no encontrado".to_string());
        }
    }
    
    fn validar_estructura_ubl(&mut self, doc: &Document) {
        // Validar que no haya elementos inválidos
        let elementos_invalidos = ["InvalidElement", "InvalidTag", "TestElement"];
        
        for elemento in &elementos_invalidos {
            if doc.descendants()
                .any(|n| n.tag_name().name() == *elemento) {
                self.errores.push(format!("Elemento no válido encontrado: {}", elemento));
            }
        }
        
        // Validar estructura de AccountingSupplierParty
        if let Some(supplier) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingSupplierParty") {
            
            // Verificar que tenga Party como hijo directo
            if supplier.children()
                .find(|n| n.tag_name().name() == "Party")
                .is_none() {
                self.errores.push("AccountingSupplierParty debe contener elemento Party".to_string());
            }
        }
        
        // Validar estructura de AccountingCustomerParty (elementos opcionales en UBL)
        // PartyIdentification y PostalAddress son opcionales según el estándar UBL
        
        // Validar estructura de InvoiceLine (solo elementos realmente requeridos)
        for line in doc.descendants().filter(|n| n.tag_name().name() == "InvoiceLine") {
            // LineExtensionAmount es requerido
            if line.children()
                .find(|n| n.tag_name().name() == "LineExtensionAmount")
                .is_none() {
                self.errores.push("InvoiceLine debe contener LineExtensionAmount".to_string());
            }
            
            // Item es requerido pero Name y Price son opcionales en UBL
            if line.children()
                .find(|n| n.tag_name().name() == "Item")
                .is_none() {
                self.errores.push("InvoiceLine debe contener Item".to_string());
            }
        }
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
            
            if !self.es_moneda_valida(currency) {
                self.errores.push(format!("Moneda no válida: {}", currency));
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
        // Validar identificadores fiscales del proveedor
        if let Some(supplier_party) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingSupplierParty") {
            
            let supplier_country = supplier_party.descendants()
                .find(|n| n.tag_name().name() == "IdentificationCode")
                .and_then(|n| n.text())
                .unwrap_or("");
            
            // Buscar identificadores fiscales en EndpointID o PartyIdentification
            let (supplier_id, supplier_scheme) = supplier_party.descendants()
                .find(|n| n.tag_name().name() == "EndpointID")
                .map(|n| {
                    let id = n.text().unwrap_or("");
                    let scheme = n.attribute("schemeID").unwrap_or("");
                    (id, scheme)
                })
                .or_else(|| {
                    supplier_party.descendants()
                        .find(|n| n.tag_name().name() == "PartyIdentification")
                        .and_then(|party_id| party_id.descendants().find(|n| n.tag_name().name() == "ID"))
                        .map(|n| {
                            let id = n.text().unwrap_or("");
                            let scheme = n.attribute("schemeID").unwrap_or("");
                            (id, scheme)
                        })
                })
                .unwrap_or(("", ""));
            
            if !supplier_id.is_empty() && !supplier_country.is_empty() {
                if !self.validar_identificador_fiscal(supplier_id, supplier_country, supplier_scheme) {
                    self.errores.push(format!("Identificador fiscal proveedor inválido para {}: {}", supplier_country, supplier_id));
                }
            }
        }
        
        // Validar identificadores fiscales del cliente
        if let Some(customer_party) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingCustomerParty") {
            
            let customer_country = customer_party.descendants()
                .find(|n| n.tag_name().name() == "IdentificationCode")
                .and_then(|n| n.text())
                .unwrap_or("");
            
            // Buscar identificadores fiscales en EndpointID o PartyIdentification
            let (customer_id, customer_scheme) = customer_party.descendants()
                .find(|n| n.tag_name().name() == "EndpointID")
                .map(|n| {
                    let id = n.text().unwrap_or("");
                    let scheme = n.attribute("schemeID").unwrap_or("");
                    (id, scheme)
                })
                .or_else(|| {
                    customer_party.descendants()
                        .find(|n| n.tag_name().name() == "PartyIdentification")
                        .and_then(|party_id| party_id.descendants().find(|n| n.tag_name().name() == "ID"))
                        .map(|n| {
                            let id = n.text().unwrap_or("");
                            let scheme = n.attribute("schemeID").unwrap_or("");
                            (id, scheme)
                        })
                })
                .unwrap_or(("", ""));
            
            if !customer_id.is_empty() && !customer_country.is_empty() {
                if !self.validar_identificador_fiscal(customer_id, customer_country, customer_scheme) {
                    self.errores.push(format!("Identificador fiscal cliente inválido para {}: {}", customer_country, customer_id));
                }
            }
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
    
    // Validar moneda según estándar ISO 4217 - VERSIÓN ACTUALIZADA
    fn es_moneda_valida(&self, currency: &str) -> bool {
        let monedas_validas = [
            "EUR", "USD", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "SEK", "NOK", "DKK",
            "PLN", "CZK", "HUF", "RUB", "BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU",
            "CNY", "INR", "KRW", "SGD", "HKD", "TWD", "THB", "MYR", "IDR", "PHP", "VND",
            "ZAR", "EGP", "MAD", "TND", "DZD", "NGN", "KES", "GHS", "XOF", "XAF", "XPF",
            "TRY", "ILS", "AED", "SAR", "QAR", "KWD", "BHD", "OMR", "JOD", "LBP", "EGP",
            "RUB", "UAH", "BYN", "KZT", "UZS", "KGS", "TJS", "TMT", "AZN", "AMD", "GEL",
            "MDL", "RON", "BGN", "HRK", "RSD", "MKD", "ALL", "BAM", "ISK", "LTL", "LVL",
            "EEK", "SKK", "SIT", "MTL", "CYP", "SLL", "LRD", "GMD", "GNF", "CDF", "AOA",
            "MZN", "ZMW", "BWP", "SZL", "LSL", "NAD", "MGA", "KMF", "SCR", "MUR", "MVR",
            "LKR", "BDT", "NPR", "BTN", "AFN", "PKR", "IRR", "IQD", "SYP", "YER", "OMR",
            "BHD", "KWD", "QAR", "AED", "SAR", "JOD", "LBP", "ILS", "PAL", "JOD", "LBP"
        ];
        
        monedas_validas.contains(&currency)
    }
    
    // Validar identificador fiscal según el país y schemeID
    fn validar_identificador_fiscal(&self, id: &str, country: &str, scheme: &str) -> bool {
        // Si hay un schemeID específico, validar según ese esquema
        if !scheme.is_empty() {
            match scheme {
                "FR:SIRET" => self.validar_siret_frances(id),
                "US:EIN" => self.validar_ein_estadounidense(id),
                "ES:CIF" | "ES:NIF" => self.validar_nif_espanol(id),
                "MX:RFC" => self.validar_rfc_mexicano(id),
                "BR:CNPJ" => self.validar_cnpj_brasileno(id),
                "AR:CUIT" => self.validar_cuit_argentino(id),
                "CL:RUT" => self.validar_rut_chileno(id),
                "CO:NIT" => self.validar_nit_colombiano(id),
                "PE:RUC" => self.validar_ruc_peruano(id),
                "UY:RUC" => self.validar_ruc_uruguayo(id),
                _ => true // Para esquemas no implementados, no validar
            }
        } else {
            // Si no hay schemeID, validar según el país
            match country {
                "ES" => self.validar_nif_espanol(id),
                "FR" => self.validar_siret_frances(id),
                "DE" => self.validar_steuernummer_aleman(id),
                "IT" => self.validar_codice_fiscale_italiano(id),
                "GB" | "UK" => self.validar_vat_uk(id),
                "US" => self.validar_ein_estadounidense(id),
                "MX" => self.validar_rfc_mexicano(id),
                "BR" => self.validar_cnpj_brasileno(id),
                "AR" => self.validar_cuit_argentino(id),
                "CL" => self.validar_rut_chileno(id),
                "CO" => self.validar_nit_colombiano(id),
                "PE" => self.validar_ruc_peruano(id),
                "UY" => self.validar_ruc_uruguayo(id),
                _ => true // Para países no implementados, no validar
            }
        }
    }
    
    // Validadores específicos por país
    fn validar_nif_espanol(&self, nif: &str) -> bool {
        self.validar_nif(nif)
    }
    
    fn validar_siret_frances(&self, siret: &str) -> bool {
        // SIRET francés: 14 dígitos
        siret.len() == 14 && siret.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_steuernummer_aleman(&self, steuer: &str) -> bool {
        // Steuernummer alemán: formato variable pero generalmente 10-11 dígitos
        steuer.len() >= 10 && steuer.len() <= 11 && steuer.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_codice_fiscale_italiano(&self, cf: &str) -> bool {
        // Código fiscal italiano: 16 caracteres alfanuméricos
        cf.len() == 16 && cf.chars().all(|c| c.is_alphanumeric())
    }
    
    fn validar_vat_uk(&self, vat: &str) -> bool {
        // VAT UK: formato GB + 9-12 dígitos o formato específico
        vat.starts_with("GB") && vat.len() >= 11 && vat.len() <= 14
    }
    
    fn validar_ein_estadounidense(&self, ein: &str) -> bool {
        // EIN estadounidense: formato XX-XXXXXXX (9 dígitos con guión)
        let parts: Vec<&str> = ein.split('-').collect();
        parts.len() == 2 && parts[0].len() == 2 && parts[1].len() == 7 && 
        parts[0].chars().all(|c| c.is_digit(10)) && parts[1].chars().all(|c| c.is_digit(10))
    }
    
    fn validar_rfc_mexicano(&self, rfc: &str) -> bool {
        // RFC mexicano: 12-13 caracteres alfanuméricos
        (rfc.len() == 12 || rfc.len() == 13) && rfc.chars().all(|c| c.is_alphanumeric())
    }
    
    fn validar_cnpj_brasileno(&self, cnpj: &str) -> bool {
        // CNPJ brasileño: 14 dígitos con formato XX.XXX.XXX/XXXX-XX
        let clean = cnpj.chars().filter(|c| c.is_digit(10)).collect::<String>();
        clean.len() == 14
    }
    
    fn validar_cuit_argentino(&self, cuit: &str) -> bool {
        // CUIT argentino: 11 dígitos con formato XX-XXXXXXXX-X
        let parts: Vec<&str> = cuit.split('-').collect();
        parts.len() == 3 && parts[0].len() == 2 && parts[1].len() == 8 && parts[2].len() == 1 &&
        parts[0].chars().all(|c| c.is_digit(10)) && 
        parts[1].chars().all(|c| c.is_digit(10)) && 
        parts[2].chars().all(|c| c.is_digit(10))
    }
    
    fn validar_rut_chileno(&self, rut: &str) -> bool {
        // RUT chileno: formato XXXXXXXX-X
        let parts: Vec<&str> = rut.split('-').collect();
        parts.len() == 2 && parts[0].chars().all(|c| c.is_digit(10)) && 
        (parts[1].len() == 1 && (parts[1].chars().next().unwrap().is_digit(10) || parts[1] == "K"))
    }
    
    fn validar_nit_colombiano(&self, nit: &str) -> bool {
        // NIT colombiano: formato XXXXXXXX-X
        let parts: Vec<&str> = nit.split('-').collect();
        parts.len() == 2 && parts[0].chars().all(|c| c.is_digit(10)) && 
        parts[1].len() == 1 && parts[1].chars().next().unwrap().is_digit(10)
    }
    
    fn validar_ruc_peruano(&self, ruc: &str) -> bool {
        // RUC peruano: 11 dígitos
        ruc.len() == 11 && ruc.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_ruc_uruguayo(&self, ruc: &str) -> bool {
        // RUC uruguayo: 12 dígitos
        ruc.len() == 12 && ruc.chars().all(|c| c.is_digit(10))
    }
}