export function commentDebug(event: string, details: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[SyncPad comments] ${event}`, details);
  }
}
