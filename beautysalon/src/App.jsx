// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Book from './pages/Book';
import Success from './pages/Success';
import Admin from './pages/Admin';
import SignIn from './pages/SignIn';
import RequireAdmin from './components/RequireAdmin';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/book" element={<Book />} />
          <Route path="/success" element={<Success />} />

          <Route path="/signin" element={<SignIn />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            }
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
