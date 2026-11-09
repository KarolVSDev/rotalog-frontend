type BrandLogoProps = {
    size?: "compact" | "large";
    className?: string;
};

export function BrandLogo({ size = "compact", className = "" }: BrandLogoProps) {
    const markHeight = size === "large" ? "h-11" : "h-9";
    const wordmarkHeight = size === "large" ? "h-6" : "h-5";

    return (
        <span role="img" aria-label="RotaLog" className={`inline-flex shrink-0 items-center gap-2 ${className}`}>
            <img
                src="/images/brand/rotalog-mark.png"
                alt=""
                aria-hidden="true"
                className={`${markHeight} w-auto object-contain`}
            />
            <img
                src="/images/brand/rotalog-wordmark.png"
                alt=""
                aria-hidden="true"
                className={`${wordmarkHeight} w-auto object-contain`}
            />
        </span>
    );
}
