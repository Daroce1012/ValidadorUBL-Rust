/**
 * Generador de PDFs para facturas UBL
 */
import { UBLInvoice, PDFGenerationOptions, ValidationResult } from './types';
import { InvoiceFormatter } from './invoice-formatter';

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
     * Genera un PDF de la factura con opciones avanzadas
     */
    public async generateInvoicePDF(invoice: UBLInvoice, options?: PDFGenerationOptions): Promise<void> {
        try {
            if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                throw new Error('Las librerías jsPDF y html2canvas no están cargadas.');
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Agregar watermark si se especifica
            if (options?.watermark) {
                this.addWatermark(pdf, options.watermark);
            }

            // Generar contenido de la factura
            await this.generateInvoiceContent(pdf, invoice, options);

            // Reporte de validación deshabilitado

            // Guardar el PDF
            const fileName = `Factura_${invoice.id}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error generando PDF: ${errorMessage}`);
        }
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
            });

            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            
            const imgWidth = pageWidth - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let yPosition = margin;
            if (imgHeight < pageHeight - (margin * 2)) {
                yPosition = margin + (pageHeight - margin * 2 - imgHeight) / 2;
            }
            
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
            
            // Reporte de validación deshabilitado
            
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

    private addWatermark(pdf: any, watermark: string): void {
        pdf.setFontSize(50);
        pdf.setTextColor(200, 200, 200);
        pdf.text(watermark, 105, 150, { align: 'center', angle: 45 });
        pdf.setTextColor(0, 0, 0);
    }

    private async generateInvoiceContent(pdf: any, invoice: UBLInvoice, options?: PDFGenerationOptions): Promise<void> {
        const pageWidth = 210;
        const margin = 10;
        let yPosition = margin;

        // Título de la factura
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('FACTURA', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        // Información básica
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Número: ${invoice.id}`, margin, yPosition);
        pdf.text(`Fecha: ${this.formatter.formatDate(invoice.issueDate)}`, pageWidth / 2, yPosition);
        yPosition += 10;

        // Información de las partes
        yPosition = this.addPartiesSection(pdf, invoice, yPosition, margin);

        // Tabla de productos/servicios
        yPosition = this.addInvoiceLinesTable(pdf, invoice, yPosition, margin, pageWidth);

        // Totales
        this.addTotalsSection(pdf, invoice, yPosition, margin, pageWidth);
    }

    private addPartiesSection(pdf: any, invoice: UBLInvoice, yPosition: number, margin: number): number {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('INFORMACIÓN DE LAS PARTES', margin, yPosition);
        yPosition += 10;

        // Proveedor
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROVEEDOR:', margin, yPosition);
        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(invoice.accountingSupplierParty.partyName, margin, yPosition);
        yPosition += 5;
        
        const supplierAddress = this.formatter.formatAddress(invoice.accountingSupplierParty.postalAddress);
        if (supplierAddress !== 'No especificada') {
            pdf.text(supplierAddress, margin, yPosition);
            yPosition += 5;
        }

        // Cliente
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.text('CLIENTE:', margin, yPosition);
        yPosition += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.text(invoice.accountingCustomerParty.partyName, margin, yPosition);
        yPosition += 5;
        
        const customerAddress = this.formatter.formatAddress(invoice.accountingCustomerParty.postalAddress);
        if (customerAddress !== 'No especificada') {
            pdf.text(customerAddress, margin, yPosition);
            yPosition += 5;
        }

        return yPosition + 10;
    }

    private addInvoiceLinesTable(pdf: any, invoice: UBLInvoice, yPosition: number, margin: number, pageWidth: number): number {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DETALLE DE PRODUCTOS Y SERVICIOS', margin, yPosition);
        yPosition += 10;

        // Encabezados de tabla
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        const colWidths = [80, 25, 25, 25];
        const colPositions = [
            margin, 
            margin + (colWidths[0] || 0), 
            margin + (colWidths[0] || 0) + (colWidths[1] || 0), 
            margin + (colWidths[0] || 0) + (colWidths[1] || 0) + (colWidths[2] || 0)
        ];
        
        pdf.text('Descripción', colPositions[0], yPosition);
        pdf.text('Cant.', colPositions[1], yPosition);
        pdf.text('Precio', colPositions[2], yPosition);
        pdf.text('Total', colPositions[3], yPosition);
        yPosition += 5;

        // Líneas de la factura
        pdf.setFont('helvetica', 'normal');
        invoice.invoiceLines.forEach(line => {
            // Verificar si necesitamos una nueva página
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.text(line.item.description || line.item.name || 'Sin descripción', colPositions[0], yPosition);
            pdf.text(line.quantity.toFixed(2), colPositions[1], yPosition);
            pdf.text(this.formatter.formatCurrency(line.price.priceAmount, invoice.documentCurrencyCode), colPositions[2], yPosition);
            pdf.text(this.formatter.formatCurrency(line.lineExtensionAmount, invoice.documentCurrencyCode), colPositions[3], yPosition);
            yPosition += 5;
        });

        return yPosition + 10;
    }

    private addTotalsSection(pdf: any, invoice: UBLInvoice, yPosition: number, margin: number, pageWidth: number): void {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TOTALES', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');

        const totals = this.formatter.buildTotalsList(invoice.legalMonetaryTotals);
        
        totals.forEach(total => {
            pdf.text(total.label + ':', margin + 50, yPosition);
            pdf.text(this.formatter.formatCurrency(total.value, invoice.documentCurrencyCode), margin + 120, yPosition);
            yPosition += 5;
        });

        // Total final
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text('TOTAL A PAGAR:', margin + 50, yPosition);
        pdf.text(this.formatter.formatCurrency(invoice.legalMonetaryTotals.payableAmount, invoice.documentCurrencyCode), margin + 120, yPosition);
    }

    private addValidationReport(pdf: any, validationResult: ValidationResult): void {
        const pageWidth = 210;
        const margin = 10;
        let yPosition = margin;

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('REPORTE DE VALIDACIÓN', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Estado de la validación:', margin, yPosition);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        const statusColor = validationResult.isValid ? [0, 150, 0] : [200, 0, 0];
        pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        pdf.text(validationResult.message, margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 10;

        if (validationResult.errors && validationResult.errors.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.text('Errores encontrados:', margin, yPosition);
            yPosition += 8;

            pdf.setFont('helvetica', 'normal');
            validationResult.errors.forEach((error, index) => {
                pdf.text(`${index + 1}. ${error}`, margin + 5, yPosition);
                yPosition += 5;
            });
        }
    }
}
