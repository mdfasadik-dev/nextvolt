export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-4 text-primary text-lg font-medium">Loading...</span>
        </div>
    );
}
