export type ServiceDef = {
  id: string;
  name: string;
  href: string; // where the tile goes when clicked
};

export const SERVICES: ServiceDef[] = [
  { id: "github", name: "GitHub", href: "/github/login" },
];