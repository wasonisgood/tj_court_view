import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import CaseView from './views/CaseView';
import KeyCasesView from './views/KeyCasesView';
import HelpModal from './components/ui/HelpModal';
import { getJudgmentDB } from './utils/data';

function AppContent() {
  const [db, setDb] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkData = () => {
      const data = getJudgmentDB();
      if (data && data.length > 0) {
        setDb(data);
      } else {
        setTimeout(checkData, 100);
      }
    };
    checkData();
  }, []);

  const navigateToCase = (id) => {
    navigate(`/case/${encodeURIComponent(id)}`);
  };

  if (db.length === 0) return <div className="flex items-center justify-center h-screen text-brand-700 font-serif">載入中...</div>;

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-paper-50">
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      
      {/* Mobile Header */}
      <div className="md:hidden bg-brand-950 text-white p-4 flex justify-between items-center z-50 shadow-md">
        <div className="font-serif font-bold truncate flex items-center">
            <span className="w-6 h-6 rounded bg-accent-500 flex items-center justify-center text-brand-950 text-xs mr-2">
              <i className="fas fa-scale-balanced"></i>
            </span>
            轉型正義系統
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-white"><i className="fas fa-question-circle"></i></button>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-white"><i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'}`}></i></button>
        </div>
      </div>

      <Sidebar 
        db={db} 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        isOpen={isSidebarOpen} 
        setIsOpen={setSidebarOpen} 
        navigateToCase={navigateToCase}
        selectedId={location.pathname.startsWith('/case/') ? decodeURIComponent(location.pathname.split('/case/')[1]) : null}
      />

      <div className="flex-1 overflow-y-auto bg-paper-50 w-full relative custom-scrollbar">
        <Routes>
          <Route path="/" element={<Dashboard db={db} onSelectCase={navigateToCase} />} />
          <Route path="/key-cases" element={<KeyCasesView db={db} onSelectCase={navigateToCase} />} />
          <Route path="/case/:id" element={<CaseWrapper db={db} />} />
        </Routes>
      </div>
    </div>
  );
}

const CaseWrapper = ({ db }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const judgment = useMemo(() => {
    if (!id) return null;
    const decodedId = decodeURIComponent(id);
    return db.find(x => x.meta.id === decodedId || x.analysis_meta.path === decodedId);
  }, [db, id]);

  return <CaseView judgment={judgment} onBack={() => navigate(-1)} />;
};

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
