import { STARTING_WORLD, validateWorld } from './gameData';

test('starter world has valid entity references and connections', () => {
  expect(validateWorld(STARTING_WORLD)).toEqual([]);
  expect(STARTING_WORLD.nodes.length).toBeGreaterThanOrEqual(4);
  expect(STARTING_WORLD.edges.length).toBeGreaterThan(0);
});

test('world validation reports duplicate IDs and missing road endpoints', () => {
  const invalidWorld = {
    ...STARTING_WORLD,
    nodes: [...STARTING_WORLD.nodes, { ...STARTING_WORLD.nodes[0] }],
    edges: [...STARTING_WORLD.edges, { id: 'bad-road', from: 'northfield', to: 'missing-town' }],
  };

  expect(validateWorld(invalidWorld)).toEqual(expect.arrayContaining([
    expect.stringContaining('IDs must be present and unique'),
    expect.stringContaining('references a missing location'),
  ]));
});

test('world validation reports invalid vehicle and shipment references', () => {
  const invalidWorld = {
    ...STARTING_WORLD,
    vehicles: [{ ...STARTING_WORLD.vehicles[0], definitionId: 'unlisted-truck' }],
    shipments: [{ id: 'trip-1', contractId: 'missing-contract', vehicleId: 'missing-vehicle' }],
  };

  expect(validateWorld(invalidWorld)).toEqual(expect.arrayContaining([
    expect.stringContaining('unknown vehicle class'),
    expect.stringContaining('references a missing vehicle'),
    expect.stringContaining('references a missing contract'),
  ]));
});
