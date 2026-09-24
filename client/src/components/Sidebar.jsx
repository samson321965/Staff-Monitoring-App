import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";
import {
FaTachometerAlt,
FaUsers,
FaClipboardCheck,
FaCalendarAlt,
FaChartBar,
FaCog,
FaSignOutAlt
} from "react-icons/fa";

import logo from "../assets/images/logo.png";

function Sidebar() {
  const navigate = useNavigate();
    const [backgroundImage, setBackgroundImage] = useState(() =>
        localStorage.getItem("sidebar-background") || ""
    );

    useEffect(() => {
        const refreshBackground = () => {
            setBackgroundImage(localStorage.getItem("sidebar-background") || "");
        };

        window.addEventListener("sidebar-background-changed", refreshBackground);
        return () => window.removeEventListener("sidebar-background-changed", refreshBackground);
    }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

return (

<div
    className={`sidebar ${backgroundImage ? "has-background-image" : ""}`}
    style={backgroundImage ? { "--sidebar-background-image": `url(${backgroundImage})` } : undefined}
>

    {/* Logo */}
    <div className="sidebar-logo">
        <img src={logo} alt="Staff Monitor Logo" />

        <div className="logo-text">
            <h2>Staff Monitor</h2>
            <span>Management System</span>
        </div>
    </div>

    <ul>

        <li>
            <NavLink to="/dashboard">
                <FaTachometerAlt /> Dashboard
            </NavLink>
        </li>

        <li>
            <NavLink to="/employees">
                <FaUsers /> Employees
            </NavLink>
        </li>

        <li>
            <NavLink to="/attendance">
                <FaClipboardCheck /> Attendance
            </NavLink>
        </li>

        <li>
            <NavLink to="/leave">
                <FaCalendarAlt /> Leave
            </NavLink>
        </li>

        <li>
            <NavLink to="/reports">
                <FaChartBar /> Reports
            </NavLink>
        </li>

        <li>
            <NavLink to="/settings">
                <FaCog /> Settings
            </NavLink>
        </li>

        <li>
            <button type="button" className="logout-button" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
            </button>
        </li>

    </ul>

</div>

);

}

export default Sidebar;