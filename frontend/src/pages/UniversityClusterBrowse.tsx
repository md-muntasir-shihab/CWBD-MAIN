import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import UniversityBrowseShell from '../components/university/UniversityBrowseShell';
import { useUniversityCategories } from '../hooks/useUniversityQueries';
import { toSlug } from '../lib/apiClient';

function LoadingState() {
    return (
        <div className="section-container py-12 text-center">
            <p className="text-lg font-semibold text-text dark:text-dark-text">Loading cluster universities...</p>
        </div>
    );
}

export default function UniversityClusterBrowsePage() {
    const { clusterSlug } = useParams<{ clusterSlug: string }>();
    const { data: categories, isLoading } = useUniversityCategories();

    const match = useMemo(() => {
        const slug = String(clusterSlug || '').trim();
        if (!slug || !categories?.length) return null;
        for (const category of categories) {
            const clusterName = (category.clusterGroups || []).find((item) => {
                const canonicalSlug = toSlug(item);
                return canonicalSlug === slug || `${canonicalSlug}-cluster` === slug;
            });
            if (clusterName) {
                return {
                    categoryName: category.categoryName,
                    clusterName,
                };
            }
        }
        return null;
    }, [categories, clusterSlug]);

    if (isLoading) return <LoadingState />;

    if (!match && categories?.length) {
        return (
            <div className="section-container py-12 text-center">
                <p className="text-lg font-semibold text-text dark:text-dark-text">Cluster not found</p>
                <p className="mt-1 text-sm text-text-muted dark:text-dark-text/70">
                    The cluster &ldquo;{clusterSlug}&rdquo; does not exist.
                </p>
            </div>
        );
    }

    return (
        <UniversityBrowseShell
            fixedCategory={match?.categoryName}
            fixedCluster={match?.clusterName}
            title={match?.clusterName || 'Cluster'}
            subtitle={`Showing all universities in ${match?.clusterName || 'this cluster'}.`}
            hideCategoryTabs
        />
    );
}
