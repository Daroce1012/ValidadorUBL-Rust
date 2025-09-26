# 📁 Ejemplos de Archivos UBL - Casos de Prueba

Esta carpeta contiene ejemplos de archivos UBL que demuestran diferentes tipos de errores que puede detectar el validador.

## ✅ **Archivos Válidos**

### `01_ejemplo_correcto.xml`
- **Estado**: ✅ Válido
- **Descripción**: Archivo UBL completo con todos los elementos requeridos
- **Elementos incluidos**: Invoice, cbc:ID, cbc:IssueDate, cac:AccountingSupplierParty

## ❌ **Archivos con Errores**

### `02_sin_declaracion_xml.xml`
- **Error**: Sin declaración XML
- **Descripción**: Archivo XML sin la declaración `<?xml version="1.0" encoding="UTF-8"?>`
- **Resultado esperado**: "No es un archivo XML válido - falta declaración XML"

### `03_archivo_vacio.xml`
- **Error**: Archivo completamente vacío
- **Descripción**: Archivo sin contenido
- **Resultado esperado**: "El archivo está vacío"

### `04_sin_elemento_invoice.xml`
- **Error**: Sin elemento Invoice
- **Descripción**: Archivo XML válido pero sin el elemento raíz Invoice
- **Resultado esperado**: "Faltan elementos: Invoice"

### `05_sin_elemento_id.xml`
- **Error**: Sin elemento cbc:ID
- **Descripción**: Archivo con Invoice pero sin identificador
- **Resultado esperado**: "Faltan elementos: cbc:ID"

### `06_sin_elemento_fecha.xml`
- **Error**: Sin elemento cbc:IssueDate
- **Descripción**: Archivo con Invoice e ID pero sin fecha de emisión
- **Resultado esperado**: "Faltan elementos: cbc:IssueDate"

### `07_sin_elemento_proveedor.xml`
- **Error**: Sin elemento cac:AccountingSupplierParty
- **Descripción**: Archivo con Invoice, ID y fecha pero sin proveedor
- **Resultado esperado**: "Faltan elementos: cac:AccountingSupplierParty"

### `08_xml_malformado.xml`
- **Error**: XML malformado
- **Descripción**: Archivo con etiquetas sin cerrar
- **Resultado esperado**: "XML malformado: [error de parsing]"

### `09_multiples_elementos_faltantes.xml`
- **Error**: Múltiples elementos faltantes
- **Descripción**: Solo tiene Invoice, faltan ID, fecha y proveedor
- **Resultado esperado**: "Faltan elementos: cbc:ID, cbc:IssueDate, cac:AccountingSupplierParty"

## 🧪 **Cómo Usar Estos Ejemplos**

1. **Cargar archivo**: Arrastra o selecciona cualquier archivo de esta carpeta
2. **Validar**: Haz clic en "Validar Documento"
3. **Observar resultado**: El validador mostrará el tipo de error detectado

## 📋 **Elementos UBL Requeridos**

El validador verifica la presencia de estos elementos obligatorios:

- **Invoice**: Elemento raíz del documento
- **cbc:ID**: Identificador único del documento
- **cbc:IssueDate**: Fecha de emisión del documento
- **cac:AccountingSupplierParty**: Información del proveedor

## 🔍 **Tipos de Validación**

1. **Validación XML**: Estructura y sintaxis del XML
2. **Validación UBL**: Elementos requeridos según estándar UBL
3. **Validación de contenido**: Verificación de elementos específicos

---

**Nota**: Estos ejemplos están diseñados para probar la robustez del validador UBL y asegurar que detecte correctamente todos los tipos de errores comunes en documentos UBL.
