"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ImagePlus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ensureImageUnder1MB } from '@/lib/utils/imageValidation';
import { StorageService } from '@/lib/services/storageService';
import type { Store } from '@/lib/services/storeService';
import { useToast } from '@/components/ui/toast-provider';

interface Props {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    editing: Store | null;
    onCreate: (p: any) => Promise<void>;
    onUpdate: (id: string, p: any) => Promise<void>;
    isPending: boolean;
}

export function StoreFormDialog({ open, onOpenChange, editing, onCreate, onUpdate, isPending }: Props) {
    const toast = useToast();
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [latitude, setLatitude] = useState<string>('');
    const [longitude, setLongitude] = useState<string>('');
    const [logoLight, setLogoLight] = useState<string | null>(null);
    const [logoDark, setLogoDark] = useState<string | null>(null);
    const [pickedLight, setPickedLight] = useState<File | null>(null);
    const [pickedDark, setPickedDark] = useState<File | null>(null);
    const [remRemoveLight, setRemRemoveLight] = useState(false);
    const [remRemoveDark, setRemRemoveDark] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (editing) {
            setName(editing.name);
            setIsActive(editing.is_active);
            setContactName(editing.contact_name || '');
            setContactEmail(editing.contact_email || '');
            setContactPhone(editing.contact_phone || '');
            setWebsiteUrl(editing.website_url || '');
            setAddress(editing.address || '');
            setCity(editing.city || '');
            setState(editing.state || '');
            setPostalCode(editing.postal_code || '');
            setCountry(editing.country || '');
            setLatitude(editing.latitude != null ? String(editing.latitude) : '');
            setLongitude(editing.longitude != null ? String(editing.longitude) : '');
            setLogoLight(editing.logo_light_mode || null);
            setLogoDark(editing.logo_dark_mode || null);
            setPickedLight(null); setPickedDark(null); setRemRemoveLight(false); setRemRemoveDark(false);
        } else {
            setName(''); setIsActive(true); setContactName(''); setContactEmail(''); setContactPhone(''); setWebsiteUrl(''); setAddress(''); setCity(''); setState(''); setPostalCode(''); setCountry(''); setLatitude(''); setLongitude(''); setLogoLight(null); setLogoDark(null); setPickedLight(null); setPickedDark(null); setRemRemoveLight(false); setRemRemoveDark(false);
        }
    }, [editing]);

    function pickFile(kind: 'light' | 'dark') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                ensureImageUnder1MB(file).then(() => {
                    if (kind === 'light') { setPickedLight(file); setRemRemoveLight(false); }
                    else { setPickedDark(file); setRemRemoveDark(false); }
                }).catch(err => toast.push({ variant: 'error', title: 'Logo error', description: err?.message }));
            }
        };
        input.click();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        let finalLight = logoLight; let finalDark = logoDark; let deleteLight = false; let deleteDark = false;
        try {
            if (remRemoveLight && logoLight) { finalLight = null; deleteLight = true; }
            if (remRemoveDark && logoDark) { finalDark = null; deleteDark = true; }
            if (pickedLight) { setUploading(true); const { publicUrl } = await StorageService.uploadEntityImage('products', pickedLight); if (logoLight && logoLight !== publicUrl) deleteLight = true; finalLight = publicUrl; }
            if (pickedDark) { setUploading(true); const { publicUrl } = await StorageService.uploadEntityImage('products', pickedDark); if (logoDark && logoDark !== publicUrl) deleteDark = true; finalDark = publicUrl; }
        } finally { setUploading(false); }
        const payload = {
            name,
            is_active: isActive,
            contact_name: contactName || null,
            contact_email: contactEmail || null,
            contact_phone: contactPhone || null,
            website_url: websiteUrl || null,
            address: address || null,
            city: city || null,
            state: state || null,
            postal_code: postalCode || null,
            country: country || null,
            latitude: latitude ? Number(latitude) : null,
            longitude: longitude ? Number(longitude) : null,
            logo_light_mode: finalLight,
            logo_dark_mode: finalDark,
        };
        try {
            if (editing) { await onUpdate(editing.id, payload); }
            else { await onCreate(payload); }
            if (deleteLight && logoLight) { fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: logoLight }) }).catch(() => { }); }
            if (deleteDark && logoDark) { fetch('/api/uploads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: logoDark }) }).catch(() => { }); }
            onOpenChange(false);
        } catch (err: any) {
            toast.push({ variant: 'error', title: 'Save failed', description: err?.message });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{editing ? 'Edit Store' : 'New Store'}</DialogTitle>
                    <button onClick={() => onOpenChange(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
                </DialogHeader>
                <div className="py-4">
                    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2" id="store-form">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-xs">Name</label>
                            <Input value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                            <Checkbox id="is_active_s" checked={isActive} onCheckedChange={v => setIsActive(!!v)} />
                            <label htmlFor="is_active_s" className="text-xs">Active</label>
                        </div>
                        <div className="space-y-1"><label className="text-xs">Contact Name</label><Input value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Contact Email</label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Contact Phone</label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Facebook URL </label><Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://" /></div>
                        <div className="space-y-1 md:col-span-2"><label className="text-xs">Address</label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">City</label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">State</label><Input value={state} onChange={e => setState(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Postal Code</label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Country</label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
                        <div className="space-y-1"><label className="text-xs">Latitude</label><Input value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="e.g. 37.7749" /></div>
                        <div className="space-y-1"><label className="text-xs">Longitude</label><Input value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="e.g. -122.4194" /></div>
                        {/* Logos */}
                        <div className="space-y-1"><label className="text-xs">Logo (Light)</label><div className="flex items-center gap-3">{!remRemoveLight && (pickedLight || logoLight) ? (<div className="relative w-16 h-16 border rounded bg-muted overflow-hidden"><Image src={(pickedLight ? URL.createObjectURL(pickedLight) : logoLight)!} alt="logo light" fill sizes="64px" className="object-contain" /></div>) : (<div className="w-16 h-16 border rounded flex items-center justify-center text-[10px] text-muted-foreground">{remRemoveLight ? 'Removed' : 'None'}</div>)}<Button type="button" size="sm" variant="secondary" onClick={() => pickFile('light')} disabled={uploading}><ImagePlus className="w-3 h-3 mr-1" />{pickedLight ? 'Change' : (logoLight ? 'Replace' : 'Select')}</Button>{(logoLight || pickedLight) && !uploading && <Button type="button" size="sm" variant="ghost" onClick={() => { if (pickedLight) setPickedLight(null); if (logoLight) setRemRemoveLight(true); }}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>}</div>{remRemoveLight && <p className="text-[10px] text-amber-600">Will remove on save.</p>}</div>
                        <div className="space-y-1"><label className="text-xs">Logo (Dark)</label><div className="flex items-center gap-3">{!remRemoveDark && (pickedDark || logoDark) ? (<div className="relative w-16 h-16 border rounded bg-muted overflow-hidden"><Image src={(pickedDark ? URL.createObjectURL(pickedDark) : logoDark)!} alt="logo dark" fill sizes="64px" className="object-contain" /></div>) : (<div className="w-16 h-16 border rounded flex items-center justify-center text-[10px] text-muted-foreground">{remRemoveDark ? 'Removed' : 'None'}</div>)}<Button type="button" size="sm" variant="secondary" onClick={() => pickFile('dark')} disabled={uploading}><ImagePlus className="w-3 h-3 mr-1" />{pickedDark ? 'Change' : (logoDark ? 'Replace' : 'Select')}</Button>{(logoDark || pickedDark) && !uploading && <Button type="button" size="sm" variant="ghost" onClick={() => { if (pickedDark) setPickedDark(null); if (logoDark) setRemRemoveDark(true); }}><Trash2 className="w-3 h-3 mr-1" />Remove</Button>}</div>{remRemoveDark && <p className="text-[10px] text-amber-600">Will remove on save.</p>}</div>
                    </form>
                </div>
                <DialogFooter>
                    <button onClick={() => onOpenChange(false)} className="text-xs rounded-md border px-3 py-1">Cancel</button>
                    <Button form="store-form" type="submit" disabled={isPending || uploading} className="text-xs">{(isPending || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editing ? ((isPending || uploading) ? 'Updating' : 'Update') : ((isPending || uploading) ? 'Creating' : 'Create')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
