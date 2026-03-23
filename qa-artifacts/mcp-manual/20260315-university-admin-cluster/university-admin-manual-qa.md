# University Admin Manual QA

## Goal

Validate the university bulk workflow, category and cluster auto-create, shared sync actions, grouped home cards, and responsive behavior.

## Prerequisites

- Start the backend from `backend` with `npm run dev`
- Start the frontend from `frontend` with `npm run dev`
- Sign in with an admin account
- Use a clean test database or remove the sample universities before re-running the checklist
- Import the sample file in this folder: `university-import-fixture.csv`
- If you want to test with the real engineering and science university shortlist, use `engineering-science-universities.csv`

## Dataset Coverage

The fixture is designed to cover:

- auto-created custom categories
- auto-created cluster
- cluster members and non-cluster members
- exam center parsing
- category sync lock
- cluster sync lock
- grouped home deadline and upcoming cards
- bulk export and bulk delete

## Checklist

| ID | Flow | Steps | Expected Result |
| --- | --- | --- | --- |
| U1 | Import Init | Open Admin Dashboard > Universities > Import. Upload `university-import-fixture.csv`. | File is accepted and the import wizard shows mapped headers. |
| U2 | Import Validate | Run validation without changing the default mapping. | Validation succeeds with no invalid rows. The preview shows categories, cluster names, dates, and exam centers correctly. |
| U3 | Import Commit | Commit with `update-existing`. | Import summary shows inserted rows. Created category count is `2` and created cluster count is `1`. No failed rows appear. |
| U4 | Auto-Created Taxonomy | Open the category list and cluster list. | Categories `Engineering Cluster` and `Medical Trial Group` exist. Cluster `GST Mega Cluster` exists. |
| U5 | Imported University State | Open the university table and search for `Auto Import`. | Five universities appear. `GST Member One` and `GST Member Two` show the cluster. `Engineering Solo Campus`, `Medical Solo A`, and `Medical Solo B` remain visible as regular rows. |
| U6 | Exam Center Parsing | Open `GST Member One`. | Exam centers are stored as separate rows for `Dhaka` and `Rajshahi`. |
| U7 | Export Selected | Select two universities from the current page. Use export scope `Selected`. | Download contains only the selected rows and includes category, cluster, exam center, sync lock, and status columns. |
| U8 | Export All Filtered | Filter by category `Engineering Cluster`. Use export scope `All Filtered`. | Download contains all engineering rows, not just the current page selection. |
| U9 | Export All | Clear filters and export scope `All`. | Download contains the full imported dataset. |
| U10 | Bulk Update Scope | Filter by category `Medical Trial Group`. Use a bulk update such as changing `featured` or `isActive` with scope `All Filtered`. | Both medical rows are targeted even if only one page is visible. |
| U11 | Bulk Delete UI | Select at least one sample row and trigger bulk delete from desktop. Repeat on mobile width. | The bulk delete action is visible in both layouts. The UI shows either success or a queued `pending approval` state if the backend responds with second approval required. |
| U12 | Category Shared Config Save | Open category `Medical Trial Group`. Set shared application dates, a science exam date, and exam centers. Save the shared config. | The category saves without leaving the page or losing the entered shared values. |
| U13 | Category Shared Sync | Click `Sync Category Universities` for `Medical Trial Group`. | `Medical Solo A` updates to the shared dates and exam centers. `Medical Solo B` stays unchanged because `categorySyncLocked=true`. The sync result reports at least one skipped row. |
| U14 | Cluster Rule Membership | Open cluster `GST Mega Cluster`. Select category rule `Engineering Cluster` and save. | `Engineering Solo Campus` is auto-added to the cluster without manual selection. Member count increases to `3`. |
| U15 | Cluster Shared Config Save | In the same cluster, set application dates, science exam date, and exam centers. Save the cluster. | The cluster shared config persists and remains visible after refresh. |
| U16 | Cluster Shared Sync | Run the cluster sync action. | `GST Member One` and `Engineering Solo Campus` update to the shared cluster config. `GST Member Two` stays unchanged because `clusterSyncLocked=true`. The sync result reports skipped rows. |
| U17 | Home Deadline Grouping | Open the public home page after the import and sync steps. | Cluster members do not appear as separate cards in deadline or upcoming sections. Instead, one `GST Mega Cluster` card appears with aggregated member count and nearest date data. |
| U18 | Home Featured Cluster | In the cluster editor, enable `Home Visible` and set a small home order. Refresh the home page. | `GST Mega Cluster` appears in the featured cluster area as a cluster card. |
| U19 | Cluster Detail Route | Click the `GST Mega Cluster` card on the home page. | The app opens `/universities/cluster/gst-mega-cluster` and shows the cluster summary plus member universities. |
| U20 | Member Detail Consistency | On the cluster detail page, confirm the member list. | `GST Member One`, `GST Member Two`, and `Engineering Solo Campus` appear in the cluster member listing. |
| U21 | Mobile Universities Panel | In browser responsive mode at `360 x 800`, open Admin Dashboard > Universities. | Selection count, import/export buttons, bulk actions, and row actions remain usable without horizontal clipping. |
| U22 | Mobile Import Wizard | Keep responsive mode at `360 x 800` and reopen the import wizard. | Mapping and validation summary stack cleanly, and failed row previews do not overflow the viewport. |
| U23 | Mobile Category and Cluster Forms | At `360 x 800`, open category and cluster edit panels or modals. | Form sections stack into one column and the save actions remain reachable. |
| U24 | Tablet Layout | Switch to `768 x 1024`. Recheck Universities, Home, and the cluster detail page. | Cards and filters reflow cleanly, and there is no overlapping text or off-screen action bar. |

## Notes

- If the environment has approval flow enabled, bulk delete may return a queued result instead of immediate deletion. That is a valid pass condition if the UI clearly communicates the queued state.
- If the sample data already exists, re-import with `update-existing` and continue. The important check is that validation and commit remain clean.
- If category or cluster names were manually edited in a previous run, delete the sample records first to keep the expectations deterministic.

## Quick Pass Criteria

- Import validation and commit succeed
- Categories and cluster are auto-created
- Export works for selected, filtered, and all scopes
- Category sync respects `categorySyncLocked`
- Cluster sync respects `clusterSyncLocked`
- Cluster rule membership auto-adds matching category universities
- Home shows grouped cluster cards instead of child university cards
- University admin and import screens remain usable on mobile widths
