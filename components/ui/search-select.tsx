"use client"

import { useMemo, useState } from "react"
import {
  Box,
  Combobox,
  createListCollection,
  Portal,
  Spinner,
} from "@chakra-ui/react"
import { LuCheck, LuChevronDown, LuX } from "react-icons/lu"

export interface SearchSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SearchSelectProps
  extends Omit<
    Combobox.RootProps,
    "collection" | "value" | "defaultValue" | "onValueChange" | "onChange" | "children" | "multiple"
  > {
  value: string
  onChange: (value: string) => void
  options: SearchSelectOption[]
  placeholder?: string
  /** Text shown in the list when the search matches nothing. */
  emptyText?: string
  /** Shows a spinner instead of the chevron and "loadingText" instead of the empty text. */
  loading?: boolean
  loadingText?: string
  /** Shows an × button that resets the value to "". */
  clearable?: boolean
  fontSize?: string
  height?: string
  /** Accessible name for the combobox input, announced by screen readers. */
  ariaLabel?: string
  /** Red border, for a failed validation. */
  invalid?: boolean
}

// zag-js drops falsy item values, so an option whose value is "" (e.g.
// "Semua Produk") is swapped for a sentinel on the way in and out.
const EMPTY = "__search_select_empty__"
const toItemValue = (v: string) => (v === "" ? EMPTY : v)
const fromItemValue = (v: string | undefined) => (!v || v === EMPTY ? "" : v)

// Case- and accent-insensitive "contains". A plain module function (rather than
// Chakra's useFilter) keeps the memoized collection below from rebuilding on every render.
const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("id-ID")
const contains = (text: string, query: string) => normalize(text).includes(normalize(query))

// Rendering thousands of options (e.g. every village in a large district) makes the
// popup sluggish. Only the first MAX_VISIBLE matches are rendered; typing narrows them.
const MAX_VISIBLE = 200

/**
 * Agentra-styled dropdown that can be searched by typing. Drop-in replacement
 * for `NativeSelect` — takes a plain `value` / `onChange(value)` pair.
 *
 * The text shown in the input is always derived from `value` + `options`, and
 * the typed query only filters the list. That keeps the label correct when the
 * options load after the value is set and when the list is filtered.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Pilih...",
  emptyText = "Tidak ada hasil",
  loading = false,
  loadingText = "Memuat...",
  clearable = false,
  fontSize = "13px",
  height = "40px",
  disabled,
  positioning,
  ariaLabel,
  invalid = false,
  ...rootProps
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  // null = the user is not searching; the input shows the selected label.
  const [query, setQuery] = useState<string | null>(null)

  const selected = options.find((o) => o.value === value)
  const searching = query !== null && query !== ""

  const { collection, truncated } = useMemo(() => {
    const matches = searching ? options.filter((o) => contains(o.label, query)) : options
    let visible = matches.slice(0, MAX_VISIBLE)
    // Keep the selected option renderable even when it falls past the cap.
    if (selected && !visible.some((o) => o.value === selected.value) && matches.includes(selected)) {
      visible = [...visible, selected]
    }
    return {
      truncated: matches.length > visible.length,
      collection: createListCollection({
        items: visible.map((o) => ({ ...o, value: toItemValue(o.value) })),
        itemToString: (o) => o.label,
        itemToValue: (o) => o.value,
        isItemDisabled: (o) => Boolean(o.disabled),
      }),
    }
  }, [options, searching, query, selected])

  // While the list is open and untouched, show the current label as a hint so
  // typing starts from an empty field instead of appending to the label.
  const showLabelAsHint = open && query === null && !!selected
  const inputValue = query ?? (showLabelAsHint ? "" : selected?.label ?? "")

  return (
    <Combobox.Root
      collection={collection}
      value={selected ? [toItemValue(value)] : []}
      onValueChange={({ value: next }) => onChange(fromItemValue(next[0]))}
      inputValue={inputValue}
      onInputValueChange={({ inputValue: next, reason }) => {
        if (reason === "input-change") setQuery(next)
      }}
      open={open}
      onOpenChange={({ open: next }) => {
        setOpen(next)
        // Typing into a closed field fires this with open=true *after* the
        // query was set, so only reset when closing.
        if (!next) setQuery(null)
      }}
      openOnClick
      // Don't keep every option (e.g. thousands of villages) mounted while closed.
      lazyMount
      unmountOnExit
      disabled={disabled}
      invalid={invalid}
      positioning={{ placement: "bottom-start", sameWidth: true, gutter: 4, ...positioning }}
      {...rootProps}
    >
      <Combobox.Control
        bg="white"
        border="1px solid"
        borderColor={invalid ? "#DC2626" : "#E2E8F0"}
        borderRadius="8px"
        h={height}
        transition="border-color 0.15s, box-shadow 0.15s"
        _hover={{ borderColor: "#CBD5E1" }}
        _focusWithin={{ borderColor: "#3B82F6", boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" }}
        _disabled={{ bg: "#F8FAFC", cursor: "not-allowed", opacity: 0.7 }}
      >
        <Combobox.Input
          autoComplete="off"
          aria-label={ariaLabel}
          // Tabbing into a filled field then typing should replace the label, not append to it.
          onFocus={(e) => e.currentTarget.select()}
          placeholder={showLabelAsHint ? selected?.label : placeholder}
          fontSize={fontSize}
          color="#1C2833"
          h="100%"
          px="12px"
          border="none"
          outline="none"
          bg="transparent"
          _focus={{ outline: "none", boxShadow: "none" }}
          _placeholder={{ color: showLabelAsHint ? "#1C2833" : "#94A3B8" }}
        />
        <Combobox.IndicatorGroup pe="8px" gap="2px">
          {clearable && value !== "" && !disabled && (
            <Combobox.ClearTrigger
              color="#64748B"
              _hover={{ color: "#DC2626" }}
              aria-label="Hapus pilihan"
            >
              <LuX size={14} />
            </Combobox.ClearTrigger>
          )}
          <Combobox.Trigger color="#64748B" aria-label="Buka daftar">
            {loading ? (
              <Spinner size="xs" color="#64748B" />
            ) : (
              <LuChevronDown
                size={16}
                style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : undefined }}
              />
            )}
          </Combobox.Trigger>
        </Combobox.IndicatorGroup>
      </Combobox.Control>

      <Portal>
        <Combobox.Positioner>
          <Combobox.Content
            bg="white"
            border="1px solid"
            borderColor="#E2E8F0"
            borderRadius="10px"
            shadow="lg"
            p="4px"
            maxH="240px"
            overflowY="auto"
            // Above the app's dialogs, which sit at 1500 (backdrop) / 1501 (positioner).
            zIndex={1600}
          >
            {collection.items.map((item) => (
              <Combobox.Item
                key={item.value}
                item={item}
                px="10px"
                py="8px"
                borderRadius="6px"
                cursor="pointer"
                fontSize={fontSize}
                color="#1C2833"
                gap="8px"
                _highlighted={{ bg: "#EFF6FF" }}
                _selected={{ color: "#1A3557", fontWeight: "semibold" }}
                _disabled={{ opacity: 0.45, cursor: "not-allowed" }}
              >
                <Combobox.ItemText flex="1" truncate>
                  {item.label}
                </Combobox.ItemText>
                <Combobox.ItemIndicator color="#1D4ED8">
                  <LuCheck size={14} />
                </Combobox.ItemIndicator>
              </Combobox.Item>
            ))}
            {truncated && (
              <Box px="12px" py="8px" fontSize="14px" color="#64748B">
                Ketik untuk mempersempit pilihan…
              </Box>
            )}
            {collection.items.length === 0 && (
              <Combobox.Empty px="12px" py="10px" fontSize={fontSize} color="#64748B">
                {loading ? loadingText : emptyText}
              </Combobox.Empty>
            )}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}
