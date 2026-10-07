import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { StoreProvider, useStore } from './core/StoreContext';
import { DialogProvider } from './ui';
import ConsoleLayout from './layout/ConsoleLayout';
import Home from './modules/home/Home';
import { JudgmentsProvider } from './modules/judgments/data';

const JOverview = lazy(() => import('./modules/judgments/pages/Overview'));
const JBrowse = lazy(() => import('./modules/judgments/pages/Browse'));
const JFavorable = lazy(() => import('./modules/judgments/pages/Favorable'));
const JUnfavorable = lazy(() => import('./modules/judgments/pages/Unfavorable'));
const JSpecial = lazy(() => import('./modules/judgments/pages/Special'));
const JCourts = lazy(() => import('./modules/judgments/pages/Courts'));
const JMarked = lazy(() => import('./modules/judgments/pages/Marked'));
const JNotes = lazy(() => import('./modules/judgments/pages/Notes'));
const JPersons = lazy(() => import('./modules/judgments/pages/Persons'));
const JPerson = lazy(() => import('./modules/judgments/pages/Person'));
const JTree = lazy(() => import('./modules/judgments/pages/TreePage'));
const JCase = lazy(() => import('./modules/judgments/pages/CaseView'));
const Literature = lazy(() => import('./modules/literature/Literature'));
const ResearchLog = lazy(() => import('./modules/system/ResearchLog'));
const SystemPage = lazy(() => import('./modules/system/SystemPage'));

const Loading = () => <div className="py-20 text-center text-sm text-stone-400">載入中…</div>;

const ScrollTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { document.getElementById('main-scroll')?.scrollTo(0, 0); }, [pathname]);
  return null;
};

const Shell = () => {
  const { isLoading, settings } = useStore();
  useEffect(() => { document.title = settings.siteName; }, [settings.siteName]);
  if (isLoading) return <div className="h-full flex items-center justify-center text-sm text-stone-400">載入中…</div>;
  return (
    <JudgmentsProvider>
      <ScrollTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<ConsoleLayout />}>
            <Route index element={<Home />} />
            <Route path="judgments">
              <Route index element={<JOverview />} />
              <Route path="browse" element={<JBrowse />} />
              <Route path="favorable" element={<JFavorable />} />
              <Route path="unfavorable" element={<JUnfavorable />} />
              <Route path="special" element={<JSpecial />} />
              <Route path="courts" element={<JCourts />} />
              <Route path="marked" element={<JMarked />} />
              <Route path="notes" element={<JNotes />} />
              <Route path="case/:id" element={<JCase />} />
              <Route path="persons" element={<JPersons />} />
              <Route path="person/:name" element={<JPerson />} />
              <Route path="tree" element={<JTree />} />
            </Route>
            {/* 舊版網址相容 */}
            <Route path="case/:id" element={<LegacyCaseRedirect />} />
            <Route path="key-cases" element={<Navigate to="/judgments/marked" replace />} />
            <Route path="literature" element={<Literature />} />
            <Route path="log" element={<ResearchLog />} />
            <Route path="system" element={<SystemPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </JudgmentsProvider>
  );
};

const LegacyCaseRedirect = () => {
  const { pathname } = useLocation();
  return <Navigate to={'/judgments' + pathname} replace />;
};

const App = () => (
  <HashRouter>
    <DialogProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </DialogProvider>
  </HashRouter>
);

export default App;
