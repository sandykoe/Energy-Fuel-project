// The deployment command supplies dist as the static asset directory.
export default {
  worker: {
    name: 'energy-fuel-project',
    compatibilityDate: '2026-11-10',
    workersDev: true,
    observability: { enabled: true },
  },
};
