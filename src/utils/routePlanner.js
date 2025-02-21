// 使用改进的广度优先搜索算法实现路径规划，优先考虑直达路线，避免不必要的换乘
const findTransferPath = (metroLines, startStation, endStation) => {
  // 首先检查是否存在直达路线
  const findDirectPath = () => {
    for (const line of metroLines) {
      const startIndex = line.stations.findIndex(s => s.id === startStation);
      const endIndex = line.stations.findIndex(s => s.id === endStation);
      
      if (startIndex !== -1 && endIndex !== -1) {
        // 找到直达路线，返回完整的站点列表
        const stations = [];
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        
        for (let i = start; i <= end; i++) {
          stations.push({
            id: line.stations[i].id,
            name: line.stations[i].name
          });
        }

        // 如果起点在终点后面，需要反转站点顺序
        if (startIndex > endIndex) {
          stations.reverse();
        }

        return [{
          line: line.name,
          lineId: line.id,
          stations: stations
        }];
      }
    }
    return null;
  };

  // 检查直达路线
  const directPath = findDirectPath();
  if (directPath) {
    return {
      success: true,
      guide: directPath,
      totalStations: directPath[0].stations.length - 1
    };
  }

  // 构建站点图
  const buildStationGraph = () => {
    const graph = new Map();

    // 遍历所有线路
    metroLines.forEach(line => {
      line.stations.forEach((station, index) => {
        if (!graph.has(station.id)) {
          graph.set(station.id, {
            id: station.id,
            name: station.name,
            transfer: station.transfer,
            lineId: line.id,
            lineName: line.name,
            connections: new Set(),
            index: index
          });
        }

        // 添加同一线路相邻站点的连接
        if (index > 0) {
          graph.get(station.id).connections.add(line.stations[index - 1].id);
        }
        if (index < line.stations.length - 1) {
          graph.get(station.id).connections.add(line.stations[index + 1].id);
        }

        // 如果是换乘站，添加其他线路同名站点的连接
        if (station.transfer) {
          metroLines.forEach(otherLine => {
            if (otherLine.id !== line.id) {
              const transferStation = otherLine.stations.find(s => s.name === station.name);
              if (transferStation) {
                graph.get(station.id).connections.add(transferStation.id);
              }
            }
          });
        }
      });
    });

    return graph;
  };

  // 使用BFS查找最短路径
  const bfs = (graph, start, end) => {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
      const path = queue.shift();
      const currentStation = path[path.length - 1];

      if (currentStation === end) {
        return path;
      }

      const station = graph.get(currentStation);
      for (const nextStationId of station.connections) {
        if (!visited.has(nextStationId)) {
          visited.add(nextStationId);
          queue.push([...path, nextStationId]);
        }
      }
    }

    return null;
  };

  // 生成换乘指引
  const generateTransferGuide = (graph, path) => {
    if (!path) return null;

    const guide = [];
    let currentLine = graph.get(path[0]).lineId;
    let currentSegment = {
      line: graph.get(path[0]).lineName,
      lineId: currentLine,
      stations: []
    };

    let currentLineStations = [];

    for (let i = 0; i < path.length; i++) {
      const station = graph.get(path[i]);
      const nextStation = i < path.length - 1 ? graph.get(path[i + 1]) : null;

      // 添加当前站点
      currentLineStations.push({
        id: station.id,
        name: station.name
      });

      // 如果是换乘点或终点，处理当前线路段
      if (nextStation && nextStation.lineId !== currentLine || i === path.length - 1) {
        // 找到当前线路的所有站点
        const line = metroLines.find(l => l.id === currentLine);
        const start = Math.min(
          line.stations.findIndex(s => s.id === currentLineStations[0].id),
          line.stations.findIndex(s => s.id === currentLineStations[currentLineStations.length - 1].id)
        );
        const end = Math.max(
          line.stations.findIndex(s => s.id === currentLineStations[0].id),
          line.stations.findIndex(s => s.id === currentLineStations[currentLineStations.length - 1].id)
        );

        // 添加该线路段的所有站点，避免重复站点
        currentSegment.stations = [];
        const addedStations = new Set();
        for (let j = start; j <= end; j++) {
          const stationId = line.stations[j].id;
          // 检查是否是换乘站点，如果是，只在第一次出现时添加
          if (!addedStations.has(stationId) && 
              (j === start || j === end || 
               !nextStation || 
               line.stations[j].name !== graph.get(nextStation.id).name)) {
            currentSegment.stations.push({
              id: stationId,
              name: line.stations[j].name
            });
            addedStations.add(stationId);
          }
        }

        // 如果起点在终点后面，需要反转站点顺序
        if (line.stations.findIndex(s => s.id === currentLineStations[0].id) >
            line.stations.findIndex(s => s.id === currentLineStations[currentLineStations.length - 1].id)) {
          currentSegment.stations.reverse();
        }

        guide.push(currentSegment);

        if (nextStation) {
          currentLine = nextStation.lineId;
          currentSegment = {
            line: nextStation.lineName,
            lineId: currentLine,
            stations: []
          };
          currentLineStations = [];
        }
      }
    }

    return guide;
  };

  // 计算总站数
  const calculateTotalStations = (guide) => {
    if (!guide) return 0;
    let total = 0;
    guide.forEach(segment => {
      total += segment.stations.length - 1;
    });
    return total;
  };

  const graph = buildStationGraph();
  const path = bfs(graph, startStation, endStation);
  const guide = generateTransferGuide(graph, path);
  const totalStations = calculateTotalStations(guide);

  return {
    success: !!path,
    guide,
    totalStations
  };
};

export { findTransferPath };