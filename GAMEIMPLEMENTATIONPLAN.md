# Logistics Game — Game Implementation Plan (GIP)

**Document type:** Implementation specification for a coding AI  
**Status:** Draft 0.2  
**Primary objective:** Build a playable logistics-management game in which the player acts as the dispatch algorithm: creating a transportation network, assigning shipments, responding to disruptions, earning money, expanding a fleet, and gradually automating operations.

---

## 0. Instructions for the Coding AI

Treat this document as the implementation contract. Implement a working game, not a static mockup or a collection of disconnected UI screens.

### Required workflow

1. **Inspect the existing repository first.** Read the package manifest, source structure, README, and existing components. Identify the current framework and run the project and tests before changing anything.
2. **Preserve an existing working stack.** If the repository is already a React application, extend it rather than replacing it. If no application exists, use Vite + React + TypeScript.
3. **Implement in milestones.** Complete one milestone at a time, verify its acceptance criteria, and only then continue. Do not attempt every future feature in one giant rewrite.
4. **Keep the game runnable after each milestone.** Do not leave the application in a broken intermediate state. Run the build and relevant tests after meaningful changes.
5. **Write real functionality.** Every visible button, toggle, map control, and menu item must work. Do not use placeholder alerts, decorative controls, TODO-only implementations, or simulated success messages for unimplemented systems.
6. **Keep game logic separate from presentation.** Simulation, pathfinding, economy, and cargo rules should be testable without rendering React components.
7. **Use typed, data-driven definitions.** Vehicle classes, goods, weather, contracts, and achievements should be defined in configuration/data files instead of duplicated throughout UI components.
8. **Avoid premature complexity.** Do not add multiplayer, accounts, a backend, real-world map APIs, detailed traffic physics, or a large state-management library unless a later requirement justifies it.
9. **Explain changes at the end of each milestone.** Report files changed, working features, tests/build commands run and their results, known limitations, and the next milestone. Do not claim tests passed unless they were actually run.
10. **Make sensible decisions when details are unspecified.** Put balancing values in configuration and document the choices. Do not stop implementation to ask about minor details.

### Default technical approach

- **Client:** React + TypeScript.
- **Build tooling:** Preserve the repository's existing tooling; otherwise use Vite.
- **Rendering:** SVG-based interactive map for the first version. Use normal React/CSS for panels and overlays.
- **State:** React reducer/context or the state mechanism already present in the repository. Do not introduce a state library without need.
- **Persistence:** `localStorage` for the single-player prototype, with schema versioning and safe load/reset behavior.
- **Tests:** Use the repository's existing test framework. If none exists, add a lightweight test setup appropriate to the current stack.
- **External services:** None required for the MVP. Use a fictional, self-contained map; do not require API keys or internet access to play.

If the repository is not React-based, first assess whether it already has a credible implementation. Preserve existing project decisions unless there is a clear technical reason to change them.

---

## 1. Product Summary

The player operates a logistics network. Contracts request that goods move between locations by a deadline. The player chooses vehicles and routes, pays operating costs, handles disruptions, collects revenue, and reinvests in the network.

The distinctive long-term mechanic is automation. Early in the game, the player dispatches shipments manually. Later, they create recurring routes and decision rules, effectively programming an algorithm that handles routine logistics automatically.

### Design pillars

1. **Meaningful trade-offs:** No vehicle or route should be the best choice in every situation.
2. **Readable simulation:** Players can understand where goods are, where delays come from, and why money was earned or lost.
3. **Planning over clicking:** Good routes, schedules, and rules should outperform constant micromanagement.
4. **Recoverable mistakes:** Bad decisions have costs, but the MVP should not trap the player in an unwinnable state.
5. **Visible progression:** Start with a small fleet and simple roads; expand into hubs, specialized vehicles, automation, and eventually multimodal logistics.

### The core gameplay loop

1. Review available shipment contracts.
2. Choose a contract and inspect origin, destination, cargo, deadline, payout, and risks.
3. Select a suitable vehicle and route strategy.
4. Dispatch the shipment.
5. Advance simulation time and observe vehicles moving on the map.
6. Respond to delays, weather, breakdowns, or cargo deterioration.
7. Receive delivery revenue, pay costs, and review the result.
8. Buy vehicles, improve the network, or automate repeated work.
9. Repeat with more complex contracts and a larger network.

---

## 2. Scope and Non-Goals

### MVP: must be playable end to end

- One fictional regional map.
- Interactive map with location nodes and road connections.
- Create, move, inspect, connect, and delete map nodes/connections.
- A working simulation clock with pause and speed controls.
- A small contract board with recurring shipment offers.
- Four cargo types: grain, fresh produce, medicine, and electronics.
- At least three road vehicle classes: delivery van, standard truck, refrigerated truck.
- Vehicle capacity, speed, operating cost, and cargo compatibility rules.
- Pathfinding between connected nodes.
- Manual shipment dispatch and vehicle movement.
- Deadlines, revenue, operating expenses, basic delivery quality, and late penalties.
- At least several environmental or mechanical incidents, with understandable player responses.
- Vehicle purchasing and basic fleet management.
- Save/load through `localStorage`, plus a reset-save option.
- A usable interface with clear status, costs, and failure explanations.

### Post-MVP roadmap

- Recurring scheduled routes and rule-based dispatch automation.
- Achievements and cargo/weather completion tracking.
- Warehouses and transfer handling.
- Rail, ships, aircraft, and drones.
- Multimodal route planning and transfers.
- Outsourcing contracts to third-party companies.
- Competitor simulation and company acquisitions.
- Forecasting, research, infrastructure upgrades, dynamic demand, and expanded regions.

### Explicit non-goals for MVP

- Multiplayer or online accounts.
- Real-world mapping services, GPS, or real geographic accuracy.
- Detailed vehicle physics or realistic road traffic simulation.
- A full financial accounting simulator.
- Real-time player-versus-player competition.
- A complex market simulation with independently simulated companies.
- Mafia or criminal organizations as a required gameplay system; generic theft or cargo-loss events are sufficient for the prototype.

---

## 3. MVP Game Rules

All initial values are **tuning defaults**, not immutable design decisions. Centralize them so that balancing does not require code changes across multiple components.

### 3.1 World and map

The world is a fictional regional network rendered in SVG. A map consists of nodes and edges:

- **Node:** A location that has an ID, name, type, map position, and optional facilities.
- **Edge:** A road connection between two nodes with a distance, status, and optional toll or condition modifier.
- **Node types:** Supplier, customer, warehouse/hub, and mixed-use location.
- **MVP transport mode:** Road only. Every edge is a road connection; future versions add mode-specific infrastructure.
- **Connectivity:** Vehicles can only use connected roads. If no valid path exists, dispatch must be blocked with an explanation.
- **Editing:** Players can add nodes, move nodes, connect two nodes, edit names/types, and delete nodes or roads. Deletion must handle references safely and must not silently destroy active shipment state.

Use normalized coordinates or a well-defined map coordinate system so that the map behaves consistently at different screen sizes. If the map uses normalized coordinates, convert to screen coordinates only for rendering.

For player-created connections, estimate distance from node positions using a centralized map-scale constant or request/set the distance through an editable field. Do not mix SVG pixels directly into economy calculations without a documented conversion.

The initial scenario should be authored with useful starter locations and connections so a new player can begin delivering immediately. The player should also be able to edit and expand this network.

### 3.2 Simulation clock

Provide:

- Pause.
- Normal speed (1x).
- Fast-forward (2x).
- Fast-forward (4x).

Simulation advances in fixed in-game time increments. Start with a simple fixed-step simulation; do not depend on a perfectly accurate wall clock. UI updates should not create duplicate timers. Stop or clean up timers correctly when a component unmounts.

Simulation logic should be implemented as pure or mostly pure functions, for example:

```ts
advanceSimulation(state, elapsedGameMinutes) -> nextState
```

The UI timer calls the simulation function and renders the returned state. The simulation must be deterministic when given the same state, elapsed time, and random seed/event sequence. A seeded random number generator or injectable random source is recommended for incidents and unit tests.

### 3.3 Goods

Create data-driven cargo definitions with fields similar to:

```ts
type CargoTypeId = "grain" | "produce" | "medicine" | "electronics";

interface CargoDefinition {
  id: CargoTypeId;
  name: string;
  baseValue: number;
  weightPerUnit: number;
  volumePerUnit: number;
  perishability: number;       // 0 = stable; larger = deteriorates faster
  refrigerationPreferred: boolean;
  fragile: boolean;
  theftRisk: number;
  description: string;
}
```

Initial behaviors:

- **Grain:** Heavy/bulky, low value per unit, stable over time; favors vehicles with capacity.
- **Fresh produce:** Moderate value and high perishability; refrigeration reduces quality loss.
- **Medicine:** High value and deadline-sensitive; late delivery produces a notable payout/reputation penalty. Temperature requirements can be added through data fields without inventing a one-off special case.
- **Electronics:** High value per unit and higher theft/fragility consequences; secure handling can be added in a later iteration.

The player should see cargo requirements before accepting or dispatching a contract. A mismatch should trigger a clear warning, not hidden behavior.

### 3.4 Vehicles

Create data-driven vehicle definitions and individual owned vehicle instances. Suggested fields:

```ts
interface VehicleDefinition {
  id: string;
  name: string;
  purchaseCost: number;
  capacityUnits: number;
  maxSpeedKph: number;
  operatingCostPerKm: number;
  reliability: number;          // documented range, e.g. 0..1
  refrigerated: boolean;
  allowedCargoTags: string[];
}

interface VehicleInstance {
  id: string;
  definitionId: string;
  status: "idle" | "in_transit" | "maintenance";
  currentNodeId: string | null;
  activeShipmentId: string | null;
  condition: number;             // e.g. 0..100
}
```

Suggested initial classes:

- **Delivery van:** Cheap and fast for small loads; limited capacity.
- **Standard truck:** Higher capacity and moderate speed/cost; general-purpose workhorse.
- **Refrigerated truck:** Specialized and more expensive; slows or prevents spoilage for suitable cargo.

Start the player with a modest fleet and enough cash to make a few meaningful choices. The starting scenario must not require a refrigerated truck before the player has any reasonable way to acquire or access one.

Requirements:

- A vehicle can carry only one active shipment in the MVP.
- Do not permit dispatch if the vehicle is already busy, in maintenance, or insufficient for the shipment's quantity/requirements.
- Do not permit a purchase if funds are insufficient.
- Purchase cost is paid immediately. Operating costs are accounted for transparently during or after a trip.
- Vehicle condition can decline through use and incidents. Keep maintenance simple in the MVP; do not build a detailed parts simulation.

### 3.5 Contracts and shipments

Keep contract offers distinct from shipments that have already been accepted.

Possible model:

```ts
type ShipmentStatus =
  | "offered"
  | "accepted"
  | "in_transit"
  | "delivered"
  | "failed"
  | "cancelled";

interface Contract {
  id: string;
  originNodeId: string;
  destinationNodeId: string;
  cargoTypeId: CargoTypeId;
  quantity: number;
  payout: number;
  deadlineGameMinute: number;
  accepted: boolean;
}

interface Shipment {
  id: string;
  contractId: string;
  status: ShipmentStatus;
  vehicleId: string | null;
  plannedNodeIds: string[];
  plannedEdgeIds: string[];
  currentEdgeIndex: number;
  remainingEdgeMinutes: number;
  quality: number;              // 0..1 or 0..100; use one convention consistently
  deliveredAtGameMinute: number | null;
  operatingCostAccrued: number;
}
```

Adjust the exact types to suit the existing codebase, but preserve the separation of offer, accepted job, and active trip. Do not use a single loosely typed object to represent every phase of a contract.

Contract board requirements:

- Show origin, destination, cargo, quantity, payout, deadline, and key cargo requirements.
- Offer a mixture of simple contracts and contracts that make the player consider capacity, speed, or refrigeration.
- Replenish offers over game time, with a maximum board size.
- Generate valid origin/destination pairs only from appropriate nodes and do not create impossible contracts silently.
- Provide a clear way to accept or decline an offer.
- Accepted contracts can be dispatched later if that makes sense, but the UI must show when the deadline is approaching.

### 3.6 Route finding and dispatch

Implement a graph pathfinding module independent of React. Use Dijkstra's algorithm or another appropriate algorithm for non-negative edge weights.

Support at least two route preferences:

- **Fastest:** Minimize estimated travel time for the selected vehicle and current known conditions.
- **Cheapest:** Minimize expected travel cost, including operating cost and tolls where applicable.

For the MVP, do not build a complex global transport optimizer. Find a route for the selected vehicle between the shipment's origin and destination, then show the route before dispatch.

Dispatch flow:

1. Player selects an accepted contract.
2. UI lists eligible idle vehicles and explains ineligible vehicles.
3. Player chooses a vehicle and a route preference.
4. Game calculates a route and estimates duration and cost.
5. Player confirms dispatch.
6. The vehicle becomes busy, the shipment becomes in transit, and the route is highlighted on the map.
7. Simulation advances the trip edge by edge.
8. Delivery or failure resolves the contract, releases the vehicle when appropriate, and updates money/history/reputation.

Block dispatch if origin/destination is missing, the graph is disconnected, capacity is insufficient, or vehicle restrictions are violated. Display a useful reason beside the disabled action.

### 3.7 Movement and travel time

Travel should be visually clear but does not need physics simulation.

- Each active shipment follows an ordered list of nodes/edges.
- Travel duration is calculated from edge distance, vehicle speed, and current modifiers.
- Vehicles visibly move along the current SVG edge as progress changes.
- Reaching an edge's end advances the trip to the next edge.
- Reaching the destination resolves the shipment.
- Missing edges caused by map edits must be handled safely. Active routes should be rerouted or the player should be shown a blocked-trip recovery option; never crash the simulation.

Use one clearly documented unit convention. Store simulation time in game minutes; convert to hours only for calculations/display.

### 3.8 Weather and incidents

Implement a small first set of world conditions and incidents. Keep each rule understandable and configurable.

Suggested MVP weather: clear, rain, snow, and heat wave. Global weather is acceptable in the first version; regional weather is a later feature.

Examples:

- Rain: reduces road speed and increases incident risk slightly.
- Snow: reduces road speed more substantially and may make certain connections temporarily unavailable in a future iteration.
- Heat wave: increases deterioration for vulnerable cargo and increases refrigeration operating cost.
- Breakdown: pauses a vehicle until repaired or recovered.
- Accident/road blockage: delays a route or marks an edge temporarily unavailable.
- Theft or cargo damage: reduces cargo quality/value, with risk influenced by cargo and conditions.

Requirements:

- Events must be visible and explain their effects.
- Random failures should be uncommon enough not to make ordinary planning feel pointless.
- A player response should exist for important incidents: wait, repair, reroute, or pay for recovery.
- A route should not change silently. If the game reroutes automatically, explain why and display the new route.
- Weather and incidents must be testable without waiting for rare random outcomes; tests should inject a known event or seed.

Do not implement all incident types at once. Complete a reliable travel loop first, then add one event at a time.

### 3.9 Cargo quality and delivery outcome

Quality should degrade gradually where applicable, rather than every perishable load instantly becoming worthless at one arbitrary threshold.

For example:

- Produce loses quality over time; refrigeration substantially slows the loss.
- Medicine receives a clear penalty for late arrival or a defined temperature breach when that rule is added.
- Electronics may lose quality/value after damage or theft events.
- Grain has little ordinary time-based deterioration during a short MVP trip.

At delivery, calculate the result through one centralized function. Show a breakdown in the shipment report:

- Base contract payout.
- On-time/late modifier.
- Cargo-quality modifier.
- Operating cost.
- Incident/repair cost, if any.
- Net profit or loss.

Do not spread payout arithmetic across multiple UI components. The same input state must produce the same result.

Suggested simple formula (tune centrally):

```text
net result = earned payout - operating costs - repairs - penalties
```

The exact payout calculation should be implemented and unit-tested in one economy module. Display estimates before dispatch and actuals after resolution.

### 3.10 Economy and progression

Track at minimum:

- Available cash.
- Vehicle purchase expenses.
- Operating expenses.
- Revenue per completed shipment.
- Net result per shipment.
- Delivered, late, failed, and active shipment counts.

The game should make clear that revenue is not the same as profit. Vehicle purchases have immediate cost; operating costs are charged consistently; contract payouts are earned on completion.

Add a fleet purchase panel showing price, capacity, speed, cost, and special equipment. Affordability and purchase results must update immediately.

Avoid irreversible bankruptcy in the MVP. If cash is low, the player should still be able to decline contracts, pause the simulation, and make a recovery plan. A loan/bankruptcy system is outside initial scope.

---

## 4. Interface Requirements

Build a complete management interface rather than a landing page. Layout can adapt to viewport size, but the map and active operation information must remain easy to inspect.

### Primary screen layout

1. **Top bar:** Company cash, simulation time, speed controls, pause, delivered/active counts, settings/save indicator.
2. **Central map:** Nodes, road edges, moving vehicles, active route highlighting, selection, zoom/pan if practical.
3. **Side panel or tabbed inspector:** Contextual information for selected node, road, vehicle, contract, or shipment.
4. **Contracts panel:** Available work, payout, deadline, cargo requirements, accept/decline controls.
5. **Fleet panel:** Owned vehicles, status, condition, current job, purchase options.
6. **Event feed:** Recent deliveries, incidents, expenses, deadline warnings, and automation messages when implemented.

### Map interactions

- Click a node to select it and inspect it.
- Add-node mode creates a node at the clicked position and prompts for a name/type.
- Connect mode lets the player choose two nodes to create a road.
- Move mode supports dragging nodes; graph distances must be updated according to the chosen distance policy.
- Delete actions require confirmation if active contracts or routes reference the item.
- Click a vehicle or active shipment to highlight its route and show progress/ETA.
- The map must differentiate selected paths, normal roads, blocked roads, and vehicle markers.
- Use labels, legends, and icon shapes in addition to color, so the interface remains understandable for color-blind users.

### General UX rules

- Every disabled button should have a visible explanation of why it is disabled.
- Confirm destructive actions such as deleting the current save or removing a node with dependencies.
- Use empty states and error messages that explain the next available action.
- Avoid modal dialogs for routine operations when a side panel will work.
- Keep the simulation pausable so players can plan without time pressure.
- Ensure useful behavior at normal desktop browser widths; prevent panels from covering the map on smaller windows.
- Do not require external map tiles, external imagery, or network access.

---

## 5. Suggested Code Organization

Follow existing conventions if the project already has a structure. Otherwise, use a structure similar to this:

```text
src/
  app/
    App.tsx
    layout/
  components/
    TopBar.tsx
    GameMap.tsx
    MapNode.tsx
    MapEdge.tsx
    VehicleMarker.tsx
    ContractBoard.tsx
    FleetPanel.tsx
    SelectionInspector.tsx
    EventFeed.tsx
    SimulationControls.tsx
    ConfirmDialog.tsx
  data/
    cargoDefinitions.ts
    vehicleDefinitions.ts
    startingScenario.ts
    balance.ts
    achievements.ts             # later milestone
  domain/
    types.ts
    ids.ts
  simulation/
    advanceSimulation.ts
    pathfinding.ts
    travel.ts
    cargoQuality.ts
    economy.ts
    contractGeneration.ts
    incidents.ts
    validation.ts
  state/
    gameReducer.ts
    initialGameState.ts
    persistence.ts
  styles/
    global.css
    map.css
  tests/
    pathfinding.test.ts
    economy.test.ts
    simulation.test.ts
    persistence.test.ts
```

The folder and filename choices are examples, not mandates. Avoid creating a separate file for every trivial expression; keep related game rules cohesive.

### Architecture rules

- React components render state and send player actions; they do not calculate contract profit or independently mutate simulation entities.
- Keep IDs stable and unique. Never rely on array indexes as entity identity.
- Prefer immutable state transitions, with a reducer or pure update functions.
- Centralize validation for operations such as dispatch, purchases, and deletion.
- Keep all economy values in one documented currency unit. Format them consistently in the UI.
- Store game time as a numeric game-minute counter, with a single display formatter.
- Keep simulation functions independent of DOM, React, browser storage, and UI components.
- Keep storage serialization separate from game rules.
- Use a save schema version and handle invalid/old saves gracefully.
- Avoid unnecessary dependencies; justify each new dependency by a concrete feature.

---

## 6. Implementation Milestones

Complete these in order. Each milestone is a working increment. The coding AI may refine file boundaries, but must preserve the outcomes and acceptance criteria.

### Milestone 0 — Repository audit and runnable baseline

**Tasks**

- Inspect the repository and determine the framework, entry points, scripts, and existing tests.
- Run the current app and build/test commands.
- Document the existing architecture briefly.
- Establish a minimal game screen and baseline styling only if needed.
- Add or verify a reliable development/build command.

**Acceptance criteria**

- The project starts using documented commands.
- The build succeeds.
- Existing functionality has not been discarded without a specific reason.
- The implementation plan is reflected in a short `README.md` or developer note.

### Milestone 1 — Domain data and starter world

**Tasks**

- Define typed models for map nodes/edges, cargo, vehicles, contracts, shipments, incidents, and game state.
- Add centralized balance/configuration values.
- Create a starter scenario containing a small connected road network, suppliers, customers, and a hub.
- Define the four MVP cargo types and three vehicle classes.
- Add state validation for duplicate IDs, invalid endpoints, and invalid entity references.

**Acceptance criteria**

- Starter state loads without runtime errors.
- All referenced node IDs and edge endpoints are valid.
- Cargo/vehicle data can be changed in configuration without editing UI logic.
- Unit tests cover basic scenario validation.

### Milestone 2 — Interactive map editor

**Tasks**

- Render the graph using SVG.
- Draw roads between nodes and display node markers/labels.
- Implement node selection and contextual inspection.
- Implement add, move, rename, connect, and delete actions.
- Show a clear mode indicator for adding nodes or connecting roads.
- Validate connections and safely handle deletion dependencies.
- Make the map responsive to viewport size.

**Acceptance criteria**

- A player can create a new node and connect it to the graph without refreshing.
- A player can move nodes and see the map update.
- Invalid connections and deletions are rejected or confirmed with a clear explanation.
- The map remains usable at the target desktop viewport and contains no essential placeholder controls.

### Milestone 3 — Graph pathfinding and travel estimates

**Tasks**

- Implement shortest-time pathfinding for a selected vehicle.
- Implement cheapest-path selection using operating cost and applicable tolls.
- Return the ordered node and edge path, estimated travel time, and estimated cost.
- Handle missing nodes, disconnected graphs, blocked roads, and same-node origin/destination cases.
- Add map highlighting for a proposed route.

**Acceptance criteria**

- Tests verify known shortest-time and cheapest paths on small sample graphs.
- The route estimate changes when a vehicle's speed or operating cost changes.
- No-path conditions are represented as a normal result, not an exception that crashes the app.
- Proposed routes can be inspected before dispatch.

### Milestone 4 — Simulation clock and moving vehicles

**Tasks**

- Add pause, 1x, 2x, and 4x controls.
- Implement fixed-step simulation advancement.
- Implement shipment progress edge by edge.
- Animate vehicle markers along the current edge based on simulated progress.
- Track vehicle availability and release vehicles after trip completion or recovery.
- Prevent duplicate simulation timers and clean up timers correctly.

**Acceptance criteria**

- A dispatched test trip advances without manual UI refreshes.
- Pausing stops game time; speed controls change simulation progression predictably.
- A vehicle traverses its planned edges in order and arrives at the intended destination.
- Reaching a destination releases the vehicle and does not deliver the same shipment twice.
- Simulation logic can be tested without rendering the map.

### Milestone 5 — Contracts, dispatch, and economy

**Tasks**

- Implement a contract board and an initial batch of offers.
- Generate additional valid offers over simulation time, respecting a board-size limit.
- Add accept/decline behavior.
- Add vehicle eligibility and dispatch validation.
- Add a dispatch flow with vehicle selection, route preference, estimate, and confirmation.
- Implement payouts, operating expenses, late penalties, and a shipment-result breakdown.
- Add fleet purchasing with affordability checks.
- Add a basic dashboard with cash, active shipments, delivered shipments, and net results.

**Acceptance criteria**

- A player can accept a contract, choose an eligible vehicle, dispatch it, and deliver it.
- Cash changes for the correct reasons and matches the displayed result breakdown.
- A player cannot dispatch an unavailable or unsuitable vehicle.
- A player cannot purchase a vehicle without sufficient funds.
- Contract and shipment records move through valid lifecycle states.
- Economy formula tests cover on-time delivery, late delivery, costs, and failed delivery.

### Milestone 6 — Cargo quality, weather, and incidents

**Tasks**

- Track cargo quality consistently.
- Apply perishable-cargo deterioration as simulation time advances.
- Reduce produce deterioration when a refrigerated vehicle is used.
- Add clear, rain, snow, and heat-wave conditions with configurable effects.
- Add at least two incident types, such as a breakdown and a road/traffic disruption.
- Add incident notices and player responses: wait, repair/recover, or reroute where supported.
- Include the incident and cargo-quality effects in delivery accounting.

**Acceptance criteria**

- A longer trip has the expected effect on perishable cargo quality.
- Refrigeration changes the quality outcome in the expected direction.
- Weather modifiers visibly and measurably affect travel or cargo.
- Incident outcomes are reproducible in tests through a seeded/injected event source.
- The player can understand and respond to an incident without reading console output.
- A disruption does not corrupt the active shipment or leave a vehicle permanently busy unless that is an intentional, visible state.

### Milestone 7 — Persistence and playability pass

**Tasks**

- Save relevant game state to `localStorage`.
- Add save schema versioning and validation.
- Load valid saves at startup.
- Recover gracefully from malformed/incompatible saves.
- Add a reset/new-game flow with confirmation.
- Review the tutorial/onboarding and empty states.
- Balance starting cash, contract payouts, travel times, vehicle costs, and incident frequency.

**Acceptance criteria**

- Refreshing the page preserves the game and active operations.
- A malformed save does not crash the app; the user receives a clear recovery choice.
- Resetting the save works only after confirmation.
- A new player can complete a delivery without prior explanation from the developer.
- At least three different viable decisions can be observed: fastest route, cheapest route, and a cargo/vehicle specialization choice.

### MVP exit gate

Do not begin the broader feature roadmap until all of the following are true:

- A new player can start, understand the map, accept a contract, dispatch a vehicle, advance time, and complete a delivery.
- The player sees a transparent payout/cost breakdown.
- At least one cargo property and one environmental/mechanical disruption materially change decisions.
- The fleet can be expanded through in-game earnings.
- Save/load works.
- Core logic has automated tests and the production build succeeds.
- There are no known critical blockers in the core loop.

### Milestone 8 — Achievements and delivery history

**Tasks**

- Record a compact delivery-history entry for each resolved shipment: cargo type, weather, vehicle class, result, and relevant tags.
- Add achievements driven from history/state rather than fragile UI event flags.
- Implement initial achievements: deliver every cargo type; deliver in each weather condition; complete cargo/weather combinations; own an all-electric fleet when electric vehicles exist; complete deliveries without spoilage.
- Add an achievement screen with progress and completion state.

**Acceptance criteria**

- Achievements unlock only when their stated conditions are true.
- Progress survives a reload.
- Replaying or loading a save does not double-count deliveries.
- Combination achievements show the missing combinations, not just a percentage.
- Achievements are data-driven so new goals can be added without rewriting the screen.

### Milestone 9 — Recurring routes and basic automation

**Tasks**

- Let the player save a recurring route/service between locations.
- Define schedule, eligible vehicle class, and cargo limits.
- Automatically dispatch suitable contracts when the service and an eligible idle vehicle are available.
- Add a small rule system for priority, route preference, and outsourcing fallback (outsourcing can initially remain disabled until implemented).
- Log automation decisions and explain why each action was chosen or skipped.
- Add on/off controls and prevent an automation loop from repeatedly accepting or dispatching the same work.

**Acceptance criteria**

- A recurring service dispatches eligible shipments under its configured rules.
- It skips unsuitable work with a human-readable reason.
- Player can pause or disable the service.
- Manual and automated dispatch share the same validation and economy code.
- Automation can be tested deterministically.

### Milestone 10 — Additional transport modes

**Tasks**

- Add mode-specific edges and facilities for rail, water, and air.
- Add matching vehicle classes and capability rules.
- Add transfer nodes and shipment legs so a shipment can move across multiple modes.
- Add transfer handling time/cost and missed-connection risks where appropriate.
- Extend route planning to find feasible multimodal paths without breaking road-only routes.

**Acceptance criteria**

- A shipment can complete a valid multi-leg journey using at least two transport modes.
- Incompatible transport/edge combinations are rejected.
- Transfer time and costs appear in estimates and results.
- Legacy road-only saves remain loadable or are migrated safely.

### Milestone 11 — Outsourcing, competitors, and acquisitions

**Tasks**

- Create data-driven third-party carrier offers with a quote, estimated arrival, cost, and capability limits.
- Allow the player to outsource individual eligible contracts.
- Introduce competitors only after outsourcing works as a self-contained feature.
- Add acquisition offers showing purchase price, fleet/assets, facilities, and ongoing liabilities.
- Merge purchased assets with unique IDs and preserve existing player assets.

**Acceptance criteria**

- Outsourcing is a real trade-off between margin, capability, and reliability.
- The quote is shown before confirmation.
- Acquisitions require sufficient funds and create visible assets/operating costs.
- Acquiring a company cannot produce duplicate IDs or invalid references.

### Later optional milestone — Network analysis and advanced strategy

Only implement these after the core game is fun and stable:

- Bottleneck/network debugger that explains congestion, repeated delays, high costs, and single points of failure.
- Weather forecasts with uncertainty and contingency planning.
- Dynamic regional demand and seasonal contracts.
- Research and infrastructure upgrades.
- Dedicated warehouses, cold storage, charging stations, and maintenance hubs.
- Regional expansion and larger maps.

---

## 7. Testing Strategy

Tests should validate game rules, not implementation details of React components.

### Pathfinding tests

- Finds a valid path when one exists.
- Returns no path when the graph is disconnected.
- Chooses the fastest route for a fast vehicle.
- Chooses the cheaper route for a cost-sensitive vehicle when appropriate.
- Never uses a blocked or incompatible edge.
- Handles deleted/missing node references without crashing.

### Simulation tests

- A trip progresses from one edge to the next.
- A completed trip resolves once and releases its vehicle.
- Pause means no time advancement.
- Increasing simulation speed advances more game time per real-time interval.
- A stale route after an edit is safely rerouted or surfaced as blocked.
- Incident handling preserves valid references and expected vehicle/shipment status.

### Economy tests

- Vehicle purchase reduces cash by the configured price.
- Purchase is rejected with insufficient funds.
- Dispatch costs are charged exactly once according to the defined cost model.
- Delivery payout reflects lateness and cargo quality.
- Final result breakdown sums to the actual cash change.
- Revenue, costs, and net profit are not conflated.

### Cargo/weather tests

- Stable goods do not deteriorate unexpectedly during an ordinary short trip.
- Perishable cargo deteriorates according to the configured rule.
- Refrigeration reduces spoilage for cargo that benefits from it.
- Weather modifiers affect the intended systems.
- Tests can create specific incidents without waiting for random probability.

### Persistence tests

- Valid state saves and restores correctly.
- Invalid JSON or incompatible schema is handled safely.
- Reset clears the active save after confirmation.
- Entities retain unique IDs and valid references after load.

### End-to-end smoke test

1. Start a new game.
2. Select an available contract.
3. Accept it.
4. Select a compatible idle vehicle.
5. Preview and confirm a route.
6. Advance simulation time.
7. Verify that the vehicle moves and the shipment arrives.
8. Verify cash, delivery count, and event feed.
9. Refresh the browser.
10. Verify the game state persists and remains playable.

---

## 8. Quality, Accessibility, and Failure Handling

- Use semantic labels for controls; buttons should have meaningful text or accessible labels.
- Do not rely on color alone to communicate selected, delayed, blocked, or successful status.
- Avoid unbounded event logs; cap history or provide pagination/clear behavior.
- Guard all user-triggered state changes with validation.
- Show user-friendly errors for invalid actions; reserve console output for developer diagnostics.
- Ensure one failed or stale entity reference does not crash the whole simulation.
- Use stable IDs and predictable serialization.
- Avoid hidden randomness in calculations that are expected to be deterministic, such as a quoted route cost.
- Keep UI estimates and actual result calculations aligned; if conditions change in transit, show why actuals differ.
- Prefer small composable functions over one large simulation component.
- Keep performance reasonable for hundreds of nodes/edges, but do not prematurely optimize for thousands of vehicles in the MVP.

---

## 9. Definition of Done for Every Milestone

A milestone is not complete until all applicable items are true:

- The feature works in the running application.
- The UI explains the feature and its current state.
- Success, invalid input, and failure paths are handled.
- Core rules are implemented outside presentation components.
- Relevant automated tests pass.
- The project build succeeds.
- No placeholder control is presented as functional.
- Save/load has been considered for any state that must persist.
- README or developer notes are updated if setup or behavior changed.
- The coding AI reports what is complete, what remains, and any limitations honestly.

---

## 10. Immediate Next Actions for the Coding AI

Start with **Milestone 0**, not the entire roadmap.

1. Inspect the existing repository and run its current application/build/tests.
2. Identify the current entry point, CSS setup, and any existing UI or game logic.
3. Preserve existing project conventions where sensible.
4. Implement or validate the typed domain model and the initial scenario from Milestone 1.
5. Build and test before moving to the interactive SVG map.
6. Proceed sequentially through Milestones 2–7 to reach the first complete MVP.
7. Stop at the MVP exit gate and report the results before beginning advanced systems.

### Final product test

The MVP is successful when a player can look at a network, make a shipment plan, dispatch a vehicle, watch it move, handle at least one meaningful risk, see the exact financial outcome, and use the earnings to improve the operation. The game should feel like designing and running a logistics algorithm—not merely clicking through a business dashboard.
