(() => {
  if (window.PashaInvoicePdf) return;

  const PT_TO_MM = 25.4 / 72;
  const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();

  function create(options) {
    const {
      jsPDF,
      cfg,
      order,
      items,
      notes,
      fee,
      fontBase64,
      logoDataUrl,
      when,
      itemOptionText,
      englishDigits,
    } = options;

    if (typeof jsPDF !== 'function') throw new Error('محرك PDF غير متوفر.');
    if (!fontBase64) throw new Error('بيانات الخط المخصص غير متوفرة.');

    const format = ['a4', 'a5', 'letter'].includes(String(cfg.page_size || '').toLowerCase())
      ? String(cfg.page_size).toLowerCase()
      : 'a4';
    const orientation = cfg.page_orientation === 'landscape' ? 'landscape' : 'portrait';
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      // Keep the complete uploaded font. Some Arabic TTF/OTF files lose glyphs
      // when jsPDF tries to subset them, even though the font itself is valid.
      putOnlyUsedFonts: false,
      compress: true,
    });

    doc.addFileToVFS('PashaInvoiceCustom.ttf', fontBase64);
    doc.addFont('PashaInvoiceCustom.ttf', 'PashaInvoiceCustom', 'normal');
    doc.setProperties({
      title: `Pasha Baby - ${clean(order.order_number)}`,
      subject: 'فاتورة طلب',
      author: 'Pasha Baby',
      creator: 'Pasha Baby Invoice PDF',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = Math.max(2, number(cfg.page_margin_mm, 6));
    const frameX = margin;
    const frameY = margin;
    const frameW = pageWidth - (margin * 2);
    const frameH = pageHeight - (margin * 2);
    const padding = Math.max(3, number(cfg.outer_padding_mm, 8));
    const contentLeft = frameX + padding;
    const contentRight = frameX + frameW - padding;
    const contentWidth = contentRight - contentLeft;
    const bottomLimit = frameY + frameH - padding;
    const lineHeight = sizePt => Math.max(1.08, number(cfg.line_height, 1.25)) * sizePt * PT_TO_MM;
    let y = frameY + padding;

    const setCustomFont = sizePt => {
      doc.setFont('PashaInvoiceCustom', 'normal');
      doc.setFontSize(Math.max(5, number(sizePt, 10)));
      doc.setTextColor(0, 0, 0);
    };
    const setLatinFont = (sizePt, style = 'bold') => {
      doc.setFont('times', style);
      doc.setFontSize(Math.max(5, number(sizePt, 10)));
      doc.setTextColor(0, 0, 0);
    };
    const rtl = (text, x, baseline, align = 'right') => {
      doc.text(englishDigits(clean(text)), x, baseline, { align });
    };
    const ltr = (text, x, baseline, align = 'left') => {
      doc.text(englishDigits(clean(text)), x, baseline, { align });
    };
    const drawAmount = (value, x, baseline, sizePt) => {
      const digits = Number(value || 0).toLocaleString('en-US');
      setLatinFont(sizePt, 'bold');
      ltr(digits, x, baseline);
      const digitsWidth = doc.getTextWidth(digits);
      setCustomFont(sizePt);
      doc.text('د.ع', x + digitsWidth + 1.2, baseline, { align:'left' });
      return digitsWidth + 1.2 + doc.getTextWidth('د.ع');
    };

    const drawFrame = () => {
      const widthMm = Math.max(0.2, number(cfg.frame_width_pt, 3) * PT_TO_MM);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(widthMm);
      doc.roundedRect(frameX, frameY, frameW, frameH, number(cfg.frame_radius_mm, 4), number(cfg.frame_radius_mm, 4));
      const inset = Math.max(1.1, widthMm * 1.65);
      doc.setLineWidth(Math.max(0.18, widthMm * 0.42));
      doc.roundedRect(frameX + inset, frameY + inset, frameW - (inset * 2), frameH - (inset * 2), Math.max(0, number(cfg.frame_radius_mm, 4) - inset), Math.max(0, number(cfg.frame_radius_mm, 4) - inset));
    };

    const drawContinuationHeader = () => {
      setCustomFont(number(cfg.meta_size_pt, 8));
      rtl('تفاصيل الطلب — تابع', contentRight, frameY + padding + lineHeight(number(cfg.meta_size_pt, 8)));
      ltr(order.order_number, contentLeft, frameY + padding + lineHeight(number(cfg.meta_size_pt, 8)));
      y = frameY + padding + lineHeight(number(cfg.meta_size_pt, 8)) + 3;
      doc.setLineWidth(0.25);
      doc.line(contentLeft, y, contentRight, y);
      y += 3;
    };

    const addPage = () => {
      doc.addPage(format, orientation);
      drawFrame();
      drawContinuationHeader();
    };

    const ensureSpace = required => {
      if (y + required <= bottomLimit) return;
      addPage();
    };

    drawFrame();

    if (cfg.show_logo) {
      const logoSize = Math.max(12, number(cfg.logo_size_mm, 27));
      const logoX = (pageWidth - logoSize) / 2;
      if (cfg.logo_mode === 'image' && logoDataUrl) {
        try {
          doc.addImage(logoDataUrl, undefined, logoX, y, logoSize, logoSize, undefined, 'FAST');
        } catch (_) {
          doc.setLineWidth(0.7);
          doc.circle(pageWidth / 2, y + (logoSize / 2), logoSize / 2);
          setLatinFont(Math.max(7, logoSize * 0.33));
          ltr('PASHA BABY', pageWidth / 2, y + (logoSize * 0.48), 'center');
          setLatinFont(Math.max(9, logoSize * 0.46));
          ltr('PB', pageWidth / 2, y + (logoSize * 0.72), 'center');
        }
      } else {
        doc.setLineWidth(Math.max(0.45, number(cfg.frame_width_pt, 3) * PT_TO_MM * 0.7));
        doc.circle(pageWidth / 2, y + (logoSize / 2), logoSize / 2);
        doc.setLineWidth(0.25);
        doc.circle(pageWidth / 2, y + (logoSize / 2), (logoSize / 2) - 1.2);
        setLatinFont(Math.max(7, logoSize * 0.31));
        ltr('PASHA BABY', pageWidth / 2, y + (logoSize * 0.47), 'center');
        setLatinFont(Math.max(9, logoSize * 0.46));
        ltr('PB', pageWidth / 2, y + (logoSize * 0.73), 'center');
      }
      y += logoSize + 1.5;
    }

    if (cfg.show_brand_title) {
      setLatinFont(number(cfg.title_size_pt, 25));
      ltr(cfg.brand_title || 'PASHA BABY', pageWidth / 2, y + lineHeight(number(cfg.title_size_pt, 25)) * 0.78, 'center');
      y += lineHeight(number(cfg.title_size_pt, 25));
    }
    if (cfg.show_brand_subtitle) {
      setLatinFont(number(cfg.subtitle_size_pt, 8));
      ltr(cfg.brand_subtitle || 'PREMIUM BABY BOUTIQUE', pageWidth / 2, y + lineHeight(number(cfg.subtitle_size_pt, 8)) * 0.78, 'center');
      y += lineHeight(number(cfg.subtitle_size_pt, 8));
    }

    y += Math.max(0.8, number(cfg.header_spacing_mm, 2.5));
    doc.setLineWidth(0.28);
    doc.line(contentLeft, y, (pageWidth / 2) - 4, y);
    doc.line((pageWidth / 2) + 4, y, contentRight, y);
    doc.rect((pageWidth / 2) - 1.1, y - 1.1, 2.2, 2.2, 'S');
    y += 4;

    if (cfg.show_order_number || cfg.show_date_time) {
      const metaSize = number(cfg.meta_size_pt, 8);
      setCustomFont(metaSize);
      const baseline = y + lineHeight(metaSize) * 0.78;
      if (cfg.show_date_time) rtl(when(order.created_at), contentRight, baseline);
      if (cfg.show_order_number) ltr(order.order_number, contentLeft, baseline);
      y += lineHeight(metaSize) + 1.4;
    }

    const customerSize = number(cfg.customer_size_pt, 10.5);
    const addressSize = number(cfg.address_size_pt, 9.5);
    let customerHeight = lineHeight(customerSize) + 2.4;
    const addressLines = cfg.show_customer_address && order.address
      ? (() => {
          setCustomFont(addressSize);
          return doc.splitTextToSize(`العنوان: ${englishDigits(order.address)}`, contentWidth);
        })()
      : [];
    if (addressLines.length) customerHeight += (addressLines.length * lineHeight(addressSize)) + 0.7;
    doc.setLineWidth(0.25);
    doc.line(contentLeft, y, contentRight, y);
    y += 1.5;
    setCustomFont(customerSize);
    rtl(order.customer_name || 'زبون', contentRight, y + lineHeight(customerSize) * 0.78);
    const customerMeta = [cfg.show_customer_phone ? order.customer_phone : '', cfg.show_order_type ? (order.order_type === 'delivery' ? 'توصيل' : 'استلام') : ''].filter(Boolean).join(' • ');
    if (customerMeta) ltr(customerMeta, contentLeft, y + lineHeight(customerSize) * 0.78);
    y += lineHeight(customerSize);
    if (addressLines.length) {
      setCustomFont(addressSize);
      addressLines.forEach(line => {
        rtl(line, contentRight, y + lineHeight(addressSize) * 0.78);
        y += lineHeight(addressSize);
      });
    }
    y += 0.9;
    doc.line(contentLeft, y, contentRight, y);
    y += Math.max(1.3, customerHeight * 0.08);

    if (cfg.show_details_title) {
      const detailSize = number(cfg.details_size_pt, 17);
      setCustomFont(detailSize);
      rtl(cfg.details_title || 'تفاصيل الطلب', pageWidth / 2, y + lineHeight(detailSize) * 0.78, 'center');
      y += lineHeight(detailSize) + 1;
    }

    const itemSize = number(cfg.item_size_pt, 12);
    const priceSize = number(cfg.price_size_pt, 12);
    const optionSize = number(cfg.option_size_pt, 9.5);
    const rowPadding = Math.max(0, number(cfg.row_padding_mm, 1));
    const rowMinHeight = Math.max(3, number(cfg.row_min_height_mm, 7));
    const priceArea = Math.max(27, contentWidth * 0.19);
    const labelArea = Math.max(35, contentWidth - priceArea - 8);

    const drawItem = (item, isDelivery = false) => {
      const quantity = Number(item.quantity || 0);
      const option = isDelivery ? 'خدمة التوصيل' : itemOptionText(item);
      const label = `${cfg.show_quantity ? `${quantity}× ` : ''}${item.product_name || ''}${cfg.show_options && option ? ` — ${option}` : ''}`;
      setCustomFont(option ? Math.min(itemSize, Math.max(optionSize, itemSize - 1)) : itemSize);
      const labelLines = doc.splitTextToSize(englishDigits(label), labelArea);
      const usedLines = labelLines.slice(0, 3);
      const textLineHeight = lineHeight(option ? Math.min(itemSize, Math.max(optionSize, itemSize - 1)) : itemSize);
      const rowHeight = Math.max(rowMinHeight, (usedLines.length * textLineHeight) + (rowPadding * 2));
      ensureSpace(rowHeight + 1);
      const baseline = y + rowPadding + (textLineHeight * 0.78);
      usedLines.forEach((line, index) => rtl(line, contentRight, baseline + (index * textLineHeight)));

      const amount = isDelivery ? fee : item.line_total;
      const priceWidth = Math.min(priceArea, drawAmount(amount, contentLeft, baseline, priceSize));

      const firstLineWidth = Math.min(labelArea, doc.getTextWidth(clean(usedLines[0] || '')));
      const leaderStart = contentLeft + priceWidth + 3;
      const leaderEnd = contentRight - firstLineWidth - 3;
      if (leaderEnd > leaderStart + 4) {
        const leaderPt = Math.max(0.3, number(cfg.leader_width_pt, 1.5));
        doc.setLineWidth(leaderPt * PT_TO_MM);
        const style = cfg.leader_style === 'solid' ? [] : cfg.leader_style === 'dashed' ? [2.2, 1.5] : [0.45, 1.35];
        doc.setLineDashPattern(style, 0);
        doc.line(leaderStart, baseline - 0.8, leaderEnd, baseline - 0.8);
        doc.setLineDashPattern([], 0);
      }
      y += rowHeight;
    };

    items.forEach(item => drawItem(item));
    if (fee > 0) drawItem({ quantity: 1, product_name: 'التوصيل', line_total: fee }, true);

    if (cfg.show_notes && notes) {
      const notesSize = number(cfg.notes_size_pt, 9.5);
      setCustomFont(notesSize);
      const lines = doc.splitTextToSize(`ملاحظة: ${englishDigits(notes)}`, contentWidth);
      const blockHeight = (lines.length * lineHeight(notesSize)) + 4;
      ensureSpace(blockHeight);
      doc.setLineWidth(0.25);
      doc.line(contentLeft, y, contentRight, y);
      y += 1.8;
      lines.forEach(line => {
        rtl(line, contentRight, y + lineHeight(notesSize) * 0.78);
        y += lineHeight(notesSize);
      });
      y += 1;
    }

    const totalSize = number(cfg.total_size_pt, 16);
    const subtotalSize = Math.max(8, totalSize - 4);
    const totalsHeight = fee > 0 && cfg.show_subtotal
      ? lineHeight(subtotalSize) + lineHeight(totalSize) + 5
      : lineHeight(totalSize) + 4;
    const footerHeight = cfg.show_footer ? lineHeight(number(cfg.footer_size_pt, 15)) + number(cfg.footer_spacing_mm, 2.5) + 4 : 0;
    ensureSpace(totalsHeight + footerHeight);

    const totalTop = y + 1;
    doc.setLineWidth(Math.max(0.25, number(cfg.total_border_pt, 2) * PT_TO_MM));
    doc.roundedRect(contentLeft, totalTop, contentWidth, totalsHeight, 1.6, 1.6);
    y = totalTop + 2;
    if (fee > 0 && cfg.show_subtotal) {
      setCustomFont(subtotalSize);
      const baseline = y + lineHeight(subtotalSize) * 0.78;
      rtl('مجموع الأصناف', contentRight - 2, baseline);
      drawAmount(order.subtotal, contentLeft + 2, baseline, subtotalSize);
      y += lineHeight(subtotalSize);
    }
    setCustomFont(totalSize);
    const grandBaseline = y + lineHeight(totalSize) * 0.78;
    rtl('المجموع الكلي', contentRight - 2, grandBaseline);
    drawAmount(order.total, contentLeft + 2, grandBaseline, totalSize);
    y = totalTop + totalsHeight;

    if (cfg.show_footer) {
      y += Math.max(1, number(cfg.footer_spacing_mm, 2.5));
      setCustomFont(number(cfg.footer_size_pt, 15));
      rtl(cfg.footer_text || 'شكراً لاختياركم', pageWidth / 2, y + lineHeight(number(cfg.footer_size_pt, 15)) * 0.78, 'center');
    }

    const blob = doc.output('blob');
    return { blob, pageCount: doc.getNumberOfPages(), embeddedFont: 'PashaInvoiceCustom' };
  }

  window.PashaInvoicePdf = Object.freeze({ create });
})();
