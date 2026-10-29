import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AppLayout } from "../../../shared/components/AppLayout";
import type { CatalogProduct } from "../../products/api/catalogRepository";

export type PublicationStatus = "not-started" | "attempting" | "uncertain" | "rejected" | "published";
export type AdminWorkflow = {
    createdProduct: CatalogProduct | null;
    setCreatedProduct: Dispatch<SetStateAction<CatalogProduct | null>>;
    creationUncertain: boolean;
    setCreationUncertain: Dispatch<SetStateAction<boolean>>;
    publicationStatus: PublicationStatus;
    setPublicationStatus: Dispatch<SetStateAction<PublicationStatus>>;
    publishedProduct: CatalogProduct | null;
    setPublishedProduct: Dispatch<SetStateAction<CatalogProduct | null>>;
};

export function AdminLayout() {
    const [createdProduct, setCreatedProduct] = useState<CatalogProduct | null>(null);
    const [creationUncertain, setCreationUncertain] = useState(false);
    const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>("not-started");
    const [publishedProduct, setPublishedProduct] = useState<CatalogProduct | null>(null);
    const workflow = useMemo(() => ({
        createdProduct, setCreatedProduct, creationUncertain, setCreationUncertain,
        publicationStatus, setPublicationStatus, publishedProduct, setPublishedProduct,
    }), [createdProduct, creationUncertain, publicationStatus, publishedProduct]);

    return <AppLayout portal="admin" outletContext={workflow}/>;
}
