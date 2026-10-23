import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

export default function BillingsView({ onOpenNewPatient, currentUser, initialSubMenu = 'encounters' }) {
  // Normalize route subTab aliases (e.g. 'unprocessed' -> 'encounters', 'invoices' -> 'payments')
  const normalizeSubMenu = (menu) => {
    if (!menu) return 'encounters';
    if (menu === 'unprocessed' || menu === 'encounters') return 'encounters';
    if (menu === 'invoices' || menu === 'payments') return 'payments';
    return menu;
  };

  // Dynamic logged-in user extraction
  const getLoggedInUser = () => {
    if (currentUser) return currentUser;
    try {
      const raw = localStorage.getItem('clinic365_user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing clinic365_user:', e);
    }
    return null;
  };

  const getLoggedInStaffName = () => {
    const u = getLoggedInUser();
    if (u) {
      const full = (u.fullname || `${u.first_name || ''} ${u.last_name || ''}`).trim();
      if (full) return full;
      if (u.username) return u.username;
    }
    return 'Cashier / Billing Desk';
  };

  const getLoggedInStaffId = () => {
    const u = getLoggedInUser();
    return u?.id || null;
  };

  // Navigation Sidebar sub-menu matching Screenshot 1
  // 'encounters' | 'incomplete' | 'complete' | 'services' | 'outstanding' | 'payments'
  const [activeSubMenu, setActiveSubMenu] = useState(() => normalizeSubMenu(initialSubMenu));

  // Sync with initialSubMenu when deep linked or navigated from outside
  useEffect(() => {
    if (initialSubMenu) {
      setActiveSubMenu(normalizeSubMenu(initialSubMenu));
    }
  }, [initialSubMenu]);

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

  // Helper: Extract YYYY-MM-DD from invoice date
  const getInvoiceDateStr = (dateVal) => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return String(dateVal).slice(0, 10);
    }
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
  const [invoiceDateFilter, setInvoiceDateFilter] = useState('today'); // 'today' | 'all' | 'range' | 'YYYY-MM-DD'
  const [invoiceStartDate, setInvoiceStartDate] = useState(() => getTodayStr());
  const [invoiceEndDate, setInvoiceEndDate] = useState(() => getTodayStr());
  const [sponsorFilter, setSponsorFilter] = useState('');
  const [sponsorsList, setSponsorsList] = useState([]);

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

  // Dedicated Invoice & Claims Form Document Preview State
  const [previewPrivateInvoice, setPreviewPrivateInvoice] = useState(null);
  const [previewHmoClaim, setPreviewHmoClaim] = useState(null);

  // Bill Creation Confirmation & Success Alert Modal State
  const [showConfirmCreateBillModal, setShowConfirmCreateBillModal] = useState(false);
  const [billSuccessData, setBillSuccessData] = useState(null);
  const [validationAlert, setValidationAlert] = useState(null);

  // Issue Receipt Modal & Workstation State
  const [isIssueReceiptModalOpen, setIsIssueReceiptModalOpen] = useState(false);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState(null);
  const [receiptPaymentType, setReceiptPaymentType] = useState('Cash');
  const [receiptRemarks, setReceiptRemarks] = useState('');
  const [receiptAmountPaid, setReceiptAmountPaid] = useState('');
  const [receiptReferenceCode, setReceiptReferenceCode] = useState('');
  const [issuingReceipt, setIssuingReceipt] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('today'); // 'today' | 'all' | 'YYYY-MM-DD'

  // Pay Confirmation Modal State
  const [payConfirmGroup, setPayConfirmGroup] = useState(null);
  const [payConfirmMethod, setPayConfirmMethod] = useState('Cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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
      const [invRes, recRes, patRes, spRes] = await Promise.all([
        api.getInvoices({ page_size: 150 }),
        api.getReceipts({ page_size: 150 }),
        api.getPatients({ active: 1, page_size: 200 }),
        typeof api.getSponsors === 'function' ? api.getSponsors().catch(() => []) : Promise.resolve([])
      ]);
      setInvoices(invRes.results || invRes || []);
      setReceipts(recRes.results || recRes || []);
      setPatientsList(patRes.results || patRes || []);
      setSponsorsList(spRes?.results || spRes || []);
    } catch (err) {
      console.error('Error fetching billing records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Comprehensive unique sponsors list for filtering
  const availableSponsors = useMemo(() => {
    const names = new Set();
    names.add('PAY FROM PURSE / CASH');

    if (Array.isArray(sponsorsList)) {
      sponsorsList.forEach((sp) => {
        const n = typeof sp === 'string' ? sp : (sp.name || sp.sponsor_name);
        if (n && n.trim()) names.add(n.trim());
      });
    }

    if (Array.isArray(invoices)) {
      invoices.forEach((inv) => {
        if (inv.sponsor && inv.sponsor.trim()) names.add(inv.sponsor.trim());
      });
    }

    if (Array.isArray(encounterQueue)) {
      encounterQueue.forEach((enc) => {
        if (enc.sponsor && enc.sponsor.trim()) names.add(enc.sponsor.trim());
      });
    }

    return Array.from(names).filter(Boolean).sort((a, b) => {
      if (a === 'PAY FROM PURSE / CASH') return -1;
      if (b === 'PAY FROM PURSE / CASH') return 1;
      return a.localeCompare(b);
    });
  }, [sponsorsList, invoices, encounterQueue]);

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

    const isEncHmo = enc.is_hmo === true || (enc.category && String(enc.category?.category || enc.category?.name || enc.category).toLowerCase().includes('hmo')) || false;

    // Clone billable items so user can edit them safely
    const clonedItems = (enc.billable_items || []).map((it, idx) => {
      const isPurseItem = Boolean(
        it.is_pay_from_purse ||
        (it.payment_option && it.payment_option.toLowerCase() !== 'claim') ||
        (typeof it.service_item === 'string' && (
          it.service_item.toLowerCase().includes('pay from your purse') ||
          it.service_item.toLowerCase().includes('pay from purse')
        ))
      );
      return {
        ...it,
        temp_id: it.id || `item_${idx}_${Date.now()}`,
        quantity: Number(it.quantity || 1),
        rate: Number(it.rate || 0),
        discount: Number(it.discount || 0),
        total: Number(it.total || 0),
        payment_option: isPurseItem ? (it.payment_option && it.payment_option !== 'Claim' ? it.payment_option : 'Cash') : (isEncHmo ? (it.payment_option || 'Claim') : 'Cash'),
        is_pay_from_purse: isPurseItem,
        compulsory_pa_code: Boolean(it.compulsory_pa_code),
        bill: it.bill !== false,
        pa_code: it.pa_code || '',
      };
    });

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
    const isEncHmo = currentEncounter?.is_hmo === true || (currentEncounter?.category && String(currentEncounter.category?.category || currentEncounter.category?.name || currentEncounter.category).toLowerCase().includes('hmo')) || false;
    const newItem = {
      temp_id: `custom_${Date.now()}`,
      service_item: '',
      uom: 'Each',
      quantity: 1,
      rate: 0,
      discount: 0,
      total: 0,
      payment_option: isEncHmo ? 'Claim' : 'Cash',
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
  // Check if Current Encounter is HMO Sponsor vs Private Sponsor
  // ==========================================
  const isHmoEncounter = useMemo(() => {
    if (!currentEncounter) return false;
    // 1. Explicit boolean flag from backend
    if (typeof currentEncounter.is_hmo === 'boolean') {
      return currentEncounter.is_hmo;
    }
    // 2. Category check
    let cat = '';
    if (currentEncounter.category) {
      if (typeof currentEncounter.category === 'string') cat = currentEncounter.category;
      else if (typeof currentEncounter.category === 'object' && currentEncounter.category.category) cat = String(currentEncounter.category.category);
      else if (typeof currentEncounter.category === 'object' && currentEncounter.category.name) cat = String(currentEncounter.category.name);
      else cat = String(currentEncounter.category);
    }
    cat = cat.toLowerCase();
    if (cat.includes('hmo')) return true;
    if (cat.includes('private')) return false;

    // 3. Sponsor name check
    let sponsor = '';
    if (currentEncounter.sponsor) {
      if (typeof currentEncounter.sponsor === 'string') sponsor = currentEncounter.sponsor;
      else if (typeof currentEncounter.sponsor === 'object' && currentEncounter.sponsor.name) sponsor = String(currentEncounter.sponsor.name);
      else sponsor = String(currentEncounter.sponsor);
    }
    sponsor = sponsor.toLowerCase();
    if (sponsor.includes('private') || sponsor.includes('self-pay') || sponsor.includes('cash')) {
      return false;
    }
    const plan = String(currentEncounter.plan?.plan || currentEncounter.plan || '').toLowerCase();
    if (plan.includes('private')) {
      return false;
    }
    if (sponsor.includes('hmo') || sponsor.includes('insurance') || sponsor.includes('nhis')) {
      return true;
    }
    return false;
  }, [currentEncounter]);

  const claimBilledItems = useMemo(
    () => billedItemsOnly.filter((it) => (it.payment_option || '').toLowerCase() === 'claim'),
    [billedItemsOnly]
  );
  const purseBilledItems = useMemo(
    () => billedItemsOnly.filter((it) => (it.payment_option || '').toLowerCase() !== 'claim'),
    [billedItemsOnly]
  );
  const claimBilledTotal = useMemo(
    () => claimBilledItems.reduce((sum, it) => sum + Number(it.total || 0), 0),
    [claimBilledItems]
  );
  const purseBilledTotal = useMemo(
    () => purseBilledItems.reduce((sum, it) => sum + Number(it.total || 0), 0),
    [purseBilledItems]
  );
  const isSplitBilling = useMemo(
    () => isHmoEncounter && claimBilledItems.length > 0 && purseBilledItems.length > 0,
    [isHmoEncounter, claimBilledItems, purseBilledItems]
  );

  // ==========================================
  // Group Pending Private Invoices for Receipt Issuance
  // Merged per patient for a particular day with date filtering
  // ==========================================
  const groupedPendingInvoices = useMemo(() => {
    const map = new Map();
    const todayStr = getTodayStr();

    for (const inv of invoices) {
      if (inv.completed) continue;
      // Skip HMO claims (claims are submitted to HMO, not receipted at patient cashier)
      const isClaim = Boolean(
        inv.payment_option === 'Claim' ||
        (inv.invoice_number && inv.invoice_number.startsWith('CLM-')) ||
        (inv.is_hmo && !inv.invoice_number?.startsWith('INV-'))
      );
      if (isClaim) {
        continue;
      }

      const itemDateStr = getInvoiceDateStr(inv.created_date) || todayStr;

      // Filter by receiptDateFilter
      if (receiptDateFilter === 'today' && itemDateStr !== todayStr) {
        continue;
      }
      if (receiptDateFilter !== 'today' && receiptDateFilter !== 'all' && itemDateStr !== receiptDateFilter) {
        continue;
      }

      // Group key: One consolidated receipt entry per patient for that particular day
      const patientId = inv.patient || (inv.patient_name ? inv.patient_name.trim().toLowerCase() : `pat_${inv.id}`);
      const groupKey = `${patientId}_${itemDateStr}`;

      const encMatch = encounterQueue.find((e) => e.patient_id === inv.patient || (inv.hospital_number && e.hospital_number === inv.hospital_number));

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: inv.id,
          group_key: groupKey,
          invoice_number: inv.invoice_number || `INV-${inv.id}`,
          primary_invoice_number: inv.invoice_number || `INV-${inv.id}`,
          invoice_numbers_set: new Set(),
          patient: inv.patient,
          patient_name: inv.patient_name || encMatch?.patient_name || (inv.patient ? `Patient #${inv.patient}` : 'Patient'),
          hospital_number: inv.hospital_number || encMatch?.hospital_number || 'N/A',
          sponsor: inv.sponsor || encMatch?.sponsor || 'Self-Pay / Cash',
          plan: inv.plan || encMatch?.plan || 'Standard Plan',
          policy_number: inv.policy_number || 'NIL',
          enrollee_number: inv.enrollee_number || 'NIL',
          address: inv.address || encMatch?.address || 'OGBA',
          phone_number: inv.phone_number || encMatch?.phone_number || 'N/A',
          gender: inv.gender || encMatch?.gender || 'N/A',
          category: inv.category_name || (typeof inv.category === 'object' ? inv.category?.category : inv.category) || 'Private',
          date_str: itemDateStr,
          created_date: inv.created_date,
          payment_option: inv.payment_option || 'Cash',
          payment_options_set: new Set(),
          staff_name: inv.staff_name || '',
          items: [],
          total_price: 0,
        });
      }

      const entry = map.get(groupKey);
      if (inv.invoice_number) {
        entry.invoice_numbers_set.add(inv.invoice_number);
        if (!entry.primary_invoice_number) entry.primary_invoice_number = inv.invoice_number;
      }
      if (inv.payment_option) {
        entry.payment_options_set.add(inv.payment_option);
      }
      if (inv.sponsor && inv.sponsor !== 'Self-Pay / Cash') {
        entry.sponsor = inv.sponsor;
      }
      if (inv.hospital_number && inv.hospital_number !== 'N/A') {
        entry.hospital_number = inv.hospital_number;
      }
      if (inv.staff_name) {
        entry.staff_name = inv.staff_name;
      }

      entry.items.push(inv);
      const lineTotal = Number(inv.price || 0);
      entry.total_price += lineTotal;
    }

    return Array.from(map.values()).map((grp) => {
      const invList = Array.from(grp.invoice_numbers_set);
      const payList = Array.from(grp.payment_options_set);
      return {
        ...grp,
        invoice_number: invList.length > 0 ? invList[0] : grp.invoice_number,
        primary_invoice_number: invList.length > 0 ? invList[0] : grp.invoice_number,
        invoice_numbers_list: invList.length > 0 ? invList : [grp.invoice_number],
        payment_option: payList.length > 0 ? payList.join(', ') : (grp.payment_option || 'Cash'),
      };
    }).sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [invoices, encounterQueue, receiptDateFilter]);

  // Filtered grouped pending invoices by search query
  const filteredGroupedPendingInvoices = useMemo(() => {
    if (!receiptSearchQuery.trim()) return groupedPendingInvoices;
    const q = receiptSearchQuery.toLowerCase();
    return groupedPendingInvoices.filter((inv) =>
      inv.invoice_numbers_list?.some((n) => n.toLowerCase().includes(q)) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.patient_name && inv.patient_name.toLowerCase().includes(q)) ||
      (inv.hospital_number && inv.hospital_number.toLowerCase().includes(q)) ||
      (inv.sponsor && inv.sponsor.toLowerCase().includes(q)) ||
      inv.items.some((it) => it.product && it.product.toLowerCase().includes(q))
    );
  }, [groupedPendingInvoices, receiptSearchQuery]);

  // ==========================================
  // Create Bill:
  // - For HMO category sponsor: Creates Claims!
  // - For Private category sponsor: Creates Invoice!
  // ==========================================
  // Trigger Bill Creation: opens professional confirmation alert modal
  const handleCreateBill = () => {
    if (billedItemsOnly.length === 0) {
      setValidationAlert('Please check at least one item to bill before creating the bill.');
      return;
    }
    setShowConfirmCreateBillModal(true);
  };

  // Confirmed: Execute bill creation and present success alert modal
  const handleProceedCreateBill = async () => {
    if (generatingBill) return; // Prevent double submission!

    const enc = currentEncounter;
    if (!enc) {
      setShowConfirmCreateBillModal(false);
      setIsCombinedModalOpen(false);
      return;
    }

    const isHmo = isHmoEncounter;
    const itemsToBill = billItems.filter((it) => it.bill === true);
    if (itemsToBill.length === 0) {
      setValidationAlert('No items selected to bill. Please check at least one item using the "Bill?" checkbox.');
      return;
    }
    const totalPayable = itemsToBill.reduce((sum, it) => sum + Number(it.total || 0), 0);

    try {
      setGeneratingBill(true);
      // Immediately close both the confirmation modal and the encounter modal
      // so the user experiences an instant, clean modal dismissal!
      setShowConfirmCreateBillModal(false);
      setIsCombinedModalOpen(false);

      const payload = {
        patient_id: enc.patient_id,
        staff_id: getLoggedInStaffId(),
        staff_name: getLoggedInStaffName(),
        other_hmo_plan: otherHmoPlan,
        bill_date: billDate,
        bill_type: isHmo ? 'claim' : 'invoice',
        mark_as_paid: false,
        items: itemsToBill.map((it) => ({
          service_item: it.service_item,
          uom: it.uom,
          quantity: it.quantity,
          rate: it.rate,
          discount: it.discount,
          total: it.total,
          payment_option: it.payment_option || (isHmo ? 'Claim' : 'Cash'),
          pa_code: it.pa_code,
          original_model: it.original_model,
          original_id: it.original_id,
        })),
      };

      const res = await api.generateEncounterBill(payload);

      // Safely extract response data
      const hasSplit = Boolean(res?.has_split);
      const claimNumber = res?.claim_number;
      const patientInvoiceNumber = res?.invoice_number;
      const primaryNumber = res?.primary_number || claimNumber || patientInvoiceNumber || `INV-${enc.patient_id}`;
      const billNumber = res?.bill_number || primaryNumber.replace('INV-', '').replace('CLM-', '') || `411${Date.now().toString().slice(-4)}`;
      const patientData = res?.patient_data || {};

      const purposesStr = Array.isArray(enc.purposes)
        ? enc.purposes.join(', ')
        : (enc.purpose || 'General Consultation');

      // Separate items for preview
      const claimItems = hasSplit
        ? itemsToBill.filter((it) => (it.payment_option || '').toLowerCase() === 'claim')
        : (isHmo ? itemsToBill : []);
      const outOfPocketItems = hasSplit
        ? itemsToBill.filter((it) => (it.payment_option || '').toLowerCase() !== 'claim')
        : (isHmo ? [] : itemsToBill);

      const claimPreviewData = (isHmo || hasSplit) && claimNumber ? {
        invoice_number: claimNumber,
        session_number: patientData.session_number || billNumber || `280${Date.now().toString().slice(-4)}`,
        patient_name: patientData.name || enc.patient_name || 'Patient',
        hospital_number: patientData.hospital_number || enc.hospital_number || 'N/A',
        sponsor: patientData.sponsor || enc.sponsor || 'HMO Sponsor',
        plan: patientData.plan || enc.plan || 'Standard',
        policy_number: patientData.policy_number || enc.policy_number || 'NIL',
        phone: patientData.phone || enc.phone_number || 'N/A',
        gender: patientData.gender || enc.gender || 'N/A',
        age: patientData.age || enc.age || '',
        address: patientData.address || enc.address || '46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria',
        bill_date: billDate,
        purpose: purposesStr,
        pa_code: claimItems.find((it) => it.pa_code)?.pa_code || 'NIL',
        items: claimItems.length > 0 ? claimItems : itemsToBill,
        total_amount: res?.claim_total || totalPayable,
      } : null;

      const invoicePreviewData = (!isHmo || hasSplit) && patientInvoiceNumber ? {
        invoice_number: patientInvoiceNumber,
        bill_number: patientInvoiceNumber.replace('INV-', '') || billNumber,
        patient_name: patientData.name || enc.patient_name || 'Patient',
        hospital_number: patientData.hospital_number || enc.hospital_number || 'N/A',
        sponsor: 'PAY FROM PURSE / CASH',
        plan: 'OUT-OF-POCKET TARIFF',
        policy_number: 'NIL',
        enrollee_number: 'NIL',
        address: patientData.address || enc.address || 'OGBA',
        phone: patientData.phone || enc.phone_number || 'N/A',
        gender: patientData.gender || enc.gender || 'N/A',
        created_datetime: res?.created_datetime || new Date().toLocaleString(),
        staff_name: res?.staff_name || getLoggedInStaffName(),
        items: outOfPocketItems.length > 0 ? outOfPocketItems : itemsToBill,
        total_amount: res?.inv_total || totalPayable,
        previous_balance: Number(res?.previous_balance || 0),
        latest_balance: Number(res?.latest_balance || totalPayable || 0),
      } : null;

      // Display Professional Success Alert Modal immediately
      setBillSuccessData({
        has_split: hasSplit,
        claim_number: claimNumber,
        claim_items_count: res?.claim_items_count || claimItems.length,
        claim_total: res?.claim_total || (hasSplit ? 0 : totalPayable),
        invoice_number: patientInvoiceNumber,
        inv_items_count: res?.inv_items_count || outOfPocketItems.length,
        inv_total: res?.inv_total || (hasSplit ? 0 : totalPayable),
        patient_name: enc.patient_name || patientData.name || 'Patient',
        hospital_number: enc.hospital_number || patientData.hospital_number || 'N/A',
        sponsor: enc.sponsor || patientData.sponsor || 'Self-Pay / Cash',
        plan: enc.plan || patientData.plan || 'Standard',
        is_hmo: isHmo,
        total_amount: totalPayable,
        items_count: itemsToBill.length,
        message: res?.message || `${isHmo ? 'HMO Claim' : 'Invoice'} #${primaryNumber} successfully created for ${enc.patient_name || 'Patient'}!`,
        claim_preview_data: claimPreviewData,
        invoice_preview_data: invoicePreviewData,
        preview_data: claimPreviewData || invoicePreviewData,
      });

      setFeedback({
        type: 'success',
        text: res?.message || `${isHmo ? 'Claim' : 'Invoice'} #${invoiceNumber} successfully created for ${enc.patient_name || 'Patient'}!`,
      });

      // Refresh billing queue and invoice records in background
      try {
        await Promise.all([loadEncounterQueue(), loadBillingsRecords()]);
      } catch (refreshErr) {
        console.warn('Background refresh error:', refreshErr);
      }
    } catch (err) {
      console.error('Error creating bill:', err);
      // Ensure modals are closed and show clear popup warning alert
      setShowConfirmCreateBillModal(false);
      setIsCombinedModalOpen(false);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Unknown server error';
      setValidationAlert(`Failed to generate bill: ${errMsg}`);
      setFeedback({
        type: 'danger',
        text: `Error creating bill: ${errMsg}`,
      });
    } finally {
      setGeneratingBill(false);
    }
  };

  const handleGenerateInvoice = handleCreateBill;

  // Open Issue Receipt Modal for any invoice group
  const handleOpenReceiptModal = (invoiceGroup) => {
    setSelectedInvoiceForReceipt(invoiceGroup);
    setReceiptAmountPaid(invoiceGroup.total_price);
    setReceiptPaymentType(invoiceGroup.payment_option || 'Cash');
    const invLabel = invoiceGroup.invoice_numbers_list && invoiceGroup.invoice_numbers_list.length > 1
      ? invoiceGroup.invoice_numbers_list.join(', ')
      : (invoiceGroup.primary_invoice_number || invoiceGroup.invoice_number);
    setReceiptRemarks(`Settlement for ${invoiceGroup.items?.length || 1} item(s) on ${invLabel}`);
    setReceiptReferenceCode('');
    setIsIssueReceiptModalOpen(true);
  };

  // Confirm Receipt Issuance & Print 80mm Slip
  const handleConfirmIssueReceipt = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedInvoiceForReceipt) return;

    try {
      setIssuingReceipt(true);
      const invNumbers = selectedInvoiceForReceipt.invoice_numbers_list && selectedInvoiceForReceipt.invoice_numbers_list.length > 0
        ? selectedInvoiceForReceipt.invoice_numbers_list
        : [selectedInvoiceForReceipt.invoice_number];

      const payload = {
        invoice_number: selectedInvoiceForReceipt.primary_invoice_number || selectedInvoiceForReceipt.invoice_number,
        invoice_numbers: invNumbers,
        payment_type: receiptPaymentType,
        remarks: receiptRemarks || `Settlement for Invoice ${selectedInvoiceForReceipt.invoice_number}${receiptReferenceCode ? ` (Ref: ${receiptReferenceCode})` : ''}`,
        amount_paid: receiptAmountPaid ? Number(receiptAmountPaid) : selectedInvoiceForReceipt.total_price,
        staff_id: getLoggedInStaffId(),
        staff_name: getLoggedInStaffName(),
      };

      const res = await api.issueReceipt(payload);

      setIsIssueReceiptModalOpen(false);

      setFeedback({
        type: 'success',
        text: res.message || `Official Receipt #${res.receipt_number} successfully issued for Invoice #${res.invoice_number}!`,
      });

      // Automatically trigger 80mm thermal receipt printing
      setPrintSlip({
        receipt_number: res.receipt_number,
        invoice_number: res.invoice_number,
        patient_name: selectedInvoiceForReceipt.patient_name,
        hospital_number: selectedInvoiceForReceipt.hospital_number,
        sponsor: selectedInvoiceForReceipt.sponsor,
        items: selectedInvoiceForReceipt.items || [],
        total_price: res.total_amount || selectedInvoiceForReceipt.total_price,
        created_date: new Date(),
        payment_option: receiptPaymentType,
        staff_name: getLoggedInStaffName(),
      });

      // Refresh billing queue and invoice records
      await Promise.all([loadEncounterQueue(), loadBillingsRecords()]);
    } catch (err) {
      console.error('Error issuing receipt:', err);
      setFeedback({
        type: 'danger',
        text: 'Error issuing receipt: ' + (err.response?.data?.error || err.response?.data?.detail || err.message),
      });
    } finally {
      setIssuingReceipt(false);
    }
  };

  // ==========================================
  // Helper: Number To English Words
  // ==========================================
  const numberToWords = (num) => {
    if (num === null || num === undefined || isNaN(num)) return 'zero';
    const n = Math.floor(Math.abs(Number(num)));
    if (n === 0) return 'zero';

    const a = [
      '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
      'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
      'seventeen', 'eighteen', 'nineteen'
    ];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (val) => {
      if (val < 20) return a[val];
      if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? '-' + a[val % 10] : '');
      if (val < 1000) {
        return a[Math.floor(val / 100)] + ' hundred' + (val % 100 !== 0 ? ' and ' + inWords(val % 100) : '');
      }
      if (val < 1000000) {
        return inWords(Math.floor(val / 1000)) + ' thousand' + (val % 1000 !== 0 ? ' ' + inWords(val % 1000) : '');
      }
      if (val < 1000000000) {
        return inWords(Math.floor(val / 1000000)) + ' million' + (val % 1000000 !== 0 ? ' ' + inWords(val % 1000000) : '');
      }
      return inWords(Math.floor(val / 1000000000)) + ' billion' + (val % 1000000000 !== 0 ? ' ' + inWords(val % 1000000000) : '');
    };

    const words = inWords(n);
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  // ==========================================
  // Print Private Sponsor Official Invoice (A4 Standard)
  // ==========================================
  const handlePrintPrivateInvoice = (invData) => {
    if (!invData) return;

    const items = invData.items || [];
    let itemsRows = '';
    let subtotalDiscount = 0;
    let subtotalAmount = 0;

    items.forEach((it, idx) => {
      const qty = Number(it.quantity || it.qty || 1);
      const rate = Number(it.rate !== undefined ? it.rate : (qty > 0 ? (it.total || it.price) / qty : (it.price || 0)));
      const disc = Number(it.discount || 0);
      const discAmount = (rate * qty * disc) / 100;
      const amount = Number(it.total !== undefined ? it.total : (rate * qty - discAmount));
      subtotalDiscount += discAmount;
      subtotalAmount += amount;

      itemsRows += `
        <tr>
          <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 11px;">${idx + 1}</td>
          <td style="border: 1px solid #000; padding: 5px 8px; font-size: 11px; text-align: left; text-transform: uppercase;">
            ${it.service_item || it.product || 'Clinical Service'}
          </td>
          <td style="border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 11px;">${qty}</td>
          <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-size: 11px;">${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-size: 11px;">${discAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-size: 11px;">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    const totalBillAmount = Number(invData.total_amount || subtotalAmount);
    const netBillAmount = totalBillAmount;
    const totalSponsorAmount = totalBillAmount;
    const amountToBeReceived = totalBillAmount;

    const billNumber = invData.bill_number || (invData.invoice_number ? invData.invoice_number.replace('INV-', '') : '4119237');
    const dateStr = invData.created_datetime || new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const patientName = invData.patient_name || 'PATIENT';
    const hospitalNumber = invData.hospital_number || 'N/A';
    const sponsorName = invData.sponsor || 'ISALU HOSPITALS PRIVATE';
    const planName = invData.plan || 'PRIVATE PRICELIST';
    const policyNum = invData.policy_number || 'NIL';
    const enrolleeNum = invData.enrollee_number || 'NIL';
    const address = invData.address || 'OGBA';
    const phone = invData.phone || '09032344706';
    const gender = invData.gender || 'F';
    const staffName = invData.staff_name || getLoggedInStaffName();

    const amountWords = numberToWords(netBillAmount);

    const prevBalance = Number(invData.previous_balance || 0);
    const latestBalance = Number(invData.latest_balance || (prevBalance + netBillAmount));

    // Remove any leftover iframe
    const oldIframe = document.getElementById('clinic365_invoice_print_frame');
    if (oldIframe && document.body.contains(oldIframe)) {
      document.body.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'clinic365_invoice_print_frame';
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
          <title>Invoice - ${patientName} - ${billNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 16mm 15mm 16mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11.5px;
              line-height: 1.35;
            }
            .invoice-sheet {
              width: 100%;
              max-width: 780px;
              margin: 0 auto;
            }
            table {
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          <div class="invoice-sheet">
            <!-- Hospital Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px;">
              <div style="text-align: left;">
                <div style="font-size: 13.5px; font-weight: 700; letter-spacing: 0.02em;">ISALU HOSPITALS LIMITED</div>
                <div style="font-size: 11px; margin-top: 3px;">46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria</div>
                <div style="font-size: 11px;">Email: it@isaluhospitals.com | Phone: 08032435674</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 13px; font-weight: 700;">BILL #: ${billNumber}</div>
                <div style="font-size: 11px; margin-top: 3px;">${dateStr}</div>
              </div>
            </div>

            <!-- Patient Information Box -->
            <div style="border: 1px solid #000; display: flex; margin-bottom: 18px;">
              <div style="width: 58%; padding: 8px 12px; border-right: 1px solid #000; font-size: 11px; line-height: 1.55;">
                <div style="font-weight: 700; margin-bottom: 2px;">PATIENT INFORMATION:</div>
                <div>Name: <strong style="text-transform: uppercase;">${patientName} [ ${hospitalNumber} ]</strong></div>
                <div>Sponsor: <strong>${sponsorName}</strong></div>
                <div>Plan Type: <strong>${planName}</strong></div>
                <div>Policy Number: <strong>${policyNum}</strong></div>
                <div>Enrollee No.: <strong>${enrolleeNum}</strong></div>
              </div>
              <div style="width: 42%; padding: 8px 12px; font-size: 11px; line-height: 1.55;">
                <div>Address: <strong>${address}</strong></div>
                <div>Phone: <strong>${phone}</strong></div>
                <div>Gender: <strong>${gender}</strong></div>
              </div>
            </div>

            <!-- Document Title -->
            <div style="text-align: center; margin: 12px 0 14px 0;">
              <span style="font-size: 13px; font-weight: 700; text-decoration: underline; letter-spacing: 0.05em;">INVOICE</span>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border: 1px solid #000; margin-bottom: 14px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #000; padding: 6px; width: 38px; text-align: center; font-size: 11px; font-weight: 700;">S/N</th>
                  <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 700;">Description</th>
                  <th style="border: 1px solid #000; padding: 6px; width: 68px; text-align: center; font-size: 11px; font-weight: 700;">Quantity</th>
                  <th style="border: 1px solid #000; padding: 6px 8px; width: 90px; text-align: right; font-size: 11px; font-weight: 700;">Rate (N)</th>
                  <th style="border: 1px solid #000; padding: 6px 8px; width: 95px; text-align: right; font-size: 11px; font-weight: 700;">Discount (N)</th>
                  <th style="border: 1px solid #000; padding: 6px 8px; width: 95px; text-align: right; font-size: 11px; font-weight: 700;">Amount (N)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
                <!-- Subtotals Row -->
                <tr>
                  <td colspan="4" style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 700; font-size: 11px;">${subtotalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: right; font-weight: 700; font-size: 11px;">${subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <!-- Summary Totals Rows -->
                <tr>
                  <td colspan="5" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total Bill Amount</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${totalBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="5" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Net Bill Amount</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${netBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="5" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total Sponsor Amount</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${totalSponsorAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td colspan="5" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Amount To Be Received</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${amountToBeReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Amount In Words -->
            <div style="font-size: 11px; margin-top: 10px; margin-bottom: 20px;">
              TOTAL BILL AMOUNT IN WORDS: <strong style="text-decoration: underline;">${amountWords} Naira only.</strong>
            </div>

            <!-- Balances Block -->
            <div style="text-align: center; font-size: 11px; margin-top: 25px; margin-bottom: 40px; line-height: 1.6;">
              <div>Settled Payments: <strong>0.00</strong> &nbsp;|&nbsp; Running Balance: <strong>${netBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div>Previous Balance: <strong>${prevBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> &nbsp;|&nbsp; Latest Balance: <strong>${latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            </div>

            <!-- Signatures Row -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 45px; padding: 0 5px;">
              <div style="text-align: left;">
                <div style="margin-bottom: 5px;">............................................</div>
                <div style="font-size: 11px;">Client Signature</div>
              </div>
              <div style="text-align: left;">
                <div style="margin-bottom: 5px;">............................................</div>
                <div style="font-size: 11px;">Issued By: <strong>${staffName}</strong></div>
              </div>
            </div>

            <!-- Bottom Footer Reference -->
            <div style="margin-top: 45px; font-size: 9.5px; color: #4b5563;">
              ${patientName} [ ${hospitalNumber} ] - Bill #: ${billNumber}
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
      } catch (err) {
        console.error('Printing error:', err);
      }
    }, 350);
  };

  // ==========================================
  // Print HMO Claims Form (claimHmo A4 Standard)
  // ==========================================
  const handlePrintHmoClaim = (claimData) => {
    if (!claimData) return;

    const items = claimData.items || [];
    const servicesItems = [];
    const drugsItems = [];
    const investigationItems = [];

    let servicesTotal = 0;
    let drugsTotal = 0;
    let investigationsTotal = 0;
    let consultationTotal = 0;
    let registrationTotal = 0;

    items.forEach((it) => {
      const rawDesc = (it.service_item || it.product || '').trim();
      const qty = Number(it.quantity || it.qty || 1);
      const rate = Number(it.rate !== undefined ? it.rate : (qty > 0 ? (it.total || it.price) / qty : (it.price || 0)));
      const disc = Number(it.discount || 0);
      const lineTotal = Number(it.total !== undefined ? it.total : (rate * qty * (1 - disc / 100)));

      const lowerDesc = String(rawDesc || '').toLowerCase();
      const cat = String(it.category?.category || it.category?.name || it.category || '').toLowerCase();

      if (lowerDesc.includes('consultation')) {
        consultationTotal += lineTotal;
      }
      if (lowerDesc.includes('registration')) {
        registrationTotal += lineTotal;
      }

      const claimDesc = rawDesc.endsWith('(Claim)') ? rawDesc : `${rawDesc} (Claim)`;

      const isInvestigation = cat === 'investigation' || cat === 'lab' || cat === 'radiology' ||
        lowerDesc.startsWith('lab:') || lowerDesc.includes('lab:') || lowerDesc.includes('scan') ||
        lowerDesc.includes('test') || lowerDesc.includes('screening') || lowerDesc.includes('count') ||
        lowerDesc.includes('urine') || lowerDesc.includes('x-ray') || lowerDesc.includes('mcs') ||
        lowerDesc.includes('protein') || lowerDesc.includes('hbsag') || lowerDesc.includes('widal') ||
        lowerDesc.includes('malaria');

      const isDrug = !isInvestigation && (cat === 'prescription' || cat === 'drug' || cat === 'pharmacy' ||
        lowerDesc.includes('tablet') || lowerDesc.includes('capsule') || lowerDesc.includes('syrup') ||
        lowerDesc.includes('suspension') || lowerDesc.includes('injection') || lowerDesc.includes('coartem') ||
        lowerDesc.includes('artemether') || lowerDesc.includes('amlodipine') || lowerDesc.includes('amoxicillin') ||
        lowerDesc.includes('paracetamol') || lowerDesc.includes('antibiotic') || lowerDesc.includes('mg') ||
        lowerDesc.includes('ml') || lowerDesc.includes('cap') || lowerDesc.includes('tab'));

      if (isInvestigation) {
        investigationItems.push({ desc: claimDesc, qty, rate, total: lineTotal });
        investigationsTotal += lineTotal;
      } else if (isDrug) {
        drugsItems.push({ desc: claimDesc, qty, rate, total: lineTotal });
        drugsTotal += lineTotal;
      } else {
        servicesItems.push({ desc: claimDesc, qty, rate, total: lineTotal });
        servicesTotal += lineTotal;
      }
    });

    const grandTotal = Number(claimData.total_amount || (servicesTotal + drugsTotal + investigationsTotal));

    const patientName = claimData.patient_name || 'PATIENT';
    const sponsorName = (claimData.sponsor && !claimData.sponsor.toLowerCase().includes('self-pay') && !claimData.sponsor.toLowerCase().includes('cash'))
      ? claimData.sponsor
      : (claimData.plan && !claimData.plan.toLowerCase().includes('standard') ? claimData.plan : 'HMO Sponsor');
    const phone = claimData.phone || '09032344706';
    const age = claimData.age || '36';
    const sessionNumber = claimData.session_number || (claimData.invoice_number ? claimData.invoice_number.replace('CLM-', '') : '2802466');
    const billDate = claimData.bill_date ? new Date(claimData.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const purpose = claimData.purpose || 'General Consultation';
    const paCode = claimData.pa_code || 'NIL';

    const renderRows = (arr) => arr.map((it) => `
      <tr>
        <td style="border: 1px solid #000; padding: 4px 8px; font-size: 10.5px; text-align: left;"><strong>${it.desc}</strong></td>
        <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-size: 10.5px; width: 70px;">${it.qty}</td>
        <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-size: 10.5px; width: 100px;">${it.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-size: 10.5px; width: 100px;">${it.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const oldIframe = document.getElementById('clinic365_claim_print_frame');
    if (oldIframe && document.body.contains(oldIframe)) {
      document.body.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'clinic365_claim_print_frame';
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
          <title>Claims Form - ${patientName} - ${sessionNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 16mm 12mm 16mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            .claim-sheet {
              width: 100%;
              max-width: 780px;
              margin: 0 auto;
            }
            table {
              border-collapse: collapse;
            }
          </style>
        </head>
        <body>
          <div class="claim-sheet">
            <!-- Top Session -->
            <div style="margin-bottom: 12px; font-size: 11px;">
              <div style="font-weight: 700; text-transform: uppercase;">
                ${patientName} [ ${hospitalNumber} ] - SESSION #: ${sessionNumber}
              </div>
            </div>

            <!-- Centered HMO Header -->
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;">${sponsorName}</div>
              <div style="font-size: 11px; margin-top: 1px;">Elephant House, 214 Broad St, Lagos Island, Lagos</div>
              <div style="margin-top: 8px;">
                <span style="font-size: 12.5px; font-weight: 700; text-decoration: underline; letter-spacing: 0.04em;">CLAIMS FORM</span>
              </div>
            </div>

            <!-- Provider & Patient Box -->
            <div style="border: 1px solid #000; padding: 7px 10px; margin-bottom: 8px; font-size: 10.5px; line-height: 1.55;">
              <div>Name Of Provider: <strong>ISALU HOSPITALS LIMITED</strong> &nbsp;&nbsp; Phone no: <strong>08032435674</strong></div>
              <div>Address of provider: <strong>46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria</strong></div>
              <div>Name Of Patient: <strong>${patientName} [ ${hospitalNumber} ]</strong></div>
              <div>Id No: <strong>${policyNum}</strong> &nbsp;&nbsp; Hospital No: <strong>${hospitalNumber}</strong> &nbsp;&nbsp; Age: <strong>${age || '36'}</strong> &nbsp;&nbsp; Member's Phone No: <strong>${phone}</strong></div>
              <div>Date Of Attendance: <strong>${billDate}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Date Of Admission: &nbsp;&nbsp;&nbsp;&nbsp; Date Of Discharge:</div>
            </div>

            <!-- Diagnosis / Clinical Summary Box -->
            <div style="border: 1px solid #000; padding: 7px 10px; margin-bottom: 12px; font-size: 10.5px; line-height: 1.55;">
              <div>Diagnosis / Clinical Summary : <strong>${purpose}</strong></div>
              <div>PA code: <strong>${paCode}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Admission Code:</div>
            </div>

            <!-- Details of Treatment Header -->
            <div style="text-align: center; margin: 12px 0 10px 0;">
              <span style="font-size: 12px; font-weight: 700; text-decoration: underline; letter-spacing: 0.04em;">DETAILS OF TREATMENT</span>
            </div>

            <!-- 1. Services / Procedure -->
            <div style="font-weight: 700; font-size: 11px; margin-bottom: 3px;">Services/Procedure:</div>
            <table style="width: 100%; border: 1px solid #000; margin-bottom: 12px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #000; padding: 4px 8px; text-align: left; font-size: 11px; font-weight: 700;">Description</th>
                  <th style="border: 1px solid #000; padding: 4px 6px; width: 70px; text-align: center; font-size: 11px; font-weight: 700;">Quantity</th>
                  <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Unit Price</th>
                  <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${servicesItems.length > 0 ? renderRows(servicesItems) : '<tr><td colspan="4" style="border: 1px solid #000; padding: 4px 8px; text-align: center; font-style: italic;">No specific procedures</td></tr>'}
                <tr>
                  <td colspan="3" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${servicesTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- 2. Drugs -->
            <div style="font-weight: 700; font-size: 11px; margin-top: 6px; margin-bottom: 3px;">Drugs:</div>
            ${drugsItems.length > 0 ? `
              <table style="width: 100%; border: 1px solid #000; margin-bottom: 12px;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="border: 1px solid #000; padding: 4px 8px; text-align: left; font-size: 11px; font-weight: 700;">Description</th>
                    <th style="border: 1px solid #000; padding: 4px 6px; width: 70px; text-align: center; font-size: 11px; font-weight: 700;">Quantity</th>
                    <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Unit Price</th>
                    <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderRows(drugsItems)}
                  <tr>
                    <td colspan="3" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total</td>
                    <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${drugsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            ` : '<div style="margin-bottom: 10px; font-size: 10.5px; color: #444; font-style: italic;">No drugs prescribed</div>'}

            <!-- 3. Investigations -->
            <div style="font-weight: 700; font-size: 11px; margin-top: 6px; margin-bottom: 3px;">Investigations:</div>
            <table style="width: 100%; border: 1px solid #000; margin-bottom: 14px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="border: 1px solid #000; padding: 4px 8px; text-align: left; font-size: 11px; font-weight: 700;">Description</th>
                  <th style="border: 1px solid #000; padding: 4px 6px; width: 70px; text-align: center; font-size: 11px; font-weight: 700;">Quantity</th>
                  <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Unit Price (₦)</th>
                  <th style="border: 1px solid #000; padding: 4px 8px; width: 100px; text-align: right; font-size: 11px; font-weight: 700;">Total (₦)</th>
                </tr>
              </thead>
              <tbody>
                ${investigationItems.length > 0 ? renderRows(investigationItems) : '<tr><td colspan="4" style="border: 1px solid #000; padding: 4px 8px; text-align: center; font-style: italic;">No investigations ordered</td></tr>'}
                <tr>
                  <td colspan="3" style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">Total</td>
                  <td style="border: 1px solid #000; padding: 4px 8px; text-align: right; font-weight: 700; font-size: 11px;">${investigationsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Bottom Summary -->
            <div style="font-size: 11px; margin-top: 10px; line-height: 1.55;">
              <div>CONSULTATION: <strong>₦${consultationTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div>REGISTRATION: <strong>₦${registrationTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
              <div style="font-size: 13px; font-weight: 800; margin-top: 4px;">
                Total (N): <strong>₦${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>

            <!-- Enrollee Signature & Date -->
            <div style="margin-top: 30px; font-size: 10.5px;">
              <div style="margin-bottom: 2px;">${billDate}</div>
              <div>Enrollee signature and date: _____________________________________</div>
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
      } catch (err) {
        console.error('Printing error:', err);
      }
    }, 350);
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
      const total = Number(printSlip.total_price || printSlip.price || 0);
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

    const grandTotal = Number(printSlip.total_price || printSlip.price || 0).toLocaleString();

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
              <div style="font-size: 8.5px; margin-top: 1px;">46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria</div>
              <div style="font-size: 8.5px;">Tel: 08032435674</div>
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
              <div class="sign-line">${printSlip.staff_name || getLoggedInStaffName()}</div>
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
        staff: getLoggedInStaffId(),
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

  // Helper: check if invoice or group is HMO vs Private
  const isHmoRecord = (rec) => {
    if (!rec) return false;
    // An invoice number starting with INV- is strictly a patient invoice (self-pay/purse), not an HMO claim
    if (rec.invoice_number && String(rec.invoice_number).startsWith('INV-')) return false;
    if (rec.primary_invoice_number && String(rec.primary_invoice_number).startsWith('INV-')) return false;

    const payOpt = String(rec.payment_option || '').toLowerCase();
    if (payOpt.includes('claim') || payOpt.includes('hmo')) return true;
    if (rec.invoice_number && String(rec.invoice_number).startsWith('CLM-')) return true;
    if (rec.invoice_numbers_list && rec.invoice_numbers_list.some((n) => String(n).startsWith('CLM-'))) return true;

    // Safely extract category string (can be string, object {category, name}, or id)
    let catStr = '';
    if (rec.category) {
      if (typeof rec.category === 'string') catStr = rec.category;
      else if (typeof rec.category === 'object' && rec.category.category) catStr = String(rec.category.category);
      else if (typeof rec.category === 'object' && rec.category.name) catStr = String(rec.category.name);
      else catStr = String(rec.category);
    }
    catStr = catStr.toLowerCase();
    if (catStr.includes('hmo')) return true;
    if (catStr.includes('private')) return false;

    // Safely extract sponsor string (can be string or object {name})
    let sponsorStr = '';
    if (rec.sponsor) {
      if (typeof rec.sponsor === 'string') sponsorStr = rec.sponsor;
      else if (typeof rec.sponsor === 'object' && rec.sponsor.name) sponsorStr = String(rec.sponsor.name);
      else sponsorStr = String(rec.sponsor);
    }
    sponsorStr = sponsorStr.toLowerCase();
    if (sponsorStr.includes('private') || sponsorStr.includes('self-pay') || sponsorStr.includes('cash')) return false;
    if (sponsorStr.includes('hmo') || sponsorStr.includes('insurance') || sponsorStr.includes('nhis')) return true;
    return false;
  };

  // Mark an entire consolidated invoice group as paid
  const handleMarkGroupAsPaid = async (grp, selectedPaymentMethod = null) => {
    try {
      setIsProcessingPayment(true);
      const pendingItems = grp.items.filter((it) => !it.completed);
      if (pendingItems.length === 0) {
        setPayConfirmGroup(null);
        return;
      }

      const invNumbers = grp.invoice_numbers_list && grp.invoice_numbers_list.length > 0
        ? grp.invoice_numbers_list
        : [grp.invoice_number];

      const paymentType = selectedPaymentMethod || grp.payment_option || 'Cash';

      try {
        await api.issueReceipt({
          invoice_numbers: invNumbers,
          invoice_number: grp.invoice_number,
          payment_type: paymentType,
          remarks: `Payment settlement for ${pendingItems.length} item(s) on ${grp.date_str}`,
          amount_paid: grp.total_amount,
          staff_id: getLoggedInStaffId(),
        });
      } catch (issueErr) {
        // Fallback: update individual invoice items
        await Promise.all(pendingItems.map((it) => api.updateInvoice(it.id, { completed: 1 })));
        await api.createReceipt({
          patient: grp.patient,
          invoice_number: grp.invoice_number,
          total_price: grp.total_amount,
          payment_type: paymentType,
          remarks: `Payment settlement for ${grp.patient_name}`,
          staff: getLoggedInStaffId(),
        });
      }

      setFeedback({
        type: 'success',
        text: `Payment of ₦${grp.total_amount.toLocaleString()} recorded successfully for ${grp.patient_name} (Invoice ${grp.invoice_number})!`,
      });
      setPayConfirmGroup(null);
      loadBillingsRecords();
    } catch (err) {
      setFeedback({
        type: 'danger',
        text: 'Error recording payment: ' + (err.response?.data?.detail || err.message),
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Mark invoice as paid (legacy fallback)
  const handleMarkAsPaid = async (inv) => {
    try {
      await api.updateInvoice(inv.id, { completed: 1 });
      const totalAmount = Number(inv.price || 0);
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

  // Grouped Invoices (Merged for same patient for same date)
  const groupedInvoices = useMemo(() => {
    const map = new Map();
    const todayStr = getTodayStr();

    for (const inv of invoices) {
      const itemDateStr = getInvoiceDateStr(inv.created_date) || todayStr;

      // Date filtering
      if (invoiceDateFilter === 'today' && itemDateStr !== todayStr) {
        continue;
      }
      if (invoiceDateFilter === 'range') {
        if (invoiceStartDate && itemDateStr < invoiceStartDate) continue;
        if (invoiceEndDate && itemDateStr > invoiceEndDate) continue;
      } else if (invoiceDateFilter !== 'today' && invoiceDateFilter !== 'all' && itemDateStr !== invoiceDateFilter) {
        continue;
      }

      // Group key: One consolidated invoice row per patient for the day, separated by document type (claim vs invoice)
      const isDocClaim = Boolean(
        (inv.invoice_number && inv.invoice_number.startsWith('CLM-')) ||
        (inv.payment_option && inv.payment_option.toLowerCase() === 'claim')
      );
      const docType = isDocClaim ? 'claim' : 'invoice';
      const patientId = inv.patient || (inv.patient_name ? inv.patient_name.trim().toLowerCase() : `pat_${inv.id}`);
      const groupKey = `${patientId}_${itemDateStr}_${docType}`;

      const qty = Number(inv.qty || 1);
      const lineTotal = Number(inv.price || 0);
      const discount = Number(inv.discount || 0);
      const discountFactor = 1 - discount / 100;
      const unitRate = (qty > 0 && discountFactor > 0)
        ? (lineTotal / (qty * discountFactor))
        : (qty > 0 ? (lineTotal / qty) : lineTotal);

      const encMatch = encounterQueue.find((e) => e.patient_id === inv.patient || (inv.hospital_number && e.hospital_number === inv.hospital_number));
      const isInvHmo = isDocClaim;
      const patientSponsor = isDocClaim
        ? ((inv.sponsor && !inv.sponsor.toLowerCase().includes('self-pay') && !inv.sponsor.toLowerCase().includes('cash'))
            ? inv.sponsor
            : (encMatch?.sponsor || 'HMO Sponsor'))
        : (inv.sponsor || 'PAY FROM PURSE / CASH');
      const patientPlan = isDocClaim
        ? (inv.plan || encMatch?.plan || 'HMO Plan')
        : 'OUT-OF-POCKET TARIFF';
      const patientPolicy = inv.policy_number || encMatch?.policy_number || 'NIL';
      const patientPhone = inv.phone_number || encMatch?.phone_number || 'N/A';
      const patientAge = inv.age || encMatch?.age || '36';
      const patientGender = inv.gender || encMatch?.gender || 'N/A';
      const patientAddress = inv.address || encMatch?.address || 'OGBA';

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          id: inv.id,
          group_key: groupKey,
          is_doc_claim: isDocClaim,
          doc_type: docType,
          patient: inv.patient,
          patient_name: inv.patient_name || encMatch?.patient_name || (inv.patient ? `Patient #${inv.patient}` : 'Patient'),
          hospital_number: inv.hospital_number || encMatch?.hospital_number || 'N/A',
          sponsor: patientSponsor,
          category: isDocClaim ? (encMatch?.category || 'HMO') : 'Private (Pay from purse)',
          plan: patientPlan,
          policy_number: patientPolicy,
          enrollee_number: inv.enrollee_number || patientPolicy,
          address: patientAddress,
          phone_number: patientPhone,
          gender: patientGender,
          age: patientAge,
          pa_code: inv.pa_code || 'NIL',
          date_str: itemDateStr,
          created_date: inv.created_date,
          staff_name: inv.staff_name || '',
          primary_invoice_number: inv.invoice_number || `INV-${inv.id}`,
          invoice_numbers_set: new Set(),
          payment_options_set: new Set(),
          items: [],
          total_amount: 0,
          total_qty: 0,
          completed_count: 0,
          pending_count: 0,
        });
      }

      const grp = map.get(groupKey);
      if (inv.staff_name) {
        grp.staff_name = inv.staff_name;
      }
      if (isDocClaim && inv.sponsor && inv.sponsor !== 'Self-Pay / Cash') {
        grp.sponsor = inv.sponsor;
      }
      if (inv.plan && inv.plan !== 'Standard Plan') {
        grp.plan = inv.plan;
      }
      if (inv.policy_number && inv.policy_number !== 'NIL') {
        grp.policy_number = inv.policy_number;
      }
      if (inv.invoice_number) {
        grp.invoice_numbers_set.add(inv.invoice_number);
        if (!grp.primary_invoice_number) {
          grp.primary_invoice_number = inv.invoice_number;
        }
      }
      if (inv.payment_option) {
        grp.payment_options_set.add(inv.payment_option);
      }

      if (inv.completed) {
        grp.completed_count += 1;
      } else {
        grp.pending_count += 1;
      }

      grp.items.push({
        ...inv,
        qty,
        rate: unitRate,
        price: unitRate,
        discount,
        lineTotal,
      });

      grp.total_amount += lineTotal;
      grp.total_qty += qty;
    }

    return Array.from(map.values()).map((grp) => {
      const invNumbersList = Array.from(grp.invoice_numbers_set);
      const paymentOptsList = Array.from(grp.payment_options_set);
      const isCompleted = grp.pending_count === 0 && grp.items.length > 0;
      const isPartial = grp.completed_count > 0 && grp.pending_count > 0;

      return {
        ...grp,
        invoice_number: grp.primary_invoice_number,
        invoice_numbers_list: invNumbersList.length > 0 ? invNumbersList : [grp.primary_invoice_number],
        payment_option: paymentOptsList.length > 0 ? paymentOptsList.join(', ') : 'Cash',
        completed: isCompleted,
        is_partial: isPartial,
      };
    }).sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
  }, [invoices, invoiceDateFilter, invoiceStartDate, invoiceEndDate]);

  // Filtered Grouped Invoices by sub-menu, status, sponsor and search
  const filteredGroupedInvoices = useMemo(() => {
    return groupedInvoices.filter((grp) => {
      if (activeSubMenu === 'outstanding') {
        if (invoiceStatusFilter === 'pending' && grp.completed) return false;
        if (invoiceStatusFilter === 'paid' && !grp.completed) return false;
        if (invoiceStatusFilter === 'all' && grp.completed) return false;
      } else if (activeSubMenu === 'complete') {
        if (invoiceStatusFilter === 'pending' && grp.completed) return false;
        if (invoiceStatusFilter === 'paid' && !grp.completed) return false;
      }

      // Sponsor Filter
      if (sponsorFilter && sponsorFilter.trim()) {
        const sf = sponsorFilter.trim().toLowerCase();
        const grpSponsor = (grp.sponsor || '').toLowerCase();
        if (!grpSponsor.includes(sf)) {
          return false;
        }
      }

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchesInvNo = grp.invoice_numbers_list.some((n) => n.toLowerCase().includes(q)) || grp.invoice_number.toLowerCase().includes(q);
      const matchesPatient = grp.patient_name && grp.patient_name.toLowerCase().includes(q);
      const matchesHosp = grp.hospital_number && grp.hospital_number.toLowerCase().includes(q);
      const matchesSponsor = grp.sponsor && grp.sponsor.toLowerCase().includes(q);
      const matchesItems = grp.items.some((it) => it.product && it.product.toLowerCase().includes(q));
      return matchesInvNo || matchesPatient || matchesHosp || matchesSponsor || matchesItems;
    });
  }, [groupedInvoices, activeSubMenu, invoiceStatusFilter, searchQuery, sponsorFilter]);

  // Helpers to test items against active filters for metrics
  const isDateInInvoiceFilter = (dateVal) => {
    if (invoiceDateFilter === 'all') return true;
    const itemDateStr = getInvoiceDateStr(dateVal) || getTodayStr();
    if (invoiceDateFilter === 'today') return itemDateStr === getTodayStr();
    if (invoiceDateFilter === 'range') {
      if (invoiceStartDate && itemDateStr < invoiceStartDate) return false;
      if (invoiceEndDate && itemDateStr > invoiceEndDate) return false;
      return true;
    }
    return itemDateStr === invoiceDateFilter;
  };

  const isSponsorInInvoiceFilter = (sponsorVal) => {
    if (!sponsorFilter || !sponsorFilter.trim()) return true;
    const sf = sponsorFilter.trim().toLowerCase();
    const sp = String(sponsorVal || '').toLowerCase();
    return sp.includes(sf);
  };

  // Dynamic Invoices for Top Metrics based on active Date, Sponsor, and Search filters
  const filteredInvoicesForMetrics = useMemo(() => {
    return invoices.filter((inv) => {
      if (!isDateInInvoiceFilter(inv.created_date)) return false;
      if (!isSponsorInInvoiceFilter(inv.sponsor)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
          (inv.patient_name && inv.patient_name.toLowerCase().includes(q)) ||
          (inv.hospital_number && inv.hospital_number.toLowerCase().includes(q)) ||
          (inv.product && inv.product.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [invoices, invoiceDateFilter, invoiceStartDate, invoiceEndDate, sponsorFilter, searchQuery]);

  const totalInvoiced = useMemo(() => {
    return filteredInvoicesForMetrics.reduce((sum, i) => sum + Number(i.price || 0), 0);
  }, [filteredInvoicesForMetrics]);

  // Dynamic Receipts for Top Metrics based on active Date, Sponsor, and Search filters
  const filteredReceiptsForMetrics = useMemo(() => {
    return receipts.filter((rec) => {
      if (!isDateInInvoiceFilter(rec.created_date)) return false;
      if (!isSponsorInInvoiceFilter(rec.sponsor)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          (rec.receipt_number && rec.receipt_number.toLowerCase().includes(q)) ||
          (rec.invoice_number && rec.invoice_number.toLowerCase().includes(q)) ||
          (rec.patient_name && rec.patient_name.toLowerCase().includes(q)) ||
          (rec.payment_type && rec.payment_type.toLowerCase().includes(q)) ||
          (rec.remarks && rec.remarks.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [receipts, invoiceDateFilter, invoiceStartDate, invoiceEndDate, sponsorFilter, searchQuery]);

  const totalReceipted = useMemo(() => {
    return filteredReceiptsForMetrics.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
  }, [filteredReceiptsForMetrics]);

  // Dynamic Pending Invoices Count and Amount based on active filters
  const { pendingInvoicesCount, pendingInvoicesAmount } = useMemo(() => {
    const pendingGroups = filteredGroupedInvoices.filter((grp) => !grp.completed);
    const amount = pendingGroups.reduce((sum, g) => sum + Number(g.total_amount || 0), 0);
    return {
      pendingInvoicesCount: pendingGroups.length,
      pendingInvoicesAmount: amount,
    };
  }, [filteredGroupedInvoices]);

  // Dynamic Encounters in Queue Count matching Sponsor Filter
  const filteredEncounterQueueCount = useMemo(() => {
    if (!sponsorFilter || !sponsorFilter.trim()) return encounterQueue.length;
    const sf = sponsorFilter.trim().toLowerCase();
    return encounterQueue.filter((enc) => (enc.sponsor || '').toLowerCase().includes(sf)).length;
  }, [encounterQueue, sponsorFilter]);

  // Flat Filtered Invoices (legacy reference)
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

  const filteredReceipts = filteredReceiptsForMetrics;

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
                  {filteredEncounterQueueCount}
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
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }} title={sponsorFilter || 'Active doctor orders'}>
                {sponsorFilter ? sponsorFilter : 'Active doctor orders'}
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
              <span className="small text-muted text-truncate" style={{ fontSize: '0.73rem', whiteSpace: 'nowrap' }} title={`₦${pendingInvoicesAmount.toLocaleString()} awaiting payment`}>
                {pendingInvoicesAmount > 0 ? `₦${pendingInvoicesAmount.toLocaleString()} pending` : 'All bills settled'}
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
                {invoiceDateFilter === 'today' ? "Today's billed" : (invoiceDateFilter === 'all' ? "All generated bills" : (invoiceDateFilter === 'range' ? `${invoiceStartDate || 'Start'} to ${invoiceEndDate || 'End'}` : `${invoiceDateFilter} bills`))}
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
                {invoiceDateFilter === 'today' ? "Today's collections" : (invoiceDateFilter === 'all' ? "Recorded payments" : (invoiceDateFilter === 'range' ? `${invoiceStartDate || 'Start'} to ${invoiceEndDate || 'End'}` : `${invoiceDateFilter} collections`))}
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
                  activeSubMenu === 'issue-receipt' ? 'font-weight-bold' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: activeSubMenu === 'issue-receipt' ? '#f0fdf4' : 'transparent',
                  color: activeSubMenu === 'issue-receipt' ? '#15803d' : '#475569',
                  borderLeft: activeSubMenu === 'issue-receipt' ? '4px solid #16a34a' : '4px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setActiveSubMenu('issue-receipt')}
              >
                <span>
                  <i className={`fas fa-receipt mr-2 ${activeSubMenu === 'issue-receipt' ? 'text-success' : 'text-muted'}`}></i>
                  Issue Receipt
                </span>
                <span
                  className="badge badge-pill font-weight-bold"
                  style={{
                    backgroundColor: activeSubMenu === 'issue-receipt' ? '#16a34a' : (groupedPendingInvoices.length > 0 ? '#dcfce7' : '#f1f5f9'),
                    color: activeSubMenu === 'issue-receipt' ? '#ffffff' : (groupedPendingInvoices.length > 0 ? '#15803d' : '#64748b'),
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                  }}
                >
                  {groupedPendingInvoices.length}
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
                  {activeSubMenu === 'issue-receipt' && 'Issue Payment Receipt (Private & Self-Pay Invoices)'}
                  {activeSubMenu === 'incomplete' && 'Incomplete Encounters'}
                  {activeSubMenu === 'complete' && 'Completed Encounters & Generated Invoices'}
                  {activeSubMenu === 'services' && 'Clinical Services Awaiting Billing'}
                  {activeSubMenu === 'outstanding' && 'Outstanding / Unpaid Invoices'}
                  {activeSubMenu === 'payments' && 'Patient Payments & Settlement Receipts'}
                </span>
                {activeSubMenu === 'issue-receipt' && (
                  <span
                    className="badge px-2.5 py-1 font-weight-bold ml-1"
                    style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '0.74rem', borderRadius: '12px' }}
                  >
                    <i className={`fas ${receiptDateFilter === 'today' ? 'fa-calendar-check' : 'fa-calendar-alt'} mr-1`}></i>
                    {receiptDateFilter === 'today' ? `Today (${filteredGroupedPendingInvoices.length} pending patient receipt${filteredGroupedPendingInvoices.length === 1 ? '' : 's'})` : (receiptDateFilter === 'all' ? `All Dates (${filteredGroupedPendingInvoices.length})` : `${receiptDateFilter} (${filteredGroupedPendingInvoices.length})`)}
                  </span>
                )}
                {activeSubMenu === 'payments' && (
                  <span
                    className="badge px-2.5 py-1 font-weight-bold ml-1"
                    style={{ backgroundColor: '#eff6ff', color: '#0284c7', border: '1px solid #bae6fd', fontSize: '0.74rem', borderRadius: '12px' }}
                  >
                    <i className={`fas ${receiptDateFilter === 'today' ? 'fa-calendar-check' : 'fa-calendar-alt'} mr-1`}></i>
                    {receiptDateFilter === 'today' ? `Today (${filteredReceipts.length} settlement receipt${filteredReceipts.length === 1 ? '' : 's'})` : (receiptDateFilter === 'all' ? `All Dates (${filteredReceipts.length})` : `${receiptDateFilter} (${filteredReceipts.length})`)}
                  </span>
                )}
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
                {(activeSubMenu === 'outstanding' || activeSubMenu === 'complete') && (
                  <span
                    className="badge px-2.5 py-1 font-weight-bold ml-1"
                    style={{
                      backgroundColor: invoiceDateFilter === 'today' ? '#ecfdf5' : '#eff6ff',
                      color: invoiceDateFilter === 'today' ? '#059669' : '#0284c7',
                      border: invoiceDateFilter === 'today' ? '1px solid #a7f3d0' : '1px solid #bae6fd',
                      fontSize: '0.74rem',
                      borderRadius: '12px'
                    }}
                  >
                    <i className={`fas ${invoiceDateFilter === 'today' ? 'fa-calendar-check' : 'fa-calendar-alt'} mr-1`}></i>
                    {invoiceDateFilter === 'today'
                      ? `Today (${filteredGroupedInvoices.length} patient invoice${filteredGroupedInvoices.length === 1 ? '' : 's'})`
                      : (invoiceDateFilter === 'all'
                        ? `All Dates (${filteredGroupedInvoices.length})`
                        : (invoiceDateFilter === 'range'
                          ? `${invoiceStartDate || 'Start'} to ${invoiceEndDate || 'End'} (${filteredGroupedInvoices.length})`
                          : `${invoiceDateFilter} (${filteredGroupedInvoices.length})`))}
                  </span>
                )}
                {sponsorFilter && (
                  <span
                    className="badge badge-light border px-2 py-1 ml-1 text-primary font-weight-bold"
                    style={{ fontSize: '0.72rem', borderRadius: '12px' }}
                  >
                    <i className="fas fa-shield-alt mr-1"></i> Sponsor: {sponsorFilter}
                    <button
                      type="button"
                      className="btn btn-link p-0 ml-1.5 text-danger font-weight-bold"
                      style={{ fontSize: '0.75rem', lineHeight: 1, textDecoration: 'none' }}
                      onClick={() => setSponsorFilter('')}
                      title="Clear Sponsor filter"
                    >
                      &times;
                    </button>
                  </span>
                )}
              </div>

              {activeSubMenu !== 'encounters' && (
                <div className="d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                  {/* Date Filter for Receipts */}
                  {(activeSubMenu === 'issue-receipt' || activeSubMenu === 'payments') && (
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                      <span className="text-muted font-weight-bold mr-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <i className="far fa-calendar-alt text-success mr-1"></i> Date:
                      </span>
                      <div className="btn-group btn-group-sm bg-white border rounded shadow-2xs p-0.5" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${receiptDateFilter === 'today' ? 'btn-success font-weight-bold shadow-xs text-white' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => setReceiptDateFilter('today')}
                        >
                          Today
                        </button>
                        <input
                          type="date"
                          className="form-control form-control-sm border-0 bg-transparent text-secondary"
                          style={{ width: '130px', fontSize: '0.78rem', height: '26px', padding: '0 6px' }}
                          value={receiptDateFilter === 'today' ? getTodayStr() : (receiptDateFilter === 'all' ? '' : receiptDateFilter)}
                          onChange={(e) => setReceiptDateFilter(e.target.value || 'today')}
                          title="Filter receipts by specific date"
                        />
                        <button
                          type="button"
                          className={`btn btn-sm ${receiptDateFilter === 'all' ? 'btn-secondary font-weight-bold' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => setReceiptDateFilter('all')}
                        >
                          All Dates
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date Filter for Invoices (Today | All Dates | From Date to Date) */}
                  {(activeSubMenu === 'outstanding' || activeSubMenu === 'complete') && (
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                      <span className="text-muted font-weight-bold mr-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <i className="far fa-calendar-alt text-primary mr-1"></i> Date:
                      </span>
                      <div className="btn-group btn-group-sm bg-white border rounded shadow-2xs p-0.5" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${invoiceDateFilter === 'today' ? 'btn-primary font-weight-bold shadow-xs' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => {
                            setInvoiceDateFilter('today');
                            setInvoiceStartDate(getTodayStr());
                            setInvoiceEndDate(getTodayStr());
                          }}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${invoiceDateFilter === 'all' ? 'btn-secondary font-weight-bold' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => setInvoiceDateFilter('all')}
                        >
                          All Dates
                        </button>
                      </div>

                      {/* From Date to Date Inputs */}
                      <div className="d-flex align-items-center bg-white border rounded px-2 py-0.5 shadow-2xs" style={{ gap: '4px', borderRadius: '6px' }}>
                        <span className="text-muted font-weight-bold" style={{ fontSize: '0.74rem' }}>From:</span>
                        <input
                          type="date"
                          className="form-control form-control-sm border-0 bg-transparent text-secondary p-0"
                          style={{ width: '122px', fontSize: '0.76rem', height: '24px' }}
                          value={invoiceStartDate}
                          onChange={(e) => {
                            setInvoiceStartDate(e.target.value);
                            setInvoiceDateFilter('range');
                          }}
                          title="Filter from start date"
                        />
                        <span className="text-muted font-weight-bold" style={{ fontSize: '0.74rem' }}>To:</span>
                        <input
                          type="date"
                          className="form-control form-control-sm border-0 bg-transparent text-secondary p-0"
                          style={{ width: '122px', fontSize: '0.76rem', height: '24px' }}
                          value={invoiceEndDate}
                          onChange={(e) => {
                            setInvoiceEndDate(e.target.value);
                            setInvoiceDateFilter('range');
                          }}
                          title="Filter to end date"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sponsor Filter for Invoices */}
                  {(activeSubMenu === 'outstanding' || activeSubMenu === 'complete') && (
                    <div className="d-flex align-items-center bg-white border rounded px-2 py-0.5 shadow-2xs" style={{ gap: '6px', borderRadius: '6px' }}>
                      <span className="text-muted font-weight-bold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <i className="fas fa-shield-alt text-primary mr-1"></i> Sponsor:
                      </span>
                      <select
                        className="form-control form-control-sm border-0 bg-transparent text-secondary font-weight-semibold p-0"
                        style={{ minWidth: '150px', maxWidth: '210px', fontSize: '0.78rem', height: '24px' }}
                        value={sponsorFilter}
                        onChange={(e) => setSponsorFilter(e.target.value)}
                        title="Filter by Sponsor"
                      >
                        <option value="">All Sponsors</option>
                        {availableSponsors.map((sp) => (
                          <option key={sp} value={sp}>
                            {sp}
                          </option>
                        ))}
                      </select>
                      {sponsorFilter && (
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-muted ml-1"
                          onClick={() => setSponsorFilter('')}
                          title="Clear sponsor filter"
                        >
                          <i className="fas fa-times-circle text-danger"></i>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="input-group input-group-sm" style={{ width: '260px' }}>
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

                  {(activeSubMenu === 'outstanding' || activeSubMenu === 'complete') && (
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
                          const cleanedPurposes = Array.from(
                            new Set(
                              (enc.purposes || (enc.purpose ? [enc.purpose] : []))
                                .flatMap((item) => String(item).split(','))
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          );
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
                              <td className="align-middle py-3" style={{ minWidth: '230px', maxWidth: '300px' }}>
                                <div className="d-flex flex-column" style={{ gap: '6px' }}>
                                  {/* List of distinct purposes styled as clinical pills */}
                                  <div className="d-flex flex-wrap align-items-center" style={{ gap: '4px' }}>
                                    {cleanedPurposes.length > 0 ? (
                                      cleanedPurposes.map((p, pIdx) => (
                                        <span
                                          key={pIdx}
                                          className="badge d-inline-flex align-items-center font-weight-bold"
                                          style={{
                                            backgroundColor: '#f8fafc',
                                            color: '#1e293b',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            padding: '4px 8px',
                                            fontSize: '0.78rem',
                                            lineHeight: '1.25',
                                            whiteSpace: 'normal',
                                            textAlign: 'left',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                          }}
                                        >
                                          <i
                                            className="fas fa-stethoscope mr-1.5 text-primary"
                                            style={{ fontSize: '0.72rem' }}
                                          ></i>
                                          <span>{p}</span>
                                        </span>
                                      ))
                                    ) : (
                                      <span
                                        className="badge d-inline-flex align-items-center font-weight-bold"
                                        style={{
                                          backgroundColor: '#f8fafc',
                                          color: '#1e293b',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: '6px',
                                          padding: '4px 8px',
                                          fontSize: '0.78rem',
                                        }}
                                      >
                                        <i className="fas fa-stethoscope mr-1.5 text-primary"></i>
                                        <span>General Consultation</span>
                                      </span>
                                    )}
                                  </div>

                                  {/* Clinician subtitle */}
                                  <div className="small text-muted d-flex align-items-center" style={{ fontSize: '0.76rem' }}>
                                    {enc.seen_by ? (
                                      <>
                                        <i className="fas fa-user-md text-info mr-1.5" style={{ fontSize: '0.76rem' }}></i>
                                        <span className="text-gray-700 font-weight-500 text-truncate" style={{ maxWidth: '230px' }}>
                                          {enc.seen_by}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-muted font-italic">
                                        <i className="fas fa-user-clock mr-1 text-gray-400"></i>
                                        Awaiting Clinician
                                      </span>
                                    )}
                                  </div>
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
                                      <i className="fas fa-user-md mr-1 text-success"></i> Consultation Fee {cleanedPurposes.length > 1 ? `(${cleanedPurposes.length})` : ''}
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

            {/* TAB CONTENT: Issue Receipt (Private & Self-Pay Patients) */}
            {activeSubMenu === 'issue-receipt' && (
              <div className="card-body p-0">
                {/* Search Bar & Stats Toolbar */}
                <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap" style={{ gap: '10px' }}>
                  <div className="d-flex align-items-center flex-wrap" style={{ gap: '10px' }}>
                    <div className="input-group input-group-sm" style={{ width: '280px' }}>
                      <div className="input-group-prepend">
                        <span className="input-group-text bg-white border-right-0 text-muted">
                          <i className="fas fa-search"></i>
                        </span>
                      </div>
                      <input
                        type="text"
                        className="form-control border-left-0"
                        placeholder="Search patient, hospital no, or invoice #..."
                        value={receiptSearchQuery}
                        onChange={(e) => setReceiptSearchQuery(e.target.value)}
                      />
                      {receiptSearchQuery && (
                        <div className="input-group-append">
                          <button className="btn btn-outline-secondary" type="button" onClick={() => setReceiptSearchQuery('')}>
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Day Filter */}
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                      <span className="text-muted font-weight-bold mr-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <i className="far fa-calendar-alt text-success mr-1"></i> Day:
                      </span>
                      <div className="btn-group btn-group-sm bg-white border rounded shadow-2xs p-0.5" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${receiptDateFilter === 'today' ? 'btn-success font-weight-bold shadow-xs text-white' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => setReceiptDateFilter('today')}
                        >
                          Today
                        </button>
                        <input
                          type="date"
                          className="form-control form-control-sm border-0 bg-transparent text-secondary"
                          style={{ width: '130px', fontSize: '0.78rem', height: '26px', padding: '0 6px' }}
                          value={receiptDateFilter === 'today' ? getTodayStr() : (receiptDateFilter === 'all' ? '' : receiptDateFilter)}
                          onChange={(e) => setReceiptDateFilter(e.target.value || 'today')}
                          title="Filter pending receipts by specific day"
                        />
                        <button
                          type="button"
                          className={`btn btn-sm ${receiptDateFilter === 'all' ? 'btn-secondary font-weight-bold' : 'btn-light text-secondary'}`}
                          style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '4px' }}
                          onClick={() => setReceiptDateFilter('all')}
                        >
                          All Dates
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                    <div className="small text-muted font-weight-bold">
                      Pending Receipts:{' '}
                      <strong className="text-dark font-weight-bold">{filteredGroupedPendingInvoices.length}</strong>
                    </div>
                    <div className="small text-muted font-weight-bold pl-2 border-left">
                      Total Uncollected:{' '}
                      <strong className="text-danger font-weight-bold">
                        ₦{filteredGroupedPendingInvoices.reduce((s, it) => s + it.total_price, 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="thead-light" style={{ fontSize: '0.84rem' }}>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Hospital No.</th>
                        <th>Sponsor / Plan</th>
                        <th>Billed Items Breakdown</th>
                        <th className="text-right">Total Due (₦)</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {filteredGroupedPendingInvoices.length > 0 ? (
                        filteredGroupedPendingInvoices.map((grp) => (
                          <tr key={grp.group_key || grp.invoice_number}>
                            <td className="font-weight-bold text-primary" style={{ whiteSpace: 'nowrap' }}>
                              <i className="fas fa-file-invoice text-muted mr-1.5"></i>
                              {grp.primary_invoice_number || grp.invoice_number}
                              {grp.invoice_numbers_list?.length > 1 && (
                                <span
                                  className="badge badge-info ml-1.5 px-1.5 py-0.5 font-weight-bold"
                                  style={{ fontSize: '0.68rem', borderRadius: '8px' }}
                                  title={`Merged invoices for ${grp.date_str}: ${grp.invoice_numbers_list.join(', ')}`}
                                >
                                  +{grp.invoice_numbers_list.length - 1} more
                                </span>
                              )}
                            </td>
                            <td className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                              {grp.date_str || (grp.created_date ? new Date(grp.created_date).toLocaleDateString() : 'Today')}
                            </td>
                            <td className="font-weight-bold text-dark">
                              {grp.patient_name}
                            </td>
                            <td className="text-muted font-weight-bold">{grp.hospital_number}</td>
                            <td>
                              <span className="badge badge-light border text-secondary font-weight-bold">
                                {grp.sponsor}
                              </span>
                            </td>
                            <td>
                              <div style={{ maxWidth: '340px', fontSize: '0.82rem' }}>
                                {grp.items.slice(0, 4).map((it, idx) => (
                                  <span key={idx} className="badge badge-light border mr-1 mb-1 font-weight-normal text-truncate" style={{ maxWidth: '200px', display: 'inline-block', verticalAlign: 'middle' }}>
                                    {it.product} {Number(it.qty || 1) > 1 ? `(x${it.qty})` : ''}
                                  </span>
                                ))}
                                {grp.items.length > 4 && (
                                  <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                                    +{grp.items.length - 4} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-right font-weight-bold text-danger" style={{ fontSize: '0.94rem' }}>
                              ₦{grp.total_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-success px-3 shadow-xs font-weight-bold"
                                style={{ borderRadius: '6px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', border: 'none' }}
                                onClick={() => handleOpenReceiptModal(grp)}
                              >
                                <i className="fas fa-receipt mr-1.5"></i> Issue Receipt
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-5 text-muted">
                            <i className="fas fa-check-circle fa-3x text-success mb-3 d-block"></i>
                            <div className="font-weight-bold text-dark" style={{ fontSize: '1rem' }}>
                              All Private Invoices Have Been Receipted!
                            </div>
                            <div className="small text-muted mt-1">
                              When private patient bills are created in Encounters Billing, they will appear here ready to collect payment and issue official 80mm thermal receipts.
                            </div>
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
                        <th>Date</th>
                        <th>Patient</th>
                        <th>Hospital No.</th>
                        <th>Billed Services / Products</th>
                        <th className="text-center">Items</th>
                        <th className="text-right">Total (₦)</th>
                        <th>Payment Option</th>
                        <th className="text-center">Status</th>
                        <th className="text-center" style={{ minWidth: '150px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.85rem' }}>
                      {filteredGroupedInvoices.length > 0 ? (
                        filteredGroupedInvoices.map((grp) => {
                          const isHmo = isHmoRecord(grp);
                          return (
                            <tr key={grp.group_key}>
                              <td className="font-weight-bold text-primary" style={{ whiteSpace: 'nowrap' }}>
                                <i className="fas fa-file-invoice text-muted mr-1"></i>
                                {grp.invoice_number}
                                {grp.invoice_numbers_list.length > 1 && (
                                  <span
                                    className="badge badge-light border ml-1 text-secondary"
                                    title={`All invoices today: ${grp.invoice_numbers_list.join(', ')}`}
                                  >
                                    +{grp.invoice_numbers_list.length - 1}
                                  </span>
                                )}
                              </td>
                              <td className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
                                <i className="far fa-calendar-alt mr-1 text-primary"></i>
                                {grp.date_str === getTodayStr() ? 'Today' : grp.date_str}
                              </td>
                              <td>
                                <div className="font-weight-bold text-dark">
                                  {grp.patient_name}
                                </div>
                                <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                                  {grp.sponsor}
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-light border text-secondary font-weight-bold">
                                  {grp.hospital_number}
                                </span>
                              </td>
                              <td>
                                <div style={{ maxWidth: '340px' }}>
                                  <div className="d-flex flex-wrap" style={{ gap: '4px' }}>
                                    {grp.items.slice(0, 4).map((it, idx) => (
                                      <span
                                        key={idx}
                                        className="badge px-2 py-1 border text-truncate"
                                        style={{
                                          backgroundColor: '#f8fafc',
                                          color: '#334155',
                                          fontSize: '0.74rem',
                                          fontWeight: '500',
                                          maxWidth: '220px',
                                          display: 'inline-block',
                                          verticalAlign: 'middle',
                                        }}
                                        title={`${it.product} - Qty: ${it.qty} @ ₦${Number(it.rate || it.price).toLocaleString()} = ₦${it.lineTotal.toLocaleString()}`}
                                      >
                                        <span className="font-weight-bold text-primary mr-1">{it.qty > 1 ? `${it.qty}x ` : ''}</span>
                                        {it.product}
                                        <span className="text-dark ml-1 font-weight-bold">₦{it.lineTotal.toLocaleString()}</span>
                                      </span>
                                    ))}
                                    {grp.items.length > 4 && (
                                      <span
                                        className="badge badge-secondary"
                                        style={{ fontSize: '0.72rem', alignSelf: 'center' }}
                                        title={grp.items.slice(4).map((it) => it.product).join(', ')}
                                      >
                                        +{grp.items.length - 4} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center font-weight-bold">
                                <span className="badge badge-light border">
                                  {grp.items.length} service{grp.items.length === 1 ? '' : 's'}
                                </span>
                              </td>
                              <td className="text-right font-weight-bold text-gray-900" style={{ fontSize: '0.92rem' }}>
                                ₦{grp.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td>
                                <span className="badge badge-light border text-secondary">
                                  {grp.payment_option || 'Cash'}
                                </span>
                              </td>
                              <td className="text-center">
                                {grp.completed ? (
                                  <span className="badge badge-success px-2 py-1">
                                    <i className="fas fa-check mr-1"></i> Paid
                                  </span>
                                ) : grp.is_partial ? (
                                  <span className="badge badge-info px-2 py-1">
                                    <i className="fas fa-adjust mr-1"></i> Partial ({grp.completed_count}/{grp.items.length})
                                  </span>
                                ) : (
                                  <span className="badge badge-warning px-2 py-1 text-dark font-weight-bold">
                                    <i className="fas fa-clock mr-1"></i> Pending
                                  </span>
                                )}
                              </td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm">
                                  {!grp.completed && (
                                    <button
                                      type="button"
                                      className="btn btn-outline-success btn-sm px-2 font-weight-bold"
                                      onClick={() => {
                                        setPayConfirmGroup(grp);
                                        setPayConfirmMethod(grp.payment_option || 'Cash');
                                      }}
                                      title={`Record Payment for all items on this day's invoice (${grp.invoice_number})`}
                                    >
                                      <i className="fas fa-check-circle mr-1"></i> Pay
                                    </button>
                                  )}
                                  {isHmo ? (
                                    <button
                                      type="button"
                                      className="btn btn-outline-info btn-sm px-2 font-weight-bold"
                                      onClick={() => {
                                        setPreviewHmoClaim({
                                          invoice_number: grp.invoice_number,
                                          session_number: grp.invoice_number?.replace('CLM-', '') || `280${grp.id}`,
                                          patient_name: grp.patient_name,
                                          sponsor: (grp.sponsor && !grp.sponsor.toLowerCase().includes('self-pay') && !grp.sponsor.toLowerCase().includes('cash'))
                                            ? grp.sponsor
                                            : (grp.plan && !grp.plan.toLowerCase().includes('standard') ? grp.plan : 'HMO Sponsor'),
                                          plan: grp.plan || 'HMO Plan',
                                          policy_number: grp.policy_number || 'NIL',
                                          phone: grp.phone_number || 'N/A',
                                          gender: grp.gender || 'N/A',
                                          age: grp.age || '36',
                                          address: grp.address || '46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria',
                                          bill_date: grp.date_str,
                                          purpose: grp.items.map((it) => it.product).join(', '),
                                          pa_code: grp.pa_code || 'NIL',
                                          items: grp.items.map((it) => ({
                                            service_item: it.product,
                                            quantity: it.qty,
                                            rate: it.rate !== undefined ? it.rate : (it.qty > 0 ? it.price / it.qty : it.price),
                                            discount: it.discount || 0,
                                            total: it.lineTotal !== undefined ? it.lineTotal : it.price,
                                            category: it.category || 'service',
                                          })),
                                          total_amount: grp.total_amount,
                                        });
                                      }}
                                      title="View / Print HMO Claims Form (All Day's Items)"
                                    >
                                      <i className="fas fa-file-medical mr-1"></i> Claim
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm px-2 font-weight-bold"
                                      onClick={() => {
                                        setPreviewPrivateInvoice({
                                          invoice_number: grp.invoice_number,
                                          bill_number: grp.invoice_number?.replace('INV-', '') || `411${grp.id}`,
                                          patient_name: grp.patient_name,
                                          hospital_number: grp.hospital_number,
                                          sponsor: grp.sponsor || 'ISALU HOSPITALS PRIVATE',
                                          plan: grp.plan || 'PRIVATE PRICELIST',
                                          policy_number: grp.policy_number || 'NIL',
                                          enrollee_number: grp.enrollee_number || 'NIL',
                                          address: grp.address || 'OGBA',
                                          phone: grp.phone_number || 'N/A',
                                          gender: grp.gender || 'N/A',
                                          created_datetime: grp.created_date ? new Date(grp.created_date).toLocaleString() : new Date().toLocaleString(),
                                          staff_name: grp.staff_name || grp.items?.find((it) => it.staff_name)?.staff_name || getLoggedInStaffName(),
                                          items: grp.items.map((it) => ({
                                            service_item: it.product,
                                            quantity: it.qty,
                                            rate: it.rate !== undefined ? it.rate : (it.qty > 0 ? it.price / it.qty : it.price),
                                            discount: it.discount || 0,
                                            total: it.lineTotal !== undefined ? it.lineTotal : it.price,
                                          })),
                                          total_amount: grp.total_amount,
                                          previous_balance: 0,
                                          latest_balance: grp.total_amount,
                                        });
                                      }}
                                      title="View / Print Private Invoice (All Day's Items)"
                                    >
                                      <i className="fas fa-file-invoice mr-1"></i> Invoice
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm px-2"
                                    onClick={() => {
                                      setPrintSlip({
                                        ...grp,
                                        items: grp.items.map((it) => ({
                                          ...it,
                                          service_item: it.product,
                                          quantity: it.qty,
                                          rate: it.rate !== undefined ? it.rate : (it.qty > 0 ? it.price / it.qty : it.price),
                                          total: it.lineTotal !== undefined ? it.lineTotal : it.price,
                                        })),
                                        product: grp.items.map((it) => `${it.qty > 1 ? `${it.qty}x ` : ''}${it.product}`).join(', '),
                                        price: grp.total_amount,
                                        total_price: grp.total_amount,
                                        qty: 1,
                                      });
                                    }}
                                    title="Print Thermal Slip (80mm)"
                                  >
                                    <i className="fas fa-receipt"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="10" className="text-center py-5 text-muted">
                            <i className="fas fa-file-invoice fa-3x text-gray-300 mb-2 d-block"></i>
                            <div className="font-weight-bold text-dark" style={{ fontSize: '1rem' }}>No invoices found matching criteria.</div>
                            <div className="small text-muted mt-1">
                              {invoiceDateFilter === 'today'
                                ? "No patient invoices found for today. Switch date filter to 'All Dates' or pick a specific date above."
                                : "Try adjusting your search query, date filter, or payment status filter."}
                            </div>
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
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document" style={{ maxWidth: '96vw', width: '1380px', margin: '1.25rem auto' }}>
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
                    <div className="small font-weight-bold text-secondary mb-1 d-flex align-items-center flex-wrap" style={{ gap: '8px' }}>
                      <span>Sponsor: <strong className="text-dark">{currentEncounter.sponsor || 'Self-Pay / Cash'}</strong></span>
                      <span>|</span>
                      <span>Plan: <strong className="text-dark">{currentEncounter.plan || 'Standard Plan'}</strong></span>
                      <span
                        className={`badge font-weight-bold px-2 py-0.5 ${
                          isHmoEncounter ? 'badge-info' : 'badge-light border text-primary'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        <i className={`fas ${isHmoEncounter ? 'fa-shield-alt' : 'fa-file-invoice'} mr-1`}></i>
                        {isHmoEncounter ? 'HMO Sponsor (Generates Claims)' : 'Private Sponsor (Generates Invoice)'}
                      </span>
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
                    <div className="small text-muted mt-1 d-flex align-items-center flex-wrap" style={{ gap: '6px' }}>
                      <span className="font-weight-bold text-dark">Visit Purpose(s):</span>{' '}
                      {currentEncounter.purposes && currentEncounter.purposes.length > 1 ? (
                        currentEncounter.purposes.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="badge badge-light border text-primary font-weight-bold px-2 py-0.5"
                            style={{ fontSize: '0.78rem' }}
                          >
                            #{pIdx + 1} {p}
                          </span>
                        ))
                      ) : (
                        <span>{currentEncounter.purpose || 'General Consultation'}</span>
                      )}
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
                    <label className="mb-0 font-weight-bold text-gray-800 mr-2">
                      {isHmoEncounter ? 'Other HMO/Plan:' : 'Tariff Plan:'}
                    </label>
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
                  {/* Bill Items Selection Control Bar */}
                  <div
                    className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom flex-wrap"
                    style={{ backgroundColor: '#f8fafc', fontSize: '0.84rem', gap: '10px' }}
                  >
                    <div className="d-flex align-items-center flex-wrap" style={{ gap: '10px' }}>
                      <span className="font-weight-bold text-gray-800">
                        <i className="fas fa-tasks text-primary mr-1"></i> Bill Selection:
                      </span>
                      <span
                        className={`badge ${billedItemsOnly.length > 0 ? 'badge-success' : 'badge-warning'} px-2.5 py-1 font-weight-bold`}
                        style={{ fontSize: '0.8rem' }}
                      >
                        {billedItemsOnly.length} of {billItems.length} item(s) selected
                      </span>
                      {billedItemsOnly.length < billItems.length && (
                        <span className="text-secondary small font-weight-bold">
                          <i className="fas fa-info-circle text-info mr-1"></i>
                          {billItems.length - billedItemsOnly.length} unselected item(s) will stay in queue for later
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center" style={{ gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-success font-weight-bold shadow-2xs"
                        style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '0.76rem' }}
                        onClick={() => handleToggleAllBill(true)}
                        title="Check all items to bill everything"
                      >
                        <i className="fas fa-check-double mr-1"></i> Select All ({billItems.length})
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-outline-secondary font-weight-bold shadow-2xs"
                        style={{ padding: '3px 10px', borderRadius: '5px', fontSize: '0.76rem' }}
                        onClick={() => handleToggleAllBill(false)}
                        title="Uncheck all items so you can pick only the one you want to bill"
                      >
                        <i className="fas fa-times mr-1"></i> Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="table-responsive mb-0" style={{ overflowX: 'auto' }}>
                    <table className="table table-bordered table-sm mb-0" style={{ minWidth: '1240px', fontSize: '0.84rem' }}>
                      <thead className="thead-light">
                        <tr className="text-gray-800" style={{ fontWeight: 600 }}>
                          <th style={{ width: '80px' }} className="text-center align-middle">
                            <span className="d-block text-xs font-weight-bold mb-1">Bill?</span>
                            <input
                              type="checkbox"
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16a34a' }}
                              checked={billItems.length > 0 && billItems.every((it) => it.bill)}
                              onChange={(e) => handleToggleAllBill(e.target.checked)}
                              title="Check / Uncheck All Items to Bill"
                            />
                          </th>
                          <th style={{ minWidth: '380px' }}>Service / Billable Item</th>
                          <th style={{ width: '95px' }}>UOM</th>
                          <th style={{ width: '75px' }} className="text-center">
                            Quantity
                          </th>
                          <th style={{ width: '110px' }} className="text-right">
                            Rate ({currencySymbol})
                          </th>
                          <th style={{ width: '80px' }} className="text-center">
                            Discount %
                          </th>
                          <th style={{ width: '115px' }} className="text-right">
                            Total ({currencySymbol})
                          </th>
                          <th style={{ width: '115px' }}>Payment Option</th>
                          <th style={{ width: '95px' }} className="text-center">
                            Compulsory PA Code?
                          </th>
                          <th style={{ width: '140px' }}>Amount Paid/PA Code</th>
                          <th style={{ width: '40px' }} className="text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {billItems.map((item, idx) => (
                          <tr
                            key={item.temp_id || idx}
                            style={{
                              backgroundColor: item.bill ? '#ffffff' : '#f8fafc',
                              opacity: item.bill ? 1 : 0.72,
                              transition: 'all 0.15s ease-in-out',
                            }}
                          >
                            {/* Bill? checkbox in Column 1 */}
                            <td
                              className="text-center align-middle"
                              style={{
                                backgroundColor: item.bill ? '#f0fdf4' : '#f1f5f9',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleItemFieldChange(item.temp_id, 'bill', !item.bill)}
                              title={item.bill ? "Click to uncheck (skip billing this item)" : "Click to check (include in this bill)"}
                            >
                              <input
                                type="checkbox"
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#16a34a' }}
                                checked={Boolean(item.bill)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleItemFieldChange(item.temp_id, 'bill', e.target.checked);
                                }}
                                title={item.bill ? "Checked: this item will be billed" : "Unchecked: this item will be skipped and remain in queue"}
                              />
                            </td>

                            {/* Service / Item */}
                            <td style={{ minWidth: '380px' }}>
                              <div className="d-flex align-items-center">
                                {item.bill ? (
                                  <span className="badge badge-success px-2 py-0.5 mr-2 font-weight-bold shadow-2xs" style={{ fontSize: '0.7rem', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                                    <i className="fas fa-check-circle mr-1"></i> WILL BILL
                                  </span>
                                ) : (
                                  <span className="badge badge-secondary px-2 py-0.5 mr-2 font-weight-bold" style={{ fontSize: '0.7rem', backgroundColor: '#94a3b8', whiteSpace: 'nowrap' }}>
                                    <i className="fas fa-pause-circle mr-1"></i> REMAIN IN QUEUE
                                  </span>
                                )}
                                {isHmoEncounter && (
                                  (item.payment_option || '').toLowerCase() === 'claim' ? (
                                    <span className="badge badge-info px-1.5 py-0.5 mr-2 font-weight-bold" style={{ fontSize: '0.68rem', backgroundColor: '#0284c7', whiteSpace: 'nowrap' }} title="Covered under HMO Plan (generates HMO Claim)">
                                      <i className="fas fa-shield-alt mr-1"></i> HMO CLAIM
                                    </span>
                                  ) : (
                                    <span className="badge badge-warning px-1.5 py-0.5 mr-2 font-weight-bold text-dark border border-warning" style={{ fontSize: '0.68rem', backgroundColor: '#fef08a', whiteSpace: 'nowrap' }} title="Not Covered under HMO Plan (patient pays from purse, generates Invoice)">
                                      <i className="fas fa-wallet mr-1"></i> PAY FROM PURSE
                                    </span>
                                  )
                                )}
                                <input
                                  type="text"
                                  className="form-control form-control-sm border-0 font-weight-bold"
                                  style={{
                                    width: '100%',
                                    fontSize: '0.86rem',
                                    color: item.bill ? '#0f172a' : '#64748b',
                                    textDecoration: item.bill ? 'none' : 'line-through',
                                    backgroundColor: 'transparent',
                                  }}
                                  value={item.service_item}
                                  title={item.service_item}
                                  placeholder="Service / Drug / Test name..."
                                  onChange={(e) => handleItemFieldChange(item.temp_id, 'service_item', e.target.value)}
                                />
                              </div>
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
                                className="form-control form-control-sm font-weight-bold"
                                style={{
                                  color: (item.payment_option || '').toLowerCase() === 'claim' ? '#0369a1' : '#b45309',
                                  backgroundColor: (item.payment_option || '').toLowerCase() === 'claim' ? '#f0f9ff' : '#fefce8',
                                  borderColor: (item.payment_option || '').toLowerCase() === 'claim' ? '#bae6fd' : '#fde68a',
                                }}
                                value={item.payment_option}
                                onChange={(e) => handleItemFieldChange(item.temp_id, 'payment_option', e.target.value)}
                              >
                                {isHmoEncounter && <option value="Claim">Claim (HMO Plan)</option>}
                                <option value="Cash">{isHmoEncounter ? 'Cash (Pay from purse)' : 'Cash'}</option>
                                <option value="Transfer">{isHmoEncounter ? 'Transfer (Pay from purse)' : 'Transfer'}</option>
                                <option value="POS">{isHmoEncounter ? 'POS (Pay from purse)' : 'POS'}</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Bank Deposit">Bank Deposit</option>
                                <option value="Staff Salary">Staff Salary</option>
                                <option value="Capitation">Capitation</option>
                                {!isHmoEncounter && <option value="Claim">Claim</option>}
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

                  {/* Table Footer info */}
                  <div className="p-2 bg-light border-top d-flex justify-content-end align-items-center">
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

                    {isSplitBilling ? (
                      <>
                        <div className="pl-3 border-left">
                          <span className="text-muted small d-block">
                            <i className="fas fa-shield-alt text-info mr-1"></i> HMO Claim Total:
                          </span>
                          <strong className="text-primary font-weight-bold" style={{ fontSize: '1rem' }}>
                            ₦{claimBilledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <span className="badge badge-light border text-primary ml-1" style={{ fontSize: '0.7rem' }}>
                            {claimBilledItems.length} item(s)
                          </span>
                        </div>
                        <div className="pl-3 border-left">
                          <span className="text-muted small d-block">
                            <i className="fas fa-wallet text-warning mr-1"></i> Patient Out-of-Pocket:
                          </span>
                          <strong className="text-danger font-weight-bold" style={{ fontSize: '1rem' }}>
                            ₦{purseBilledTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <span className="badge badge-warning text-dark ml-1" style={{ fontSize: '0.7rem' }}>
                            {purseBilledItems.length} item(s)
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="pl-3 border-left">
                        <span className="text-muted small d-block">Net Total Payable:</span>
                        <strong className="text-success h5 mb-0 font-weight-bold">
                          ₦{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}
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

                    {billItems.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-primary px-4 shadow-sm font-weight-bold d-inline-flex align-items-center"
                        style={{
                          borderRadius: '6px',
                          background: isSplitBilling
                            ? 'linear-gradient(135deg, #0284c7 0%, #059669 100%)'
                            : isHmoEncounter
                            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                            : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          border: 'none',
                        }}
                        onClick={handleCreateBill}
                        disabled={generatingBill || billedItemsOnly.length === 0}
                        title={
                          isSplitBilling
                            ? "Generates an HMO Claim for plan-covered items and a Patient Invoice for out-of-pocket items"
                            : isHmoEncounter
                            ? "Create HMO Claims bill for submission"
                            : "Create official private patient invoice"
                        }
                      >
                        {generatingBill ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-1.5"></i> Creating Bill...
                          </>
                        ) : (
                          <>
                            <i className={`fas ${isSplitBilling ? 'fa-copy' : isHmoEncounter ? 'fa-file-medical-alt' : 'fa-file-invoice-dollar'} mr-1.5`}></i>
                            {isSplitBilling
                              ? 'Create Bill (HMO Claim & Patient Invoice)'
                              : isHmoEncounter
                              ? (claimBilledItems.length === 0 ? 'Create Bill (Patient Invoice)' : 'Create Bill (HMO Claim)')
                              : 'Create Bill (Invoice)'}
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
      {/* 1. CONFIRM CREATE BILL ALERT MODAL                        */}
      {/* ========================================================= */}
      {showConfirmCreateBillModal && currentEncounter && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 1070,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => !generatingBill && setShowConfirmCreateBillModal(false)}
          />
          <div
            className="card shadow-2xl modal-custom"
            style={{
              zIndex: 1075,
              maxWidth: '580px',
              maxHeight: '92vh',
              width: '92%',
              borderRadius: '16px',
              border: '1px solid #bfdbfe',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="py-3 px-4 d-flex justify-content-between align-items-center"
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderBottom: '1px solid #bfdbfe',
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-3 shadow-sm"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#dbeafe',
                    color: '#1d4ed8',
                    border: '1px solid #93c5fd',
                    flexShrink: 0,
                  }}
                >
                  <i className={`fas ${isHmoEncounter ? 'fa-file-medical-alt' : 'fa-file-invoice-dollar'} fa-lg`}></i>
                </div>
                <div>
                  <h5 className="mb-0 font-weight-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em', color: '#1e3a8a' }}>
                    Confirm Bill Generation?
                  </h5>
                  <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                    Generate {isHmoEncounter ? 'HMO Claim' : 'Official Patient Invoice'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light border-0 rounded-circle text-muted"
                style={{ width: '32px', height: '32px', padding: 0 }}
                onClick={() => !generatingBill && setShowConfirmCreateBillModal(false)}
                disabled={generatingBill}
                title="Cancel"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-4" style={{ backgroundColor: '#ffffff', overflowY: 'auto', flex: 1 }}>
              <p className="text-secondary mb-3" style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
                Are you sure you want to generate the official bill for this patient? This will create the bill record and update the encounter queue.
              </p>

              {/* Patient & Bill Summary Box */}
              <div
                className="p-3 mb-3"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                }}
              >
                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Patient:</span>
                  <span className="font-weight-bold text-dark text-uppercase">
                    {currentEncounter.patient_name} [{currentEncounter.hospital_number}]
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Sponsor:</span>
                  <span className="font-weight-bold text-dark">
                    {currentEncounter.sponsor || 'Self-Pay / Cash'} ({currentEncounter.plan || 'Standard'})
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Bill Type:</span>
                  <span className={`badge ${isHmoEncounter ? 'badge-primary' : 'badge-info'} font-weight-bold px-2 py-1`}>
                    {isHmoEncounter ? 'HMO Claim' : 'Private Invoice'}
                  </span>
                </div>
                <div className="d-flex justify-content-between py-1 border-bottom border-light">
                  <span className="text-muted">Selected Items:</span>
                  <span className="font-weight-bold text-dark">
                    {billedItemsOnly.length} of {billItems.length} service(s) / item(s)
                  </span>
                </div>
                <div className="d-flex justify-content-between pt-2 mt-1">
                  <span className="font-weight-bold text-dark" style={{ fontSize: '0.95rem' }}>Net Bill Amount:</span>
                  <span className="font-weight-bold text-primary" style={{ fontSize: '1.15rem' }}>
                    ₦{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Itemized List: Items to be Billed */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1.5">
                  <span className="font-weight-bold text-success small" style={{ letterSpacing: '0.02em', fontSize: '0.78rem' }}>
                    <i className="fas fa-check-circle mr-1"></i> ITEMS TO BE BILLED NOW ({billedItemsOnly.length}):
                  </span>
                  <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                    Total: ₦{netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div
                  style={{
                    maxHeight: '140px',
                    overflowY: 'auto',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.82rem',
                  }}
                >
                  {billedItemsOnly.map((it, idx) => (
                    <div
                      key={it.temp_id || idx}
                      className="d-flex justify-content-between align-items-center py-1 border-bottom border-light"
                      style={{ gap: '8px' }}
                    >
                      <div className="d-flex align-items-center" style={{ gap: '6px', maxWidth: '75%' }}>
                        <span className="badge badge-success font-weight-bold" style={{ fontSize: '0.66rem', padding: '2px 5px' }}>
                          {it.payment_option || (isHmoEncounter ? 'Claim' : 'Cash')}
                        </span>
                        <span className="font-weight-bold text-dark text-truncate" title={it.service_item}>
                          {it.service_item}
                        </span>
                        <span className="text-muted small font-weight-bold">x{it.quantity}</span>
                      </div>
                      <span className="font-weight-bold text-success" style={{ whiteSpace: 'nowrap' }}>
                        ₦{Number(it.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Itemized List: Items Staying in Queue (Excluded from this bill) */}
              {billItems.some((it) => !it.bill) && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1.5">
                    <span className="font-weight-bold text-secondary small" style={{ letterSpacing: '0.02em', fontSize: '0.78rem' }}>
                      <i className="fas fa-pause-circle mr-1 text-warning"></i> SKIPPED — REMAINING IN QUEUE ({billItems.filter((it) => !it.bill).length}):
                    </span>
                    <span className="badge badge-warning text-dark font-weight-bold" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                      Will Not Be Billed
                    </span>
                  </div>
                  <div
                    style={{
                      maxHeight: '110px',
                      overflowY: 'auto',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.82rem',
                    }}
                  >
                    {billItems.filter((it) => !it.bill).map((it, idx) => (
                      <div
                        key={it.temp_id || idx}
                        className="d-flex justify-content-between align-items-center py-1 border-bottom border-light text-muted"
                        style={{ gap: '8px' }}
                      >
                        <div className="d-flex align-items-center" style={{ gap: '6px', maxWidth: '75%' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.66rem', padding: '2px 5px', backgroundColor: '#94a3b8' }}>
                            Skipped
                          </span>
                          <span className="text-truncate text-secondary" style={{ textDecoration: 'line-through' }} title={it.service_item}>
                            {it.service_item}
                          </span>
                          <span className="small">x{it.quantity}</span>
                        </div>
                        <span className="font-weight-bold text-secondary" style={{ whiteSpace: 'nowrap' }}>
                          ₦{Number(it.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex align-items-center text-muted small">
                <i className="fas fa-info-circle text-primary mr-2" style={{ fontSize: '0.9rem' }}></i>
                <span>You will be able to review, print, and save the document immediately after creation.</span>
              </div>
            </div>

            {/* Footer */}
            <div
              className="py-3 px-4 d-flex justify-content-end align-items-center"
              style={{
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-light border px-3 font-weight-bold"
                style={{ borderRadius: '8px' }}
                onClick={() => setShowConfirmCreateBillModal(false)}
                disabled={generatingBill}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary px-4 font-weight-bold shadow-sm"
                style={{
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                }}
                onClick={handleProceedCreateBill}
                disabled={generatingBill}
              >
                {generatingBill ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-1.5"></i> Generating Bill...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle mr-1.5"></i> Yes, Create Bill
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Loading Overlay while generating bill */}
      {generatingBill && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1099,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="card shadow-2xl p-4 text-center border-0"
            style={{
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              maxWidth: '360px',
              width: '90%',
            }}
          >
            <div className="spinner-border text-primary mx-auto mb-3" style={{ width: '2.8rem', height: '2.8rem' }} role="status">
              <span className="sr-only">Creating bill...</span>
            </div>
            <h6 className="font-weight-bold text-gray-900 mb-1" style={{ fontSize: '1.02rem' }}>
              Creating Bill...
            </h6>
            <p className="text-muted small mb-0" style={{ fontSize: '0.84rem' }}>
              Recording official billing document, please wait...
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BILL CREATED SUCCESS ALERT MODAL                       */}
      {/* ========================================================= */}
      {billSuccessData && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 1080,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setBillSuccessData(null)}
          />
          <div
            className="card shadow-2xl modal-custom"
            style={{
              zIndex: 1085,
              maxWidth: '520px',
              width: '92%',
              borderRadius: '16px',
              border: '1px solid #bbf7d0',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="py-3 px-4 d-flex justify-content-between align-items-center"
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderBottom: '1px solid #bbf7d0',
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-3 shadow-sm"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    border: '1px solid #86efac',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-check fa-lg"></i>
                </div>
                <div>
                  <h5 className="mb-0 font-weight-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em', color: '#14532d' }}>
                    {billSuccessData.has_split ? 'Claim & Invoice Created Successfully!' : 'Bill Created Successfully!'}
                  </h5>
                  <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                    {billSuccessData.has_split
                      ? '1 HMO Claim (Plan items) & 1 Patient Invoice (Pay from purse items)'
                      : (billSuccessData.is_hmo ? 'HMO Claim recorded in billing system' : 'Patient Invoice recorded in billing system')}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light border-0 rounded-circle text-muted"
                style={{ width: '32px', height: '32px', padding: 0 }}
                onClick={() => setBillSuccessData(null)}
                title="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="p-4" style={{ backgroundColor: '#ffffff' }}>
              <div
                className="p-3.5 mb-3"
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.85rem',
                }}
              >
                {billSuccessData.has_split ? (
                  <>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Patient:</span>
                      <span className="font-weight-bold text-dark text-uppercase">
                        {billSuccessData.patient_name} [{billSuccessData.hospital_number}]
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Sponsor / Plan:</span>
                      <span className="font-weight-bold text-dark">
                        {billSuccessData.sponsor} ({billSuccessData.plan})
                      </span>
                    </div>

                    {/* Split Documents Breakdown */}
                    <div className="my-2 p-2.5 rounded border" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="font-weight-bold text-info" style={{ fontSize: '0.82rem' }}>
                          <i className="fas fa-shield-alt mr-1"></i> HMO Claim ({billSuccessData.claim_number})
                        </span>
                        <span className="font-weight-bold text-primary font-mono">
                          ₦{Number(billSuccessData.claim_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                        {billSuccessData.claim_items_count} item(s) covered under sponsor plan
                      </div>
                    </div>

                    <div className="my-2 p-2.5 rounded border" style={{ backgroundColor: '#fefce8', borderColor: '#fde68a' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="font-weight-bold text-warning" style={{ fontSize: '0.82rem' }}>
                          <i className="fas fa-wallet mr-1"></i> Patient Invoice ({billSuccessData.invoice_number})
                        </span>
                        <span className="font-weight-bold text-danger font-mono">
                          ₦{Number(billSuccessData.inv_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-muted small" style={{ fontSize: '0.74rem' }}>
                        {billSuccessData.inv_items_count} item(s) not covered (patient pays from purse)
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center pt-2 mt-1 border-top">
                      <span className="font-weight-bold text-dark" style={{ fontSize: '0.95rem' }}>Combined Total:</span>
                      <span className="font-weight-bold text-success" style={{ fontSize: '1.2rem' }}>
                        ₦{Number(billSuccessData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Document Number:</span>
                      <span className="font-weight-bold text-primary font-mono" style={{ fontSize: '1rem' }}>
                        {billSuccessData.invoice_number || billSuccessData.claim_number}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Patient:</span>
                      <span className="font-weight-bold text-dark text-uppercase">
                        {billSuccessData.patient_name} [{billSuccessData.hospital_number}]
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Sponsor:</span>
                      <span className="font-weight-bold text-dark">
                        {billSuccessData.sponsor}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center py-1.5 border-bottom border-light">
                      <span className="text-muted">Items Billed:</span>
                      <span className="font-weight-bold text-dark">
                        {billSuccessData.items_count} item(s)
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center pt-2 mt-1">
                      <span className="font-weight-bold text-dark" style={{ fontSize: '0.95rem' }}>Total Amount:</span>
                      <span className="font-weight-bold text-success" style={{ fontSize: '1.2rem' }}>
                        ₦{Number(billSuccessData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div
                className="alert alert-success d-flex align-items-center mb-0 py-2.5 px-3"
                style={{ borderRadius: '10px', fontSize: '0.84rem' }}
              >
                <i className="fas fa-check-circle mr-2 text-success" style={{ fontSize: '1rem' }}></i>
                <div>
                  {billSuccessData.message}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="py-3 px-4 d-flex justify-content-end align-items-center flex-wrap"
              style={{
                backgroundColor: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                gap: '10px',
              }}
            >
              <button
                type="button"
                className="btn btn-outline-secondary px-3 font-weight-bold"
                style={{ borderRadius: '8px' }}
                onClick={() => setBillSuccessData(null)}
              >
                Done
              </button>
              {billSuccessData.has_split ? (
                <>
                  {billSuccessData.claim_preview_data && (
                    <button
                      type="button"
                      className="btn btn-info px-3 font-weight-bold shadow-sm"
                      style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        border: 'none',
                      }}
                      onClick={() => {
                        setPreviewHmoClaim(billSuccessData.claim_preview_data);
                        setBillSuccessData(null);
                      }}
                    >
                      <i className="fas fa-file-medical-alt mr-1.5"></i> View / Print HMO Claim
                    </button>
                  )}
                  {billSuccessData.invoice_preview_data && (
                    <button
                      type="button"
                      className="btn btn-success px-3 font-weight-bold shadow-sm"
                      style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        border: 'none',
                      }}
                      onClick={() => {
                        setPreviewPrivateInvoice(billSuccessData.invoice_preview_data);
                        setBillSuccessData(null);
                      }}
                    >
                      <i className="fas fa-receipt mr-1.5"></i> View / Print Patient Invoice
                    </button>
                  )}
                </>
              ) : (
                billSuccessData.preview_data && (
                  <button
                    type="button"
                    className="btn btn-primary px-4 font-weight-bold shadow-sm"
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: 'none',
                    }}
                    onClick={() => {
                      if (billSuccessData.is_hmo) {
                        setPreviewHmoClaim(billSuccessData.preview_data);
                      } else {
                        setPreviewPrivateInvoice(billSuccessData.preview_data);
                      }
                      setBillSuccessData(null);
                    }}
                  >
                    <i className="fas fa-print mr-1.5"></i> View / Print {billSuccessData.is_hmo ? 'Claim' : 'Invoice'}
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 3. VALIDATION WARNING ALERT MODAL                         */}
      {/* ========================================================= */}
      {validationAlert && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 1070,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => setValidationAlert(null)}
          />
          <div
            className="card shadow-2xl modal-custom"
            style={{
              zIndex: 1075,
              maxWidth: '460px',
              width: '92%',
              borderRadius: '16px',
              border: '1px solid #fed7aa',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="py-3 px-4 d-flex justify-content-between align-items-center"
              style={{
                background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                borderBottom: '1px solid #fed7aa',
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className="d-flex align-items-center justify-content-center mr-3 shadow-sm"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#ffedd5',
                    color: '#ea580c',
                    border: '1px solid #fdba74',
                    flexShrink: 0,
                  }}
                >
                  <i className="fas fa-exclamation-triangle fa-lg"></i>
                </div>
                <div>
                  <h5 className="mb-0 font-weight-bold" style={{ fontSize: '1.05rem', color: '#9a3412' }}>
                    Notice
                  </h5>
                  <div className="text-muted small" style={{ fontSize: '0.78rem' }}>
                    Billing Action Required
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light border-0 rounded-circle text-muted"
                style={{ width: '32px', height: '32px', padding: 0 }}
                onClick={() => setValidationAlert(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 bg-white">
              <p className="text-secondary mb-0" style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
                {validationAlert}
              </p>
            </div>
            <div
              className="py-2.5 px-4 d-flex justify-content-end"
              style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}
            >
              <button
                type="button"
                className="btn btn-warning text-dark font-weight-bold px-4"
                style={{ borderRadius: '8px' }}
                onClick={() => setValidationAlert(null)}
              >
                Understood
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* PAY CONFIRMATION MODAL                                    */}
      {/* ========================================================= */}
      {payConfirmGroup && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 1060,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => !isProcessingPayment && setPayConfirmGroup(null)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1065 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '520px', width: '94%', margin: '1.5rem auto' }}>
              <div
                className="modal-content border-0 shadow-2xl"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.4)',
                }}
              >
                {/* Header */}
                <div
                  className="px-4 py-3 text-white d-flex align-items-center justify-content-between"
                  style={{
                    background: 'linear-gradient(135deg, #065f46 0%, #047857 55%, #059669 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white"
                      style={{
                        width: '38px',
                        height: '38px',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '1.15rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-cash-register"></i>
                    </div>
                    <div>
                      <h5 className="font-weight-bold mb-0 text-white" style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                        Confirm Payment
                      </h5>
                      <span className="text-white-50 small" style={{ fontSize: '0.74rem' }}>
                        Invoice #{payConfirmGroup.invoice_number} &bull; {payConfirmGroup.date_str}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm text-white rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: 'none',
                    }}
                    onClick={() => !isProcessingPayment && setPayConfirmGroup(null)}
                    disabled={isProcessingPayment}
                    title="Close"
                  >
                    <i className="fas fa-times" style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 bg-white" style={{ maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
                  {/* Question Prompt */}
                  <div
                    className="p-3 mb-3 rounded-lg d-flex align-items-center"
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <i className="fas fa-question-circle text-success mr-2.5 flex-shrink-0" style={{ fontSize: '1.35rem' }}></i>
                    <div className="text-dark small">
                      Do you want to confirm and record payment for <strong>{payConfirmGroup.patient_name}</strong>?
                    </div>
                  </div>

                  {/* Total Amount Highlight Banner */}
                  <div
                    className="p-3 mb-3 rounded-lg text-center"
                    style={{
                      backgroundColor: '#ecfdf5',
                      border: '1.5px solid #86efac',
                    }}
                  >
                    <span className="text-muted small text-uppercase font-weight-bold d-block mb-1">
                      Total Payable Amount
                    </span>
                    <h2
                      className="font-weight-bold mb-0 text-success font-mono"
                      style={{ letterSpacing: '-0.02em', fontSize: '1.9rem' }}
                    >
                      ₦{Number(payConfirmGroup.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                  </div>

                  {/* Patient Details */}
                  <div className="bg-light p-3 rounded mb-3 small border">
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-muted font-weight-semibold">Patient:</span>
                      <strong className="text-dark">
                        {payConfirmGroup.patient_name} <span className="text-primary font-weight-bold">({payConfirmGroup.hospital_number})</span>
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1.5">
                      <span className="text-muted font-weight-semibold">Sponsor / Plan:</span>
                      <span className="text-dark font-weight-semibold">
                        {payConfirmGroup.sponsor || payConfirmGroup.plan || 'Self-Pay / Cash'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted font-weight-semibold">Items Count:</span>
                      <span className="badge badge-secondary px-2 py-1">
                        {payConfirmGroup.items ? payConfirmGroup.items.length : 0} Item(s)
                      </span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-dark mb-1">
                      Payment Method <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-control form-control-sm font-weight-semibold"
                      value={payConfirmMethod}
                      onChange={(e) => setPayConfirmMethod(e.target.value)}
                      disabled={isProcessingPayment}
                    >
                      <option value="Cash">Cash</option>
                      <option value="POS">POS Terminal</option>
                      <option value="Transfer">Bank Transfer</option>
                      <option value="Purse">Patient Purse / Deposit</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  {/* Items summary */}
                  {payConfirmGroup.items && payConfirmGroup.items.length > 0 && (
                    <div className="mb-2">
                      <label className="font-weight-bold small text-muted text-uppercase mb-1" style={{ fontSize: '0.72rem' }}>
                        Included Invoice Items
                      </label>
                      <div className="border rounded p-2" style={{ maxHeight: '120px', overflowY: 'auto', backgroundColor: '#fcfcfc', fontSize: '0.8rem' }}>
                        {payConfirmGroup.items.map((it, idx) => (
                          <div key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom last-border-0">
                            <span className="text-truncate mr-2" style={{ maxWidth: '70%' }}>
                              {it.product} {it.qty > 1 ? `(x${it.qty})` : ''}
                            </span>
                            <strong className="text-dark">₦{Number(it.lineTotal !== undefined ? it.lineTotal : it.price || 0).toLocaleString()}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-4 py-3 bg-light d-flex justify-content-end align-items-center"
                  style={{
                    borderTop: '1px solid #e2e8f0',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3 font-weight-semibold"
                    style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                    onClick={() => setPayConfirmGroup(null)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success px-4 font-weight-bold shadow-sm d-inline-flex align-items-center"
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                    }}
                    onClick={() => handleMarkGroupAsPaid(payConfirmGroup, payConfirmMethod)}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1.5"></i> Processing Payment...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle mr-1.5"></i> Yes, Confirm Payment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* ISSUE RECEIPT MODAL (Private Patients Settlement)         */}
      {/* ========================================================= */}
      {isIssueReceiptModalOpen && selectedInvoiceForReceipt && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              zIndex: 1060,
              backgroundColor: 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setIsIssueReceiptModalOpen(false)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1065 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '680px', width: '94%', margin: '1.5rem auto' }}>
              <div
                className="modal-content border-0 shadow-2xl"
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Modal Header */}
                <div
                  className="py-3 px-4 d-flex justify-content-between align-items-center text-white"
                  style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)' }}
                >
                  <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem',
                        flexShrink: 0,
                      }}
                    >
                      <i className="fas fa-file-invoice-dollar"></i>
                    </div>
                    <div>
                      <h5 className="font-weight-bold mb-0 text-white" style={{ fontSize: '1.08rem', letterSpacing: '-0.01em' }}>
                        Issue Official Payment Receipt
                      </h5>
                      <div className="d-flex align-items-center mt-1" style={{ gap: '8px' }}>
                        <span
                          className="badge font-mono font-weight-bold shadow-xs px-2.5 py-1"
                          style={{
                            backgroundColor: '#ffffff',
                            color: '#065f46',
                            borderRadius: '20px',
                            fontSize: '0.74rem',
                          }}
                        >
                          Invoice #{selectedInvoiceForReceipt.invoice_numbers_list && selectedInvoiceForReceipt.invoice_numbers_list.length > 1
                            ? selectedInvoiceForReceipt.invoice_numbers_list.join(', ')
                            : (selectedInvoiceForReceipt.primary_invoice_number || selectedInvoiceForReceipt.invoice_number)}
                        </span>
                        <span className="text-white-50 small" style={{ fontSize: '0.74rem' }}>
                          Settlement Workstation
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm text-white rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: '32px',
                      height: '32px',
                      padding: 0,
                      background: 'rgba(255, 255, 255, 0.15)',
                      border: 'none',
                    }}
                    onClick={() => setIsIssueReceiptModalOpen(false)}
                    title="Close"
                  >
                    <i className="fas fa-times" style={{ fontSize: '1rem' }}></i>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 bg-white" style={{ maxHeight: 'calc(85vh - 70px)', overflowY: 'auto' }}>
                  {/* Patient Info & Bill Summary Banner */}
                  <div
                    className="p-3.5 mb-3.5 rounded-xl d-flex justify-content-between align-items-center flex-wrap"
                    style={{
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: '1 1 280px' }}>
                      <div className="text-uppercase text-muted font-weight-bold mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>
                        Patient Profile
                      </div>
                      <div className="font-weight-bold text-dark" style={{ fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                        {selectedInvoiceForReceipt.patient_name}
                      </div>
                      <div className="d-flex align-items-center flex-wrap mt-1" style={{ gap: '8px', fontSize: '0.8rem' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#e2e8f0',
                            color: '#1e293b',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            padding: '4px 8px',
                          }}
                        >
                          Hospital #: {selectedInvoiceForReceipt.hospital_number || 'N/A'}
                        </span>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            padding: '4px 8px',
                          }}
                        >
                          Sponsor: {selectedInvoiceForReceipt.sponsor || 'Self-Pay / Cash'}
                        </span>
                      </div>
                    </div>

                    <div
                      className="text-right p-2.5 px-3.5 rounded-lg"
                      style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '10px',
                        minWidth: '170px',
                      }}
                    >
                      <span className="text-muted text-uppercase d-block font-weight-bold" style={{ fontSize: '0.68rem', letterSpacing: '0.05em' }}>
                        Total Bill Amount
                      </span>
                      <div className="font-weight-bold" style={{ fontSize: '1.4rem', color: '#047857' }}>
                        ₦{Number(selectedInvoiceForReceipt.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Billed Items List */}
                  {selectedInvoiceForReceipt.items && selectedInvoiceForReceipt.items.length > 0 && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-1.5">
                        <span className="font-weight-bold text-dark text-uppercase" style={{ fontSize: '0.76rem', letterSpacing: '0.04em' }}>
                          <i className="fas fa-list-ul mr-1.5 text-success"></i>
                          Billed Service Items ({selectedInvoiceForReceipt.items.length})
                        </span>
                        <span className="text-muted small" style={{ fontSize: '0.74rem' }}>
                          Items included in this invoice
                        </span>
                      </div>
                      <div
                        className="table-responsive border"
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          maxHeight: '170px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <table className="table table-sm mb-0" style={{ fontSize: '0.82rem' }}>
                          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr style={{ color: '#475569', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              <th className="py-2 pl-3">Item Description</th>
                              <th className="py-2 text-center" style={{ width: '80px' }}>Qty</th>
                              <th className="py-2 pr-3 text-right" style={{ width: '130px' }}>Total (₦)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoiceForReceipt.items.map((it, idx) => (
                              <tr
                                key={idx}
                                style={{
                                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                  borderBottom: '1px solid #f1f5f9',
                                }}
                              >
                                <td className="py-2 pl-3 font-weight-bold text-dark" style={{ verticalAlign: 'middle' }}>
                                  {it.service_item || it.product}
                                </td>
                                <td className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      color: '#334155',
                                      border: '1px solid #e2e8f0',
                                      fontSize: '0.78rem',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    {it.quantity || it.qty || 1}
                                  </span>
                                </td>
                                <td className="py-2 pr-3 text-right font-weight-bold text-dark" style={{ verticalAlign: 'middle' }}>
                                  ₦{Number(it.total || it.lineTotal || (Number(it.price || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Settlement Form */}
                  <form onSubmit={handleConfirmIssueReceipt}>
                    <div className="row">
                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-dark mb-1.5" style={{ fontSize: '0.82rem' }}>
                          Payment Method / Channel <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-control font-weight-bold"
                          style={{
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.88rem',
                            backgroundColor: '#f8fafc',
                          }}
                          value={receiptPaymentType}
                          onChange={(e) => setReceiptPaymentType(e.target.value)}
                        >
                          <option value="Cash">💵 Cash</option>
                          <option value="POS">💳 POS / Debit Card</option>
                          <option value="Transfer">🏦 Bank Transfer</option>
                          <option value="Cheque">📑 Cheque</option>
                          <option value="Bank Deposit">🏢 Bank Deposit</option>
                          <option value="Other">✨ Other</option>
                        </select>
                      </div>

                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-dark mb-1.5" style={{ fontSize: '0.82rem' }}>
                          Amount Paid (₦) <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <div className="input-group-prepend">
                            <span
                              className="input-group-text font-weight-bold"
                              style={{
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                borderColor: '#cbd5e1',
                                borderRadius: '8px 0 0 8px',
                                fontSize: '0.95rem',
                              }}
                            >
                              ₦
                            </span>
                          </div>
                          <input
                            type="number"
                            className="form-control font-weight-bold"
                            step="any"
                            required
                            value={receiptAmountPaid}
                            onChange={(e) => setReceiptAmountPaid(e.target.value)}
                            style={{
                              height: '42px',
                              borderRadius: '0 8px 8px 0',
                              border: '1px solid #cbd5e1',
                              fontSize: '1.05rem',
                              color: '#047857',
                            }}
                          />
                        </div>
                      </div>

                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-dark mb-1.5" style={{ fontSize: '0.82rem' }}>
                          Transaction Ref / POS RRN <span className="text-muted font-weight-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. POS-98421 or GTB-REF-11"
                          value={receiptReferenceCode}
                          onChange={(e) => setReceiptReferenceCode(e.target.value)}
                          style={{
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.88rem',
                          }}
                        />
                      </div>

                      <div className="col-md-6 form-group mb-3">
                        <label className="font-weight-bold text-dark mb-1.5" style={{ fontSize: '0.82rem' }}>
                          Receipt Remarks / Notes <span className="text-muted font-weight-normal">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Cleared at Cashier Desk"
                          value={receiptRemarks}
                          onChange={(e) => setReceiptRemarks(e.target.value)}
                          style={{
                            height: '42px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.88rem',
                          }}
                        />
                      </div>
                    </div>

                    {/* Information Note Box */}
                    <div
                      className="p-3 rounded-xl d-flex align-items-center mb-0 mt-1"
                      style={{
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#dcfce7',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '1rem',
                        }}
                      >
                        <i className="fas fa-print"></i>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: '1.45' }}>
                        <strong>Instant Settlement &amp; Thermal Slip:</strong> Clicking confirm will record the payment, mark the invoice as paid, and print the official 80mm thermal receipt slip automatically.
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div
                      className="d-flex justify-content-end align-items-center mt-3 pt-3 border-top"
                      style={{
                        borderTopColor: '#e2e8f0',
                        gap: '10px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-light border px-4 font-weight-bold"
                        style={{
                          borderRadius: '8px',
                          height: '42px',
                          color: '#475569',
                          borderColor: '#cbd5e1',
                        }}
                        onClick={() => setIsIssueReceiptModalOpen(false)}
                        disabled={issuingReceipt}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success px-4 shadow-sm font-weight-bold d-inline-flex align-items-center justify-content-center"
                        style={{
                          borderRadius: '8px',
                          height: '42px',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
                        }}
                        disabled={issuingReceipt || !receiptAmountPaid || Number(receiptAmountPaid) <= 0}
                      >
                        {issuingReceipt ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i> Issuing Receipt...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-receipt mr-2"></i> Confirm Payment &amp; Issue Receipt (80mm)
                          </>
                        )}
                      </button>
                    </div>
                  </form>
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
                            ₦{Number(printSlip.total_price || printSlip.price || 0).toLocaleString()}
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
                      ₦{Number(printSlip.total_price || printSlip.price || 0).toLocaleString()}
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

      {/* ========================================================= */}
      {/* PRIVATE SPONSOR INVOICE PREVIEW MODAL (Matching User PDF 1) */}
      {/* ========================================================= */}
      {previewPrivateInvoice && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1080, backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
            onClick={() => setPreviewPrivateInvoice(null)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1085 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered my-3" style={{ maxWidth: '860px', maxHeight: '94vh' }}>
              <div
                className="modal-content shadow-2xl border-0"
                style={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
              >
                {/* Header */}
                <div
                  className="py-2.5 px-3 text-white d-flex justify-content-between align-items-center"
                  style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                >
                  <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                    <i className="fas fa-file-invoice text-primary" style={{ fontSize: '1.1rem' }}></i>
                    <span className="font-weight-bold" style={{ fontSize: '0.96rem' }}>
                      Official Private Invoice Document
                    </span>
                    <span className="badge badge-primary font-weight-bold px-2 py-0.5" style={{ fontSize: '0.78rem' }}>
                      Bill #: {previewPrivateInvoice.bill_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm text-white p-0"
                    onClick={() => setPreviewPrivateInvoice(null)}
                    title="Close"
                  >
                    <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
                  </button>
                </div>

                {/* Body (Scrollable A4 Sheet Preview) */}
                <div className="modal-body p-3.5 bg-slate-100" style={{ overflowY: 'auto', flex: '1 1 auto', background: '#f1f5f9' }}>
                  <div
                    className="mx-auto bg-white p-4 text-dark shadow-sm"
                    style={{
                      maxWidth: '780px',
                      borderRadius: '4px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      fontSize: '11px',
                      lineHeight: '1.4',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Top Hospital Header */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="font-weight-bold" style={{ fontSize: '14px', letterSpacing: '0.02em' }}>
                          ISALU HOSPITALS LIMITED
                        </div>
                        <div className="mt-1" style={{ fontSize: '11px' }}>46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria</div>
                        <div style={{ fontSize: '11px' }}>Email: it@isaluhospitals.com | Phone: 08032435674</div>
                      </div>
                      <div className="text-right">
                        <div className="font-weight-bold" style={{ fontSize: '13px' }}>
                          BILL #: {previewPrivateInvoice.bill_number}
                        </div>
                        <div className="text-muted mt-0.5" style={{ fontSize: '11px' }}>
                          {previewPrivateInvoice.created_datetime}
                        </div>
                      </div>
                    </div>

                    {/* Patient Information Box */}
                    <div className="border border-dark d-flex mb-3" style={{ borderWidth: '1px !important' }}>
                      <div className="p-2 border-right border-dark" style={{ width: '58%', fontSize: '11px', lineHeight: '1.5' }}>
                        <div className="font-weight-bold mb-1">PATIENT INFORMATION:</div>
                        <div>Name: <strong className="text-uppercase">{previewPrivateInvoice.patient_name} [ {previewPrivateInvoice.hospital_number} ]</strong></div>
                        <div>Sponsor: <strong>{previewPrivateInvoice.sponsor}</strong></div>
                        <div>Plan Type: <strong>{previewPrivateInvoice.plan}</strong></div>
                        <div>Policy Number: <strong>{previewPrivateInvoice.policy_number || 'NIL'}</strong></div>
                        <div>Enrollee No.: <strong>{previewPrivateInvoice.enrollee_number || 'NIL'}</strong></div>
                      </div>
                      <div className="p-2" style={{ width: '42%', fontSize: '11px', lineHeight: '1.5' }}>
                        <div>Address: <strong>{previewPrivateInvoice.address || 'OGBA'}</strong></div>
                        <div>Phone: <strong>{previewPrivateInvoice.phone || 'N/A'}</strong></div>
                        <div>Gender: <strong>{previewPrivateInvoice.gender || 'N/A'}</strong></div>
                      </div>
                    </div>

                    {/* Document Title */}
                    <div className="text-center my-2">
                      <span className="font-weight-bold" style={{ fontSize: '13px', textDecoration: 'underline', letterSpacing: '0.05em' }}>
                        INVOICE
                      </span>
                    </div>

                    {/* Itemized Table */}
                    <table className="table table-sm table-bordered border-dark mb-3" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr className="bg-light">
                          <th className="text-center py-1" style={{ width: '38px', borderColor: '#000' }}>S/N</th>
                          <th className="py-1" style={{ borderColor: '#000' }}>Description</th>
                          <th className="text-center py-1" style={{ width: '68px', borderColor: '#000' }}>Quantity</th>
                          <th className="text-right py-1" style={{ width: '90px', borderColor: '#000' }}>Rate (N)</th>
                          <th className="text-right py-1" style={{ width: '95px', borderColor: '#000' }}>Discount (N)</th>
                          <th className="text-right py-1" style={{ width: '95px', borderColor: '#000' }}>Amount (N)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewPrivateInvoice.items && previewPrivateInvoice.items.length > 0 ? (
                          previewPrivateInvoice.items.map((it, idx) => {
                            const qty = Number(it.quantity || it.qty || 1);
                            const rate = Number(it.rate !== undefined ? it.rate : (qty > 0 ? (it.total || it.price) / qty : (it.price || 0)));
                            const disc = Number(it.discount || 0);
                            const discAmount = (rate * qty * disc) / 100;
                            const amt = Number(it.total !== undefined ? it.total : (rate * qty - discAmount));
                            return (
                              <tr key={idx}>
                                <td className="text-center py-1" style={{ borderColor: '#000' }}>{idx + 1}</td>
                                <td className="py-1 text-uppercase" style={{ borderColor: '#000' }}>{it.service_item || it.product || 'Clinical Service'}</td>
                                <td className="text-center py-1" style={{ borderColor: '#000' }}>{qty}</td>
                                <td className="text-right py-1" style={{ borderColor: '#000' }}>{rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="text-right py-1" style={{ borderColor: '#000' }}>{discAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="text-right py-1 font-weight-bold" style={{ borderColor: '#000' }}>{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center py-2" style={{ borderColor: '#000' }}>No billable items</td>
                          </tr>
                        )}
                        {/* Subtotal & Summary Rows */}
                        <tr>
                          <td colSpan="4" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>0.00</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>
                            {Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total Bill Amount</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>
                            {Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Net Bill Amount</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>
                            {Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total Sponsor Amount</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>
                            {Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="5" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Amount To Be Received</td>
                          <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>
                            {Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Amount In Words */}
                    <div className="mb-3" style={{ fontSize: '11px' }}>
                      TOTAL BILL AMOUNT IN WORDS: <strong style={{ textDecoration: 'underline' }}>{numberToWords(previewPrivateInvoice.total_amount)} Naira only.</strong>
                    </div>

                    {/* Balances Block */}
                    <div className="text-center my-4" style={{ fontSize: '11px', lineHeight: '1.6' }}>
                      <div>Settled Payments: <strong>0.00</strong> &nbsp;|&nbsp; Running Balance: <strong>{Number(previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                      <div>Previous Balance: <strong>{Number(previewPrivateInvoice.previous_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> &nbsp;|&nbsp; Latest Balance: <strong>{Number(previewPrivateInvoice.latest_balance || previewPrivateInvoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                    </div>

                    {/* Signatures */}
                    <div className="d-flex justify-content-between align-items-end mt-5 pt-3 px-1">
                      <div>
                        <div className="mb-1">............................................</div>
                        <div style={{ fontSize: '11px' }}>Client Signature</div>
                      </div>
                      <div>
                        <div className="mb-1">............................................</div>
                        <div style={{ fontSize: '11px' }}>Issued By: <strong>{previewPrivateInvoice.staff_name || getLoggedInStaffName()}</strong></div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-5 text-muted" style={{ fontSize: '9.5px' }}>
                      {previewPrivateInvoice.patient_name} [ {previewPrivateInvoice.hospital_number} ] - Bill #: {previewPrivateInvoice.bill_number}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="modal-footer bg-light py-2 px-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewPrivateInvoice(null)}>
                    Close
                  </button>
                  <div className="d-flex" style={{ gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-success btn-sm font-weight-bold shadow-xs"
                      onClick={() => {
                        const inv = previewPrivateInvoice;
                        setPreviewPrivateInvoice(null);
                        setSelectedInvoiceForReceipt({
                          invoice_number: inv.invoice_number,
                          patient_name: inv.patient_name,
                          hospital_number: inv.hospital_number,
                          sponsor: inv.sponsor || 'Self-Pay / Cash',
                          items: inv.items || [],
                          total_price: inv.total_amount,
                          created_date: new Date(),
                        });
                        setReceiptAmountPaid(inv.total_amount);
                        setReceiptPaymentType('Cash');
                        setReceiptRemarks(`Settlement for Invoice #${inv.invoice_number}`);
                        setReceiptReferenceCode('');
                        setIsIssueReceiptModalOpen(true);
                      }}
                    >
                      <i className="fas fa-receipt mr-1"></i> Proceed to Issue Receipt
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm font-weight-bold shadow-xs d-inline-flex align-items-center"
                      style={{ gap: '6px' }}
                      onClick={() => handlePrintPrivateInvoice(previewPrivateInvoice)}
                    >
                      <i className="fas fa-print"></i>
                      <span>Print Invoice (A4 Standard)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* HMO CLAIMS FORM PREVIEW MODAL (claimHmo Matching User PDF 2) */}
      {/* ========================================================= */}
      {previewHmoClaim && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1080, backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
            onClick={() => setPreviewHmoClaim(null)}
          />
          <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex: 1085 }}>
            <div className="modal-dialog modal-xl modal-dialog-centered my-3" style={{ maxWidth: '860px', maxHeight: '94vh' }}>
              <div
                className="modal-content shadow-2xl border-0"
                style={{ borderRadius: '10px', overflow: 'hidden', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
              >
                {/* Header */}
                <div
                  className="py-2.5 px-3 text-white d-flex justify-content-between align-items-center"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                >
                  <div className="d-flex align-items-center" style={{ gap: '10px' }}>
                    <i className="fas fa-file-medical text-white" style={{ fontSize: '1.1rem' }}></i>
                    <span className="font-weight-bold" style={{ fontSize: '0.96rem' }}>
                      HMO Claims Form (claimHmo)
                    </span>
                    <span className="badge badge-light text-primary font-weight-bold px-2 py-0.5" style={{ fontSize: '0.78rem' }}>
                      Claim #: {previewHmoClaim.invoice_number}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm text-white p-0"
                    onClick={() => setPreviewHmoClaim(null)}
                    title="Close"
                  >
                    <i className="fas fa-times" style={{ fontSize: '1.2rem' }}></i>
                  </button>
                </div>

                {/* Body (Scrollable A4 Sheet Preview) */}
                <div className="modal-body p-3.5 bg-slate-100" style={{ overflowY: 'auto', flex: '1 1 auto', background: '#f1f5f9' }}>
                  <div
                    className="mx-auto bg-white p-4 text-dark shadow-sm"
                    style={{
                      maxWidth: '780px',
                      borderRadius: '4px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      fontSize: '11px',
                      lineHeight: '1.4',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {/* Top Session */}
                    <div className="mb-2" style={{ fontSize: '11px' }}>
                      <div className="font-weight-bold text-uppercase">
                        {previewHmoClaim.patient_name} [ {previewHmoClaim.hospital_number} ] - SESSION #: {previewHmoClaim.session_number}
                      </div>
                    </div>

                    {/* Centered HMO Sponsor Header */}
                    <div className="text-center mb-3">
                      <div className="font-weight-bold text-uppercase" style={{ fontSize: '15px', letterSpacing: '0.04em' }}>
                        {previewHmoClaim.sponsor && !previewHmoClaim.sponsor.toLowerCase().includes('self-pay')
                          ? previewHmoClaim.sponsor
                          : (previewHmoClaim.plan || 'HMO Sponsor')}
                      </div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        Elephant House, 214 Broad St, Lagos Island, Lagos
                      </div>
                      <div className="mt-2">
                        <span className="font-weight-bold" style={{ fontSize: '13px', textDecoration: 'underline', letterSpacing: '0.04em' }}>
                          CLAIMS FORM
                        </span>
                      </div>
                    </div>

                    {/* Provider & Patient Box */}
                    <div className="border border-dark p-2 mb-2" style={{ borderWidth: '1px !important', fontSize: '10.5px', lineHeight: '1.55' }}>
                      <div>Name Of Provider: <strong>ISALU HOSPITALS LIMITED</strong> &nbsp;&nbsp; Phone no: <strong>08032435674</strong></div>
                      <div>Address of provider: <strong>46, Ijaye Road, Opposite Ogba Shopping Arcade Caterpillar Bus Stop, Lagos, Nigeria</strong></div>
                      <div>Name Of Patient: <strong>{previewHmoClaim.patient_name} [ {previewHmoClaim.hospital_number} ]</strong></div>
                      <div>Id No: <strong>{previewHmoClaim.policy_number || 'NIL'}</strong> &nbsp;&nbsp; Hospital No: <strong>{previewHmoClaim.hospital_number}</strong> &nbsp;&nbsp; Age: <strong>{previewHmoClaim.age || '36'}</strong> &nbsp;&nbsp; Member's Phone No: <strong>{previewHmoClaim.phone}</strong></div>
                      <div>Date Of Attendance: <strong>{previewHmoClaim.bill_date}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Date Of Admission: &nbsp;&nbsp;&nbsp;&nbsp; Date Of Discharge:</div>
                    </div>

                    {/* Diagnosis / Clinical Summary Box */}
                    <div className="border border-dark p-2 mb-3" style={{ borderWidth: '1px !important', fontSize: '10.5px', lineHeight: '1.55' }}>
                      <div>Diagnosis / Clinical Summary : <strong>{previewHmoClaim.purpose}</strong></div>
                      <div>PA code: <strong>{previewHmoClaim.pa_code || 'NIL'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Admission Code:</div>
                    </div>

                    {/* Details of Treatment Header */}
                    <div className="text-center my-2">
                      <span className="font-weight-bold" style={{ fontSize: '12px', textDecoration: 'underline', letterSpacing: '0.04em' }}>
                        DETAILS OF TREATMENT
                      </span>
                    </div>

                    {/* Categorized Treatment Items */}
                    {(() => {
                      const items = previewHmoClaim.items || [];
                      const services = [];
                      const drugs = [];
                      const investigations = [];
                      let servTotal = 0;
                      let drugTotal = 0;
                      let invTotal = 0;
                      let consultTot = 0;
                      let regTot = 0;

                      items.forEach((it) => {
                        const raw = (it.service_item || it.product || '').trim();
                        const qty = Number(it.quantity || it.qty || 1);
                        const rate = Number(it.rate !== undefined ? it.rate : (qty > 0 ? (it.total || it.price) / qty : (it.price || 0)));
                        const disc = Number(it.discount || 0);
                        const lineTot = Number(it.total !== undefined ? it.total : (rate * qty * (1 - disc / 100)));
                        const lRaw = String(raw || '').toLowerCase();
                        const cat = String(it.category?.category || it.category?.name || it.category || '').toLowerCase();

                        if (lRaw.includes('consultation')) consultTot += lineTot;
                        if (lRaw.includes('registration')) regTot += lineTot;

                        const claimTitle = raw.endsWith('(Claim)') ? raw : `${raw} (Claim)`;

                        const isInvestigation = cat === 'investigation' || cat === 'lab' || cat === 'radiology' ||
                          lRaw.startsWith('lab:') || lRaw.includes('lab:') || lRaw.includes('scan') ||
                          lRaw.includes('test') || lRaw.includes('screening') || lRaw.includes('count') ||
                          lRaw.includes('urine') || lRaw.includes('x-ray') || lRaw.includes('mcs') ||
                          lRaw.includes('protein') || lRaw.includes('hbsag') || lRaw.includes('widal') ||
                          lRaw.includes('malaria');

                        const isDrug = !isInvestigation && (cat === 'prescription' || cat === 'drug' || cat === 'pharmacy' ||
                          lRaw.includes('tablet') || lRaw.includes('capsule') || lRaw.includes('syrup') ||
                          lRaw.includes('suspension') || lRaw.includes('injection') || lRaw.includes('coartem') ||
                          lRaw.includes('artemether') || lRaw.includes('amlodipine') || lRaw.includes('amoxicillin') ||
                          lRaw.includes('paracetamol') || lRaw.includes('antibiotic') || lRaw.includes('mg') ||
                          lRaw.includes('ml') || lRaw.includes('cap') || lRaw.includes('tab'));

                        if (isInvestigation) {
                          investigations.push({ desc: claimTitle, qty, rate, total: lineTot });
                          invTotal += lineTot;
                        } else if (isDrug) {
                          drugs.push({ desc: claimTitle, qty, rate, total: lineTot });
                          drugTotal += lineTot;
                        } else {
                          services.push({ desc: claimTitle, qty, rate, total: lineTot });
                          servTotal += lineTot;
                        }
                      });

                      return (
                        <>
                          {/* Services / Procedure */}
                          <div className="font-weight-bold mb-1" style={{ fontSize: '11px' }}>Services/Procedure:</div>
                          <table className="table table-sm table-bordered border-dark mb-2" style={{ fontSize: '10.5px' }}>
                            <thead>
                              <tr className="bg-light">
                                <th className="py-1" style={{ borderColor: '#000' }}>Description</th>
                                <th className="text-center py-1" style={{ width: '70px', borderColor: '#000' }}>Quantity</th>
                                <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Unit Price</th>
                                <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {services.length > 0 ? (
                                services.map((s, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1" style={{ borderColor: '#000' }}><strong>{s.desc}</strong></td>
                                    <td className="text-center py-1" style={{ borderColor: '#000' }}>{s.qty}</td>
                                    <td className="text-right py-1" style={{ borderColor: '#000' }}>{s.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="text-right py-1 font-weight-bold" style={{ borderColor: '#000' }}>{s.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="4" className="text-center py-1 text-muted font-italic" style={{ borderColor: '#000' }}>No specific procedures</td></tr>
                              )}
                              <tr>
                                <td colSpan="3" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total</td>
                                <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>{servTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Drugs */}
                          <div className="font-weight-bold mb-1 mt-2" style={{ fontSize: '11px' }}>Drugs:</div>
                          {drugs.length > 0 ? (
                            <table className="table table-sm table-bordered border-dark mb-2" style={{ fontSize: '10.5px' }}>
                              <thead>
                                <tr className="bg-light">
                                  <th className="py-1" style={{ borderColor: '#000' }}>Description</th>
                                  <th className="text-center py-1" style={{ width: '70px', borderColor: '#000' }}>Quantity</th>
                                  <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Unit Price</th>
                                  <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {drugs.map((d, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1" style={{ borderColor: '#000' }}><strong>{d.desc}</strong></td>
                                    <td className="text-center py-1" style={{ borderColor: '#000' }}>{d.qty}</td>
                                    <td className="text-right py-1" style={{ borderColor: '#000' }}>{d.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="text-right py-1 font-weight-bold" style={{ borderColor: '#000' }}>{d.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan="3" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total</td>
                                  <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>{drugTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          ) : (
                            <div className="mb-2 text-muted font-italic" style={{ fontSize: '10.5px' }}></div>
                          )}

                          {/* Investigations */}
                          <div className="font-weight-bold mb-1 mt-2" style={{ fontSize: '11px' }}>Investigations:</div>
                          <table className="table table-sm table-bordered border-dark mb-3" style={{ fontSize: '10.5px' }}>
                            <thead>
                              <tr className="bg-light">
                                <th className="py-1" style={{ borderColor: '#000' }}>Description</th>
                                <th className="text-center py-1" style={{ width: '70px', borderColor: '#000' }}>Quantity</th>
                                <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Unit Price (₦)</th>
                                <th className="text-right py-1" style={{ width: '100px', borderColor: '#000' }}>Total (₦)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {investigations.length > 0 ? (
                                investigations.map((iv, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1" style={{ borderColor: '#000' }}><strong>{iv.desc}</strong></td>
                                    <td className="text-center py-1" style={{ borderColor: '#000' }}>{iv.qty}</td>
                                    <td className="text-right py-1" style={{ borderColor: '#000' }}>{iv.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="text-right py-1 font-weight-bold" style={{ borderColor: '#000' }}>{iv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr><td colSpan="4" className="text-center py-1 text-muted font-italic" style={{ borderColor: '#000' }}>No investigations ordered</td></tr>
                              )}
                              <tr>
                                <td colSpan="3" className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>Total</td>
                                <td className="text-right font-weight-bold py-1" style={{ borderColor: '#000' }}>{invTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Bottom Totals */}
                          <div className="mb-3" style={{ fontSize: '11px', lineHeight: '1.55' }}>
                            <div>CONSULTATION: <strong>₦{consultTot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                            <div>REGISTRATION: <strong>₦{regTot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                            <div className="font-weight-bold mt-1" style={{ fontSize: '13px' }}>
                              Total (N): <strong>₦{Number(previewHmoClaim.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Enrollee Signature & Date */}
                    <div className="mt-4 pt-2" style={{ fontSize: '10.5px' }}>
                      <div className="mb-1">{previewHmoClaim.bill_date}</div>
                      <div>Enrollee signature and date: _____________________________________</div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="modal-footer bg-light py-2 px-3 d-flex justify-content-between">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreviewHmoClaim(null)}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm font-weight-bold shadow-xs d-inline-flex align-items-center"
                    style={{ gap: '6px' }}
                    onClick={() => handlePrintHmoClaim(previewHmoClaim)}
                  >
                    <i className="fas fa-print"></i>
                    <span>Print Claims Form (A4 claimHmo)</span>
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
