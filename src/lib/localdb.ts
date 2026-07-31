// Stub — backup/restore functionality is not implemented in this Supabase-backed version.
export function exportDatabase(): string {
  return JSON.stringify({ note: 'Backup not supported in this version.' });
}

export function importDatabase(_json: string): void {
  throw new Error('Import not supported in this version.');
}
