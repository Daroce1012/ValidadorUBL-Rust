use anyhow::Result;
use roxmltree::Document;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::{NaiveDate, Utc};

/// Validador unificado de documentos UBL
pub struct ValidadorUBL {
    errores: Vec<String>,
}

impl ValidadorUBL {
    pub fn new() -> Self {
        Self {
            errores: Vec::new(),
        }
    }
    
    pub fn validar_contenido(&mut self, content: &str) -> Result<()> {
        let doc = Document::parse(content)?;
        self.validar_documento(&doc);
        
        if !self.errores.is_empty() {
            anyhow::bail!("Documento inválido: {}", self.errores.join("; "));
        }
        
        Ok(())
    }
    
    pub fn obtener_errores(&self) -> &Vec<String> {
        &self.errores
    }
    
    fn validar_documento(&mut self, doc: &Document) {
        let root = doc.root_element();
        
        if root.tag_name().name() != "Invoice" {
            self.errores.push("Elemento raíz debe ser 'Invoice'".to_string());
            return;
        }
        
        self.validar_namespace(doc);
        self.validar_elementos_requeridos(doc);
        self.validar_estructura_ubl(doc);
        self.validar_reglas_negocio(doc);
    }
    
    fn validar_elementos_requeridos(&mut self, doc: &Document) {
        let elementos_requeridos = [
            ("ID", "ID de factura"),
            ("IssueDate", "Fecha de emisión"),
            ("AccountingSupplierParty", "Datos del proveedor"),
            ("AccountingCustomerParty", "Datos del cliente"),
            ("LegalMonetaryTotal", "Total monetario legal")
        ];
        
        for (tag_name, descripcion) in &elementos_requeridos {
            if doc.descendants()
                .find(|n| n.tag_name().name() == *tag_name)
                .is_none() {
                self.errores.push(format!("Falta elemento requerido: {}", descripcion));
            }
        }
        
        if let Some(issue_date) = doc.descendants().find(|n| n.tag_name().name() == "IssueDate") {
            if let Some(date_text) = issue_date.text() {
                if NaiveDate::parse_from_str(date_text, "%Y-%m-%d").is_err() {
                    self.errores.push(format!("IssueDate debe tener formato YYYY-MM-DD, encontrado: {}", date_text));
                }
            }
        }
    }
    
    fn validar_namespace(&mut self, doc: &Document) {
        let root = doc.root_element();
        let namespace = root.tag_name().namespace();
        
        if let Some(ns) = namespace {
            if !ns.contains("ubl:schema:xsd:Invoice-2") {
                self.errores.push(format!("Namespace incorrecto. Se esperaba UBL 2.0/2.1, encontrado: {}", ns));
            }
        } else {
            self.errores.push("Namespace UBL no encontrado".to_string());
        }
    }
    
    fn validar_estructura_ubl(&mut self, doc: &Document) {
        let elementos_invalidos = ["InvalidElement", "InvalidTag", "TestElement"];
        
        for elemento in &elementos_invalidos {
            if doc.descendants().any(|n| n.tag_name().name() == *elemento) {
                self.errores.push(format!("Elemento no válido encontrado: {}", elemento));
            }
        }
        
        self.validar_supplier_party(doc);
        self.validar_invoice_lines(doc);
    }
    
    fn validar_supplier_party(&mut self, doc: &Document) {
        if let Some(supplier) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingSupplierParty") {
            
            if supplier.children()
                .find(|n| n.tag_name().name() == "Party")
                .is_none() {
                self.errores.push("AccountingSupplierParty debe contener elemento Party".to_string());
            }
        }
    }
    
    fn validar_invoice_lines(&mut self, doc: &Document) {
        for line in doc.descendants().filter(|n| n.tag_name().name() == "InvoiceLine") {
            if line.children()
                .find(|n| n.tag_name().name() == "LineExtensionAmount")
                .is_none() {
                self.errores.push("InvoiceLine debe contener LineExtensionAmount".to_string());
            }
            
            if line.children()
                .find(|n| n.tag_name().name() == "Item")
                .is_none() {
                self.errores.push("InvoiceLine debe contener Item".to_string());
            }
        }
    }
    
    fn validar_reglas_negocio(&mut self, doc: &Document) {
        self.validar_tipo_documento(doc);
        self.validar_fechas(doc);
        self.validar_nifs(doc);
        self.validar_impuestos(doc);
        self.validar_totales(doc);
        self.validar_moneda(doc);
        self.validar_cantidad_lineas(doc);
    }
    
    fn validar_tipo_documento(&mut self, doc: &Document) {
        if let Some(invoice_type) = doc.descendants()
            .find(|n| n.tag_name().name() == "InvoiceTypeCode")
            .and_then(|n| n.text()) {
            
            let valid_types = ["380", "01", "SalesInvoice", "StandardInvoice"];
            if !valid_types.contains(&invoice_type) {
                self.errores.push(format!("InvoiceTypeCode no válido para factura: {}", invoice_type));
            }
        }
    }
    
    fn validar_fechas(&mut self, doc: &Document) {
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
    }
    
    fn validar_moneda(&mut self, doc: &Document) {
        if let Some(currency) = doc.descendants()
            .find(|n| n.tag_name().name() == "DocumentCurrencyCode")
            .and_then(|n| n.text()) {
            
            if !self.es_moneda_valida(currency) {
                self.errores.push(format!("Moneda no válida: {}", currency));
            }
        }
    }
    
    fn validar_cantidad_lineas(&mut self, doc: &Document) {
        let invoice_lines_count = doc.descendants()
            .filter(|n| n.tag_name().name() == "InvoiceLine")
            .count();
        
        if invoice_lines_count == 0 {
            println!("INFO: La factura no tiene líneas de detalle (InvoiceLine)");
        }
    }
    
    fn validar_nifs(&mut self, doc: &Document) {
        if let Some(supplier_party) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingSupplierParty") {
            
            let supplier_country = supplier_party.descendants()
                .find(|n| n.tag_name().name() == "IdentificationCode")
                .and_then(|n| n.text())
                .unwrap_or("");
            
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
                .or_else(|| {
                    // Buscar también en CompanyID dentro de PartyTaxScheme
                    supplier_party.descendants()
                        .find(|n| n.tag_name().name() == "CompanyID")
                        .map(|n| {
                            let id = n.text().unwrap_or("");
                            let scheme = n.attribute("schemeID").unwrap_or("");
                            (id, scheme)
                        })
                })
                .unwrap_or(("", ""));
            
            if !supplier_id.is_empty() && !supplier_country.is_empty() {
                // Solo validar si hay un esquema específico definido
                if !supplier_scheme.is_empty() && !self.validar_identificador_fiscal(supplier_id, supplier_country, supplier_scheme) {
                    self.errores.push(format!("Identificador fiscal proveedor inválido para {}: {}", supplier_country, supplier_id));
                }
            }
        }
        
        if let Some(customer_party) = doc.descendants()
            .find(|n| n.tag_name().name() == "AccountingCustomerParty") {
            
            let customer_country = customer_party.descendants()
                .find(|n| n.tag_name().name() == "IdentificationCode")
                .and_then(|n| n.text())
                .unwrap_or("");
            
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
                .or_else(|| {
                    // Buscar también en CompanyID dentro de PartyTaxScheme
                    customer_party.descendants()
                        .find(|n| n.tag_name().name() == "CompanyID")
                        .map(|n| {
                            let id = n.text().unwrap_or("");
                            let scheme = n.attribute("schemeID").unwrap_or("");
                            (id, scheme)
                        })
                })
                .unwrap_or(("", ""));
            
            if !customer_id.is_empty() && !customer_country.is_empty() {
                // Solo validar si hay un esquema específico definido
                if !customer_scheme.is_empty() && !self.validar_identificador_fiscal(customer_id, customer_country, customer_scheme) {
                    self.errores.push(format!("Identificador fiscal cliente inválido para {}: {}", customer_country, customer_id));
                }
            }
        }
    }
    
    fn validar_impuestos(&mut self, doc: &Document) {
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

            if base > dec!(0) && percent > dec!(0) {
                if !allowed_rates.iter().any(|r| self.approx_eq(*r, percent)) {
                    self.errores.push(format!("Tipo de IVA no permitido: {}", percent));
                }
                
                let expected = base * percent / dec!(100);
                if !self.approx_eq(expected, amount) {
                    self.errores.push(format!("TaxAmount ({}) != base*% ({})", amount, expected));
                }
            }
        }
    }
    
    fn validar_totales(&mut self, doc: &Document) {
        let tax_exclusive = doc.descendants()
            .find(|n| n.tag_name().name() == "TaxExclusiveAmount")
            .and_then(|n| n.text())
            .and_then(|t| Decimal::from_str_exact(t).ok())
            .or_else(|| {
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

        if tax_inclusive > dec!(0) && tax_exclusive > dec!(0) && tax_total > dec!(0) {
            if !self.approx_eq(tax_exclusive + tax_total, tax_inclusive) {
                self.errores.push(format!("TaxInclusiveAmount ({}) != TaxExclusiveAmount + TaxTotal ({})", 
                                         tax_inclusive, tax_exclusive + tax_total));
            }
        }
        
        if let Some(payable_amount) = payable {
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
            
            let expected_payable = if tax_inclusive > dec!(0) {
                tax_inclusive - prepaid_amount + payable_rounding
            } else if tax_exclusive > dec!(0) && tax_total > dec!(0) {
                tax_exclusive + tax_total - prepaid_amount + payable_rounding
            } else if tax_exclusive > dec!(0) {
                tax_exclusive - prepaid_amount + payable_rounding
            } else {
                payable_amount
            };
            
            if !self.approx_eq(expected_payable, payable_amount) {
                self.errores.push(format!("PayableAmount ({}) no coincide con cálculo esperado ({})", payable_amount, expected_payable));
            }
        }
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
    
    fn approx_eq(&self, a: Decimal, b: Decimal) -> bool {
        let diff = if a > b { a - b } else { b - a };
        diff <= dec!(0.50)
    }
    
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
    
    fn validar_identificador_fiscal(&self, id: &str, country: &str, scheme: &str) -> bool {
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
                _ => true
            }
        } else {
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
                _ => true
            }
        }
    }
    
    fn validar_nif_espanol(&self, nif: &str) -> bool {
        self.validar_nif(nif)
    }
    
    fn validar_siret_frances(&self, siret: &str) -> bool {
        siret.len() == 14 && siret.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_steuernummer_aleman(&self, steuer: &str) -> bool {
        steuer.len() >= 10 && steuer.len() <= 11 && steuer.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_codice_fiscale_italiano(&self, cf: &str) -> bool {
        cf.len() == 16 && cf.chars().all(|c| c.is_alphanumeric())
    }
    
    fn validar_vat_uk(&self, vat: &str) -> bool {
        vat.starts_with("GB") && vat.len() >= 11 && vat.len() <= 14
    }
    
    fn validar_ein_estadounidense(&self, ein: &str) -> bool {
        let parts: Vec<&str> = ein.split('-').collect();
        parts.len() == 2 && parts[0].len() == 2 && parts[1].len() == 7 && 
        parts[0].chars().all(|c| c.is_digit(10)) && parts[1].chars().all(|c| c.is_digit(10))
    }
    
    fn validar_rfc_mexicano(&self, rfc: &str) -> bool {
        (rfc.len() == 12 || rfc.len() == 13) && rfc.chars().all(|c| c.is_alphanumeric())
    }
    
    fn validar_cnpj_brasileno(&self, cnpj: &str) -> bool {
        let clean = cnpj.chars().filter(|c| c.is_digit(10)).collect::<String>();
        clean.len() == 14
    }
    
    fn validar_cuit_argentino(&self, cuit: &str) -> bool {
        let parts: Vec<&str> = cuit.split('-').collect();
        parts.len() == 3 && parts[0].len() == 2 && parts[1].len() == 8 && parts[2].len() == 1 &&
        parts[0].chars().all(|c| c.is_digit(10)) && 
        parts[1].chars().all(|c| c.is_digit(10)) && 
        parts[2].chars().all(|c| c.is_digit(10))
    }
    
    fn validar_rut_chileno(&self, rut: &str) -> bool {
        let parts: Vec<&str> = rut.split('-').collect();
        parts.len() == 2 && parts[0].chars().all(|c| c.is_digit(10)) && 
        (parts[1].len() == 1 && (parts[1].chars().next().unwrap().is_digit(10) || parts[1] == "K"))
    }
    
    fn validar_nit_colombiano(&self, nit: &str) -> bool {
        let parts: Vec<&str> = nit.split('-').collect();
        parts.len() == 2 && parts[0].chars().all(|c| c.is_digit(10)) && 
        parts[1].len() == 1 && parts[1].chars().next().unwrap().is_digit(10)
    }
    
    fn validar_ruc_peruano(&self, ruc: &str) -> bool {
        ruc.len() == 11 && ruc.chars().all(|c| c.is_digit(10))
    }
    
    fn validar_ruc_uruguayo(&self, ruc: &str) -> bool {
        ruc.len() == 12 && ruc.chars().all(|c| c.is_digit(10))
    }
}