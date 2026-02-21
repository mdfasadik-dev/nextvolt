import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { ProfileManager } from "@/components/public/profile-manager";

export const metadata: Metadata = buildPageMetadata({
    title: "My Profile",
    description: "Manage your checkout profile with mobile number verification.",
    pathname: "/profile",
    noIndex: true,
});

export default function ProfilePage() {
    return (
        <div className="w-full max-w-4xl px-4 py-12">
            <ProfileManager />
        </div>
    );
}
