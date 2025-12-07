import { Constants } from "@/lib/types/supabase";

export const ORDER_STATUS_OPTIONS = Constants.public.Enums.order_status;
export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];
