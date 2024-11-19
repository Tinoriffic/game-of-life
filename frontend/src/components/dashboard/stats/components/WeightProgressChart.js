import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const WeightProgressChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.date),
    datasets: [
      {
        label: 'Weight',
        data: data.map(item => item.weight),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Weight Progress Over Time',
      },
    },
  };

  return <Line options={options} data={chartData} />;
};

export default WeightProgressChart;