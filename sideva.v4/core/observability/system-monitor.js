export function systemMonitor(event, metadata = {}) {
    console.log('[SYSTEM MONITOR]', {
        event,
        metadata,
        timestamp: new Date().toISOString()
    });
}