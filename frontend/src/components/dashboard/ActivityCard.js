import React from "react";

const ActivityCard = ({ title, image, onClick }) => {
    return (
        <div className="activity-card" onClick={onClick}>
            <img src={image} alt={title} className="activity-logo" />
            <h3>{title}</h3>
        </div>
    );
};

export default ActivityCard;