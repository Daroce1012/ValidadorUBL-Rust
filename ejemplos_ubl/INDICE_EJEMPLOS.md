# 📋 Índice de Ejemplos UBL

## 📊 **Resumen de Archivos**

| Archivo | Tipo | Estado | Descripción |
|---------|------|--------|-------------|
| `01_ejemplo_correcto.xml` | ✅ Válido | Correcto | Archivo original con todos los elementos |
| `02_sin_declaracion_xml.xml` | ❌ Error | XML | Sin declaración XML |
| `03_archivo_vacio.xml` | ❌ Error | XML | Archivo vacío |
| `04_sin_elemento_invoice.xml` | ❌ Error | UBL | Sin elemento Invoice |
| `05_sin_elemento_id.xml` | ❌ Error | UBL | Sin elemento cbc:ID |
| `06_sin_elemento_fecha.xml` | ❌ Error | UBL | Sin elemento cbc:IssueDate |
| `07_sin_elemento_proveedor.xml` | ❌ Error | UBL | Sin elemento cac:AccountingSupplierParty |
| `08_xml_malformado.xml` | ❌ Error | XML | XML malformado |
| `09_multiples_elementos_faltantes.xml` | ❌ Error | UBL | Múltiples elementos faltantes |
| `10_ejemplo_oficial_ubl21.xml` | ✅ Válido | Correcto | Ejemplo oficial UBL 2.1 completo |
| `11_ejemplo_minimo_valido.xml` | ✅ Válido | Correcto | Ejemplo mínimo válido |

## 🧪 **Casos de Prueba por Categoría**

### **Errores de Estructura XML**
- `02_sin_declaracion_xml.xml` - Sin declaración XML
- `03_archivo_vacio.xml` - Archivo vacío
- `08_xml_malformado.xml` - XML malformado

### **Errores de Elementos UBL Faltantes**
- `04_sin_elemento_invoice.xml` - Sin Invoice
- `05_sin_elemento_id.xml` - Sin cbc:ID
- `06_sin_elemento_fecha.xml` - Sin cbc:IssueDate
- `07_sin_elemento_proveedor.xml` - Sin cac:AccountingSupplierParty
- `09_multiples_elementos_faltantes.xml` - Múltiples faltantes

### **Ejemplos Válidos**
- `01_ejemplo_correcto.xml` - Original completo
- `10_ejemplo_oficial_ubl21.xml` - Oficial UBL 2.1
- `11_ejemplo_minimo_valido.xml` - Mínimo válido

## 🔍 **Validaciones que Detecta el Validador**

### **Validaciones XML**
1. ✅ Declaración XML presente
2. ✅ Archivo no vacío
3. ✅ XML bien formado

### **Validaciones UBL**
1. ✅ Elemento Invoice presente
2. ✅ Elemento cbc:ID presente
3. ✅ Elemento cbc:IssueDate presente
4. ✅ Elemento cac:AccountingSupplierParty presente

## 📈 **Estadísticas**

- **Total de archivos**: 11
- **Archivos válidos**: 3 (27%)
- **Archivos con errores**: 8 (73%)
- **Errores XML**: 3
- **Errores UBL**: 5

## 🚀 **Cómo Usar**

1. **Cargar archivo**: Selecciona cualquier archivo de esta carpeta
2. **Validar**: Haz clic en "Validar Documento"
3. **Observar**: El validador mostrará el resultado
4. **Comparar**: Verifica que el resultado coincida con la descripción

---

**Nota**: Estos ejemplos cubren todos los casos de error que puede detectar el validador UBL actual.
