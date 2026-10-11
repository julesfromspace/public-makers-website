# Figma Design Project

- **Figma file:** <https://www.figma.com/design/u0RNcCApVmgzwf2YBPTInV/Public-Makers%E2%80%94website--production-?node-id=0-1&t=RzTb5K1wz6YS9W9i-1>

## Rules
1. Every visual value must bind to a Style or Variable. Never hardcode colors, font sizes, or spacing.
2. Always search connected libraries before building any component from scratch.
3. Never start designing before the Design Brief is confirmed.


## Grid & spacing implementation

Padding values on Figma components represent grid alignment only.
In code, always implement using Tailwind's grid utilities:

- `container mx-auto` for centering
- `grid grid-cols-4/8/12` for the column structure
- `col-start-*` and `col-span-*` for placement
- `gap-*` for gutters from the Layout variable collection

Never translate Figma padding values directly to Tailwind `p-*` or 
`px-*` utilities unless it's intentional inset padding within a 
self-contained UI component (e.g. button padding, card padding).

#### Breakpoints
| Prefix | Min-width | Notes |
|---|---|---|
| *(none)* | < 481px | |
| `sm` | 481px | |
| `md` | 750px | grid tier + layout breakpoint |
| `lg` | 941px | |
| `xl` | 1281px | |

#### Grid tiers
| Prefix | Columns | Gutter | Margin |
|---|---|---|---|
| *(none)* `xs` | 4 | 8px | 16px |
| `sm` | 4 | 8px | 40px |
| `md` | 8 | 8px | 40px |
| `lg` | 8 | 8px | 40px |
| `xl` | 12 | 8px | 40px |

`xl` grid is capped at `max-w-[1440px] mx-auto`.

`md` (750px) is both a grid tier (4→8 columns) and a layout breakpoint.

