# JANUS Shrine 3D Local Mindmap Control Restoration

The 3D volume introduced a regression: it rendered source data read-only but lost the *functional local mindmap workspace* that lets users create, label, connect, move, delete, save, load, and navigate their own nodes. This patch restores those capabilities **inside the WebGL 3D page** and keeps the read-only atlas accessible by a prominent mode toggle.

## Exact classic format contracts
- HRain D3 mindmap in \`index.html\` uses \`localStorage['hrain_v10_4_restore']\` with \`{nodes,links}\`. Nodes contain \`id,label,x,y,parentId,emoji,type,chatHistory\`; deletion cascades to local children. Links have \`{source,target}\`.
- iNaiHR D3 mindmap in \`index.html\` uses \`localStorage['inaihr_v2']\` (legacy fallback \`inaihr_v1\`) with \`{nodes,links}\`. Nodes contain \`id,label,x,y,isAI\`; deletion removes only selected local node and its edges.

## 3D functionality and constraints
- **Default is EDITABLE LOCAL 3D MINDMAP**, not the read-only atlas. Button switches to/from immutable registry volume.
- The same local storage keys are read and written; no alternate disconnected "cosmos map" copy.
- Add, rename, link/unlink by selecting second node, delete with explicit confirmation, DIVE/ASCEND, 3D drag reposition (edit mode) plus GRID snapping, autosave, export/import JSON, and source link back to original 2D interface.
- The original **AI CHAT and SYNTH remain in the unchanged classic 2D editor** and can be opened as a full-size control deck over the 3D canvas. Closing the deck reloads the same saved workspace. AI actions run only after the user activates them in that original UI, not automatically in the 3D page.
- LocalStorage is origin-scoped and private to the user's browser. No action from the editor can write to JANUS Meta Registry, published source JSON shards, GitHub repository content, live models, or production agents.
- Previous local data is backed up to \`<classic-key>_3d_backup\` before overwriting. Imports enforce a 3 MB limit and require confirmation. Deletion confirms. 4,000 node / 15,000 link sanity limits.
- Deterministic layout derives x/y from classic node positions and Z from *actual HRain parent nesting*; no claim that spatial distance is scientific semantics.
- Earlier source-graph work (atlas, SYNTH display, explicit JSON pointers, lazy-loading, WebGL renderer) is kept intact.

## Test obligations
- Node test verifies exact legacy storage, local edit/persist, link toggle, safe deletion, backups and DIVE/ASCEND.
- Real headless Chromium WebGL2 test verifies editable 3D default, rename, link via canvas, exported JSON, same localStorage key and mode switch to previous 3D public source atlas.
- Existing project integrity workflows remain protected. Do not bypass on failures.

## Scientific boundary
\`LOCAL_WORKSPACE_EDIT != REGISTRY_MUTATION != MODEL_INFERENCE != SERVICE_ORCHESTRATION\`.
Registry is still a read-only *source view*, while user-authored workspace is editable. Further external actuator controls require their own explicit authorization and backend gates.
