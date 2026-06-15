import { createHashRouter, RouterProvider, Outlet } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { MyProfilePage } from '../pages/MyProfilePage';
import { FriendsPage } from '../pages/FriendsPage';
import { useIframe } from '../hooks/useIframeListener';

function Layout() {
  useIframe();
  return (
    <>
      <TopBar />
      <Outlet />
    </>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <MyProfilePage /> },
      { path: 'friends', element: <FriendsPage /> },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
