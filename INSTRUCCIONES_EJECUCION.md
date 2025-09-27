# Instrucciones de Ejecución del Validador UBL

## 📋 **INFORMACIÓN IMPORTANTE**

Este documento contiene **DOS SECCIONES**:

1. **🔧 PARTE 1: COMPILACIÓN RUST → WEBASSEMBLY** (Pasos 1-7)
   - Para compilar el código Rust a WebAssembly
   - Solo necesario si modificas el código Rust
   - Si ya tienes los archivos `.wasm` compilados, puedes saltar esta parte

2. **🌐 PARTE 2: EJECUTAR APLICACIÓN WEB COMPLETA** (Pasos 8-10)
   - Para ejecutar toda la aplicación web
   - Incluye validación, visualización y PDF
   - **ESTA ES LA PARTE PRINCIPAL**

---

## 🔧 **PARTE 1: COMPILACIÓN RUST → WEBASSEMBLY**

> **⚠️ NOTA**: Esta sección es solo para compilar el código Rust a WebAssembly. Si ya tienes los archivos `.wasm` en la carpeta `rust/wasm-output/pkg/`, puedes saltar directamente a la **PARTE 2**.

## 📋 **PASO 1: INSTALAR RUST**

### 1.1 Descargar Rust
- Ve a: https://rustup.rs/
- Descarga el instalador para Windows
- Ejecuta el archivo descargado

### 1.2 Instalar Rust
- Sigue las instrucciones del instalador
- Acepta la instalación por defecto
- **IMPORTANTE**: Reinicia la terminal/PowerShell después de la instalación

### 1.3 Verificar instalación
```bash
rustc --version
cargo --version
```
**Resultado esperado**: Debe mostrar las versiones de Rust y Cargo

---

## 📋 **PASO 2: COMPILAR EL PROYECTO**

### 2.1 Compilar para desarrollo
```bash
cargo build
```
**Resultado esperado**: Debe compilar sin errores

### 2.2 Compilar para producción (opcional)
```bash
cargo build --release
```
**Resultado esperado**: Compilación optimizada para producción

---

## 📋 **PASO 3: PROBAR LA APLICACIÓN CLI**

### 3.1 Probar con archivo correcto
```bash
cargo run --bin validador-ubl --features cli -- ejemplos_ubl/01_ejemplo_correcto.xml
```
**Resultado esperado**: 
```
✅ Factura válida: ejemplos_ubl/01_ejemplo_correcto.xml
✅ El documento UBL cumple con todos los requisitos
```

### 3.2 Probar con archivo con errores
```bash
cargo run --bin validador-ubl --features cli -- ejemplos_ubl/02_sin_declaracion_xml.xml
```
**Resultado esperado**: 
```
❌ Factura inválida: ejemplos_ubl/02_sin_declaracion_xml.xml
❌ El documento UBL no cumple con los requisitos
```

### 3.3 Probar con modo verbose
```bash
cargo run --bin validador-ubl --features cli -- --verbose ejemplos_ubl/01_ejemplo_correcto.xml
```
**Resultado esperado**: Información detallada del proceso

---

## 📋 **PASO 4: INSTALAR WASM-PACK**

### 4.1 Instalar wasm-pack
```bash
cargo install wasm-pack
```
**Resultado esperado**: Instalación exitosa de wasm-pack

---

## 📋 **PASO 5: COMPILAR WEBASSEMBLY**

### 5.1 Limpiar compilaciones anteriores
```bash
cargo clean
```
**Resultado esperado**: Eliminación de archivos de compilación

### 5.2 Compilar para WebAssembly
```bash
wasm-pack build --target web --out-dir pkg --dev
```
**Resultado esperado**: 
- Creación de archivos en carpeta `pkg/`
- Archivos generados: `validador_ubl.js`, `validador_ubl_bg.wasm`, etc.

---

## 📋 **PASO 6: VERIFICAR ARCHIVOS GENERADOS**

### 6.1 Verificar carpeta pkg/
Después de compilar, verificar que existen estos archivos:
- `pkg/validador_ubl.js`
- `pkg/validador_ubl_bg.wasm`
- `pkg/validador_ubl_bg.wasm.d.ts`
- `pkg/validador_ubl.d.ts`
- `pkg/package.json`

### 6.2 Verificar tamaño de archivos
- `validador_ubl_bg.wasm` debe ser de varios KB
- `validador_ubl.js` debe ser de varios KB

---

## 📋 **PASO 7: PROBAR APLICACIÓN WEB**

### 7.1 Abrir aplicación web
- Abrir `index.html` en el navegador
- Debe cargar sin errores en la consola

### 7.2 Probar validación
- Subir archivo XML válido → Debe mostrar "Válido"
- Subir archivo XML inválido → Debe mostrar error específico

---

## 🔧 **COMANDOS ÚTILES ADICIONALES**

### Verificar compilación sin errores
```bash
cargo check
```

### Ejecutar tests (si existen)
```bash
cargo test
```

### Limpiar todo y recompilar
```bash
cargo clean
cargo build
wasm-pack build --target web --out-dir pkg --dev
```

### Ver ayuda del CLI
```bash
cargo run --bin validador-ubl --features cli -- --help
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### Error: "rustc no se reconoce"
- **Solución**: Rust no está instalado o no está en el PATH
- **Acción**: Reinstalar Rust y reiniciar terminal
- **Alternativa**: Si Rust está instalado pero no funciona, ejecutar: `$env:PATH += ";$env:USERPROFILE\.cargo\bin"`

### Error: "cargo no se reconoce"
- **Solución**: Cargo no está instalado
- **Acción**: Reinstalar Rust (cargo viene incluido)

### Error: "wasm-pack no se reconoce"
- **Solución**: wasm-pack no está instalado
- **Acción**: Ejecutar `cargo install wasm-pack`

### Error de compilación
- **Solución**: Verificar que todos los archivos Rust estén correctos
- **Acción**: Ejecutar `cargo check` para ver errores específicos

### Error: "target `validador-ubl` requires the features: `cli`"
- **Solución**: Falta especificar la feature CLI
- **Acción**: Agregar `--features cli` a los comandos de cargo run

---

## 📝 **NOTAS IMPORTANTES**

1. **Siempre reiniciar la terminal** después de instalar Rust
2. **Ejecutar comandos desde la carpeta del proyecto**
3. **Verificar que todos los archivos de ejemplo existan** antes de probar
4. **El WebAssembly se regenera cada vez** que se ejecuta `wasm-pack build`
5. **Los archivos en `pkg/` reemplazan automáticamente** los existentes

---

## 🌐 **PARTE 2: EJECUTAR APLICACIÓN WEB COMPLETA**

> **🎯 ESTA ES LA PARTE PRINCIPAL** - Para ejecutar toda la aplicación web (validación + visualización + PDF)

## 📋 **PASO 8: INSTALAR NODE.JS**

### 8.1 Descargar Node.js
- Ve a: https://nodejs.org/
- Descarga la versión LTS (recomendada)
- Ejecuta el instalador

### 8.2 Verificar instalación
```bash
node --version
npm --version
```
**Resultado esperado**: Debe mostrar las versiones de Node.js y npm

---

## 📋 **PASO 9: INSTALAR DEPENDENCIAS Y COMPILAR**

### 9.1 Instalar dependencias
```bash
npm install
```
**Resultado esperado**: Instalación de TypeScript y dependencias

### 9.2 Compilar TypeScript
```bash
npm run build
```
**Resultado esperado**: 
- Creación de archivos en carpeta `compiled/`
- Archivos generados: `modules.js`, `visualizer.js`, `pdf-generator.js`, etc.

---

## 📋 **PASO 10: EJECUTAR APLICACIÓN WEB**

### 10.1 Abrir con Live Server (RECOMENDADO)
1. **Abrir VS Code** en la carpeta del proyecto
2. **Instalar extensión Live Server** (si no la tienes)
3. **Click derecho en `index.html`**
4. **Seleccionar "Open with Live Server"**
5. **Se abrirá automáticamente** en el navegador

### 10.2 Alternativa: Servidor HTTP simple
```bash
# Si tienes Python instalado:
python -m http.server 8000

# Luego abrir: http://localhost:8000
```

### 10.3 Probar la aplicación
1. **Arrastrar archivo XML UBL** a la zona de carga
2. **Click "Validar Documento"** para verificar
3. **Click "Visualizar Factura"** para ver datos
4. **Click "Descargar PDF"** para generar documento

---

## 🚨 **SOLUCIÓN DE PROBLEMAS - APLICACIÓN WEB**

### Error: "Módulo de visualización no disponible"
- **Causa**: No se está ejecutando desde servidor HTTP
- **Solución**: Usar Live Server en VS Code (no abrir HTML directamente)

### Error: "Failed to fetch"
- **Causa**: Archivos WebAssembly no encontrados
- **Solución**: Verificar que existe `rust/wasm-output/pkg/validador_ubl.js`

### Error: "TypeScript compilation failed"
- **Causa**: Errores en código TypeScript
- **Solución**: Ejecutar `npm run build` y revisar errores

### Error: "Cannot resolve module"
- **Causa**: Dependencias no instaladas
- **Solución**: Ejecutar `npm install`

---

## 📝 **NOTAS IMPORTANTES - APLICACIÓN WEB**

1. **Siempre usar Live Server** - No abrir HTML directamente
2. **Verificar que WebAssembly esté compilado** - Archivos en `rust/wasm-output/pkg/`
3. **Compilar TypeScript** antes de ejecutar - `npm run build`
4. **Usar navegador moderno** - Chrome, Firefox, Safari, Edge
5. **Archivos de ejemplo** están en `ejemplos_ubl/` para probar
