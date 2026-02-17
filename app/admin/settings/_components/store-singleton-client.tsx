"use client";
import { useState, useEffect } from 'react';
import { upsertStoreSingleton } from '../store-actions';
import type { Store } from '@/lib/services/storeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { StorageService } from '@/lib/services/storageService';
import Image from 'next/image';
import { useToast } from '@/components/ui/toast-provider';

interface Props { initial: Store | null }

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type HoursSlot = { open: string; close: string };
type OpeningHoursState = Record<DayKey, HoursSlot[]>;

const EMPTY_OPENING_HOURS: OpeningHoursState = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
};

function normalizeOpeningHours(raw: unknown): OpeningHoursState {
    const next: OpeningHoursState = { ...EMPTY_OPENING_HOURS };

    if (!raw || typeof raw !== 'object') return next;

    (Object.keys(next) as DayKey[]).forEach((day) => {
        const daySlots = (raw as Record<string, unknown>)[day];
        if (!Array.isArray(daySlots)) return;

        next[day] = daySlots
            .filter((slot) => slot && typeof slot === 'object')
            .map((slot) => {
                const record = slot as Record<string, unknown>;
                return {
                    open: typeof record.open === 'string' ? record.open : '',
                    close: typeof record.close === 'string' ? record.close : '',
                };
            });
    });

    return next;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export function StoreSingletonClient({ initial }: Props) {
    const toast = useToast();
    const [store, setStore] = useState<Store | null>(initial);
    // form fields (grouped)
    const [name, setName] = useState(store?.name || '');
    const [contactName, setContactName] = useState(store?.contact_name || '');
    const [contactEmail, setContactEmail] = useState(store?.contact_email || '');
    const [contactPhone, setContactPhone] = useState(store?.contact_phone || '');
    const [websiteUrl, setWebsiteUrl] = useState(store?.website_url || '');
    const [address, setAddress] = useState(store?.address || '');
    const [city, setCity] = useState(store?.city || '');
    const [state, setState] = useState(store?.state || '');
    const [postalCode, setPostalCode] = useState(store?.postal_code || '');
    const [country, setCountry] = useState(store?.country || '');
    const [latitude, setLatitude] = useState(store?.latitude != null ? String(store.latitude) : '');
    const [longitude, setLongitude] = useState(store?.longitude != null ? String(store.longitude) : '');
    const [logoLight, setLogoLight] = useState<string | null>(store?.logo_light_mode || null);
    const [logoDark, setLogoDark] = useState<string | null>(store?.logo_dark_mode || null);
    const [pickedLight, setPickedLight] = useState<File | null>(null);
    const [pickedDark, setPickedDark] = useState<File | null>(null);
    const [removeLight, setRemoveLight] = useState(false);
    const [removeDark, setRemoveDark] = useState(false);
    const [saving, setSaving] = useState(false);
    // Opening hours: structure { mon: [{ open: "09:00", close: "17:00" }], ... }
    const dayLabels: Record<DayKey, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    const [openingHours, setOpeningHours] = useState<OpeningHoursState>(() => normalizeOpeningHours(store?.opening_hours));
    const [hoursDirty, setHoursDirty] = useState(false);

    useEffect(() => {
        setStore(initial);
        setOpeningHours(normalizeOpeningHours(initial?.opening_hours));
    }, [initial]);

    function pick(kind: 'light' | 'dark') {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = () => { if (input.files && input.files[0]) { const f = input.files[0]; ensureImageUnder1MB(f).then(() => { if (kind === 'light') { setPickedLight(f); setRemoveLight(false); } else { setPickedDark(f); setRemoveDark(false); } }).catch(err => toast.push({ variant: 'error', title: 'Logo error', description: err?.message })); } };
        input.click();
    }

    async function save(section?: string) {
        setSaving(true);
        let finalLight = logoLight; let finalDark = logoDark; let deleteLight = false; let deleteDark = false;
        try {
            if (removeLight && logoLight) { finalLight = null; deleteLight = true; }
            if (removeDark && logoDark) { finalDark = null; deleteDark = true; }
            if (pickedLight) { const { publicUrl } = await StorageService.uploadEntityImage('products', pickedLight); if (logoLight && logoLight !== publicUrl) deleteLight = true; finalLight = publicUrl; }
            if (pickedDark) { const { publicUrl } = await StorageService.uploadEntityImage('products', pickedDark); if (logoDark && logoDark !== publicUrl) deleteDark = true; finalDark = publicUrl; }
            const payload = { name, is_active: store?.is_active ?? true, contact_name: contactName || null, contact_email: contactEmail || null, contact_phone: contactPhone || null, website_url: websiteUrl || null, address: address || null, city: city || null, state: state || null, postal_code: postalCode || null, country: country || null, latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null, logo_light_mode: finalLight, logo_dark_mode: finalDark, opening_hours: openingHours };
            const saved = await upsertStoreSingleton(payload);
            setStore(saved);
            setLogoLight(saved.logo_light_mode || null); setLogoDark(saved.logo_dark_mode || null);
            setPickedLight(null); setPickedDark(null);
            setHoursDirty(false);
            if (deleteLight && logoLight) { fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: logoLight }) }).catch(() => { }); }
            if (deleteDark && logoDark) { fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: logoDark }) }).catch(() => { }); }
            toast.push({ variant: 'success', title: `${section ? section + ': ' : ''}Store saved` });
        } catch (error: unknown) {
            toast.push({ variant: 'error', title: 'Save failed', description: getErrorMessage(error, 'Could not save store settings.') });
        } finally { setSaving(false); }
    }

    function LogoBlock({ kind }: { kind: 'light' | 'dark' }) {
        const current = kind === 'light' ? logoLight : logoDark;
        const picked = kind === 'light' ? pickedLight : pickedDark;
        const removed = kind === 'light' ? removeLight : removeDark;
        return <div className="space-y-1">
            <label className="text-xs">Logo ({kind === 'light' ? 'Light' : 'Dark'})</label>
            <div className="flex items-center gap-3">
                {!removed && (picked || current) ? <div className="relative w-16 h-16 rounded border overflow-hidden bg-muted"><Image src={(picked ? URL.createObjectURL(picked) : current)!} alt={kind + ' logo'} fill sizes="64px" className="object-contain" /></div> : <div className="w-16 h-16 rounded border flex items-center justify-center text-[10px] text-muted-foreground">{removed ? 'Removed' : 'None'}</div>}
                <Button type="button" size="sm" variant="secondary" onClick={() => pick(kind)} disabled={saving}><ImagePlus className="w-3 h-3 mr-1" />{picked ? 'Change' : current ? 'Replace' : 'Select'}</Button>
                {(current || picked) && !saving && <Button type="button" size="sm" variant="ghost" onClick={() => { if (kind === 'light') { if (pickedLight) setPickedLight(null); if (logoLight) setRemoveLight(true); } else { if (pickedDark) setPickedDark(null); if (logoDark) setRemoveDark(true); } }}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>}
            </div>
            {removed && <p className="text-[10px] text-amber-600">Will remove on save.</p>}
        </div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Store Settings</h2>
                <Button onClick={() => save()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save All</Button>
            </div>
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="flex flex-wrap gap-2 mb-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="location">Location</TabsTrigger>
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1"><label className="text-xs">Name</label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                        <div className="space-y-1"><label className="text-xs">Social Media</label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://" /></div>
                        <div className="space-y-1 md:col-span-2"><label className="text-xs">Address</label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Opening Hours</h4>
                            {hoursDirty && <span className="text-[10px] text-amber-600">Unsaved changes</span>}
                        </div>
                        <HoursEditor
                            openingHours={openingHours}
                            dayLabels={dayLabels}
                            onChange={(next) => setOpeningHours(next)}
                            markDirty={() => setHoursDirty(true)}
                        />
                    </div>
                    <Button onClick={() => save('General')} size="sm" disabled={saving}>{saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save General</Button>
                </TabsContent>
                <TabsContent value="contact" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1"><label className="text-xs">Contact Name</label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Contact Email</label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Contact Phone</label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></div>
                    </div>
                    <Button onClick={() => save('Contact')} size="sm" disabled={saving}>{saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save Contact</Button>
                </TabsContent>
                <TabsContent value="location" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1"><label className="text-xs">City</label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">State</label><Input value={state} onChange={e => setState(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Postal Code</label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Country</label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Latitude</label><Input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g. 37.7749" /></div>
                        <div className="space-y-1"><label className="text-xs">Longitude</label><Input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g. -122.4194" /></div>
                    </div>
                    <Button onClick={() => save('Location')} size="sm" disabled={saving}>{saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save Location</Button>
                </TabsContent>
                <TabsContent value="branding" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <LogoBlock kind='light' />
                        <LogoBlock kind='dark' />
                    </div>
                    <Button onClick={() => save('Branding')} size="sm" disabled={saving}>{saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save Branding</Button>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function isValidTime(val: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
}

// Hours editor component relies on outer state via props injection technique.
// Refactor: lift into separate file if it grows.
// We'll re-open the component file scope to access parent state by converting HoursEditor to closure inside main component, but since it's already defined below we pass props.

interface HoursEditorProps {
    openingHours: OpeningHoursState;
    dayLabels: Record<DayKey, string>;
    onChange: (next: OpeningHoursState) => void;
    markDirty: () => void;
}

function HoursEditor({ openingHours, dayLabels, onChange, markDirty }: HoursEditorProps) {
    const days = Object.keys(dayLabels) as DayKey[];

    function addSlot(day: DayKey) {
        const next = { ...openingHours, [day]: [...(openingHours[day] || []), { open: '09:00', close: '17:00' }] };
        onChange(next); markDirty();
    }
    function updateSlot(day: DayKey, idx: number, field: 'open' | 'close', value: string) {
        const list = [...(openingHours[day] || [])];
        const current = list[idx] || { open: '', close: '' };
        list[idx] = { open: current.open || '', close: current.close || '', [field]: value };
        const next = { ...openingHours, [day]: list };
        onChange(next); markDirty();
    }
    function removeSlot(day: DayKey, idx: number) {
        const list = [...(openingHours[day] || [])];
        list.splice(idx, 1);
        const next = { ...openingHours, [day]: list };
        onChange(next); markDirty();
    }
    function duplicateDay(day: DayKey) {
        // Duplicate Monday pattern to others, etc.
        const source = openingHours[day] || [];
        const next = { ...openingHours };
        days.forEach(d => { if (d !== day) next[d] = source.map(s => ({ ...s })); });
        onChange(next); markDirty();
    }

    return (
        <div className="space-y-6">
            <div className="text-xs text-muted-foreground">Define operating hours. 24h format HH:MM. Leave a day empty for closed.</div>
            <div className="space-y-4">
                {days.map(day => {
                    const rawSlots = openingHours[day];
                    const slots = Array.isArray(rawSlots) ? rawSlots : [];
                    return (
                        <div key={day} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{dayLabels[day as keyof typeof dayLabels]}</div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => addSlot(day)} className="text-xs px-2 py-1 rounded-md border">Add</button>
                                    <button type="button" onClick={() => duplicateDay(day)} className="text-xs px-2 py-1 rounded-md border">Copy to All</button>
                                </div>
                            </div>
                            {slots.length === 0 && <div className="text-[10px] text-muted-foreground">Closed</div>}
                            <div className="space-y-2">
                                {slots.map((slot, i) => {
                                    const openValue = typeof slot?.open === 'string' ? slot.open : '';
                                    const closeValue = typeof slot?.close === 'string' ? slot.close : '';
                                    const openInvalid = openValue && !isValidTime(openValue);
                                    const closeInvalid = closeValue && !isValidTime(closeValue);
                                    return (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <input value={openValue} onChange={e => updateSlot(day, i, 'open', e.target.value)} placeholder="09:00" className={`w-20 rounded border px-2 py-1 bg-background ${openInvalid ? 'border-red-500' : ''}`} />
                                            <span>-</span>
                                            <input value={closeValue} onChange={e => updateSlot(day, i, 'close', e.target.value)} placeholder="17:00" className={`w-20 rounded border px-2 py-1 bg-background ${closeInvalid ? 'border-red-500' : ''}`} />
                                            <button type="button" onClick={() => removeSlot(day, i)} className="ml-2 text-red-500 hover:underline">Remove</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
