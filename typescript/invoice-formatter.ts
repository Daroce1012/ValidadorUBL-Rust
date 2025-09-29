/**
 * Formateador de Facturas UBL - Utilidades para formatear datos de facturas
 */
import { UBLInvoice, UBLParty, UBLLegalMonetaryTotals, TotalLine } from './types.js';

export class InvoiceFormatter {
    /**
     * Formatea una fecha en formato legible
     */
    public formatDate(dateString: string): string {
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

    /**
     * Formatea una cantidad monetaria
     */
    public formatCurrency(amount: number, currency: string): string {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency || 'EUR',
            minimumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Formatea información de una parte (proveedor/cliente)
     */
    public formatPartyInfo(party: UBLParty): string {
        const addressText = this.formatAddress(party.postalAddress);
        const contactText = this.formatContact(party.contact);

        return `
            <p><strong>${this.escapeHtml(party.partyName)}</strong></p>
            ${party.partyIdentification ? `<p><strong>ID:</strong> ${this.escapeHtml(party.partyIdentification)}</p>` : ''}
            <p><strong>Dirección:</strong> ${this.escapeHtml(addressText)}</p>
            <p><strong>Contacto:</strong> ${this.escapeHtml(contactText)}</p>
        `;
    }

    /**
     * Formatea una dirección postal
     */
    public formatAddress(address: any): string {
        const addressParts = [
            address.streetName,
            address.cityName,
            address.postalZone,
            address.countryCode
        ].filter(Boolean);
        
        return addressParts.length > 0 ? addressParts.join(', ') : 'No especificada';
    }

    /**
     * Formatea información de contacto
     */
    public formatContact(contact: any): string {
        if (!contact) return 'No especificado';
        
        const contactParts = [
            contact.name,
            contact.telephone,
            contact.electronicMail
        ].filter(Boolean);
        
        return contactParts.length > 0 ? contactParts.join(' | ') : 'No especificado';
    }

    /**
     * Construye la lista de totales para mostrar
     */
    public buildTotalsList(totals: UBLLegalMonetaryTotals): TotalLine[] {
        const totalsList: TotalLine[] = [
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

    /**
     * Agrega el total final a un contenedor
     */
    public addFinalTotal(payableAmount: number, currency: string, container: HTMLElement): void {
        const finalTotal = document.createElement('div');
        finalTotal.className = 'total-line final';
        finalTotal.innerHTML = `
            <span class="label">TOTAL A PAGAR:</span>
            <span class="value">${this.formatCurrency(payableAmount, currency)}</span>
        `;
        container.appendChild(finalTotal);
    }

    /**
     * Escapa HTML para prevenir XSS
     */
    public escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    /**
     * Genera un resumen de la factura para mostrar en la interfaz
     */
    public generateInvoiceSummary(invoice: UBLInvoice): string {
        const totalItems = invoice.invoiceLines.length;
        const totalAmount = invoice.legalMonetaryTotals.payableAmount;
        
        return `
            <div class="invoice-summary">
                <h3>Resumen de la Factura</h3>
                <p><strong>Número de elementos:</strong> ${totalItems}</p>
                <p><strong>Total a pagar:</strong> ${this.formatCurrency(totalAmount, invoice.documentCurrencyCode)}</p>
                <p><strong>Fecha de emisión:</strong> ${this.formatDate(invoice.issueDate)}</p>
            </div>
        `;
    }
}
