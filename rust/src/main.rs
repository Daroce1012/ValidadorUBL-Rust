//! Validador de documentos UBL (Universal Business Language) en formato XML

#![cfg(feature = "cli")]

mod validador;
mod archivo_handler;

use clap::Parser;
use validador::ValidadorUBL;
use archivo_handler::ArchivoHandler;
use anyhow::Result;

/// Validador de documentos UBL (Universal Business Language) en formato XML
#[derive(Parser)]
#[command(name = "validador-ubl")]
#[command(version = "1.0.0")]
#[command(about = "Valida documentos UBL Invoice para asegurar que cumplan con los estándares requeridos")]
#[command(long_about = None)]
struct Cli {
    /// Archivo XML UBL a validar
    #[arg(help = "Ruta al archivo XML UBL que se desea validar")]
    archivo: String,
    
    /// Modo verbose para mostrar más información
    #[arg(short, long, help = "Mostrar información detallada del proceso de validación")]
    verbose: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Crear manejador de archivos y validar
    let archivo_handler = ArchivoHandler::new(cli.archivo.clone());
    archivo_handler.validar_archivo()?;
    
    if cli.verbose {
        println!(" Validando archivo: {}", cli.archivo);
        println!("==========================================");
    }
    
    // Leer contenido del archivo
    let contenido = archivo_handler.leer_contenido()?;
    
    // Crear validador y validar contenido
    let mut validador = ValidadorUBL::new();
    
    match validador.validar_contenido(&contenido) {
        Ok(_) => {
            println!(" Factura válida: {}", cli.archivo);
            println!(" El documento UBL cumple con todos los requisitos");
            Ok(())
        }
        Err(e) => {
            println!(" Factura inválida: {}", cli.archivo);
            println!("  El documento UBL no cumple con los requisitos");
            
            if cli.verbose {
                println!(" Detalles del error: {}", e);
                
                // Mostrar errores detallados si están disponibles
                let errores = validador.obtener_errores();
                if !errores.is_empty() {
                    println!(" Errores detallados: {}", errores.join("; "));
                }
            }
            std::process::exit(1);
        }
    }
}