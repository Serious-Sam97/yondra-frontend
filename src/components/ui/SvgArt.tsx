// Renders generated SVG markup from src/lib/boardArt.ts. That markup is built
// only from numbers and our own palette constants (never user input), so it is
// safe to inject.
export function SvgArt({
  svg,
  className,
  as: Tag = "span",
  ...rest
}: {
  svg: string;
  className?: string;
  as?: "span" | "div";
  style?: React.CSSProperties;
  role?: string;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
}) {
  const markup = { __html: svg };
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted generated SVG (see above)
    <Tag className={className} {...rest} dangerouslySetInnerHTML={markup} />
  );
}
