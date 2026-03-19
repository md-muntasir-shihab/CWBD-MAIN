import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Plus, Edit, Trash2, Eye, RefreshCw, Save,
    FileText, X, Download, Activity, Upload, Users, CalendarClock, Clock3, Link2, Copy, PlayCircle
} from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useAuth } from '../hooks/useAuth';
import { adminRouteFromLegacySearch, adminRouteFromTab } from '../lib/appRoutes';
import {
    adminGetUniversities, adminCreateUniversity, adminUpdateUniversity,
    adminDeleteUniversity,
    adminGetExams, adminCreateExam, adminUpdateExam, adminDeleteExam, adminPublishExam,
    adminGetQuestions, adminCreateQuestion, adminDeleteQuestion,
    adminGetUsers,
    adminGetStudentGroups,
    adminMfaConfirm,
    adminBulkImportUniversities,
    adminExportExamResults,
    adminRegenerateExamShareLink,
    adminSignExamBannerUpload,
    ApiUniversity,
    AdminExamCard,
    AdminStudentGroup,
    getAdminLiveStreamUrl,
    adminUploadMedia,
} from '../services/api';

// Modular admin components
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopbar from '../components/admin/AdminTopbar';
import DashboardHome from '../components/admin/DashboardHome';
import BannerPanel from '../components/admin/BannerPanel';
import ReportsPanel from '../components/admin/ReportsPanel';
import HomeControlPanel from '../components/admin/HomeControlPanel';
import SystemLogsPanel from '../components/admin/SystemLogsPanel';
import ResourcesPanel from '../components/admin/ResourcesPanel';
import ContactPanel from '../components/admin/ContactPanel';
import SiteSettingsPanel from '../components/admin/SiteSettingsPanel';
import ExportsPanel from '../components/admin/ExportsPanel';
import PasswordPanel from '../components/admin/PasswordPanel';
import FeaturedUniversitiesPanel from '../components/admin/FeaturedUniversitiesPanel';
import QuestionBankPanel from '../components/admin/QuestionBankPanel';
import ExamAnalyticsPanel from '../components/admin/ExamAnalyticsPanel';
import QuestionImporter from '../components/admin/QuestionImporter';
import UsersPanel from '../components/admin/UsersPanel';
import AdminProfilePanel from '../components/admin/AdminProfilePanel';
import StudentDashboardControlPanel from '../components/admin/StudentDashboardControlPanel';
import SecuritySettingsPanel from '../components/admin/SecuritySettingsPanel';
import AlertsPanel from '../components/admin/AlertsPanel';
import UniversitiesPanel from '../components/admin/UniversitiesPanel';
import LiveExamMonitorPanel from '../components/admin/LiveExamMonitorPanel';
import FinancePanel from '../components/admin/FinancePanel';
import SupportTicketsPanel from '../components/admin/SupportTicketsPanel';
import BackupsPanel from '../components/admin/BackupsPanel';
import { adminBulkImportExamQuestions } from '../services/api';
import { downloadFile } from '../utils/download';

if (typeof window !== 'undefined') {
    (window as any).katex = katex;
}

const QUILL_MODULES = {
    toolbar: [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link', 'image', 'formula'],
        ['clean']
    ],
};

/* Shared Modal */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/65 border border-indigo-500/15 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-slate-900/65 px-6 py-4 border-b border-indigo-500/10 flex items-center justify-between z-10">
                    <h2 className="font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

/* University Form */
function UniversityForm({ initial, onSave, onClose }: {
    initial?: Partial<ApiUniversity>;
    onSave: (data: Partial<ApiUniversity>) => Promise<void>;
    onClose: () => void;
}) {
    const [form, setForm] = useState<Partial<ApiUniversity>>(initial || {});
    const [saving, setSaving] = useState(false);

    const handle = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.shortForm || !form.category) {
            toast.error('Name, Short Form, and Category are required');
            return;
        }
        setSaving(true);
        try { await onSave(form); onClose(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    function Field({ label, k, type = 'text', placeholder = '' }: { label: string; k: keyof ApiUniversity; type?: string; placeholder?: string }) {
        return (
            <div>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input type={type} value={String(form[k] ?? '')} onChange={e => handle(k, type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none transition-colors" />
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="University Name *" k="name" placeholder="e.g. Dhaka University" />
                <Field label="Short Form *" k="shortForm" placeholder="e.g. DU" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Category *" k="category" placeholder="e.g. Public" />
                <Field label="Established Year" k="established" type="number" placeholder="1921" />
            </div>
            <Field label="Address" k="address" placeholder="Full address" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Contact Number" k="contactNumber" />
                <Field label="Email" k="email" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Website" k="website" placeholder="https://" />
                <Field label="Admission Website" k="admissionWebsite" placeholder="https://" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <Field label="Total Seats" k="totalSeats" placeholder="e.g. 5000" />
                <Field label="Sci/Eng Seats" k="scienceSeats" placeholder="e.g. 1500 or N/A" />
                <Field label="Arts/Hum Seats" k="artsSeats" placeholder="e.g. 1500 or N/A" />
                <Field label="Business Seats" k="businessSeats" placeholder="e.g. 1500 or N/A" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Application Start Date" k="applicationStartDate" type="date" />
                <Field label="Application End Date" k="applicationEndDate" type="date" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Science Exam" k="scienceExamDate" placeholder="e.g. 20 March or N/A" />
                <Field label="Arts Exam" k="artsExamDate" placeholder="e.g. 21 March or N/A" />
                <Field label="Commerce Exam" k="businessExamDate" placeholder="e.g. 22 March or N/A" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Verification Status" k="verificationStatus" placeholder="e.g. Verified by UGC" />
                <Field label="Remarks" k="remarks" placeholder="e.g. Awaiting updates" />
            </div>
            <Field label="Short Description" k="shortDescription" placeholder="Brief university description..." />
            <Field label="Logo URL" k="logoUrl" placeholder="https://..." />
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}

/* Exam Form (Wizard) */
function ExamForm({
    initial,
    onSave,
    onClose,
    groups = [],
}: {
    initial?: Record<string, unknown> | AdminExamCard;
    onSave: (d: Record<string, unknown>) => Promise<void>;
    onClose: () => void;
    groups?: AdminStudentGroup[];
}) {
    const fmtDT = (d: Date) => d.toISOString().slice(0, 16);
    const isEditMode = Boolean(initial && initial._id);
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<Record<string, unknown>>(() => {
        const base: Record<string, unknown> = {
            title: '',
            subject: '',
            totalQuestions: 10,
            duration: 30,
            totalMarks: 10,
            marksPerQuestion: 1,
            autosave_interval_sec: 5,
            negativeMarking: false,
            negativeMarksValue: 0,
            maxAnswerChangeLimit: 0,
            deliveryMode: 'internal',
            externalExamUrl: '',
            bannerSource: 'default',
            bannerImageUrl: '',
            logoUrl: '',
            universityNameBn: '',
            subjectBn: '',
            examType: 'mcq_only',
            attemptLimit: 1,
            branchFilters: [],
            batchFilters: [],
            scheduleType: 'anytime',
            scheduleStart: fmtDT(new Date()),
            scheduleEnd: fmtDT(new Date(Date.now() + 7 * 86400000)),
            resultPublishDate: '',
            resultPublishMode: 'scheduled',
            question_selection_rules: [],
            written_upload_enabled: false,
            instructions: '',
            require_instructions_agreement: false,
            security_policies: {
                tab_switch_limit: 3,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: false,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
            reviewSettings: {
                showQuestion: true,
                showSelectedAnswer: true,
                showCorrectAnswer: true,
                showExplanation: true,
                showSolutionImage: true,
            },
            certificateSettings: {
                enabled: false,
                minPercentage: 40,
                passOnly: true,
                templateVersion: 'v1',
            },
            accessControl: {
                allowedGroupIds: [],
                allowedPlanCodes: [],
                allowedUserIds: [],
            },
        };
        if (!initial) return base;
        const initialRecord = initial as Record<string, unknown>;
        const initialPolicies = ((initialRecord.security_policies as Record<string, unknown>) || {});
        const mergedPolicies: Record<string, unknown> = {
            ...(base.security_policies as Record<string, unknown>),
            ...initialPolicies,
        };
        const rawViolationAction = String(mergedPolicies.violation_action || '').trim().toLowerCase();
        if (rawViolationAction !== 'warn' && rawViolationAction !== 'submit' && rawViolationAction !== 'lock') {
            mergedPolicies.violation_action = Boolean(mergedPolicies.auto_submit_on_violation) ? 'submit' : 'warn';
        }
        const incomingPublishMode = String(initialRecord.resultPublishMode || '').trim().toLowerCase();
        const normalizedPublishMode = (
            incomingPublishMode === 'immediate' ||
            incomingPublishMode === 'manual' ||
            incomingPublishMode === 'scheduled'
        ) ? incomingPublishMode : String(base.resultPublishMode);
        return {
            ...base,
            ...initialRecord,
            deliveryMode: String(initialRecord.deliveryMode || (initialRecord.externalExamUrl ? 'external_link' : base.deliveryMode)),
            bannerSource: String(initialRecord.bannerSource || (initialRecord.bannerImageUrl ? 'url' : base.bannerSource)),
            marksPerQuestion: Number(initialRecord.marksPerQuestion ?? initialRecord.defaultMarksPerQuestion ?? base.marksPerQuestion),
            negativeMarksValue: Number(initialRecord.negativeMarksValue ?? initialRecord.negativeMarkValue ?? base.negativeMarksValue),
            maxAnswerChangeLimit: Number(initialRecord.maxAnswerChangeLimit ?? initialRecord.answerEditLimitPerQuestion ?? base.maxAnswerChangeLimit),
            scheduleStart: initialRecord.startDate ? fmtDT(new Date(String(initialRecord.startDate))) : base.scheduleStart,
            scheduleEnd: initialRecord.endDate ? fmtDT(new Date(String(initialRecord.endDate))) : base.scheduleEnd,
            resultPublishDate: initialRecord.resultPublishDate
                ? fmtDT(new Date(String(initialRecord.resultPublishDate)))
                : (initialRecord.endDate ? fmtDT(new Date(String(initialRecord.endDate))) : String(base.resultPublishDate)),
            resultPublishMode: normalizedPublishMode,
            autosave_interval_sec: Number(initialRecord.autosave_interval_sec ?? initialRecord.autosaveIntervalSec ?? base.autosave_interval_sec),
            security_policies: mergedPolicies,
            reviewSettings: {
                ...(base.reviewSettings as Record<string, unknown>),
                ...((initialRecord.reviewSettings as Record<string, unknown>) || {}),
            },
            certificateSettings: {
                ...(base.certificateSettings as Record<string, unknown>),
                ...((initialRecord.certificateSettings as Record<string, unknown>) || {}),
            },
            accessControl: {
                ...(base.accessControl as Record<string, unknown>),
                ...((initialRecord.accessControl as Record<string, unknown>) || {}),
            },
        };
    });
    const [saving, setSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<'bannerImageUrl' | 'logoUrl' | null>(null);
    const h = (k: string, v: unknown) => setForm(prev => {
        if (k.includes('.')) {
            const [parent, child] = k.split('.');
            return { ...prev, [parent]: { ...(prev[parent] as any || {}), [child]: v } };
        }
        return { ...prev, [k]: v };
    });

    const addRule = () => {
        const rules = (form.question_selection_rules as any[]) || [];
        setForm(p => ({ ...p, question_selection_rules: [...rules, { subject: '', class: '', chapter: '', difficulty: 'any', count: 1 }] }));
    };
    const updateRule = (i: number, k: string, v: any) => {
        const rules = [...((form.question_selection_rules as any[]) || [])];
        rules[i] = { ...rules[i], [k]: v };
        setForm(p => ({ ...p, question_selection_rules: rules }));
    };
    const removeRule = (i: number) => {
        const rules = [...((form.question_selection_rules as any[]) || [])];
        rules.splice(i, 1);
        setForm(p => ({ ...p, question_selection_rules: rules }));
    };

    const submit = async () => {
        setSaving(true);
        try { await onSave(form); onClose(); }
        catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const uploadToField = async (field: 'bannerImageUrl' | 'logoUrl', file?: File) => {
        if (!file) return;
        setUploadingField(field);
        const t = toast.loading(`Uploading ${field === 'bannerImageUrl' ? 'banner' : 'logo'}...`);
        try {
            if (field === 'bannerImageUrl') {
                const signed = await adminSignExamBannerUpload(file.name, file.type);
                const signedData = signed.data;
                if (signedData.provider === 'local') {
                    const localRes = await adminUploadMedia(file);
                    h(field, localRes.data.url || '');
                    h('bannerSource', 'upload');
                } else if (signedData.method === 'PUT') {
                    const putRes = await fetch(signedData.uploadUrl, {
                        method: 'PUT',
                        headers: signedData.headers || { 'Content-Type': file.type },
                        body: file,
                    });
                    if (!putRes.ok) throw new Error('Signed banner upload failed.');
                    h(field, signedData.publicUrl || '');
                    h('bannerSource', 'upload');
                } else {
                    const formData = new FormData();
                    Object.entries(signedData.fields || {}).forEach(([key, value]) => {
                        formData.append(key, value);
                    });
                    formData.append('file', file);
                    const postRes = await fetch(signedData.uploadUrl, { method: 'POST', body: formData });
                    if (!postRes.ok) throw new Error('Signed banner upload failed.');
                    h(field, signedData.publicUrl || '');
                    h('bannerSource', 'upload');
                }
            } else {
                const res = await adminUploadMedia(file);
                h(field, res.data.url || '');
            }
            toast.success('Upload complete', { id: t });
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Upload failed', { id: t });
        } finally {
            setUploadingField(null);
        }
    };

    const nextStep = () => {
        if (step === 1 && (!form.title || !form.subject)) { toast.error('Title and Subject required'); return; }
        setStep(s => Math.min(s + 1, 4));
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const stepLabels = ['Basic Info', 'Rules & Security', 'Questions', 'Schedule'];

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stepLabels.map((label, i) => (
                    <div
                        key={i}
                        className={`rounded-xl border px-3 py-2 transition-colors ${step > i + 1
                            ? 'border-emerald-500/50 bg-emerald-500/10'
                            : step === i + 1
                                ? 'border-indigo-500/60 bg-indigo-500/10'
                                : 'border-slate-700 bg-slate-900/40'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step > i + 1
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : step === i + 1
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-slate-600 text-slate-500'
                                    }`}
                            >
                                {i + 1}
                            </div>
                            <span className={`text-xs font-medium ${step === i + 1 ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Exam Title *</label>
                        <input value={String(form.title)} onChange={e => h('title', e.target.value)} placeholder="e.g. Physics MCQ Test"
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Subject *</label>
                            <input value={String(form.subject)} onChange={e => h('subject', e.target.value)} placeholder="e.g. Physics"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Total Questions</label>
                            <input type="number" value={String(form.totalQuestions)} onChange={e => h('totalQuestions', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">University Name (Bengali)</label>
                            <input value={String(form.universityNameBn || '')} onChange={e => h('universityNameBn', e.target.value)} placeholder="e.g. ঢাকা বিশ্ববিদ্যালয়"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Subject (Bengali)</label>
                            <input value={String(form.subjectBn || '')} onChange={e => h('subjectBn', e.target.value)} placeholder="e.g. পদার্থবিজ্ঞান"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Duration (minutes)</label>
                        <input type="number" value={String(form.duration)} onChange={e => h('duration', Number(e.target.value))}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Total Marks</label>
                            <input type="number" value={String(form.totalMarks)} onChange={e => h('totalMarks', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Marks Per Question</label>
                            <input type="number" value={String(form.marksPerQuestion)} onChange={e => h('marksPerQuestion', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                        <span className="text-sm text-white">Negative Marking</span>
                        <button onClick={() => h('negativeMarking', !form.negativeMarking)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${form.negativeMarking ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.negativeMarking ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>
                    {Boolean(form.negativeMarking) && (
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Negative Marks Value</label>
                            <input type="number" step="0.25" value={String(form.negativeMarksValue)} onChange={e => h('negativeMarksValue', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                    )}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Max Answer Change Limit (0 = unlimited)</label>
                        <input type="number" value={String(form.maxAnswerChangeLimit)} onChange={e => h('maxAnswerChangeLimit', Number(e.target.value))}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Delivery Mode</label>
                            <select value={String(form.deliveryMode || 'internal')} onChange={e => h('deliveryMode', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                                <option value="internal">Internal Question Exam</option>
                                <option value="external_link">External Link Exam</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">External Exam Link</label>
                            <input
                                value={String(form.externalExamUrl || '')}
                                onChange={e => h('externalExamUrl', e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 mb-1 block">Exam Banner URL</label>
                            <input
                                value={String(form.bannerImageUrl || '')}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    h('bannerImageUrl', value);
                                    h('bannerSource', value ? 'url' : 'default');
                                }}
                                placeholder="/uploads/..."
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none"
                            />
                            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 hover:bg-indigo-500/25">
                                {uploadingField === 'bannerImageUrl' ? 'Uploading...' : 'Upload Banner'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        void uploadToField('bannerImageUrl', e.target.files?.[0]);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-slate-400 mb-1 block">University Logo URL</label>
                            <input
                                value={String(form.logoUrl || '')}
                                onChange={(e) => h('logoUrl', e.target.value)}
                                placeholder="/uploads/..."
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none"
                            />
                            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 hover:bg-indigo-500/25">
                                {uploadingField === 'logoUrl' ? 'Uploading...' : 'Upload Logo'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => {
                                        void uploadToField('logoUrl', e.target.files?.[0]);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Exam Type</label>
                            <select value={String(form.examType || 'mcq_only')} onChange={e => h('examType', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                                <option value="mcq_only">MCQ Only</option>
                                <option value="written_optional">Written Optional</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Attempt Limit</label>
                            <input type="number" min={1} value={String(form.attemptLimit || 1)} onChange={e => h('attemptLimit', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Autosave Interval (seconds)</label>
                            <input type="number" min={3} max={60} value={String(form.autosave_interval_sec || 5)} onChange={e => h('autosave_interval_sec', Number(e.target.value))}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Branch Filters (comma-separated)</label>
                            <input value={Array.isArray(form.branchFilters) ? (form.branchFilters as string[]).join(', ') : String(form.branchFilters || '')}
                                onChange={e => h('branchFilters', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                placeholder="science, arts"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Batch Filters (comma-separated)</label>
                            <input value={Array.isArray(form.batchFilters) ? (form.batchFilters as string[]).join(', ') : String(form.batchFilters || '')}
                                onChange={e => h('batchFilters', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                placeholder="2024, 2025"
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>

                    <div className="border-t border-indigo-500/10 pt-4 mt-4 space-y-4">
                        <h4 className="text-sm font-bold text-white mb-2">Advanced Security & Features</h4>
                        <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                            <div>
                                <span className="text-sm text-white font-medium block">Enable Written Uploads</span>
                                <span className="text-xs text-slate-500">Allow students to upload image for subjective answers.</span>
                            </div>
                            <button onClick={() => h('written_upload_enabled', !form.written_upload_enabled)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${form.written_upload_enabled ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.written_upload_enabled ? 'left-5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Max Tab Switches (Anti-Cheat)</label>
                                <input type="number" value={String((form.security_policies as any)?.tab_switch_limit || 3)} onChange={e => h('security_policies.tab_switch_limit', Number(e.target.value))}
                                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Max Copy-Paste Violations</label>
                                <input type="number" value={String((form.security_policies as any)?.copy_paste_violations || 3)} onChange={e => h('security_policies.copy_paste_violations', Number(e.target.value))}
                                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Violation Action</label>
                            <select value={String((form.security_policies as any)?.violation_action || 'warn')} onChange={e => h('security_policies.violation_action', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                                <option value="warn">Warn Only</option>
                                <option value="submit">Auto Submit</option>
                                <option value="lock">Lock Attempt</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Defines behavior when a violation threshold is exceeded.</p>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                            <div>
                                <span className="text-sm text-white font-medium block">Require Fullscreen Mode</span>
                                <span className="text-xs text-slate-500">Forces student to stay in fullscreen.</span>
                            </div>
                            <button type="button" onClick={() => h('security_policies.require_fullscreen', !(form.security_policies as any)?.require_fullscreen)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${(form.security_policies as any)?.require_fullscreen ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.security_policies as any)?.require_fullscreen ? 'left-5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                            <div>
                                <span className="text-sm text-white font-medium block">Auto-Submit on Violation</span>
                                <span className="text-xs text-slate-500">Automatically ends exam if threshold is reached.</span>
                            </div>
                            <button type="button" onClick={() => h('security_policies.auto_submit_on_violation', !(form.security_policies as any)?.auto_submit_on_violation)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${(form.security_policies as any)?.auto_submit_on_violation ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.security_policies as any)?.auto_submit_on_violation ? 'left-5' : 'left-0.5'}`} />
                            </button>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-400 block">Exam Instructions & Rules</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Require Agreement</span>
                                    <button type="button" onClick={() => h('require_instructions_agreement', !form.require_instructions_agreement)}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${form.require_instructions_agreement ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                        <span className={`absolute top-[2px] w-3 h-3 bg-white rounded-full shadow transition-transform ${form.require_instructions_agreement ? 'left-[18px]' : 'left-[2px]'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-950/65 rounded-xl overflow-hidden border border-indigo-500/10 [&_.ql-toolbar]:!bg-slate-950/65 [&_.ql-toolbar]:!border-indigo-500/10 [&_.ql-container]:!border-indigo-500/10 [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[120px]">
                                <ReactQuill theme="snow" value={String(form.instructions || '')} onChange={v => h('instructions', v)} modules={QUILL_MODULES} />
                            </div>
                        </div>

                        <div className="border-t border-indigo-500/10 pt-4 space-y-4">
                            <h4 className="text-sm font-bold text-white mb-1">Post-Exam Review Settings</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { key: 'showQuestion', label: 'Show Question Text' },
                                    { key: 'showSelectedAnswer', label: 'Show Student Answer' },
                                    { key: 'showCorrectAnswer', label: 'Show Correct Answer' },
                                    { key: 'showExplanation', label: 'Show Explanation' },
                                    { key: 'showSolutionImage', label: 'Show Solution Image' },
                                ].map((row) => (
                                    <div key={row.key} className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                                        <span className="text-sm text-white">{row.label}</span>
                                        <button type="button" onClick={() => h(`reviewSettings.${row.key}`, !(form.reviewSettings as any)?.[row.key])}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${(form.reviewSettings as any)?.[row.key] ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.reviewSettings as any)?.[row.key] ? 'left-5' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-indigo-500/10 pt-4 space-y-4">
                            <h4 className="text-sm font-bold text-white mb-1">Certificate Policy</h4>
                            <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                                <span className="text-sm text-white">Enable Certificate</span>
                                <button type="button" onClick={() => h('certificateSettings.enabled', !(form.certificateSettings as any)?.enabled)}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${(form.certificateSettings as any)?.enabled ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.certificateSettings as any)?.enabled ? 'left-5' : 'left-0.5'}`} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Minimum Percentage</label>
                                    <input type="number" min={0} max={100} value={String((form.certificateSettings as any)?.minPercentage ?? 40)} onChange={e => h('certificateSettings.minPercentage', Number(e.target.value))}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Template Version</label>
                                    <input value={String((form.certificateSettings as any)?.templateVersion || 'v1')} onChange={e => h('certificateSettings.templateVersion', e.target.value)}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                                </div>
                                <div className="flex items-center justify-between bg-slate-950/65 rounded-xl px-4 py-3 border border-indigo-500/10">
                                    <span className="text-sm text-white">Pass Only</span>
                                    <button type="button" onClick={() => h('certificateSettings.passOnly', !(form.certificateSettings as any)?.passOnly)}
                                        className={`w-10 h-5 rounded-full transition-colors relative ${(form.certificateSettings as any)?.passOnly ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${(form.certificateSettings as any)?.passOnly ? 'left-5' : 'left-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-indigo-500/10 pt-4 space-y-3">
                            <h4 className="text-sm font-bold text-white mb-1">Access Control</h4>
                            <div>
                                <label className="text-xs text-slate-400 mb-2 block">Allowed Groups</label>
                                {groups.length === 0 ? (
                                    <p className="text-xs text-slate-500 rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2">No student groups found. Create groups in Student Management first.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-indigo-500/10 bg-slate-950/65 p-3 max-h-48 overflow-auto">
                                        {groups.map((group) => {
                                            const selected = Array.isArray((form.accessControl as any)?.allowedGroupIds)
                                                ? ((form.accessControl as any).allowedGroupIds as string[]).includes(String(group._id))
                                                : false;
                                            return (
                                                <label key={group._id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors ${selected ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-indigo-500/10 bg-slate-900/40 text-slate-300 hover:bg-slate-900/70'}`}>
                                                    <span className="truncate">{group.name}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={(event) => {
                                                            const current = Array.isArray((form.accessControl as any)?.allowedGroupIds)
                                                                ? [...((form.accessControl as any).allowedGroupIds as string[])]
                                                                : [];
                                                            const target = String(group._id);
                                                            const next = event.target.checked
                                                                ? Array.from(new Set([...current, target]))
                                                                : current.filter((id) => id !== target);
                                                            h('accessControl.allowedGroupIds', next);
                                                        }}
                                                        className="h-4 w-4 accent-cyan-500"
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Allowed Plan Codes (comma-separated)</label>
                                <input
                                    value={Array.isArray((form.accessControl as any)?.allowedPlanCodes) ? ((form.accessControl as any).allowedPlanCodes as string[]).join(', ') : ''}
                                    onChange={(e) => h('accessControl.allowedPlanCodes', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                    placeholder="legacy_free, premium"
                                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Allowed User IDs (comma-separated)</label>
                                <input
                                    value={Array.isArray((form.accessControl as any)?.allowedUserIds) ? ((form.accessControl as any).allowedUserIds as string[]).join(', ') : ''}
                                    onChange={(e) => h('accessControl.allowedUserIds', e.target.value.split(',').map(v => v.trim()).filter(Boolean))}
                                    placeholder="userId1, userId2"
                                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-bold text-white">Dynamic Question Selection Rules</h4>
                            <p className="text-xs text-slate-400">Pull questions from the Global Question Bank dynamically.</p>
                        </div>
                        <button type="button" onClick={addRule} className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-500/30 transition-colors">
                            + Add Rule
                        </button>
                    </div>

                    {((form.question_selection_rules as any[]) || []).length === 0 ? (
                        <div className="text-center p-6 border border-dashed border-indigo-500/20 rounded-xl text-slate-500 text-sm">
                            <p>No rules defined. Empty rules will auto-select any matching subject questions.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {((form.question_selection_rules as any[]) || []).map((r, i) => (
                                <div key={i} className="bg-slate-950/65 border border-indigo-500/10 rounded-xl p-3 flex gap-2 items-start relative">
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
                                        <input placeholder="Subj" value={r.subject} onChange={e => updateRule(i, 'subject', e.target.value)} className="w-full bg-slate-900/65 rounded px-2 py-1 text-xs text-white" />
                                        <input placeholder="Class" value={r.class} onChange={e => updateRule(i, 'class', e.target.value)} className="w-full bg-slate-900/65 rounded px-2 py-1 text-xs text-white" />
                                        <input placeholder="Chap" value={r.chapter} onChange={e => updateRule(i, 'chapter', e.target.value)} className="w-full bg-slate-900/65 rounded px-2 py-1 text-xs text-white" />
                                        <select value={r.difficulty} onChange={e => updateRule(i, 'difficulty', e.target.value)} className="w-full bg-slate-900/65 rounded px-2 py-1 text-xs text-white">
                                            <option value="any">Any Diff</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                        </select>
                                        <input type="number" placeholder="Count" value={r.count} onChange={e => updateRule(i, 'count', Number(e.target.value))} className="w-full bg-slate-900/65 rounded px-2 py-1 text-xs text-white" />
                                    </div>
                                    <button type="button" onClick={() => removeRule(i)} className="text-red-400 p-1 hover:bg-red-400/10 rounded">x</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {step === 4 && (
                <div className="space-y-4">
                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                        <div>
                            <span className="text-sm text-white font-medium block">Publish Immediately on Save</span>
                            <span className="text-xs text-slate-400">Students will be able to see this exam right away.</span>
                        </div>
                        <button type="button" onClick={() => h('isPublished', !form.isPublished)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${form.isPublished ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'left-5' : 'left-0.5'}`} />
                        </button>
                    </div>

                    {/* Schedule Type */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Schedule Type</label>
                        <select value={String(form.scheduleType)} onChange={e => h('scheduleType', e.target.value)}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                            <option value="anytime" className="bg-slate-950/65">Anytime (no time restrictions)</option>
                            <option value="scheduled" className="bg-slate-950/65">Scheduled Window (time-locked)</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {form.scheduleType === 'anytime'
                                ? 'Students can take this exam any time within start-end range.'
                                : 'Exam will only be accessible during the specified window.'}
                        </p>
                    </div>

                    {/* Always-visible date range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Exam Start Date/Time</label>
                            <input type="datetime-local" value={String(form.scheduleStart)} onChange={e => h('scheduleStart', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Exam End Date/Time</label>
                            <input type="datetime-local" value={String(form.scheduleEnd)} onChange={e => h('scheduleEnd', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                        </div>
                    </div>

                    {/* Result publish date */}
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">Result Publish Mode</label>
                        <select value={String(form.resultPublishMode || 'scheduled')} onChange={e => h('resultPublishMode', e.target.value)}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                            <option value="immediate" className="bg-slate-950/65">Immediate</option>
                            <option value="manual" className="bg-slate-950/65">Manual (admin publish)</option>
                            <option value="scheduled" className="bg-slate-950/65">Scheduled date/time</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {String(form.resultPublishMode || 'scheduled') === 'immediate'
                                ? 'Students can view results as soon as their attempt is submitted.'
                                : String(form.resultPublishMode || 'scheduled') === 'manual'
                                    ? 'Results stay hidden until admin explicitly publishes them.'
                                    : 'Results become visible at the selected publish date/time.'}
                        </p>
                    </div>

                    {String(form.resultPublishMode || 'scheduled') === 'scheduled' && (
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Result Publish Date/Time</label>
                            <input
                                type="datetime-local"
                                value={String(form.resultPublishDate || form.scheduleEnd || '')}
                                onChange={e => h('resultPublishDate', e.target.value)}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none"
                            />
                            <p className="text-xs text-slate-500 mt-1">Leave blank to use Exam End time.</p>
                        </div>
                    )}

                    {String(form.resultPublishMode || 'scheduled') === 'manual' && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                            <p className="text-xs text-amber-100">Manual mode keeps results hidden until you use the Publish Result action from admin controls.</p>
                        </div>
                    )}

                    {String(form.resultPublishMode || 'scheduled') === 'immediate' && (
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                            <p className="text-xs text-emerald-100">Immediate mode ignores publish date and shows results right after submission.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                {step > 1 && (
                    <button type="button" onClick={prevStep} className="px-5 py-2.5 text-sm text-slate-400 hover:bg-white/5 rounded-xl transition-colors">Back</button>
                )}
                <div className="flex-1" />
                {step < 4 ? (
                    <button type="button" onClick={nextStep} className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 shadow-lg shadow-indigo-500/20">
                        Next Step
                    </button>
                ) : (
                    <button type="button" onClick={submit} disabled={saving} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-2.5 text-sm font-medium hover:opacity-90 shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                        {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Exam' : 'Create Exam')}
                    </button>
                )}
            </div>
        </div>
    );
}

/* Question Form (Rich Text) */
function QuestionForm({ examId, onSave, onClose }: { examId: string; onSave: () => void; onClose: () => void }) {
    const [form, setForm] = useState<Record<string, unknown>>({
        question: '', optionA: '', optionB: '', optionC: '', optionD: '',
        correctAnswer: 'A', marks: 1, explanation: '',
    });
    const h = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.question) { toast.error('Question text required'); return; }
        try {
            await adminCreateQuestion(examId, {
                question: String(form.question), optionA: String(form.optionA), optionB: String(form.optionB),
                optionC: String(form.optionC), optionD: String(form.optionD),
                correctAnswer: String(form.correctAnswer), marks: Number(form.marks),
                explanation: String(form.explanation),
                explanation_text: String(form.explanation),
            });
            toast.success('Question added!');
            onSave();
            onClose();
        } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className="text-xs text-slate-400 mb-1 block">Question (supports rich text & formulas)</label>
                <div className="bg-slate-950/65 rounded-xl overflow-hidden border border-indigo-500/10 [&_.ql-toolbar]:!bg-slate-950/65 [&_.ql-toolbar]:!border-indigo-500/10 [&_.ql-container]:!border-indigo-500/10 [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[100px]">
                    <ReactQuill theme="snow" value={String(form.question)} onChange={v => h('question', v)} modules={QUILL_MODULES} />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt}>
                        <label className="text-xs text-slate-400 mb-1 block">Option {opt}</label>
                        <input value={String(form[`option${opt}`] || '')} onChange={e => h(`option${opt}`, e.target.value)}
                            className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Correct Answer</label>
                    <select value={String(form.correctAnswer)} onChange={e => h('correctAnswer', e.target.value)}
                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none">
                        {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o} className="bg-slate-950/65">{o}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Marks</label>
                    <input type="number" value={String(form.marks)} onChange={e => h('marks', Number(e.target.value))}
                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/30 outline-none" />
                </div>
            </div>
            <div>
                <label className="text-xs text-slate-400 mb-1 block">Solution (optional)</label>
                <textarea value={String(form.explanation || '')} onChange={e => h('explanation', e.target.value)} rows={3} placeholder="Explanation for the answer..."
                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:opacity-90 shadow-lg flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Add Question
                </button>
            </div>
        </form>
    );
}

/* Confirm Delete */
function DeleteConfirm({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
    return (
        <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white">Delete <span className="font-bold text-red-400">"{label}"</span>?</p>
            <p className="text-sm text-slate-500">This action cannot be undone.</p>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">Delete</button>
            </div>
        </div>
    );
}

/* MFA Confirm */
function MfaConfirmModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) { setError('Password required'); return; }
        setLoading(true);
        try {
            await adminMfaConfirm(password);
            toast.success('Identity verified');
            onConfirm();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Verification failed');
        } finally { setLoading(false); }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 mx-auto flex items-center justify-center">
                <Eye className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-center text-white font-medium">Confirm your identity</p>
            <p className="text-center text-sm text-slate-500">Enter your admin password to proceed.</p>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="Admin password"
                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-indigo-500/30 outline-none" />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-slate-400 hover:bg-white/5 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={loading}
                    className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Confirm'}
                </button>
            </div>
        </form>
    );
}


type AdminDashboardProps = {
    forcedTab?: string;
    forcedSubtab?: 'students' | 'groups' | 'plans';
};

/* Main Admin Dashboard Shell */
export default function AdminDashboard({ forcedTab, forcedSubtab }: AdminDashboardProps = {}) {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [tab, setTab] = useState(forcedTab || 'dashboard');
    const [studentManagementTab, setStudentManagementTab] = useState<'students' | 'groups' | 'plans'>(forcedSubtab || 'students');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [loading, setLoading] = useState(false);

    // Data state
    const [universities, setUniversities] = useState<ApiUniversity[]>([]);
    const [exams, setExams] = useState<AdminExamCard[]>([]);
    const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
    const [studentGroups, setStudentGroups] = useState<AdminStudentGroup[]>([]);
    const [questions, setQuestions] = useState<Array<Record<string, unknown>>>([]);
    const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
    const [selectedExamAnalyticsId, setSelectedExamAnalyticsId] = useState<string | null>(null);

    // Modals
    const [uniModal, setUniModal] = useState<null | 'create' | { data: ApiUniversity }>(null);
    const [examModal, setExamModal] = useState(false);
    const [editingExam, setEditingExam] = useState<(Record<string, unknown> | AdminExamCard) | null>(null);
    const [qModal, setQModal] = useState(false);
    const [showImportQ, setShowImportQ] = useState(false);
    const [deleteModal, setDeleteModal] = useState<null | { type: 'uni' | 'bulk-uni' | 'exam' | 'q'; id: string; label: string }>(null);
    const [pendingExport, setPendingExport] = useState<null | string>(null);
    const [importingUni, setImportingUni] = useState(false);
    const [examSearch, setExamSearch] = useState('');
    const [examStatusFilter, setExamStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'completed' | 'draft'>('all');
    const [examGroupFilter, setExamGroupFilter] = useState('all');

    const isAdmin = user && ['superadmin', 'admin', 'moderator', 'editor', 'viewer'].includes(user.role);

    // Keep tab state aligned with routed entry-points.
    useEffect(() => {
        setTab(forcedTab || 'dashboard');
        if (forcedTab === 'student-management') {
            setStudentManagementTab(forcedSubtab || 'students');
            return;
        }
        setStudentManagementTab('students');
    }, [forcedTab, forcedSubtab]);

    // One-time migration for legacy query based links (?tab=...&subtab=...).
    useEffect(() => {
        if (!location.search.includes('tab=')) return;
        const mapped = adminRouteFromLegacySearch(location.search);
        if (!mapped) return;
        const cleanCurrent = `${location.pathname}`;
        if (mapped === cleanCurrent) {
            navigate({ pathname: cleanCurrent, search: '' }, { replace: true });
            return;
        }
        navigate(mapped, { replace: true });
    }, [location.pathname, location.search, navigate]);

    const refreshExamCards = useCallback(async () => {
        const examRes = await adminGetExams({ view: 'cards', includeMetrics: 'true', limit: 200 }).catch(() => ({ data: { exams: [] } }));
        setExams(examRes.data.exams || examRes.data || []);
    }, []);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/__cw_admin__/login');
            return;
        }
        if (!isLoading && isAuthenticated && !isAdmin) {
            navigate('/__cw_admin__/access-denied', { replace: true });
            return;
        }
    }, [isLoading, isAuthenticated, isAdmin, navigate, user?.role]);

    const fetchAll = useCallback(async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const shouldFetchUsers = user?.role === 'superadmin';
            const [examRes, userRes, uniRes, groupRes] = await Promise.all([
                adminGetExams({ view: 'cards', includeMetrics: 'true', limit: 200 }).catch(() => ({ data: { exams: [] } })),
                shouldFetchUsers
                    ? adminGetUsers().catch(() => ({ data: { users: [] } }))
                    : Promise.resolve({ data: { users: [] } }),
                adminGetUniversities({ page: 1, limit: 25 }).catch(() => ({ data: { universities: [] } })),
                adminGetStudentGroups().catch(() => ({ data: { items: [] } })),
            ]);
            setExams(examRes.data.exams || examRes.data || []);
            setUsers(userRes.data.users || userRes.data || []);
            setUniversities(uniRes.data.universities || uniRes.data || []);
            setStudentGroups(groupRes.data.items || []);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [isAdmin, user?.role]);

    useEffect(() => {
        if (isAuthenticated && isAdmin) fetchAll();
    }, [isAuthenticated, isAdmin, fetchAll]);

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) return;
        let cancelled = false;
        let source: EventSource | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let backoffMs = 1000;

        const connect = () => {
            if (cancelled) return;
            source = new EventSource(getAdminLiveStreamUrl(), { withCredentials: true });
            const refresh = () => {
                if (cancelled) return;
                void refreshExamCards();
            };
            ['exam-metrics-updated', 'attempt-connected', 'attempt-updated', 'forced-submit', 'attempt-locked', 'autosave'].forEach((eventName) => {
                source?.addEventListener(eventName, refresh);
            });
            source.onerror = () => {
                source?.close();
                if (cancelled) return;
                reconnectTimer = setTimeout(connect, backoffMs);
                backoffMs = Math.min(backoffMs * 2, 30000);
            };
            source.onopen = () => {
                backoffMs = 1000;
            };
        };

        connect();
        return () => {
            cancelled = true;
            source?.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, [isAuthenticated, isAdmin, refreshExamCards]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background dark:bg-slate-950/65 flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const fetchQuestions = async (examId: string) => {
        setSelectedExamId(examId);
        const res = await adminGetQuestions(examId).catch(() => ({ data: { questions: [] } }));
        setQuestions(res.data.questions || res.data || []);
    };

    const normalizeObject = (value: unknown): Record<string, unknown> => (
        value && typeof value === 'object' && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {}
    );

    const normalizeStringArray = (value: unknown): string[] => {
        if (Array.isArray(value)) {
            return value
                .map((entry) => {
                    if (!entry) return '';
                    if (typeof entry === 'object' && '_id' in (entry as Record<string, unknown>)) {
                        return String((entry as Record<string, unknown>)._id || '');
                    }
                    return String(entry);
                })
                .map((entry) => entry.trim())
                .filter(Boolean);
        }
        if (typeof value === 'string') {
            return value.split(',').map((entry) => entry.trim()).filter(Boolean);
        }
        return [];
    };

    const toIsoString = (value: unknown, fallback?: string): string | undefined => {
        const source = typeof value === 'string' ? value : '';
        if (source) {
            const date = new Date(source);
            if (!Number.isNaN(date.getTime())) return date.toISOString();
        }
        return fallback;
    };

    const buildExamPayload = (
        data: Record<string, unknown>,
        mode: 'create' | 'update',
    ): Record<string, unknown> => {
        const nowIso = new Date().toISOString();
        const defaultEndIso = new Date(Date.now() + 7 * 86400000).toISOString();
        const manualHiddenUntilIso = '2999-12-31T23:59:59.999Z';

        const startDate = mode === 'create'
            ? toIsoString(data.scheduleStart, nowIso)
            : toIsoString(data.scheduleStart);
        const endDate = mode === 'create'
            ? toIsoString(data.scheduleEnd, defaultEndIso)
            : toIsoString(data.scheduleEnd);

        const publishModeRaw = String(data.resultPublishMode || '').trim().toLowerCase();
        const resultPublishMode: 'immediate' | 'manual' | 'scheduled' = (
            publishModeRaw === 'immediate' ||
            publishModeRaw === 'manual' ||
            publishModeRaw === 'scheduled'
        ) ? publishModeRaw : 'scheduled';

        const resultPublishDate = resultPublishMode === 'scheduled'
            ? toIsoString(data.resultPublishDate, endDate || defaultEndIso)
            : resultPublishMode === 'manual'
                ? toIsoString(data.resultPublishDate, manualHiddenUntilIso)
                : toIsoString(data.resultPublishDate, endDate || defaultEndIso);

        const securityPoliciesInput = normalizeObject(data.security_policies);
        const legacyAutoSubmit = Boolean(securityPoliciesInput.auto_submit_on_violation);
        const violationActionRaw = String(securityPoliciesInput.violation_action || '').trim().toLowerCase();
        const violationAction: 'warn' | 'submit' | 'lock' = (
            violationActionRaw === 'warn' ||
            violationActionRaw === 'submit' ||
            violationActionRaw === 'lock'
        )
            ? (violationActionRaw as 'warn' | 'submit' | 'lock')
            : (legacyAutoSubmit ? 'submit' : 'warn');

        const reviewInput = normalizeObject(data.reviewSettings);
        const certificateInput = normalizeObject(data.certificateSettings);
        const accessControlInput = normalizeObject(data.accessControl);
        const externalExamUrl = String(data.externalExamUrl || '').trim();
        const deliveryModeRaw = String(data.deliveryMode || '').trim().toLowerCase();
        const deliveryMode: 'internal' | 'external_link' = (
            deliveryModeRaw === 'external_link' || deliveryModeRaw === 'internal'
        )
            ? deliveryModeRaw
            : (externalExamUrl ? 'external_link' : 'internal');
        const resolvedExternalExamUrl = deliveryMode === 'external_link' ? externalExamUrl : '';
        const bannerImageUrl = String(data.bannerImageUrl || '').trim();
        const bannerSourceRaw = String(data.bannerSource || '').trim().toLowerCase();
        const bannerSource: 'upload' | 'url' | 'default' = (
            bannerSourceRaw === 'upload' || bannerSourceRaw === 'url' || bannerSourceRaw === 'default'
        )
            ? bannerSourceRaw
            : (bannerImageUrl ? 'url' : 'default');

        const payload: Record<string, unknown> = {
            ...data,
            externalExamUrl: resolvedExternalExamUrl,
            deliveryMode,
            bannerImageUrl,
            bannerSource,
            startDate,
            endDate,
            resultPublishDate,
            resultPublishMode,
            isPublished: Boolean(data.isPublished),
            totalQuestions: Number(data.totalQuestions || 10),
            totalMarks: Number(data.totalMarks || 10),
            duration: Number(data.duration || 30),
            marksPerQuestion: Number(data.marksPerQuestion || 1),
            negativeMarksValue: Number(data.negativeMarksValue || 0),
            maxAnswerChangeLimit: Number(data.maxAnswerChangeLimit || 0),
            autosave_interval_sec: Math.max(3, Math.min(60, Number(data.autosave_interval_sec || 5))),
            security_policies: {
                ...securityPoliciesInput,
                tab_switch_limit: Number(securityPoliciesInput.tab_switch_limit || 3),
                copy_paste_violations: Number(securityPoliciesInput.copy_paste_violations || 3),
                require_fullscreen: Boolean(securityPoliciesInput.require_fullscreen),
                camera_enabled: Boolean(securityPoliciesInput.camera_enabled),
                violation_action: violationAction,
                auto_submit_on_violation: violationAction === 'submit',
            },
            reviewSettings: {
                showQuestion: Boolean(reviewInput.showQuestion ?? true),
                showSelectedAnswer: Boolean(reviewInput.showSelectedAnswer ?? true),
                showCorrectAnswer: Boolean(reviewInput.showCorrectAnswer ?? true),
                showExplanation: Boolean(reviewInput.showExplanation ?? true),
                showSolutionImage: Boolean(reviewInput.showSolutionImage ?? true),
            },
            certificateSettings: {
                enabled: Boolean(certificateInput.enabled),
                minPercentage: Math.max(0, Math.min(100, Number(certificateInput.minPercentage ?? 40))),
                passOnly: Boolean(certificateInput.passOnly ?? true),
                templateVersion: String(certificateInput.templateVersion || 'v1'),
            },
            accessControl: {
                allowedGroupIds: normalizeStringArray(accessControlInput.allowedGroupIds),
                allowedPlanCodes: normalizeStringArray(accessControlInput.allowedPlanCodes),
                allowedUserIds: normalizeStringArray(accessControlInput.allowedUserIds),
            },
        };

        if (mode === 'update') {
            if (!startDate) delete payload.startDate;
            if (!endDate) delete payload.endDate;
            if (!resultPublishDate) delete payload.resultPublishDate;
        }

        return payload;
    };

    const handleCreateExam = async (data: Record<string, unknown>) => {
        await adminCreateExam(buildExamPayload(data, 'create'));
        toast.success('Exam created!');
        fetchAll();
    };
    const handleUpdateExam = async (id: string, data: Record<string, unknown>) => {
        await adminUpdateExam(id, buildExamPayload(data, 'update'));
        toast.success('Exam updated!');
        fetchAll();
    };
    const handleDeleteExam = async (id: string) => { await adminDeleteExam(id); toast.success('Exam deleted'); setDeleteModal(null); fetchAll(); };
    const handlePublishExam = async (id: string) => { await adminPublishExam(id); toast.success('Exam published!'); fetchAll(); };
    const resolveExamSharePath = (exam: Partial<AdminExamCard>): string => {
        const primary = String(exam.shareUrl || '').trim();
        const fallbackShare = String(exam.share_link || '').trim();
        const fallbackId = String(exam._id || '').trim();
        const raw = primary || fallbackShare;
        if (!raw) {
            return fallbackId ? `/exam/take/${fallbackId}` : '';
        }

        if (/^https?:\/\//i.test(raw)) {
            try {
                const parsed = new URL(raw);
                return `${parsed.pathname}${parsed.search}${parsed.hash}` || '';
            } catch {
                return '';
            }
        }

        if (raw.startsWith('/')) {
            return raw;
        }
        if (raw.startsWith('exam/')) {
            return `/${raw}`;
        }
        return `/exam/take/${raw}`;
    };

    const toAbsoluteUrl = (pathOrUrl: string): string => {
        const value = String(pathOrUrl || '').trim();
        if (!value) return '';
        if (/^https?:\/\//i.test(value)) return value;
        if (value.startsWith('/')) return `${window.location.origin}${value}`;
        return `${window.location.origin}/${value}`;
    };

    const openExamPreview = (pathOrUrl: string) => {
        const fullUrl = toAbsoluteUrl(pathOrUrl);
        if (!fullUrl) {
            toast.error('Share URL not available yet.');
            return;
        }
        window.open(fullUrl, '_blank', 'noopener,noreferrer');
    };

    const handleRegenerateShareLink = async (id: string) => {
        const res = await adminRegenerateExamShareLink(id);
        toast.success('Share URL regenerated');
        await refreshExamCards();
        return res.data.shareUrl;
    };
    const copyExamShareLink = async (shareUrl?: string) => {
        if (!shareUrl) {
            toast.error('Share URL not available yet.');
            return;
        }
        const fullUrl = toAbsoluteUrl(shareUrl);
        if (!fullUrl) {
            toast.error('Share URL not available yet.');
            return;
        }
        await navigator.clipboard.writeText(fullUrl);
        toast.success('Share URL copied');
    };
    const triggerExport = async (examId: string) => {
        const toastId = toast.loading('Generating Excel...');
        try {
            setPendingExport(null);
            const res = await adminExportExamResults(examId);
            downloadFile(res, { filename: `Results_${examId}.xlsx` });
            toast.success('Download complete', { id: toastId });
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Export failed', { id: toastId });
        }
    };
    const handleDeleteQuestion = async (examId: string, qId: string) => { await adminDeleteQuestion(examId, qId); toast.success('Question deleted'); setDeleteModal(null); fetchQuestions(examId); };
    const handleCreateUni = async (data: Partial<ApiUniversity>) => {
        await adminCreateUniversity(data);
        toast.success('University created');
        setUniModal(null);
        fetchAll();
    };
    const handleUpdateUni = async (id: string, data: Partial<ApiUniversity>) => {
        await adminUpdateUniversity(id, data);
        toast.success('University updated');
        setUniModal(null);
        fetchAll();
    };
    const handleDeleteUni = async (id: string) => {
        await adminDeleteUniversity(id);
        toast.success('University deleted');
        setDeleteModal(null);
        fetchAll();
    };
    const handleBulkDeleteUni = async () => {
        toast('Bulk university delete is available in Universities panel.');
        setDeleteModal(null);
    };
    const handleBulkImportUni = async (e: any) => {
        const file = e?.target?.files?.[0] as File | undefined;
        if (!file) return;

        setImportingUni(true);
        const toastId = toast.loading('Importing universities...');
        try {
            const formData = new FormData();
            formData.append('file', file);
            await adminBulkImportUniversities(formData);

            toast.success('University import completed', { id: toastId });
            fetchAll();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Import failed', { id: toastId });
        } finally {
            setImportingUni(false);
            if (e?.target) e.target.value = '';
        }
    };

    if (!isAdmin) return null;

    const handleLogout = () => { logout(); navigate('/__cw_admin__/login'); };
    const handleTabChange = (nextTab: string) => {
        setTab(nextTab);
        const nextSubtab = nextTab === 'student-management' ? 'students' : undefined;
        if (nextTab === 'student-management') {
            setStudentManagementTab('students');
        } else if (studentManagementTab !== 'students') {
            setStudentManagementTab('students');
        }
        const routePath = adminRouteFromTab(nextTab, nextSubtab);
        if (routePath && location.pathname !== routePath) {
            navigate(routePath);
        }
    };

    /* Render inline panels (University, Exam, User, Settings, FileUpload) */

    const renderExams = () => {
        const groupOptions = Array.from(new Set(exams.map((exam) => String(exam.group_category || 'Custom')))).sort();
        const query = examSearch.trim().toLowerCase();
        const filtered = exams.filter((exam) => {
            const byStatus = examStatusFilter === 'all' || String(exam.statusBadge || 'draft') === examStatusFilter;
            const byGroup = examGroupFilter === 'all' || String(exam.group_category || 'Custom') === examGroupFilter;
            const searchable = `${exam.title} ${exam.subject || ''} ${exam.subjectBn || ''} ${(exam.groupNames || []).join(' ')}`.toLowerCase();
            const bySearch = !query || searchable.includes(query);
            return byStatus && byGroup && bySearch;
        });
        const grouped = filtered.reduce<Record<string, AdminExamCard[]>>((acc, exam) => {
            const key = String(exam.group_category || 'Custom');
            if (!acc[key]) acc[key] = [];
            acc[key].push(exam);
            return acc;
        }, {});

        return (
            <div className="space-y-5">
                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/60 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="font-bold text-white text-lg">Exams Dashboard ({filtered.length}/{exams.length})</h3>
                            <p className="text-xs text-slate-400 mt-1">Responsive card dashboard with live participants, group access and share links.</p>
                        </div>
                        <button
                            onClick={() => { setEditingExam(null); setExamModal(true); }}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:opacity-90"
                        >
                            <Plus className="h-4 w-4" /> Create Exam
                        </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="sm:col-span-2">
                            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2.5">
                                <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                                <input
                                    value={examSearch}
                                    onChange={(event) => setExamSearch(event.target.value)}
                                    placeholder="Search title/subject/group..."
                                    className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
                                />
                            </div>
                        </div>
                        <select
                            value={examStatusFilter}
                            onChange={(event) => setExamStatusFilter(event.target.value as typeof examStatusFilter)}
                            className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2.5 text-sm text-white outline-none"
                        >
                            <option value="all">All Status</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="live">Live</option>
                            <option value="completed">Completed</option>
                            <option value="draft">Draft</option>
                        </select>
                        <select
                            value={examGroupFilter}
                            onChange={(event) => setExamGroupFilter(event.target.value)}
                            className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2.5 text-sm text-white outline-none"
                        >
                            <option value="all">All Groups</option>
                            {groupOptions.map((groupName) => (
                                <option key={groupName} value={groupName}>{groupName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
                        No exams found for current filters.
                    </div>
                ) : (
                    Object.entries(grouped).map(([category, items]) => (
                        <section key={category} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-cyan-300" />
                                <h4 className="text-sm font-semibold text-cyan-100">{category}</h4>
                                <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] text-cyan-300">{items.length}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {items.map((exam) => {
                                    const statusClass = exam.statusBadge === 'live'
                                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                        : exam.statusBadge === 'upcoming'
                                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                                            : exam.statusBadge === 'completed'
                                                ? 'bg-slate-500/20 text-slate-300 border-slate-500/25'
                                                : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                                    const startLabel = exam.startDate ? new Date(String(exam.startDate)).toLocaleString() : 'N/A';
                                    const endLabel = exam.endDate ? new Date(String(exam.endDate)).toLocaleString() : 'N/A';
                                    const sharePath = resolveExamSharePath(exam);
                                    return (
                                        <article
                                            key={String(exam._id)}
                                            className="group overflow-hidden rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-slate-900/90 via-[#111b34]/90 to-[#0c1a2f]/90 shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-indigo-500/20"
                                        >
                                            <div className="relative h-28 w-full overflow-hidden border-b border-indigo-500/15 bg-slate-950/70">
                                                {exam.bannerImageUrl ? (
                                                    <img src={exam.bannerImageUrl} alt={exam.bannerAltText || exam.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                                                ) : (
                                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/35 via-cyan-500/25 to-emerald-500/25" />
                                                )}
                                                <div className="absolute left-3 top-3 flex items-center gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}>{String(exam.statusBadge || 'draft')}</span>
                                                    {Number(exam.activeUsers || 0) > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                                                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                                                            Active {Number(exam.activeUsers || 0)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div className="space-y-3 p-4">
                                                <div className="space-y-1">
                                                    <h5 className="line-clamp-2 text-sm font-bold text-white">{exam.title}</h5>
                                                    <p className="text-xs text-slate-300">{exam.subjectBn || exam.subject || 'General'} • {Number(exam.totalQuestions || 0)} Q • {Number(exam.totalMarks || 0)} marks</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {(exam.groupNames || []).slice(0, 3).map((name) => (
                                                            <span key={name} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">{name}</span>
                                                        ))}
                                                        {(exam.groupNames || []).length === 0 ? (
                                                            <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-300">All Students</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-200 sm:grid-cols-2">
                                                    <div className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-2"><p className="text-slate-400">Participants</p><p className="font-semibold">{Number(exam.totalParticipants || 0)}</p></div>
                                                    <div className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-2"><p className="text-slate-400">Attempted</p><p className="font-semibold">{Number(exam.attemptedUsers || 0)}</p></div>
                                                    <div className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-2"><p className="text-slate-400">Remaining</p><p className="font-semibold">{Number(exam.remainingUsers || 0)}</p></div>
                                                    <div className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-2"><p className="text-slate-400">Duration</p><p className="font-semibold">{Number(exam.duration || 0)} min</p></div>
                                                </div>
                                                <div className="space-y-1 text-[11px] text-slate-300">
                                                    <p className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5 text-cyan-300" /> Start: {startLabel}</p>
                                                    <p className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-cyan-300" /> End: {endLabel}</p>
                                                    <p className="flex items-start gap-1 text-slate-400 break-all">
                                                        <Link2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                                        <span className="line-clamp-2">{sharePath || 'Share link not generated'}</span>
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <button type="button" onClick={() => { setEditingExam(exam); setExamModal(true); }} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"><span className="inline-flex items-center gap-1"><Edit className="h-3.5 w-3.5" /> Edit</span></button>
                                                    {!exam.isPublished ? (
                                                        <button type="button" onClick={() => void handlePublishExam(String(exam._id))} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20">Publish</button>
                                                    ) : (
                                                        <button type="button" onClick={() => setPendingExport(String(exam._id))} className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-medium text-fuchsia-300 hover:bg-fuchsia-500/20"><span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Export</span></button>
                                                    )}
                                                    <button type="button" onClick={() => void copyExamShareLink(sharePath)} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/20"><span className="inline-flex items-center gap-1"><Copy className="h-3.5 w-3.5" /> Copy URL</span></button>
                                                    <button type="button" onClick={() => void handleRegenerateShareLink(String(exam._id))} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-500/20"><span className="inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Regenerate URL</span></button>
                                                    <button type="button" onClick={() => { fetchQuestions(String(exam._id)); setSelectedExamAnalyticsId(null); }} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-200 hover:bg-sky-500/20"><span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Questions</span></button>
                                                    <button type="button" onClick={() => { setSelectedExamAnalyticsId(String(exam._id)); setSelectedExamId(null); }} className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-200 hover:bg-orange-500/20"><span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Monitor</span></button>
                                                    <button type="button" onClick={() => openExamPreview(sharePath)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"><span className="inline-flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" /> Join Preview</span></button>
                                                    <button type="button" onClick={() => setDeleteModal({ type: 'exam', id: String(exam._id), label: String(exam.title) })} className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/20"><span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</span></button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    ))
                )}
                {selectedExamId && (
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-indigo-500/10 overflow-hidden">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-indigo-500/10">
                            <h3 className="font-bold text-white">Questions ({questions.length})</h3>
                            <div className="flex gap-2">
                                <button onClick={() => setShowImportQ(true)} className="bg-indigo-600 text-white text-sm px-3 py-2 rounded-xl flex items-center gap-2 hover:opacity-90"><Upload className="w-4 h-4" /> Upload</button>
                                <button onClick={() => setQModal(true)} className="bg-emerald-600 text-white text-sm px-3 py-2 rounded-xl flex items-center gap-2 hover:opacity-90"><Plus className="w-4 h-4" /> Add Q</button>
                                <button onClick={() => setSelectedExamId(null)} className="p-2 hover:bg-white/5 rounded-xl"><X className="w-4 h-4 text-slate-400" /></button>
                            </div>
                        </div>
                        <div className="divide-y divide-indigo-500/5 max-h-96 overflow-y-auto">
                            {questions.length === 0 ? (
                                <p className="text-slate-500 text-center py-8 text-sm">No questions. Add some!</p>
                            ) : questions.map((q, i) => (
                                <div key={String(q._id)} className="px-4 py-3 hover:bg-white/[0.02] flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white line-clamp-2">{String(q.question)}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Correct: {String(q.correctAnswer)} · {String(q.marks || 1)} mark(s)</p>
                                    </div>
                                    <button onClick={() => setDeleteModal({ type: 'q', id: String(q._id), label: String(q.question).slice(0, 30) })} className="p-1 hover:bg-red-500/10 rounded-lg flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {selectedExamAnalyticsId && (
                    <div className="mt-6">
                        <ExamAnalyticsPanel examId={selectedExamAnalyticsId} onClose={() => setSelectedExamAnalyticsId(null)} />
                    </div>
                )}
            </div>
        );
    };





    const renderFileUpload = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-white">File Upload & Data Mapping</h2>
                <p className="text-xs text-slate-500">Import universities and exam data from Excel/CSV files</p>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-indigo-500/10 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 mx-auto flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold mb-2">Upload Excel or CSV</h3>
                <p className="text-sm text-slate-500 mb-6">Supported formats: .xlsx, .xls, .csv</p>
                <label className={`inline-flex cursor-pointer bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-6 py-3 rounded-xl items-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/20 ${importingUni ? 'opacity-50 pointer-events-none' : ''}`}>
                    {importingUni ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Select File
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImportUni} />
                </label>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-5 gap-3 text-left">
                    {['1. Upload File', '2. Auto Detect Columns', '3. Map Columns', '4. Preview Data', '5. Import to DB'].map((step, i) => (
                        <div key={i} className="bg-slate-950/65 rounded-xl p-3 border border-indigo-500/5">
                            <p className="text-xs text-indigo-400 font-semibold">{step}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    /* Content Router */
    const renderContent = () => {
        const r = user?.role || 'student';

        // Role-Based UI Guard
        if (['settings', 'users', 'exports', 'file-upload', 'logs'].includes(tab) && !['superadmin', 'admin'].includes(r)) {
            return <div className="text-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">Unauthorized Access. You do not have permission to view this module.</div>;
        }
        if (['student-management', 'subscription-plans'].includes(tab) && !['superadmin', 'admin', 'moderator'].includes(r)) {
            return <div className="text-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">Unauthorized Access. Student management rights required.</div>;
        }
        if (['contact', 'featured', 'student-dashboard-control'].includes(tab) && !['superadmin', 'admin', 'moderator'].includes(r)) {
            return <div className="text-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">Unauthorized Access. Minimal moderator rights required.</div>;
        }
        if (['universities', 'exams', 'live-monitor', 'question-bank', 'news', 'resources', 'banners', 'home-control', 'reports'].includes(tab) && !['superadmin', 'admin', 'moderator', 'editor'].includes(r)) {
            return <div className="text-center py-20 text-red-400 bg-red-500/5 rounded-2xl border border-red-500/10">Unauthorized Access. Editor rights required.</div>;
        }

        switch (tab) {
            case 'dashboard': return <DashboardHome universities={universities} exams={exams} users={users} onTabChange={handleTabChange} />;
            case 'universities': return <UniversitiesPanel />;
            case 'featured': return <FeaturedUniversitiesPanel />;
            case 'student-dashboard-control': return <StudentDashboardControlPanel />;
            case 'exams': return renderExams();
            case 'live-monitor': return <LiveExamMonitorPanel />;
            case 'news':
                return (
                    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-8 text-center">
                        <h3 className="text-2xl font-bold text-white">News System V2</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            News management has moved to the dedicated admin route tree.
                        </p>
                        <div className="mt-6">
                            <button className="btn-primary" onClick={() => navigate('/__cw_admin__/news/dashboard')}>
                                Open News Console
                            </button>
                        </div>
                    </div>
                );
            case 'question-bank': return <QuestionBankPanel />;
            case 'resources': return <ResourcesPanel />;
            case 'contact': return <ContactPanel />;
            case 'banners': return <BannerPanel />;
            case 'alerts': return <AlertsPanel />;
            case 'finance': return <FinancePanel />;
            case 'support-tickets': return <SupportTicketsPanel />;
            case 'backups': return <BackupsPanel />;
            case 'file-upload': return renderFileUpload();
            case 'reports': return <ReportsPanel exams={exams} users={users} />;
            case 'home-control': return <HomeControlPanel />;
            case 'student-management':
                return (
                    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-8 text-center">
                        <h3 className="text-2xl font-bold text-white">Student Management Module</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Student and subscription management now runs from the route-based admin console.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                            <button
                                className="btn-primary"
                                onClick={() => navigate(studentManagementTab === 'groups'
                                    ? '/__cw_admin__/student-management/groups'
                                    : '/__cw_admin__/student-management/list')}
                            >
                                Open Student Console
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => navigate('/__cw_admin__/subscriptions/plans')}
                            >
                                Open Subscription Plans
                            </button>
                        </div>
                    </div>
                );
            case 'subscription-plans':
                return (
                    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-8 text-center">
                        <h3 className="text-2xl font-bold text-white">Subscription Plans Module</h3>
                        <p className="mt-2 text-sm text-slate-400">
                            Subscription plans management has moved to dedicated admin routes.
                        </p>
                        <div className="mt-6">
                            <button className="btn-primary" onClick={() => navigate('/__cw_admin__/subscriptions/plans')}>
                                Open /__cw_admin__/subscriptions/plans
                            </button>
                        </div>
                    </div>
                );
            case 'security': return <SecuritySettingsPanel />;
            case 'users': return <UsersPanel />;
            case 'password': return <PasswordPanel />;
            case 'exports': return <ExportsPanel />;
            case 'admin-profile': return <AdminProfilePanel />;
            case 'settings': return <SiteSettingsPanel />;
            case 'logs': return <SystemLogsPanel />;
            default: return <DashboardHome universities={universities} exams={exams} users={users} onTabChange={handleTabChange} />;
        }
    };

    return (
        <div className="min-h-screen bg-background text-text dark:bg-slate-950/65 dark:text-dark-text flex overflow-x-hidden">
            {/* Sidebar */}
            <AdminSidebar
                activeTab={tab}
                onTabChange={handleTabChange}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                user={user}
                onLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col">
                <AdminTopbar
                    activeTab={tab}
                    onMenuClick={() => setSidebarOpen(true)}
                    onRefresh={fetchAll}
                    loading={loading}
                    user={user}
                    onLogout={handleLogout}
                    onTabChange={handleTabChange}
                />

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6">
                    {renderContent()}
                </div>
            </main>

            {/* Modals */}
            {uniModal === 'create' && (
                <Modal title="Add University" onClose={() => setUniModal(null)}>
                    <UniversityForm onSave={handleCreateUni} onClose={() => setUniModal(null)} />
                </Modal>
            )}
            {uniModal && uniModal !== 'create' && (
                <Modal title="Edit University" onClose={() => setUniModal(null)}>
                    <UniversityForm initial={uniModal.data} onSave={d => handleUpdateUni(uniModal.data._id, d)} onClose={() => setUniModal(null)} />
                </Modal>
            )}
            {examModal && (
                <Modal title={editingExam ? 'Edit Exam' : 'Create Exam'} onClose={() => { setExamModal(false); setEditingExam(null); }}>
                    <ExamForm
                        initial={editingExam || undefined}
                        groups={studentGroups}
                        onSave={(data) => editingExam ? handleUpdateExam(String(editingExam._id), data) : handleCreateExam(data)}
                        onClose={() => { setExamModal(false); setEditingExam(null); }}
                    />
                </Modal>
            )}
            {qModal && selectedExamId && (
                <Modal title="Add Question" onClose={() => setQModal(false)}>
                    <QuestionForm examId={selectedExamId} onSave={() => fetchQuestions(selectedExamId)} onClose={() => setQModal(false)} />
                </Modal>
            )}
            {showImportQ && selectedExamId && (
                <Modal title="Upload Questions" onClose={() => setShowImportQ(false)}>
                    <QuestionImporter
                        onClose={() => setShowImportQ(false)}
                        onImport={async (mapped) => {
                            await adminBulkImportExamQuestions(selectedExamId, mapped);
                            toast.success(`Successfully imported ${mapped.length} questions`);
                            fetchQuestions(selectedExamId);
                            setShowImportQ(false);
                        }}
                    />
                </Modal>
            )}
            {deleteModal && (
                <Modal title="Confirm Delete" onClose={() => setDeleteModal(null)}>
                    <DeleteConfirm
                        label={deleteModal.label}
                        onClose={() => setDeleteModal(null)}
                        onConfirm={() => {
                            if (deleteModal.type === 'uni') handleDeleteUni(deleteModal.id);
                            else if (deleteModal.type === 'bulk-uni') handleBulkDeleteUni();
                            else if (deleteModal.type === 'exam') handleDeleteExam(deleteModal.id);
                            else if (deleteModal.type === 'q' && selectedExamId) handleDeleteQuestion(selectedExamId, deleteModal.id);
                        }}
                    />
                </Modal>
            )}
            {pendingExport && (
                <Modal title="Verify Identity" onClose={() => setPendingExport(null)}>
                    <MfaConfirmModal onClose={() => setPendingExport(null)} onConfirm={() => triggerExport(pendingExport)} />
                </Modal>
            )}
        </div>
    );
}
