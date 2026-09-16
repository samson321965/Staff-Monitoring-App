
import React, { useEffect, useState } from "react";

import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaCalendarAlt,
  FaPlaneDeparture,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaClock,
  FaSyncAlt,
} from "react-icons/fa";

import Sidebar from "../components/Sidebar";
import "../styles/Dashboard.css";
import { buildApiUrl } from "../config/api";
import { getAuthHeaders } from "../utils/auth";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    attendanceRate: 0,
    employeesTravelling: 0,
    employeesOnLeave: 0,
    pendingRequests: 0,
    recentActivity: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     FETCH DASHBOARD DATA
  ===================================================== */

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(buildApiUrl("/dashboard"), {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();

      setDashboardData({
        totalEmployees: Number(data.totalEmployees) || 0,
        present: Number(data.present) || 0,
        absent: Number(data.absent) || 0,
        late: Number(data.late) || 0,
        halfDay: Number(data.halfDay) || 0,
        leave: Number(data.leave) || 0,
        attendanceRate: Number(data.attendanceRate) || 0,
        employeesTravelling:
          Number(data.employeesTravelling) || 0,
        employeesOnLeave:
          Number(data.employeesOnLeave) || 0,
        pendingRequests:
          Number(data.pendingRequests) || 0,
        recentActivity:
          Array.isArray(data.recentActivity)
            ? data.recentActivity
            : [],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);

      setError(
        "Unable to load dashboard data from the server."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOAD DATA WHEN PAGE OPENS
  ===================================================== */

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = () => {
    fetchDashboardData();
  };

  /* =====================================================
     FORMAT ACTIVITY TIME
  ===================================================== */

  const formatActivityTime = (date) => {
    if (!date) {
      return "";
    }

    const activityDate = new Date(date);

    if (Number.isNaN(activityDate.getTime())) {
      return "";
    }

    return activityDate.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  /* =====================================================
     ACTIVITY STATUS CLASS
  ===================================================== */

  const getActivityStatusClass = (status) => {
    if (!status) {
      return "pending";
    }

    const value = status.toLowerCase();

    if (
      value === "present" ||
      value === "approved"
    ) {
      return "success";
    }

    if (
      value === "late" ||
      value === "rejected"
    ) {
      return "warning";
    }

    return "pending";
  };

  return (
    <div className="dashboard-layout">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <div className="dashboard-sidebar">
        <Sidebar />
      </div>

      {/* =================================================
          MAIN PAGE
      ================================================= */}

      <div className="dashboard-page">

        <div className="dashboard-content">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="dashboard-header">

            <div className="dashboard-title-section">

              <div className="dashboard-title-icon">
                <FaChartLine />
              </div>

              <div className="dashboard-title-text">

                <h1>Dashboard</h1>

                <p>
                  Overview of your staff monitoring system.
                </p>

              </div>

            </div>

            <button
              type="button"
              className="dashboard-refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              <FaSyncAlt
                className={loading ? "spinning" : ""}
              />

              <span>
                {loading ? "Loading..." : "Refresh"}
              </span>
            </button>

          </div>

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="dashboard-error">
              {error}
            </div>
          )}

          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="dashboard-statistics">

            {/* TOTAL EMPLOYEES */}

            <div className="dashboard-stat-card total-card">

              <div className="dashboard-stat-icon">
                <FaUsers />
              </div>

              <div className="dashboard-stat-info">

                <span>Total Employees</span>

                <strong>
                  {loading
                    ? "..."
                    : dashboardData.totalEmployees}
                </strong>

                <small>
                  Registered employees
                </small>

              </div>

            </div>

            {/* PRESENT */}

            <div className="dashboard-stat-card present-card">

              <div className="dashboard-stat-icon">
                <FaUserCheck />
              </div>

              <div className="dashboard-stat-info">

                <span>Present Today</span>

                <strong>
                  {loading
                    ? "..."
                    : dashboardData.present}
                </strong>

                <small>
                  {dashboardData.attendanceRate}% attendance
                </small>

              </div>

            </div>

            {/* ABSENT */}

            <div className="dashboard-stat-card absent-card">

              <div className="dashboard-stat-icon">
                <FaUserTimes />
              </div>

              <div className="dashboard-stat-info">

                <span>Absent Today</span>

                <strong>
                  {loading
                    ? "..."
                    : dashboardData.absent}
                </strong>

                <small>
                  Employees absent
                </small>

              </div>

            </div>

            {/* LATE */}

            <div className="dashboard-stat-card late-card">

              <div className="dashboard-stat-icon">
                <FaUserClock />
              </div>

              <div className="dashboard-stat-info">

                <span>Late Today</span>

                <strong>
                  {loading
                    ? "..."
                    : dashboardData.late}
                </strong>

                <small>
                  Late arrivals
                </small>

              </div>

            </div>

          </div>

          {/* =================================================
              SECOND SECTION
          ================================================= */}

          <div className="dashboard-main-grid">

            {/* =================================================
                ATTENDANCE OVERVIEW
            ================================================= */}

            <div className="dashboard-panel attendance-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>Attendance Overview</h2>

                  <p>
                    Today's employee attendance
                  </p>

                </div>

                <FaCalendarAlt />

              </div>

              <div className="attendance-overview">

                <div
                  className="attendance-circle"
                  style={{
                    background: `conic-gradient(
                      #2161e8 0deg,
                      #2161e8 ${
                        dashboardData.attendanceRate * 3.6
                      }deg,
                      #183665 ${
                        dashboardData.attendanceRate * 3.6
                      }deg,
                      #183665 360deg
                    )`,
                  }}
                >

                  <div className="attendance-circle-inner">

                    <strong>
                      {loading
                        ? "..."
                        : `${dashboardData.attendanceRate}%`}
                    </strong>

                    <span>
                      Attendance
                    </span>

                  </div>

                </div>

                <div className="attendance-details">

                  <div className="attendance-detail">

                    <span className="detail-dot present-dot"></span>

                    <div>
                      <strong>
                        {dashboardData.present}
                      </strong>

                      <small>
                        Present
                      </small>
                    </div>

                  </div>

                  <div className="attendance-detail">

                    <span className="detail-dot absent-dot"></span>

                    <div>
                      <strong>
                        {dashboardData.absent}
                      </strong>

                      <small>
                        Absent
                      </small>
                    </div>

                  </div>

                  <div className="attendance-detail">

                    <span className="detail-dot late-dot"></span>

                    <div>
                      <strong>
                        {dashboardData.late}
                      </strong>

                      <small>
                        Late
                      </small>
                    </div>

                  </div>

                  <div className="attendance-detail">

                    <span className="detail-dot halfday-dot"></span>

                    <div>
                      <strong>
                        {dashboardData.halfDay}
                      </strong>

                      <small>
                        Half Day
                      </small>
                    </div>

                  </div>

                </div>

              </div>

            </div>

            {/* =================================================
                QUICK SUMMARY
            ================================================= */}

            <div className="dashboard-panel summary-panel">

              <div className="dashboard-panel-header">

                <div>

                  <h2>Quick Summary</h2>

                  <p>
                    Current staff information
                  </p>

                </div>

                <FaUsers />

              </div>

              <div className="summary-list">

                {/* TRAVELLING */}

                <div className="summary-item">

                  <div className="summary-item-icon">
                    <FaPlaneDeparture />
                  </div>

                  <div className="summary-item-info">

                    <span>
                      Employees Travelling
                    </span>

                    <strong>
                      {dashboardData.employeesTravelling}
                    </strong>

                  </div>

                  <FaArrowUp className="summary-up" />

                </div>

                {/* LEAVE */}

                <div className="summary-item">

                  <div className="summary-item-icon">
                    <FaCalendarAlt />
                  </div>

                  <div className="summary-item-info">

                    <span>
                      Employees on Leave
                    </span>

                    <strong>
                      {dashboardData.employeesOnLeave}
                    </strong>

                  </div>

                  <FaArrowDown className="summary-down" />

                </div>

                {/* PENDING */}

                <div className="summary-item">

                  <div className="summary-item-icon">
                    <FaClock />
                  </div>

                  <div className="summary-item-info">

                    <span>
                      Pending Requests
                    </span>

                    <strong>
                      {dashboardData.pendingRequests}
                    </strong>

                  </div>

                  <FaArrowUp className="summary-up" />

                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              RECENT ACTIVITY
          ================================================= */}

          <div className="dashboard-panel recent-panel">

            <div className="dashboard-panel-header">

              <div>

                <h2>Recent Activity</h2>

                <p>
                  Latest employee activities
                </p>

              </div>

            </div>

            <div className="recent-activity-list">

              {loading ? (

                <div className="dashboard-empty">
                  Loading recent activity...
                </div>

              ) : dashboardData.recentActivity.length === 0 ? (

                <div className="dashboard-empty">
                  No recent activity found.
                </div>

              ) : (

                dashboardData.recentActivity.map(
                  (activity) => {

                    const employeeName =
                      activity.employee ||
                      "Unknown Employee";

                    const initials =
                      employeeName
                        .split(" ")
                        .map((name) =>
                          name.charAt(0)
                        )
                        .join("")
                        .substring(0, 2)
                        .toUpperCase();

                    return (
                      <div
                        className="recent-activity-item"
                        key={`${activity.type}-${activity.id}`}
                      >

                        <div className="activity-avatar">
                          {initials}
                        </div>

                        <div className="activity-info">

                          <strong>
                            {activity.description}
                          </strong>

                          <span>
                            {formatActivityTime(
                              activity.activityDate
                            )}
                          </span>

                        </div>

                        <span
                          className={`activity-status ${getActivityStatusClass(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>

                      </div>
                    );
                  }
                )
              )}

            </div>

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="dashboard-footer">

            <span>
              Staff Monitoring System
            </span>

            <span>
              Dashboard Overview
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;

