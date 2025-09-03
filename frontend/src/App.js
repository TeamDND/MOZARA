import './App.css';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './page/MainLayout';
import SignUp from './user/SignUp';
function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </>
  );
}

export default App;
