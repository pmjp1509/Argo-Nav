import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

type DepthPoint = { pres_dbar: number; temp_mean: number; temp_min?: number; temp_max?: number };
type FloatTemp = { float_id: string; mean_temp_c: number };

export type ChartData = {
  depth_vs_temp?: DepthPoint[];
  by_float_temp?: FloatTemp[];
} | null;

interface ResponseChartsProps {
  chartData: ChartData;
}

const ResponseCharts = ({ chartData }: ResponseChartsProps) => {
  if (!chartData || (!chartData.depth_vs_temp?.length && !chartData.by_float_temp?.length)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 mt-3">
      {chartData.depth_vs_temp && chartData.depth_vs_temp.length > 0 && (
        <div>
          <h4 className="m-0 mb-2 text-sm text-slate-600 font-medium">
            Temperature vs depth (pressure)
          </h4>
          <div className="w-full h-[220px]">
            <ResponsiveContainer>
              <LineChart data={chartData.depth_vs_temp} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="pres_dbar" type="number" name="Pressure (dbar)" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: number | undefined) => [(v ?? 0).toFixed(2) + ' °C', 'Temp']} />
                <Line type="monotone" dataKey="temp_mean" stroke="#3b82f6" strokeWidth={2} dot={false} name="Mean temp (°C)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {chartData.by_float_temp && chartData.by_float_temp.length > 0 && (
        <div>
          <h4 className="m-0 mb-2 text-sm text-slate-600 font-medium">
            Mean temperature by float
          </h4>
          <div className="w-full h-[220px]">
            <ResponsiveContainer>
              <BarChart
                data={chartData.by_float_temp}
                margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="float_id" type="category" width={80} fontSize={10} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number | undefined) => [(v ?? 0).toFixed(2) + ' °C', 'Mean temp']} />
                <Bar dataKey="mean_temp_c" fill="#0ea5e9" name="Mean temp (°C)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseCharts;
