import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

const App = () => {
  const [topByVolume, setTopByVolume] = useState([]);
  const [topByVolatility, setTopByVolatility] = useState([]);
  const [topByPriceMove, setTopByPriceMove] = useState([]);

  useEffect(() => {
    socket.on('update', (data) => {
      setTopByVolume(data.topByVolume);
      setTopByVolatility(data.topByVolatility);
      setTopByPriceMove(data.topByPriceMove);
    });
  }, []);

  return (
    <div>
      <h1>Top Tokens</h1>
      <div>
        <h2>Top by Volume</h2>
        <ul>
          {topByVolume.map((token, index) => (
            <li key={index}>{token.name} - ${token.price}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Top by Volatility</h2>
        <ul>
          {topByVolatility.map((token, index) => (
            <li key={index}>{token.name} - ${token.price}</li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Top by Price Move</h2>
        <ul>
          {topByPriceMove.map((token, index) => (
            <li key={index}>{token.name} - ${token.price}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
