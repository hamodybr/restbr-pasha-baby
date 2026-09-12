# Live invoice editor trial

This trial changes the order print button into a live invoice editor before printing.

- Settings are temporary for the current invoice until **Save as default** is pressed.
- **Fit in one page** is enabled by default.
- **Auto-fit A4** reduces spacing and type slightly for long invoices.
- **Direct print** rasterizes the current invoice to an image first, preserving the uploaded Arabic font, then opens the system print dialog.
- **Open PDF** remains available as a secondary action.
- Saving defaults updates only `restaurant_settings.ui_design_settings.invoice`; it does not change order data, prices, products, or Supabase schema.
