import { NavLink } from "react-router-dom";
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

return (

<div className="sidebar">

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
            <NavLink to="/">
                <FaSignOutAlt /> Logout
            </NavLink>
        </li>

    </ul>

</div>

);

}

export default Sidebar;