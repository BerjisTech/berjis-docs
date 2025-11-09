const w = typeof window !== 'undefined' ? (window as any) : {};

export const environment = {
  production: true,
  apiBase: w && typeof w.__BERJIS_API__ === 'string' && w.__BERJIS_API__.trim().length
    ? w.__BERJIS_API__.trim()
    : 'https://api.berjis.tech',
  docsApiBase: w && typeof w.__DOCS_API__ === 'string' && w.__DOCS_API__.trim().length
    ? w.__DOCS_API__.trim()
    : 'https://docs-api.berjis.tech'
};
