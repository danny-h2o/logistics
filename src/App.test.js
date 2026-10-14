import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the network map and starter locations', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /regional road network/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /northfield, supplier/i })).toBeInTheDocument();
  expect(screen.getByText(/available vehicles/i)).toBeInTheDocument();
});

test('adds a location to the map using the add tool', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '+ Location' }));
  fireEvent.click(screen.getByRole('img', { name: /interactive road map/i }), { clientX: 320, clientY: 260 });
  fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'Harbor Point' } });
  fireEvent.click(screen.getByRole('button', { name: /add location/i }));
  expect(screen.getByRole('button', { name: /harbor point, mixed use/i })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /7 locations and 7 roads/i })).toBeInTheDocument();
});

test('connects two locations and rejects duplicate roads', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /connect roads/i }));
  fireEvent.click(screen.getByRole('button', { name: /northfield, supplier/i }));
  fireEvent.click(screen.getByRole('button', { name: /pinecrest, customer/i }));
  expect(screen.getByText(/road connected: northfield to pinecrest/i)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /6 locations and 8 roads/i })).toBeInTheDocument();
});
