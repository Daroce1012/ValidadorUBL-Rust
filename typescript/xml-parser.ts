/**
 * Parser XML UBL - Convierte documentos XML UBL en objetos TypeScript tipados
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

    private findElementByLocalName(parent: Element, localName: string): Element | null {
        // Buscar todos los elementos y encontrar el que tenga el nombre local correcto
        const elements = parent.querySelectorAll('*');
        for (const element of elements) {
            if (element.localName === localName) {
                return element;
            }
        }
        return null;
    }

    private extractInvoiceData(invoiceElement: Element): UBLInvoice {
        const getTextContent = (selector: string): string => {
            // Intentar primero con selector exacto
            let element = invoiceElement.querySelector(selector);
            
            // Si no se encuentra, buscar por nombre local (ignorando namespace)
            if (!element) {
                const localName = selector.replace(/^[^:]*:/, ''); // Remover namespace
                element = this.findElementByLocalName(invoiceElement, localName);
            }
            
            return element ? element.textContent?.trim() || '' : '';
        };

        const getNumberContent = (selector: string): number => {
            const text = getTextContent(selector);
            return text ? parseFloat(text) : 0;
        };

        const getElement = (selector: string): Element | null => {
            // Intentar primero con selector exacto
            let element = invoiceElement.querySelector(selector);
            
            // Si no se encuentra, buscar por nombre local (ignorando namespace)
            if (!element) {
                const localName = selector.replace(/^[^:]*:/, ''); // Remover namespace
                element = this.findElementByLocalName(invoiceElement, localName);
            }
            
            return element;
        };

        const dueDate = getTextContent('DueDate');
        const buyerReference = getTextContent('BuyerReference');
        
        // Buscar moneda en diferentes lugares
        let documentCurrencyCode = getTextContent('DocumentCurrencyCode');
        if (!documentCurrencyCode) {
            // Buscar en LineExtensionAmount
            const lineExtensionElement = getElement('LineExtensionAmount');
            if (lineExtensionElement) {
                documentCurrencyCode = lineExtensionElement.getAttribute('currencyID') || '';
            }
        }
        if (!documentCurrencyCode) {
            // Buscar en cualquier elemento con atributo currencyID
            const currencyElements = invoiceElement.querySelectorAll('[currencyID]');
            if (currencyElements.length > 0) {
                const firstElement = currencyElements[0];
                if (firstElement) {
                    documentCurrencyCode = firstElement.getAttribute('currencyID') || '';
                }
            }
        }

        return {
            id: getTextContent('ID'),
            issueDate: getTextContent('IssueDate'),
            ...(dueDate && { dueDate }),
            invoiceTypeCode: getTextContent('InvoiceTypeCode'),
            documentCurrencyCode: documentCurrencyCode || 'EUR', // Fallback a EUR
            ...(buyerReference && { buyerReference }),
            accountingSupplierParty: this.extractParty(invoiceElement, 'AccountingSupplierParty', getElement),
            accountingCustomerParty: this.extractParty(invoiceElement, 'AccountingCustomerParty', getElement),
            invoiceLines: this.extractInvoiceLines(invoiceElement),
            legalMonetaryTotals: this.extractMonetaryTotals(invoiceElement)
        };
    }

    private extractParty(invoiceElement: Element, partySelector: string, getElement: (selector: string) => Element | null): UBLParty {
        const partyElement = getElement(partySelector);
        if (!partyElement) {
            return {
                partyName: 'No disponible',
                postalAddress: {}
            };
        }

        const getTextContent = (selector: string): string => {
            // Intentar primero con selector exacto
            let element = partyElement.querySelector(selector);
            
            // Si no se encuentra, buscar por nombre local (ignorando namespace)
            if (!element) {
                const localName = selector.replace(/^[^:]*:/, ''); // Remover namespace
                element = this.findElementByLocalName(partyElement, localName);
            }
            
            return element ? element.textContent?.trim() || '' : '';
        };

        const partyName = getTextContent('PartyName') || getTextContent('Name');
        const partyIdentification = getTextContent('ID');

        const addressElement = partyElement.querySelector('PostalAddress');
        const postalAddress: any = {};
        if (addressElement) {
            postalAddress.streetName = getTextContent('StreetName') || undefined;
            postalAddress.cityName = getTextContent('CityName') || undefined;
            postalAddress.postalZone = getTextContent('PostalZone') || undefined;
            postalAddress.countryCode = getTextContent('CountryCode') || undefined;
        }

        const contactElement = partyElement.querySelector('Contact');
        let contact: UBLContact | undefined = undefined;
        if (contactElement) {
            const contactName = getTextContent('Name');
            const contactTelephone = getTextContent('Telephone');
            const contactEmail = getTextContent('ElectronicMail');
            
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
            // Usar array directamente en lugar de NodeList
            lineElements = invoiceLineElements as any;
        }
        
        const lines: UBLInvoiceLine[] = [];

        lineElements.forEach(lineElement => {
            const getTextContent = (selector: string): string => {
                // Intentar primero con selector exacto
                let element = lineElement.querySelector(selector);
                
                // Si no se encuentra, buscar por nombre local (ignorando namespace)
                if (!element) {
                    const localName = selector.replace(/^[^:]*:/, ''); // Remover namespace
                    element = this.findElementByLocalName(lineElement, localName);
                }
                
                return element ? element.textContent?.trim() || '' : '';
            };

            const getNumberContent = (selector: string): number => {
                const text = getTextContent(selector);
                return text ? parseFloat(text) : 0;
            };

            let itemElement = lineElement.querySelector('Item');
            if (!itemElement) {
                itemElement = this.findElementByLocalName(lineElement, 'Item');
            }
            const itemName = getTextContent('Name');
            const sellersItemId = getTextContent('SellersItemIdentification');
            
            const item: UBLItem = {
                description: getTextContent('Description'),
                ...(itemName && { name: itemName }),
                ...(sellersItemId && { sellersItemIdentification: sellersItemId })
            };

            const priceElement = lineElement.querySelector('Price');
            const baseQuantity = getNumberContent('BaseQuantity');
            
            const price: UBLPrice = {
                priceAmount: getNumberContent('PriceAmount'),
                ...(baseQuantity > 0 && { baseQuantity })
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

    private extractMonetaryTotals(invoiceElement: Element): UBLLegalMonetaryTotals {
        const getNumberContent = (selector: string): number => {
            const element = invoiceElement.querySelector(selector);
            const text = element ? element.textContent?.trim() || '' : '';
            return text ? parseFloat(text) : 0;
        };

        const allowanceTotal = getNumberContent('AllowanceTotalAmount');
        const chargeTotal = getNumberContent('ChargeTotalAmount');
        
        return {
            lineExtensionAmount: getNumberContent('LineExtensionAmount'),
            taxExclusiveAmount: getNumberContent('TaxExclusiveAmount'),
            taxInclusiveAmount: getNumberContent('TaxInclusiveAmount'),
            payableAmount: getNumberContent('PayableAmount'),
            ...(allowanceTotal > 0 && { allowanceTotalAmount: allowanceTotal }),
            ...(chargeTotal > 0 && { chargeTotalAmount: chargeTotal })
        };
    }
}
