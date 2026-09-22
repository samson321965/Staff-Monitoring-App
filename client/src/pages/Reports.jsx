import React, { useEffect, useState } from "react";
import {
  FiFileText,
  FiDownload,
  FiCalendar,
  FiChevronDown,
  FiUsers,
  FiUserCheck,
  FiClock,
  FiUserX,
  FiEye,
  FiFilter,
  FiPieChart,
  FiFile,
  FiRefreshCw,
  FiX,
  FiCheck,
} from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import logo from "../assets/images/logo.png";

import "../styles/Reports.css";
import { API_BASE_URL } from "../config/api";
import { getAuthHeaders } from "../utils/auth";

// API_BASE_URL already contains:
// http://localhost:5000/api
//
// Therefore, do NOT add another "/" after API_BASE_URL
// when building the request URL.
const API_URL = API_BASE_URL.replace(/\/+$/, "");


const Reports = () => {
  /* =====================================================
     STATE
     ===================================================== */

  const [summary, setSummary] = useState({
    totalEmployees: 0,
    present: 0,
    onLeave: 0,
    absent: 0,
    late: 0,
  });

  const [attendanceData, setAttendanceData] = useState([]);

  const [leaveData, setLeaveData] = useState({
    sick: 0,
    family: 0,
    other: 0,
    total: 0,
  });

  const [recentReports, setRecentReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* =====================================================
     LOCAL DATE HELPERS
     IMPORTANT:
     Do NOT use toISOString() here.
     This prevents the Vanuatu timezone date shifting problem.
     ===================================================== */

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getToday = () => {
    return formatLocalDate(new Date());
  };

  const getMonthStart = () => {
    const today = new Date();

    return formatLocalDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );
  };

  const [dateRange, setDateRange] = useState({
    startDate: getMonthStart(),
    endDate: getToday(),
  });

  /*
   * Temporary date range used inside the calendar popup.
   * Changes here do NOT immediately reload the report.
   */
  const [draftDateRange, setDraftDateRange] = useState({
    startDate: getMonthStart(),
    endDate: getToday(),
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [reportType, setReportType] = useState("all");

  const [department, setDepartment] = useState("all");

  /* =====================================================
     LOAD REPORT DATA
     ===================================================== */

  const loadReportData = async (selectedRange = dateRange) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      if (!selectedRange.startDate || !selectedRange.endDate) {
        throw new Error(
          "Please select both a start date and an end date."
        );
      }

      if (selectedRange.startDate > selectedRange.endDate) {
        throw new Error(
          "Start date cannot be after the end date."
        );
      }

      const query = new URLSearchParams({
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        reportType,
        section: department,
      });

      /*
       * IMPORTANT:
       * API_URL is:
       * http://localhost:5000/api
       *
       * So this creates:
       * http://localhost:5000/api/reports/summary
       *
       * NOT:
       * http://localhost:5000/api//reports/summary
       */
      const requestUrl =
        `${API_URL}/reports/summary?${query.toString()}`;

      console.log("Reports API request:", requestUrl);

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({}));

        if (response.status === 401) {
          throw new Error(
            errorData.message ||
              "Your session is invalid. Please log in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            errorData.message ||
              "You do not have permission to view reports."
          );
        }

        throw new Error(
          errorData.message ||
            "Unable to load report data."
        );
      }

      const data = await response.json();

      console.log("Reports API response:", data);

      setSummary(
        data.summary || {
          totalEmployees: 0,
          present: 0,
          onLeave: 0,
          absent: 0,
          late: 0,
        }
      );

      setAttendanceData(data.attendanceTrend || []);

      setLeaveData(
        data.leaveSummary || {
          sick: 0,
          family: 0,
          other: 0,
          total: 0,
        }
      );

      setRecentReports(data.recentReports || []);
    } catch (err) {
      console.error("Reports error:", err);

      setError(
        err.message ||
          "Unable to connect to the Reports API. Please check your backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOAD DATA WHEN PAGE OPENS / FILTER CHANGES
     ===================================================== */

  useEffect(() => {
    loadReportData();
  }, [
    dateRange.startDate,
    dateRange.endDate,
    reportType,
    department,
  ]);

  /* =====================================================
     DATE PICKER FUNCTIONS
     ===================================================== */

  const openDatePicker = () => {
    setDraftDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    setShowDatePicker(true);
  };

  const cancelDatePicker = () => {
    setDraftDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    setShowDatePicker(false);
  };

  const applyDatePicker = () => {
    if (
      !draftDateRange.startDate ||
      !draftDateRange.endDate
    ) {
      setError(
        "Please select both a start date and an end date."
      );
      return;
    }

    if (
      draftDateRange.startDate >
      draftDateRange.endDate
    ) {
      setError(
        "Start date cannot be after the end date."
      );
      return;
    }

    setError("");

    setDateRange({
      startDate: draftDateRange.startDate,
      endDate: draftDateRange.endDate,
    });

    setShowDatePicker(false);
  };

  /* =====================================================
     QUICK DATE FILTERS
     ===================================================== */

  const selectToday = () => {
    const today = getToday();

    setDraftDateRange({
      startDate: today,
      endDate: today,
    });
  };

  const selectThisMonth = () => {
    const today = new Date();

    const start = formatLocalDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const end = formatLocalDate(today);

    setDraftDateRange({
      startDate: start,
      endDate: end,
    });
  };

  const selectLastMonth = () => {
    const today = new Date();

    const firstDayLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    const lastDayLastMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );

    setDraftDateRange({
      startDate: formatLocalDate(firstDayLastMonth),
      endDate: formatLocalDate(lastDayLastMonth),
    });
  };

  const selectLast7Days = () => {
    const today = new Date();

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    setDraftDateRange({
      startDate: formatLocalDate(sevenDaysAgo),
      endDate: formatLocalDate(today),
    });
  };

  /* =====================================================
     CALCULATIONS
     ===================================================== */

  const totalEmployees = Number(
    summary.totalEmployees || 0
  );

  const present = Number(summary.present || 0);

  const late = Number(summary.late || 0);

  const absent = Number(summary.absent || 0);

  const onLeave = Number(summary.onLeave || 0);

  const attendanceRate =
    totalEmployees > 0
      ? ((present / totalEmployees) * 100).toFixed(1)
      : "0.0";

  const presentPercentage =
    totalEmployees > 0
      ? ((present / totalEmployees) * 100).toFixed(1)
      : "0.0";

  const latePercentage =
    totalEmployees > 0
      ? ((late / totalEmployees) * 100).toFixed(1)
      : "0.0";

  const absentPercentage =
    totalEmployees > 0
      ? ((absent / totalEmployees) * 100).toFixed(1)
      : "0.0";

  /* =====================================================
     DOWNLOAD REPORT
     ===================================================== */

  const downloadReport = async (report) => {
    try {
      const response = await fetch(
        `${API_URL}/reports/${report.id}/download`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Could not download report.");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = report.name || "report";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);

      alert("Unable to download the report.");
    }
  };

  /* =====================================================
     GENERATE REPORT
     ===================================================== */

  const generateReport = async () => {
    try {
      const response = await fetch(
        `${API_URL}/reports/generate`,
        {
          method: "POST",

          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            reportType,
            section: department,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Unable to generate report.");
      }

      await loadReportData();

      alert("Report generated successfully.");
    } catch (err) {
      console.error(err);

      alert("Unable to generate report.");
    }
  };

  /* =====================================================
     DATE DISPLAY
     ===================================================== */

  const formatDate = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return date;
    }

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="reports-page">

      <Sidebar />

      <main className="reports-main">

        <img
          src={logo}
          alt=""
          className="reports-watermark"
        />

        <div className="reports-content">

          <header className="reports-header">

            <div className="reports-title">

              <div className="reports-title-icon">
                <FiFileText />
              </div>

              <div>
                <h1>Reports</h1>

                <p>
                  View and download attendance, leave and employee reports
                </p>
              </div>

            </div>

            <div className="reports-header-actions">

              <div
                className="date-picker-wrapper"
                style={{
                  position: "relative",
                }}
              >

                <button
                  type="button"
                  className="date-display"
                  onClick={
                    showDatePicker
                      ? cancelDatePicker
                      : openDatePicker
                  }
                  aria-expanded={showDatePicker}
                  aria-haspopup="dialog"
                >

                  <FiCalendar />

                  <span>
                    {formatDate(dateRange.startDate)} -{" "}
                    {formatDate(dateRange.endDate)}
                  </span>

                  <FiChevronDown
                    style={{
                      transform: showDatePicker
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />

                </button>

                {showDatePicker && (

                  <div
                    className="date-picker-popup"
                    role="dialog"
                    aria-label="Select report date range"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      zIndex: 1000,
                      width: "340px",
                      background: "#ffffff",
                      border: "1px solid #dfe5ef",
                      borderRadius: "14px",
                      boxShadow:
                        "0 12px 35px rgba(0, 0, 0, 0.15)",
                      padding: "20px",
                    }}
                  >

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "18px",
                      }}
                    >

                      <div>

                        <h3
                          style={{
                            margin: 0,
                            fontSize: "17px",
                            fontWeight: 700,
                          }}
                        >
                          Select Date Range
                        </h3>

                        <p
                          style={{
                            margin: "5px 0 0",
                            fontSize: "12px",
                            color: "#718096",
                          }}
                        >
                          Choose the period for your report
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={cancelDatePicker}
                        aria-label="Close date picker"
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: "18px",
                          padding: "5px",
                        }}
                      >
                        <FiX />
                      </button>

                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "7px",
                        marginBottom: "18px",
                      }}
                    >

                      <button
                        type="button"
                        onClick={selectToday}
                        style={{
                          border: "1px solid #d8e0ec",
                          background: "#f7f9fc",
                          borderRadius: "7px",
                          padding: "7px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Today
                      </button>

                      <button
                        type="button"
                        onClick={selectThisMonth}
                        style={{
                          border: "1px solid #d8e0ec",
                          background: "#f7f9fc",
                          borderRadius: "7px",
                          padding: "7px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        This Month
                      </button>

                      <button
                        type="button"
                        onClick={selectLastMonth}
                        style={{
                          border: "1px solid #d8e0ec",
                          background: "#f7f9fc",
                          borderRadius: "7px",
                          padding: "7px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Last Month
                      </button>

                      <button
                        type="button"
                        onClick={selectLast7Days}
                        style={{
                          border: "1px solid #d8e0ec",
                          background: "#f7f9fc",
                          borderRadius: "7px",
                          padding: "7px 10px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Last 7 Days
                      </button>

                    </div>

                    <div
                      style={{
                        marginBottom: "14px",
                      }}
                    >

                      <label
                        htmlFor="popup-start-date"
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: 600,
                          marginBottom: "7px",
                        }}
                      >
                        Start Date
                      </label>

                      <input
                        id="popup-start-date"
                        type="date"
                        value={draftDateRange.startDate}
                        max={draftDateRange.endDate || undefined}
                        onChange={(e) =>
                          setDraftDateRange(
                            (current) => ({
                              ...current,
                              startDate: e.target.value,
                            })
                          )
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 11px",
                          border: "1px solid #d8e0ec",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: "#fff",
                        }}
                      />

                    </div>

                    <div
                      style={{
                        marginBottom: "18px",
                      }}
                    >

                      <label
                        htmlFor="popup-end-date"
                        style={{
                          display: "block",
                          fontSize: "13px",
                          fontWeight: 600,
                          marginBottom: "7px",
                        }}
                      >
                        End Date
                      </label>

                      <input
                        id="popup-end-date"
                        type="date"
                        value={draftDateRange.endDate}
                        min={draftDateRange.startDate || undefined}
                        onChange={(e) =>
                          setDraftDateRange(
                            (current) => ({
                              ...current,
                              endDate: e.target.value,
                            })
                          )
                        }
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 11px",
                          border: "1px solid #d8e0ec",
                          borderRadius: "8px",
                          fontSize: "14px",
                          background: "#fff",
                        }}
                      />

                    </div>

                    <div
                      style={{
                        background: "#f5f8fc",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        marginBottom: "17px",
                        fontSize: "12px",
                        color: "#526173",
                      }}
                    >
                      <strong>
                        Selected:
                      </strong>{" "}
                      {formatDate(
                        draftDateRange.startDate
                      )}{" "}
                      -{" "}
                      {formatDate(
                        draftDateRange.endDate
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "9px",
                      }}
                    >

                      <button
                        type="button"
                        onClick={cancelDatePicker}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "1px solid #d8e0ec",
                          background: "#fff",
                          borderRadius: "8px",
                          padding: "9px 13px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        <FiX />
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={applyDatePicker}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          border: "none",
                          background: "#18315a",
                          color: "#fff",
                          borderRadius: "8px",
                          padding: "9px 14px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        <FiCheck />
                        Apply Filter
                      </button>

                    </div>

                  </div>
                )}

              </div>

              <button
                className="export-button"
                onClick={generateReport}
              >
                <FiDownload />
                Export Report
              </button>

            </div>

          </header>

          {error && (
            <div className="reports-error">
              {error}

              <button
                onClick={() =>
                  loadReportData(dateRange)
                }
              >
                <FiRefreshCw />
                Retry
              </button>
            </div>
          )}

          <section className="report-summary-cards">

            <div className="report-summary-card employees">

              <div className="summary-card-icon">
                <FiUsers />
              </div>

              <div className="summary-card-content">

                <span>Total Employees</span>

                <strong>
                  {loading ? "—" : totalEmployees}
                </strong>

                <small>
                  All registered staff
                </small>

              </div>

              <FiUsers className="summary-bg-icon" />

            </div>

            <div className="report-summary-card present">

              <div className="summary-card-icon">
                <FiUserCheck />
              </div>

              <div className="summary-card-content">

                <span>Present</span>

                <strong>
                  {loading ? "—" : present}
                </strong>

                <small>
                  {presentPercentage}% of total
                </small>

              </div>

              <FiUserCheck className="summary-bg-icon" />

            </div>

            <div className="report-summary-card leave">

              <div className="summary-card-icon">
                <FiClock />
              </div>

              <div className="summary-card-content">

                <span>On Leave</span>

                <strong>
                  {loading ? "—" : onLeave}
                </strong>

                <small>
                  {totalEmployees > 0
                    ? (
                        (onLeave /
                          totalEmployees) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  % of total
                </small>

              </div>

              <FiClock className="summary-bg-icon" />

            </div>

            <div className="report-summary-card absent">

              <div className="summary-card-icon">
                <FiUserX />
              </div>

              <div className="summary-card-content">

                <span>Absent</span>

                <strong>
                  {loading ? "—" : absent}
                </strong>

                <small>
                  {absentPercentage}% of total
                </small>

              </div>

              <FiUserX className="summary-bg-icon" />

            </div>

          </section>

          <div className="report-tabs">

            <button className="tab active">
              Attendance Summary
            </button>

            <button className="tab">
              Leave Summary
            </button>

            <button className="tab">
              Employee Summary
            </button>

            <button className="tab">
              Department Summary
            </button>

            <button className="tab">
              Custom Report
            </button>

          </div>

          <section className="reports-grid">

            <div className="report-panel attendance-panel">

              <h2>
                Attendance Overview
              </h2>

              <div className="attendance-overview-content">

                <div
                  className="attendance-donut"
                  style={{
                    background:
                      totalEmployees > 0
                        ? `conic-gradient(
                            #10b968 0% ${presentPercentage}%,
                            #f3bd19 ${presentPercentage}% ${
                              Number(
                                presentPercentage
                              ) +
                              Number(
                                latePercentage
                              )
                            }%,
                            #ef4141 ${
                              Number(
                                presentPercentage
                              ) +
                              Number(
                                latePercentage
                              )
                            }% 100%
                          )`
                        : "#18315a",
                  }}
                >

                  <div className="donut-center">

                    <strong>
                      {loading
                        ? "—"
                        : totalEmployees}
                    </strong>

                    <span>Total</span>

                  </div>

                </div>

                <div className="attendance-legend">

                  <div className="legend-item">

                    <span className="legend-dot green"></span>

                    <span>Present</span>

                    <strong>
                      {present} ({presentPercentage}%)
                    </strong>

                  </div>

                  <div className="legend-item">

                    <span className="legend-dot yellow"></span>

                    <span>Late</span>

                    <strong>
                      {late} ({latePercentage}%)
                    </strong>

                  </div>

                  <div className="legend-item">

                    <span className="legend-dot red"></span>

                    <span>Absent</span>

                    <strong>
                      {absent} ({absentPercentage}%)
                    </strong>

                  </div>

                </div>

              </div>

              <div className="attendance-rate">

                <div>

                  <h3>
                    Attendance Rate
                  </h3>

                  <p>
                    Based on selected date range
                  </p>

                </div>

                <div className="rate-number">

                  <strong>
                    {attendanceRate}% ↗
                  </strong>

                </div>

              </div>

            </div>

            <div className="report-panel trend-panel">

              <div className="panel-heading">

                <h2>
                  Attendance Trend
                </h2>

                <select
                  className="month-selector"
                  defaultValue="month"
                >
                  <option value="month">
                    This Month
                  </option>

                  <option value="lastMonth">
                    Last Month
                  </option>
                </select>

              </div>

              <div className="fake-chart">

                <div className="chart-y-axis">

                  <span>150</span>
                  <span>125</span>
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>

                </div>

                <div className="chart-area">

                  <div className="chart-grid-line one"></div>
                  <div className="chart-grid-line two"></div>
                  <div className="chart-grid-line three"></div>
                  <div className="chart-grid-line four"></div>
                  <div className="chart-grid-line five"></div>
                  <div className="chart-grid-line six"></div>

                  {attendanceData.length > 0 ? (

                    <div className="database-chart">

                      {attendanceData.map(
                        (item, index) => (

                          <div
                            key={index}
                            className="chart-point"
                            style={{
                              height: `${Math.min(
                                Number(
                                  item.present || 0
                                ),
                                150
                              )}%`,
                            }}
                            title={`${item.date}: ${item.present} present`}
                          ></div>

                        )
                      )}

                    </div>

                  ) : (

                    <div className="chart-empty">
                      No attendance trend data
                    </div>

                  )}

                  <div className="chart-x-axis">

                    {attendanceData.length > 0 ? (

                      attendanceData
                        .filter((_, index) => {

                          const step = Math.max(
                            1,
                            Math.ceil(
                              attendanceData.length /
                                5
                            )
                          );

                          return (
                            index % step === 0 ||
                            index ===
                              attendanceData.length -
                                1
                          );
                        })
                        .map((item, index) => (

                          <span
                            key={`${item.date}-${index}`}
                          >
                            {formatDate(item.date)}
                          </span>

                        ))

                    ) : (

                      <span>
                        {formatDate(
                          dateRange.startDate
                        )}{" "}
                        -{" "}
                        {formatDate(
                          dateRange.endDate
                        )}
                      </span>

                    )}

                  </div>

                </div>

              </div>

              <div className="chart-legend">

                <span>
                  <i className="green"></i>
                  Present
                </span>

                <span>
                  <i className="yellow"></i>
                  Late
                </span>

                <span>
                  <i className="red"></i>
                  Absent
                </span>

              </div>

            </div>

            <div className="reports-right-column">

              <div className="report-panel leave-panel">

                <h2>
                  Leave Overview
                </h2>

                <div className="leave-content">

                  <div
                    className="leave-donut"
                    style={{
                      background:
                        leaveData.total > 0
                          ? `conic-gradient(
                              #2868e8 0deg ${
                                (leaveData.sick /
                                  leaveData.total) *
                                360
                              }deg,

                              #f2992f ${
                                (leaveData.sick /
                                  leaveData.total) *
                                360
                              }deg ${
                                ((leaveData.sick +
                                  leaveData.family) /
                                  leaveData.total) *
                                360
                              }deg,

                              #734bd4 ${
                                ((leaveData.sick +
                                  leaveData.family) /
                                  leaveData.total) *
                                360
                              }deg 360deg
                            )`
                          : "#18315a",
                    }}
                  >

                    <div className="donut-center">

                      <strong>
                        {leaveData.total || 0}
                      </strong>

                      <span>Total</span>

                    </div>

                  </div>

                  <div className="leave-legend">

                    <div>

                      <span>
                        <i className="sick"></i>
                        Sick Leave
                      </span>

                      <strong>
                        {leaveData.sick}
                      </strong>

                    </div>

                    <div>

                      <span>
                        <i className="family"></i>
                        Family Leave
                      </span>

                      <strong>
                        {leaveData.family}
                      </strong>

                    </div>

                    <div>

                      <span>
                        <i className="other"></i>
                        Other Leave
                      </span>

                      <strong>
                        {leaveData.other}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

              <div className="report-panel reports-summary-panel">

                <h2>
                  Reports Summary
                </h2>

                <div className="reports-summary-list">

                  <div>
                    <FiFileText />

                    <span>
                      Attendance Reports
                    </span>

                    <strong>
                      {
                        recentReports.filter(
                          (r) =>
                            r.type ===
                            "Attendance"
                        ).length
                      }
                    </strong>

                  </div>

                  <div>
                    <FiFile />

                    <span>
                      Leave Reports
                    </span>

                    <strong>
                      {
                        recentReports.filter(
                          (r) =>
                            r.type === "Leave"
                        ).length
                      }
                    </strong>

                  </div>

                  <div>
                    <FiUsers />

                    <span>
                      Employee Reports
                    </span>

                    <strong>
                      {
                        recentReports.filter(
                          (r) =>
                            r.type ===
                            "Employee"
                        ).length
                      }
                    </strong>

                  </div>

                  <div>
                    <FiPieChart />

                    <span>
                      Department Reports
                    </span>

                    <strong>
                      {
                        recentReports.filter(
                          (r) =>
                            r.type ===
                            "Department"
                        ).length
                      }
                    </strong>

                  </div>

                </div>

              </div>

            </div>

          </section>

          <section className="reports-bottom-grid">

            <div className="report-panel recent-reports-panel">

              <h2>
                Recent Reports
              </h2>

              <div className="reports-table-container">

                <table className="reports-table">

                  <thead>

                    <tr>

                      <th>
                        Report Name
                      </th>

                      <th>
                        Report Type
                      </th>

                      <th>
                        Date Generated
                      </th>

                      <th>
                        Generated By
                      </th>

                      <th>
                        File Format
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {loading ? (

                      <tr>

                        <td
                          colSpan="6"
                          className="table-message"
                        >
                          Loading reports...
                        </td>

                      </tr>

                    ) : recentReports.length === 0 ? (

                      <tr>

                        <td
                          colSpan="6"
                          className="table-message"
                        >
                          No reports found.
                        </td>

                      </tr>

                    ) : (

                      recentReports.map(
                        (report) => (

                          <tr
                            key={report.id}
                          >

                            <td>

                              <div className="report-name-cell">

                                <div
                                  className={`file-icon ${
                                    report.format ===
                                    "PDF"
                                      ? "pdf"
                                      : "excel"
                                  }`}
                                >
                                  <FiFileText />
                                </div>

                                <span>
                                  {report.name}
                                </span>

                              </div>

                            </td>

                            <td>
                              {report.type}
                            </td>

                            <td>
                              {report.date}
                            </td>

                            <td>
                              {report.generatedBy}
                            </td>

                            <td>

                              <div className="format-cell">

                                <span
                                  className={
                                    report.format ===
                                    "PDF"
                                      ? "pdf-label"
                                      : "excel-label"
                                  }
                                >
                                  {report.format ===
                                  "PDF"
                                    ? "PDF"
                                    : "XLS"}
                                </span>

                                {report.format}

                              </div>

                            </td>

                            <td>

                              <div className="table-actions">

                                <button
                                  title="Download"
                                  onClick={() =>
                                    downloadReport(
                                      report
                                    )
                                  }
                                >
                                  <FiDownload />
                                </button>

                                <button
                                  title="View"
                                  onClick={() =>
                                    window.open(
                                      report.url,
                                      "_blank"
                                    )
                                  }
                                >
                                  <FiEye />
                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    )}

                  </tbody>

                </table>

              </div>

              <div className="table-footer">

                <span>
                  Showing{" "}
                  {recentReports.length}{" "}
                  reports
                </span>

              </div>

            </div>

            <div className="report-panel filter-panel">

              <h2>
                Filter Reports
              </h2>

              <div className="filter-group">

                <label>
                  Report Type
                </label>

                <select
                  className="filter-select"
                  value={reportType}
                  onChange={(e) =>
                    setReportType(
                      e.target.value
                    )
                  }
                >

                  <option value="all">
                    All Types
                  </option>

                  <option value="attendance">
                    Attendance
                  </option>

                  <option value="leave">
                    Leave
                  </option>

                  <option value="employee">
                    Employee
                  </option>

                  <option value="department">
                    Department
                  </option>

                </select>

              </div>

              <div className="filter-group">

                <label>
                  Department
                </label>

                <select
                  className="filter-select"
                  value={department}
                  onChange={(e) =>
                    setDepartment(
                      e.target.value
                    )
                  }
                >

                  <option value="all">
                    All Departments
                  </option>

                  <option value="administration">
                    Administration
                  </option>

                  <option value="ict">
                    ICT
                  </option>

                  <option value="operations">
                    Operations
                  </option>

                </select>

              </div>

              <div className="filter-group">

                <label>
                  Start Date
                </label>

                <input
                  type="date"
                  className="date-input"
                  value={dateRange.startDate}
                  max={dateRange.endDate}
                  onChange={(e) => {

                    const newStartDate =
                      e.target.value;

                    setDateRange(
                      (current) => ({
                        ...current,
                        startDate:
                          newStartDate,
                      })
                    );

                  }}
                />

              </div>

              <div className="filter-group">

                <label>
                  End Date
                </label>

                <input
                  type="date"
                  className="date-input"
                  value={dateRange.endDate}
                  min={dateRange.startDate}
                  onChange={(e) => {

                    const newEndDate =
                      e.target.value;

                    setDateRange(
                      (current) => ({
                        ...current,
                        endDate:
                          newEndDate,
                      })
                    );

                  }}
                />

              </div>

              <button
                className="generate-report-button"
                onClick={() =>
                  loadReportData(dateRange)
                }
              >

                <FiFilter />

                Generate Report

              </button>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
};

export default Reports;

