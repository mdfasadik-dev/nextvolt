import { getStoreSingleton } from './store-actions';
import { StoreSingletonClient } from './_components/store-singleton-client';

export default async function SettingsPage() {
    const initial = await getStoreSingleton();
    return (
        <div className="space-y-6">
            <StoreSingletonClient initial={initial} />
        </div>
    );
}


