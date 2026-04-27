// Static logo art for seeded demo projects, keyed by project id.
// Uses Steam's public header image CDN for reliable square-cropped art.
const steamHeader = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

export const PROJECT_LOGOS: Record<string, string> = {
  '40000000-0000-0000-0000-000000000001': steamHeader(1030300), // Hollow Knight: Silksong
  '40000000-0000-0000-0000-000000000002': steamHeader(1363080), // Manor Lords
  '40000000-0000-0000-0000-000000000003': steamHeader(1145350), // Hades II
  '40000000-0000-0000-0000-000000000004': steamHeader(1794680), // Vampire Survivors
  '40000000-0000-0000-0000-000000000005': steamHeader(567380),  // Heartbound
  '40000000-0000-0000-0000-000000000006': steamHeader(1228610), // Karlson
  '40000000-0000-0000-0000-000000000007': steamHeader(813230),  // Animal Well
  '40000000-0000-0000-0000-000000000008': steamHeader(2231450), // Pizza Tower
  '40000000-0000-0000-0000-000000000009': steamHeader(553420),  // Tunic
  '40000000-0000-0000-0000-000000000010': steamHeader(1966720), // Lethal Company
  '40000000-0000-0000-0000-000000000011': steamHeader(1115050), // Will You Snail?
  '40000000-0000-0000-0000-000000000013': steamHeader(2198150), // Tiny Glade
  '40000000-0000-0000-0000-000000000014': steamHeader(1313140), // Cult of the Lamb
  '40000000-0000-0000-0000-000000000017': steamHeader(975370),  // Dwarf Fortress
  '40000000-0000-0000-0000-000000000018': steamHeader(2379780), // Balatro
  '40000000-0000-0000-0000-000000000020': steamHeader(2365810), // Pseudoregalia
};

export function getProjectLogo(projectId: string): string | undefined {
  return PROJECT_LOGOS[projectId];
}
