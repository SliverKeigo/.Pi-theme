import { type ExtensionAPI, type Theme } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";

// Pi currently has no public table renderer hook. Keep its layout algorithm,
// and decorate the resulting lines. Restore the method when this runtime ends.
type TableRenderer = (...args: unknown[]) => string[];
type TablePrototype = { renderTable: TableRenderer };
const tablePrototype = Markdown.prototype as unknown as TablePrototype;

export function colorTable(lines: string[], theme: Theme): string[] {
  let inHeader = false;
  return lines.map((line) => {
    if (line.startsWith("┌")) inHeader = true;
    if (line.startsWith("├") || line.startsWith("└")) inHeader = false;
    const colored = line.replace(/[┌┬┐├┼┤└┴┘─│]/g, (char) => theme.fg("accent", char));
    return inHeader && line.startsWith("│")
      ? theme.bg("customMessageBg", colored)
      : colored;
  });
}

export default function (pi: ExtensionAPI) {
  let original: TableRenderer | undefined;
  let decorated: TableRenderer | undefined;

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    original = tablePrototype.renderTable;
    decorated = function (this: unknown, ...args: unknown[]): string[] {
      const lines = original!.apply(this, args);
      return ctx.ui.theme.name === "sapphire-ember" ? colorTable(lines, ctx.ui.theme) : lines;
    };
    tablePrototype.renderTable = decorated;
  });

  pi.on("session_shutdown", (_event, ctx) => {
    if (decorated && tablePrototype.renderTable === decorated && original) {
      tablePrototype.renderTable = original;
    }
  });
}
