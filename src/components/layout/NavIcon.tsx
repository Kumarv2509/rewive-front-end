import type { AreaNavItem } from './areas';

const common = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function NavIcon({ icon }: { icon: AreaNavItem['icon'] }) {
  switch (icon) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M9 12l2 2 4-5" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...common}>
          <path d="M9 2v6M15 2v6" />
          <path d="M6 8h12v4a6 6 0 01-12 0V8z" />
          <path d="M12 18v4" />
        </svg>
      );
    case 'studio':
      return (
        <svg {...common}>
          <circle cx="5" cy="6" r="2.2" />
          <circle cx="5" cy="18" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
          <path d="M7 6h6a4 4 0 014 4M7 18h6a4 4 0 004-4" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'people':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
          <circle cx="17.5" cy="9" r="2.5" />
          <path d="M16 15.2c2.6.3 4.6 1.9 5.5 4.8" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15l3-4 3 2 4-6" />
        </svg>
      );
    case 'signal':
      return (
        <svg {...common}>
          <path d="M4 18v-3M9 18V9M14 18v-7M19 18V5" />
        </svg>
      );
    default:
      return null;
  }
}
