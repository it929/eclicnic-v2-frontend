/**
 * Department normalization, module catalogs, and routing utilities
 */

export const DEPARTMENT_LIST = [
  { key: 'frontdesk', label: '🏥 Front Desk', icon: 'fa-hospital-user', defaultTab: 'dashboard' },
  { key: 'nursing', label: '💉 Nursing', icon: 'fa-user-nurse', defaultTab: 'queues' },
  { key: 'clinical', label: '👨‍⚕️ Clinical', icon: 'fa-user-md', defaultTab: 'queues' },
  { key: 'inventory', label: '📦 Inventory', icon: 'fa-boxes', defaultTab: 'inventory' },
  { key: 'ipd1', label: '💊 IPD Pharmacy 1', icon: 'fa-pills', defaultTab: 'ipd' },
  { key: 'ipd2', label: '💊 IPD Pharmacy 2', icon: 'fa-pills', defaultTab: 'ipd' },
  { key: 'ipd3', label: '💊 IPD Pharmacy 3', icon: 'fa-pills', defaultTab: 'ipd' },
  { key: 'opd1', label: '💊 OPD Pharmacy 1', icon: 'fa-capsules', defaultTab: 'pharmacy' },
  { key: 'opd2', label: '💊 OPD Pharmacy 2', icon: 'fa-capsules', defaultTab: 'pharmacy' },
  { key: 'laboratory', label: '🔬 Laboratory', icon: 'fa-flask', defaultTab: 'radiolab' },
  { key: 'radiology', label: '📡 Radiology', icon: 'fa-x-ray', defaultTab: 'radiology' },
  { key: 'billings', label: '💰 Billings Unit', icon: 'fa-money-bill-wave', defaultTab: 'billings' },
  { key: 'reporting', label: '📈 Reporting Unit', icon: 'fa-chart-line', defaultTab: 'reporting' },
];

/**
 * Master catalog of Hospital Modules available for department assignment
 */
export const AVAILABLE_MODULES = [
  {
    id: 'frontdesk',
    name: 'Front Desk & Reception',
    icon: 'fa-hospital-user',
    color: '#4e73df',
    badgeClass: 'badge-primary',
    description: 'Patient registrations, hospital card search, appointment scheduling & daily attendance',
    defaultDepartments: ['frontdesk', 'admin', 'cmd'],
    primaryTab: 'patients',
  },
  {
    id: 'nursing',
    name: 'Nursing Station',
    icon: 'fa-user-nurse',
    color: '#1cc88a',
    badgeClass: 'badge-success',
    description: 'Nurse triage, patient waiting lists, vital signs, ward beds & inpatient admissions',
    defaultDepartments: ['nursing', 'admin', 'cmd'],
    primaryTab: 'queues',
  },
  {
    id: 'clinical',
    name: 'Clinical & Consultations',
    icon: 'fa-user-md',
    color: '#36b9cc',
    badgeClass: 'badge-info',
    description: 'Doctor consultations, medical diagnoses, diagnostic test ordering & lab/scan results review',
    defaultDepartments: ['clinical', 'cmd', 'admin'],
    primaryTab: 'queues',
  },
  {
    id: 'inventory',
    name: 'Inventory & Store',
    icon: 'fa-boxes',
    color: '#f6c23e',
    badgeClass: 'badge-warning',
    description: 'Hospital stock catalog, vendor management, internal pharmacy transfers & store requisitions',
    defaultDepartments: ['inventory', 'admin', 'cmd'],
    primaryTab: 'inventory',
  },
  {
    id: 'ipd_pharmacy',
    name: 'Inpatient Pharmacy (IPD)',
    icon: 'fa-pills',
    color: '#e74a3b',
    badgeClass: 'badge-danger',
    description: 'Inpatient drug chart dispensing, ward stock allocations & IPD pharmacy stores 1, 2, 3',
    defaultDepartments: ['ipd1', 'ipd2', 'ipd3', 'admin', 'cmd'],
    primaryTab: 'ipd',
  },
  {
    id: 'opd_pharmacy',
    name: 'Outpatient Pharmacy (OPD)',
    icon: 'fa-capsules',
    color: '#6f42c1',
    badgeClass: 'badge-secondary',
    description: 'Outpatient prescription dispensing, drug price catalog & cashier medication clearance',
    defaultDepartments: ['opd1', 'opd2', 'admin', 'cmd'],
    primaryTab: 'pharmacy',
  },
  {
    id: 'laboratory',
    name: 'Laboratory Unit',
    icon: 'fa-flask',
    color: '#fd7e14',
    badgeClass: 'badge-warning',
    description: 'Pathology test waiting queues, specimen results recording & validated test reports',
    defaultDepartments: ['laboratory', 'admin', 'cmd'],
    primaryTab: 'radiolab',
  },
  {
    id: 'radiology',
    name: 'Radiology & Imaging',
    icon: 'fa-x-ray',
    color: '#20c997',
    badgeClass: 'badge-success',
    description: 'X-Ray, Ultrasound, scan order queue, image review & diagnostic imaging impressions',
    defaultDepartments: ['radiology', 'admin', 'cmd'],
    primaryTab: 'radiolab',
  },
  {
    id: 'billings',
    name: 'Billings & Accounts',
    icon: 'fa-money-bill-wave',
    color: '#28a745',
    badgeClass: 'badge-success',
    description: 'Patient invoices, payment receipts, customer deposit accounts, refunds & transactions',
    defaultDepartments: ['billings', 'frontdesk', 'admin', 'cmd'],
    primaryTab: 'billings',
  },
  {
    id: 'anc',
    name: 'Antenatal Care (ANC)',
    icon: 'fa-baby',
    color: '#e83e8c',
    badgeClass: 'badge-danger',
    description: 'Maternal health registration, antenatal booking, clinic visits & gestation records',
    defaultDepartments: ['nursing', 'clinical', 'frontdesk', 'admin', 'cmd'],
    primaryTab: 'anc',
  },
  {
    id: 'reporting',
    name: 'Reporting & Analytics',
    icon: 'fa-chart-line',
    color: '#6610f2',
    badgeClass: 'badge-info',
    description: 'Ambulatory, in-patient, hospital revenue, diagnosis sheets & government health returns',
    defaultDepartments: ['reporting', 'admin', 'cmd'],
    primaryTab: 'reporting',
  },
  {
    id: 'taskmanager',
    name: 'Task Manager (Admin Tools)',
    icon: 'fa-tasks',
    color: '#4e73df',
    badgeClass: 'badge-primary',
    description: 'Staff directory, account credentials, online user sessions & system activities audit',
    defaultDepartments: ['admin', 'cmd'],
    primaryTab: 'taskmanager',
  },
  {
    id: 'tariffs',
    name: 'Manage Tariff Plans',
    icon: 'fa-tags',
    color: '#17a2b8',
    badgeClass: 'badge-info',
    description: 'Service price schedules, laboratory fees, admission charges & patient care packages',
    defaultDepartments: ['admin', 'cmd'],
    primaryTab: 'tariffs',
  },
];

/**
 * Normalizes any category or department string into its internal module key.
 */
export function normalizeDepartmentKey(deptName) {
  if (!deptName) return 'frontdesk';
  const str = String(deptName).toLowerCase().trim();

  if (str.includes('nurse') || str.includes('nursing')) return 'nursing';
  if (str.includes('clin') || str.includes('doctor')) return 'clinical';
  if (str.includes('inv')) return 'inventory';
  if (str.includes('ipd') && str.includes('2')) return 'ipd2';
  if (str.includes('ipd') && str.includes('3')) return 'ipd3';
  if (str.includes('ipd') || (str.includes('inpatient') && str.includes('pharm'))) return 'ipd1';
  if (str.includes('opd') && str.includes('2')) return 'opd2';
  if (str.includes('opd') || str.includes('pharm')) return 'opd1';
  if (str.includes('lab')) return 'laboratory';
  if (str.includes('radio') || str.includes('xray') || str.includes('scan')) return 'radiology';
  if (str.includes('bill') || str.includes('account')) return 'billings';
  if (str.includes('report') || str.includes('record')) return 'reporting';
  if (str.includes('front') || str.includes('desk') || str.includes('recept')) return 'frontdesk';
  if (str.includes('admin')) return 'frontdesk';
  if (str.includes('cmd')) return 'clinical';

  return str.replace(/[^a-z0-9]/g, '') || 'frontdesk';
}

/**
 * Returns default preset modules for a given department key.
 */
export function getDefaultModulesForDepartment(deptKey) {
  const normalized = normalizeDepartmentKey(deptKey);
  const matched = AVAILABLE_MODULES.filter((m) => m.defaultDepartments.includes(normalized));
  if (matched.length > 0) {
    return matched.map((m) => m.id);
  }
  // Generic fallback for any newly added department
  return ['frontdesk', 'nursing'];
}

/**
 * Checks whether a module is permitted for the given staff member.
 */
export function isModuleAllowed(moduleId, assignedModules, userRole) {
  const role = String(userRole || '').toLowerCase();
  if (role === 'admin' || role === 'cmd') return true;

  const key = normalizeDepartmentKey(role);

  // If specific modules are assigned in the database
  if (Array.isArray(assignedModules) && assignedModules.length > 0) {
    return assignedModules.includes(moduleId);
  }

  // Fallback to default modules for this department
  const mod = AVAILABLE_MODULES.find((m) => m.id === moduleId);
  if (!mod) return false;
  return mod.defaultDepartments.includes(key);
}

/**
 * Returns the default active workspace tab for a given department key.
 */
export function getDefaultTabForDepartment(deptKey) {
  const item = DEPARTMENT_LIST.find((d) => d.key === deptKey);
  return item ? item.defaultTab : 'dashboard';
}

/**
 * Formats a department entry from the database into a consistent structure for UI dropdowns.
 */
export function formatDepartmentItem(dbDept) {
  if (!dbDept) return null;
  const name = typeof dbDept === 'string' ? dbDept : (dbDept.department || dbDept.name || '');
  const id = typeof dbDept === 'object' ? dbDept.id : undefined;
  const staffCount = typeof dbDept === 'object' ? dbDept.staff_count : undefined;
  const modules = typeof dbDept === 'object' && Array.isArray(dbDept.modules) ? dbDept.modules : [];
  const key = normalizeDepartmentKey(name);
  const known = DEPARTMENT_LIST.find((d) => d.key === key);

  const emojiMap = {
    frontdesk: '🏥',
    nursing: '💉',
    clinical: '👨‍⚕️',
    inventory: '📦',
    ipd1: '💊',
    ipd2: '💊',
    ipd3: '💊',
    opd1: '💊',
    opd2: '💊',
    laboratory: '🔬',
    radiology: '📡',
    billings: '💰',
    reporting: '📈',
  };

  const emoji = emojiMap[key] || '🏢';
  const label = known ? known.label : `${emoji} ${name}`;
  const icon = known ? known.icon : 'fa-building';
  const defaultTab = known ? known.defaultTab : 'queues';

  return {
    id,
    name,
    key,
    label,
    icon,
    defaultTab,
    staffCount,
    modules,
  };
}
