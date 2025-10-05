# Instrucciones de Ejecución

## Requisitos Previos

Asegúrate de tener instalado:

| Software | Versión utilizada | Instalación |
|----------|-------------------|-------------|
| **Node.js** | v14.21.3 | https://nodejs.org/ |
| **npm** | (incluido con Node.js) | - |
| **TypeScript** | 5.9.2 | `npm install` (se instala automáticamente) |
| **Temporal API Polyfill** | 0.5.1 | `npm install` (se instala automáticamente) |
| **Rust** | 1.90.0 | https://rustup.rs/ |
| **Cargo** | 1.90.0 | (incluido con Rust) |
| **wasm-pack** | 0.13.1 | `cargo install wasm-pack` |

---

## Ejecutar la Aplicación

1. **Instalar dependencias**:
   ```bash
   npm install
   ```
   
   Esto instalará automáticamente:
   - TypeScript (compilador)
   - @js-temporal/polyfill (medición precisa de rendimiento)

2. **Compilar TypeScript**:
   ```bash
   npm run build
   ```

3. **Abrir con Live Server**:
   - Instala la extensión "Live Server" en VS Code
   - Click derecho en `index.html` → "Open with Live Server"

---

## Recompilar WebAssembly (Opcional)

Solo si necesitas modificar el código Rust:

1. Instalar Rust: https://rustup.rs/
2. Instalar wasm-pack: `cargo install wasm-pack`
3. Compilar:
   ```bash
   cd rust
   wasm-pack build --target web --out-dir wasm-output --dev
   ```

---

## Solución de Problemas

| Error | Solución |
|-------|----------|
| "Cannot use import statement" | Usar Live Server, no abrir HTML directamente |
| "Cannot find module" | Ejecutar `npm run build` |
| "tsc no se reconoce" | Ejecutar `npm install` |
