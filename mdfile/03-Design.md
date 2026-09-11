# Fairway CRM — Product & Visual Design

## 1. Design Direction
Premium industrial + modern SaaS + professional enterprise.

The interface must feel operational rather than decorative.

## 2. Design Rules
- Clean hierarchy
- High information density without clutter
- Consistent spacing and typography
- Predictable navigation
- Minimal animation
- No fake AI visuals
- No mock KPI values
- No arbitrary gradients
- No inconsistent icon styles

## 3. Design System
### Typography
Use one primary UI font family across the product, with a small, defined type scale for page title, section title, body, label and table text.

### Icons
Lucide icons only unless a domain-specific icon is genuinely required.

### Colors
Use a small semantic palette:
- primary / brand
- neutral
- success
- warning
- danger
- info
- priority / hot lead

The same semantic color must mean the same thing everywhere.

### Components
- Button
- Input
- Textarea
- Select / Combobox
- Date picker
- Dialog
- Drawer
- Tabs
- Badge
- Tooltip
- Dropdown
- Data table
- Pagination
- Filter bar
- Search
- Empty state
- Error state
- Skeletons
- Page loader
- Confirm dialog
- File uploader

## 4. Layout
Desktop-first enterprise layout with responsive support:
- permission-driven sidebar
- top bar with global search/user actions
- page header with title/actions
- content area
- bottom-right toast area

## 5. Data Tables
Tables must support appropriate combinations of search, filters, column visibility, sorting, pagination, row actions and bulk actions.

## 6. Dashboard
The CRM dashboard should answer: what needs attention, what is active, what is overdue, what is moving in the pipeline and what was won/lost.

## 7. Detail Pages
Company detail is the core 360-degree page. It should connect company header, contacts, facilities, pipeline status, activities, tasks, notes, follow-ups, documents, proposals and map context.

## 8. Loading / Empty / Error
Every async view has separate states:
- loading/skeleton
- empty
- error/retry
- permission denied

Never show fake data while loading.

## 9. Toasts
Use Sonner or equivalent. Position: bottom-right. Use for short-lived confirmations/errors. Important blocking events use dialogs or page-level states instead.

## 10. Responsive
All primary pages must remain usable on smaller screens. Tables may become horizontally scrollable or switch to compact row views where appropriate.
