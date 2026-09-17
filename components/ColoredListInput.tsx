"use client";

import { useState } from "react";
import { itemColor, normalizeList, parseListItems } from "@/lib/list-items";

export default function ColoredListInput({
  name,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(normalizeList(defaultValue));
  const items = parseListItems(value);

  return (
    <div>
      <textarea
        name={name}
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => setValue(normalizeList(value))}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (!pasted) return;
          event.preventDefault();
          setValue(normalizeList([value, pasted].filter(Boolean).join("\n")));
        }}
        className="vault-input resize-none"
      />
      <p className="mt-1.5 text-[12px] text-gray-400">
        Paste bullets, commas, or separate lines. Items are formatted automatically.
      </p>
      {items.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2" aria-label={`${name} preview`}>
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 ${itemColor(index)}`}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}