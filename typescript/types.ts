/**
 * Definiciones de tipos esenciales para la aplicación UBL
 */

// === TIPOS PRINCIPALES DE UBL ===

export interface UBLInvoice {
    id: string;
    issueDate: string;
    dueDate?: string;
    invoiceTypeCode: string;
    documentCurrencyCode: string;
    buyerReference?: string;
    accountingSupplierParty: UBLParty;
    accountingCustomerParty: UBLParty;
    invoiceLines: UBLInvoiceLine[];
    legalMonetaryTotals: UBLLegalMonetaryTotals;
}

export interface UBLParty {
    partyName: string;
    partyIdentification?: string;
    postalAddress: UBLPostalAddress;
    contact?: UBLContact;
}

export interface UBLPostalAddress {
    streetName?: string;
    cityName?: string;
    postalZone?: string;
    countryCode?: string;
}

export interface UBLContact {
    name?: string;
    telephone?: string;
    electronicMail?: string;
}

export interface UBLInvoiceLine {
    id: string;
    quantity: number;
    lineExtensionAmount: number;
    item: UBLItem;
    price: UBLPrice;
}

export interface UBLItem {
    description: string;
    name?: string;
    sellersItemIdentification?: string;
}

export interface UBLPrice {
    priceAmount: number;
    baseQuantity?: number;
}

export interface UBLLegalMonetaryTotals {
    lineExtensionAmount: number;
    taxExclusiveAmount: number;
    taxInclusiveAmount: number;
    payableAmount: number;
    allowanceTotalAmount?: number;
    chargeTotalAmount?: number;
}

// === TIPOS DE VALIDACIÓN ===

export interface ValidationResult {
    isValid: boolean;
    message: string;
    errors?: string[];
}

// === TIPOS DE VISUALIZACIÓN ===

export interface VisualizationOptions {
    showValidationStatus?: boolean;
    includeValidationErrors?: boolean;
    pdfOptions?: PDFGenerationOptions;
}

export interface PDFGenerationOptions {
    includeValidationReport?: boolean;
    watermark?: string;
    customStyles?: Record<string, string>;
    validationResult?: ValidationResult;
}

export interface TotalLine {
    label: string;
    value: number;
}
