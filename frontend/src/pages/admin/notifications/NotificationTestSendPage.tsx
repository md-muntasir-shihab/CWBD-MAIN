import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import {
  getTestSendMeta,
  previewTestSend,
  executeTestSend,
  getTestSendLogs,
  retryTestSend,
  searchStudents,
  type TestSendChannel,
  type RecipientMode,
  type MessageMode,
  type TestSendMeta,
  type TestSendPreviewResult,
  type TestSendResult,
  type TestSendLogItem,
  type TestSendPreset,
} from '../../../api/adminTestSendApi';
import {
  Send, Eye, RotateCcw, Copy,
  Phone, Mail, Search,
  AlertTriangle, CheckCircle2, XCircle, Loader2,
  Smartphone, MessageSquare, FileText, DollarSign, Zap,
} from 'lucide-react';

/* ─── Helpers ─────────────────────────────────────── */
const inp = (extra = '') =>
  `w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 ${extra}`;

const btnPrimary = 'inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const btnSecondary = 'inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';


const STATUS_BADGE: Record<string, string> = {
  sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  logged: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  queued: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const CHANNEL_ICONS: Record<string, typeof Phone> = { sms: Smartphone, email: Mail };

const FINANCE_SYNC_BADGE: Record<string, { label: string; cls: string }> = {
  synced: { label: 'Synced', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  none: { label: '—', cls: 'text-slate-400' },
};

interface FormState {
  channel: TestSendChannel;
  recipientMode: RecipientMode;
  messageMode: MessageMode;
  studentId: string;
  studentLabel: string;
  customPhone: string;
  customEmail: string;
  providerId: string;
  templateKey: string;
  customBody: string;
  customSubject: string;
  placeholders: Record<string, string>;
  logOnly: boolean;
}

const INITIAL_FORM: FormState = {
  channel: 'sms',
  recipientMode: 'student',
  messageMode: 'template',
  studentId: '',
  studentLabel: '',
  customPhone: '',
  customEmail: '',
  providerId: '',
  templateKey: '',
  customBody: '',
  customSubject: '',
  placeholders: {},
  logOnly: false,
};

/* ─── Main Page ───────────────────────────────────── */
export default function NotificationTestSendPage() {
  return (
    <AdminGuardShell
      requiredModule="notifications"
      title="Test Send — SMS & Email"
      description="Send test messages to verify delivery, preview templates, and estimate costs before launching campaigns. যেকোনো ক্যাম্পেইন লঞ্চের আগে এখানে টেস্ট করুন।"
    >
      <TestSendConsole />
    </AdminGuardShell>
  );
}

function TestSendConsole() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [preview, setPreview] = useState<TestSendPreviewResult | null>(null);
  const [sendResult, setSendResult] = useState<TestSendResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  const { data: meta, isLoading: metaLoading } = useQuery<TestSendMeta>({
    queryKey: ['test-send-meta'],
    queryFn: getTestSendMeta,
    staleTime: 60_000,
  });

  const previewMut = useMutation({
    mutationFn: previewTestSend,
    onSuccess: (data) => { setPreview(data); setSendResult(null); },
    onError: (err: Error) => showToast(err.message || 'Preview failed', 'error'),
  });

  const sendMut = useMutation({
    mutationFn: executeTestSend,
    onSuccess: (data) => {
      setSendResult(data);
      qc.invalidateQueries({ queryKey: ['test-send-logs'] });
      showToast(data.success ? 'Test send successful!' : `Send ${data.status}: ${data.errorMessage ?? ''}`, data.success ? 'success' : 'error');
    },
    onError: (err: Error) => showToast(err.message || 'Send failed', 'error'),
  });

  const updateField = useCallback(<K extends keyof FormState>(key: K, val: FormState[K]) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
    setPreview(null);
    setSendResult(null);
  }, []);

  const applyPreset = useCallback((preset: TestSendPreset) => {
    setForm(f => ({
      ...INITIAL_FORM,
      channel: preset.channel,
      recipientMode: preset.recipientMode,
      messageMode: preset.messageMode,
      templateKey: preset.templateKey ?? '',
      placeholders: preset.placeholders ?? {},
      customPhone: f.customPhone,
      customEmail: f.customEmail,
      studentId: f.studentId,
      studentLabel: f.studentLabel,
    }));
    setPreview(null);
    setSendResult(null);
    setErrors({});
  }, []);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setPreview(null);
    setSendResult(null);
    setErrors({});
  }, []);

  // Validate
  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (form.recipientMode === 'custom_phone' && !form.customPhone.trim()) e.customPhone = 'Phone number is required';
    if (form.recipientMode === 'custom_email' && !form.customEmail.trim()) e.customEmail = 'Email address is required';
    if (['student', 'guardian', 'student_guardian'].includes(form.recipientMode) && !form.studentId) e.studentId = 'Select a student';
    if (form.messageMode === 'template' && !form.templateKey) e.templateKey = 'Select a template';
    if (form.messageMode === 'custom' && !form.customBody.trim()) e.customBody = 'Message body is required';
    if (form.messageMode === 'custom' && form.channel === 'email' && !form.customSubject.trim()) e.customSubject = 'Email subject is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const buildPayload = useCallback(() => ({
    channel: form.channel,
    messageMode: form.messageMode,
    templateKey: form.messageMode === 'template' ? form.templateKey : undefined,
    customBody: form.messageMode === 'custom' ? form.customBody : undefined,
    customSubject: form.messageMode === 'custom' && form.channel === 'email' ? form.customSubject : undefined,
    placeholders: Object.keys(form.placeholders).length > 0 ? form.placeholders : undefined,
    recipientMode: form.recipientMode,
    studentId: ['student', 'guardian', 'student_guardian'].includes(form.recipientMode) ? form.studentId : undefined,
    customPhone: form.recipientMode === 'custom_phone' ? form.customPhone : undefined,
    customEmail: form.recipientMode === 'custom_email' ? form.customEmail : undefined,
    providerId: form.providerId || undefined,
  }), [form]);

  const handlePreview = useCallback(() => {
    if (!validate()) return;
    previewMut.mutate(buildPayload());
  }, [validate, buildPayload, previewMut]);

  const handleSend = useCallback(() => {
    if (!validate()) return;
    sendMut.mutate({ ...buildPayload(), logOnly: form.logOnly });
  }, [validate, buildPayload, form.logOnly, sendMut]);

  // Template placeholders
  const selectedTemplate = meta?.templates.find(t => t.templateKey === form.templateKey && t.channel === form.channel);
  const placeholderKeys = selectedTemplate?.placeholdersAllowed ?? [];

  // Filtered templates by channel
  const channelTemplates = meta?.templates.filter(t => t.channel === form.channel) ?? [];
  const channelProviders = meta?.providers.filter(p => p.type === form.channel) ?? [];

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-slate-500">Loading test-send configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Quick Presets */}
      {meta?.presetScenarios && meta.presetScenarios.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick Test Presets</h3>
          </div>
          <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">একটি প্রিসেটে ক্লিক করলে ফর্ম স্বয়ংক্রিয়ভাবে পূরণ হবে। আপনি পরে মান পরিবর্তন করতে পারবেন।</p>
          <div className="flex flex-wrap gap-2">
            {meta.presetScenarios.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Form + Preview */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel */}
        <div className="lg:col-span-3 space-y-5">
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Test Send Form</h3>
              <button onClick={resetForm} className={btnSecondary + ' !py-1.5 !px-3 !text-xs'}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>

            {/* Channel */}
            <FieldGroup label="Channel" hint="SMS বা Email — কোন চ্যানেলে টেস্ট পাঠাবেন তা বেছে নিন" error={errors.channel}>
              <div className="flex gap-2">
                {(['sms', 'email'] as TestSendChannel[]).map(ch => {
                  const Icon = CHANNEL_ICONS[ch];
                  return (
                    <button
                      key={ch}
                      onClick={() => {
                        updateField('channel', ch);
                        updateField('templateKey', '');
                        updateField('providerId', '');
                        if (ch === 'sms') {
                          updateField('recipientMode', form.recipientMode === 'custom_email' ? 'custom_phone' : form.recipientMode);
                        } else {
                          updateField('recipientMode', form.recipientMode === 'custom_phone' ? 'custom_email' : form.recipientMode);
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium border transition-colors ${
                        form.channel === ch
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-600'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {ch.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            {/* Recipient Mode */}
            <FieldGroup label="Recipient" hint="কাকে টেস্ট মেসেজ পাঠাবেন — ছাত্র, অভিভাবক, নাকি কাস্টম নম্বর" error={errors.studentId || errors.customPhone || errors.customEmail}>
              <select
                value={form.recipientMode}
                onChange={e => updateField('recipientMode', e.target.value as RecipientMode)}
                className={inp()}
              >
                <option value="student">Existing Student</option>
                <option value="guardian">Guardian of Student</option>
                <option value="student_guardian">Student + Guardian</option>
                <option value={form.channel === 'sms' ? 'custom_phone' : 'custom_email'}>
                  Custom {form.channel === 'sms' ? 'Phone Number' : 'Email Address'}
                </option>
              </select>

              {/* Student search */}
              {['student', 'guardian', 'student_guardian'].includes(form.recipientMode) && (
                <div className="mt-2">
                  <StudentSearchInput
                    value={form.studentLabel}
                    onSelect={(id, label) => { updateField('studentId', id); updateField('studentLabel', label); }}
                  />
                  {errors.studentId && <p className="mt-1 text-xs text-red-500">{errors.studentId}</p>}
                </div>
              )}

              {form.recipientMode === 'custom_phone' && (
                <div className="mt-2">
                  <input
                    type="tel"
                    placeholder={meta?.defaults.testSendPhoneNumber || '+880XXXXXXXXXX'}
                    value={form.customPhone}
                    onChange={e => updateField('customPhone', e.target.value)}
                    className={inp(errors.customPhone ? 'border-red-400' : '')}
                  />
                  {errors.customPhone && <p className="mt-1 text-xs text-red-500">{errors.customPhone}</p>}
                </div>
              )}

              {form.recipientMode === 'custom_email' && (
                <div className="mt-2">
                  <input
                    type="email"
                    placeholder={meta?.defaults.testSendEmail || 'test@example.com'}
                    value={form.customEmail}
                    onChange={e => updateField('customEmail', e.target.value)}
                    className={inp(errors.customEmail ? 'border-red-400' : '')}
                  />
                  {errors.customEmail && <p className="mt-1 text-xs text-red-500">{errors.customEmail}</p>}
                </div>
              )}
            </FieldGroup>

            {/* Provider */}
            {channelProviders.length > 0 && (
              <FieldGroup label="Provider (optional)">
                <select
                  value={form.providerId}
                  onChange={e => updateField('providerId', e.target.value)}
                  className={inp()}
                >
                  <option value="">Auto (first active)</option>
                  {channelProviders.map(p => (
                    <option key={p._id} value={p._id}>{p.displayName} ({p.provider})</option>
                  ))}
                </select>
              </FieldGroup>
            )}

            {/* Message Mode */}
            <FieldGroup label="Message Mode" hint="Template: সেভ করা টেমপ্লেট ব্যবহার করুন | Custom: নিজের মেসেজ লিখুন">
              <div className="flex gap-2">
                {(['template', 'custom'] as MessageMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => updateField('messageMode', mode)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium border transition-colors ${
                      form.messageMode === mode
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-600'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {mode === 'template' ? <FileText className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    {mode === 'template' ? 'Template' : 'Custom'}
                  </button>
                ))}
              </div>
            </FieldGroup>

            {/* Template Selector */}
            {form.messageMode === 'template' && (
              <FieldGroup label="Template" error={errors.templateKey}>
                <select
                  value={form.templateKey}
                  onChange={e => {
                    updateField('templateKey', e.target.value);
                    // Reset placeholders when template changes
                    const newTpl = meta?.templates.find(t => t.templateKey === e.target.value);
                    const newPh: Record<string, string> = {};
                    (newTpl?.placeholdersAllowed ?? []).forEach(k => { newPh[k] = form.placeholders[k] ?? ''; });
                    updateField('placeholders', newPh);
                  }}
                  className={inp(errors.templateKey ? 'border-red-400' : '')}
                >
                  <option value="">Select a template…</option>
                  {channelTemplates.map(t => (
                    <option key={t._id} value={t.templateKey}>
                      {t.templateKey} {t.category ? `(${t.category})` : ''}
                    </option>
                  ))}
                </select>
                {errors.templateKey && <p className="mt-1 text-xs text-red-500">{errors.templateKey}</p>}
              </FieldGroup>
            )}

            {/* Placeholders */}
            {form.messageMode === 'template' && placeholderKeys.length > 0 && (
              <FieldGroup label="Placeholders">
                <div className="space-y-2">
                  {placeholderKeys.map(key => (
                    <div key={key} className="flex items-center gap-2">
                      <label className="w-32 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{`{${key}}`}</label>
                      <input
                        type="text"
                        value={form.placeholders[key] ?? ''}
                        onChange={e => updateField('placeholders', { ...form.placeholders, [key]: e.target.value })}
                        placeholder={key}
                        className={inp('flex-1')}
                      />
                    </div>
                  ))}
                </div>
              </FieldGroup>
            )}

            {/* Custom Body */}
            {form.messageMode === 'custom' && (
              <>
                {form.channel === 'email' && (
                  <FieldGroup label="Subject" error={errors.customSubject}>
                    <input
                      type="text"
                      placeholder="Email subject line"
                      value={form.customSubject}
                      onChange={e => updateField('customSubject', e.target.value)}
                      className={inp(errors.customSubject ? 'border-red-400' : '')}
                    />
                    {errors.customSubject && <p className="mt-1 text-xs text-red-500">{errors.customSubject}</p>}
                  </FieldGroup>
                )}
                <FieldGroup label="Message Body" error={errors.customBody}>
                  <textarea
                    rows={4}
                    placeholder={form.channel === 'sms' ? 'Your SMS message... Use {placeholder} syntax' : 'Your email body (HTML supported)... Use {placeholder} syntax'}
                    value={form.customBody}
                    onChange={e => updateField('customBody', e.target.value)}
                    className={inp(errors.customBody ? 'border-red-400' : '')}
                  />
                  {form.channel === 'sms' && form.customBody && (
                    <p className="mt-1 text-xs text-slate-400">
                      {form.customBody.length} chars · {Math.ceil(form.customBody.length / (form.customBody.length <= 160 ? 160 : 153))} segment(s)
                    </p>
                  )}
                  {errors.customBody && <p className="mt-1 text-xs text-red-500">{errors.customBody}</p>}
                </FieldGroup>
              </>
            )}

            {/* Log Only toggle */}
            <FieldGroup label="Send Mode" hint="Log Only মোডে কোনো আসল মেসেজ যাবে না — শুধু ডেটাবেসে লগ হবে। Real Send প্রোভাইডারের মাধ্যমে পাঠাবে।">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.logOnly}
                    onChange={e => updateField('logOnly', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 rounded-full bg-slate-200 peer-checked:bg-indigo-600 transition-colors dark:bg-slate-700"></div>
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"></div>
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {form.logOnly ? 'Log Only (no actual delivery)' : 'Real Send (dispatch to provider)'}
                </span>
              </label>
            </FieldGroup>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={handlePreview} disabled={previewMut.isPending} className={btnSecondary}>
                {previewMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview
              </button>
              <button onClick={handleSend} disabled={sendMut.isPending || previewMut.isPending} className={form.logOnly ? btnSecondary : btnPrimary}>
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {form.logOnly ? 'Log Only' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Preview + Result Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Live Preview */}
          <PreviewPanel preview={preview} isLoading={previewMut.isPending} />

          {/* Send Result */}
          {sendResult && <SendResultPanel result={sendResult} />}

          {/* Cost Info */}
          {meta?.costConfig && (
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cost & Finance</h4>
              </div>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>SMS per message</span>
                  <span className="font-medium">{meta.costConfig.smsCostPerMessageBDT} BDT</span>
                </div>
                <div className="flex justify-between">
                  <span>Email per message</span>
                  <span className="font-medium">{meta.costConfig.emailCostPerMessageBDT} BDT</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span>Finance Sync</span>
                  <span className={`font-medium ${meta.autoSyncCostToFinance ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {meta.autoSyncCostToFinance ? 'Auto' : 'Off'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Finance Sync চালু থাকলে প্রতিটি সফল টেস্ট সেন্ডের খরচ স্বয়ংক্রিয়ভাবে Finance module-এ রেকর্ড হবে।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Test Sends */}
      <RecentLogsPanel onRetrySuccess={() => showToast('Retry initiated')} onRetryError={(msg) => showToast(msg, 'error')} />
    </div>
  );
}

/* ─── Field Group ─────────────────────────────────── */
function FieldGroup({ label, hint, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
      {children}
    </div>
  );
}

/* ─── Student Search Input ────────────────────────── */
function StudentSearchInput({ value, onSelect }: { value: string; onSelect: (id: string, label: string) => void }) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['test-send-students', q],
    queryFn: () => searchStudents(q),
    enabled: q.length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => { setQ(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, phone, or email…"
          className={inp('pl-9')}
        />
        {isFetching && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {open && (data?.students?.length ?? 0) > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {data!.students.map(s => (
            <button
              key={s._id}
              onClick={() => {
                onSelect(s._id, `${s.full_name} (${s.phone || s.email || 'N/A'})`);
                setQ(`${s.full_name} (${s.phone || s.email || 'N/A'})`);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
            >
              <div className="font-medium text-slate-700 dark:text-slate-200">{s.full_name}</div>
              <div className="text-xs text-slate-400">
                {s.phone && <span className="mr-3">📱 {s.phone}</span>}
                {s.email && <span className="mr-3">✉️ {s.email}</span>}
                {s.guardian_phone && <span>👨‍👩‍👧 {s.guardian_phone}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Preview Panel ───────────────────────────────── */
function PreviewPanel({ preview, isLoading }: { preview: TestSendPreviewResult | null; isLoading: boolean }) {
  const [copied, setCopied] = useState(false);

  const copyPreview = () => {
    if (!preview) return;
    const text = preview.renderedSubject
      ? `Subject: ${preview.renderedSubject}\n\n${preview.renderedBody}`
      : preview.renderedBody;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preview</h4>
        {preview && (
          <button onClick={copyPreview} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <Copy className="h-3 w-3" /> {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {!isLoading && !preview && (
        <div className="text-center py-8 text-sm text-slate-400">
          <Eye className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
          Click "Preview" to see rendered message
        </div>
      )}

      {!isLoading && preview && (
        <div className="space-y-3">
          {/* Duplicate warning */}
          {preview.duplicateWarning && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {preview.duplicateWarning}
            </div>
          )}

          {/* Recipient */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">To:</span> {preview.recipientDisplay} ({preview.resolvedTo})
          </div>

          {/* Provider */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Provider:</span> {preview.providerName}
          </div>

          {/* Subject */}
          {preview.renderedSubject && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Subject</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{preview.renderedSubject}</p>
            </div>
          )}

          {/* Body */}
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Body</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{preview.renderedBody}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{preview.charCount} chars</span>
            {preview.smsSegments && <span>{preview.smsSegments} segment(s)</span>}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">~{preview.estimatedCostBDT} BDT</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Send Result Panel ───────────────────────────── */
function SendResultPanel({ result }: { result: TestSendResult }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${result.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
      <div className="flex items-center gap-2 mb-3">
        {result.success ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <h4 className={`text-sm font-semibold ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
          {result.status === 'sent' ? 'Sent Successfully' : result.status === 'logged' ? 'Logged (No Delivery)' : 'Send Failed'}
        </h4>
      </div>
      <div className="space-y-1.5 text-xs">
        <InfoRow label="To" value={result.resolvedTo} />
        <InfoRow label="Provider" value={result.providerName} />
        <InfoRow label="Status" value={result.status} />
        {result.providerMessageId && <InfoRow label="Message ID" value={result.providerMessageId} />}
        {result.costAmount > 0 && <InfoRow label="Cost" value={`${result.costAmount} BDT`} />}
        <InfoRow label="Finance Synced" value={result.financeSynced ? 'Yes' : 'No'} />
        <InfoRow label="Log ID" value={result.logId} />
        <InfoRow label="Time" value={new Date(result.timestamp).toLocaleString()} />
        {result.errorMessage && (
          <div className="mt-2 rounded-lg bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {result.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-700 dark:text-slate-200 text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

/* ─── Recent Logs Panel ───────────────────────────── */
function RecentLogsPanel({ onRetrySuccess, onRetryError }: { onRetrySuccess: () => void; onRetryError: (msg: string) => void }) {
  const qc = useQueryClient();
  const [logsPage, setLogsPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['test-send-logs', logsPage, channelFilter, statusFilter],
    queryFn: () => getTestSendLogs({
      page: logsPage,
      limit: 10,
      channel: channelFilter || undefined,
      status: statusFilter || undefined,
    }),
    staleTime: 15_000,
  });

  const retryMut = useMutation({
    mutationFn: retryTestSend,
    onSuccess: () => { onRetrySuccess(); qc.invalidateQueries({ queryKey: ['test-send-logs'] }); },
    onError: (err: Error) => onRetryError(err.message || 'Retry failed'),
  });

  const logs = logsData?.logs ?? [];
  const totalPages = logsData ? Math.ceil(logsData.total / 10) : 0;

  return (
    <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Test Sends</h3>
          <div className="flex gap-2">
            <select value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setLogsPage(1); }} className={inp('!w-auto !py-1.5 !text-xs')}>
              <option value="">All Channels</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setLogsPage(1); }} className={inp('!w-auto !py-1.5 !text-xs')}>
              <option value="">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          </div>
        </div>
      </div>

      {logsLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {!logsLoading && logs.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-400">No test sends yet</div>
      )}

      {/* Desktop table */}
      {!logsLoading && logs.length > 0 && (
        <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Channel</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Recipient</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Provider</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Finance</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Time</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {logs.map(log => (
                  <LogRow key={log._id} log={log} onRetry={() => retryMut.mutate(log._id)} retrying={retryMut.isPending} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map(log => (
              <LogCard key={log._id} log={log} onRetry={() => retryMut.mutate(log._id)} retrying={retryMut.isPending} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-400">Page {logsPage} of {totalPages} ({logsData!.total} total)</p>
              <div className="flex gap-2">
                <button onClick={() => setLogsPage(p => Math.max(1, p - 1))} disabled={logsPage <= 1} className={btnSecondary + ' !py-1 !px-3 !text-xs'}>Prev</button>
                <button onClick={() => setLogsPage(p => Math.min(totalPages, p + 1))} disabled={logsPage >= totalPages} className={btnSecondary + ' !py-1 !px-3 !text-xs'}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Log Table Row ───────────────────────────────── */
function LogRow({ log, onRetry, retrying }: { log: TestSendLogItem; onRetry: () => void; retrying: boolean }) {
  const fStatus = log.costAmount > 0
    ? (log.financeSynced ? 'synced' : 'pending')
    : 'none';
  const fb = FINANCE_SYNC_BADGE[fStatus];
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${log.channel === 'sms' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
          {log.channel.toUpperCase()}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{log.recipientDisplay}</div>
        <div className="text-xs text-slate-400 truncate">{log.to}</div>
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[log.status] ?? STATUS_BADGE.queued}`}>
          {log.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{log.providerUsed}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">{log.costAmount > 0 ? `${log.costAmount} BDT` : '—'}</td>
      <td className="px-4 py-2.5">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${fb.cls}`}>
          {fb.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
      <td className="px-4 py-2.5 text-right">
        {log.status === 'failed' && (
          <button onClick={onRetry} disabled={retrying} className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5 inline mr-1" />Retry
          </button>
        )}
      </td>
    </tr>
  );
}

/* ─── Log Mobile Card ─────────────────────────────── */
function LogCard({ log, onRetry, retrying }: { log: TestSendLogItem; onRetry: () => void; retrying: boolean }) {
  const fStatus = log.costAmount > 0
    ? (log.financeSynced ? 'synced' : 'pending')
    : 'none';
  const fb = FINANCE_SYNC_BADGE[fStatus];
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${log.channel === 'sms' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
            {log.channel.toUpperCase()}
          </span>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[log.status] ?? STATUS_BADGE.queued}`}>
            {log.status}
          </span>
          {fStatus !== 'none' && (
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${fb.cls}`}>
              {fb.label}
            </span>
          )}
        </div>
        {log.status === 'failed' && (
          <button onClick={onRetry} disabled={retrying} className="text-xs text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5 inline mr-1" />Retry
          </button>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{log.recipientDisplay}</p>
        <p className="text-xs text-slate-400">{log.to} · {log.providerUsed}</p>
      </div>
      {log.renderedPreview && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{log.renderedPreview}</p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{new Date(log.createdAt).toLocaleString()}</span>
        {log.costAmount > 0 && <span>{log.costAmount} BDT</span>}
      </div>
      {log.errorMessage && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">{log.errorMessage}</p>
      )}
    </div>
  );
}
