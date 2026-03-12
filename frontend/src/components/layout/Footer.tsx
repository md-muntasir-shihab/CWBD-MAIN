import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Facebook, Instagram, MessageCircle, Send, Twitter, Youtube } from 'lucide-react';
import { getHome, type HomeApiResponse } from '../../services/api';
import { useWebsiteSettings } from '../../hooks/useWebsiteSettings';

const iconByPlatform = {
    facebook: Facebook,
    whatsapp: MessageCircle,
    telegram: Send,
    twitter: Twitter,
    youtube: Youtube,
    instagram: Instagram,
} as const;

function isExternal(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

export default function Footer() {
    const { data: websiteSettings } = useWebsiteSettings();
    const homeQuery = useQuery<HomeApiResponse>({
        queryKey: ['home'],
        queryFn: async () => (await getHome()).data,
        staleTime: 60_000,
        refetchInterval: 90_000,
        refetchIntervalInBackground: true,
    });

    const home = homeQuery.data;
    const footer = home?.homeSettings?.footer;
    const footerEnabled = footer?.enabled ?? true;
    if (!footerEnabled) return null;

    const quickLinks = footer?.quickLinks?.length
        ? footer.quickLinks
        : [
            { label: 'Home', url: '/' },
            { label: 'Universities', url: '/universities' },
            { label: 'Exams', url: '/exams' },
            { label: 'News', url: '/news' },
            { label: 'Resources', url: '/resources' },
            { label: 'Contact', url: '/contact' },
        ];

    const legalLinks = footer?.legalLinks?.length
        ? footer.legalLinks
        : [
            { label: 'Terms', url: '/terms' },
            { label: 'Privacy', url: '/privacy' },
        ];

    const normalizedManagedSocialItems = (websiteSettings?.socialLinksList || [])
        .filter((item) => item.enabled !== false && item.placements?.includes('footer') && item.targetUrl)
        .map((item) => {
            const normalizedPlatform = String(item.platformName || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
            return {
                platform: normalizedPlatform as keyof typeof iconByPlatform,
                label: item.platformName || normalizedPlatform,
                url: item.targetUrl,
                iconUrl: item.iconUploadOrUrl || '',
            };
        });

    const social = home?.socialLinks || websiteSettings?.socialLinks || {};
    const fallbackSocialItems = (Object.keys(iconByPlatform) as Array<keyof typeof iconByPlatform>)
        .map((platform) => ({ platform, label: platform, url: String(social?.[platform] || '').trim(), iconUrl: '' }))
        .filter((item) => Boolean(item.url));

    const socialItems = normalizedManagedSocialItems.length > 0 ? normalizedManagedSocialItems : fallbackSocialItems;

    return (
        <footer className="bg-[linear-gradient(135deg,#052960_0%,#073A8D_42%,#0D5FDB_76%,#0EA5E9_100%)] text-white/85 mt-auto border-t border-white/10">
            <div className="section-container py-12 lg:py-16">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <Link to="/" className="flex items-center gap-2.5 mb-4">
                            <img
                                src={home?.globalSettings?.logoUrl || websiteSettings?.logoUrl || websiteSettings?.logo || '/logo.png'}
                                alt={home?.globalSettings?.websiteName || websiteSettings?.websiteName || 'CampusWay'}
                                className="h-10 w-auto max-w-[140px] object-contain"
                            />
                            <div>
                                <span className="block text-xl font-heading font-bold text-white leading-tight">
                                    {home?.globalSettings?.websiteName || websiteSettings?.websiteName || 'CampusWay'}
                                </span>
                                <span className="text-xs text-white/55">
                                    {home?.globalSettings?.motto || websiteSettings?.motto || ''}
                                </span>
                            </div>
                        </Link>
                        <p className="mt-4 text-sm leading-relaxed text-white/65">
                            {footer?.aboutText || 'CampusWay helps students manage admissions, exams, and resources in one place.'}
                        </p>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h4>
                        <ul className="space-y-2.5">
                            {quickLinks.map((link) => (
                                <li key={`${link.label}-${link.url}`}>
                                    {isExternal(link.url) ? (
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-cyan-200">
                                            <ExternalLink className="w-3 h-3" />{link.label}
                                        </a>
                                    ) : (
                                        <Link to={link.url} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-cyan-200">
                                            <ExternalLink className="w-3 h-3" />{link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Legal</h4>
                        <ul className="space-y-2.5">
                            {legalLinks.map((link) => (
                                <li key={`${link.label}-${link.url}`}>
                                    {isExternal(link.url) ? (
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-white/60 hover:text-cyan-200">
                                            <ExternalLink className="w-3 h-3" />{link.label}
                                        </a>
                                    ) : (
                                        <Link to={link.url} className="flex items-center gap-1.5 text-sm text-white/60 hover:text-cyan-200">
                                            <ExternalLink className="w-3 h-3" />{link.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
                        <ul className="space-y-2 text-sm text-white/60">
                            <li>{footer?.contactInfo?.address || 'Dhaka, Bangladesh'}</li>
                            <li>{footer?.contactInfo?.phone || home?.globalSettings?.contactPhone || websiteSettings?.contactPhone || ''}</li>
                            <li>{footer?.contactInfo?.email || home?.globalSettings?.contactEmail || websiteSettings?.contactEmail || ''}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="section-container flex flex-col items-center justify-between gap-4 py-5 sm:flex-row">
                    <p className="text-xs text-white/45">
                        &copy; {new Date().getFullYear()} {home?.globalSettings?.websiteName || websiteSettings?.websiteName || 'CampusWay'}. All rights reserved.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        {socialItems.map(({ platform, url, iconUrl, label }) => {
                            const Icon = iconByPlatform[platform as keyof typeof iconByPlatform];
                            return (
                                <a
                                    key={`${platform}-${url}`}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                                >
                                    {iconUrl ? (
                                        <img src={iconUrl} alt={label} className="h-4 w-4 object-contain" />
                                    ) : Icon ? (
                                        <Icon className="h-4 w-4" />
                                    ) : (
                                        <ExternalLink className="h-4 w-4" />
                                    )}
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </footer>
    );
}
