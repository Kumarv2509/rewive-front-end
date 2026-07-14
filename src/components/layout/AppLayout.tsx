import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { AreaSidebar } from './AreaSidebar';
import { Topbar } from './Topbar';
import { TourOverlay } from '../tour/TourOverlay';

export function AppLayout() {
  return (
    <div className="app-v2">
      <TopNav />
      <div className="below-topnav">
        <AreaSidebar />
        <div className="main">
          <Topbar />
          <div className="content">
            <Outlet />
          </div>
        </div>
      </div>
      <TourOverlay />
    </div>
  );
}
