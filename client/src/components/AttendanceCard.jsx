import React from "react";

const AttendanceCard = ({
  icon,
  title,
  value,
  subtitle,
  color,
}) => {
  return (
    <div className={`stat-card ${color}`}>
      <div className="icon-circle">
        {icon}
      </div>

      <div className="card-details">
        <p className="card-title">{title}</p>

        <h2 className="card-value">
          {value}
        </h2>

        <small className={`card-subtitle ${color}-text`}>
          {subtitle}
        </small>
      </div>
    </div>
  );
};

export default AttendanceCard;