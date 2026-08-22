import {
    AirVent,
    Antenna,
    Bath,
    BatteryCharging,
    BedDouble,
    Bell,
    Bike,
    Blend,
    Camera,
    Car,
    Cctv,
    CircleGauge,
    Coffee,
    CookingPot,
    Drill,
    Droplets,
    Dumbbell,
    Fan,
    Flame,
    Fuel,
    Gamepad2,
    Hammer,
    HardDrive,
    Headphones,
    Heater,
    Keyboard,
    Lamp,
    LampCeiling,
    LampDesk,
    Laptop,
    Lightbulb,
    Microwave,
    Monitor,
    Mouse,
    Music,
    Plug,
    PlugZap,
    Power,
    Printer,
    Projector,
    Radio,
    Refrigerator,
    Router,
    Sandwich,
    Satellite,
    Scissors,
    Server,
    Shirt,
    ShowerHead,
    Smartphone,
    Snowflake,
    Sofa,
    Speaker,
    Square,
    Sun,
    Tablet,
    Tv,
    Utensils,
    WashingMachine,
    Watch,
    Waves,
    Wind,
    Wrench,
    Zap,
    type LucideIcon,
} from "lucide-react";

export type LoadIconOption = {
    /** Stored in the DB (load_groups.icon / load_items.icon). */
    key: string;
    /** Human-friendly name shown and searched in the admin picker. */
    label: string;
    /** Extra search terms so "AC" finds the air conditioner icon. */
    keywords: string;
    group: "Lighting" | "Cooling & Heating" | "Kitchen" | "Electronics" | "Utility" | "General";
    Icon: LucideIcon;
};

/**
 * Curated icon catalog for the load calculator.
 *
 * Only these keys are offered in the admin picker and resolved on the public
 * site, which keeps the client bundle small — a namespace import of
 * lucide-react would pull in all 1500+ icons.
 *
 * Keys are stable: renaming one orphans existing rows, so add rather than edit.
 */
export const LOAD_ICON_OPTIONS: LoadIconOption[] = [
    // --- Lighting ---
    { key: "lightbulb", label: "Light Bulb", keywords: "led bulb lamp light", group: "Lighting", Icon: Lightbulb },
    { key: "lamp-ceiling", label: "Tubelight / Ceiling Light", keywords: "tube tubelight ceiling strip", group: "Lighting", Icon: LampCeiling },
    { key: "lamp-desk", label: "Table Lamp", keywords: "desk study reading lamp", group: "Lighting", Icon: LampDesk },
    { key: "lamp", label: "Floor Lamp", keywords: "stand floor lamp", group: "Lighting", Icon: Lamp },
    { key: "square", label: "Panel Light", keywords: "panel flat square light", group: "Lighting", Icon: Square },
    { key: "sun", label: "Outdoor / Flood Light", keywords: "sun flood outdoor garden", group: "Lighting", Icon: Sun },

    // --- Cooling & Heating ---
    { key: "fan", label: "Fan", keywords: "ceiling table pedestal exhaust fan", group: "Cooling & Heating", Icon: Fan },
    { key: "air-vent", label: "Air Conditioner", keywords: "ac split air conditioner cooling", group: "Cooling & Heating", Icon: AirVent },
    { key: "snowflake", label: "Freezer / Chiller", keywords: "freezer deep cold chiller", group: "Cooling & Heating", Icon: Snowflake },
    { key: "heater", label: "Room Heater", keywords: "heater warm radiator", group: "Cooling & Heating", Icon: Heater },
    { key: "shower-head", label: "Water Heater / Geyser", keywords: "geyser shower hot water", group: "Cooling & Heating", Icon: ShowerHead },
    { key: "wind", label: "Air Purifier / Blower", keywords: "purifier blower air wind", group: "Cooling & Heating", Icon: Wind },
    { key: "flame", label: "Induction / Burner", keywords: "induction burner stove flame heat", group: "Cooling & Heating", Icon: Flame },

    // --- Kitchen ---
    { key: "refrigerator", label: "Refrigerator", keywords: "fridge refrigerator cooler", group: "Kitchen", Icon: Refrigerator },
    { key: "microwave", label: "Microwave Oven", keywords: "microwave oven bake", group: "Kitchen", Icon: Microwave },
    { key: "cooking-pot", label: "Rice Cooker", keywords: "rice cooker pot curry", group: "Kitchen", Icon: CookingPot },
    { key: "coffee", label: "Kettle / Coffee Maker", keywords: "kettle coffee tea maker", group: "Kitchen", Icon: Coffee },
    { key: "blend", label: "Blender / Grinder", keywords: "blender mixer grinder juicer", group: "Kitchen", Icon: Blend },
    { key: "sandwich", label: "Toaster / Sandwich Maker", keywords: "toaster sandwich bread grill", group: "Kitchen", Icon: Sandwich },
    { key: "utensils", label: "Kitchen Appliance", keywords: "utensils kitchen cooking general", group: "Kitchen", Icon: Utensils },

    // --- Electronics ---
    { key: "tv", label: "Television", keywords: "tv led television screen", group: "Electronics", Icon: Tv },
    { key: "monitor", label: "Desktop Computer", keywords: "desktop pc computer monitor", group: "Electronics", Icon: Monitor },
    { key: "laptop", label: "Laptop", keywords: "laptop notebook computer", group: "Electronics", Icon: Laptop },
    { key: "tablet", label: "Tablet", keywords: "tablet ipad pad", group: "Electronics", Icon: Tablet },
    { key: "smartphone", label: "Mobile Charger", keywords: "mobile phone charger smartphone", group: "Electronics", Icon: Smartphone },
    { key: "router", label: "Wi-Fi Router", keywords: "router wifi modem internet", group: "Electronics", Icon: Router },
    { key: "printer", label: "Printer", keywords: "printer scanner copier", group: "Electronics", Icon: Printer },
    { key: "projector", label: "Projector", keywords: "projector beamer screen", group: "Electronics", Icon: Projector },
    { key: "speaker", label: "Speaker", keywords: "speaker sound audio", group: "Electronics", Icon: Speaker },
    { key: "music", label: "Sound System", keywords: "music sound stereo system", group: "Electronics", Icon: Music },
    { key: "radio", label: "Radio", keywords: "radio fm receiver", group: "Electronics", Icon: Radio },
    { key: "headphones", label: "Headphones", keywords: "headphone headset audio", group: "Electronics", Icon: Headphones },
    { key: "gamepad-2", label: "Gaming Console", keywords: "game gaming console playstation xbox", group: "Electronics", Icon: Gamepad2 },
    { key: "keyboard", label: "Keyboard", keywords: "keyboard typing input", group: "Electronics", Icon: Keyboard },
    { key: "mouse", label: "Mouse", keywords: "mouse pointer input", group: "Electronics", Icon: Mouse },
    { key: "watch", label: "Smart Watch", keywords: "watch smartwatch wearable", group: "Electronics", Icon: Watch },
    { key: "camera", label: "Camera", keywords: "camera photo dslr", group: "Electronics", Icon: Camera },
    { key: "cctv", label: "CCTV Camera", keywords: "cctv security surveillance camera", group: "Electronics", Icon: Cctv },
    { key: "antenna", label: "Antenna", keywords: "antenna signal aerial", group: "Electronics", Icon: Antenna },
    { key: "satellite", label: "Satellite Dish", keywords: "satellite dish tv receiver", group: "Electronics", Icon: Satellite },
    { key: "server", label: "Server", keywords: "server rack datacenter", group: "Electronics", Icon: Server },
    { key: "hard-drive", label: "Storage / NAS", keywords: "hard drive nas storage disk", group: "Electronics", Icon: HardDrive },

    // --- Utility ---
    { key: "washing-machine", label: "Washing Machine", keywords: "washing machine laundry washer", group: "Utility", Icon: WashingMachine },
    { key: "shirt", label: "Iron", keywords: "iron press clothes shirt", group: "Utility", Icon: Shirt },
    { key: "droplets", label: "Water Pump", keywords: "pump water motor submersible", group: "Utility", Icon: Droplets },
    { key: "waves", label: "Submersible Pump", keywords: "submersible deep well pump water", group: "Utility", Icon: Waves },
    { key: "bath", label: "Bathroom Appliance", keywords: "bath bathroom tub", group: "Utility", Icon: Bath },
    { key: "scissors", label: "Sewing Machine", keywords: "sewing machine tailor scissors", group: "Utility", Icon: Scissors },
    { key: "drill", label: "Drill Machine", keywords: "drill power tool", group: "Utility", Icon: Drill },
    { key: "hammer", label: "Workshop Tool", keywords: "hammer tool workshop", group: "Utility", Icon: Hammer },
    { key: "wrench", label: "Machinery", keywords: "wrench machine spanner repair", group: "Utility", Icon: Wrench },
    { key: "zap", label: "Welding Machine", keywords: "welding welder zap high load", group: "Utility", Icon: Zap },
    { key: "fuel", label: "Generator", keywords: "generator fuel genset", group: "Utility", Icon: Fuel },
    { key: "dumbbell", label: "Treadmill / Gym", keywords: "gym treadmill exercise dumbbell", group: "Utility", Icon: Dumbbell },
    { key: "car", label: "EV Charger", keywords: "car ev electric vehicle charger", group: "Utility", Icon: Car },
    { key: "bike", label: "E-Bike Charger", keywords: "bike scooter ev charger", group: "Utility", Icon: Bike },

    // --- General ---
    { key: "plug", label: "Extension Board", keywords: "plug socket extension board multiplug", group: "General", Icon: Plug },
    { key: "plug-zap", label: "Power Outlet", keywords: "outlet power socket plug", group: "General", Icon: PlugZap },
    { key: "power", label: "Generic Appliance", keywords: "power generic device appliance", group: "General", Icon: Power },
    { key: "battery-charging", label: "Battery / Charger", keywords: "battery charger ups backup", group: "General", Icon: BatteryCharging },
    { key: "circle-gauge", label: "Meter / Gauge", keywords: "meter gauge measure load", group: "General", Icon: CircleGauge },
    { key: "bell", label: "Doorbell", keywords: "bell doorbell ring alarm", group: "General", Icon: Bell },
    { key: "sofa", label: "Living Room", keywords: "sofa living room lounge", group: "General", Icon: Sofa },
    { key: "bed-double", label: "Bedroom", keywords: "bed bedroom sleep", group: "General", Icon: BedDouble },
];

/** Fast lookup by stored key. */
export const LOAD_ICON_MAP: Record<string, LucideIcon> = LOAD_ICON_OPTIONS.reduce(
    (map, option) => {
        map[option.key] = option.Icon;
        return map;
    },
    {} as Record<string, LucideIcon>,
);

export function getLoadIcon(key?: string | null): LucideIcon | null {
    if (!key) return null;
    return LOAD_ICON_MAP[key.trim().toLowerCase()] ?? null;
}

export function findLoadIconOption(key?: string | null): LoadIconOption | null {
    if (!key) return null;
    const normalized = key.trim().toLowerCase();
    return LOAD_ICON_OPTIONS.find(option => option.key === normalized) ?? null;
}
