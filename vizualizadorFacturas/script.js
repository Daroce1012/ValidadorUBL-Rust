var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        this.uploadButton = this.getElementById('uploadBtn');
        this.filePreview = this.getElementById('filePreview');
        this.fileName = this.getElementById('fileName');
        this.previewButton = this.getElementById('previewBtn');
        this.changeFileButton = this.getElementById('changeFileBtn');
        this.errorSection = this.getElementById('errorSection');
        this.closeButton = this.getElementById('closeBtn');
        this.retryButton = this.getElementById('retryBtn');
        this.downloadPdfButton = this.getElementById('downloadPdfBtn');
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
        this.uploadButton.addEventListener('click', () => this.handleUploadClick());
        this.fileInput.addEventListener('change', (event) => this.handleFileSelect(event));
        this.uploadArea.addEventListener('dragover', (event) => this.handleDragOver(event));
        this.uploadArea.addEventListener('dragleave', (event) => this.handleDragLeave(event));
        this.uploadArea.addEventListener('drop', (event) => this.handleDrop(event));
        this.previewButton.addEventListener('click', () => this.handlePreviewClick());
        this.changeFileButton.addEventListener('click', () => this.handleChangeFileClick());
        this.closeButton.addEventListener('click', () => this.handleCloseClick());
        this.retryButton.addEventListener('click', () => this.handleRetryClick());
        this.downloadPdfButton.addEventListener('click', () => this.handleDownloadPdfClick());
    }
    handleUploadClick() {
        this.fileInput.click();
    }
    handleFileSelect(event) {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            this.showFilePreview(target.files[0]);
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
        var _a;
        event.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = (_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.files;
        if (files && files.length > 0) {
            this.showFilePreview(files[0]);
        }
    }
    handlePreviewClick() {
        this.previewInvoice();
    }
    handleChangeFileClick() {
        this.changeFile();
    }
    handleCloseClick() {
        this.navigateToUploadPage();
    }
    handleRetryClick() {
        this.hideError();
        this.fileInput.click();
    }
    handleDownloadPdfClick() {
        this.downloadAsPDF();
    }
    showFilePreview(file) {
        if (!this.isValidXmlFile(file)) {
            this.showError('Por favor, selecciona un archivo XML v├ílido.');
            return;
        }
        this.currentFile = file;
        this.fileName.textContent = file.name;
        this.filePreview.style.display = 'block';
        this.uploadArea.style.display = 'none';
        this.hideError();
    }
    isValidXmlFile(file) {
        return file.name.toLowerCase().endsWith('.xml');
    }
    previewInvoice() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentFile) {
                this.showError('No hay archivo seleccionado.');
                return;
            }
            try {
                this.showLoading();
                const xmlContent = yield this.readFileAsText(this.currentFile);
                const invoice = this.parseUBLXML(xmlContent);
                this.filePreview.style.display = 'none';
                this.displayInvoice(invoice);
                this.navigateToInvoicePage();
            }
            catch (error) {
                this.showError(`Error al procesar el archivo: ${this.getErrorMessage(error)}`);
            }
        });
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
            reader.onload = (event) => { var _a; return resolve((_a = event.target) === null || _a === void 0 ? void 0 : _a.result); };
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file, 'UTF-8');
        });
    }
    parseUBLXML(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('El archivo XML no es v├ílido');
        }
        const invoiceElement = xmlDoc.querySelector('Invoice') || xmlDoc.querySelector('CreditNote');
        if (!invoiceElement) {
            throw new Error('No se encontr├│ una factura v├ílida en el archivo UBL');
        }
        return this.extractInvoiceData(invoiceElement);
    }
    extractInvoiceData(invoiceElement) {
        const getTextContent = (selector) => {
            var _a;
            const element = invoiceElement.querySelector(selector);
            return ((_a = element === null || element === void 0 ? void 0 : element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
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
            var _a;
            const element = partyElement.querySelector(selector);
            return ((_a = element === null || element === void 0 ? void 0 : element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
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
                var _a;
                const element = lineElement.querySelector(selector);
                return ((_a = element === null || element === void 0 ? void 0 : element.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
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
            var _a;
            const element = invoiceElement.querySelector(selector);
            const text = (_a = element === null || element === void 0 ? void 0 : element.textContent) === null || _a === void 0 ? void 0 : _a.trim();
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
        this.getElementById('invoiceNumber').textContent = invoice.id;
        this.getElementById('invoiceDate').textContent = this.formatDate(invoice.issueDate);
        this.getElementById('invoiceCurrency').textContent = invoice.documentCurrencyCode;
    }
    populatePartiesInfo(invoice) {
        this.getElementById('supplierInfo').innerHTML = this.createPartyInfo(invoice.accountingSupplierParty);
        this.getElementById('customerInfo').innerHTML = this.createPartyInfo(invoice.accountingCustomerParty);
    }
    createPartyInfo(party) {
        const addressText = this.formatAddress(party.postalAddress);
        const contactText = this.formatContact(party.contact);
        return `
            <p><strong>${party.partyName}</strong></p>
            ${party.partyIdentification ? `<p><strong>ID:</strong> ${party.partyIdentification}</p>` : ''}
            <p><strong>Direcci├│n:</strong> ${addressText}</p>
            <p><strong>Contacto:</strong> ${contactText}</p>
        `;
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
        if (!contact)
            return 'No especificado';
        const contactParts = [
            contact.name,
            contact.telephone,
            contact.electronicMail
        ].filter(Boolean);
        return contactParts.length > 0 ? contactParts.join(' | ') : 'No especificado';
    }
    populateInvoiceLines(invoice) {
        const tableBody = this.getElementById('invoiceTableBody');
        tableBody.innerHTML = '';
        invoice.invoiceLines.forEach(line => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="description">${line.item.description || line.item.name || 'Sin descripci├│n'}</td>
                <td class="quantity">${line.quantity.toFixed(2)}</td>
                <td class="price">${this.formatCurrency(line.price.priceAmount, invoice.documentCurrencyCode)}</td>
                <td class="total">${this.formatCurrency(line.lineExtensionAmount, invoice.documentCurrencyCode)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    populateTotalsInfo(invoice) {
        const totalsContainer = this.getElementById('totalsInfo');
        totalsContainer.innerHTML = '';
        const totals = this.buildTotalsList(invoice.legalMonetaryTotals);
        totals.forEach(total => {
            const totalLine = document.createElement('div');
            totalLine.className = 'total-line';
            totalLine.innerHTML = `
                <span class="label">${total.label}:</span>
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
        if (!dateString)
            return 'No especificada';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        catch (_a) {
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
        this.navigateToUploadPage();
        this.getElementById('errorMessage').textContent = message;
    }
    hideError() {
        this.errorSection.style.display = 'none';
    }
    navigateToUploadPage() {
        this.uploadPage.style.display = 'block';
        this.invoicePage.style.display = 'none';
        this.currentFile = null;
        this.filePreview.style.display = 'none';
        this.uploadArea.style.display = 'block';
        this.fileInput.value = '';
        this.hideError();
    }
    navigateToInvoicePage() {
        this.uploadPage.style.display = 'none';
        this.invoicePage.style.display = 'block';
    }
    downloadAsPDF() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const originalText = this.downloadPdfButton.innerHTML;
                this.downloadPdfButton.innerHTML = '<span class="btn-icon">ΓÅ│</span><span class="btn-text">Generando PDF...</span>';
                this.downloadPdfButton.disabled = true;
                this.validateLibraries();
                const invoiceContent = this.getInvoiceContent();
                const canvas = yield this.captureInvoiceContent(invoiceContent);
                const pdf = this.createPDF(canvas);
                this.downloadPDF(pdf);
                this.restoreButton(originalText);
                this.showSuccessMessage('PDF generado exitosamente');
            }
            catch (error) {
                this.handlePDFError(error);
            }
        });
    }
    validateLibraries() {
        if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
            throw new Error('Las librer├¡as necesarias no est├ín cargadas.');
        }
    }
    getInvoiceContent() {
        const invoiceContent = document.querySelector('.invoice-content');
        if (!invoiceContent) {
            throw new Error('No se encontr├│ el contenido de la factura');
        }
        return invoiceContent;
    }
    captureInvoiceContent(invoiceContent) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield window.html2canvas(invoiceContent, {
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
                onclone: (clonedDoc) => this.optimizeClonedContent(clonedDoc)
            });
        });
    }
    optimizeClonedContent(clonedDoc) {
        const clonedContent = clonedDoc.querySelector('.invoice-content');
        if (!clonedContent)
            return;
        const htmlEl = clonedContent;
        htmlEl.style.backgroundColor = '#ffffff';
        htmlEl.style.color = '#000000';
        htmlEl.style.fontFamily = 'Arial, sans-serif';
        htmlEl.style.border = 'none';
        htmlEl.style.outline = 'none';
        htmlEl.style.boxShadow = 'none';
        this.optimizeAllElements(clonedContent);
    }
    optimizeAllElements(container) {
        const allElements = container.querySelectorAll('*');
        allElements.forEach((el) => {
            const element = el;
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            element.style.display = element.style.display || '';
            if (!this.isTableElement(element)) {
                element.style.border = 'none';
                element.style.outline = 'none';
                element.style.boxShadow = 'none';
            }
            this.cleanTransparentStyles(element);
        });
    }
    isTableElement(element) {
        const tagName = element.tagName.toLowerCase();
        return tagName === 'table' || tagName === 'th' || tagName === 'td' ||
            element.classList.contains('invoice-items-table');
    }
    cleanTransparentStyles(element) {
        if (element.style.backgroundColor === 'transparent' ||
            element.style.backgroundColor === 'rgba(0,0,0,0)' ||
            !element.style.backgroundColor) {
            element.style.backgroundColor = '';
        }
        if (element.style.color === 'transparent' ||
            element.style.color === 'rgba(0,0,0,0)') {
            element.style.color = '';
        }
    }
    createPDF(canvas) {
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
        return pdf;
    }
    downloadPDF(pdf) {
        const invoiceNumber = this.getElementById('invoiceNumber').textContent || 'factura';
        const fileName = `Factura_${invoiceNumber}.pdf`;
        pdf.save(fileName);
    }
    restoreButton(originalText) {
        this.downloadPdfButton.innerHTML = originalText;
        this.downloadPdfButton.disabled = false;
    }
    handlePDFError(error) {
        console.error('Error:', error);
        const originalText = '<span class="btn-icon">≡ƒôÑ</span><span class="btn-text">Descargar PDF</span>';
        this.restoreButton(originalText);
        this.showError(`Error: ${this.getErrorMessage(error)}`);
    }
    getErrorMessage(error) {
        return error instanceof Error ? error.message : 'Error desconocido';
    }
    showSuccessMessage(message) {
        const notification = this.createNotification(message);
        this.addNotificationStyles();
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.remove();
            this.removeNotificationStyles();
        }, 3000);
    }
    createNotification(message) {
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
        return notification;
    }
    addNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    removeNotificationStyles() {
        const styles = document.head.querySelectorAll('style');
        styles.forEach(style => {
            var _a;
            if ((_a = style.textContent) === null || _a === void 0 ? void 0 : _a.includes('slideInRight')) {
                style.remove();
            }
        });
    }
}
// Inicializar la aplicaci├│n cuando el DOM est├⌐ listo
document.addEventListener('DOMContentLoaded', () => {
    new UBLInvoiceViewer();
});
