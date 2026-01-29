export type NavbarEventType =
  | "tenantsChanged"
  | "rolesChanged"
  | "usersChanged"
  | "clientsChanged";

export type ChangeAction = "create" | "update" | "delete";

export interface NavbarEventDetail {
  action: ChangeAction;
  resourceId?: string;
  clientId?: string;
  timestamp: number;
}

const emitNavbarEvent = (eventType: NavbarEventType, detail: Partial<NavbarEventDetail> = {}) => {
  const event = new CustomEvent(eventType, {
    detail: {
      action: detail.action || "update",
      resourceId: detail.resourceId,
      clientId: detail.clientId,
      timestamp: Date.now(),
    } as NavbarEventDetail,
  });
  window.dispatchEvent(event);
};



export const emitTenantsChanged = (action: ChangeAction = "update", resourceId?: string) => {
  emitNavbarEvent("tenantsChanged", { action, resourceId });
};

export const emitRolesChanged = (action: ChangeAction = "update", resourceId?: string) => {
  emitNavbarEvent("rolesChanged", { action, resourceId });
};

export const emitUsersChanged = (action: ChangeAction = "update", resourceId?: string) => {
  emitNavbarEvent("usersChanged", { action, resourceId });
};

export const emitClientsChanged = (action: ChangeAction = "update", resourceId?: string) => {
  emitNavbarEvent("clientsChanged", { action, resourceId });
};



export const createNavbarEventListener = (
  eventType: NavbarEventType,
  callback: (detail: NavbarEventDetail) => void
) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<NavbarEventDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(eventType, handler);

  return () => window.removeEventListener(eventType, handler);
};
