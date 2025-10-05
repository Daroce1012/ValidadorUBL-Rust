/**
 * Generador de PDFs Simplificado para facturas UBL
 */
import { UBLInvoice, PDFGenerationOptions, ValidationResult } from './types.js';
import { InvoiceFormatter } from './invoice-formatter.js';

declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

export class PDFGenerator {
    private formatter: InvoiceFormatter;

    constructor() {
        this.formatter = new InvoiceFormatter();
    }

    /**
     * Genera PDF desde el contenido HTML de la factura visualizada
     */
    public async generatePDFFromHTML(invoiceContent: HTMLElement, options?: { includeValidation?: boolean; validationResult?: ValidationResult }): Promise<void> {
        try {
            const originalText = document.querySelector('#downloadPdfBtn')?.innerHTML;
            const downloadBtn = document.querySelector('#downloadPdfBtn') as HTMLButtonElement;
            
            if (downloadBtn) {
                downloadBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Generando PDF...</span>';
                downloadBtn.disabled = true;
            }

            if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                throw new Error('Las librerías necesarias no están cargadas.');
            }

            const canvas = await window.html2canvas(invoiceContent, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                removeContainer: true,
                imageTimeout: 0,
                letterRendering: true,
                width: invoiceContent.scrollWidth,
                height: invoiceContent.scrollHeight,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc: Document) => {
                    this.applyPDFStyles(clonedDoc);
                }
            });

            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            // Calcular cuántas páginas se necesitan
            const availableHeight = pageHeight - (margin * 2);
            
            if (imgHeight <= availableHeight) {
                // El contenido cabe en una página
                const yPosition = margin + (availableHeight - imgHeight) / 2;
                pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            } else {
                // El contenido necesita múltiples páginas
                let yPosition = 0;
                let remainingHeight = imgHeight;
                let pageNumber = 0;
                
                while (remainingHeight > 0) {
                    if (pageNumber > 0) {
                        pdf.addPage();
                    }
                    
                    // Calcular la porción de la imagen para esta página
                    const sourceY = pageNumber * availableHeight * (canvas.height / imgHeight);
                    const sourceHeight = Math.min(availableHeight * (canvas.height / imgHeight), canvas.height - sourceY);
                    
                    // Crear un canvas temporal para esta página
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = sourceHeight;
                    
                    const ctx = pageCanvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(
                            canvas,
                            0, sourceY,                    // Origen en el canvas original
                            canvas.width, sourceHeight,     // Tamaño de origen
                            0, 0,                          // Destino en el nuevo canvas
                            canvas.width, sourceHeight      // Tamaño de destino
                        );
                        
                        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
                        const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
                        pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImgHeight);
                    }
                    
                    remainingHeight -= availableHeight;
                    pageNumber++;
                }
            }
            
            const invoiceNumber = document.getElementById('invoiceNumber')?.textContent || 'factura';
            const fileName = `Factura_${invoiceNumber}.pdf`;
            pdf.save(fileName);
            
            if (downloadBtn && originalText) {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }

        } catch (error) {
            console.error('Error:', error);
            const downloadBtn = document.querySelector('#downloadPdfBtn') as HTMLButtonElement;
            if (downloadBtn) {
                downloadBtn.innerHTML = '<span class="btn-icon">📥</span><span class="btn-text">Descargar PDF</span>';
                downloadBtn.disabled = false;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error generando PDF: ${errorMessage}`);
        }
    }

    /**
     * Aplica estilos optimizados para PDF
     */
    private applyPDFStyles(clonedDoc: Document): void {
        const clonedContent = clonedDoc.querySelector('.invoice-content');
        if (!clonedContent) return;

        const htmlEl = clonedContent as HTMLElement;
        htmlEl.style.backgroundColor = '#ffffff';
        htmlEl.style.color = '#000000';
        htmlEl.style.fontFamily = 'Arial, sans-serif';
        htmlEl.style.border = 'none';
        htmlEl.style.outline = 'none';
        htmlEl.style.boxShadow = 'none';
        
        const allElements = clonedContent.querySelectorAll('*');
        allElements.forEach((el) => {
            const element = el as HTMLElement;
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            element.style.display = element.style.display || '';
            
            const tagName = element.tagName.toLowerCase();
            const isTableElement = tagName === 'table' || tagName === 'th' || tagName === 'td' || 
                                   element.classList.contains('invoice-items-table');
            
            if (!isTableElement) {
                element.style.border = 'none';
                element.style.outline = 'none';
                element.style.boxShadow = 'none';
            }
            
            if (element.style.backgroundColor === 'transparent' || 
                element.style.backgroundColor === 'rgba(0,0,0,0)' ||
                !element.style.backgroundColor) {
                element.style.backgroundColor = '';
            }
            
            if (element.style.color === 'transparent' || 
                element.style.color === 'rgba(0,0,0,0)') {
                element.style.color = '';
            }
        });
    }
}
