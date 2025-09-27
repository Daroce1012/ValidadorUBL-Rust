'use strict';

// Clase principal para el visualizador de facturas UBL
class UBLInvoiceViewer {
    constructor() {
        this.currentFile = null;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.uploadArea = this.getElementById('uploadArea');
        this.fileInput = this.getElementById('fileInput');
        this.uploadBtn = this.getElementById('uploadBtn');
        this.filePreview = this.getElementById('filePreview');
        this.fileName = this.getElementById('fileName');
        this.previewBtn = this.getElementById('previewBtn');
        this.changeFileBtn = this.getElementById('changeFileBtn');
        this.errorSection = this.getElementById('errorSection');
        this.closeBtn = this.getElementById('closeBtn');
        this.retryBtn = this.getElementById('retryBtn');
        this.downloadPdfBtn = this.getElementById('downloadPdfBtn');
        this.uploadPage = this.getElementById('uploadPage');
        this.invoicePage = this.getElementById('invoicePage');
    }

    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Elemento con ID '${id}' no encontrado`);
        }
        return element;
    }

    setupEventListeners() {
        this.uploadBtn.addEventListener('click', () => this.handleUploadClick());
        this.fileInput.addEventListener('change', (event) => this.handleFileSelect(event));
        
        this.uploadArea.addEventListener('dragover', (event) => this.handleDragOver(event));
        this.uploadArea.addEventListener('dragleave', (event) => this.handleDragLeave(event));
        this.uploadArea.addEventListener('drop', (event) => this.handleDrop(event));
        
        this.previewBtn.addEventListener('click', () => this.handlePreviewClick());
        this.changeFileBtn.addEventListener('click', () => this.handleChangeFileClick());
        
        this.closeBtn.addEventListener('click', () => this.handleCloseClick());
        this.retryBtn.addEventListener('click', () => this.handleRetryClick());
        this.downloadPdfBtn.addEventListener('click', () => this.handleDownloadPdfClick());
    }

    handleUploadClick() {
        this.fileInput.click();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.showFilePreview(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(event) {
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.showFilePreview(files[0]);
        }
    }

    showFilePreview(file) {
        if (!file.name.toLowerCase().endsWith('.xml')) {
            this.showError('Por favor, selecciona un archivo XML válido.');
            return;
        }

        this.currentFile = file;
        this.fileName.textContent = file.name;
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
        this.hideError();
    }

    async handlePreviewClick() {
        if (!this.currentFile) {
            this.showError('No hay archivo seleccionado.');
            return;
        }

        try {
            this.showLoading();
            const xmlContent = await this.readFileAsText(this.currentFile);
            const invoice = this.parseUBLXML(xmlContent);
            
            this.filePreview.style.display = 'none';
            this.displayInvoice(invoice);
            this.goToInvoicePage();
        } catch (error) {
            this.showError(`Error al procesar el archivo: ${error.message}`);
        }
    }

    handleChangeFileClick() {
        this.changeFile();
    }

    handleCloseClick() {
        this.goToUploadPage();
    }

    handleRetryClick() {
        this.fileInput.click();
    }

    async handleDownloadPdfClick() {
        await this.downloadAsPDF();
    }

    changeFile() {
        this.currentFile = null;
        this.filePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.fileInput.value = '';
        this.hideError();
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    parseUBLXML(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('El archivo XML no es válido');
        }

        const invoiceElement = xmlDoc.querySelector('Invoice') || xmlDoc.querySelector('CreditNote');
        if (!invoiceElement) {
            throw new Error('No se encontró una factura válida en el archivo UBL');
        }

        return this.extractInvoiceData(invoiceElement);
    }

    extractInvoiceData(invoiceElement) {
        const getTextContent = (selector) => {
            const element = invoiceElement.querySelector(selector);
            return element ? element.textContent.trim() : '';
        };

        const getNumberContent = (selector) => {
            const text = getTextContent(selector);
            return text ? parseFloat(text) : 0;
        };

        return {
            id: getTextContent('ID'),
            issueDate: getTextContent('IssueDate'),
            dueDate: getTextContent('DueDate') || undefined,
            invoiceTypeCode: getTextContent('InvoiceTypeCode'),
            documentCurrencyCode: getTextContent('DocumentCurrencyCode'),
            buyerReference: getTextContent('BuyerReference') || undefined,
            accountingSupplierParty: this.extractParty(invoiceElement, 'AccountingSupplierParty'),
            accountingCustomerParty: this.extractParty(invoiceElement, 'AccountingCustomerParty'),
            invoiceLines: this.extractInvoiceLines(invoiceElement),
            legalMonetaryTotals: this.extractMonetaryTotals(invoiceElement)
        };
    }

    extractParty(invoiceElement, partySelector) {
        const partyElement = invoiceElement.querySelector(partySelector);
        if (!partyElement) {
            return {
                partyName: 'No disponible',
                postalAddress: {}
            };
        }

        const getTextContent = (selector) => {
            const element = partyElement.querySelector(selector);
            return element ? element.textContent.trim() : '';
        };

        const partyName = getTextContent('PartyName') || getTextContent('Name');
        const partyIdentification = getTextContent('ID') || undefined;

        const addressElement = partyElement.querySelector('PostalAddress');
        const postalAddress = {};
        if (addressElement) {
            postalAddress.streetName = getTextContent('StreetName') || undefined;
            postalAddress.cityName = getTextContent('CityName') || undefined;
            postalAddress.postalZone = getTextContent('PostalZone') || undefined;
            postalAddress.countryCode = getTextContent('CountryCode') || undefined;
        }

        const contactElement = partyElement.querySelector('Contact');
        const contact = contactElement ? {
            name: getTextContent('Name') || undefined,
            telephone: getTextContent('Telephone') || undefined,
            electronicMail: getTextContent('ElectronicMail') || undefined
        } : undefined;

        return {
            partyName,
            partyIdentification,
            postalAddress,
            contact
        };
    }

    extractInvoiceLines(invoiceElement) {
        const lineElements = invoiceElement.querySelectorAll('InvoiceLine');
        const lines = [];

        lineElements.forEach(lineElement => {
            const getTextContent = (selector) => {
                const element = lineElement.querySelector(selector);
                return element ? element.textContent.trim() : '';
            };

            const getNumberContent = (selector) => {
                const text = getTextContent(selector);
                return text ? parseFloat(text) : 0;
            };

            const itemElement = lineElement.querySelector('Item');
            const item = {
                description: getTextContent('Description'),
                name: getTextContent('Name') || undefined,
                sellersItemIdentification: getTextContent('SellersItemIdentification') || undefined
            };

            const priceElement = lineElement.querySelector('Price');
            const price = {
                priceAmount: getNumberContent('PriceAmount'),
                baseQuantity: getNumberContent('BaseQuantity') || undefined
            };

            lines.push({
                id: getTextContent('ID'),
                quantity: getNumberContent('InvoicedQuantity'),
                lineExtensionAmount: getNumberContent('LineExtensionAmount'),
                item,
                price
            });
        });

        return lines;
    }

    extractMonetaryTotals(invoiceElement) {
        const getNumberContent = (selector) => {
            const element = invoiceElement.querySelector(selector);
            const text = element ? element.textContent.trim() : '';
            return text ? parseFloat(text) : 0;
        };

        return {
            lineExtensionAmount: getNumberContent('LineExtensionAmount'),
            taxExclusiveAmount: getNumberContent('TaxExclusiveAmount'),
            taxInclusiveAmount: getNumberContent('TaxInclusiveAmount'),
            payableAmount: getNumberContent('PayableAmount'),
            allowanceTotalAmount: getNumberContent('AllowanceTotalAmount') || undefined,
            chargeTotalAmount: getNumberContent('ChargeTotalAmount') || undefined
        };
    }

    displayInvoice(invoice) {
        this.hideError();
        this.populateInvoiceDetails(invoice);
        this.populatePartiesInfo(invoice);
        this.populateInvoiceLines(invoice);
        this.populateTotalsInfo(invoice);
        this.showInvoice();
    }

    populateInvoiceDetails(invoice) {
        document.getElementById('invoiceNumber').textContent = invoice.id;
        document.getElementById('invoiceDate').textContent = this.formatDate(invoice.issueDate);
        document.getElementById('invoiceCurrency').textContent = invoice.documentCurrencyCode;
    }

    populatePartiesInfo(invoice) {
        document.getElementById('supplierInfo').innerHTML = this.createPartyInfo(invoice.accountingSupplierParty);
        document.getElementById('customerInfo').innerHTML = this.createPartyInfo(invoice.accountingCustomerParty);
    }

    createPartyInfo(party) {
        const addressText = this.formatAddress(party.postalAddress);
        const contactText = this.formatContact(party.contact);

        return `
            <p><strong>${this.escapeHtml(party.partyName)}</strong></p>
            ${party.partyIdentification ? `<p><strong>ID:</strong> ${this.escapeHtml(party.partyIdentification)}</p>` : ''}
            <p><strong>Dirección:</strong> ${this.escapeHtml(addressText)}</p>
            <p><strong>Contacto:</strong> ${this.escapeHtml(contactText)}</p>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatAddress(address) {
        const addressParts = [
            address.streetName,
            address.cityName,
            address.postalZone,
            address.countryCode
        ].filter(Boolean);
        
        return addressParts.length > 0 ? addressParts.join(', ') : 'No especificada';
    }

    formatContact(contact) {
        if (!contact) return 'No especificado';
        
        const contactParts = [
            contact.name,
            contact.telephone,
            contact.electronicMail
        ].filter(Boolean);
        
        return contactParts.length > 0 ? contactParts.join(' | ') : 'No especificado';
    }

    populateInvoiceLines(invoice) {
        const tableBody = document.getElementById('invoiceTableBody');
        tableBody.innerHTML = '';

        invoice.invoiceLines.forEach(line => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="description">${this.escapeHtml(line.item.description || line.item.name || 'Sin descripción')}</td>
                <td class="quantity">${line.quantity.toFixed(2)}</td>
                <td class="price">${this.formatCurrency(line.price.priceAmount, invoice.documentCurrencyCode)}</td>
                <td class="total">${this.formatCurrency(line.lineExtensionAmount, invoice.documentCurrencyCode)}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    populateTotalsInfo(invoice) {
        const totalsContainer = document.getElementById('totalsInfo');
        totalsContainer.innerHTML = '';

        const totals = this.buildTotalsList(invoice.legalMonetaryTotals);
        
        totals.forEach(total => {
            const totalLine = document.createElement('div');
            totalLine.className = 'total-line';
            totalLine.innerHTML = `
                <span class="label">${this.escapeHtml(total.label)}:</span>
                <span class="value">${this.formatCurrency(total.value, invoice.documentCurrencyCode)}</span>
            `;
            totalsContainer.appendChild(totalLine);
        });

        this.addFinalTotal(invoice.legalMonetaryTotals.payableAmount, invoice.documentCurrencyCode, totalsContainer);
    }

    buildTotalsList(totals) {
        const totalsList = [
            { label: 'Subtotal', value: totals.lineExtensionAmount },
            { label: 'Total sin Impuestos', value: totals.taxExclusiveAmount },
            { label: 'Total con Impuestos', value: totals.taxInclusiveAmount }
        ];

        if (totals.allowanceTotalAmount) {
            totalsList.push({ 
                label: 'Descuentos', 
                value: totals.allowanceTotalAmount 
            });
        }

        if (totals.chargeTotalAmount) {
            totalsList.push({ 
                label: 'Cargos', 
                value: totals.chargeTotalAmount 
            });
        }

        return totalsList;
    }

    addFinalTotal(payableAmount, currency, container) {
        const finalTotal = document.createElement('div');
        finalTotal.className = 'total-line final';
        finalTotal.innerHTML = `
            <span class="label">TOTAL A PAGAR:</span>
            <span class="value">${this.formatCurrency(payableAmount, currency)}</span>
        `;
        container.appendChild(finalTotal);
    }

    formatDate(dateString) {
        if (!dateString) return 'No especificada';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    formatCurrency(amount, currency) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency || 'EUR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    showLoading() {
        this.uploadArea.classList.add('loading');
    }

    hideLoading() {
        this.uploadArea.classList.remove('loading');
    }

    showInvoice() {
        this.hideLoading();
        this.errorSection.style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        this.errorSection.style.display = 'block';
        this.goToUploadPage();
        document.getElementById('errorMessage').textContent = message;
    }

    hideError() {
        this.errorSection.style.display = 'none';
    }

    goToUploadPage() {
        this.uploadPage.style.display = 'block';
        this.invoicePage.style.display = 'none';
        this.currentFile = null;
        this.filePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.fileInput.value = '';
        this.hideError();
    }

    goToInvoicePage() {
        this.uploadPage.style.display = 'none';
        this.invoicePage.style.display = 'block';
    }

    async downloadAsPDF() {
        try {
            const originalText = this.downloadPdfBtn.innerHTML;
            this.downloadPdfBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Generando PDF...</span>';
            this.downloadPdfBtn.disabled = true;

            if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
                throw new Error('Las librerías necesarias no están cargadas.');
            }

            const invoiceContent = document.querySelector('.invoice-content');
            if (!invoiceContent) {
                throw new Error('No se encontró el contenido de la factura');
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
                onclone: (clonedDoc) => {
                    const clonedContent = clonedDoc.querySelector('.invoice-content');
                    if (!clonedContent) return;

                    const htmlEl = clonedContent;
                    htmlEl.style.backgroundColor = '#ffffff';
                    htmlEl.style.color = '#000000';
                    htmlEl.style.fontFamily = 'Arial, sans-serif';
                    htmlEl.style.border = 'none';
                    htmlEl.style.outline = 'none';
                    htmlEl.style.boxShadow = 'none';
                    
                    const allElements = clonedContent.querySelectorAll('*');
                    allElements.forEach((el) => {
                        el.style.opacity = '1';
                        el.style.visibility = 'visible';
                        el.style.display = el.style.display || '';
                        
                        const tagName = el.tagName.toLowerCase();
                        const isTableElement = tagName === 'table' || tagName === 'th' || tagName === 'td' || 
                                               el.classList.contains('invoice-items-table');
                        
                        if (!isTableElement) {
                            el.style.border = 'none';
                            el.style.outline = 'none';
                            el.style.boxShadow = 'none';
                        }
                        
                        if (el.style.backgroundColor === 'transparent' || 
                            el.style.backgroundColor === 'rgba(0,0,0,0)' ||
                            !el.style.backgroundColor) {
                            el.style.backgroundColor = '';
                        }
                        
                        if (el.style.color === 'transparent' || 
                            el.style.color === 'rgba(0,0,0,0)') {
                            el.style.color = '';
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
            
            const invoiceNumber = document.getElementById('invoiceNumber').textContent || 'factura';
            const fileName = `Factura_${invoiceNumber}.pdf`;
            pdf.save(fileName);
            
            this.downloadPdfBtn.innerHTML = originalText;
            this.downloadPdfBtn.disabled = false;
            this.showSuccessMessage('PDF generado exitosamente');

        } catch (error) {
            console.error('Error:', error);
            this.downloadPdfBtn.innerHTML = '<span class="btn-icon">📥</span><span class="btn-text">Descargar PDF</span>';
            this.downloadPdfBtn.disabled = false;
            this.showError(`Error: ${error.message}`);
        }
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #059669, #047857);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new UBLInvoiceViewer();
});