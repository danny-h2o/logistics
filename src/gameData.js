export const BALANCE = {
  mapUnitsPerKm: 8,
  startingCash: 28000,
};

export const CARGO = [
  {
    id: 'grain',
    name: 'Grain',
    baseValue: 18,
    weightPerUnit: 4,
    volumePerUnit: 2,
    perishability: 0,
    refrigerationPreferred: false,
    fragile: false,
    theftRisk: 0.02,
    description: 'A dependable bulk load with a long shelf life.',
  },
  {
    id: 'produce',
    name: 'Fresh produce',
    baseValue: 42,
    weightPerUnit: 2,
    volumePerUnit: 3,
    perishability: 0.8,
    refrigerationPreferred: true,
    fragile: true,
    theftRisk: 0.04,
    description: 'Time-sensitive goods that benefit from refrigeration.',
  },
  {
    id: 'medicine',
    name: 'Medicine',
    baseValue: 85,
    weightPerUnit: 1,
    volumePerUnit: 1,
    perishability: 0.35,
    refrigerationPreferred: true,
    fragile: false,
    theftRisk: 0.06,
    description: 'High-value medical supplies with strict delivery windows.',
  },
  {
    id: 'electronics',
    name: 'Electronics',
    baseValue: 110,
    weightPerUnit: 1,
    volumePerUnit: 2,
    perishability: 0,
    refrigerationPreferred: false,
    fragile: true,
    theftRisk: 0.1,
    description: 'Compact, valuable cargo that needs careful handling.',
  },
];

export const VEHICLE_DEFINITIONS = [
  {
    id: 'delivery-van',
    name: 'Delivery van',
    purchaseCost: 6800,
    capacityUnits: 18,
    maxSpeedKph: 82,
    operatingCostPerKm: 0.72,
    reliability: 0.94,
    refrigerated: false,
    allowedCargoTags: ['general'],
  },
  {
    id: 'standard-truck',
    name: 'Standard truck',
    purchaseCost: 14200,
    capacityUnits: 54,
    maxSpeedKph: 64,
    operatingCostPerKm: 1.28,
    reliability: 0.9,
    refrigerated: false,
    allowedCargoTags: ['general', 'bulk'],
  },
  {
    id: 'refrigerated-truck',
    name: 'Refrigerated truck',
    purchaseCost: 21800,
    capacityUnits: 42,
    maxSpeedKph: 58,
    operatingCostPerKm: 1.62,
    reliability: 0.88,
    refrigerated: true,
    allowedCargoTags: ['general', 'perishable', 'medical'],
  },
];

export const STARTING_WORLD = {
  cash: BALANCE.startingCash,
  gameMinute: 8 * 60,
  nodes: [
    { id: 'northfield', name: 'Northfield', type: 'supplier', x: 185, y: 142 },
    { id: 'pinecrest', name: 'Pinecrest', type: 'customer', x: 432, y: 92 },
    { id: 'millhaven', name: 'Millhaven', type: 'hub', x: 548, y: 282 },
    { id: 'brookside', name: 'Brookside', type: 'mixed', x: 775, y: 192 },
    { id: 'fairview', name: 'Fairview', type: 'customer', x: 366, y: 420 },
    { id: 'redmont', name: 'Redmont', type: 'supplier', x: 738, y: 443 },
  ],
  edges: [
    { id: 'road-north-mill', from: 'northfield', to: 'millhaven', status: 'open', toll: 0 },
    { id: 'road-pine-mill', from: 'pinecrest', to: 'millhaven', status: 'open', toll: 2 },
    { id: 'road-mill-brook', from: 'millhaven', to: 'brookside', status: 'open', toll: 0 },
    { id: 'road-mill-fair', from: 'millhaven', to: 'fairview', status: 'open', toll: 0 },
    { id: 'road-fair-red', from: 'fairview', to: 'redmont', status: 'open', toll: 1 },
    { id: 'road-brook-red', from: 'brookside', to: 'redmont', status: 'open', toll: 2 },
    { id: 'road-pine-brook', from: 'pinecrest', to: 'brookside', status: 'open', toll: 1 },
  ],
  vehicles: [
    { id: 'van-01', definitionId: 'delivery-van', status: 'idle', currentNodeId: 'millhaven', condition: 100 },
    { id: 'truck-01', definitionId: 'standard-truck', status: 'idle', currentNodeId: 'northfield', condition: 96 },
  ],
  contracts: [],
  shipments: [],
  incidents: [],
};

export function validateWorld(world) {
  const errors = [];
  const uniqueIds = (items, label) => {
    const seen = new Set();
    items.forEach(({ id }) => {
      if (!id || seen.has(id)) errors.push(`${label} IDs must be present and unique (${id || 'missing'}).`);
      seen.add(id);
    });
  };

  uniqueIds(world.nodes, 'Node');
  uniqueIds(world.edges, 'Road');
  uniqueIds(world.vehicles, 'Vehicle');
  uniqueIds(world.contracts, 'Contract');
  uniqueIds(world.shipments, 'Shipment');
  uniqueIds(world.incidents, 'Incident');

  const nodeIds = new Set(world.nodes.map(({ id }) => id));
  const vehicleIds = new Set(world.vehicles.map(({ id }) => id));
  const edgePairs = new Set();

  world.edges.forEach((edge) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`Road "${edge.id}" references a missing location.`);
    }
    const pair = [edge.from, edge.to].sort().join(':');
    if (edge.from === edge.to || edgePairs.has(pair)) errors.push(`Road "${edge.id}" duplicates an existing connection.`);
    edgePairs.add(pair);
  });

  world.vehicles.forEach((vehicle) => {
    if (!VEHICLE_DEFINITIONS.some(({ id }) => id === vehicle.definitionId)) {
      errors.push(`Vehicle "${vehicle.id}" references an unknown vehicle class.`);
    }
    if (vehicle.currentNodeId && !nodeIds.has(vehicle.currentNodeId)) {
      errors.push(`Vehicle "${vehicle.id}" references a missing location.`);
    }
  });

  world.contracts.forEach((contract) => {
    if (!nodeIds.has(contract.originNodeId) || !nodeIds.has(contract.destinationNodeId)) {
      errors.push(`Contract "${contract.id}" references a missing location.`);
    }
    if (!CARGO.some(({ id }) => id === contract.cargoTypeId)) {
      errors.push(`Contract "${contract.id}" references an unknown cargo type.`);
    }
  });

  world.shipments.forEach((shipment) => {
    if (!vehicleIds.has(shipment.vehicleId)) errors.push(`Shipment "${shipment.id}" references a missing vehicle.`);
    if (!world.contracts.some(({ id }) => id === shipment.contractId)) {
      errors.push(`Shipment "${shipment.id}" references a missing contract.`);
    }
  });

  return errors;
}

export function distanceKm(first, second) {
  return Math.round((Math.hypot(first.x - second.x, first.y - second.y) / BALANCE.mapUnitsPerKm) * 10) / 10;
}
