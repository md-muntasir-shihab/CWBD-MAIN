import mongoose from 'mongoose';
import { type IExamCenter } from '../models/University';
export interface UniversitySyncSummary {
    synced: number;
    skipped: number;
}
export interface UniversityClusterResolutionWarning {
    universityId: string;
    universityName: string;
    clusterIds: string[];
    clusterNames: string[];
    winnerClusterId: string;
    winnerClusterName: string;
    reason: 'multiple_clusters' | 'multiple_manual_clusters';
}
export interface UniversityClusterResolutionSummary {
    resolvedCount: number;
    detachedCount: number;
    warnings: UniversityClusterResolutionWarning[];
    clusterMemberCounts: Record<string, number>;
}
export declare function normalizeExamCenters(value: unknown): IExamCenter[];
export declare function serializeExamCenters(value: unknown): string;
export declare function ensureUniversityCategoryByName(name: unknown): Promise<{
    _id: mongoose.Types.ObjectId;
    name: string;
}>;
export declare function ensureUniversityClusterByName(name: unknown): Promise<{
    _id: mongoose.Types.ObjectId;
    name: string;
}>;
export declare function syncUniversityCategorySharedConfig(categoryId: string, actorId?: string | null): Promise<UniversitySyncSummary>;
export declare function syncUniversityClusterSharedConfig(clusterId: string, actorId?: string | null): Promise<UniversitySyncSummary>;
export declare function syncManualClusterMembership(universityIds: Array<string | mongoose.Types.ObjectId>, clusterId?: string | null): Promise<void>;
export declare function reconcileUniversityClusterAssignments(actorId?: string | null): Promise<UniversityClusterResolutionSummary>;
export declare function backfillUniversityTaxonomyIfNeeded(force?: boolean): Promise<void>;
export declare function normalizeUniversityImportRow(input: Record<string, unknown>): Record<string, unknown>;
//# sourceMappingURL=universitySyncService.d.ts.map