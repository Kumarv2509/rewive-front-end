import type { AgentCatalogEntry } from '../../api/types';

export const industryLabel: Record<AgentCatalogEntry['industry'], string> = {
  fnb: 'Food & Beverage',
  healthcare: 'Healthcare',
  retail: 'Retail',
  manufacturing: 'Manufacturing',
  logistics: 'Logistics',
  technology: 'Technology',
  financial_services: 'Financial Services',
  real_estate: 'Real Estate',
  general: 'General',
};
