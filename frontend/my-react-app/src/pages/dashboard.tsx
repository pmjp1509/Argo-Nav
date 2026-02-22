import { useEffect, useState } from 'react';
import MapView from '../components/mapview';
import Chatbot from '../components/chatbot';
import Navbar from '../components/navbar';
import { getFloats } from '../services/floats';
import type { Float } from '../services/floats';

const Dashboard = () => {
  const [floats, setFloats] = useState<Float[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [highlightedFloatIds, setHighlightedFloatIds] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getFloats();
        setFloats(data);
      } catch (err) {
        console.error('Failed to load floats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (isChatMaximized) {
    return (
      <div className="h-screen flex flex-col">
        <Navbar />
        <Chatbot isMaximized onMaximizeChange={setIsChatMaximized} onHighlightFloats={setHighlightedFloatIds} />
      </div>
    );
  }

  return (
    <div className="dashboard-container flex flex-col h-screen overflow-hidden font-sans">
      <Navbar />

      <main className="flex-1 flex flex-row min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <aside className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <p className="m-0 text-sm text-slate-700">
              <strong>Total Floats:</strong> {loading ? '...' : floats.length}
              {highlightedFloatIds.length > 0 && (
                <span className="ml-4 text-amber-600">
                  • {highlightedFloatIds.length} in result
                </span>
              )}
            </p>
          </aside>

          <section className="flex-1 min-h-0 relative">
            <MapView
              floats={floats}
              loading={loading}
              highlightedFloatIds={highlightedFloatIds}
            />
          </section>
        </div>

        <div className="w-[clamp(300px,35%,480px)] min-w-0 flex flex-col border-l border-slate-200">
          <Chatbot
            isMaximized={false}
            onMaximizeChange={setIsChatMaximized}
            onHighlightFloats={setHighlightedFloatIds}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
