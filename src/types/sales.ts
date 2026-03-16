/** Serialized SaleItem ready for client consumption (Decimal → number). */
export interface SerializedSaleItem {
    id: string;
    quantity: number;
    unitPrice: number;
    saleId: string;
    productId: string;
    product: {
        name: string;
        sku: string | null;
    };
}

/** Serialized Sale ready for client consumption (Decimal → number). */
export interface SerializedSale {
    id: string;
    total: number;
    paymentMethod: string;
    notes: string | null;
    businessId: string;
    createdAt: Date;
    updatedAt: Date;
    items: SerializedSaleItem[];
}
