const PurchasesMock = {
  configure: () => {},
  getCustomerInfo: async () => ({ entitlements: { active: {} } }),
  getOfferings: async () => ({ current: null }),
  purchasePackage: async () => ({}),
  restorePurchases: async () => ({}),
};

export const PURCHASES_ERROR_CODE = {};

export default PurchasesMock;
