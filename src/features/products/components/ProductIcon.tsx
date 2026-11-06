type Props = { name: "search" | "filter" | "plus" | "upload" | "eye" | "pencil" | "image" };
export function ProductIcon({ name }: Props) {
    const paths = {
        image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
        search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
        filter: <path d="M4 4h16l-6 7v7l-4 2v-9L4 4Z" />,
        plus: <path d="M12 5v14M5 12h14" />,
        upload: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" /><path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" /></>,
        eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
        pencil: <><path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM14 5l5 5" /></>,
    };
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">{paths[name]}</svg>;
}
