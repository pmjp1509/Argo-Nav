import { useEffect, useState } from 'react';
import MapView from '../components/mapview';
import Chatbot from '../components/chatbot';
import { getFloats } from '../services/floats';
import type { Float } from '../services/floats';

const Dashboard = () => {
  const [floats, setFloats] = useState<Float[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatMaximized, setIsChatMaximized] = useState(false);

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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Chatbot isMaximized={true} onMaximizeChange={setIsChatMaximized} />
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* Top Header */}
      <header style={{ padding: '1rem', background: '#1e293b', color: 'white' }}>
        <h1>Argo Float Monitor</h1>
      </header>

      <main style={{ display: 'flex', flex: 1, gap: 0 }}>
        
        {/* Left Section: Stats + Map */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Side Stats Panel */}
          <aside style={{ width: '100%', borderRight: '1px solid #ddd', padding: '1rem', background: '#f9fafb', borderBottom: '1px solid #ddd' }}>
            <h3>Statistics</h3>
            <p><strong>Total Floats:</strong> {loading ? '...' : floats.length}</p>
          </aside>

          {/* Map Section */}
          <section style={{ flex: 1, position: 'relative' }}>
            <MapView floats={floats} loading={loading} />
          </section>
        </div>

        {/* Right Section: Chatbot */}
        <div style={{ width: '35%', minWidth: '300px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd' }}>
          <Chatbot isMaximized={false} onMaximizeChange={setIsChatMaximized} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;