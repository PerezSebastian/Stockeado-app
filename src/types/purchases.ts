export interface SerializedPurchaseItem {
    id: string;
    quantity: number;
    unitCost: number;
    productId: string;
    product: {
        id: string;
        name: string;
        sku: string | null;
    };
}

export interface SerializedPurchase {
    id: string;
    total: number;
    supplierName: string | null;
    notes: string | null;
    createdAt: Date;
    items: SerializedPurchaseItem[];
}
