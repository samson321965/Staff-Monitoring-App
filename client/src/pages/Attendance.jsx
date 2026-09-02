import React, { useState, useEffect } from "react";

import {
  FaCalendarCheck,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSyncAlt,
  FaSearch,
  FaEye,
  FaChevronDown,
  FaFileAlt,
  FaTimes,
  FaPlus,
} from "react-icons/fa";

import Sidebar from "../components/Sidebar";
import "../styles/Attendance.css";

const Attendance = () => {
  /* =====================================================
     STATE
  ===================================================== */

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [department, setDepartment] = useState("All Departments");
  const [status, setStatus] = useState("All Status");

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [attendanceData, setAttendanceData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     MARK ATTENDANCE FORM
  ===================================================== */

  const [showAttendanceForm, setShowAttendanceForm] =
    useState(false);

  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employee_id: "",
    attendance_date: "",
    check_in: "",
    check_out: "",
    status: "Present",
    notes: "",
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  /* =====================================================
     FETCH ATTENDANCE DATA
  ===================================================== */

  const fetchAttendance = () => {
    setLoading(true);
    setError("");

    fetch("http://localhost:5000/api/attendance")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch attendance data");
        }

        return response.json();
      })
      .then((data) => {
        console.log("Attendance data from API:", data);

        setAttendanceData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Attendance fetch error:", error);

        setError("Unable to load attendance data.");
        setLoading(false);
      });
  };

  /* =====================================================
     FETCH EMPLOYEES FOR FORM
  ===================================================== */

const fetchEmployees = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.error("Authentication token not found.");
    setFormError("Please login again. Authentication token is missing.");
    return;
  }

  fetch("http://localhost:5000/api/employees", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      console.log("Employee API status:", response.status);
      console.log("Employee API response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch employees"
        );
      }

      return data;
    })
    .then((data) => {
      console.log("Employees from API:", data);

      setEmployees(data);
    })
    .catch((error) => {
      console.error("Employee fetch error:", error);

      setFormError(
        error.message ||
          "Unable to load employees. Please check the employee API."
      );
    });
};

  /* =====================================================
     LOAD DATA WHEN PAGE OPENS
  ===================================================== */

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
  }, []);

  /* =====================================================
     FORMAT DATE
  ===================================================== */

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    const dateString = String(dateValue);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-CA");
  };

  /* =====================================================
     GET LOCAL DATE STRING
  ===================================================== */

  const getLocalDateString = (date) => {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(
      2,
      "0"
    );

    const day = String(date.getDate()).padStart(
      2,
      "0"
    );

    return `${year}-${month}-${day}`;
  };

  /* =====================================================
     DATABASE DATE TO LOCAL DATE
  ===================================================== */

  const getAttendanceDate = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const dateString = String(dateValue);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString.substring(0, 10);
    }

    return getLocalDateString(date);
  };

  /* =====================================================
     DATE FILTER
  ===================================================== */

  const matchesDateFilter = (dateValue) => {
    const attendanceDate =
      getAttendanceDate(dateValue);

    if (!attendanceDate) {
      return false;
    }

    const today = new Date();

    const todayString =
      getLocalDateString(today);

    /* TODAY */

    if (dateFilter === "Today") {
      return attendanceDate === todayString;
    }

    /* YESTERDAY */

    if (dateFilter === "Yesterday") {
      const yesterday = new Date(today);

      yesterday.setDate(
        yesterday.getDate() - 1
      );

      const yesterdayString =
        getLocalDateString(yesterday);

      return attendanceDate === yesterdayString;
    }

    /* THIS WEEK */

    if (dateFilter === "This Week") {
      const currentDate = new Date(today);

      const day = currentDate.getDay();

      const difference =
        day === 0 ? 6 : day - 1;

      const weekStart =
        new Date(currentDate);

      weekStart.setDate(
        currentDate.getDate() - difference
      );

      weekStart.setHours(0, 0, 0, 0);

      const weekEnd =
        new Date(weekStart);

      weekEnd.setDate(
        weekStart.getDate() + 6
      );

      weekEnd.setHours(
        23,
        59,
        59,
        999
      );

      const recordDate =
        new Date(
          `${attendanceDate}T00:00:00`
        );

      return (
        recordDate >= weekStart &&
        recordDate <= weekEnd
      );
    }

    /* THIS MONTH */

    if (dateFilter === "This Month") {
      const currentYear =
        today.getFullYear();

      const currentMonth =
        today.getMonth();

      const recordDate =
        new Date(
          `${attendanceDate}T00:00:00`
        );

      return (
        recordDate.getFullYear() ===
          currentYear &&
        recordDate.getMonth() ===
          currentMonth
      );
    }

    return true;
  };

  /* =====================================================
     CALCULATE WORKING HOURS
  ===================================================== */

  const calculateHours = (
    checkIn,
    checkOut
  ) => {
    if (!checkIn || !checkOut) {
      return "-";
    }

    const [inHours, inMinutes] =
      String(checkIn)
        .split(":")
        .map(Number);

    const [outHours, outMinutes] =
      String(checkOut)
        .split(":")
        .map(Number);

    const startMinutes =
      inHours * 60 + inMinutes;

    const endMinutes =
      outHours * 60 + outMinutes;

    const difference =
      endMinutes - startMinutes;

    if (difference <= 0) {
      return "-";
    }

    const hours =
      Math.floor(
        difference / 60
      );

    const minutes =
      difference % 60;

    return `${hours}h ${minutes}m`;
  };

  /* =====================================================
     FILTER ATTENDANCE DATA
  ===================================================== */

  const filteredData =
    attendanceData.filter((item) => {
      const dateMatch =
        matchesDateFilter(item.date);

      const search =
        searchTerm
          .toLowerCase()
          .trim();

      const employeeName =
        item.employee
          ? String(
              item.employee
            ).toLowerCase()
          : "";

      const employeeId =
        item.employeeId
          ? String(
              item.employeeId
            ).toLowerCase()
          : "";

      const searchMatch =
        employeeName.includes(search) ||
        employeeId.includes(search);

      const departmentMatch =
        department === "All Departments" ||
        item.department === department;

      const statusMatch =
        status === "All Status" ||
        item.status === status;

      return (
        dateMatch &&
        searchMatch &&
        departmentMatch &&
        statusMatch
      );
    });

  /* =====================================================
     STATISTICS
  ===================================================== */

  const uniqueEmployees =
    new Set(
      filteredData.map(
        (item) => item.employeeId
      )
    );

  const totalEmployees =
    uniqueEmployees.size;

  const present =
    filteredData.filter(
      (item) =>
        item.status === "Present"
    ).length;

  const late =
    filteredData.filter(
      (item) =>
        item.status === "Late"
    ).length;

  const absent =
    filteredData.filter(
      (item) =>
        item.status === "Absent"
    ).length;

  const halfDay =
    filteredData.filter(
      (item) =>
        item.status === "Half Day"
    ).length;

  const attended =
    present +
    late +
    halfDay;

  const attendanceRate =
    totalEmployees > 0
      ? Math.round(
          (attended /
            totalEmployees) *
            100
        )
      : 0;

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = () => {
    fetchAttendance();
  };

  /* =====================================================
     VIEW DETAILS
  ===================================================== */

  const handleView = (employee) => {
    setSelectedEmployee(employee);
  };

  const closeDetails = () => {
    setSelectedEmployee(null);
  };

  /* =====================================================
     OPEN ATTENDANCE FORM
  ===================================================== */

  const openAttendanceForm = () => {
    setFormError("");
    setFormSuccess("");

    setFormData({
      employee_id: "",
      attendance_date:
        getLocalDateString(new Date()),
      check_in: "",
      check_out: "",
      status: "Present",
      notes: "",
    });

    setShowAttendanceForm(true);
  };

  /* =====================================================
     CLOSE ATTENDANCE FORM
  ===================================================== */

  const closeAttendanceForm = () => {
    if (formLoading) {
      return;
    }

    setShowAttendanceForm(false);
    setFormError("");
    setFormSuccess("");
  };

  /* =====================================================
     FORM INPUT CHANGE
  ===================================================== */

  const handleFormChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     SUBMIT ATTENDANCE
  ===================================================== */

  const handleSubmitAttendance = async (
    event
  ) => {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (
      !formData.employee_id ||
      !formData.attendance_date
    ) {
      setFormError(
        "Please select an employee and attendance date."
      );

      return;
    }

    setFormLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/attendance",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            employee_id:
              formData.employee_id,

            attendance_date:
              formData.attendance_date,

            check_in:
              formData.check_in ||
              null,

            check_out:
              formData.check_out ||
              null,

            status:
              formData.status ||
              "Present",

            notes:
              formData.notes ||
              null,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create attendance record"
        );
      }

      setFormSuccess(
        "Attendance record created successfully."
      );

      setFormData({
        employee_id: "",
        attendance_date:
          getLocalDateString(new Date()),
        check_in: "",
        check_out: "",
        status: "Present",
        notes: "",
      });

      await fetchAttendance();

      setTimeout(() => {
        setShowAttendanceForm(false);
        setFormSuccess("");
      }, 1000);

    } catch (error) {
      console.error(
        "Create attendance error:",
        error
      );

      setFormError(
        error.message ||
          "Unable to create attendance record."
      );
    } finally {
      setFormLoading(false);
    }
  };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <div className="attendance-layout">

      {/* SIDEBAR */}

      <div className="attendance-sidebar">
        <Sidebar />
      </div>

      {/* MAIN PAGE */}

      <main className="attendance-page">

        <div className="attendance-content">

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="attendance-header">

            <div className="attendance-title-section">

              <div className="attendance-title-icon">
                <FaCalendarCheck />
              </div>

              <div className="attendance-title-text">

                <h1>
                  Attendance Management
                </h1>

                <p>
                  Monitor employee attendance
                  and daily working hours
                </p>

              </div>

            </div>

            <div className="attendance-header-actions">

              {/* MARK ATTENDANCE */}

              <button
                type="button"
                className="add-attendance-btn"
                onClick={
                  openAttendanceForm
                }
              >
                <FaPlus />

                <span>
                  Mark Attendance
                </span>
              </button>

              {/* REFRESH */}

              <button
                type="button"
                className="refresh-attendance-btn"
                onClick={
                  handleRefresh
                }
                disabled={loading}
              >
                <FaSyncAlt />

                <span>
                  {loading
                    ? "Loading..."
                    : "Refresh"}
                </span>
              </button>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="attendance-error">
              {error}
            </div>
          )}

          {/* =================================================
              STATISTICS
          ================================================= */}

          <div className="attendance-statistics">

            {/* TOTAL */}

            <div className="attendance-stat-card total-attendance-card">

              <div className="attendance-stat-icon">
                <FaUsers />
              </div>

              <div className="attendance-stat-info">

                <span>
                  Total Employees
                </span>

                <strong>
                  {totalEmployees}
                </strong>

                <small>
                  Employees in selected period
                </small>

              </div>

            </div>

            {/* PRESENT */}

            <div className="attendance-stat-card present-card">

              <div className="attendance-stat-icon">
                <FaCheckCircle />
              </div>

              <div className="attendance-stat-info">

                <span>
                  Present
                </span>

                <strong>
                  {present}
                </strong>

                <small>
                  Employees present
                </small>

              </div>

            </div>

            {/* LATE */}

            <div className="attendance-stat-card late-card">

              <div className="attendance-stat-icon">
                <FaClock />
              </div>

              <div className="attendance-stat-info">

                <span>
                  Late
                </span>

                <strong>
                  {late}
                </strong>

                <small>
                  Arrived late
                </small>

              </div>

            </div>

            {/* ABSENT */}

            <div className="attendance-stat-card absent-card">

              <div className="attendance-stat-icon">
                <FaTimesCircle />
              </div>

              <div className="attendance-stat-info">

                <span>
                  Absent
                </span>

                <strong>
                  {absent}
                </strong>

                <small>
                  Employees absent
                </small>

              </div>

            </div>

            {/* RATE */}

            <div className="attendance-stat-card rate-card">

              <div className="attendance-stat-icon">
                <FaCalendarCheck />
              </div>

              <div className="attendance-stat-info">

                <span>
                  Attendance Rate
                </span>

                <strong>
                  {attendanceRate}%
                </strong>

                <small>
                  Current attendance
                </small>

              </div>

            </div>

          </div>

          {/* =================================================
              ATTENDANCE TABLE
          ================================================= */}

          <div className="attendance-table-container">

            {/* FILTER BAR */}

            <div className="attendance-filters">

              {/* DATE */}

              <div className="attendance-filter-select">

                <FaCalendarCheck />

                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Today
                  </option>

                  <option>
                    Yesterday
                  </option>

                  <option>
                    This Week
                  </option>

                  <option>
                    This Month
                  </option>

                </select>

                <FaChevronDown />

              </div>

              {/* DEPARTMENT */}

              <div className="attendance-filter-select">

                <select
                  value={department}
                  onChange={(event) =>
                    setDepartment(
                      event.target.value
                    )
                  }
                >

                  <option>
                    All Departments
                  </option>

                  <option>
                    Administration
                  </option>

                  <option>
                    Operations
                  </option>

                  <option>
                    ICT
                  </option>

                  <option>
                    Finance
                  </option>

                  <option>
                    Human Resources
                  </option>

                </select>

                <FaChevronDown />

              </div>

              {/* STATUS */}

              <div className="attendance-filter-select">

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value
                    )
                  }
                >

                  <option>
                    All Status
                  </option>

                  <option>
                    Present
                  </option>

                  <option>
                    Late
                  </option>

                  <option>
                    Absent
                  </option>

                  <option>
                    Half Day
                  </option>

                  <option>
                    Leave
                  </option>

                </select>

                <FaChevronDown />

              </div>

              {/* SEARCH */}

              <div className="attendance-search">

                <FaSearch />

                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

            {/* TABLE */}

            <div className="attendance-table-wrapper">

              {loading ? (

                <div className="attendance-loading">
                  Loading attendance records...
                </div>

              ) : (

                <table className="attendance-table">

                  <thead>

                    <tr>

                      <th>
                        Employee
                      </th>

                      <th>
                        Department
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Check In
                      </th>

                      <th>
                        Check Out
                      </th>

                      <th>
                        Hours
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {filteredData.length > 0 ? (

                      filteredData.map(
                        (employee) => (

                          <tr
                            key={
                              employee.id
                            }
                          >

                            {/* EMPLOYEE */}

                            <td>

                              <div className="attendance-employee-cell">

                                <div className="attendance-employee-avatar">

                                  {employee.employee
                                    ? employee.employee.charAt(
                                        0
                                      )
                                    : "?"}

                                </div>

                                <div className="attendance-employee-details">

                                  <strong>
                                    {
                                      employee.employee
                                    }
                                  </strong>

                                  <span>
                                    {
                                      employee.employeeId
                                    }
                                  </span>

                                </div>

                              </div>

                            </td>

                            {/* DEPARTMENT */}

                            <td>
                              {
                                employee.department ||
                                "-"
                              }
                            </td>

                            {/* DATE */}

                            <td className="attendance-date">
                              {formatDate(
                                employee.date
                              )}
                            </td>

                            {/* CHECK IN */}

                            <td className="attendance-time">
                              {
                                employee.checkIn ||
                                "-"
                              }
                            </td>

                            {/* CHECK OUT */}

                            <td className="attendance-time">
                              {
                                employee.checkOut ||
                                "-"
                              }
                            </td>

                            {/* HOURS */}

                            <td>

                              <strong className="hours-number">

                                {calculateHours(
                                  employee.checkIn,
                                  employee.checkOut
                                )}

                              </strong>

                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`attendance-status ${
                                  employee.status
                                    ? employee.status
                                        .toLowerCase()
                                        .replace(
                                          /\s+/g,
                                          "-"
                                        )
                                    : ""
                                }`}
                              >

                                {
                                  employee.status ||
                                  "-"
                                }

                              </span>

                            </td>

                            {/* ACTION */}

                            <td>

                              <div className="attendance-action-buttons">

                                <button
                                  type="button"
                                  className="attendance-action-btn attendance-view-btn"
                                  onClick={() =>
                                    handleView(
                                      employee
                                    )
                                  }
                                  title="View"
                                >

                                  <FaEye />

                                  <span>
                                    View
                                  </span>

                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan="8"
                          className="attendance-no-data"
                        >

                          No attendance records
                          found for the selected
                          filters.

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              )}

            </div>

            {/* FOOTER */}

            <div className="attendance-table-footer">

              <span>

                Showing{" "}
                {filteredData.length}{" "}
                of{" "}
                {attendanceData.length}{" "}
                attendance records

              </span>

              <div className="attendance-pagination">

                <button
                  type="button"
                  disabled
                >
                  ‹
                </button>

                <button
                  type="button"
                  className="active"
                >
                  1
                </button>

                <button
                  type="button"
                  disabled
                >
                  ›
                </button>

              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            ATTENDANCE DETAILS MODAL
        ================================================= */}

        {selectedEmployee && (

          <div
            className="attendance-modal-overlay"
            onClick={closeDetails}
            role="presentation"
          >

            <div
              className="attendance-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="attendance-details-title"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              {/* HEADER */}

              <div className="attendance-modal-header">

                <div className="attendance-modal-title">

                  <div className="attendance-modal-icon">
                    <FaFileAlt />
                  </div>

                  <div>

                    <h2 id="attendance-details-title">
                      Attendance Details
                    </h2>

                    <p>
                      Employee attendance information
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="attendance-modal-close"
                  onClick={
                    closeDetails
                  }
                  aria-label="Close attendance details"
                >
                  <FaTimes />
                </button>

              </div>

              {/* BODY */}

              <div className="attendance-modal-body">

                <div className="attendance-profile-card">

                  <div className="attendance-profile-avatar">

                    {selectedEmployee.employee
                      ? selectedEmployee.employee.charAt(
                          0
                        )
                      : "?"}

                  </div>

                  <div className="attendance-profile-info">

                    <h3>
                      {
                        selectedEmployee.employee
                      }
                    </h3>

                    <span>
                      {
                        selectedEmployee.employeeId
                      }
                    </span>

                    <small>
                      {
                        selectedEmployee.department ||
                        "-"
                      }
                    </small>

                  </div>

                  <span
                    className={`attendance-modal-status ${
                      selectedEmployee.status
                        ? selectedEmployee.status
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )
                        : ""
                    }`}
                  >

                    {
                      selectedEmployee.status ||
                      "-"
                    }

                  </span>

                </div>

                <div className="attendance-detail-grid">

                  <div className="attendance-detail-item">

                    <span>
                      Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedEmployee.date
                      )}
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Attendance Status
                    </span>

                    <strong>
                      {
                        selectedEmployee.status ||
                        "-"
                      }
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Check In
                    </span>

                    <strong>
                      {
                        selectedEmployee.checkIn ||
                        "-"
                      }
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Check Out
                    </span>

                    <strong>
                      {
                        selectedEmployee.checkOut ||
                        "-"
                      }
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Total Hours
                    </span>

                    <strong>
                      {calculateHours(
                        selectedEmployee.checkIn,
                        selectedEmployee.checkOut
                      )}
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Department
                    </span>

                    <strong>
                      {
                        selectedEmployee.department ||
                        "-"
                      }
                    </strong>

                  </div>

                  <div className="attendance-detail-item">

                    <span>
                      Notes
                    </span>

                    <strong>
                      {
                        selectedEmployee.notes ||
                        "-"
                      }
                    </strong>

                  </div>

                </div>

              </div>

              {/* FOOTER */}

              <div className="attendance-modal-footer">

                <span>

                  Attendance Record #

                  {String(
                    selectedEmployee.id
                  ).padStart(
                    4,
                    "0"
                  )}

                </span>

                <button
                  type="button"
                  className="attendance-modal-close-btn"
                  onClick={
                    closeDetails
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            MARK ATTENDANCE MODAL
        ================================================= */}

        {showAttendanceForm && (

          <div
            className="attendance-modal-overlay"
            onClick={
              closeAttendanceForm
            }
            role="presentation"
          >

            <div
              className="attendance-form-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mark-attendance-title"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              {/* FORM HEADER */}

              <div className="attendance-modal-header">

                <div className="attendance-modal-title">

                  <div className="attendance-modal-icon">
                    <FaCalendarCheck />
                  </div>

                  <div>

                    <h2 id="mark-attendance-title">
                      Mark Attendance
                    </h2>

                    <p>
                      Create a new employee attendance record
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="attendance-modal-close"
                  onClick={
                    closeAttendanceForm
                  }
                  disabled={formLoading}
                  aria-label="Close mark attendance form"
                >
                  <FaTimes />
                </button>

              </div>

              {/* FORM */}

              <form
                onSubmit={
                  handleSubmitAttendance
                }
              >

                <div className="attendance-form-body">

                  {formError && (
                    <div className="attendance-form-error">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="attendance-form-success">
                      {formSuccess}
                    </div>
                  )}

                  {/* EMPLOYEE */}

                  <div className="attendance-form-group">

                    <label htmlFor="employee_id">
                      Employee
                    </label>

                    <select
                      id="employee_id"
                      name="employee_id"
                      value={
                        formData.employee_id
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    >

                      <option value="">
                        Select Employee
                      </option>

                      {employees.map(
                        (employee) => (

                          <option
                            key={
                              employee.id
                            }
                            value={
                              employee.id
                            }
                          >
                            {employee.employee_id
                              ? `${employee.employee_id} - `
                              : ""}
                            {employee.first_name}{" "}
                            {employee.last_name}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                  {/* DATE */}

                  <div className="attendance-form-group">

                    <label htmlFor="attendance_date">
                      Attendance Date
                    </label>

                    <input
                      id="attendance_date"
                      type="date"
                      name="attendance_date"
                      value={
                        formData.attendance_date
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />

                  </div>

                  {/* TIME ROW */}

                  <div className="attendance-form-row">

                    {/* CHECK IN */}

                    <div className="attendance-form-group">

                      <label htmlFor="check_in">
                        Check In
                      </label>

                      <input
                        id="check_in"
                        type="time"
                        name="check_in"
                        value={
                          formData.check_in
                        }
                        onChange={
                          handleFormChange
                        }
                      />

                    </div>

                    {/* CHECK OUT */}

                    <div className="attendance-form-group">

                      <label htmlFor="check_out">
                        Check Out
                      </label>

                      <input
                        id="check_out"
                        type="time"
                        name="check_out"
                        value={
                          formData.check_out
                        }
                        onChange={
                          handleFormChange
                        }
                      />

                    </div>

                  </div>

                  {/* STATUS */}

                  <div className="attendance-form-group">

                    <label htmlFor="status">
                      Status
                    </label>

                    <select
                      id="status"
                      name="status"
                      value={
                        formData.status
                      }
                      onChange={
                        handleFormChange
                      }
                    >

                      <option value="Present">
                        Present
                      </option>

                      <option value="Late">
                        Late
                      </option>

                      <option value="Absent">
                        Absent
                      </option>

                      <option value="Half Day">
                        Half Day
                      </option>

                      <option value="Leave">
                        Leave
                      </option>

                    </select>

                  </div>

                  {/* NOTES */}

                  <div className="attendance-form-group">

                    <label htmlFor="notes">
                      Notes
                    </label>

                    <textarea
                      id="notes"
                      name="notes"
                      rows="4"
                      placeholder="Enter any attendance notes..."
                      value={
                        formData.notes
                      }
                      onChange={
                        handleFormChange
                      }
                    />

                  </div>

                </div>

                {/* FORM FOOTER */}

                <div className="attendance-modal-footer">

                  <button
                    type="button"
                    className="attendance-modal-cancel-btn"
                    onClick={
                      closeAttendanceForm
                    }
                    disabled={
                      formLoading
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="attendance-save-btn"
                    disabled={
                      formLoading
                    }
                  >

                    {formLoading ? (
                      <>
                        <FaSyncAlt className="attendance-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        Save Attendance
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

      </main>

    </div>
  );
};

export default Attendance;