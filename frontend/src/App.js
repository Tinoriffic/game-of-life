import axios from 'axios';
import React, { useState, useEffect } from 'react'
import MainMenu from './components/MainMenu';

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/endpoint');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data: ', error);
      }
    };

    fetchData();
  }, []); // The empty array means this effect will only run on mount and unmount

  return (
    <div>
      {/* <h1>Game of Life</h1>
      {data ? <p>{data.message}</p> : <p>Loading...</p>} */}
      <MainMenu />
    </div>
  );
}

export default App;
