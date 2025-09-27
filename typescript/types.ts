/**
 * Definiciones de tipos para la aplicación UBL unificada
 */

// Definiciones de tipos para la aplicación UBL
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

export interface ValidationResult {
    isValid: boolean;
    message: string;
    errors?: string[];
}

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

export interface AppState {
    currentFile: File | null;
    xmlContent: string | null;
    invoice: UBLInvoice | null;
    validationResult: ValidationResult | null;
    isProcessing: boolean;
    currentView: 'upload' | 'validation' | 'visualization';
}

// Tipos para eventos de la aplicación
export interface FileSelectEvent {
    file: File;
    content: string;
}

export interface ValidationCompleteEvent {
    result: ValidationResult;
    xmlContent: string;
}

export interface VisualizationCompleteEvent {
    invoice: UBLInvoice;
    validationResult?: ValidationResult;
}

// Tipos para configuración de la aplicación
export interface AppConfig {
    maxFileSize: number; // en MB
    supportedFileTypes: string[];
    enablePDFExport: boolean;
    enableValidation: boolean;
    enableVisualization: boolean;
}
