export const TRANSFER_STATUSES = [
  "Completed",
  "In Transit",
  "Pending",
  "Cancelled",
] as const;

export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_TYPES = ["Transfer In", "Transfer Out"] as const;

export type TransferType = (typeof TRANSFER_TYPES)[number];

export type TransferProduct = {
  name: string;
  qty: number;
  unitCost: number;
};

export type InventoryTransfer = {
  id: number;
  date: string;
  type: TransferType;
  products: TransferProduct[];
  fromLocation: string;
  toLocation: string;
  status: TransferStatus;
  totalCost: number;
};

export const STORES = [
  "Underwood Retail",
  "Brisbane CBD",
  "Garden City",
  "Carindale",
  "Chermside",
  "Macquarie Centre",
];

export const TRANSFER_STORES = [
  "Mobile Connect Brisbane",
  "Mobile Connect Sunnybank Hills",
] as const;

export type TransferStore = (typeof TRANSFER_STORES)[number];

export const OPPOSITE_STORE: Record<TransferStore, TransferStore> = {
  "Mobile Connect Brisbane": "Mobile Connect Sunnybank Hills",
  "Mobile Connect Sunnybank Hills": "Mobile Connect Brisbane",
};

export const MOCK_USERS = ["Saurabh Gulati", "Admin User"];

export type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  upc: string;
  serial: string;
  imei: string;
  availableQuantity: number;
  cost: number;
};

export const INVENTORY_PRODUCTS: InventoryItem[] = [
  {
    id: 1,
    name: "Samsung Galaxy S24 128GB",
    sku: "SMS-S24-128",
    upc: "8806095670711",
    serial: "S24-71A20",
    imei: "356789104532761",
    availableQuantity: 14,
    cost: 560,
  },
  {
    id: 2,
    name: "iPhone 14 Pro 256GB",
    sku: "APL-IP14P-256",
    upc: "1942533529441",
    serial: "IP14P-88C51",
    imei: "356104998431227",
    availableQuantity: 9,
    cost: 930,
  },
  {
    id: 3,
    name: "Apple iPad Air 64GB",
    sku: "APL-IPAD-64",
    upc: "1901990737449",
    serial: "IPADAIR-24E11",
    imei: "",
    availableQuantity: 6,
    cost: 490,
  },
  {
    id: 4,
    name: "Samsung Galaxy A54 128GB",
    sku: "SMS-A54-128",
    upc: "8806095633280",
    serial: "A54-12B07",
    imei: "351782205844390",
    availableQuantity: 22,
    cost: 280,
  },
  {
    id: 5,
    name: "Samsung Galaxy Watch 5",
    sku: "SMS-GW5-40",
    upc: "8806095590842",
    serial: "GW5-33D12",
    imei: "",
    availableQuantity: 11,
    cost: 210,
  },
  {
    id: 6,
    name: "Google Pixel 7 128GB",
    sku: "GGL-PX7-128",
    upc: "8400031000617",
    serial: "PX7-55F04",
    imei: "354182007639215",
    availableQuantity: 8,
    cost: 350,
  },
  {
    id: 7,
    name: "Apple Watch Series 8 45mm",
    sku: "APL-AW8-45",
    upc: "1942534301195",
    serial: "AW8-19A33",
    imei: "",
    availableQuantity: 5,
    cost: 290,
  },
  {
    id: 8,
    name: "iPhone 13 128GB",
    sku: "APL-IP13-128",
    upc: "1942535839769",
    serial: "IP13-77B29",
    imei: "356670993215488",
    availableQuantity: 12,
    cost: 490,
  },
  {
    id: 9,
    name: "Samsung Galaxy Tab S8",
    sku: "SMS-TABS8-128",
    upc: "8806094830272",
    serial: "TABS8-90C16",
    imei: "",
    availableQuantity: 4,
    cost: 620,
  },
  {
    id: 10,
    name: "Google Pixel Buds Pro",
    sku: "GGL-PBP-WHT",
    upc: "8400031044229",
    serial: "PBP-02E08",
    imei: "",
    availableQuantity: 18,
    cost: 130,
  },
];

const PRODUCT_POOL: [string, number, number][] = [
  ["Samsung Galaxy S24 128GB", 1, 560],
  ["iPhone 14 Pro 256GB", 1, 930],
  ["Apple iPad Air 64GB", 1, 490],
  ["Samsung Galaxy A54 128GB", 2, 280],
  ["Samsung Galaxy Watch 5", 1, 210],
  ["Google Pixel 7 128GB", 1, 350],
  ["Apple Watch Series 8 45mm", 1, 290],
  ["iPhone 13 128GB", 1, 490],
  ["Samsung Galaxy Tab S8", 1, 620],
  ["Google Pixel Buds Pro", 1, 130],
];

function seedTransfers(): InventoryTransfer[] {
  const transfers: InventoryTransfer[] = [];
  for (let i = 1; i <= 132; i++) {
    const fromLocation = STORES[i % STORES.length];
    const toLocation = STORES[(i + 2) % STORES.length];
    const type: TransferType = i % 4 === 0 ? "Transfer In" : "Transfer Out";
    const status: TransferStatus =
      i % 13 === 0
        ? "Cancelled"
        : i % 8 === 0
          ? "Pending"
          : i % 5 === 0
            ? "In Transit"
            : "Completed";

    const productCount = (i % 3) + 1;
    const products: TransferProduct[] = [];
    for (let p = 0; p < productCount; p++) {
      const [name, qty, unitCost] =
        PRODUCT_POOL[(i + p * 3) % PRODUCT_POOL.length];
      products.push({ name, qty: qty * (((i + p) % 3) + 1), unitCost });
    }
    const totalCost = products.reduce(
      (sum, prod) => sum + prod.qty * prod.unitCost,
      0,
    );
    const month = (i * 7) % 8;
    const day = ((i * 3) % 28) + 1;

    transfers.push({
      id: 1000 + i,
      date: new Date(2026, month, day).toISOString().slice(0, 10),
      type,
      products,
      fromLocation,
      toLocation,
      status,
      totalCost,
    });
  }
  return transfers;
}

export const TRANSFERS: InventoryTransfer[] = seedTransfers();
