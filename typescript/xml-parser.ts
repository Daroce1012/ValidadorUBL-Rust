/**
 * Parser XML UBL Simplificado
 * Convierte documentos XML UBL en objetos TypeScript tipados
 */
import { UBLInvoice, UBLParty, UBLInvoiceLine, UBLLegalMonetaryTotals, UBLItem, UBLPrice, UBLContact } from './types.js';

export class UBLXMLParser {
    /**
     * Parsea un documento XML UBL y extrae la información de la factura
     */
    public parseUBLXML(xmlText: string): UBLInvoice {
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

    /**
     * Busca un elemento por nombre local (ignorando namespace)
     */
    private findElementByLocalName(parent: Element, localName: string): Element | null {
        const elements = parent.querySelectorAll('*');
        for (const element of elements) {
            if (element.localName === localName) {
                return element;
            }
        }
        return null;
    }

    /**
     * Busca un elemento usando selector o nombre local
     */
    private findElement(parent: Element, selector: string): Element | null {
        return parent.querySelector(selector) || 
               this.findElementByLocalName(parent, selector.replace(/^[^:]*:/, ''));
    }

    /**
     * Obtiene el contenido de texto de un elemento
     */
    private getTextContent(parent: Element, selector: string): string {
        const element = this.findElement(parent, selector);
        return element?.textContent?.trim() || '';
    }

    /**
     * Obtiene el contenido numérico de un elemento
     */
    private getNumberContent(parent: Element, selector: string): number {
        const text = this.getTextContent(parent, selector);
        return text ? parseFloat(text) : 0;
    }

    /**
     * Extrae los datos principales de la factura
     */
    private extractInvoiceData(invoiceElement: Element): UBLInvoice {
        const dueDate = this.getTextContent(invoiceElement, 'DueDate');
        const buyerReference = this.getTextContent(invoiceElement, 'BuyerReference');
        
        // Buscar moneda en diferentes lugares
        let documentCurrencyCode = this.getTextContent(invoiceElement, 'DocumentCurrencyCode');
        if (!documentCurrencyCode) {
            const lineExtensionElement = this.findElement(invoiceElement, 'LineExtensionAmount');
            if (lineExtensionElement) {
                documentCurrencyCode = lineExtensionElement.getAttribute('currencyID') || '';
            }
        }
        if (!documentCurrencyCode) {
            const currencyElements = invoiceElement.querySelectorAll('[currencyID]');
            if (currencyElements.length > 0) {
                const firstElement = currencyElements[0];
                if (firstElement) {
                    documentCurrencyCode = firstElement.getAttribute('currencyID') || '';
                }
            }
        }

        return {
            id: this.getTextContent(invoiceElement, 'ID'),
            issueDate: this.getTextContent(invoiceElement, 'IssueDate'),
            ...(dueDate && { dueDate }),
            invoiceTypeCode: this.getTextContent(invoiceElement, 'InvoiceTypeCode'),
            documentCurrencyCode: documentCurrencyCode || 'EUR',
            ...(buyerReference && { buyerReference }),
            accountingSupplierParty: this.extractParty(invoiceElement, 'AccountingSupplierParty'),
            accountingCustomerParty: this.extractParty(invoiceElement, 'AccountingCustomerParty'),
            invoiceLines: this.extractInvoiceLines(invoiceElement),
            legalMonetaryTotals: this.extractMonetaryTotals(invoiceElement)
        };
    }

    /**
     * Extrae información de una parte (proveedor/cliente)
     */
    private extractParty(invoiceElement: Element, partySelector: string): UBLParty {
        const partyElement = this.findElement(invoiceElement, partySelector);
        if (!partyElement) {
            return {
                partyName: 'No disponible',
                postalAddress: {}
            };
        }

        const partyName = this.getTextContent(partyElement, 'PartyName') || this.getTextContent(partyElement, 'Name');
        const partyIdentification = this.getTextContent(partyElement, 'ID');

        // Extraer dirección postal
        const addressElement = partyElement.querySelector('PostalAddress');
        const postalAddress: any = {};
        if (addressElement) {
            postalAddress.streetName = this.getTextContent(addressElement, 'StreetName') || undefined;
            postalAddress.cityName = this.getTextContent(addressElement, 'CityName') || undefined;
            postalAddress.postalZone = this.getTextContent(addressElement, 'PostalZone') || undefined;
            postalAddress.countryCode = this.getTextContent(addressElement, 'CountryCode') || undefined;
        }

        // Extraer información de contacto
        const contactElement = partyElement.querySelector('Contact');
        let contact: UBLContact | undefined = undefined;
        if (contactElement) {
            const contactName = this.getTextContent(contactElement, 'Name');
            const contactTelephone = this.getTextContent(contactElement, 'Telephone');
            const contactEmail = this.getTextContent(contactElement, 'ElectronicMail');
            
            contact = {};
            if (contactName) contact.name = contactName;
            if (contactTelephone) contact.telephone = contactTelephone;
            if (contactEmail) contact.electronicMail = contactEmail;
        }

        return {
            partyName,
            ...(partyIdentification && { partyIdentification }),
            postalAddress,
            ...(contact && { contact })
        };
    }

    /**
     * Extrae las líneas de la factura
     */
    private extractInvoiceLines(invoiceElement: Element): UBLInvoiceLine[] {
        // Buscar líneas de factura con diferentes namespaces
        let lineElements = invoiceElement.querySelectorAll('InvoiceLine');
        if (lineElements.length === 0) {
            // Si no encuentra con selector directo, buscar por nombre local
            const allElements = invoiceElement.querySelectorAll('*');
            const invoiceLineElements: Element[] = [];
            for (const element of allElements) {
                if (element.localName === 'InvoiceLine') {
                    invoiceLineElements.push(element);
                }
            }
            lineElements = invoiceLineElements as any;
        }
        
        const lines: UBLInvoiceLine[] = [];

        lineElements.forEach(lineElement => {
            const itemName = this.getTextContent(lineElement, 'Name');
            const sellersItemId = this.getTextContent(lineElement, 'SellersItemIdentification');
            
            const item: UBLItem = {
                description: this.getTextContent(lineElement, 'Description'),
                ...(itemName && { name: itemName }),
                ...(sellersItemId && { sellersItemIdentification: sellersItemId })
            };

            const baseQuantity = this.getNumberContent(lineElement, 'BaseQuantity');
            
            const price: UBLPrice = {
                priceAmount: this.getNumberContent(lineElement, 'PriceAmount'),
                ...(baseQuantity > 0 && { baseQuantity })
            };

            lines.push({
                id: this.getTextContent(lineElement, 'ID'),
                quantity: this.getNumberContent(lineElement, 'InvoicedQuantity'),
                lineExtensionAmount: this.getNumberContent(lineElement, 'LineExtensionAmount'),
                item,
                price
            });
        });

        return lines;
    }

    /**
     * Extrae los totales monetarios
     */
    private extractMonetaryTotals(invoiceElement: Element): UBLLegalMonetaryTotals {
        const lineExtensionAmount = this.getNumberContent(invoiceElement, 'LineExtensionAmount');
        const payableAmount = this.getNumberContent(invoiceElement, 'PayableAmount');
        const allowanceTotal = this.getNumberContent(invoiceElement, 'AllowanceTotalAmount');
        const chargeTotal = this.getNumberContent(invoiceElement, 'ChargeTotalAmount');
        
        // Si no hay TaxExclusiveAmount o TaxInclusiveAmount, usar LineExtensionAmount como base
        let taxExclusiveAmount = this.getNumberContent(invoiceElement, 'TaxExclusiveAmount');
        let taxInclusiveAmount = this.getNumberContent(invoiceElement, 'TaxInclusiveAmount');
        
        // Si no se encuentran los campos de impuestos, usar LineExtensionAmount como fallback
        if (taxExclusiveAmount === 0 && lineExtensionAmount > 0) {
            taxExclusiveAmount = lineExtensionAmount;
        }
        if (taxInclusiveAmount === 0 && payableAmount > 0) {
            taxInclusiveAmount = payableAmount;
        }
        
        return {
            lineExtensionAmount,
            taxExclusiveAmount,
            taxInclusiveAmount,
            payableAmount,
            ...(allowanceTotal > 0 && { allowanceTotalAmount: allowanceTotal }),
            ...(chargeTotal > 0 && { chargeTotalAmount: chargeTotal })
        };
    }
}
