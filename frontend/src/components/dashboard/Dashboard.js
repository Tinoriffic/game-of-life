import React from "react";
import ActivityCard from "./ActivityCard";
import './styles.css'
import fitnessLogo from '../../assets/fitness-logo-1.png'
import dailyLogo from '../../assets/meditation-logo-1.png'
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const navigate = useNavigate();
    
    const activities = [
        { title: 'Fitness', image: fitnessLogo, path: '/workouts' },
        { title: 'Daily', image: dailyLogo, path: '/daily' },
    ];

    const navigateToActivity = (path) => {
        navigate(path);
    };

    return (
        <div className="dashboard">
            {activities.map((activity) => (
                <ActivityCard
                key={activity.title}
                title={activity.title}
                image={activity.image}
                onClick={() => navigateToActivity(activity.path)}
            />
            ))}
        </div>
    );
};

export default Dashboard;