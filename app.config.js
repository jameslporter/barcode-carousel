// Extends app.json. When EXPO_BASE_URL is set (e.g. "/barcode-carousel" for the
// GitHub Pages build), the web export is served from that subpath so routes and
// assets resolve correctly. Local development is unaffected when it is unset.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl },
  };
};
