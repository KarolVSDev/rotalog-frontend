// catalog/image_schemas.py: ProductImageResponse. Content requires bearer authentication.
export type CanonicalProductImage = {
    id: string; file_id: string; position: number; is_primary: boolean; alt_text: string;
    mime_type: string; size_bytes: number; sha256: string; width: number; height: number;
    content_url: string; requires_authentication: true;
};
