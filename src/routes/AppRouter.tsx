import { BrowserRouter, Routes, Route } from 'react-router-dom';

const Dashboard = () => <h1>Dashboard</h1>;

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}