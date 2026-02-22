export interface Float {
  id: string;
  latitude: number;
  longitude: number;
}

export const getFloats = async (): Promise<Float[]> => {
  try {
    // Fetch from backend API
    const response = await fetch('http://127.0.0.1:8000/api/v1/floats');
    if (!response.ok) throw new Error('Backend API failed');
    const data = await response.json();
    
    // Map API response to Float interface
    return data.map((item: { float_id: string; latitude: number; longitude: number }) => ({
      id: item.float_id,
      latitude: item.latitude,
      longitude: item.longitude
    }));
  } catch (err) {
    console.error('Failed to load floats:', err);
    // Return empty array if backend is down
    return [];
  }
};