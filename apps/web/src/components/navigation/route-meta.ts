export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface RouteMeta {
  title: string;
  breadcrumbs: BreadcrumbItem[];
}

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname === "/dashboard") {
    return { title: "Overview", breadcrumbs: [{ label: "Overview" }] };
  }

  if (pathname === "/repositories") {
    return {
      title: "Repositories",
      breadcrumbs: [{ label: "Repositories" }]
    };
  }

  if (pathname === "/repositories/connect") {
    return {
      title: "Connect repository",
      breadcrumbs: [
        { label: "Repositories", to: "/repositories" },
        { label: "Connect" }
      ]
    };
  }

  if (/^\/repositories\/[^/]+$/.test(pathname)) {
    return {
      title: "Repository details",
      breadcrumbs: [
        { label: "Repositories", to: "/repositories" },
        { label: "Details" }
      ]
    };
  }

  if (pathname === "/scans") {
    return { title: "Scans", breadcrumbs: [{ label: "Scans" }] };
  }

  if (/^\/scans\/[^/]+$/.test(pathname)) {
    return {
      title: "Scan details",
      breadcrumbs: [{ label: "Scans", to: "/scans" }, { label: "Details" }]
    };
  }

  if (pathname === "/settings") {
    return { title: "Settings", breadcrumbs: [{ label: "Settings" }] };
  }

  return { title: "CodeSense", breadcrumbs: [] };
}
