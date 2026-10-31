const sheets = new WeakMap<Document, CSSStyleSheet>()

const styles = `
  :host {
    aspect-ratio: var(--snow-width, 300) / var(--snow-height, 150);
    /* The canvas bitmap must not feed back into the host's layout size. */
    contain: size;
    contain-intrinsic-size: calc(var(--snow-width, 300) * 1px) calc(var(--snow-height, 150) * 1px);
    display: inline-block;
    position: relative;
    min-width: 0;
    min-height: 0;
  }
`

/** Adopt shared rules and return a setter for this element's shadow-scoped dimensions. */
export function adoptStyles(
  root: ShadowRoot,
): ((width: number, height: number) => void) | undefined {
  const document = root.ownerDocument
  const viewport = document.defaultView

  if (viewport === null) {
    return undefined
  }

  let sheet = sheets.get(document)

  if (sheet === undefined) {
    sheet = new viewport.CSSStyleSheet()
    sheet.replaceSync(styles)
    sheets.set(document, sheet)
  }

  const dimensions = new viewport.CSSStyleSheet()
  root.adoptedStyleSheets = [sheet, dimensions]

  return (width, height) => {
    dimensions.replaceSync(`:host { --snow-width: ${width}; --snow-height: ${height}; }`)
  }
}
