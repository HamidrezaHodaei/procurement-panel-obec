import type { Option } from './constants';
import { BRAND_KIND, PAYMENT_KIND_OPTIONS } from './constants';

/**
 * Declarative description of every "اطلاعات پایه" table. The settings UI, the API and the
 * validation are all generated from this list — adding another simple lookup table only
 * needs a migration + one entry here.
 */
export type MasterKey =
  | 'companies' | 'itemCategories' | 'items' | 'agents' | 'executors'
  | 'brandsDomestic' | 'brandsForeign' | 'currencies' | 'paymentMethods'
  | 'guaranteeTypes';

export type MasterField = {
  key: string; // camelCase JSON key
  column: string; // sql column
  label: string;
  type: 'text' | 'number' | 'select' | 'ref';
  required?: boolean;
  options?: Option[]; // for 'select'
  ref?: MasterKey; // for 'ref' (select from another master)
  immutable?: boolean; // cannot change after creation
  min?: number;
  max?: number;
  upper?: boolean;
  showInTable?: boolean;
};

export type MasterDef = {
  key: MasterKey;
  table: string;
  title: string;
  singular: string;
  /** rows are limited/created with fixed column values (e.g. brands by kind) */
  fixed?: Record<string, string>;
  fields: MasterField[];
  orderBy: string;
};

const name: MasterField = { key: 'name', column: 'name', label: 'نام', type: 'text', required: true, showInTable: true };

export const MASTERS: MasterDef[] = [
  { key: 'companies', table: 'companies', title: 'شرکت‌های متقاضی', singular: 'شرکت', fields: [name], orderBy: 'name' },
  { key: 'itemCategories', table: 'item_categories', title: 'دسته‌بندی کالاها', singular: 'دسته‌بندی', fields: [name], orderBy: 'name' },
  {
    key: 'items', table: 'items', title: 'فهرست کالاها', singular: 'کالا', orderBy: 'name',
    fields: [name, { key: 'categoryId', column: 'category_id', label: 'دسته‌بندی', type: 'ref', ref: 'itemCategories', required: true, showInTable: true }]
  },
  { key: 'agents', table: 'agents', title: 'مأموران خرید', singular: 'مأمور خرید', fields: [name], orderBy: 'name' },
  { key: 'executors', table: 'executors', title: 'مجریان خرید', singular: 'مجری خرید', fields: [name], orderBy: 'name' },
  { key: 'brandsDomestic', table: 'brands', title: BRAND_KIND.domestic + 'ها', singular: 'برند داخلی', fixed: { kind: 'domestic' }, fields: [name], orderBy: 'name' },
  { key: 'brandsForeign', table: 'brands', title: BRAND_KIND.foreign + 'ها', singular: 'برند خارجی', fixed: { kind: 'foreign' }, fields: [name], orderBy: 'name' },
  {
    key: 'currencies', table: 'currencies', title: 'واحدهای پولی', singular: 'واحد پولی', orderBy: 'id',
    fields: [
      { key: 'code', column: 'code', label: 'کد (مثلاً USD)', type: 'text', required: true, upper: true, showInTable: true, immutable: true },
      name,
      { key: 'symbol', column: 'symbol', label: 'نماد', type: 'text', showInTable: true },
      { key: 'decimals', column: 'decimals', label: 'تعداد اعشار', type: 'number', min: 0, max: 4, required: true, immutable: true, showInTable: true }
    ]
  },
  {
    key: 'paymentMethods', table: 'payment_methods', title: 'روش‌های پرداخت', singular: 'روش پرداخت', orderBy: 'id',
    fields: [name, { key: 'kind', column: 'kind', label: 'نوع (تعیین‌کننده بخش‌های فرم)', type: 'select', options: PAYMENT_KIND_OPTIONS, required: true, showInTable: true }]
  },
  { key: 'guaranteeTypes', table: 'guarantee_types', title: 'انواع ضمانت', singular: 'نوع ضمانت', fields: [name], orderBy: 'name' }
];

export const MASTER_BY_KEY = Object.fromEntries(MASTERS.map((m) => [m.key, m])) as Record<MasterKey, MasterDef>;
