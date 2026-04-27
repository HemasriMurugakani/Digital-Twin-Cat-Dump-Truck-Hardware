export const sensorBounds = {
  acoustic_db: [55, 92],
  vibration_g: [0.25, 1.25],
  thermal_c: [34, 57],
  lidar_mm: [8, 85]
};

export function normalizeSensor(key, value) {
  const [min, max] = sensorBounds[key] ?? [0, 1];
  const ratio = (value - min) / (max - min);
  return Math.min(1, Math.max(0, ratio));
}

export function evaluateSensorHealth(sensors) {
  return Object.entries(sensors).reduce((acc, [key, value]) => {
    const normalized = normalizeSensor(key, value);
    acc[key] = {
      normalized,
      status: normalized > 0.75 ? 'high' : normalized > 0.45 ? 'watch' : 'normal'
    };
    return acc;
  }, {});
}

export function toChartSeries(history) {
  return history.map((item, index) => ({
    idx: index,
    acoustic: item.acoustic,
    vibration: item.vibration,
    thermal: item.thermal,
    lidar: item.lidar,
    risk: item.risk
  }));
}
