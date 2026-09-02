import { createBrowserRouter } from 'react-router';
import { RootLayout } from '@/app/RootLayout';
import { HomePage } from '@/routes/HomePage';
import { ToolPage } from '@/routes/ToolPage';
import { AboutPage } from '@/routes/AboutPage';
import { SettingsPage } from '@/routes/SettingsPage';
import { NotFoundPage } from '@/routes/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 't/:toolId', element: <ToolPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
