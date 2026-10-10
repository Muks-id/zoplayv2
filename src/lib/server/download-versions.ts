export type DownloadPlatform = "windows" | "android";

export type DownloadVersionInput = {
  versionLabel: string;
  links: { platform: DownloadPlatform; serverName: string; destinationUrl: string }[];
};

export function parseDownloadVersions(value: string): DownloadVersionInput[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 10) return null;

    const labels = new Set<string>();
    const versions: DownloadVersionInput[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry.versionLabel !== "string" || !Array.isArray(entry.links)) return null;

      const versionLabel = entry.versionLabel.trim().slice(0, 60);
      const normalizedLabel = versionLabel.toLocaleLowerCase();
      if (!versionLabel || labels.has(normalizedLabel) || entry.links.length < 1 || entry.links.length > 6) return null;
      labels.add(normalizedLabel);

      const usedServers = new Set<string>();
      const links: DownloadVersionInput["links"] = [];
      for (const link of entry.links) {
        if (
          !link ||
          (link.platform !== "windows" && link.platform !== "android") ||
          typeof link.serverName !== "string" ||
          typeof link.destinationUrl !== "string"
        ) return null;

        const serverName = link.serverName.trim();
        if (!/^Server [1-3]$/.test(serverName)) return null;
        const serverKey = `${link.platform}:${serverName}`;
        if (usedServers.has(serverKey)) return null;
        usedServers.add(serverKey);

        const destination = new URL(link.destinationUrl);
        if (destination.protocol !== "https:" && destination.protocol !== "http:") return null;
        links.push({ platform: link.platform, serverName, destinationUrl: destination.toString() });
      }

      versions.push({ versionLabel, links });
    }

    return versions;
  } catch {
    return null;
  }
}
