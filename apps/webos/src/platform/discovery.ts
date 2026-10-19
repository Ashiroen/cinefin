export interface DiscoveredServer {
  id: string;
  name: string;
  address: string;
}

declare global {
  interface Window {
    webOS?: {
      service?: {
        request: (
          uri: string,
          opts: {
            method: string;
            parameters?: Record<string, unknown>;
            onSuccess?: (res: { servers?: DiscoveredServer[] }) => void;
            onFailure?: (err: { errorText?: string }) => void;
          },
        ) => void;
      };
      platformBack?: () => void;
    };
  }
}

export function isWebOs(): boolean {
  return typeof window !== 'undefined' && Boolean(window.webOS?.service);
}

export function discoverServers(): Promise<DiscoveredServer[]> {
  return new Promise((resolve) => {
    if (!window.webOS?.service) {
      resolve([]);
      return;
    }
    window.webOS.service.request('luna://com.cinefin.app.service', {
      method: 'discover',
      onSuccess: (res) => resolve(res.servers ?? []),
      onFailure: () => resolve([]),
    });
  });
}

export function platformBack() {
  if (window.webOS?.platformBack) {
    window.webOS.platformBack();
    return;
  }
  window.history.back();
}
