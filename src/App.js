import { useMemo, useState } from 'react';
import './App.css';
import { CARGO, distanceKm, STARTING_WORLD, validateWorld, VEHICLE_DEFINITIONS } from './gameData';

const NODE_TYPES = [
  { id: 'supplier', label: 'Supplier', icon: 'S', color: '#d58d42' },
  { id: 'customer', label: 'Customer', icon: 'C', color: '#43866f' },
  { id: 'hub', label: 'Hub', icon: 'H', color: '#4e79b6' },
  { id: 'mixed', label: 'Mixed use', icon: 'M', color: '#7b65a8' },
];

const typeFor = (type) => NODE_TYPES.find((entry) => entry.id === type) || NODE_TYPES[3];

function mapPointFromEvent(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  const width = bounds.width || 1000;
  const height = bounds.height || 600;
  const scale = Math.min(width / 1000, height / 600);
  const offsetX = (width - 1000 * scale) / 2;
  const offsetY = (height - 600 * scale) / 2;
  return {
    x: Math.max(48, Math.min(952, Math.round((event.clientX - bounds.left - offsetX) / scale))),
    y: Math.max(54, Math.min(546, Math.round((event.clientY - bounds.top - offsetY) / scale))),
  };
}

function App() {
  const [world, setWorld] = useState(STARTING_WORLD);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState('select');
  const [connectFrom, setConnectFrom] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [newLocation, setNewLocation] = useState(null);
  const [notice, setNotice] = useState('');

  const selectedNode = selected?.kind === 'node' ? world.nodes.find(({ id }) => id === selected.id) : null;
  const selectedEdge = selected?.kind === 'edge' ? world.edges.find(({ id }) => id === selected.id) : null;
  const errors = useMemo(() => validateWorld(world), [world]);
  const nodeById = useMemo(() => new Map(world.nodes.map((node) => [node.id, node])), [world.nodes]);
  const mapStats = useMemo(() => ({
    locations: world.nodes.length,
    roads: world.edges.length,
    networkKm: world.edges.reduce((total, edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      return total + (from && to ? distanceKm(from, to) : 0);
    }, 0),
  }), [nodeById, world.edges, world.nodes.length]);

  const updateNode = (id, updates) => {
    setWorld((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === id ? { ...node, ...updates } : node),
    }));
  };

  const startMode = (nextMode) => {
    setMode((current) => current === nextMode ? 'select' : nextMode);
    setConnectFrom(null);
    setNewLocation(null);
    setNotice('');
  };

  const handleMapClick = (event) => {
    if (mode !== 'add') return;
    const { x, y } = mapPointFromEvent(event);
    setNewLocation({ x, y, name: `New location ${world.nodes.length + 1}`, type: 'mixed' });
    setMode('select');
    setNotice('Set a name and location type, then add it to the map.');
  };

  const addLocation = (event) => {
    event.preventDefault();
    const id = `location-${Date.now()}`;
    const node = { id, x: newLocation.x, y: newLocation.y, name: newLocation.name.trim(), type: newLocation.type };
    if (!node.name) return;
    setWorld((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setSelected({ kind: 'node', id });
    setNewLocation(null);
    setNotice(`${node.name} added. Select Connect roads to link it to the network.`);
  };

  const selectNode = (event, node) => {
    event.stopPropagation();
    if (mode === 'connect') {
      if (!connectFrom) {
        setConnectFrom(node.id);
        setNotice(`Choose a second location to connect to ${node.name}.`);
        return;
      }
      if (connectFrom === node.id) {
        setNotice('Choose a different location to create a road.');
        return;
      }
      const exists = world.edges.some((edge) => (
        (edge.from === connectFrom && edge.to === node.id) || (edge.to === connectFrom && edge.from === node.id)
      ));
      if (exists) {
        setNotice('A road already connects those locations.');
        return;
      }
      const fromNode = nodeById.get(connectFrom);
      const id = `road-${Date.now()}`;
      setWorld((current) => ({
        ...current,
        edges: [...current.edges, { id, from: connectFrom, to: node.id, status: 'open', toll: 0 }],
      }));
      setSelected({ kind: 'edge', id });
      setConnectFrom(null);
      setMode('select');
      setNotice(`Road connected: ${fromNode?.name || 'Location'} to ${node.name}.`);
      return;
    }
    if (mode === 'move') return;
    setSelected({ kind: 'node', id: node.id });
    setNotice('');
  };

  const deleteSelected = () => {
    if (selectedNode) {
      const linkedRoads = world.edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id);
      const linkedVehicles = world.vehicles.filter((vehicle) => vehicle.currentNodeId === selectedNode.id);
      const linkedContracts = world.contracts.filter((contract) => (
        contract.originNodeId === selectedNode.id || contract.destinationNodeId === selectedNode.id
      ));
      if (linkedVehicles.length || linkedContracts.length) {
        setNotice('This location is referenced by a vehicle or contract and cannot be removed.');
        return;
      }
      const message = linkedRoads.length
        ? `Delete ${selectedNode.name} and its ${linkedRoads.length} connected road${linkedRoads.length === 1 ? '' : 's'}?`
        : `Delete ${selectedNode.name}?`;
      if (!window.confirm(message)) return;
      setWorld((current) => ({
        ...current,
        nodes: current.nodes.filter(({ id }) => id !== selectedNode.id),
        edges: current.edges.filter((edge) => edge.from !== selectedNode.id && edge.to !== selectedNode.id),
      }));
      setSelected(null);
      setNotice('Location and connected roads removed.');
      return;
    }
    if (selectedEdge) {
      if (!window.confirm('Remove this road connection?')) return;
      setWorld((current) => ({ ...current, edges: current.edges.filter(({ id }) => id !== selectedEdge.id) }));
      setSelected(null);
      setNotice('Road removed from the network.');
    }
  };

  const handleMapPointerMove = (event) => {
    if (!draggingId) return;
    updateNode(draggingId, mapPointFromEvent(event));
  };

  const pauseDrag = () => setDraggingId(null);
  const selectedRoadEndpoints = selectedEdge ? [nodeById.get(selectedEdge.from), nodeById.get(selectedEdge.to)] : [];
  return (
    <main className="min-h-screen bg-[#f3f6f4] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-lg font-black text-white">L</div>
            <div>
              <p className="text-sm font-bold tracking-tight">LANTERN LOGISTICS</p>
              <p className="text-xs text-slate-500">Regional operations · North Coast</p>
            </div>
          </div>
          <div className="hidden items-center gap-8 sm:flex">
            <Metric label="Locations" value={mapStats.locations} />
            <Metric label="Roads" value={mapStats.roads} />
            <Metric label="Network length" value={`${Math.round(mapStats.networkKm)} km`} />
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700">Available capital</p>
            <p className="text-sm font-bold text-emerald-950">${world.cash.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-5 lg:px-8 lg:py-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Network management
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Regional road network</h1>
            <p className="mt-1 text-sm text-slate-500">Shape your network before the first dispatch.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-slate-500">Local time</span>
            <span className="font-semibold">08:00</span>
            <span className="mx-1 h-4 border-l border-slate-200" />
            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Planning</span>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-sm font-bold">Network map</h2>
                <p className="text-xs text-slate-500">Fictional North Coast region · road distance scales with map spacing</p>
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Map tools">
                <ToolButton active={mode === 'select'} onClick={() => startMode('select')}>Select</ToolButton>
                <ToolButton active={mode === 'add'} onClick={() => startMode('add')}>+ Location</ToolButton>
                <ToolButton active={mode === 'connect'} onClick={() => startMode('connect')}>Connect roads</ToolButton>
                <ToolButton active={mode === 'move'} onClick={() => startMode('move')}>Move</ToolButton>
              </div>
            </div>

            <div className="relative h-[440px] min-h-[360px] sm:h-[560px]">
              <svg
                className={`map-surface h-full w-full ${mode === 'add' ? 'cursor-crosshair' : ''}`}
                viewBox="0 0 1000 600"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`Interactive road map with ${world.nodes.length} locations and ${world.edges.length} roads`}
                onClick={handleMapClick}
                onPointerMove={handleMapPointerMove}
                onPointerUp={pauseDrag}
                onPointerLeave={pauseDrag}
              >
                <path d="M0 370 C160 315 180 250 330 275 S555 375 700 320 S875 285 1000 335" fill="none" stroke="#dceae3" strokeWidth="88" />
                <path d="M35 530 C175 480 205 390 330 365 S530 415 635 475 S855 490 970 430" fill="none" stroke="#e9efe9" strokeWidth="46" />
                <path d="M85 90 C230 175 305 185 410 110 S660 65 890 125" fill="none" stroke="#e9efe9" strokeWidth="38" />
                {world.edges.map((edge) => {
                  const from = nodeById.get(edge.from);
                  const to = nodeById.get(edge.to);
                  if (!from || !to) return null;
                  const active = selected?.kind === 'edge' && selected.id === edge.id;
                  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
                  return (
                    <g key={edge.id} onClick={(event) => { event.stopPropagation(); setSelected({ kind: 'edge', id: edge.id }); setNotice(''); }}>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="24" className="cursor-pointer" />
                      <line
                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke={active ? '#0f766e' : '#879c92'}
                        strokeWidth={active ? 5 : 3}
                        strokeDasharray={edge.status === 'blocked' ? '9 8' : undefined}
                        className="pointer-events-none"
                      />
                      <g className="pointer-events-none">
                        <rect x={midpoint.x - 25} y={midpoint.y - 12} width="50" height="22" rx="7" fill="#fff" stroke={active ? '#0f766e' : '#dbe4df'} />
                        <text x={midpoint.x} y={midpoint.y + 3} textAnchor="middle" fill="#52655c" fontSize="10" fontWeight="600">{Math.round(distanceKm(from, to))} km</text>
                      </g>
                    </g>
                  );
                })}
                {world.nodes.map((node) => {
                  const type = typeFor(node.type);
                  const active = selected?.kind === 'node' && selected.id === node.id;
                  const isConnectOrigin = connectFrom === node.id;
                  return (
                    <g
                      key={node.id}
                      className="map-node"
                      tabIndex="0"
                      role="button"
                      aria-label={`${node.name}, ${type.label}`}
                      onClick={(event) => selectNode(event, node)}
                      onPointerDown={(event) => {
                        if (mode === 'move') {
                          event.preventDefault();
                          event.stopPropagation();
                          setDraggingId(node.id);
                        }
                      }}
                    >
                      <circle cx={node.x} cy={node.y} r={active || isConnectOrigin ? 25 : 21} fill={type.color} opacity=".13" />
                      <circle cx={node.x} cy={node.y} r="15" fill="white" stroke={active || isConnectOrigin ? '#0f766e' : type.color} strokeWidth={active || isConnectOrigin ? 3 : 2} />
                      <circle cx={node.x} cy={node.y} r="10" fill={type.color} />
                      <text x={node.x} y={node.y + 3.5} textAnchor="middle" fill="white" fontSize="9" fontWeight="800">{type.icon}</text>
                      <text x={node.x} y={node.y + 34} textAnchor="middle" fill="#26382f" fontSize="12" fontWeight="700" stroke="white" strokeWidth="4" paintOrder="stroke">{node.name}</text>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-white/80 bg-white/90 px-3 py-2 text-[11px] text-slate-600 shadow-sm backdrop-blur">
                {NODE_TYPES.map((type) => <span key={type.id} className="flex items-center gap-1.5"><span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: type.color }}>{type.icon}</span>{type.label}</span>)}
                <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-slate-400" />Road</span>
              </div>
              {mode !== 'select' && (
                <div className="absolute right-3 top-3 rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow">
                  {mode === 'add' ? 'Click the map to place a location' : mode === 'connect' ? connectFrom ? 'Choose a second location' : 'Choose the first location' : 'Drag a location to reposition'}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Network inspector</p>
                  <h2 className="mt-1 text-lg font-bold">{selectedNode ? selectedNode.name : selectedEdge ? 'Road connection' : 'No selection'}</h2>
                </div>
                {selected && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">{selected.kind}</span>}
              </div>

              {selectedNode && (
                <div className="space-y-4">
                  <label className="block text-xs font-semibold text-slate-600">
                    Location name
                    <input
                      value={selectedNode.name}
                      onChange={(event) => updateNode(selectedNode.id, { name: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                      maxLength={32}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Location type
                    <select
                      value={selectedNode.type}
                      onChange={(event) => updateNode(selectedNode.id, { type: event.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    >
                      {NODE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div><p className="text-[11px] text-slate-400">Road links</p><p className="mt-1 text-sm font-bold">{world.edges.filter((edge) => edge.from === selectedNode.id || edge.to === selectedNode.id).length}</p></div>
                    <div><p className="text-[11px] text-slate-400">Map position</p><p className="mt-1 text-sm font-bold">{selectedNode.x}, {selectedNode.y}</p></div>
                  </div>
                  <button onClick={deleteSelected} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Delete location</button>
                </div>
              )}

              {selectedEdge && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold">{selectedRoadEndpoints[0]?.name} <span className="text-slate-400">↔</span> {selectedRoadEndpoints[1]?.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedRoadEndpoints[0] && selectedRoadEndpoints[1] ? distanceKm(selectedRoadEndpoints[0], selectedRoadEndpoints[1]) : 0} km estimated road length</p>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">Distance is estimated from map spacing. Moving either location updates this road length automatically.</p>
                  <button onClick={deleteSelected} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">Remove road</button>
                </div>
              )}

              {!selected && !newLocation && (
                <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
                  Select a location or road to inspect it. Use the map tools to add, connect, or reposition parts of your network.
                </div>
              )}

              {newLocation && (
                <form onSubmit={addLocation} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-600">
                    Location name
                    <input autoFocus value={newLocation.name} onChange={(event) => setNewLocation({ ...newLocation, name: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" maxLength={32} />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Location type
                    <select value={newLocation.type} onChange={(event) => setNewLocation({ ...newLocation, type: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600">
                      {NODE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={!newLocation.name.trim()} className="flex-1 rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">Add location</button>
                    <button type="button" onClick={() => setNewLocation(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                  </div>
                </form>
              )}

              {notice && <p role="status" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{notice}</p>}
              {errors.length > 0 && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">Network validation: {errors[0]}</p>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Fleet readiness</p><h2 className="mt-1 text-base font-bold">Available vehicles</h2></div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">↗</span>
              </div>
              {world.vehicles.map((vehicle) => {
                const definition = VEHICLE_DEFINITIONS.find(({ id }) => id === vehicle.definitionId);
                return <div key={vehicle.id} className="flex items-center justify-between border-t border-slate-100 py-3 first:border-0 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold">{definition?.name || vehicle.definitionId}</p><p className="text-xs text-slate-500">{vehicle.id} · {vehicle.condition}% condition</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700">{vehicle.status.replace('_', ' ')}</span></div>;
              })}
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">Cargo catalog ready: {CARGO.map(({ name }) => name).join(' · ')}.</p>
            </section>
          </aside>
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
          <span>Operations prototype · World data is configured for offline play</span>
          <span>{mapStats.locations} locations · {mapStats.roads} connections · {Math.round(mapStats.networkKm)} km of roads</span>
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p></div>;
}

function ToolButton({ active, onClick, children }) {
  return <button onClick={onClick} aria-pressed={active} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? 'border-emerald-800 bg-emerald-800 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{children}</button>;
}

export default App;
