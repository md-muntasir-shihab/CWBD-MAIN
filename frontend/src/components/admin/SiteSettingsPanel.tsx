import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw, Globe, Mail, Phone, Upload, Palette, Coins } from 'lucide-react';
import { adminUpdateWebsiteSettings, getPublicSettings } from '../../services/api';
import CyberToggle from '../ui/CyberToggle';
import SocialLinksManager from './SocialLinksManager';
import { invalidateQueryGroup, invalidationGroups, queryKeys } from '../../lib/queryKeys';
import { useAdminRuntimeFlags } from '../../hooks/useAdminRuntimeFlags';
import InfoHint from '../ui/InfoHint';
import AdminGuideButton from './AdminGuideButton';

type SiteSettingsForm = {
    websiteName: string;
    motto: string;
    metaTitle: string;
    metaDescription: string;
    contactEmail: string;
    contactPhone: string;
    socialLinks: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
        twitter: string;
        youtube: string;
        instagram: string;
    };
    theme: {
        modeDefault: 'light' | 'dark' | 'system';
        allowSystemMode: boolean;
        switchVariant: 'default' | 'pro';
        animationLevel: 'none' | 'subtle' | 'rich';
    };
    socialUi: {
        clusterEnabled: boolean;
        buttonVariant: 'default' | 'squircle';
        showLabels: boolean;
        platformOrder: string[];
    };
    pricingUi: {
        currencyCode: string;
        currencySymbol: string;
        currencyLocale: string;
        displayMode: 'symbol' | 'code';
        thousandSeparator: boolean;
    };
    subscriptionPageTitle: string;
    subscriptionPageSubtitle: string;
    subscriptionDefaultBannerUrl: string;
    subscriptionLoggedOutCtaMode: 'login' | 'contact';
};

const defaultSettings: SiteSettingsForm = {
    websiteName: '',
    motto: '',
    metaTitle: '',
    metaDescription: '',
    contactEmail: '',
    contactPhone: '',
    socialLinks: {
        facebook: '',
        whatsapp: '',
        messenger: '',
        telegram: '',
        twitter: '',
        youtube: '',
        instagram: '',
    },
    theme: {
        modeDefault: 'system',
        allowSystemMode: true,
        switchVariant: 'pro',
        animationLevel: 'subtle',
    },
    socialUi: {
        clusterEnabled: true,
        buttonVariant: 'squircle',
        showLabels: false,
        platformOrder: ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'],
    },
    pricingUi: {
        currencyCode: 'BDT',
        currencySymbol: '\u09F3',
        currencyLocale: 'bn-BD',
        displayMode: 'symbol',
        thousandSeparator: true,
    },
    subscriptionPageTitle: 'Subscription Plans',
    subscriptionPageSubtitle: 'Choose free or paid plans to unlock premium exam access.',
    subscriptionDefaultBannerUrl: '',
    subscriptionLoggedOutCtaMode: 'contact',
};

export default function SiteSettingsPanel() {
    const queryClient = useQueryClient();
    const runtimeFlags = useAdminRuntimeFlags();
    const [settings, setSettings] = useState<SiteSettingsForm>(defaultSettings);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);
    const [previewLogo, setPreviewLogo] = useState('');
    const [previewFavicon, setPreviewFavicon] = useState('');

    const logoRef = useRef<HTMLInputElement>(null);
    const faviconRef = useRef<HTMLInputElement>(null);
    const settingsQuery = useQuery({
        queryKey: queryKeys.siteSettings,
        queryFn: async () => (await getPublicSettings()).data,
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        const data = settingsQuery.data;
        setSettings({
            ...defaultSettings,
            ...data,
            socialLinks: {
                ...defaultSettings.socialLinks,
                ...(data.socialLinks || {}),
            },
            theme: {
                ...defaultSettings.theme,
                ...(data.theme || {}),
            },
            socialUi: {
                ...defaultSettings.socialUi,
                ...(data.socialUi || {}),
            },
            pricingUi: {
                ...defaultSettings.pricingUi,
                ...(data.pricingUi || {}),
            },
        });
        setPreviewLogo(data.logo || '');
        setPreviewFavicon(data.favicon || '');
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            formData.append('websiteName', settings.websiteName);
            formData.append('motto', settings.motto);
            formData.append('metaTitle', settings.metaTitle);
            formData.append('metaDescription', settings.metaDescription);
            formData.append('contactEmail', settings.contactEmail);
            formData.append('contactPhone', settings.contactPhone);
            formData.append('socialLinks', JSON.stringify(settings.socialLinks));
            formData.append('theme', JSON.stringify(settings.theme));
            formData.append('socialUi', JSON.stringify(settings.socialUi));
            formData.append('pricingUi', JSON.stringify(settings.pricingUi));
            formData.append('subscriptionPageTitle', settings.subscriptionPageTitle);
            formData.append('subscriptionPageSubtitle', settings.subscriptionPageSubtitle);
            formData.append('subscriptionDefaultBannerUrl', settings.subscriptionDefaultBannerUrl);
            formData.append('subscriptionLoggedOutCtaMode', settings.subscriptionLoggedOutCtaMode);

            if (logoFile) formData.append('logo', logoFile);
            if (faviconFile) formData.append('favicon', faviconFile);
            return adminUpdateWebsiteSettings(formData);
        },
        onSuccess: async () => {
            toast.success('Website settings saved successfully');
            await invalidateQueryGroup(queryClient, invalidationGroups.siteSave);
            await invalidateQueryGroup(queryClient, invalidationGroups.plansSave);
            await settingsQuery.refetch();
        },
        onError: () => {
            toast.error('Failed to save settings');
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (type === 'logo') {
            setLogoFile(file);
            setPreviewLogo(URL.createObjectURL(file));
        } else {
            setFaviconFile(file);
            setPreviewFavicon(URL.createObjectURL(file));
        }
    };

    const onSave = async () => {
        await saveMutation.mutateAsync();
    };

    if (settingsQuery.isLoading) {
        return <div className="flex justify-center py-20"><RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" /></div>;
    }

    const renderToggleCard = (
        title: string,
        checked: boolean,
        onChange: (value: boolean) => void,
        guide: {
            content: string;
            enabledNote: string;
            disabledNote: string;
            affected?: string;
        },
    ) => (
        <div className="rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</span>
                <AdminGuideButton
                    title={title}
                    content={guide.content}
                    enabledNote={guide.enabledNote}
                    disabledNote={guide.disabledNote}
                    affected={guide.affected}
                    tone="indigo"
                />
            </div>
            <CyberToggle checked={checked} onChange={onChange} label={title} />
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white">
                        Website Settings
                        {runtimeFlags.trainingMode ? (
                            <InfoHint
                                className="ml-2"
                                title="Branding Tip"
                                description="Changes to logo, website name, social links, and subscription texts update public pages immediately after save."
                            />
                        ) : null}
                    </h2>
                    <p className="text-xs text-slate-500">Global identity, theme, social and pricing controls</p>
                    <div className="mt-2">
                        <AdminGuideButton
                            title="Website Settings"
                            content="This page controls global branding, public contact data, theme defaults, pricing display rules, and subscription-page presentation."
                            actions={[
                                { label: 'Save', description: 'Apply global settings to the live public and student experience after the admin save completes.' },
                                { label: 'Upload logo or favicon', description: 'Replace brand assets used in navigation, browser tabs, and shared UI surfaces.' },
                            ]}
                            enabledNote="When a UI toggle is enabled, the matching theme or pricing behaviour becomes available after save."
                            disabledNote="When a UI toggle is disabled, the linked mode or formatting behaviour stops appearing even though the data remains stored."
                            affected="Public visitors, students, and any page using shared site settings."
                            bestPractice="Verify the public site after changing branding, theme, or pricing settings because this page has global impact."
                            variant="full"
                            tone="indigo"
                            actionLabel="View control guide"
                        />
                    </div>
                </div>
                <button onClick={onSave} disabled={saveMutation.isPending} className="bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-6 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
                    {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-400" /> Identity & Branding</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-2">Primary Logo</label>
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-xl bg-slate-950/65 border border-indigo-500/20 flex items-center justify-center overflow-hidden">
                                    {previewLogo ? <img src={previewLogo} alt="Logo preview" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-slate-500">No Logo</span>}
                                </div>
                                <input type="file" ref={logoRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                                <button onClick={() => logoRef.current?.click()} className="text-xs flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-500/20">
                                    <Upload className="w-3 h-3" /> Upload
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-medium block mb-2">Favicon</label>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-slate-950/65 border border-indigo-500/20 flex items-center justify-center overflow-hidden">
                                    {previewFavicon ? <img src={previewFavicon} alt="Favicon preview" className="w-6 h-6 object-contain" /> : <span className="text-[10px] text-slate-500">Icon</span>}
                                </div>
                                <input type="file" ref={faviconRef} hidden accept="image/*" onChange={(e) => handleFileChange(e, 'favicon')} />
                                <button onClick={() => faviconRef.current?.click()} className="text-xs flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-500/20">
                                    <Upload className="w-3 h-3" /> Upload
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 font-medium">Website Name</label>
                            <input value={settings.websiteName} onChange={e => setSettings({ ...settings, websiteName: e.target.value })}
                                className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-medium">Motto</label>
                            <input value={settings.motto} onChange={e => setSettings({ ...settings, motto: e.target.value })}
                                className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 font-medium">Meta Title</label>
                        <input value={settings.metaTitle} onChange={e => setSettings({ ...settings, metaTitle: e.target.value })}
                            className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 font-medium">Meta Description</label>
                        <textarea rows={3} value={settings.metaDescription} onChange={e => setSettings({ ...settings, metaDescription: e.target.value })}
                            className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-400" /> Contact</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
                                <input value={settings.contactEmail} onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</label>
                                <input value={settings.contactPhone} onChange={e => setSettings({ ...settings, contactPhone: e.target.value })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">WhatsApp URL</label>
                                <input
                                    value={settings.socialLinks.whatsapp}
                                    onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, whatsapp: e.target.value } })}
                                    placeholder="https://wa.me/8801XXXXXXXXX"
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">Messenger URL</label>
                                <input
                                    value={settings.socialLinks.messenger}
                                    onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, messenger: e.target.value } })}
                                    placeholder="https://m.me/your-page"
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">Facebook URL</label>
                                <input
                                    value={settings.socialLinks.facebook}
                                    onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })}
                                    placeholder="https://facebook.com/your-page"
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">Telegram URL</label>
                                <input
                                    value={settings.socialLinks.telegram}
                                    onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, telegram: e.target.value } })}
                                    placeholder="https://t.me/your-channel"
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-medium">Instagram URL</label>
                                <input
                                    value={settings.socialLinks.instagram}
                                    onChange={e => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })}
                                    placeholder="https://instagram.com/your-page"
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Palette className="w-4 h-4 text-indigo-400" /> Theme & UI</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400">Default Mode</label>
                                <select
                                    value={settings.theme.modeDefault}
                                    onChange={(e) => setSettings({ ...settings, theme: { ...settings.theme, modeDefault: e.target.value as 'light' | 'dark' | 'system' } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                >
                                    <option value="system">System</option>
                                    <option value="light">Light</option>
                                    <option value="dark">Dark</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Animation Level</label>
                                <select
                                    value={settings.theme.animationLevel}
                                    onChange={(e) => setSettings({ ...settings, theme: { ...settings.theme, animationLevel: e.target.value as 'none' | 'subtle' | 'rich' } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                >
                                    <option value="none">None</option>
                                    <option value="subtle">Subtle</option>
                                    <option value="rich">Rich</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {renderToggleCard('Allow System Mode', settings.theme.allowSystemMode, (value) => setSettings({ ...settings, theme: { ...settings.theme, allowSystemMode: value } }), {
                                content: 'Controls whether the public theme switcher can follow the device or browser preference.',
                                enabledNote: 'Users can select or inherit system mode, and the UI follows device preference when applicable.',
                                disabledNote: 'System mode is removed, so users only get the manually allowed light or dark options.',
                                affected: 'Public visitors and students using theme controls.',
                            })}
                            {renderToggleCard('Enable Social Cluster', settings.socialUi.clusterEnabled, (value) => setSettings({ ...settings, socialUi: { ...settings.socialUi, clusterEnabled: value } }), {
                                content: 'Controls whether grouped social links are shown as a shared cluster instead of isolated placements.',
                                enabledNote: 'The social cluster layout remains visible where the public design expects grouped links.',
                                disabledNote: 'Grouped social links are removed, so only remaining standalone surfaces stay visible.',
                                affected: 'Public footer or contact-style surfaces using social links.',
                            })}
                            {renderToggleCard('Show Social Labels', settings.socialUi.showLabels, (value) => setSettings({ ...settings, socialUi: { ...settings.socialUi, showLabels: value } }), {
                                content: 'Controls whether social buttons show readable text labels beside their icons.',
                                enabledNote: 'Visitors see both icon and text, which improves clarity but uses more horizontal space.',
                                disabledNote: 'Only the icon-style treatment remains, which is more compact but less explicit.',
                                affected: 'Public and student UI surfaces that render social buttons.',
                            })}
                            {renderToggleCard('Use Thousand Separator', settings.pricingUi.thousandSeparator, (value) => setSettings({ ...settings, pricingUi: { ...settings.pricingUi, thousandSeparator: value } }), {
                                content: 'Controls whether prices and numeric amounts are formatted with thousand separators.',
                                enabledNote: 'Large amounts are easier to scan because pricing uses grouped numeric formatting.',
                                disabledNote: 'Amounts render as plain digits, which is denser and easier to misread.',
                                affected: 'Pricing cards, plan details, and any public or student price display using this format.',
                            })}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Coins className="w-4 h-4 text-indigo-400" /> Pricing Currency</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-slate-400">Currency Code</label>
                                <input value={settings.pricingUi.currencyCode} onChange={(e) => setSettings({ ...settings, pricingUi: { ...settings.pricingUi, currencyCode: e.target.value.toUpperCase() } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Currency Symbol</label>
                                <input value={settings.pricingUi.currencySymbol} onChange={(e) => setSettings({ ...settings, pricingUi: { ...settings.pricingUi, currencySymbol: e.target.value } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Locale</label>
                                <input value={settings.pricingUi.currencyLocale} onChange={(e) => setSettings({ ...settings, pricingUi: { ...settings.pricingUi, currencyLocale: e.target.value } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Display Mode</label>
                                <select value={settings.pricingUi.displayMode} onChange={(e) => setSettings({ ...settings, pricingUi: { ...settings.pricingUi, displayMode: e.target.value as 'symbol' | 'code' } })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white">
                                    <option value="symbol">Symbol</option>
                                    <option value="code">Code</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-400" /> Subscription Page</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-xs text-slate-400">Page Title</label>
                                <input
                                    value={settings.subscriptionPageTitle}
                                    onChange={(e) => setSettings({ ...settings, subscriptionPageTitle: e.target.value })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Page Subtitle</label>
                                <textarea
                                    rows={2}
                                    value={settings.subscriptionPageSubtitle}
                                    onChange={(e) => setSettings({ ...settings, subscriptionPageSubtitle: e.target.value })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Default Plan Banner URL</label>
                                <input
                                    value={settings.subscriptionDefaultBannerUrl}
                                    onChange={(e) => setSettings({ ...settings, subscriptionDefaultBannerUrl: e.target.value })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Logged-out CTA Behavior</label>
                                <select
                                    value={settings.subscriptionLoggedOutCtaMode}
                                    onChange={(e) => setSettings({ ...settings, subscriptionLoggedOutCtaMode: e.target.value as 'login' | 'contact' })}
                                    className="mt-1 w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white"
                                >
                                    <option value="login">Send to Login</option>
                                    <option value="contact">Send to Contact</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SocialLinksManager />
        </div>
    );
}
