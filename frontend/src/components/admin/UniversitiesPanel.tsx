import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, CheckSquare, ChevronDown, ChevronUp, Download, Edit, Loader2, Plus, RefreshCw, Save, Search, Square, Trash2, Upload, X } from 'lucide-react';
import {
  AdminUniversityCluster,
  AdminUniversityCategoryItem,
  AdminUniversityImportInitResponse,
  ApiUniversity,
  adminBulkDeleteUniversities,
  adminBulkUpdateUniversities,
  adminCommitUniversityImportWithMode,
  adminCreateUniversityCategory,
  adminCreateUniversity,
  adminCreateUniversityCluster,
  adminDeleteUniversityCategory,
  adminDeleteUniversity,
  adminDeleteUniversityCluster,
  adminDownloadUniversityImportErrors,
  adminDownloadUniversityImportTemplate,
  adminExportUniversitiesSheet,
  adminGetUniversities,
  adminGetUniversityCategoryMaster,
  adminGetUniversityCategories,
  adminGetUniversityClusterById,
  adminGetUniversityClusters,
  adminGetHomeSettings,
  adminGetUniversityImportJob,
  adminInitUniversityImport,
  adminResolveUniversityClusterMembers,
  adminSyncUniversityClusterDates,
  adminToggleUniversityCategory,
  adminToggleUniversityStatus,
  adminUpdateHomeSettings,
  adminUpdateUniversity,
  adminUpdateUniversityCategory,
  adminUpdateUniversityCluster,
  adminValidateUniversityImport,
} from '../../services/api';
import { useAdminRuntimeFlags } from '../../hooks/useAdminRuntimeFlags';
import { downloadFile } from '../../utils/download';

type Tab = 'universities' | 'categories' | 'clusters' | 'import';
type StatusFilter = 'all' | 'active' | 'inactive' | 'archived';
type SortOrder = 'asc' | 'desc';
type BulkAction = '' | 'softDelete' | 'hardDelete' | 'setCluster' | 'setCategory' | 'setStatus' | 'setFeatured';

type UniversityForm = Partial<ApiUniversity> & {
  clusterSyncLocked?: boolean;
  clusterDateOverrides?: {
    applicationStartDate?: string;
    applicationEndDate?: string;
    scienceExamDate?: string;
    artsExamDate?: string;
    businessExamDate?: string;
  };
};

type ClusterForm = {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  categoryRules: string[];
  categoryRuleIds: string[];
  manualMembers: string[];
  dates: {
    applicationStartDate?: string;
    applicationEndDate?: string;
    scienceExamDate?: string;
    commerceExamDate?: string;
    artsExamDate?: string;
  };
  homeVisible: boolean;
  homeOrder: number;
};

const DEFAULT_FORM: UniversityForm = {
  name: '', shortForm: '', category: '', address: '', contactNumber: '', email: '', website: '', admissionWebsite: '',
  totalSeats: '', scienceSeats: '', artsSeats: '', businessSeats: '',
  applicationStartDate: '', applicationEndDate: '', scienceExamDate: '', artsExamDate: '', businessExamDate: '',
  shortDescription: '', description: '', featured: false, featuredOrder: 0, isActive: true, clusterSyncLocked: false,
  clusterDateOverrides: { applicationStartDate: '', applicationEndDate: '', scienceExamDate: '', artsExamDate: '', businessExamDate: '' },
};

const DEFAULT_CLUSTER_FORM: ClusterForm = {
  name: '', slug: '', description: '', isActive: true, categoryRules: [], categoryRuleIds: [], manualMembers: [], dates: {}, homeVisible: false, homeOrder: 0,
};

type CategoryForm = {
  name: string;
  slug: string;
  labelBn: string;
  labelEn: string;
  homeOrder: number;
  homeHighlight: boolean;
  isActive: boolean;
};

const DEFAULT_CATEGORY_FORM: CategoryForm = {
  name: '',
  slug: '',
  labelBn: '',
  labelEn: '',
  homeOrder: 0,
  homeHighlight: false,
  isActive: true,
};

const IMPORT_FIELDS = [
  'category', 'clusterGroup', 'name', 'shortForm', 'establishedYear', 'address', 'contactNumber', 'email', 'websiteUrl', 'admissionUrl',
  'totalSeats', 'seatsScienceEng', 'seatsArtsHum', 'seatsBusiness',
  'applicationStartDate', 'applicationEndDate', 'examDateScience', 'examDateArts', 'examDateBusiness',
  'examCenters', 'logoUrl',
];

const COLUMN_MAP: Record<string, string> = {
  category: 'Category',
  clusterGroup: 'Cluster',
  name: 'Name',
  shortForm: 'Short Form',
  establishedYear: 'Established',
  applicationStartDate: 'App Start',
  applicationEndDate: 'App End',
  examDateScience: 'Science Exam',
  examDateArts: 'Arts Exam',
  examDateBusiness: 'Business Exam',
  totalSeats: 'Total Seats',
  seatsScienceEng: 'Science Seats',
  seatsArtsHum: 'Arts Seats',
  seatsBusiness: 'Business Seats',
  contactNumber: 'Contact',
  address: 'Address',
  email: 'Email',
  websiteUrl: 'Website',
  admissionUrl: 'Admission Site',
  examCenters: 'Exam Centers',
  logoUrl: 'Logo',
  updatedAt: 'Updated',
};

const SORT_COLUMNS = Object.keys(COLUMN_MAP);

const COLUMN_VISIBILITY: Record<string, string> = {
  name: "table-cell",
  shortForm: "table-cell",
  category: "table-cell",
  clusterGroup: "hidden xl:table-cell",
  applicationStartDate: "hidden xl:table-cell",
  applicationEndDate: "hidden xl:table-cell",
  examDateScience: "hidden 2xl:table-cell",
  examDateBusiness: "hidden 2xl:table-cell",
  examDateArts: "hidden 2xl:table-cell",
  establishedYear: "hidden 2xl:table-cell",
  totalSeats: "hidden lg:table-cell",
  seatsScienceEng: "hidden 2xl:table-cell",
  seatsArtsHum: "hidden 2xl:table-cell",
  seatsBusiness: "hidden 2xl:table-cell",
  contactNumber: "hidden 2xl:table-cell",
  address: "hidden 2xl:table-cell",
  email: "hidden 2xl:table-cell",
  websiteUrl: "hidden 2xl:table-cell",
  admissionUrl: "hidden 2xl:table-cell",
  examCenters: "hidden 2xl:table-cell",
  logoUrl: "hidden 2xl:table-cell",
  updatedAt: "hidden md:table-cell",
};

function dateInput(v?: string): string { if (!v) return ''; const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); }
function dateText(v?: string): string { if (!v) return 'N/A'; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(); }
function numOrUndef(v: unknown): number | undefined { if (v === '' || v === undefined || v === null) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; }
function AdminDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
      />
    </div>
  );
}

export default function UniversitiesPanel() {
  const queryClient = useQueryClient();
  const runtimeFlags = useAdminRuntimeFlags();
  const [tab, setTab] = useState<Tab>('universities');
  const [universities, setUniversities] = useState<ApiUniversity[]>([]);
  const [allCandidates, setAllCandidates] = useState<ApiUniversity[]>([]);
  const [clusters, setClusters] = useState<AdminUniversityCluster[]>([]);
  const [categoryMaster, setCategoryMaster] = useState<AdminUniversityCategoryItem[]>([]);
  const [categoryFacets, setCategoryFacets] = useState<Array<{ name: string; count: number }>>([]);
  const [selectedHomeCategories, setSelectedHomeCategories] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clusterFilter, setClusterFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [savingHomeSelection, setSavingHomeSelection] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [targetClusterId, setTargetClusterId] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive'>('active');
  const [targetFeatured, setTargetFeatured] = useState<'featured' | 'not_featured'>('featured');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [modalUniversity, setModalUniversity] = useState<null | ApiUniversity | 'create'>(null);
  const [form, setForm] = useState<UniversityForm>(DEFAULT_FORM);
  const [savingUniversity, setSavingUniversity] = useState(false);

  const [clusterModal, setClusterModal] = useState<null | AdminUniversityCluster | 'create'>(null);
  const [clusterForm, setClusterForm] = useState<ClusterForm>(DEFAULT_CLUSTER_FORM);
  const [clusterSearch, setClusterSearch] = useState('');
  const [savingCluster, setSavingCluster] = useState(false);

  const [categoryModal, setCategoryModal] = useState<null | AdminUniversityCategoryItem | 'create'>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(DEFAULT_CATEGORY_FORM);
  const [savingCategory, setSavingCategory] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importInit, setImportInit] = useState<AdminUniversityImportInitResponse | null>(null);
  const [importJobId, setImportJobId] = useState('');
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importDefaults, setImportDefaults] = useState<Record<string, unknown>>({});
  const [importValidation, setImportValidation] = useState<Record<string, unknown> | null>(null);
  const [importCommit, setImportCommit] = useState<Record<string, unknown> | null>(null);
  const [importMode, setImportMode] = useState<'create-only' | 'update-existing'>('update-existing');
  const [initializingImport, setInitializingImport] = useState(false);
  const [validatingImport, setValidatingImport] = useState(false);
  const [committingImport, setCommittingImport] = useState(false);
  const [refreshingImportStatus, setRefreshingImportStatus] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const pageAllSelected = universities.length > 0 && universities.every((u) => selectedIds.includes(u._id));
  const hasSelection = selectedIds.length > 0;
  const candidateFiltered = useMemo(() => {
    const q = clusterSearch.trim().toLowerCase();
    if (!q) return allCandidates;
    return allCandidates.filter((u) => `${u.name || ''} ${u.shortForm || ''} ${u.category || ''}`.toLowerCase().includes(q));
  }, [allCandidates, clusterSearch]);
  const categoryCountMap = useMemo(
    () => new Map(categoryFacets.map((item) => [item.name, Number(item.count || 0)])),
    [categoryFacets],
  );
  const homeCategoryOptions = useMemo(() => {
    const source = categoryMaster.length > 0
      ? categoryMaster.map((item, index) => ({
        name: String(item.name || '').trim(),
        label: String(item.labelBn || item.name || '').trim(),
        count: categoryCountMap.get(item.name) || 0,
        order: index,
      }))
      : categoryFacets.map((item, index) => ({
        name: String(item.name || '').trim(),
        label: String(item.name || '').trim(),
        count: Number(item.count || 0),
        order: index,
      }));

    const merged = new Map<string, { key: string; name: string; label: string; count: number; order: number }>();
    source.forEach((item) => {
      if (!item.name) return;
      const key = item.name.toLowerCase();
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          key,
          name: item.name,
          label: item.label || item.name,
          count: item.count,
          order: item.order,
        });
        return;
      }
      existing.count += item.count;
      if (!existing.label && item.label) existing.label = item.label;
      existing.order = Math.min(existing.order, item.order);
    });

    return Array.from(merged.values()).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }, [categoryMaster, categoryFacets, categoryCountMap]);
  const categorySelectOptions = useMemo(() => {
    const pool = [...homeCategoryOptions.map((item) => item.name), String(form.category || '').trim()];
    const merged = new Map<string, string>();
    pool.forEach((name) => {
      if (!name) return;
      const normalized = name.toLowerCase();
      if (!merged.has(normalized)) merged.set(normalized, name);
    });
    return Array.from(merged.values());
  }, [homeCategoryOptions, form.category]);

  const invalidateUniversityQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['universities'] }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['home-settings'] }),
      queryClient.invalidateQueries({ queryKey: ['home_settings'] }),
    ]);
  };

  const loadUniversities = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25, sortBy, sortOrder, status: statusFilter };
      if (query.trim()) params.q = query.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (clusterFilter) params.clusterId = clusterFilter;
      const r = await adminGetUniversities(params);
      setUniversities(r.data.universities || []);
      setTotalCount(Number(r.data.pagination?.total || 0));
      setTotalPages(Number(r.data.pagination?.pages || 1));
    } catch {
      toast.error('Failed to load universities');
    } finally { setLoading(false); }
  };

  const loadFacets = async () => {
    try { const r = await adminGetUniversityCategories({ status: statusFilter }); setCategoryFacets(r.data.categories || []); } catch { setCategoryFacets([]); }
  };
  const loadCategoryMaster = async () => {
    try {
      const r = await adminGetUniversityCategoryMaster({ status: 'all' });
      setCategoryMaster(r.data.categories || []);
    } catch {
      setCategoryMaster([]);
    }
  };

  const loadClusters = async () => { try { const r = await adminGetUniversityClusters(); setClusters(r.data.clusters || []); } catch { setClusters([]); } };
  const loadCandidates = async () => { try { const r = await adminGetUniversities({ page: 1, limit: 500, status: 'all', sortBy: 'name', sortOrder: 'asc' }); setAllCandidates(r.data.universities || []); } catch { setAllCandidates([]); } };
  const loadHomeSelection = async () => {
    try {
      const response = await adminGetHomeSettings();
      const highlighted = response.data?.homeSettings?.highlightedCategories || [];
      const categories = highlighted
        .filter((item) => item?.enabled !== false && item?.category)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((item) => String(item.category));
      setSelectedHomeCategories(categories);
    } catch {
      setSelectedHomeCategories([]);
    }
  };

  useEffect(() => { loadUniversities(); setSelectedIds([]); }, [page, query, categoryFilter, statusFilter, clusterFilter, sortBy, sortOrder]);
  useEffect(() => { loadFacets(); }, [statusFilter]);
  useEffect(() => { loadClusters(); loadCandidates(); loadHomeSelection(); void loadCategoryMaster(); }, []);

  const toggleSort = (field: string) => {
    if (sortBy === field) { setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc')); return; }
    setSortBy(field); setSortOrder('asc');
  };

  const toggleRowSelection = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAllCurrentPage = () => {
    const ids = universities.map((u) => u._id);
    if (ids.every((id) => selectedIds.includes(id))) { setSelectedIds((prev) => prev.filter((id) => !ids.includes(id))); return; }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const openCreate = () => { setForm({ ...DEFAULT_FORM }); setModalUniversity('create'); };
  const openEdit = (u: ApiUniversity) => {
    setForm({
      ...DEFAULT_FORM, ...u,
      applicationStartDate: dateInput(u.applicationStartDate),
      applicationEndDate: dateInput(u.applicationEndDate),
      clusterDateOverrides: {
        applicationStartDate: dateInput((u as unknown as { clusterDateOverrides?: { applicationStartDate?: string } }).clusterDateOverrides?.applicationStartDate),
        applicationEndDate: dateInput((u as unknown as { clusterDateOverrides?: { applicationEndDate?: string } }).clusterDateOverrides?.applicationEndDate),
        scienceExamDate: (u as unknown as { clusterDateOverrides?: { scienceExamDate?: string } }).clusterDateOverrides?.scienceExamDate || '',
        artsExamDate: (u as unknown as { clusterDateOverrides?: { artsExamDate?: string } }).clusterDateOverrides?.artsExamDate || '',
        businessExamDate: (u as unknown as { clusterDateOverrides?: { businessExamDate?: string } }).clusterDateOverrides?.businessExamDate || '',
      },
      clusterSyncLocked: Boolean((u as unknown as { clusterSyncLocked?: boolean }).clusterSyncLocked),
    });
    setModalUniversity(u);
  };

  const saveUniversity = async () => {
    if (!form.name?.trim()) { toast.error('Name is required'); return; }
    if (!form.shortForm?.trim()) { toast.error('Short form is required'); return; }
    setSavingUniversity(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        established: numOrUndef(form.established),
        featuredOrder: numOrUndef(form.featuredOrder),
        applicationStartDate: form.applicationStartDate || null,
        applicationEndDate: form.applicationEndDate || null,
        clusterDateOverrides: {
          applicationStartDate: form.clusterDateOverrides?.applicationStartDate || null,
          applicationEndDate: form.clusterDateOverrides?.applicationEndDate || null,
          scienceExamDate: form.clusterDateOverrides?.scienceExamDate || '',
          artsExamDate: form.clusterDateOverrides?.artsExamDate || '',
          businessExamDate: form.clusterDateOverrides?.businessExamDate || '',
        },
      };
      if (modalUniversity === 'create') { await adminCreateUniversity(payload); toast.success('University created'); }
      else if (modalUniversity && typeof modalUniversity === 'object') { await adminUpdateUniversity(modalUniversity._id, payload); toast.success('University updated'); }
      await invalidateUniversityQueries();
      setModalUniversity(null); await loadUniversities(); await loadFacets(); await loadCandidates();
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed';
      toast.error(message);
    } finally { setSavingUniversity(false); }
  };

  const deleteOne = async (id: string) => {
    if (!window.confirm('Delete this university?')) return;
    try { await adminDeleteUniversity(id); toast.success('Deleted'); await invalidateUniversityQueries(); await loadUniversities(); await loadFacets(); await loadCandidates(); }
    catch { toast.error('Delete failed'); }
  };

  const handleBulkAction = async () => {
    if (!hasSelection || !bulkAction) return;

    setBulkLoading(true);
    try {
      if (bulkAction === 'softDelete' || bulkAction === 'hardDelete') {
        const mode = bulkAction === 'softDelete' ? 'soft' : 'hard';
        if (mode === 'hard') {
          if (runtimeFlags.requireDeleteKeywordConfirm) {
            const typed = window.prompt(`Type DELETE to permanently remove ${selectedIds.length} universities.`);
            if (typed !== 'DELETE') {
              toast.error('Bulk delete cancelled');
              return;
            }
          } else if (!window.confirm('Permanently delete selected items?')) {
            return;
          }
        }
        await adminBulkDeleteUniversities(selectedIds, mode);
        toast.success(`Bulk ${mode} delete successful`);
      } else if (bulkAction === 'setCluster') {
        if (!targetClusterId) { toast.error('Please select a target cluster'); return; }
        await adminBulkUpdateUniversities(selectedIds, { clusterId: targetClusterId });
        toast.success('Cluster assigned to selected items');
      } else if (bulkAction === 'setCategory') {
        if (!targetCategory) { toast.error('Please select a target category'); return; }
        await adminBulkUpdateUniversities(selectedIds, { category: targetCategory });
        toast.success('Category updated for selected items');
      } else if (bulkAction === 'setStatus') {
        await adminBulkUpdateUniversities(selectedIds, { isActive: targetStatus === 'active' });
        toast.success('Status updated for selected items');
      } else if (bulkAction === 'setFeatured') {
        await adminBulkUpdateUniversities(selectedIds, { featured: targetFeatured === 'featured' });
        toast.success('Featured flag updated');
      }

      setSelectedIds([]);
      setBulkAction('');
      setTargetClusterId('');
      setTargetCategory('');
      setTargetStatus('active');
      setTargetFeatured('featured');
      await invalidateUniversityQueries();
      await loadUniversities();
      await loadFacets();
      await loadCandidates();
    } catch {
      toast.error('Bulk operation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const doExport = async (format: 'csv' | 'xlsx') => {
    try {
      const params: Record<string, string> = { format, sortBy, sortOrder, status: statusFilter };
      if (query.trim()) params.q = query.trim();
      if (categoryFilter) params.category = categoryFilter;
      if (clusterFilter) params.clusterId = clusterFilter;
      const r = await adminExportUniversitiesSheet(params);
      downloadFile(r, { filename: `universities_export.${format}` });
    } catch { toast.error('Export failed'); }
  };

  const saveHomeCategories = async () => {
    setSavingHomeSelection(true);
    try {
      await adminUpdateHomeSettings({
        highlightedCategories: selectedHomeCategories.map((category, index) => ({
          category,
          order: index + 1,
          enabled: true,
          badgeText: 'Highlight',
        })),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['home_settings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['universities'] }),
      ]);
      toast.success('Home categories saved');
    }
    catch {
      toast.error('Home categories save failed');
    }
    finally { setSavingHomeSelection(false); }
  };

  const openClusterCreate = () => { setClusterForm({ ...DEFAULT_CLUSTER_FORM }); setClusterModal('create'); };
  const openClusterEdit = async (cluster: AdminUniversityCluster) => {
    try {
      const r = await adminGetUniversityClusterById(cluster._id);
      const payload = r.data as { cluster?: AdminUniversityCluster & { categoryRuleIds?: string[] }; members?: Array<{ _id: string }> };
      const source = payload.cluster || cluster;
      const memberIds = (payload.members || []).map((m) => String(m._id));
      setClusterForm({
        name: source.name || '', slug: source.slug || '', description: source.description || '', isActive: source.isActive !== false,
        categoryRules: source.categoryRules || [],
        categoryRuleIds: source.categoryRuleIds || [],
        manualMembers: memberIds.length ? memberIds : source.memberUniversityIds || [],
        dates: {
          applicationStartDate: dateInput(source.dates?.applicationStartDate),
          applicationEndDate: dateInput(source.dates?.applicationEndDate),
          scienceExamDate: dateInput(source.dates?.scienceExamDate),
          commerceExamDate: dateInput(source.dates?.commerceExamDate),
          artsExamDate: dateInput(source.dates?.artsExamDate),
        }, homeVisible: Boolean(source.homeVisible), homeOrder: Number(source.homeOrder || 0),
      });
      setClusterModal(source);
    } catch { toast.error('Cluster details load failed'); }
  };

  const saveCluster = async () => {
    if (!clusterForm.name.trim()) { toast.error('Cluster name required'); return; }
    setSavingCluster(true);
    try {
      const payload = {
        name: clusterForm.name, slug: clusterForm.slug, description: clusterForm.description, isActive: clusterForm.isActive,
        categoryRules: clusterForm.categoryRules,
        categoryRuleIds: clusterForm.categoryRuleIds,
        memberUniversityIds: clusterForm.manualMembers,
        dates: {
          applicationStartDate: clusterForm.dates.applicationStartDate || undefined,
          applicationEndDate: clusterForm.dates.applicationEndDate || undefined,
          scienceExamDate: clusterForm.dates.scienceExamDate || '',
          commerceExamDate: clusterForm.dates.commerceExamDate || '',
          artsExamDate: clusterForm.dates.artsExamDate || '',
        },
        homeVisible: clusterForm.homeVisible, homeOrder: Number(clusterForm.homeOrder || 0),
      };
      if (clusterModal === 'create') await adminCreateUniversityCluster(payload);
      else if (clusterModal && typeof clusterModal === 'object') await adminUpdateUniversityCluster(clusterModal._id, payload);
      toast.success('Cluster saved');
      await invalidateUniversityQueries();
      setClusterModal(null);
      await loadClusters();
      await loadUniversities();
      await loadCandidates();
      await loadCategoryMaster();
    } catch { toast.error('Cluster save failed'); }
    finally { setSavingCluster(false); }
  };

  const resolveCluster = async (id: string) => {
    try {
      await adminResolveUniversityClusterMembers(id);
      toast.success('Resolved');
      await invalidateUniversityQueries();
      await loadClusters();
      await loadUniversities();
      await loadCandidates();
    } catch (e) { toast.error('Resolve failed'); }
  };
  const syncCluster = async (id: string, dates?: ClusterForm['dates']) => {
    try {
      const p = dates ? { applicationStartDate: dates.applicationStartDate || null, applicationEndDate: dates.applicationEndDate || null, scienceExamDate: dates.scienceExamDate || '', commerceExamDate: dates.commerceExamDate || '', artsExamDate: dates.artsExamDate || '' } : undefined;
      await adminSyncUniversityClusterDates(id, p);
      toast.success('Date synced');
      await invalidateUniversityQueries();
      await loadUniversities();
    } catch (e) { toast.error('Date sync failed'); }
  };
  const deactivateCluster = async (id: string) => {
    if (!window.confirm('Deactivate cluster?')) return;
    try {
      await adminDeleteUniversityCluster(id);
      toast.success('Cluster deactivated');
      await invalidateUniversityQueries();
      await loadClusters();
      await loadUniversities();
      await loadCandidates();
    } catch (e) { toast.error('Deactivate failed'); }
  };

  const initImport = async () => {
    if (!importFile) { toast.error('Please choose a CSV/XLSX file'); return; }
    setInitializingImport(true);
    try {
      const r = await adminInitUniversityImport(importFile);
      setImportInit(r.data); setImportJobId(r.data.importJobId); setImportValidation(null); setImportCommit(null);
      const guessed: Record<string, string> = {};
      IMPORT_FIELDS.forEach((f) => { const m = (r.data.headers || []).find((h) => h.trim().toLowerCase() === f.toLowerCase()); if (m) guessed[f] = m; });
      setImportMapping(guessed); setImportDefaults({}); toast.success('Import initialized');
    } catch (e) { toast.error('Import init failed'); }
    finally { setInitializingImport(false); }
  };

  const validateImport = async () => { if (!importJobId) { toast.error('Job id missing'); return; } setValidatingImport(true); try { const r = await adminValidateUniversityImport(importJobId, importMapping, importDefaults); setImportValidation(r.data as Record<string, unknown>); setImportCommit(null); toast.success('Validated'); } catch (e) { toast.error('Validation failed'); } finally { setValidatingImport(false); } };
  const commitImport = async () => { if (!importJobId) { toast.error('Job id missing'); return; } setCommittingImport(true); try { const r = await adminCommitUniversityImportWithMode(importJobId, importMode); setImportCommit(r.data as Record<string, unknown>); toast.success('Commit complete'); await invalidateUniversityQueries(); await loadUniversities(); await loadFacets(); await loadCandidates(); await loadCategoryMaster(); } catch (e) { toast.error('Commit failed'); } finally { setCommittingImport(false); } };
  const refreshImport = async () => { if (!importJobId) { toast.error('Job id missing'); return; } setRefreshingImportStatus(true); try { const r = await adminGetUniversityImportJob(importJobId); setImportValidation(r.data as Record<string, unknown>); if ((r.data as { commitSummary?: unknown }).commitSummary) setImportCommit(r.data as Record<string, unknown>); } catch (e) { toast.error('Refresh failed'); } finally { setRefreshingImportStatus(false); } };
  const downloadErrors = async () => { if (!importJobId) return; try { const r = await adminDownloadUniversityImportErrors(importJobId); downloadFile(r, { filename: `university_import_errors_${importJobId}.csv` }); } catch (e) { toast.error('Download failed'); } };
  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    try {
      const r = await adminDownloadUniversityImportTemplate(format);
      downloadFile(r, { filename: `university_import_template.${format}` });
      toast.success('Template downloaded');
    } catch {
      toast.error('Template download failed');
    }
  };

  const openCategoryCreate = () => { setCategoryForm({ ...DEFAULT_CATEGORY_FORM }); setCategoryModal('create'); };
  const openCategoryEdit = (item: AdminUniversityCategoryItem) => {
    setCategoryForm({
      name: item.name || '',
      slug: item.slug || '',
      labelBn: item.labelBn || '',
      labelEn: item.labelEn || '',
      homeOrder: Number(item.homeOrder || 0),
      homeHighlight: Boolean(item.homeHighlight),
      isActive: item.isActive !== false,
    });
    setCategoryModal(item);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) { toast.error('Category name required'); return; }
    setSavingCategory(true);
    try {
      const payload = { ...categoryForm, homeOrder: Number(categoryForm.homeOrder || 0) };
      if (categoryModal === 'create') await adminCreateUniversityCategory(payload);
      else if (categoryModal && typeof categoryModal === 'object') await adminUpdateUniversityCategory(categoryModal._id, payload);
      toast.success('Category saved');
      await invalidateUniversityQueries();
      setCategoryModal(null);
      await loadCategoryMaster();
      await loadFacets();
    } catch {
      toast.error('Category save failed');
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategory = async (id: string) => {
    try {
      await adminToggleUniversityCategory(id);
      await invalidateUniversityQueries();
      await loadCategoryMaster();
      await loadFacets();
      toast.success('Category status updated');
    } catch {
      toast.error('Update failed');
    }
  };

  const archiveCategory = async (id: string) => {
    if (!window.confirm('Archive this category?')) return;
    try {
      await adminDeleteUniversityCategory(id);
      await invalidateUniversityQueries();
      await loadCategoryMaster();
      await loadFacets();
      toast.success('Category archived');
    } catch {
      toast.error('Archive failed');
    }
  };

  const sortArrow = (key: string) => sortBy !== key ? <ChevronDown className="w-3 h-3 opacity-40" /> : (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 backdrop-blur-md p-4 md:p-5 shadow-lg shadow-indigo-500/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">University Management <span className="text-xs font-medium text-indigo-300/80">(Admin Console)</span></h2>
            <p className="text-sm text-slate-400">Manage university data, clusters, and bulk imports with premium glassmorphism.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadUniversities()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-all"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all"><Plus className="w-4 h-4" /> Add University</button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['universities', 'categories', 'clusters', 'import'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === t ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20' : 'border border-indigo-500/10 bg-slate-900/60 text-slate-400 hover:text-white hover:border-indigo-500/30'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'universities' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              <label className="xl:col-span-2 relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name/short form/category" className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 py-2 pl-9 pr-3 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
              </label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                <option value="">All categories</option>
                {homeCategoryOptions.map((cat) => <option key={cat.key} value={cat.name}>{cat.label} ({cat.count})</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
              </select>
              <select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)} className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                <option value="">All Clusters</option>
                {clusters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void doExport('csv')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"><Download className="w-4 h-4" /> CSV</button>
              <button type="button" onClick={() => void doExport('xlsx')} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200"><Download className="w-4 h-4" /> XLSX</button>
              <p className="text-xs text-slate-400 ml-auto">Total: {totalCount}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Home Category Highlight</h3>
              <button type="button" disabled={savingHomeSelection} onClick={() => void saveHomeCategories()} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-60 transition-all">{savingHomeSelection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {homeCategoryOptions.map((cat) => {
                const active = selectedHomeCategories.includes(cat.name);
                return <button key={cat.key} type="button" onClick={() => setSelectedHomeCategories((prev) => prev.includes(cat.name) ? prev.filter((x) => x !== cat.name) : [...prev, cat.name])} className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20' : 'border border-indigo-500/10 bg-slate-950/65 text-slate-400 hover:text-white hover:border-indigo-500/30'}`}>{cat.label} ({cat.count})</button>;
              })}
            </div>
          </div>

          {hasSelection && (
            <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Bulk Action</label>
                  <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as BulkAction)} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                    <option value="">Select Action</option>
                    <option value="softDelete">Soft Delete</option>
                    <option value="hardDelete">Hard Delete</option>
                    <option value="setCluster">Set Cluster</option>
                    <option value="setCategory">Set Category</option>
                    <option value="setStatus">Set Status</option>
                    <option value="setFeatured">Set Featured Flag</option>
                  </select>
                </div>
                {bulkAction === 'setCluster' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Target Cluster</label>
                    <select value={targetClusterId} onChange={(e) => setTargetClusterId(e.target.value)} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                      <option value="">Choose...</option>{clusters.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {bulkAction === 'setCategory' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Target Category</label>
                    <select value={targetCategory} onChange={(e) => setTargetCategory(e.target.value)} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                      <option value="">Choose...</option>{categorySelectOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                )}
                {bulkAction === 'setStatus' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Target Status</label>
                    <select value={targetStatus} onChange={(e) => setTargetStatus(e.target.value as 'active' | 'inactive')} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
                {bulkAction === 'setFeatured' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Featured</label>
                    <select value={targetFeatured} onChange={(e) => setTargetFeatured(e.target.value as 'featured' | 'not_featured')} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                      <option value="featured">Featured</option>
                      <option value="not_featured">Not Featured</option>
                    </select>
                  </div>
                )}
                <button type="button" disabled={selectedIds.length === 0 || !bulkAction || bulkLoading} onClick={() => void handleBulkAction()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 hover:opacity-90 disabled:opacity-40 transition-all">
                  {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Apply to {selectedIds.length} items
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-900/40 text-slate-300">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <button type="button" onClick={toggleSelectAllCurrentPage} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        {pageAllSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    {SORT_COLUMNS.map((k) => (
                      <th key={k} className={`px-3 py-3 text-left whitespace-nowrap font-bold tracking-wider uppercase ${COLUMN_VISIBILITY[k] || ''}`}>
                        <button type="button" onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 group">
                          {COLUMN_MAP[k]}
                          <span className="transition-all duration-200 group-hover:scale-110">{sortArrow(k)}</span>
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-left sticky right-0 bg-slate-900/90 backdrop-blur-md z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.2)] font-bold tracking-wider uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-500/5">
                  {loading ? (
                    <tr><td colSpan={SORT_COLUMNS.length + 2} className="px-3 py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" /> Loading data...</td></tr>
                  ) : universities.length === 0 ? (
                    <tr><td colSpan={SORT_COLUMNS.length + 2} className="px-3 py-12 text-center text-slate-500">No universities found</td></tr>
                  ) : (
                    universities.map((u) => (
                      <tr key={u._id} className="hover:bg-indigo-500/[0.03] transition-colors group">
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => toggleRowSelection(u._id)} className="text-indigo-400/60 group-hover:text-indigo-400 transition-colors">
                            {selectedIds.includes(u._id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        {SORT_COLUMNS.map((k) => {
                          const val = (u as any)[k];
                          let display = val || '-';
                          if (k.toLowerCase().includes('date') && !k.toLowerCase().includes('desc')) {
                            display = dateText(val);
                          } else if (k === 'updatedAt') {
                            display = dateText(val);
                          }
                          return (
                            <td key={k} className={`px-3 py-2.5 ${COLUMN_VISIBILITY[k] || ''} ${k === 'name' ? 'text-white font-bold' : 'text-slate-400'} max-w-[200px] truncate`} title={String(val || '')}>
                              {display}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2.5 sticky right-0 bg-slate-900/90 backdrop-blur-md shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.3)] z-10">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => openEdit(u)} className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-all">Edit</button>
                            <button type="button" onClick={() => void adminToggleUniversityStatus(u._id).then(async () => { await invalidateUniversityQueries(); await loadUniversities(); })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${u.isActive ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}>{u.isActive ? 'Disable' : 'Enable'}</button>
                            <button type="button" onClick={() => void deleteOne(u._id)} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-indigo-500/10">
              {loading ? (
                <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto opacity-50" /></div>
              ) : universities.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No data found</div>
              ) : (
                universities.map((u) => (
                  <article key={u._id} className="p-4 space-y-3 hover:bg-indigo-500/[0.03] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => toggleRowSelection(u._id)} className="text-indigo-400">
                          {selectedIds.includes(u._id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <div>
                          <p className="text-sm font-bold text-white tracking-tight">{u.name || '-'}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-400/80">{u.shortForm || '-'} | {u.category || '-'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEdit(u)} className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"><Edit className="w-4 h-4" /></button>
                        <button type="button" onClick={() => void deleteOne(u._id)} className="rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-indigo-500/5 bg-slate-950/40 p-3 text-[11px] sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="text-slate-500">App Start</p><p className="text-emerald-400 font-bold">{dateText(u.applicationStartDate)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500">App End</p><p className="text-rose-400 font-bold">{dateText(u.applicationEndDate)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500">Seats</p><p className="text-slate-100 font-medium">{u.totalSeats || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-500">Cluster</p><p className="text-indigo-300 font-bold italic">{(u as any).clusterId?.name || 'None'}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-2 text-[11px] font-bold tracking-widest uppercase text-slate-500">
            <span>Page {page} of {Math.max(1, totalPages)}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-xl border border-indigo-500/10 bg-slate-900/60 px-4 py-2 text-white hover:bg-indigo-500/20 disabled:opacity-30 transition-all shadow-lg">Prev</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-xl border border-indigo-500/10 bg-slate-900/60 px-4 py-2 text-white hover:bg-indigo-500/20 disabled:opacity-30 transition-all shadow-lg">Next</button>
            </div>
          </div>
        </section>
      )}

      {tab === 'categories' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">Category Management</h3>
            <button
              type="button"
              onClick={openCategoryCreate}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {categoryMaster.length === 0 ? (
              <div className="rounded-xl border border-indigo-500/10 bg-slate-900/40 p-12 text-center text-slate-500">No categories found.</div>
            ) : categoryMaster.map((item) => (
              <article key={item._id} className="rounded-xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4 space-y-3 hover:border-indigo-500/25 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{item.labelBn || item.name}</p>
                    <p className="text-[10px] text-slate-500 tracking-wider">{item.slug}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${item.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-indigo-500/5 bg-slate-950/40 p-3 text-[11px] sm:grid-cols-2">
                  <p className="text-slate-500 font-medium">Universities</p><p className="text-indigo-300 font-bold">{item.count || 0}</p>
                  <p className="text-slate-500 font-medium">Home</p><p className="text-slate-300 font-bold">{item.homeHighlight ? `Highlighted (#${item.homeOrder || 0})` : 'Normal'}</p>
                </div>
                <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button type="button" onClick={() => openCategoryEdit(item)} className="rounded-lg bg-indigo-500/10 px-2 py-1.5 text-[11px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all">Edit</button>
                  <button type="button" onClick={() => void toggleCategory(item._id)} className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all">{item.isActive ? 'Disable' : 'Enable'}</button>
                  <button type="button" onClick={() => void archiveCategory(item._id)} className="rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition-all">Archive</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'clusters' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">Cluster Management</h3>
            <button type="button" onClick={openClusterCreate} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all"><Plus className="w-4 h-4" /> New Cluster</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {clusters.length === 0 ? <div className="rounded-xl border border-indigo-500/10 bg-slate-900/40 p-12 text-center text-slate-500">No clusters found.</div> : clusters.map((c) => (
              <article key={c._id} className="rounded-xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4 space-y-3 hover:border-indigo-500/25 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-slate-500 tracking-wider">SLUG: {c.slug}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider ${c.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'}`}>{c.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-indigo-500/5 bg-slate-950/40 p-3 text-[11px] sm:grid-cols-2">
                  <p className="text-slate-500 font-medium">Members</p><p className="text-indigo-300 font-bold">{c.memberUniversityIds?.length || 0}</p>
                  <p className="text-slate-500 font-medium">Home Feed</p><p className="text-slate-300 font-bold">{c.homeVisible ? `Visible (#${c.homeOrder})` : 'Hidden'}</p>
                </div>
                <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void openClusterEdit(c)} className="rounded-lg bg-indigo-500/10 px-2 py-1.5 text-[11px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all">Edit</button>
                  <button type="button" onClick={() => void syncCluster(c._id)} className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all">Sync</button>
                  <button type="button" onClick={() => void resolveCluster(c._id)} className="rounded-lg bg-indigo-500/5 px-2 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/10 transition-all">Resolve</button>
                  <button type="button" onClick={() => void deactivateCluster(c._id)} className="rounded-lg bg-red-500/10 px-2 py-1.5 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition-all">Disable</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'import' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-5 space-y-4 shadow-lg shadow-indigo-500/5">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">CSV/XLSX Mapping Import</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Upload and map external data sources</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 rounded-xl p-4 border border-indigo-500/5 transition-all hover:border-indigo-500/20">
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={(e: ChangeEvent<HTMLInputElement>) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              <button type="button" onClick={() => importFileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all"><Upload className="w-4 h-4" /> Choose File</button>
              <button type="button" onClick={() => void downloadTemplate('csv')} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all"><Download className="w-4 h-4" /> Demo CSV</button>
              <button type="button" onClick={() => void downloadTemplate('xlsx')} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all"><Download className="w-4 h-4" /> Demo XLSX</button>
              <span className="text-xs text-slate-300 font-medium">{importFile ? importFile.name : 'No file selected'}</span>
              <button type="button" disabled={initializingImport} onClick={() => void initImport()} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 disabled:opacity-40 transition-all">{initializingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Initialize Job</button>
            </div>
            {importJobId && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-300 flex items-center gap-3 font-medium animate-in fade-in slide-in-from-top-2">
                <Activity className="w-4 h-4" />
                <span>Active Job ID: <code className="bg-slate-950/50 px-2 py-0.5 rounded text-white">{importJobId}</code></span>
                <button type="button" disabled={refreshingImportStatus} onClick={() => void refreshImport()} className="ml-auto inline-flex items-center gap-1 hover:text-white transition-colors">
                  {refreshingImportStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh Status
                </button>
              </div>
            )}
          </div>

          {importInit && (
            <div className="rounded-2xl border border-white/10 bg-[#0f1d37] p-4 space-y-3">
              <h4 className="text-sm font-bold text-white">Step 2: Column Mapping</h4>
              <div className="overflow-x-auto rounded-xl border border-indigo-500/10 bg-slate-950/40">
                <table className="min-w-[720px] w-full text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-indigo-500/10">
                    <tr><th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Target Field</th><th className="px-4 py-3 text-left font-bold uppercase tracking-wider">Source Column (from File)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/5">
                    {IMPORT_FIELDS.map((field) => (
                      <tr key={field} className="hover:bg-indigo-500/[0.02]">
                        <td className="px-4 py-2.5 text-slate-200 font-medium">{field}</td>
                        <td className="px-4 py-2.5">
                          <select value={importMapping[field] || ''} onChange={(e) => setImportMapping((prev) => ({ ...prev, [field]: e.target.value }))} className="w-full rounded-lg border border-indigo-500/10 bg-slate-900/65 px-3 py-1.5 text-white focus:border-indigo-500/40 outline-none transition-all">
                            <option value="">-- unmapped --</option>
                            {(importInit.headers || []).map((h) => <option key={`${field}-${h}`} value={h}>{h}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={String(importDefaults.category || '')} onChange={(e) => setImportDefaults((prev) => ({ ...prev, category: e.target.value }))} placeholder="Default category" className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'create-only' | 'update-existing')}
                  className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all"
                >
                  <option value="update-existing">Mode: Create or Update Existing</option>
                  <option value="create-only">Mode: Create Only (Skip Duplicates)</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" disabled={validatingImport} onClick={() => void validateImport()} className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all">{validatingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Validate Mapping</button>
                <button type="button" disabled={committingImport} onClick={() => void commitImport()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all">{committingImport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Commit Changes</button>
                <button type="button" onClick={() => void downloadErrors()} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all ml-auto"><Download className="w-4 h-4" /> Download Error Log</button>
              </div>
            </div>
          )}

          {(importValidation || importCommit) && (
            <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 backdrop-blur-sm p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <h4 className="text-sm font-bold text-white tracking-tight">Validation / Commit Result</h4>
              <pre className="text-[11px] font-mono text-cyan-300 whitespace-pre-wrap rounded-xl border border-indigo-500/10 bg-slate-950/65 p-4 shadow-inner">{JSON.stringify(importCommit || importValidation, null, 2)}</pre>
            </div>
          )}
        </section>
      )}

      {modalUniversity && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mx-auto w-full max-w-5xl rounded-3xl border border-indigo-500/20 bg-slate-900 shadow-2xl shadow-indigo-500/10 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-indigo-500/10 bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase">{modalUniversity === 'create' ? 'Create University' : 'Edit University Profile'}</h3>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Global Admin Data Console</p>
              </div>
              <button type="button" onClick={() => setModalUniversity(null)} className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Official Name</label><input value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Short Form</label><input value={form.shortForm || ''} onChange={(e) => setForm((prev) => ({ ...prev, shortForm: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category</label>
                  <select value={form.category || ''} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all">
                    <option value="">Select category</option>
                    {categorySelectOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <AdminDateField label="App Start Date" value={form.applicationStartDate} onChange={(next) => setForm((prev) => ({ ...prev, applicationStartDate: next }))} />
                <AdminDateField label="App End Date" value={form.applicationEndDate} onChange={(next) => setForm((prev) => ({ ...prev, applicationEndDate: next }))} />

                <AdminDateField label="Science Exam Date" value={form.scienceExamDate} onChange={(next) => setForm((prev) => ({ ...prev, scienceExamDate: next }))} />
                <AdminDateField label="Commerce Exam Date" value={form.businessExamDate} onChange={(next) => setForm((prev) => ({ ...prev, businessExamDate: next }))} />
                <AdminDateField label="Arts Exam Date" value={form.artsExamDate} onChange={(next) => setForm((prev) => ({ ...prev, artsExamDate: next }))} />

                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Contact Phone</label><input value={form.contactNumber || ''} onChange={(e) => setForm((prev) => ({ ...prev, contactNumber: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5 lg:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Full Address</label><input value={form.address || ''} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>

                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label><input value={form.email || ''} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Main Website</label><input value={form.website || ''} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Admission Portal</label><input value={form.admissionWebsite || ''} onChange={(e) => setForm((prev) => ({ ...prev, admissionWebsite: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Cluster Synchronization Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border border-indigo-500/40 flex items-center justify-center transition-all ${form.clusterSyncLocked ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950/50'}`}>
                      {form.clusterSyncLocked && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={Boolean(form.clusterSyncLocked)} onChange={(e) => setForm((prev) => ({ ...prev, clusterSyncLocked: e.target.checked }))} />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Lock Dates (Prevent Cluster Overwrites)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-indigo-500/10 bg-slate-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setModalUniversity(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Discard</button>
              <button type="button" disabled={savingUniversity} onClick={() => void saveUniversity()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 disabled:opacity-40 transition-all">
                {savingUniversity ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {modalUniversity === 'create' ? 'Create Permanently' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {categoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-indigo-500/20 bg-slate-900 shadow-2xl shadow-indigo-500/10 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-indigo-500/10 bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase">{categoryModal === 'create' ? 'Create Category' : 'Edit Category'}</h3>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Category Master Control</p>
              </div>
              <button type="button" onClick={() => setCategoryModal(null)} className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category Name</label>
                  <input value={categoryForm.name} onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Slug</label>
                  <input value={categoryForm.slug} onChange={(e) => setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Bangla Label</label>
                  <input value={categoryForm.labelBn} onChange={(e) => setCategoryForm((prev) => ({ ...prev, labelBn: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">English Label</label>
                  <input value={categoryForm.labelEn} onChange={(e) => setCategoryForm((prev) => ({ ...prev, labelEn: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Home Order</label>
                  <input type="number" value={String(categoryForm.homeOrder)} onChange={(e) => setCategoryForm((prev) => ({ ...prev, homeOrder: Number(e.target.value || 0) }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border border-indigo-500/40 flex items-center justify-center transition-all ${categoryForm.homeHighlight ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950/50'}`}>
                    {categoryForm.homeHighlight && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={categoryForm.homeHighlight} onChange={(e) => setCategoryForm((prev) => ({ ...prev, homeHighlight: e.target.checked }))} />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors uppercase font-bold tracking-wider">Highlight on Home</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border border-indigo-500/40 flex items-center justify-center transition-all ${categoryForm.isActive ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-950/50'}`}>
                    {categoryForm.isActive && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={categoryForm.isActive} onChange={(e) => setCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors uppercase font-bold tracking-wider">Category Active</span>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-indigo-500/10 bg-slate-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setCategoryModal(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button type="button" disabled={savingCategory} onClick={() => void saveCategory()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 disabled:opacity-40 transition-all">
                {savingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {categoryModal === 'create' ? 'Create Category' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {clusterModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-indigo-500/20 bg-slate-900 shadow-2xl shadow-indigo-500/10 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-indigo-500/10 bg-slate-900/50">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase">{clusterModal === 'create' ? 'Create University Cluster' : 'Edit Cluster Settings'}</h3>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Cluster Logic & Date Synchronization</p>
              </div>
              <button type="button" onClick={() => setClusterModal(null)} className="rounded-xl border border-white/5 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Cluster Name</label><input value={clusterForm.name} onChange={(e) => setClusterForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">URL Slug</label><input value={clusterForm.slug} onChange={(e) => setClusterForm((p) => ({ ...p, slug: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Description</label><input value={clusterForm.description} onChange={(e) => setClusterForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border border-indigo-500/10 bg-slate-950/65 px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 outline-none transition-all" /></div>

                <AdminDateField label="Master App Start" value={clusterForm.dates.applicationStartDate} onChange={(next) => setClusterForm((p) => ({ ...p, dates: { ...p.dates, applicationStartDate: next } }))} />
                <AdminDateField label="Master App End" value={clusterForm.dates.applicationEndDate} onChange={(next) => setClusterForm((p) => ({ ...p, dates: { ...p.dates, applicationEndDate: next } }))} />
                <AdminDateField label="Master Science Exam" value={clusterForm.dates.scienceExamDate} onChange={(next) => setClusterForm((p) => ({ ...p, dates: { ...p.dates, scienceExamDate: next } }))} />
                <AdminDateField label="Master Commerce Exam" value={clusterForm.dates.commerceExamDate} onChange={(next) => setClusterForm((p) => ({ ...p, dates: { ...p.dates, commerceExamDate: next } }))} />
                <AdminDateField label="Master Arts Exam" value={clusterForm.dates.artsExamDate} onChange={(next) => setClusterForm((p) => ({ ...p, dates: { ...p.dates, artsExamDate: next } }))} />

                <div className="space-y-1.5 lg:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Category Rules (Assistive)</label>
                  <div className="rounded-xl border border-indigo-500/10 bg-slate-950/65 p-3">
                    <div className="flex flex-wrap gap-2">
                      {categoryMaster.map((cat) => {
                        const active = clusterForm.categoryRuleIds.includes(cat._id);
                        return (
                          <button
                            key={cat._id}
                            type="button"
                            onClick={() => setClusterForm((prev) => {
                              const exists = prev.categoryRuleIds.includes(cat._id);
                              const nextIds = exists
                                ? prev.categoryRuleIds.filter((id) => id !== cat._id)
                                : [...prev.categoryRuleIds, cat._id];
                              const nextRules = exists
                                ? prev.categoryRules.filter((name) => name !== cat.name)
                                : Array.from(new Set([...prev.categoryRules, cat.name]));
                              return { ...prev, categoryRuleIds: nextIds, categoryRules: nextRules };
                            })}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20' : 'border border-indigo-500/20 bg-slate-900/60 text-slate-300 hover:border-indigo-500/40 hover:text-white'}`}
                          >
                            {cat.labelBn || cat.name}
                          </button>
                        );
                      })}
                      {categoryMaster.length === 0 && <p className="text-xs text-slate-500">No categories available.</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border border-indigo-500/40 flex items-center justify-center transition-all ${clusterForm.isActive ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950/50'}`}>
                    {clusterForm.isActive && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={clusterForm.isActive} onChange={(e) => setClusterForm((p) => ({ ...p, isActive: e.target.checked }))} />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors uppercase font-bold tracking-wider">Active Cluster</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border border-indigo-500/40 flex items-center justify-center transition-all ${clusterForm.homeVisible ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-950/50'}`}>
                    {clusterForm.homeVisible && <CheckSquare className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={clusterForm.homeVisible} onChange={(e) => setClusterForm((p) => ({ ...p, homeVisible: e.target.checked }))} />
                  <span className="text-xs text-slate-300 group-hover:text-white transition-colors uppercase font-bold tracking-wider">Show on Home Page</span>
                </label>
              </div>

              <div className="rounded-2xl border border-indigo-500/10 bg-slate-950/40 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Manual Member Selection</h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={clusterSearch} onChange={(e) => setClusterSearch(e.target.value)} placeholder="Search universities..." className="w-full rounded-lg border border-indigo-500/10 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/40" />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-2 custom-scrollbar">
                  {candidateFiltered.map((u) => (
                    <label key={u._id} className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${clusterForm.manualMembers.includes(u._id) ? 'bg-indigo-500/10 border-indigo-500/30 text-white' : 'bg-slate-900/40 border-indigo-500/5 text-slate-400 hover:border-indigo-500/20'}`}>
                      <input type="checkbox" className="hidden" checked={clusterForm.manualMembers.includes(u._id)} onChange={() => setClusterForm((p) => ({ ...p, manualMembers: p.manualMembers.includes(u._id) ? p.manualMembers.filter((x) => x !== u._id) : [...p.manualMembers, u._id] }))} />
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${clusterForm.manualMembers.includes(u._id) ? 'bg-indigo-500 border-indigo-400' : 'border-slate-600'}`}>
                        {clusterForm.manualMembers.includes(u._id) && <CheckSquare className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[11px] font-medium truncate">{u.name} <span className="text-slate-500">({u.shortForm})</span></span>
                    </label>
                  ))}
                  {candidateFiltered.length === 0 && <p className="col-span-full py-8 text-center text-xs text-slate-600 font-medium">No results found matching your search</p>}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-indigo-500/10 bg-slate-900/50 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setClusterModal(null)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              {clusterModal !== 'create' && typeof clusterModal === 'object' && (
                <button type="button" onClick={() => void syncCluster(clusterModal._id, clusterForm.dates)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">Force Sync Cluster Dates</button>
              )}
              <button type="button" disabled={savingCluster} onClick={() => void saveCluster()} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:opacity-90 disabled:opacity-40 transition-all">
                {savingCluster ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {clusterModal === 'create' ? 'Create Cluster' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
