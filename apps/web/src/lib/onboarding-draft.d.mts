export type SavedWorkspaceDraft={name:string;mode:"ai"|"commerce"|"both"};
export function draftStorageKey(userId:string):string;
export function parseSavedDraft(json:string|null):SavedWorkspaceDraft|null;
export function encodeSavedDraft(draft:SavedWorkspaceDraft):string;
