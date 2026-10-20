import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

export default function BillingsView({ onOpenNewPatient }) {
  // Navigation Sidebar sub-menu matching Screenshot 1
  // 'encounters' | 'incomplete' | 'complete' | 'services' | 'outstanding' | 'payments'
  const [activeSubMenu, setActiveSubMenu] = useState('encounters');

  // Encounter Billing Queue Data & Multi-field Filtering
  const [encounterQueue, setEncounterQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [selectedEncounterIds, setSelectedEncounterIds] = useState(new Set());

  // Date & Patient Filters (Default to Today's load)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filterDate, setFilterDate] = useState('today'); // 'today' | 'all' | 'YYYY-MM-DD'
  const [cardNoFilter, setCardNoFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [patientNameFilter, setPatientNameFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Existing Invoices & Receipts Data
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid'

  // Combined Encounter Bill Modal State (Screenshot 2)
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [currentEncounter, setCurrentEncounter] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [otherHmoPlan, setOtherHmoPlan] = useState('-None-');
  const [billDate, setBillDate] = useState(() => getTodayStr());
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [generatingBill, setGeneratingBill] = useState(false);

  // Manual New Invoice Modal State
  const [isManualInvoiceModalOpen, setIsManualInvoiceModalOpen] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [manualInvoice, setManualInvoice] = useState({
    product: '',
    price: '',
    qty: 1,
    payment_option: 'Cash',
  });

  // Slip Printing & Signature Modal State
  const [printSlip, setPrintSlip] = useState(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureName, setSignatureName] = useState('Attending Cashier / Officer');
  const [feedback, setFeedback] = useState(null);

  // ==========================================
  // Load Encounters Billing Queue with Filters
  // ==========================================
  const loadEncounterQueue = async (overrideParams = {}) => {
    try {
      setLoadingQueue(true);
      const params = {};

      const effDate = overrideParams.date !== undefined ? overrideParams.date : filterDate;
      if (effDate) params.date = effDate;

      const effCard = overrideParams.card_no !== undefined ? overrideParams.card_no : cardNoFilter;
      if (effCard && effCard.trim()) params.card_no = effCard.trim();

      const effPhone = overrideParams.phone !== undefined ? overrideParams.phone : phoneFilter;
      if (effPhone && effPhone.trim()) params.phone = effPhone.trim();

      const effName = overrideParams.patient_name !== undefined ? overrideParams.patient_name : patientNameFilter;
      if (effName && effName.trim()) params.patient_name = effName.trim();

      const effSearch = overrideParams.search !== undefined ? overrideParams.search : searchQuery;
      if (effSearch && effSearch.trim()) params.search = effSearch.trim();

      const data = await api.getEncounterBillingQueue(params);
      setEncounterQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading encounters billing queue:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleResetFilters = () => {
    setFilterDate('today');
    setCardNoFilter('');
    setPhoneFilter('');
    setPatientNameFilter('');
    setSearchQuery('');
  };

  const isAnyFilterActive = Boolean(
    (filterDate && filterDate !== 'today') ||
    cardNoFilter.trim() ||
    phoneFilter.trim() ||
    patientNameFilter.trim() ||
    searchQuery.trim()
  );

  // ==========================================
  // Load Existing Invoices & Receipts
  // ==========================================
  const loadBillingsRecords = async () => {
    try {
      setLoadingRecords(true);
      const [invRes, recRes, patRes] = await Promise.all([
        api.getInvoices({ page_size: 150 }),
        api.getReceipts({ page_size: 150 }),
        api.getPatients({ active: 1, page_size: 200 })
      ]);
      setInvoices(invRes.results || invRes || []);
      setReceipts(recRes.results || recRes || []);
      setPatientsList(patRes.results || patRes || []);
    } catch (err) {
      console.error('Error fetching billing records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadEncounterQueue();
    loadBillingsRecords();
  }, []);

  // Debounced multi-filter watcher for encounter billing queue
  useEffect(() => {
    const handler = setTimeout(() => {
      loadEncounterQueue();
    }, 300);
    return () => clearTimeout(handler);
  }, [filterDate, cardNoFilter, phoneFilter, patientNameFilter, searchQuery]);

  // ==========================================
  // Open Combined Encounter Bill Modal (Screenshot 2)
  // ==========================================
  const handleOpenCombinedBill = (enc) => {
    setCurrentEncounter(enc);
    setOtherHmoPlan(enc.plan || '-None-');
    setBillDate(new Date().toISOString().split('T')[0]);

    // Clone billable items so user can edit them safely
    const clonedItems = (enc.billable_items || []).map((it, idx) => ({
      ...it,
      temp_id: it.id || `item_${idx}_${Date.now()}`,
      quantity: Number(it.quantity || 1),
      rate: Number(it.rate || 0),
      discount: Number(it.discount || 0),
      total: Number(it.total || 0),
      payment_option: it.payment_option || (enc.sponsor && enc.sponsor !== 'Self-Pay / Cash' ? 'Claim' : 'Cash'),
      compulsory_pa_code: Boolean(it.compulsory_pa_code),
      bill: it.bill !== false,
      pa_code: it.pa_code || '',
    }));

    // Do NOT push a fake consultation row if empty!
    // If clonedItems is empty, it means consultation and all orders are settled or awaiting clinician orders.
    setBillItems(clonedItems);
    setIsCombinedModalOpen(true);
  };

  // ==========================================
  // Print Daily Consolidated Receipt (80mm POS Thermal)
  // ==========================================
  const handlePrintDailyReceipt = (enc) => {
    if (!enc) return;
    const settled = enc.settled_invoices_today || [];
    let itemsToPrint = [];

    if (settled.length > 0) {
      itemsToPrint = settled.map((it) => ({
        service_item: it.service_item,
        quantity: it.quantity || 1,
        total: it.total,
      }));
    } else {
      itemsToPrint = [
        {
          service_item: `Consultation Fee (${enc.purpose || 'General Consultation'})`,
          quantity: 1,
          total: enc.consultation_settled_amount || 5000,
        },
      ];
    }

    const totalPaid = enc.total_invoiced_today || itemsToPrint.reduce((s, it) => s + Number(it.total || 0), 0);

    setPrintSlip({
      receipt_number: settled[0]?.invoice_number ? `REC-${settled[0].invoice_number.replace(/^INV-/, '')}` : `REC-${enc.patient_id}-${Date.now().toString().slice(-4)}`,
      invoice_number: settled[0]?.invoice_number || `INV-${enc.patient_id}`,
      patient_name: enc.patient_name,
      hospital_number: enc.hospital_number,
      sponsor: enc.sponsor,
      plan: enc.plan,
      items: itemsToPrint,
      total_price: totalPaid,
      created_date: new Date(),
      payment_option: settled[0]?.payment_option || 'Cash',
    });
  };

  // Item Field Change Handlers
  const handleItemFieldChange = (tempId, field, value) => {
    setBillItems((prev) =>
      prev.map((item) => {
        if (item.temp_id !== tempId) return item;

        const updated = { ...item, [field]: value };

        // Recalculate total if quantity, rate, or discount changes
        if (field === 'quantity' || field === 'rate' || field === 'discount') {
          const qty = Number(field === 'quantity' ? value : updated.quantity) || 0;
          const rate = Number(field === 'rate' ? value : updated.rate) || 0;
          const disc = Number(field === 'discount' ? value : updated.discount) || 0;
          const sub = qty * rate;
          const discAmount = (sub * disc) / 100;
          updated.total = Math.max(0, sub - discAmount);
        }

        return updated;
      })
    );
  };

  // Add Custom / Extra Item Row
  const handleAddExtraItem = () => {
    const newItem = {
      temp_id: `custom_${Date.now()}`,
      service_item: '',
      uom: 'Each',
      quantity: 1,
      rate: 0,
      discount: 0,
      total: 0,
      payment_option: currentEncounter?.sponsor && currentEncounter.sponsor !== 'Self-Pay / Cash' ? 'Claim' : 'Cash',
      compulsory_pa_code: false,
      bill: true,
      pa_code: '',
      category: 'custom',
      original_model: null,
      original_id: null,
    };
    setBillItems((prev) => [...prev, newItem]);
  };

  // Remove Item Row
  const handleRemoveItem = (tempId) => {
    setBillItems((prev) => prev.filter((item) => item.temp_id !== tempId));
  };

  // Toggle All "Bill?" checkboxes
  const handleToggleAllBill = (checked) => {
    setBillItems((prev) => prev.map((item) => ({ ...item, bill: checked })));
  };

  // Calculations for Combined Bill
  const billedItemsOnly = useMemo(() => billItems.filter((it) => it.bill), [billItems]);
  const grossTotal = useMemo(
    () => billedItemsOnly.reduce((sum, it) => sum + (Number(it.quantity || 1) * Number(it.rate || 0)), 0),
    [billedItemsOnly]
  );
  const netTotal = useMemo(
    () => billedItemsOnly.reduce((sum, it) => sum + Number(it.total || 0), 0),
    [billedItemsOnly]
  );
  const discountTotal = useMemo(() => Math.max(0, grossTotal - netTotal), [grossTotal, netTotal]);

  // ==========================================
  // Generate Invoice from Combined Encounter Bill
  // ==========================================
  const handleGenerateInvoice = async (autoPrint = false, markAsPaid = false) => {
    if (billedItemsOnly.length === 0) {
      alert('Please check at least one item to bill before generating invoice.');
      return;
    }

    try {
      setGeneratingBill(true);
      const payload = {
        patient_id: currentEncounter.patient_id,
        other_hmo_plan: otherHmoPlan,
        bill_date: billDate,
        mark_as_paid: markAsPaid,
        items: billedItemsOnly.map((it) => ({
          service_item: it.service_item,
          uom: it.uom,
          quantity: it.quantity,
          rate: it.rate,
          discount: it.discount,
          total: it.total,
          payment_option: it.payment_option,
          pa_code: it.pa_code,
          original_model: it.original_model,
          original_id: it.original_id,
        })),
      };

      const res = await api.generateEncounterBill(payload);

      setFeedback({
        type: 'success',
        text: res.message || `Bill #${res.invoice_number} successfully processed for ${currentEncounter.patient_name}!`,
      });

      setIsCombinedModalOpen(false);

      // Refresh billing queue and invoice records
      await Promise.all([loadEncounterQueue(), loadBillingsRecords()]);

      // If requested or marked as paid, open print slip immediately (Official Receipt or Invoice)
      if (autoPrint || markAsPaid) {
        setPrintSlip({
          receipt_number: res.receipt_number || (markAsPaid ? `REC-${res.invoice_number}` : null),
          invoice_number: res.invoice_number,
          patient_name: currentEncounter.patient_name,
          hospital_number: currentEncounter.hospital_number,
          sponsor: currentEncounter.sponsor,
          plan: currentEncounter.plan,
          items: billedItemsOnly,
          total_price: netTotal,
          created_date: new Date(),
          payment_option: billedItemsOnly[0]?.payment_option || 'Cash',
        });
      }
    } catch (err) {
      console.error('Error generating encounter bill:', err);
      setFeedback({
        type: 'danger',
        text: 'Error generating invoice: ' + (err.response?.data?.error || err.response?.data?.detail || err.message),
      });
    } finally {
      setGeneratingBill(false);
    }
  };

  // ==========================================
  // Isolated 80mm POS Thermal Receipt Printing
  // ==========================================
  const handlePrintSlip = () => {
    if (!printSlip) return;

    const receiptNum = printSlip.receipt_number || printSlip.invoice_number || 'INV-OFFICIAL';
    const isReceipt = Boolean(printSlip.receipt_number);
    const patientName = printSlip.patient_name || (printSlip.patient ? `Patient #${printSlip.patient}` : 'Patient');
    const hospNum = printSlip.hospital_number || 'N/A';
    const dateStr = printSlip.created_date ? new Date(printSlip.created_date).toLocaleString() : new Date().toLocaleString();
    const sponsorStr = printSlip.sponsor || 'Self-Pay / Cash';
    const paymentOpt = printSlip.payment_option || printSlip.payment_type || 'Cash';

    // Format item lines for 80mm thermal receipt
    let itemsRows = '';
    if (printSlip.items && printSlip.items.length > 0) {
      itemsRows = printSlip.items.map((it) => `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #000; word-break: break-word;">
            <div style="font-weight: 700; font-size: 11px;">${it.service_item}</div>
          </td>
          <td style="padding: 4px 2px; border-bottom: 1px dashed #000; text-align: center; vertical-align: top; white-space: nowrap; font-size: 11px;">
            ${it.quantity}
          </td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #000; text-align: right; vertical-align: top; white-space: nowrap; font-weight: 700; font-size: 11px;">
            ₦${Number(it.total).toLocaleString()}
          </td>
        </tr>
      `).join('');
    } else {
      const desc = printSlip.product || printSlip.remarks || 'Clinical Service / Consultation';
      const qty = printSlip.qty || 1;
      const rate = Number(printSlip.price || printSlip.total_price || 0);
      const total = rate * qty;
      itemsRows = `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px dashed #000; word-break: break-word;">
            <div style="font-weight: 700; font-size: 11px;">${desc}</div>
          </td>
          <td style="padding: 4px 2px; border-bottom: 1px dashed #000; text-align: center; vertical-align: top; white-space: nowrap; font-size: 11px;">
            ${qty}
          </td>
          <td style="padding: 4px 0; border-bottom: 1px dashed #000; text-align: right; vertical-align: top; white-space: nowrap; font-weight: 700; font-size: 11px;">
            ₦${total.toLocaleString()}
          </td>
        </tr>
      `;
    }

    const grandTotal = Number(printSlip.total_price || (Number(printSlip.price || 0) * Number(printSlip.qty || 1))).toLocaleString();

    // Remove any previously leftover print iframes
    const oldIframe = document.getElementById('clinic365_billing_print_frame');
    if (oldIframe && document.body.contains(oldIframe)) {
      document.body.removeChild(oldIframe);
    }

    // Create an isolated iframe with actual viewport dimensions so Chrome paints all content
    const iframe = document.createElement('iframe');
    iframe.id = 'clinic365_billing_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-99999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${isReceipt ? 'Receipt' : 'Bill'} - ${receiptNum}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", Courier, monospace, sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            .thermal-slip {
              width: 76mm;
              margin: 0 auto;
              padding: 6px 2px 25mm 2px; /* Bottom padding ensures paper tear-off doesn't cut text */
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
            
            .header {
              text-align: center;
              margin-bottom: 6px;
            }
            .hospital-title {
              font-size: 15px;
              font-weight: 800;
              margin: 0;
              letter-spacing: 0.02em;
            }
            .hospital-sub {
              font-size: 10px;
              font-weight: 700;
              margin-top: 1px;
            }
            .divider-dashed {
              border-top: 1px dashed #000000;
              margin: 5px 0;
            }
            .divider-double {
              border-top: 2px solid #000000;
              margin: 6px 0;
            }
            .doc-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 3px 0 2px 0;
            }
            .doc-num {
              font-size: 11px;
              font-family: monospace;
              font-weight: 800;
            }
            
            .meta-table {
              width: 100%;
              margin: 4px 0;
              font-size: 11px;
            }
            .meta-table td {
              padding: 1.5px 0;
              vertical-align: top;
            }
            .meta-label {
              width: 55px;
              color: #222222;
              font-size: 10px;
            }
            .meta-val {
              font-weight: 600;
            }

            table.items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 11px;
            }
            table.items-table th {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 4px 0;
              font-size: 10px;
              text-transform: uppercase;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              font-weight: 800;
              padding: 6px 0;
              border-top: 1px solid #000;
              border-bottom: 2px solid #000;
              margin: 6px 0;
            }
            
            .payment-info {
              font-size: 11px;
              margin: 5px 0;
            }
            
            .signatures {
              margin-top: 16px;
              padding-top: 10px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
            }
            .sign-line {
              border-top: 1px dashed #000;
              width: 33mm;
              text-align: center;
              padding-top: 3px;
            }

            .footer {
              text-align: center;
              font-size: 10px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="thermal-slip">
            <div class="header">
              <div class="hospital-title">CLINIC365 HEALTHCARE</div>
              <div class="hospital-sub">ISALU HOSPITALS LIMITED</div>
              <div style="font-size: 9px;">Billing &amp; Revenue Services</div>
              <div class="divider-dashed"></div>
              <div class="doc-title">${isReceipt ? 'OFFICIAL PAYMENT RECEIPT' : 'ENCOUNTER INVOICE BILL'}</div>
              <div class="doc-num">NO: ${receiptNum}</div>
            </div>

            <div class="divider-dashed"></div>

            <table class="meta-table">
              <tr>
                <td class="meta-label">Patient:</td>
                <td class="meta-val">${patientName}</td>
              </tr>
              ${hospNum !== 'N/A' ? `
              <tr>
                <td class="meta-label">Card/Hosp:</td>
                <td class="meta-val">${hospNum}</td>
              </tr>` : ''}
              <tr>
                <td class="meta-label">Date:</td>
                <td class="meta-val">${dateStr}</td>
              </tr>
              <tr>
                <td class="meta-label">Sponsor:</td>
                <td class="meta-val">${sponsorStr}</td>
              </tr>
            </table>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Item Description</th>
                  <th style="text-align: center; width: 12mm;">Qty</th>
                  <th style="text-align: right; width: 22mm;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="total-row">
              <span>TOTAL (NGN):</span>
              <span>₦${grandTotal}</span>
            </div>

            <div class="payment-info">
              <div>Payment Mode: <strong>${paymentOpt}</strong></div>
              <div>Status: <strong>${isReceipt ? 'PAID &amp; SETTLED' : 'BILLED / UNPAID'}</strong></div>
            </div>

            <div class="divider-dashed"></div>

            <div class="signatures">
              <div class="sign-line">Customer / Patient</div>
              <div class="sign-line">Cashier / Officer</div>
            </div>

            <div class="footer">
              <div style="font-weight: 700;">*** THANK YOU ***</div>
              <div>Wish You Quick Recovery &amp; Good Health</div>
              <div style="font-size: 8px; margin-top: 4px;">Powered by Clinic365 EMR</div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        window.print();
      }
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 350);
  };

  // ==========================================
  // Manual Invoice Creation
  // ==========================================
  const handleCreateManualInvoice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        product: manualInvoice.product,
        price: Number(manualInvoice.price),
        qty: Number(manualInvoice.qty || 1),
        payment_option: manualInvoice.payment_option || 'Cash',
      };
      if (selectedPatientId) {
        payload.patient = Number(selectedPatientId);
      }
      await api.createInvoice(payload);
      setIsManualInvoiceModalOpen(false);
      setManualInvoice({
        product: '',
        price: '',
        qty: 1,
        payment_option: 'Cash',
      });
      setSelectedPatientId('');
      setFeedback({ type: 'success', text: `Invoice created successfully for ${payload.product}!` });
      loadBillingsRecords();
    } catch (err) {
      setFeedback({ type: 'danger', text: 'Error creating invoice: ' + (err.response?.data?.detail || err.message) });
    }
  };

  // Mark invoice as paid
  const handleMarkAsPaid = async (inv) => {
    try {
      await api.updateInvoice(inv.id, { completed: 1 });
      const totalAmount = Number(inv.price || 0) * Number(inv.qty || 1);
      await api.createReceipt({
        patient: inv.patient,
        invoice_number: inv.invoice_number,
        total_price: totalAmount,
        payment_type: inv.payment_option || 'Cash',
        remarks: `Settlement for ${inv.product}`,
      });
      setFeedback({
        type: 'success',
        text: `Payment of ₦${totalAmount.toLocaleString()} recorded successfully for Invoice ${inv.invoice_number || `INV-${inv.id}`}!`,
      });
      loadBillingsRecords();
    } catch (err) {
      setFeedback({ type: 'danger', text: 'Error recording payment: ' + (err.response?.data?.detail || err.message) });
    }
  };

  // Summary Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.qty || 1), 0);
  const totalReceipted = receipts.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  const pendingInvoicesCount = invoices.filter((i) => !i.completed).length;

  // Filtered Invoices & Receipts
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter === 'pending' && inv.completed) return false;
    if (invoiceStatusFilter === 'paid' && !inv.completed) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.patient_name && inv.patient_name.toLowerCase().includes(q)) ||
      (inv.hospital_number && inv.hospital_number.toLowerCase().includes(q)) ||
      (inv.product && inv.product.toLowerCase().includes(q)) ||
      (inv.payment_option && inv.payment_option.toLowerCase().includes(q))
    );
  });

  const filteredReceipts = receipts.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (rec.receipt_number && rec.receipt_number.toLowerCase().includes(q)) ||
      (rec.invoice_number && rec.invoice_number.toLowerCase().includes(q)) ||
      (rec.patient_name && rec.patient_name.toLowerCase().includes(q)) ||
      (rec.payment_type && rec.payment_type.toLowerCase().includes(q)) ||
      (rec.remarks && rec.remarks.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container-fluid py-3">
      {/* Top Header */}
      <div className="d-flex align-items-center justify-content-between mb-3.5 flex-wrap" style={{ gap: '12px' }}>
        <div className="d-flex align-items-center" style={{ gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              flexShrink: 0,
            }}
          >
            <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.2rem' }}></i>
          </div>
          <div>
            <h1
              className="mb-0 font-weight-bold text-gray-900"
              style={{
                fontSize: '1.24rem',
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
              }}
            >
              Billing &amp; Financial Management
            </h1>
            <p className="small mb-0 text-muted" style={{ fontSize: '0.82rem' }}>
              Encounters Billing Queue &bull; Patient Invoicing &bull; Payment Settlement Receipts
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center" style={{ gap: '10px' }}>
          <button
            type="button"
            className="btn btn-sm btn-white border font-weight-bold text-secondary shadow-xs d-inline-flex align-items-center"
            style={{
              borderRadius: '7px',
              padding: '6px 14px',
              fontSize: '0.82rem',
              backgroundColor: '#ffffff',
              borderColor: '#cbd5e1',
            }}
            onClick={() => {
              loadEncounterQueue();
              loadBillingsRecords();
            }}
            title="Refresh Billing Queue & Records"
          >
            <i className={`fas fa-sync-alt mr-2 text-primary ${loadingQueue || loadingRecords ? 'fa-spin' : ''}`}></i>
            Refresh Queue
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary font-weight-bold shadow-xs d-inline-flex align-items-center"
            style={{
              borderRadius: '7px',
              padding: '6px 16px',
              fontSize: '0.82rem',
              background: '#0284c7',
              borderColor: '#0284c7',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            }}
            onClick={() => setIsManualInvoiceModalOpen(true)}
          >
            <i className="fas fa-plus mr-2"></i> Create Direct Invoice
          </button>
        </div>
      </div>

      {/* Modern Professional Standard KPI Cards */}
      <div className="row mb-3.5" style={{ rowGap: '10px' }}>
        {/* Card 1: Encounters in Queue */}
        <div className="col-xl-3 col-md-6 mb-2 mb-xl-0">
          <div
            className="card border-0 h-100 shadow-xs d-flex flex-column justify-content-between"
            style={{
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                  title="Encounters in Queue"
                >
                  Encounters in Queue
                </span>
                <div
                  className="font-weight-bold mt-1"
                  style={{ fontSize: '1.5rem', color: '#0f172a', lineHeight: 1 }}
                >
                  {encounterQueue.length}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                <i className="fas fa-user-clock"></i>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between pt-1.5 border-top" style={{ borderColor: '#f1f5f9', gap: '6px' }}>
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                Active doctor orders
              </span>
              <span
                className="badge font-weight-bold flex-shrink-0"
                style={{
                  backgroundColor: '#eff6ff',
                  color: '#0284c7',
                  fontSize: '0.68rem',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Ready to bill
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Invoices */}
        <div className="col-xl-3 col-md-6 mb-2 mb-xl-0">
          <div
            className="card border-0 h-100 shadow-xs d-flex flex-column justify-content-between"
            style={{
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                  title="Pending Invoices"
                >
                  Pending Invoices
                </span>
                <div
                  className="font-weight-bold mt-1"
                  style={{ fontSize: '1.5rem', color: '#0f172a', lineHeight: 1 }}
                >
                  {pendingInvoicesCount}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                <i className="fas fa-hourglass-half"></i>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between pt-1.5 border-top" style={{ borderColor: '#f1f5f9', gap: '6px' }}>
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                Awaiting payment
              </span>
              <span
                className="badge font-weight-bold flex-shrink-0"
                style={{
                  backgroundColor: '#fffbeb',
                  color: '#b45309',
                  fontSize: '0.68rem',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Unpaid
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Invoiced */}
        <div className="col-xl-3 col-md-6 mb-2 mb-xl-0">
          <div
            className="card border-0 h-100 shadow-xs d-flex flex-column justify-content-between"
            style={{
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                  title="Total Invoiced"
                >
                  Total Invoiced
                </span>
                <div
                  className="font-weight-bold mt-1"
                  style={{ fontSize: '1.45rem', color: '#0f172a', lineHeight: 1 }}
                >
                  ₦{totalInvoiced.toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                <i className="fas fa-file-invoice-dollar"></i>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between pt-1.5 border-top" style={{ borderColor: '#f1f5f9', gap: '6px' }}>
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                All generated bills
              </span>
              <span
                className="badge font-weight-bold flex-shrink-0"
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.68rem',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Gross billed
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Collections */}
        <div className="col-xl-3 col-md-6 mb-2 mb-xl-0">
          <div
            className="card border-0 h-100 shadow-xs d-flex flex-column justify-content-between"
            style={{
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
            }}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                  }}
                  title="Total Collections"
                >
                  Total Collections
                </span>
                <div
                  className="font-weight-bold mt-1"
                  style={{ fontSize: '1.45rem', color: '#0f172a', lineHeight: 1 }}
                >
                  ₦{totalReceipted.toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              >
                <i className="fas fa-receipt"></i>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between pt-1.5 border-top" style={{ borderColor: '#f1f5f9', gap: '6px' }}>
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }}>
                Recorded payments
              </span>
              <span
                className="badge font-weight-bold flex-shrink-0"
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#047857',
                  fontSize: '0.68rem',
                  padding: '3px 7px',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                Settled
              </span>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type} alert-dismissible fade show shadow-xs mb-3`} role="alert">
          <i className={`fas ${feedback.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
          {feedback.text}
          <button type="button" className="close" onClick={() => setFeedback(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Main Container with Left Sidebar & Content (Screenshot 1 Layout) */}
      <div className="row">
        {/* Left Sub-Menu Navigation */}
        <div className="col-lg-2 col-md-3 mb-3 pr-md-0">
          <div
            className="card border-0"
            style={{
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              className="py-2.5 px-3 border-bottom d-flex align-items-center"
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: '#64748b',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: '#f8fafc',
              }}
            >
              <i className="fas fa-th-large text-primary mr-2"></i>
              Billing Menu
            </div>
            <div className="list-group list-group-flush" style={{ fontSize: '0.83rem' }}>
              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'encounters' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'encounters' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'encounters' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'encounters' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('encounters')}
              >
                <span>
                  <i className={`fas fa-clipboard-list mr-2 ${activeSubMenu === 'encounters' ? 'text-primary' : 'text-muted'}`}></i>
                  Encounters Billing
                </span>
                <span
                  className="badge badge-pill font-weight-bold"
                  style={{
                    backgroundColor: activeSubMenu === 'encounters' ? '#0284c7' : '#f1f5f9',
                    color: activeSubMenu === 'encounters' ? '#ffffff' : '#64748b',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                  }}
                >
                  {encounterQueue.length}
                </span>
              </button>

              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'incomplete' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'incomplete' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'incomplete' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'incomplete' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('incomplete')}
              >
                <span>
                  <i className={`fas fa-hourglass-start mr-2 ${activeSubMenu === 'incomplete' ? 'text-primary' : 'text-muted'}`}></i>
                  Incomplete Encounters
                </span>
              </button>

              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'complete' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'complete' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'complete' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'complete' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('complete')}
              >
                <span>
                  <i className={`fas fa-check-circle mr-2 ${activeSubMenu === 'complete' ? 'text-primary' : 'text-muted'}`}></i>
                  Complete Encounters
                </span>
                <span
                  className="badge badge-pill font-weight-bold"
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                  }}
                >
                  {invoices.filter((i) => i.completed).length}
                </span>
              </button>

              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'services' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'services' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'services' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'services' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('services')}
              >
                <span>
                  <i className={`fas fa-hand-holding-medical mr-2 ${activeSubMenu === 'services' ? 'text-primary' : 'text-muted'}`}></i>
                  Services Awaiting
                </span>
              </button>

              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'outstanding' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'outstanding' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'outstanding' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'outstanding' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('outstanding')}
              >
                <span>
                  <i className={`fas fa-exclamation-circle mr-2 ${activeSubMenu === 'outstanding' ? 'text-primary' : 'text-muted'}`}></i>
                  Outstanding Invoices
                </span>
                <span
                  className="badge badge-pill font-weight-bold"
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                  }}
                >
                  {pendingInvoicesCount}
                </span>
              </button>

              <button
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2.5 px-3 border-0 ${
                  activeSubMenu === 'payments' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'payments' ? '#f0f9ff' : 'transparent',
                  color: activeSubMenu === 'payments' ? '#0284c7' : '#475569',
                  borderLeft: activeSubMenu === 'payments' ? '4px solid #0284c7' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('payments')}
              >
                <span>
                  <i className={`fas fa-receipt mr-2 ${activeSubMenu === 'payments' ? 'text-primary' : 'text-muted'}`}></i>
                  Patient Payments
                </span>
                <span
                  className="badge badge-pill font-weight-bold"
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                  }}
                >
                  {receipts.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="col-lg-10 col-md-9">
          <div
            className="card border-0"
            style={{
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Table Control Bar */}
            <div className="card-header bg-white py-3 px-3.5 border-bottom d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px' }}>
              <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                <span className="font-weight-bold text-gray-800" style={{ fontSize: '0.94rem' }}>
                  {activeSubMenu === 'encounters' && 'Encounters Awaiting Billing Queue'}
                  {activeSubMenu === 'incomplete' && 'Incomplete Encounters'}
                  {activeSubMenu === 'complete' && 'Completed Encounters & Generated Invoices'}
                  {activeSubMenu === 'services' && 'Clinical Services Awaiting Billing'}
                  {activeSubMenu === 'outstanding' && 'Outstanding / Unpaid Invoices'}
                  {activeSubMenu === 'payments' && 'Patient Payments & Settlement Receipts'}
                </span>
                {activeSubMenu === 'encounters' && (
                  <span
                    className="badge px-2.5 py-1 font-weight-bold ml-1"
                    style={{ backgroundColor: '#eff6ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: '0.74rem', borderRadius: '12px' }}
                  >
                    {encounterQueue.length} patient(s) ready
                  </span>
                )}
                {activeSubMenu === 'encounters' && filterDate === 'today' && (
                  <span
                    className="badge px-2.5 py-1 font-weight-bold ml-1"
                    style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.72rem', borderRadius: '12px' }}
                  >
                    <i className="fas fa-calendar-check mr-1"></i> Today's Schedule &amp; Orders
                  </span>
                )}
              </div>

              {activeSubMenu !== 'encounters' && (
                <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                  <div className="input-group input-group-sm" style={{ width: '280px' }}>
                    <div className="input-group-prepend">
                      <span className="input-group-text bg-light border-right-0">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                    </div>
                    <input
                      type="text"
                      className="form-control border-left-0"
                      placeholder="Search patient, hosp#, sponsor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <div className="input-group-append">
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    )}
                  </div>

                  {activeSubMenu === 'outstanding' && (
                    <div className="btn-group btn-group-sm">
                      <button
                        className={`btn ${invoiceStatusFilter === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => setInvoiceStatusFilter('all')}
                      >
                        All
                      </button>
                      <button
                        className={`btn ${invoiceStatusFilter === 'pending' ? 'btn-warning text-dark font-weight-bold' : 'btn-outline-warning'}`}
                        onClick={() => setInvoiceStatusFilter('pending')}
                      >
                        Pending
                      </button>
                      <button
                        className={`btn ${invoiceStatusFilter === 'paid' ? 'btn-success font-weight-bold' : 'btn-outline-success'}`}
                        onClick={() => setInvoiceStatusFilter('paid')}
                      >
                        Settled
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Specialized Filter Toolbar for Encounters Billing (Date, Card No, Phone No, Patient Name) */}
            {activeSubMenu === 'encounters' && (
              <div className="bg-light px-3 py-2 border-bottom" style={{ fontSize: '0.82rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap" style={{ gap: '10px' }}>
                  {/* Date Filter Segment */}
                  <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                    <span className="text-muted font-weight-bold mr-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <i className="far fa-calendar-alt text-primary mr-1"></i> Date:
                    </span>
                    <div className="btn-group btn-group-sm bg-white border rounded shadow-2xs p-0.5" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${filterDate === 'today' ? 'btn-primary font-weight-bold shadow-xs' : 'btn-light text-secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                        onClick={() => setFilterDate('today')}
                      >
                        Today
                      </button>
                      <input
                        type="date"
                        className="form-control form-control-sm border-0 bg-transparent text-secondary"
                        style={{ width: '130px', fontSize: '0.78rem', height: '26px', padding: '0 6px' }}
                        value={filterDate === 'today' ? getTodayStr() : (filterDate === 'all' ? '' : filterDate)}
                        onChange={(e) => setFilterDate(e.target.value || 'today')}
                        title="Filter by specific arrival or scheduled date"
                      />
                      <button
                        type="button"
                        className={`btn btn-sm ${filterDate === 'all' ? 'btn-secondary font-weight-bold' : 'btn-light text-secondary'}`}
                        style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                        onClick={() => setFilterDate('all')}
                      >
                        All Dates
                      </button>
                    </div>
                  </div>

                  {/* Multi-field Patient Filters */}
                  <div className="d-flex align-items-center flex-wrap flex-grow-1 justify-content-end" style={{ gap: '8px' }}>
                    {/* Card / Hosp No */}
                    <div className="input-group input-group-sm" style={{ width: '145px' }}>
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white border-right-0 text-muted" style={{ padding: '0 7px', fontSize: '0.75rem' }} title="Card / Hospital No">
                          <i className="fas fa-id-card"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm border-left-0 bg-white"
                        style={{ fontSize: '0.78rem' }}
                        placeholder="Card No..."
                        value={cardNoFilter}
                        onChange={(e) => setCardNoFilter(e.target.value)}
                      />
                    </div>

                    {/* Phone No */}
                    <div className="input-group input-group-sm" style={{ width: '145px' }}>
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white border-right-0 text-muted" style={{ padding: '0 7px', fontSize: '0.75rem' }} title="Phone Number">
                          <i className="fas fa-phone-alt text-success"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm border-left-0 bg-white"
                        style={{ fontSize: '0.78rem' }}
                        placeholder="Phone No..."
                        value={phoneFilter}
                        onChange={(e) => setPhoneFilter(e.target.value)}
                      />
                    </div>

                    {/* Patient Name */}
                    <div className="input-group input-group-sm" style={{ width: '160px' }}>
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white border-right-0 text-muted" style={{ padding: '0 7px', fontSize: '0.75rem' }} title="Patient Name">
                          <i className="fas fa-user text-primary"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm border-left-0 bg-white"
                        style={{ fontSize: '0.78rem' }}
                        placeholder="Patient Name..."
                        value={patientNameFilter}
                        onChange={(e) => setPatientNameFilter(e.target.value)}
                      />
                    </div>

                    {/* Quick Search */}
                    <div className="input-group input-group-sm" style={{ width: '150px' }}>
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white border-right-0 text-muted" style={{ padding: '0 7px', fontSize: '0.75rem' }}>
                          <i className="fas fa-search"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-sm border-left-0 bg-white"
                        style={{ fontSize: '0.78rem' }}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Reset Button */}
                    {isAnyFilterActive && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger shadow-xs flex-shrink-0"
                        style={{ borderRadius: '6px', padding: '3px 10px', fontSize: '0.76rem', fontWeight: 600 }}
                        onClick={handleResetFilters}
                        title="Reset all filters back to today"
                      >
                        <i className="fas fa-undo-alt mr-1"></i> Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 1. Encounters Billing Queue (Matching Screenshot 1) */}
            {activeSubMenu === 'encounters' && (
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ width: '38px', verticalAlign: 'middle' }} className="text-center py-3">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEncounterIds(new Set(encounterQueue.map((q) => q.patient_id)));
                              } else {
                                setSelectedEncounterIds(new Set());
                              }
                            }}
                            checked={encounterQueue.length > 0 && selectedEncounterIds.size === encounterQueue.length}
                          />
                        </th>
                        <th style={{ verticalAlign: 'middle' }} className="py-3">
                          Patient Information
                        </th>
                        <th style={{ minWidth: '120px', verticalAlign: 'middle' }} className="py-3">
                          Visit Schedule
                        </th>
                        <th style={{ minWidth: '160px', verticalAlign: 'middle' }} className="py-3">
                          Purpose &amp; Clinician
                        </th>
                        <th style={{ minWidth: '240px', verticalAlign: 'middle' }} className="py-3">
                          Fee Breakdown &amp; Status
                        </th>
                        <th style={{ width: '130px', verticalAlign: 'middle' }} className="text-center py-3">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {loadingQueue ? (
                        <tr>
                          <td colSpan="6" className="text-center py-5 text-muted">
                            <i className="fas fa-spinner fa-spin fa-2x text-primary mb-2"></i>
                            <div>Loading encounters awaiting billing...</div>
                          </td>
                        </tr>
                      ) : encounterQueue.length > 0 ? (
                        encounterQueue.map((enc) => {
                          const isSelected = selectedEncounterIds.has(enc.patient_id);
                          return (
                            <tr
                              key={enc.patient_id}
                              style={{
                                backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              {/* Checkbox */}
                              <td className="text-center align-middle">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedEncounterIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(enc.patient_id)) {
                                        next.delete(enc.patient_id);
                                      } else {
                                        next.add(enc.patient_id);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </td>

                              {/* Patient Column */}
                              <td className="align-middle py-3">
                                <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                                  <div
                                    className="d-flex align-items-center justify-content-center flex-shrink-0 font-weight-bold"
                                    style={{
                                      width: '38px',
                                      height: '38px',
                                      borderRadius: '50%',
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      fontSize: '0.84rem',
                                      border: '1px solid #bae6fd',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    }}
                                  >
                                    {enc.patient_name
                                      ? enc.patient_name
                                          .trim()
                                          .split(/\s+/)
                                          .slice(0, 2)
                                          .map((n) => n[0])
                                          .join('')
                                          .toUpperCase()
                                      : 'PT'}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                                      <span className="font-weight-bold text-gray-900" style={{ fontSize: '0.91rem' }}>
                                        {enc.patient_name}
                                      </span>
                                      <span
                                        className="badge px-1.5 py-0.5 font-weight-bold"
                                        style={{
                                          backgroundColor: '#f1f5f9',
                                          color: '#334155',
                                          border: '1px solid #cbd5e1',
                                          fontFamily: 'monospace',
                                          fontSize: '0.72rem',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        {enc.hospital_number || 'No Card#'}
                                      </span>
                                    </div>
                                    <div className="small text-muted mt-0.5 d-flex align-items-center flex-wrap" style={{ gap: '10px', fontSize: '0.78rem' }}>
                                      <span>
                                        <i className="fas fa-phone-alt text-success mr-1" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="text-gray-700 font-weight-bold">{enc.phone_number || 'N/A'}</span>
                                      </span>
                                      <span>
                                        <i className="fas fa-building text-muted mr-1" style={{ fontSize: '0.7rem' }}></i>
                                        <span className="text-gray-600">{enc.sponsor || 'Self-Pay / Cash'}</span>
                                      </span>
                                    </div>
                                    <div className="d-flex align-items-center flex-wrap mt-1" style={{ gap: '5px' }}>
                                      <span
                                        className="badge px-2 py-0.5 text-secondary"
                                        style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', borderRadius: '4px' }}
                                      >
                                        {enc.plan || 'Standard Plan'}
                                      </span>
                                      {enc.policy_number && enc.policy_number !== 'null' && enc.policy_number !== 'N/A' && (
                                        <span
                                          className="badge px-2 py-0.5 text-secondary"
                                          style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.7rem', borderRadius: '4px' }}
                                        >
                                          Pol: {enc.policy_number}
                                        </span>
                                      )}
                                      <span
                                        className="badge px-2 py-0.5 font-weight-bold"
                                        style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.7rem', borderRadius: '4px' }}
                                      >
                                        TAG #{String(enc.tag_number || enc.patient_id).replace(/^TAG\s*#?:?\s*/i, '')}
                                      </span>
                                      {enc.visit_type && (
                                        <span
                                          className="badge px-2 py-0.5 font-weight-bold"
                                          style={{
                                            backgroundColor: enc.visit_type === 'New-case' ? '#ecfdf5' : '#f1f5f9',
                                            color: enc.visit_type === 'New-case' ? '#047857' : '#475569',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.7rem',
                                            borderRadius: '4px',
                                          }}
                                        >
                                          {enc.visit_type}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Visit Date */}
                              <td className="align-middle py-3">
                                <div className="font-weight-bold text-gray-800" style={{ fontSize: '0.86rem' }}>
                                  <i className="far fa-calendar-alt text-primary mr-1.5" style={{ fontSize: '0.8rem' }}></i>
                                  {enc.visit_date}
                                </div>
                                {enc.visit_time && (
                                  <div className="small text-muted mt-0.5" style={{ fontSize: '0.78rem' }}>
                                    <i className="far fa-clock text-gray-400 mr-1.5" style={{ fontSize: '0.75rem' }}></i>
                                    {enc.visit_time}
                                  </div>
                                )}
                              </td>

                              {/* Purpose & Clinician */}
                              <td className="align-middle py-3">
                                <div className="font-weight-bold text-gray-800 mb-0.5" style={{ fontSize: '0.86rem' }}>
                                  {enc.purpose || 'General Consultation'}
                                </div>
                                <div className="small text-muted" style={{ fontSize: '0.78rem' }}>
                                  {enc.seen_by ? (
                                    <>
                                      <i className="fas fa-user-md text-info mr-1.5" style={{ fontSize: '0.78rem' }}></i>
                                      <span className="text-gray-700">{enc.seen_by}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted font-italic">
                                      <i className="fas fa-user-clock mr-1 text-gray-400"></i>
                                      Awaiting Clinician
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Fee Breakdown & Status Badges */}
                              <td className="align-middle py-3">
                                <div className="d-flex flex-wrap align-items-center" style={{ gap: '5px', maxWidth: '340px' }}>
                                  {/* Registration Fee */}
                                  {enc.has_registration_fee && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#eff6ff',
                                        color: '#0284c7',
                                        border: '1px solid #bfdbfe',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title="Patient Registration & Card Fee pending invoice"
                                    >
                                      <i className="fas fa-id-card mr-1 text-primary"></i> Registration (₦2,500)
                                    </span>
                                  )}

                                  {/* Consultation Fee */}
                                  {enc.has_consultation_fee && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#f0fdf4',
                                        color: '#16a34a',
                                        border: '1px solid #bbf7d0',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title="Consultation Fee pending invoice"
                                    >
                                      <i className="fas fa-user-md mr-1 text-success"></i> Consultation Fee
                                    </span>
                                  )}

                                  {/* Prescriptions */}
                                  {enc.prescriptions_count > 0 && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#faf5ff',
                                        color: '#7c3aed',
                                        border: '1px solid #ddd6fe',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title={`${enc.prescriptions_count} doctor prescribed medication(s)`}
                                    >
                                      <i className="fas fa-pills mr-1" style={{ color: '#9333ea' }}></i> Pharmacy Rx ({enc.prescriptions_count})
                                    </span>
                                  )}

                                  {/* Investigations */}
                                  {enc.investigations_count > 0 && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#fff7ed',
                                        color: '#c2410c',
                                        border: '1px solid #fed7aa',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title={`${enc.investigations_count} laboratory / radiology order(s)`}
                                    >
                                      <i className="fas fa-vial mr-1 text-warning"></i> Lab/Scan ({enc.investigations_count})
                                    </span>
                                  )}

                                  {/* Services */}
                                  {enc.services_count > 0 && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#ecfeff',
                                        color: '#0891b2',
                                        border: '1px solid #a5f3fc',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title={`${enc.services_count} clinical service/procedure(s)`}
                                    >
                                      <i className="fas fa-procedures mr-1"></i> Services ({enc.services_count})
                                    </span>
                                  )}

                                  {/* Consultation Settled Badge */}
                                  {enc.consultation_settled && (
                                    <span
                                      className="badge d-inline-flex align-items-center font-weight-bold"
                                      style={{
                                        backgroundColor: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        padding: '4px 8px',
                                        fontSize: '0.73rem',
                                        borderRadius: '5px',
                                      }}
                                      title={`Consultation fee of ₦${Number(enc.consultation_settled_amount || 5000).toLocaleString()} was settled`}
                                    >
                                      <i className="fas fa-check-circle mr-1 text-success"></i> Consult Settled
                                    </span>
                                  )}

                                  {/* When no pending doctor orders */}
                                  {!enc.has_pending_items && (
                                    <>
                                      {enc.consultation_settled || (enc.settled_invoices_today && enc.settled_invoices_today.length > 0) ? (
                                        <span
                                          className="badge d-inline-flex align-items-center text-muted"
                                          style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px solid #e2e8f0',
                                            padding: '4px 8px',
                                            fontSize: '0.72rem',
                                            borderRadius: '5px',
                                          }}
                                        >
                                          <i className="fas fa-user-clock mr-1 text-primary"></i> With Clinician &bull; No Pending Orders
                                        </span>
                                      ) : (
                                        <span
                                          className="badge d-inline-flex align-items-center text-muted"
                                          style={{
                                            backgroundColor: '#f8fafc',
                                            border: '1px dashed #cbd5e1',
                                            padding: '4px 8px',
                                            fontSize: '0.71rem',
                                            borderRadius: '5px',
                                          }}
                                        >
                                          <i className="fas fa-info-circle mr-1 text-gray-400"></i> Intake &amp; Consult Pending
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Action: Open Combined Encounter Bill Modal or View Receipt */}
                              <td className="align-middle text-center py-3" style={{ width: '135px' }}>
                                {enc.has_pending_items ? (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-primary font-weight-bold shadow-xs d-inline-flex align-items-center justify-content-center"
                                    style={{
                                      borderRadius: '6px',
                                      padding: '7px 14px',
                                      fontSize: '0.81rem',
                                      whiteSpace: 'nowrap',
                                      gap: '6px',
                                      backgroundColor: '#0284c7',
                                      borderColor: '#0284c7',
                                      boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                                    }}
                                    title="Bill doctor prescribed medications, tests and clinical orders"
                                    onClick={() => handleOpenCombinedBill(enc)}
                                  >
                                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '0.85rem' }}></i>
                                    <span>{enc.consultation_settled ? 'Bill Orders' : 'View & Bill'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success font-weight-bold shadow-2xs d-inline-flex align-items-center justify-content-center"
                                    style={{
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      fontSize: '0.80rem',
                                      whiteSpace: 'nowrap',
                                      gap: '5px',
                                    }}
                                    title="View settled encounter breakdown & payment history"
                                    onClick={() => handleOpenCombinedBill(enc)}
                                  >
                                    <i className="fas fa-receipt text-success" style={{ fontSize: '0.82rem' }}></i>
                                    <span>View Receipt</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-5 text-muted">
                            <i className="fas fa-clipboard-check fa-3x text-gray-300 mb-3 d-block"></i>
                            <div className="font-weight-bold">No scheduled patients or pending encounters matching filters.</div>
                            <div className="small mt-1 text-muted">
                              When patients are scheduled for today or doctors order prescriptions, tests, or procedures, they will land here automatically with consultation &amp; registration fees.
                            </div>
                            {isAnyFilterActive && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mt-3 font-weight-bold"
                                onClick={handleResetFilters}
                              >
                                <i className="fas fa-undo-alt mr-1"></i> Reset to Today's Load
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. Complete Encounters / Generated Invoices */}
            {(activeSubMenu === 'complete' || activeSubMenu === 'outstanding') && (
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light" style={{ fontSize: '0.84rem' }}>
                      <tr>
                        <th>Invoice #</th>
                        <th>Patient</th>
                        <th>Hospital No.</th>
                        <th>Service / Product</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Amount (₦)</th>
                        <th>Payment Option</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => {
                          const qty = Number(inv.qty || 1);
                          const unitPrice = Number(inv.price || 0);
                          const lineTotal = unitPrice * qty;
                          return (
                            <tr key={inv.id}>
                              <td className="font-weight-bold text-primary">
                                {inv.invoice_number || `INV-${inv.id}`}
                              </td>
                              <td className="font-weight-bold text-dark">
                                {inv.patient_name || (inv.patient ? `Patient #${inv.patient}` : 'N/A')}
                              </td>
                              <td className="text-muted">{inv.hospital_number || 'N/A'}</td>
                              <td>{inv.product}</td>
                              <td className="text-center font-weight-bold">{qty}</td>
                              <td className="text-right font-weight-bold text-gray-900">
                                ₦{lineTotal.toLocaleString()}
                              </td>
                              <td>
                                <span className="badge badge-light border text-secondary">
                                  {inv.payment_option || 'Cash'}
                                </span>
                              </td>
                              <td className="text-center">
                                {inv.completed ? (
                                  <span className="badge badge-success px-2 py-1">
                                    <i className="fas fa-check mr-1"></i> Paid
                                  </span>
                                ) : (
                                  <span className="badge badge-warning px-2 py-1 text-dark">
                                    <i className="fas fa-clock mr-1"></i> Pending
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm">
                                  {!inv.completed && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-success btn-sm px-2"
                                      onClick={() => handleMarkAsPaid(inv)}
                                      title="Record Payment"
                                    >
                                      <i className="fas fa-check-circle mr-1"></i> Pay
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-2"
                                    onClick={() => setPrintSlip(inv)}
                                    title="Print Slip"
                                  >
                                    <i className="fas fa-print"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="9" className="text-center py-5 text-muted">
                            <i className="fas fa-file-invoice fa-3x text-gray-300 mb-2 d-block"></i>
                            <div>No invoices found matching criteria.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. Patient Payments & Receipts */}
            {activeSubMenu === 'payments' && (
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light" style={{ fontSize: '0.84rem' }}>
                      <tr>
                        <th>Receipt #</th>
                        <th>Invoice #</th>
                        <th>Patient</th>
                        <th>Settlement Remarks</th>
                        <th>Payment Type</th>
                        <th className="text-right">Amount (₦)</th>
                        <th>Date &amp; Time</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {filteredReceipts.length > 0 ? (
                        filteredReceipts.map((rec) => (
                          <tr key={rec.id}>
                            <td className="font-weight-bold text-success">
                              {rec.receipt_number || `REC-${rec.id}`}
                            </td>
                            <td className="text-muted">{rec.invoice_number || 'N/A'}</td>
                            <td className="font-weight-bold text-dark">{rec.patient_name || 'Patient'}</td>
                            <td>{rec.remarks || 'Consultation & Clinical Orders Settlement'}</td>
                            <td>
                              <span className="badge badge-light border font-weight-bold text-primary">
                                {rec.payment_type || 'Cash'}
                              </span>
                            </td>
                            <td className="text-right font-weight-bold text-success">
                              ₦{Number(rec.total_price || 0).toLocaleString()}
                            </td>
                            <td className="text-muted small">
                              {rec.created_date ? new Date(rec.created_date).toLocaleString() : 'Recent'}
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary px-2"
                                onClick={() => setPrintSlip(rec)}
                                title="Print Receipt Slip"
                              >
                                <i className="fas fa-print mr-1"></i> Print
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-5 text-muted">
                            <i className="fas fa-receipt fa-3x text-gray-300 mb-2 d-block"></i>
                            <div>No receipt records found.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. Incomplete Encounters / Services Awaiting Billing */}
            {(activeSubMenu === 'incomplete' || activeSubMenu === 'services') && (
              <div className="card-body p-4 text-center text-muted">
                <i className="fas fa-stethoscope fa-3x text-gray-300 mb-3 d-block"></i>
                <h6 className="font-weight-bold text-gray-700">Clinical Services &amp; Encounters Management</h6>
                <p className="small mb-3">
                  All active unbilled doctor encounters, investigations, and prescriptions are synchronized in the primary{' '}
                  <strong>Encounters Billing</strong> queue.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setActiveSubMenu('encounters')}
                >
                  <i className="fas fa-arrow-left mr-1"></i> Go to Encounters Billing Queue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* COMBINED ENCOUNTER BILL MODAL (Matching User Screenshot 2) */}
      {/* ========================================================= */}
      {isCombinedModalOpen && currentEncounter && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050, backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
            onClick={() => setIsCombinedModalOpen(false)}
          />
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1060 }}
          >
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document" style={{ maxWidth: '1150px' }}>
              <div className="modal-content shadow-2xl border-0" style={{ borderRadius: '8px', overflow: 'hidden' }}>
                {/* Modal Title Banner (Screenshot 2: Bright Blue Title Bar) */}
                <div
                  className="modal-header text-white py-2 px-3 d-flex justify-content-between align-items-center"
                  style={{
                    backgroundColor: '#0284c7',
                    borderBottom: 'none',
                    borderRadius: '0',
                  }}
                >
                  <div className="d-flex align-items-center font-weight-bold" style={{ fontSize: '0.98rem' }}>
                    <i className="fas fa-receipt mr-2"></i>
                    Combined Encounter Bill
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-sm text-white p-0"
                      onClick={() => setIsCombinedModalOpen(false)}
                      title="Minimize"
                    >
                      <i className="fas fa-window-minimize"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm text-white p-0"
                      onClick={() => setIsCombinedModalOpen(false)}
                      title="Close"
                    >
                      <i className="fas fa-times" style={{ fontSize: '1.1rem' }}></i>
                    </button>
                  </div>
                </div>

                {/* Subheader: Patient Info & Signature Button (Screenshot 2) */}
                <div className="p-3 bg-white border-bottom d-flex justify-content-between align-items-start flex-wrap" style={{ gap: '10px' }}>
                  <div>
                    <h5 className="font-weight-bold text-gray-900 mb-1 d-flex align-items-center flex-wrap" style={{ fontSize: '1.05rem', gap: '8px' }}>
                      <span>{currentEncounter.patient_name}</span>
                      <span className="badge badge-light border text-primary font-weight-bold" style={{ fontSize: '0.8rem' }}>
                        Card#: {currentEncounter.hospital_number || 'N/A'}
                      </span>
                      {currentEncounter.phone_number && (
                        <span className="badge badge-light border text-dark font-weight-bold" style={{ fontSize: '0.8rem' }}>
                          <i className="fas fa-phone-alt text-success mr-1"></i>
                          {currentEncounter.phone_number}
                        </span>
                      )}
                    </h5>
                    <div className="small font-weight-bold text-secondary mb-1">
                      Sponsor: <span className="text-dark">{currentEncounter.sponsor || 'Self-Pay / Cash'}</span> | Plan:{' '}
                      <span className="text-dark">{currentEncounter.plan || 'Standard Plan'}</span>
                    </div>
                    <div className="small text-muted d-flex align-items-center flex-wrap" style={{ gap: '15px' }}>
                      <span>
                        <i className="fas fa-calendar-alt text-primary mr-1"></i>
                        {currentEncounter.visit_datetime || `${currentEncounter.visit_time || ''} ${currentEncounter.visit_date}`}
                      </span>
                      <span>
                        <i className="fas fa-user-md text-info mr-1"></i>
                        {currentEncounter.seen_by || 'Dr. Attending Physician'}
                      </span>
                      <span>
                        <i className="fas fa-tag text-warning mr-1"></i>
                        Visit Type: <strong className="text-dark">{currentEncounter.visit_type || 'General'}</strong>
                      </span>
                    </div>
                    <div className="small text-muted mt-1">
                      <span className="font-weight-bold text-dark">Visit Purpose:</span>{' '}
                      {currentEncounter.purpose || 'General Consultation'}
                    </div>
                  </div>

                  <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm text-white font-weight-bold shadow-xs d-inline-flex align-items-center"
                      style={{
                        backgroundColor: '#dc2626',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.82rem',
                      }}
                      onClick={() => setIsSignatureModalOpen(true)}
                    >
                      <i className="fas fa-signature mr-1.5"></i>
                      Signature
                    </button>
                  </div>
                </div>

                {/* Modal Controls Bar (Screenshot 2: Other HMO/Plan, Date*, Currency: ₦) */}
                <div
                  className="px-3 py-2 bg-light border-bottom d-flex align-items-center flex-wrap"
                  style={{ gap: '20px', fontSize: '0.86rem' }}
                >
                  <div className="d-flex align-items-center">
                    <label className="mb-0 font-weight-bold text-gray-800 mr-2">Other HMO/Plan:</label>
                    <select
                      className="form-control form-control-sm"
                      style={{ width: '220px', borderRadius: '4px' }}
                      value={otherHmoPlan}
                      onChange={(e) => setOtherHmoPlan(e.target.value)}
                    >
                      <option value="-None-">-None-</option>
                      {currentEncounter.plan && currentEncounter.plan !== '-None-' && (
                        <option value={currentEncounter.plan}>{currentEncounter.plan}</option>
                      )}
                      {currentEncounter.sponsor && (
                        <option value={currentEncounter.sponsor}>{currentEncounter.sponsor}</option>
                      )}
                      <option value="Self-Pay / Cash">Self-Pay / Cash</option>
                    </select>
                  </div>

                  <div className="d-flex align-items-center">
                    <label className="mb-0 font-weight-bold text-gray-800 mr-2">
                      Date<span className="text-danger">*</span>:
                    </label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      style={{ width: '150px', borderRadius: '4px' }}
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                    />
                  </div>

                  <div className="d-flex align-items-center font-weight-bold text-gray-800">
                    <span className="mr-1.5">Currency:</span>
                    <span className="badge badge-secondary px-2 py-1 font-weight-bold" style={{ fontSize: '0.85rem' }}>
                      {currencySymbol}
                    </span>
                  </div>
                </div>

                {/* Multi-Item Table or Settled Encounter Summary */}
                <div className="modal-body p-0" style={{ maxHeight: 'calc(75vh - 180px)', overflowY: 'auto' }}>
                  {currentEncounter && currentEncounter.consultation_settled && (
                    <div
                      className="alert py-2 px-3 m-3 mb-2 d-flex align-items-center justify-content-between"
                      style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontSize: '0.83rem',
                        borderRadius: '6px',
                      }}
                    >
                      <div className="d-flex align-items-center">
                        <i className="fas fa-check-circle text-success mr-2" style={{ fontSize: '1.1rem' }}></i>
                        <div>
                          <strong>Consultation Fee Settled:</strong> Patient consultation fee (₦{Number(currentEncounter.consultation_settled_amount || 5000).toLocaleString()}) was cleared earlier today.
                          {billItems.length > 0
                            ? ' Only the doctor prescribed drugs, lab tests, and clinical services below require clearance.'
                            : ' No pending doctor orders at this moment.'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success font-weight-bold"
                        style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '4px', whiteSpace: 'nowrap' }}
                        onClick={() => handlePrintDailyReceipt(currentEncounter)}
                      >
                        <i className="fas fa-print mr-1"></i> Print Receipt
                      </button>
                    </div>
                  )}

                  {billItems.length === 0 ? (
                    <div className="p-4 text-center">
                      <div className="mb-3">
                        <span
                          className="d-inline-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: '#ecfdf5',
                            color: '#059669',
                            fontSize: '1.6rem',
                          }}
                        >
                          <i className="fas fa-clipboard-check"></i>
                        </span>
                      </div>
                      <h6 className="font-weight-bold text-gray-900 mb-1">
                        All Current Encounter Bills Cleared
                      </h6>
                      <p className="text-muted small mx-auto" style={{ maxWidth: '520px' }}>
                        Consultation fee and prior charges for <strong>{currentEncounter?.patient_name}</strong> have been settled.
                        The patient is currently with the clinician. Any drugs, laboratory tests, or scans ordered by the doctor will automatically appear here for billing once submitted.
                      </p>

                      {currentEncounter?.settled_invoices_today && currentEncounter.settled_invoices_today.length > 0 && (
                        <div
                          className="text-left mt-3 mx-auto border rounded overflow-hidden shadow-2xs"
                          style={{ maxWidth: '680px', fontSize: '0.82rem' }}
                        >
                          <div className="bg-light px-3 py-2 font-weight-bold border-bottom text-gray-800 d-flex justify-content-between align-items-center">
                            <span>
                              <i className="fas fa-receipt mr-1 text-primary"></i> Payments Settled Today ({currentEncounter.settled_invoices_today.length})
                            </span>
                            <span className="text-success font-weight-bold">
                              Total Cleared: ₦{Number(currentEncounter.total_invoiced_today || 0).toLocaleString()}
                            </span>
                          </div>
                          <table className="table table-sm table-striped mb-0">
                            <thead className="thead-light">
                              <tr>
                                <th>Invoice #</th>
                                <th>Item / Service</th>
                                <th className="text-center">Qty</th>
                                <th className="text-right">Amount</th>
                                <th>Payment Option</th>
                                <th className="text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentEncounter.settled_invoices_today.map((sInv, sIdx) => (
                                <tr key={sInv.id || sIdx}>
                                  <td className="font-weight-bold text-primary">{sInv.invoice_number}</td>
                                  <td>{sInv.service_item}</td>
                                  <td className="text-center">{sInv.quantity}</td>
                                  <td className="text-right font-weight-bold">₦{Number(sInv.total).toLocaleString()}</td>
                                  <td>
                                    <span className="badge badge-light border">{sInv.payment_option || 'Cash'}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge badge-success px-2 py-0.5">
                                      <i className="fas fa-check mr-1"></i> Paid
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="mt-4 d-flex align-items-center justify-content-center" style={{ gap: '12px' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary font-weight-bold shadow-xs px-3"
                          style={{ borderRadius: '6px' }}
                          onClick={handleAddExtraItem}
                        >
                          <i className="fas fa-plus mr-1"></i> Add Extra Billable Item
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success font-weight-bold shadow-xs px-3"
                          style={{ borderRadius: '6px' }}
                          onClick={() => handlePrintDailyReceipt(currentEncounter)}
                        >
                          <i className="fas fa-receipt mr-1"></i> Print Daily Receipt (80mm)
                        </button>
                      </div>
                    </div>
                  ) : (
                  <>
                  <div className="table-responsive mb-0">
                    <table className="table table-bordered table-sm mb-0" style={{ fontSize: '0.84rem' }}>
                      <thead className="thead-light">
                        <tr className="text-gray-800" style={{ fontWeight: 600 }}>
                          <th style={{ minWidth: '220px' }}>Service/Item</th>
                          <th style={{ width: '100px' }}>UOM</th>
                          <th style={{ width: '80px' }} className="text-center">
                            Quantity
                          </th>
                          <th style={{ width: '110px' }} className="text-right">
                            Rate ({currencySymbol})
                          </th>
                          <th style={{ width: '85px' }} className="text-center">
                            Discount %
                          </th>
                          <th style={{ width: '120px' }} className="text-right">
                            Total ({currencySymbol})
                          </th>
                          <th style={{ width: '120px' }}>Payment Option</th>
                          <th style={{ width: '100px' }} className="text-center">
                            Compulsory PA Code?
                          </th>
                          <th style={{ width: '55px' }} className="text-center">
                            <span className="d-block text-xs">Bill?</span>
                            <input
                              type="checkbox"
                              checked={billItems.length > 0 && billItems.every((it) => it.bill)}
                              onChange={(e) => handleToggleAllBill(e.target.checked)}
                            />
                          </th>
                          <th style={{ minWidth: '130px' }}>Amount Paid/PA Code</th>
                          <th style={{ width: '40px' }} className="text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {billItems.map((item, idx) => (
                          <tr
                            key={item.temp_id || idx}
                            style={{ backgroundColor: item.bill ? '#ffffff' : '#f8fafc' }}
                          >
                            {/* Service / Item */}
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm border-0 font-weight-bold"
                                value={item.service_item}
                                placeholder="Service / Drug / Test name..."
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'service_item', e.target.value)}
                              />
                            </td>

                            {/* UOM */}
                            <td>
                              <select
                                className="form-control form-control-sm border-0"
                                value={item.uom || 'Each'}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'uom', e.target.value)}
                              >
                                <option value="Each">Each</option>
                                <option value="Bottles">Bottles</option>
                                <option value="Tablets">Tablets</option>
                                <option value="Capsules">Capsules</option>
                                <option value="Sachets">Sachets</option>
                                <option value="Tests">Tests</option>
                                <option value="Scans">Scans</option>
                                <option value="Sessions">Sessions</option>
                              </select>
                            </td>

                            {/* Quantity */}
                            <td>
                              <input
                                type="number"
                                min="1"
                                className="form-control form-control-sm text-center"
                                value={item.quantity}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'quantity', e.target.value)}
                              />
                            </td>

                            {/* Rate */}
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control form-control-sm text-right font-weight-bold"
                                value={item.rate}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'rate', e.target.value)}
                              />
                            </td>

                            {/* Discount % */}
                            <td>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="form-control form-control-sm text-center"
                                value={item.discount}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'discount', e.target.value)}
                              />
                            </td>

                            {/* Total Amount (Auto-Calculated) */}
                            <td className="text-right align-middle font-weight-bold text-gray-900 pr-2">
                              {Number(item.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Payment Option */}
                            <td>
                              <select
                                className="form-control form-control-sm"
                                value={item.payment_option}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'payment_option', e.target.value)}
                              >
                                <option value="Claim">Claim</option>
                                <option value="Cash">Cash</option>
                                <option value="Transfer">Transfer</option>
                                <option value="POS">POS</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Bank Deposit">Bank Deposit</option>
                                <option value="Staff Salary">Staff Salary</option>
                                <option value="Capitation">Capitation</option>
                              </select>
                            </td>

                            {/* Compulsory PA Code? */}
                            <td className="text-center align-middle">
                              <input
                                type="checkbox"
                                checked={item.compulsory_pa_code}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'compulsory_pa_code', e.target.checked)}
                              />
                            </td>

                            {/* Bill? checkbox */}
                            <td className="text-center align-middle">
                              <input
                                type="checkbox"
                                checked={item.bill}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'bill', e.target.checked)}
                              />
                            </td>

                            {/* Amount Paid / PA Code */}
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={item.payment_option === 'Claim' ? 'Auth Code' : 'Amount / Ref'}
                                value={item.pa_code}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'pa_code', e.target.value)}
                              />
                            </td>

                            {/* Remove row button */}
                            <td className="text-center align-middle">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0 font-weight-bold"
                                onClick={() => handleRemoveItem(item.temp_id)}
                                title="Remove item"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button */}
                  <div className="p-2 bg-light border-top d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary font-weight-bold shadow-xs"
                      onClick={handleAddExtraItem}
                    >
                      <i className="fas fa-plus mr-1"></i> Add Service / Item
                    </button>
                    <span className="small text-muted">
                      Showing {billItems.length} item(s) &bull; {billedItemsOnly.length} selected for billing
                    </span>
                  </div>
                  </>
                  )}
                </div>

                {/* Modal Footer (Summary & Generate Invoice Button) */}
                <div
                  className="modal-footer py-2.5 px-4 bg-white border-top d-flex justify-content-between align-items-center flex-wrap"
                  style={{ gap: '15px' }}
                >
                  {/* Financial Summary */}
                  <div className="d-flex align-items-center flex-wrap" style={{ gap: '20px' }}>
                    <div>
                      <span className="text-muted small d-block">Gross Amount:</span>
                      <strong className="text-gray-900" style={{ fontSize: '0.94rem' }}>
                        ₦{grossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {discountTotal > 0 && (
                      <div>
                        <span className="text-muted small d-block">Discount:</span>
                        <strong className="text-danger" style={{ fontSize: '0.94rem' }}>
                          -₦{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}

                    <div className="pl-3 border-left">
                      <span className="text-muted small d-block">Net Total Payable:</span>
                      <strong className="text-success h5 mb-0 font-weight-bold">
                        ₦{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-light border px-3"
                      style={{ borderRadius: '6px', fontWeight: 600 }}
                      onClick={() => setIsCombinedModalOpen(false)}
                      disabled={generatingBill}
                    >
                      Cancel
                    </button>

                    {billItems.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-outline-primary px-3 shadow-xs font-weight-bold"
                        style={{ borderRadius: '6px' }}
                        onClick={() => handleGenerateInvoice(false, false)}
                        disabled={generatingBill || billedItemsOnly.length === 0}
                      >
                        {generatingBill ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-file-invoice mr-1"></i>}
                        Generate Invoice Only
                      </button>
                    )}

                    {billItems.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-success px-4 shadow-sm font-weight-bold"
                        style={{
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          border: 'none',
                        }}
                        onClick={() => handleGenerateInvoice(true, true)}
                        disabled={generatingBill || billedItemsOnly.length === 0}
                        title="Mark bill as paid, issue official receipt, and print 80mm thermal receipt immediately"
                      >
                        {generatingBill ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1.5"></i> Clearing Bill...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check-circle mr-1.5"></i> Pay &amp; Clear Bill (Print Receipt)
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-success px-4 shadow-sm font-weight-bold"
                        style={{
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          border: 'none',
                        }}
                        onClick={() => handlePrintDailyReceipt(currentEncounter)}
                      >
                        <i className="fas fa-receipt mr-1.5"></i> Print Daily Receipt (80mm)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* SIGNATURE MODAL */}
      {/* ========================================================= */}
      {isSignatureModalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1070, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setIsSignatureModalOpen(false)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1080 }}>
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <div className="modal-content shadow-lg border-0" style={{ borderRadius: '8px' }}>
                <div className="modal-header bg-danger text-white py-2 px-3">
                  <h6 className="modal-title font-weight-bold mb-0">
                    <i className="fas fa-signature mr-2"></i> Authorized Officer Signature
                  </h6>
                  <button type="button" className="close text-white" onClick={() => setIsSignatureModalOpen(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <div className="modal-body p-3">
                  <div className="form-group mb-2">
                    <label className="small font-weight-bold text-muted">Officer Full Name / ID:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                    />
                  </div>
                  <div
                    className="border rounded p-3 text-center bg-light"
                    style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span className="font-italic text-primary font-weight-bold" style={{ fontSize: '1.2rem', fontFamily: 'cursive' }}>
                      {signatureName || 'Signature'}
                    </span>
                  </div>
                  <div className="text-xs text-muted mt-2 text-center">
                    Authorized electronically on {new Date().toLocaleDateString()}
                  </div>
                </div>
                <div className="modal-footer py-2 px-3 bg-light">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger btn-block font-weight-bold"
                    onClick={() => {
                      setIsSignatureModalOpen(false);
                      setFeedback({ type: 'success', text: `Authorized signature applied for ${signatureName}.` });
                    }}
                  >
                    Apply Signature
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* MANUAL INVOICE MODAL */}
      {/* ========================================================= */}
      {isManualInvoiceModalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1050 }}
            onClick={() => setIsManualInvoiceModalOpen(false)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0" style={{ borderRadius: '8px' }}>
                <div className="modal-header bg-primary text-white py-2 px-3">
                  <h6 className="modal-title font-weight-bold mb-0">
                    <i className="fas fa-plus-circle mr-2"></i> Create Direct Invoice
                  </h6>
                  <button type="button" className="close text-white" onClick={() => setIsManualInvoiceModalOpen(false)}>
                    <span>&times;</span>
                  </button>
                </div>
                <form onSubmit={handleCreateManualInvoice}>
                  <div className="modal-body p-3">
                    <div className="form-group mb-2">
                      <label className="small font-weight-bold text-muted">Select Patient:</label>
                      <select
                        className="form-control form-control-sm"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                        required
                      >
                        <option value="">-- Choose Patient --</option>
                        {patientsList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.surname} {p.first_name} ({p.hospital_number || 'No Hosp#'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group mb-2">
                      <label className="small font-weight-bold text-muted">Service / Product Name:</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        required
                        placeholder="e.g. Consultation Fee, Ward Consumables..."
                        value={manualInvoice.product}
                        onChange={(e) => setManualInvoice({ ...manualInvoice, product: e.target.value })}
                      />
                    </div>

                    <div className="row">
                      <div className="col-6">
                        <div className="form-group mb-2">
                          <label className="small font-weight-bold text-muted">Quantity:</label>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm"
                            value={manualInvoice.qty}
                            onChange={(e) => setManualInvoice({ ...manualInvoice, qty: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-group mb-2">
                          <label className="small font-weight-bold text-muted">Unit Price (₦):</label>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            required
                            placeholder="0"
                            value={manualInvoice.price}
                            onChange={(e) => setManualInvoice({ ...manualInvoice, price: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group mb-2">
                      <label className="small font-weight-bold text-muted">Payment Option:</label>
                      <select
                        className="form-control form-control-sm"
                        value={manualInvoice.payment_option}
                        onChange={(e) => setManualInvoice({ ...manualInvoice, payment_option: e.target.value })}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Claim">Claim (HMO)</option>
                        <option value="Transfer">Bank Transfer</option>
                        <option value="POS">POS Terminal</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer py-2 px-3 bg-light">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setIsManualInvoiceModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary font-weight-bold">
                      Create Invoice
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* PRINT SLIP / RECEIPT MODAL */}
      {/* ========================================================= */}
      {printSlip && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1070 }} onClick={() => setPrintSlip(null)} />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1080 }}>
            <div className="modal-dialog modal-dialog-centered my-2" style={{ maxWidth: '410px', maxHeight: '92vh' }}>
              <div className="modal-content shadow-lg border-0" style={{ borderRadius: '8px', background: '#ffffff', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="modal-body p-3.5" id="printable-bill-slip" style={{ fontFamily: 'inherit', fontSize: '0.82rem', overflowY: 'auto', flex: '1 1 auto' }}>
                  {/* Thermal Slip Header */}
                  <div className="text-center pb-2 mb-2" style={{ borderBottom: '1px dashed #94a3b8' }}>
                    <div className="font-weight-bold text-dark" style={{ fontSize: '1.05rem', letterSpacing: '0.02em' }}>
                      CLINIC365 HEALTHCARE
                    </div>
                    <div className="font-weight-bold text-secondary small">ISALU HOSPITALS LIMITED</div>
                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>Billing &amp; Revenue Services</div>
                    <div className="font-weight-bold text-dark mt-2 text-uppercase" style={{ fontSize: '0.88rem', letterSpacing: '0.04em' }}>
                      {printSlip.receipt_number ? 'OFFICIAL PAYMENT RECEIPT' : 'ENCOUNTER INVOICE BILL'}
                    </div>
                    <div className="badge badge-light border text-dark font-weight-bold px-2 py-1 mt-1" style={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>
                      NO: {printSlip.receipt_number || printSlip.invoice_number || 'INV-OFFICIAL'}
                    </div>
                  </div>

                  {/* Patient & Metadata */}
                  <div className="mb-2 pb-2 small" style={{ borderBottom: '1px dashed #cbd5e1', fontSize: '0.78rem', lineHeight: 1.4 }}>
                    <div className="d-flex justify-content-between mb-0.5">
                      <span className="text-muted">Patient:</span>
                      <strong className="text-dark text-right">
                        {printSlip.patient_name || (printSlip.patient ? `Patient #${printSlip.patient}` : 'Patient')}
                      </strong>
                    </div>
                    {printSlip.hospital_number && (
                      <div className="d-flex justify-content-between mb-0.5">
                        <span className="text-muted">Card / Hosp#:</span>
                        <strong className="text-dark text-right">{printSlip.hospital_number}</strong>
                      </div>
                    )}
                    <div className="d-flex justify-content-between mb-0.5">
                      <span className="text-muted">Date:</span>
                      <span className="text-dark text-right">
                        {printSlip.created_date ? new Date(printSlip.created_date).toLocaleString() : new Date().toLocaleString()}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Sponsor:</span>
                      <span className="text-dark text-right font-weight-bold text-truncate ml-2" style={{ maxWidth: '220px' }}>
                        {printSlip.sponsor || 'Self-Pay / Cash'}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <table className="table table-sm table-borderless mb-2 small" style={{ fontSize: '0.78rem' }}>
                    <thead style={{ borderTop: '1px dashed #94a3b8', borderBottom: '1px dashed #94a3b8' }}>
                      <tr>
                        <th className="py-1 px-0 text-left">Description</th>
                        <th className="py-1 px-1 text-center" style={{ width: '40px' }}>Qty</th>
                        <th className="py-1 px-0 text-right" style={{ width: '85px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printSlip.items && printSlip.items.length > 0 ? (
                        printSlip.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px dashed #e2e8f0' }}>
                            <td className="py-1.5 px-0 font-weight-bold text-dark">{it.service_item}</td>
                            <td className="py-1.5 px-1 text-center align-top">{it.quantity}</td>
                            <td className="py-1.5 px-0 text-right font-weight-bold text-dark align-top">₦{Number(it.total).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                          <td className="py-1.5 px-0 font-weight-bold text-dark">{printSlip.product || printSlip.remarks || 'Clinical Service / Consultation'}</td>
                          <td className="py-1.5 px-1 text-center align-top">{printSlip.qty || 1}</td>
                          <td className="py-1.5 px-0 text-right font-weight-bold text-dark align-top">
                            ₦{(Number(printSlip.price || printSlip.total_price || 0) * Number(printSlip.qty || 1)).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Total Row */}
                  <div
                    className="d-flex justify-content-between align-items-center py-2 px-1 mb-2 font-weight-bold"
                    style={{ borderTop: '1px solid #0f172a', borderBottom: '2px solid #0f172a', fontSize: '0.92rem' }}
                  >
                    <span>TOTAL (NGN):</span>
                    <span className="text-dark">
                      ₦{Number(printSlip.total_price || (Number(printSlip.price || 0) * Number(printSlip.qty || 1))).toLocaleString()}
                    </span>
                  </div>

                  {/* Payment Details */}
                  <div className="small mb-2 px-1" style={{ fontSize: '0.76rem' }}>
                    <div>Payment Option: <strong>{printSlip.payment_option || printSlip.payment_type || 'Cash'}</strong></div>
                    <div>Status: <strong>{printSlip.receipt_number ? 'PAID & SETTLED' : 'BILLED / UNPAID'}</strong></div>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-2 small text-muted" style={{ borderTop: '1px dashed #cbd5e1', fontSize: '0.72rem' }}>
                    <div className="font-weight-bold text-dark">*** THANK YOU ***</div>
                    <div>Wish You Quick Recovery &amp; Good Health</div>
                    <div className="text-xs text-muted mt-0.5">80mm POS Thermal Receipt Standard</div>
                  </div>
                </div>

                <div className="modal-footer bg-light py-2 px-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPrintSlip(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm font-weight-bold shadow-xs d-inline-flex align-items-center"
                    style={{ gap: '6px' }}
                    onClick={handlePrintSlip}
                  >
                    <i className="fas fa-print"></i>
                    <span>Print Receipt (80mm Thermal)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
