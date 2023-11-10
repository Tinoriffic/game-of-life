import axios from 'axios';
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import MainMenu from './components/MainMenu';
import ActionLogger from './components/ActionLogger';

function App() {
  // const [data, setData] = useState(null);

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       const response = await axios.get('http://localhost:8000/endpoint');
  //       setData(response.data);
  //     } catch (error) {
  //       console.error('Error fetching data: ', error);
  //     }
  //   };

  //   fetchData();
  // }, []); // The empty array means this effect will only run on mount and unmount

  return (
    <Router>
      <header className="main-header">
        <h1>Game of Life</h1>
      </header>
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li>Skill Tree</li>
          <li>Milestones</li>
          <li><Link to="/log-actions">Action Logger</Link></li>
        </ul>
      </nav>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        {/* Define the route for ActionLogger */}
        <Route path="/log-actions" element={<ActionLogger />} />
        {/* Define other routes */}
      </Routes>
    </Router>
  );
}

export default App;
