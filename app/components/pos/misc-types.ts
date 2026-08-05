export type MiscItem = {
  id: number;
  type: string;
  name: string;
  description: string | null;
  is_barcode: boolean;
  commission: boolean;
  on_pos: boolean;
  retail_price: string | number;
  cost_price: string | number;
  tax_class: string;
  tax_inclusive: boolean;
  image: string | null;
  bulk_discount: boolean;
  percentage: string | number;
  percentage_calc: string;
  created_at: string;
  updated_at: string;
};

export const PERCENTAGE_TYPE = "Percentage of Total (%)";

export const MISC_TYPES = ["Miscellaneous", PERCENTAGE_TYPE];

export const PERCENTAGE_CALCULATIONS = ["Before Tax", "After Tax"];

export const TAX_CLASSES = ["gst", "none", "no-gst"];
