import Handsontable from "handsontable";

const SYSTEM_CHANGE_SOURCES = new Set([
  "loadData",
  "auto",
  "saveAll",
  "recalc",
  "priority-auto",
  "progressive-reset",
]);

export const PROGRESSIVE_LOCKED_CELL_CLASS = "rm-progressive-locked-cell";

export const progressiveLockedCellStyles = `
  .handsontable td.${PROGRESSIVE_LOCKED_CELL_CLASS} {
    color: var(--ht-locked-text, #667085) !important;
    cursor: not-allowed;
    background:
      repeating-linear-gradient(
        -45deg,
        var(--ht-locked-stripe-a, rgba(148, 163, 184, 0.08)),
        var(--ht-locked-stripe-a, rgba(148, 163, 184, 0.08)) 6px,
        var(--ht-locked-stripe-b, rgba(148, 163, 184, 0.16)) 6px,
        var(--ht-locked-stripe-b, rgba(148, 163, 184, 0.16)) 12px
      ),
      linear-gradient(
        var(--ht-locked-bg, #f6f8fb),
        var(--ht-locked-bg, #f6f8fb)
      ) !important;
  }

  .handsontable td.${PROGRESSIVE_LOCKED_CELL_CLASS} .htAutocompleteArrow {
    opacity: 0.45;
  }

  .handsontable td .htAutocompleteArrow {
    cursor: pointer;
  }

  .handsontable td:not(.${PROGRESSIVE_LOCKED_CELL_CLASS}) {
    cursor: default;
  }
`;

export function isFilledCellValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function isCellChange(
  change: Handsontable.CellChange | null
): change is Handsontable.CellChange {
  return Array.isArray(change);
}

export function isSystemChangeSource(source?: Handsontable.ChangeSource) {
  return SYSTEM_CHANGE_SOURCES.has(String(source));
}

export function isProgressiveColumn(inputColumns: number[], col: number) {
  return inputColumns.includes(col);
}

export function isColumnUnlockedForRow(
  rowData: unknown[],
  inputColumns: number[],
  col: number
) {
  if (!isProgressiveColumn(inputColumns, col)) return true;
  if (col === inputColumns[0]) return true;

  for (const previousCol of inputColumns) {
    if (previousCol >= col) break;
    if (!isFilledCellValue(rowData[previousCol])) return false;
  }

  return true;
}

export function getFirstUnlockedEmptyColumn(rowData: unknown[], inputColumns: number[]) {
  return inputColumns.find(
    (col) =>
      isColumnUnlockedForRow(rowData, inputColumns, col) &&
      !isFilledCellValue(rowData[col])
  );
}

export function getSafeRowData(
  hot: Handsontable.Core | null | undefined,
  fallbackData: unknown[][],
  row: number
) {
  try {
    const sourceRow = hot?.getSourceDataAtRow(row);
    if (Array.isArray(sourceRow)) return sourceRow as unknown[];
  } catch {
    // Handsontable may ask for cell meta before its internal table is ready.
  }

  return (fallbackData[row] as unknown[] | undefined) ?? [];
}

export function handleProgressiveBeforeChange(
  hot: Handsontable.Core,
  changes: (Handsontable.CellChange | null)[] | null,
  inputColumns: number[],
  source?: Handsontable.ChangeSource
) {
  if (!changes || isSystemChangeSource(source)) return;

  const shadowRows = new Map<number, unknown[]>();

  const getShadowRow = (row: number) => {
    if (!shadowRows.has(row)) {
      shadowRows.set(row, [...(hot.getDataAtRow(row) as unknown[])]);
    }
    return shadowRows.get(row)!;
  };

  changes
    .filter(isCellChange)
    .sort((a, b) => {
      const rowDiff = Number(a[0]) - Number(b[0]);
      if (rowDiff !== 0) return rowDiff;
      return Number(a[1]) - Number(b[1]);
    })
    .forEach((change) => {
      const [row, col, , newValue] = change;
      if (typeof row !== "number" || typeof col !== "number") return;

      const shadowRow = getShadowRow(row);
      const isAllowed = isColumnUnlockedForRow(shadowRow, inputColumns, col);

      if (!isAllowed) {
        change[3] = hot.getDataAtCell(row, col);
        return;
      }

      shadowRow[col] = newValue;
    });
}

export function applyProgressiveCascade(
  hot: Handsontable.Core,
  changes: Handsontable.CellChange[],
  inputColumns: number[],
  resetColumnsByInput: Record<number, number[]>,
  source?: Handsontable.ChangeSource
) {
  if (!changes || isSystemChangeSource(source)) return;

  const changedRowsToFocus = new Set<number>();
  const changedColsByRow = new Map<number, Set<number>>();

  for (const change of changes) {
    if (!isCellChange(change)) continue;
    const [row, col] = change;
    if (typeof row !== "number" || typeof col !== "number") continue;
    const changedCols = changedColsByRow.get(row) ?? new Set<number>();
    changedCols.add(col);
    changedColsByRow.set(row, changedCols);
  }

  for (const change of changes) {
    if (!isCellChange(change)) continue;
    const [row, col, oldValue, newValue] = change;
    if (typeof row !== "number" || typeof col !== "number") continue;
    if (!isProgressiveColumn(inputColumns, col)) continue;
    if (oldValue === newValue) continue;

    const changedCols = changedColsByRow.get(row);
    for (const downstreamCol of resetColumnsByInput[col] ?? []) {
      if (changedCols?.has(downstreamCol)) continue;
      if (isFilledCellValue(hot.getDataAtCell(row, downstreamCol))) {
        hot.setDataAtCell(row, downstreamCol, "", "progressive-reset");
      }
    }

    if (isFilledCellValue(newValue)) {
      changedRowsToFocus.add(row);
    }
  }

  if (changes.length !== 1 || changedRowsToFocus.size === 0) return;

  window.setTimeout(() => {
    const targetRow = changedRowsToFocus.values().next().value;
    if (typeof targetRow !== "number") return;
    const rowData = hot.getDataAtRow(targetRow) as unknown[];
    const nextCol = getFirstUnlockedEmptyColumn(rowData, inputColumns);
    if (typeof nextCol === "number") {
      hot.selectCell(targetRow, nextCol);
      hot.render();
    }
  }, 0);
}

export function preventLockedCellMouseDown(
  event: MouseEvent,
  coords: { row: number; col: number },
  hot: Handsontable.Core | null | undefined,
  inputColumns: number[]
) {
  if (!hot || coords.row < 0 || coords.col < 0) return;

  const rowData = getSafeRowData(hot, [], coords.row);
  const isLocked =
    isProgressiveColumn(inputColumns, coords.col) &&
    !isColumnUnlockedForRow(rowData, inputColumns, coords.col);

  if (isLocked) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

export function openUnlockedDropdownOnMouseDown(
  event: MouseEvent,
  hot: Handsontable.Core | null | undefined,
  coords: { row: number; col: number },
  inputColumns: number[]
) {
  if (!hot || coords.row < 0 || coords.col < 0) return;

  const rowData = getSafeRowData(hot, [], coords.row);
  const isLocked =
    isProgressiveColumn(inputColumns, coords.col) &&
    !isColumnUnlockedForRow(rowData, inputColumns, coords.col);
  if (isLocked) return;

  const cellMeta = hot.getCellMeta(coords.row, coords.col);
  if (cellMeta.readOnly || !["dropdown", "autocomplete"].includes(String(cellMeta.type))) {
    return;
  }

  const target = event.target as HTMLElement | null;
  const clickedNativeArrow = Boolean(target?.closest(".htAutocompleteArrow"));
  const selected = hot.getSelectedLast();
  const isSameSelectedCell =
    selected?.[0] === coords.row &&
    selected?.[1] === coords.col &&
    selected?.[2] === coords.row &&
    selected?.[3] === coords.col;
  const cell = hot.getCell(coords.row, coords.col);
  const cellRect = cell?.getBoundingClientRect();
  const clickedSelectedCellArrowArea =
    isSameSelectedCell && cellRect ? event.clientX >= cellRect.right - 32 : false;

  if (!clickedNativeArrow && !clickedSelectedCellArrowArea) {
    if (isSameSelectedCell) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  window.setTimeout(() => {
    hot.selectCell(coords.row, coords.col);
    const editor = hot.getActiveEditor() as
      | { beginEditing?: () => void; open?: () => void }
      | undefined;
    editor?.beginEditing?.();
    editor?.open?.();
  }, 0);
}
