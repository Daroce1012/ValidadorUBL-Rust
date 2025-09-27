/**
 * Parser XML UBL - Convierte documentos XML UBL en objetos TypeScript tipados
 */
import { UBLInvoice, UBLParty, UBLInvoiceLine, UBLLegalMonetaryTotals, UBLItem, UBLPrice, UBLContact } from './types';

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

    private extractInvoiceData(invoiceElement: Element): UBLInvoice {
        const getTextContent = (selector: string): string => {
            const element = invoiceElement.querySelector(selector);
            return element ? element.textContent?.trim() || '' : '';
        };

        const getNumberContent = (selector: string): number => {
            const text = getTextContent(selector);
            return text ? parseFloat(text) : 0;
        };

        const dueDate = getTextContent('DueDate');
        const buyerReference = getTextContent('BuyerReference');
        
        return {
            id: getTextContent('ID'),
            issueDate: getTextContent('IssueDate'),
            ...(dueDate && { dueDate }),
            invoiceTypeCode: getTextContent('InvoiceTypeCode'),
            documentCurrencyCode: getTextContent('DocumentCurrencyCode'),
            ...(buyerReference && { buyerReference }),
            accountingSupplierParty: this.extractParty(invoiceElement, 'AccountingSupplierParty'),
            accountingCustomerParty: this.extractParty(invoiceElement, 'AccountingCustomerParty'),
            invoiceLines: this.extractInvoiceLines(invoiceElement),
            legalMonetaryTotals: this.extractMonetaryTotals(invoiceElement)
        };
    }

    private extractParty(invoiceElement: Element, partySelector: string): UBLParty {
        const partyElement = invoiceElement.querySelector(partySelector);
        if (!partyElement) {
            return {
                partyName: 'No disponible',
                postalAddress: {}
            };
        }

        const getTextContent = (selector: string): string => {
            const element = partyElement.querySelector(selector);
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
        const lineElements = invoiceElement.querySelectorAll('InvoiceLine');
        const lines: UBLInvoiceLine[] = [];

        lineElements.forEach(lineElement => {
            const getTextContent = (selector: string): string => {
                const element = lineElement.querySelector(selector);
                return element ? element.textContent?.trim() || '' : '';
            };

            const getNumberContent = (selector: string): number => {
                const text = getTextContent(selector);
                return text ? parseFloat(text) : 0;
            };

            const itemElement = lineElement.querySelector('Item');
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
