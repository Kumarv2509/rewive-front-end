import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { AreaSidebar } from './AreaSidebar';
import { MobileNav } from './MobileNav';
import { TourOverlay } from '../tour/TourOverlay';
import { CommandPaletteProvider } from './CommandPalette';

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <div className="app-v2">
        <TopNav />
        <div className="below-topnav">
          <AreaSidebar />
          <div className="main">
            <div className="content">
              <Outlet />
            </div>
          </div>
        </div>
        <MobileNav />
        <TourOverlay />
      </div>
    </CommandPaletteProvider>
  );
}
