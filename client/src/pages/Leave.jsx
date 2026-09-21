import React, { useState, useEffect } from "react";

import {
  FaCalendarAlt,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSyncAlt,
  FaSearch,
  FaEye,
  FaTrash,
  FaCheck,
  FaTimes,
  FaPlus,
  FaChevronDown,
} from "react-icons/fa";

import Sidebar from "../components/Sidebar";
import "../styles/Leave.css";
import { buildApiUrl } from "../config/api";
import { getAuthHeaders } from "../utils/auth";

const API_URL = buildApiUrl("/leaves");

const Leave = () => {
  /* =====================================================
     FILTER STATES
  ===================================================== */

  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const [leaveType, setLeaveType] = useState("All Types");
  const [status, setStatus] = useState("All Status");
  const [dateFilter, setDateFilter] = useState("All Dates");

  /* =====================================================
     DATA STATES
  ===================================================== */

  const [leaveData, setLeaveData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* =====================================================
     MODAL STATES
  ===================================================== */

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /* =====================================================
     ADD LEAVE FORM
  ===================================================== */

  const [formData, setFormData] = useState({
    employee_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const [saving, setSaving] = useState(false);

  /* =====================================================
     FETCH LEAVE DATA
  ===================================================== */

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Leave API error:",
          response.status,
          errorText
        );

        throw new Error("Failed to fetch leave applications");
      }

      const data = await response.json();

      setLeaveData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching leave data:", err);

      setError(
        "Unable to load leave applications from the server."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     FETCH EMPLOYEES
  ===================================================== */

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        buildApiUrl("/employees"),
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Employee API error:",
          response.status,
          errorText
        );

        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();

      console.log("EMPLOYEES FROM API:", data);

      if (Array.isArray(data)) {
        setEmployees(data);
      } else {
        console.error(
          "Employees API did not return an array:",
          data
        );

        setEmployees([]);
      }
    } catch (err) {
      console.error(
        "Error fetching employees:",
        err
      );

      setEmployees([]);

      setError(
        "Unable to load employees from the server."
      );
    }
  };

  /* =====================================================
     FETCH ACTIVE LEAVE TYPES
  ===================================================== */

  const fetchLeaveTypes = async () => {
    try {
      const response = await fetch(
        buildApiUrl("/leaves/types"),
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "Leave types API error:",
          response.status,
          errorText
        );

        throw new Error("Failed to fetch leave types");
      }

      const data = await response.json();

      console.log(
        "ACTIVE LEAVE TYPES FROM DATABASE:",
        data
      );

      if (Array.isArray(data)) {
        setLeaveTypes(data);

        /*
         * If there is no selected leave type yet,
         * automatically select the first active
         * leave type from PostgreSQL.
         */
        if (data.length > 0) {
          setFormData((current) => ({
            ...current,
            leave_type:
              current.leave_type ||
              data[0].leave_type,
          }));
        }
      } else {
        console.error(
          "Leave types API did not return an array:",
          data
        );

        setLeaveTypes([]);
      }
    } catch (err) {
      console.error(
        "Error fetching leave types:",
        err
      );

      setLeaveTypes([]);

      setError(
        "Unable to load leave types from the database."
      );
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    fetchLeaveData();
    fetchEmployees();
    fetchLeaveTypes();
  }, []);

  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalApplications = leaveData.length;

  const approved = leaveData.filter(
    (item) => item.status === "Approved"
  ).length;

  const pending = leaveData.filter(
    (item) => item.status === "Pending"
  ).length;

  const rejected = leaveData.filter(
    (item) => item.status === "Rejected"
  ).length;

  const totalLeaveDays = leaveData.reduce(
    (total, item) =>
      total + Number(item.total_days ?? item.days ?? 0),
    0
  );

  /* =====================================================
     DATE FILTER
  ===================================================== */

  const isDateMatch = (item) => {
    if (dateFilter === "All Dates") {
      return true;
    }

    const rawDate =
      item.startDate ||
      item.start_date;

    const startDate = new Date(rawDate);

    if (Number.isNaN(startDate.getTime())) {
      return false;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (dateFilter === "Today") {
      return (
        startDate.toDateString() ===
        today.toDateString()
      );
    }

    if (dateFilter === "This Week") {
      const weekStart = new Date(today);

      weekStart.setDate(
        today.getDate() - today.getDay()
      );

      const weekEnd = new Date(weekStart);

      weekEnd.setDate(
        weekStart.getDate() + 6
      );

      weekEnd.setHours(23, 59, 59, 999);

      return (
        startDate >= weekStart &&
        startDate <= weekEnd
      );
    }

    if (dateFilter === "This Month") {
      return (
        startDate.getMonth() ===
          today.getMonth() &&
        startDate.getFullYear() ===
          today.getFullYear()
      );
    }

    return true;
  };

  /* =====================================================
     FILTER DATA
  ===================================================== */

  const filteredData = leaveData.filter((item) => {
    const search = searchTerm
      .toLowerCase()
      .trim();

    const employeeName = String(
      item.employee || ""
    ).toLowerCase();

    const employeeId = String(
      item.employeeId ||
      item.employee_code ||
      ""
    ).toLowerCase();

    const searchMatch =
      !search ||
      employeeName.includes(search) ||
      employeeId.includes(search);

    const departmentMatch =
      department === "All Departments" ||
      item.department === department ||
      item.department_name === department;

    const currentLeaveType =
      item.leaveType ||
      item.leave_type ||
      "";

    const leaveTypeMatch =
      leaveType === "All Types" ||
      currentLeaveType === leaveType;

    const statusMatch =
      status === "All Status" ||
      item.status === status;

    const dateMatch = isDateMatch(item);

    return (
      searchMatch &&
      departmentMatch &&
      leaveTypeMatch &&
      statusMatch &&
      dateMatch
    );
  });

  /* =====================================================
     REFRESH
  ===================================================== */

  const handleRefresh = () => {
    fetchLeaveData();
    fetchEmployees();
    fetchLeaveTypes();
  };

  /* =====================================================
     ADD LEAVE BUTTON
  ===================================================== */

  const handleAddLeave = () => {
    setFormData({
      employee_id: "",
      leave_type:
        leaveTypes.length > 0
          ? leaveTypes[0].leave_type
          : "",
      start_date: "",
      end_date: "",
      reason: "",
    });

    setError("");
    setShowAddModal(true);
  };

  /* =====================================================
     FORM INPUT
  ===================================================== */

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /* =====================================================
     CREATE LEAVE
  ===================================================== */

  const handleSubmitLeave = async (event) => {
    event.preventDefault();

    if (
      !formData.employee_id ||
      !formData.leave_type ||
      !formData.start_date ||
      !formData.end_date
    ) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    if (
      new Date(formData.end_date) <
      new Date(formData.start_date)
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    /*
     * Make sure the selected leave type actually
     * exists in the active leave types loaded
     * from PostgreSQL.
     */
    const selectedType = leaveTypes.find(
      (type) =>
        String(type.leave_type).trim().toLowerCase() ===
        String(formData.leave_type).trim().toLowerCase()
    );

    if (!selectedType) {
      setError(
        "Please select a valid active leave type."
      );
      return;
    }

    /*
     * IMPORTANT:
     * Send the exact leave_type value from PostgreSQL,
     * not a hard-coded frontend value.
     */
    const submitData = {
      employee_id: formData.employee_id,
      leave_type: selectedType.leave_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      reason: formData.reason,
    };

    try {
      setSaving(true);
      setError("");

      console.log(
        "SUBMITTING LEAVE:",
        submitData
      );

      const response = await fetch(API_URL, {
        method: "POST",

        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },

        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      console.log(
        "ADD LEAVE RESPONSE:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create leave request"
        );
      }

      setShowAddModal(false);

      setFormData({
        employee_id: "",
        leave_type:
          leaveTypes.length > 0
            ? leaveTypes[0].leave_type
            : "",
        start_date: "",
        end_date: "",
        reason: "",
      });

      await fetchLeaveData();

      alert(
        "Leave request created successfully."
      );
    } catch (err) {
      console.error(
        "Error creating leave:",
        err
      );

      setError(
        err.message ||
          "Failed to create leave request."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     VIEW
  ===================================================== */

  const handleView = (leave) => {
    setSelectedLeave(leave);
  };

  const closeLeaveDetails = () => {
    setSelectedLeave(null);
  };

  /* =====================================================
     UPDATE STATUS
  ===================================================== */

  const updateLeaveStatus = async (
    id,
    newStatus
  ) => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "PUT",

          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update leave status"
        );
      }

      await fetchLeaveData();

      return true;
    } catch (err) {
      console.error(
        "Error updating leave status:",
        err
      );

      setError(
        err.message ||
          "Failed to update leave status."
      );

      return false;
    }
  };

  /* =====================================================
     APPROVE
  ===================================================== */

  const handleApprove = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this leave application?"
    );

    if (!confirmed) {
      return;
    }

    const success = await updateLeaveStatus(
      id,
      "Approved"
    );

    if (
      success &&
      selectedLeave &&
      selectedLeave.id === id
    ) {
      setSelectedLeave(null);
    }
  };

  /* =====================================================
     REJECT
  ===================================================== */

  const handleReject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this leave application?"
    );

    if (!confirmed) {
      return;
    }

    const success = await updateLeaveStatus(
      id,
      "Rejected"
    );

    if (
      success &&
      selectedLeave &&
      selectedLeave.id === id
    ) {
      setSelectedLeave(null);
    }
  };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this leave application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete leave application"
        );
      }

      setLeaveData((currentData) =>
        currentData.filter(
          (item) => item.id !== id
        )
      );

      if (
        selectedLeave &&
        selectedLeave.id === id
      ) {
        setSelectedLeave(null);
      }
    } catch (err) {
      console.error(
        "Error deleting leave:",
        err
      );

      setError(
        err.message ||
          "Failed to delete leave application."
      );
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="leave-layout">

      {/* SIDEBAR */}

      <div className="leave-sidebar">
        <Sidebar />
      </div>

      {/* MAIN CONTENT */}

      <main className="leave-page">

        <div className="leave-content">

          {/* HEADER */}

          <div className="leave-header">

            <div className="leave-title-section">

              <div className="leave-title-icon">
                <FaCalendarAlt />
              </div>

              <div className="leave-title-text">

                <h1>
                  Leave Management
                </h1>

                <p>
                  Manage employee leave
                  applications and requests
                </p>

              </div>

            </div>

            <div className="leave-header-actions">

              <button
                type="button"
                className="refresh-btn"
                onClick={handleRefresh}
              >
                <FaSyncAlt />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                className="add-leave-btn"
                onClick={handleAddLeave}
              >
                <FaPlus />
                <span>Add Leave</span>
              </button>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="leave-error">

              <FaTimesCircle />

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
              >
                <FaTimes />
              </button>

            </div>
          )}

          {/* STATISTICS */}

          <div className="leave-statistics">

            <div className="leave-stat-card total-card">

              <div className="stat-icon">
                <FaFileAlt />
              </div>

              <div className="stat-info">

                <span>
                  Total Applications
                </span>

                <strong>
                  {totalApplications}
                </strong>

                <small>
                  All leave applications
                </small>

              </div>

            </div>

            <div className="leave-stat-card approved-card">

              <div className="stat-icon">
                <FaCheckCircle />
              </div>

              <div className="stat-info">

                <span>Approved</span>

                <strong>
                  {approved}
                </strong>

                <small>
                  Approved applications
                </small>

              </div>

            </div>

            <div className="leave-stat-card pending-card">

              <div className="stat-icon">
                <FaClock />
              </div>

              <div className="stat-info">

                <span>Pending</span>

                <strong>
                  {pending}
                </strong>

                <small>
                  Waiting for approval
                </small>

              </div>

            </div>

            <div className="leave-stat-card rejected-card">

              <div className="stat-icon">
                <FaTimesCircle />
              </div>

              <div className="stat-info">

                <span>Rejected</span>

                <strong>
                  {rejected}
                </strong>

                <small>
                  Rejected applications
                </small>

              </div>

            </div>

            <div className="leave-stat-card days-card">

              <div className="stat-icon">
                <FaCalendarAlt />
              </div>

              <div className="stat-info">

                <span>
                  Total Leave Days
                </span>

                <strong>
                  {totalLeaveDays}
                </strong>

                <small>
                  Days requested
                </small>

              </div>

            </div>

          </div>

          {/* TABLE */}

          <div className="leave-table-container">

            {/* FILTERS */}

            <div className="leave-filters">

              <div className="filter-select">

                <FaCalendarAlt />

                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All Dates
                  </option>

                  <option>
                    Today
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

              <div className="filter-select">

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
                </select>

                <FaChevronDown />

              </div>

              {/* DATABASE LEAVE TYPE FILTER */}

              <div className="filter-select">

                <select
                  value={leaveType}
                  onChange={(event) =>
                    setLeaveType(
                      event.target.value
                    )
                  }
                >

                  <option value="All Types">
                    All Types
                  </option>

                  {leaveTypes.map(
                    (type) => (
                      <option
                        key={type.id}
                        value={type.leave_type}
                      >
                        {type.leave_type}
                      </option>
                    )
                  )}

                </select>

                <FaChevronDown />

              </div>

              <div className="filter-select">

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
                    Approved
                  </option>

                  <option>
                    Pending
                  </option>

                  <option>
                    Rejected
                  </option>
                </select>

                <FaChevronDown />

              </div>

              <div className="leave-search">

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

            <div className="table-wrapper">

              <table className="leave-table">

                <thead>

                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>

                </thead>

                <tbody>

                  {loading ? (

                    <tr>

                      <td
                        colSpan="8"
                        className="no-data"
                      >

                        <FaSyncAlt className="loading-icon" />

                        <span>
                          Loading leave applications...
                        </span>

                      </td>

                    </tr>

                  ) : filteredData.length > 0 ? (

                    filteredData.map(
                      (leave) => {

                        const displayLeaveType =
                          leave.leaveType ||
                          leave.leave_type ||
                          "";

                        const displayStartDate =
                          leave.startDate ||
                          leave.start_date ||
                          "";

                        const displayEndDate =
                          leave.endDate ||
                          leave.end_date ||
                          "";

                        const displayDays =
                          leave.days ??
                          leave.total_days ??
                          0;

                        const displayEmployeeId =
                          leave.employeeId ||
                          leave.employee_code ||
                          "";

                        const displayDepartment =
                          leave.department ||
                          leave.department_name ||
                          "";

                        return (
                          <tr key={leave.id}>

                            <td>

                              <div className="employee-cell">

                                <div className="employee-avatar">

                                  {leave.employee
                                    ?.charAt(0)
                                    ?.toUpperCase()}

                                </div>

                                <div className="employee-details">

                                  <strong>
                                    {leave.employee}
                                  </strong>

                                  <span>
                                    {displayEmployeeId}
                                  </span>

                                </div>

                              </div>

                            </td>

                            <td>
                              {displayDepartment ||
                                "No Department"}
                            </td>

                            <td>

                              <span
                                className={`leave-type ${String(
                                  displayLeaveType
                                )
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )}`}
                              >
                                {displayLeaveType}
                              </span>

                            </td>

                            <td>
                              {displayStartDate}
                            </td>

                            <td>
                              {displayEndDate}
                            </td>

                            <td>

                              <strong className="days-number">
                                {displayDays}
                              </strong>

                            </td>

                            <td>

                              <span
                                className={`status-badge ${String(
                                  leave.status
                                ).toLowerCase()}`}
                              >
                                {leave.status}
                              </span>

                            </td>

                            <td>

                              <div className="action-buttons">

                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  onClick={() =>
                                    handleView(
                                      leave
                                    )
                                  }
                                  title="View"
                                >
                                  <FaEye />

                                  <span>
                                    View
                                  </span>
                                </button>

                                {leave.status ===
                                  "Pending" && (

                                  <>

                                    <button
                                      type="button"
                                      className="action-btn approve-btn"
                                      onClick={() =>
                                        handleApprove(
                                          leave.id
                                        )
                                      }
                                      title="Approve"
                                    >
                                      <FaCheck />

                                      <span>
                                        Approve
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      className="action-btn reject-btn"
                                      onClick={() =>
                                        handleReject(
                                          leave.id
                                        )
                                      }
                                      title="Reject"
                                    >
                                      <FaTimes />

                                      <span>
                                        Reject
                                      </span>
                                    </button>

                                  </>

                                )}

                                <button
                                  type="button"
                                  className="action-btn delete-btn"
                                  onClick={() =>
                                    handleDelete(
                                      leave.id
                                    )
                                  }
                                  title="Delete"
                                >
                                  <FaTrash />

                                  <span>
                                    Delete
                                  </span>
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="8"
                        className="no-data"
                      >
                        No leave applications found.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            {/* FOOTER */}

            <div className="leave-table-footer">

              <span>

                Showing{" "}
                {filteredData.length}{" "}
                of{" "}
                {leaveData.length}{" "}
                leave applications

              </span>

              <div className="pagination">

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
            VIEW LEAVE MODAL
        ================================================= */}

        {selectedLeave && (

          <div
            className="leave-modal-overlay"
            onClick={closeLeaveDetails}
            role="presentation"
          >

            <div
              className="leave-details-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="leave-modal-header">

                <div className="leave-modal-title">

                  <div className="leave-modal-icon">
                    <FaFileAlt />
                  </div>

                  <div>

                    <h2>
                      Leave Details
                    </h2>

                    <p>
                      Employee leave application
                      information
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="leave-modal-close"
                  onClick={
                    closeLeaveDetails
                  }
                >
                  <FaTimes />
                </button>

              </div>

              <div className="leave-modal-body">

                <div className="leave-profile-card">

                  <div className="leave-profile-avatar">

                    {selectedLeave.employee
                      ?.charAt(0)
                      ?.toUpperCase()}

                  </div>

                  <div className="leave-profile-info">

                    <h3>
                      {selectedLeave.employee}
                    </h3>

                    <span>
                      {selectedLeave.employeeId ||
                        selectedLeave.employee_code}
                    </span>

                    <small>
                      {selectedLeave.department ||
                        selectedLeave.department_name ||
                        "No Department"}
                    </small>

                  </div>

                  <span
                    className={`modal-status-badge ${String(
                      selectedLeave.status
                    ).toLowerCase()}`}
                  >
                    {selectedLeave.status}
                  </span>

                </div>

                <div className="leave-detail-grid">

                  <div className="leave-detail-item">

                    <span>
                      Leave Type
                    </span>

                    <strong>
                      {selectedLeave.leaveType ||
                        selectedLeave.leave_type}
                    </strong>

                  </div>

                  <div className="leave-detail-item">

                    <span>
                      Total Days
                    </span>

                    <strong>

                      {selectedLeave.days ??
                        selectedLeave.total_days ??
                        0}{" "}

                      {Number(
                        selectedLeave.days ??
                        selectedLeave.total_days ??
                        0
                      ) === 1
                        ? "Day"
                        : "Days"}

                    </strong>

                  </div>

                  <div className="leave-detail-item">

                    <span>
                      Start Date
                    </span>

                    <strong>
                      {selectedLeave.startDate ||
                        selectedLeave.start_date}
                    </strong>

                  </div>

                  <div className="leave-detail-item">

                    <span>
                      End Date
                    </span>

                    <strong>
                      {selectedLeave.endDate ||
                        selectedLeave.end_date}
                    </strong>

                  </div>

                </div>

                <div className="leave-reason-box">

                  <span>
                    Reason
                  </span>

                  <p>
                    {selectedLeave.reason ||
                      "No reason provided."}
                  </p>

                </div>

                <div className="leave-timeline">

                  <div className="timeline-line"></div>

                  <div className="timeline-item">

                    <div className="timeline-dot"></div>

                    <div>

                      <span>
                        Leave Starts
                      </span>

                      <strong>
                        {selectedLeave.startDate ||
                          selectedLeave.start_date}
                      </strong>

                    </div>

                  </div>

                  <div className="timeline-item">

                    <div className="timeline-dot"></div>

                    <div>

                      <span>
                        Leave Ends
                      </span>

                      <strong>
                        {selectedLeave.endDate ||
                          selectedLeave.end_date}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

              <div className="leave-modal-footer">

                <span>

                  Application #
                  {String(
                    selectedLeave.id
                  ).padStart(4, "0")}

                </span>

                <div className="leave-modal-actions">

                  {selectedLeave.status ===
                    "Pending" && (

                    <>

                      <button
                        type="button"
                        className="modal-action reject"
                        onClick={() =>
                          handleReject(
                            selectedLeave.id
                          )
                        }
                      >
                        <FaTimes />
                        Reject
                      </button>

                      <button
                        type="button"
                        className="modal-action approve"
                        onClick={() =>
                          handleApprove(
                            selectedLeave.id
                          )
                        }
                      >
                        <FaCheck />
                        Approve
                      </button>

                    </>

                  )}

                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={
                      closeLeaveDetails
                    }
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            ADD LEAVE MODAL
        ================================================= */}

        {showAddModal && (

          <div
            className="leave-modal-overlay"
            onClick={() =>
              !saving &&
              setShowAddModal(false)
            }
            role="presentation"
          >

            <div
              className="leave-add-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="leave-modal-header">

                <div className="leave-modal-title">

                  <div className="leave-modal-icon">
                    <FaPlus />
                  </div>

                  <div>

                    <h2>
                      Add Leave
                    </h2>

                    <p>
                      Create a new employee leave
                      application
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="leave-modal-close"
                  disabled={saving}
                  onClick={() =>
                    setShowAddModal(false)
                  }
                >
                  <FaTimes />
                </button>

              </div>

              <form
                onSubmit={
                  handleSubmitLeave
                }
              >

                <div className="leave-add-body">

                  {/* EMPLOYEE */}

                  <div className="leave-form-group">

                    <label>
                      Employee
                    </label>

                    <select
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
                        {employees.length === 0
                          ? "No employees available"
                          : "Select Employee"}
                      </option>

                      {employees.map(
                        (employee) => (

                          <option
                            key={employee.id}
                            value={employee.id}
                          >
                            {employee.first_name}{" "}
                            {employee.last_name}
                            {" - "}
                            {employee.employee_code}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                  {/* LEAVE TYPE FROM DATABASE */}

                  <div className="leave-form-group">

                    <label>
                      Leave Type
                    </label>

                    <select
                      name="leave_type"
                      value={
                        formData.leave_type
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                      disabled={
                        leaveTypes.length === 0
                      }
                    >

                      {leaveTypes.length === 0 ? (

                        <option value="">
                          No active leave types available
                        </option>

                      ) : (

                        leaveTypes.map(
                          (type) => (

                            <option
                              key={type.id}
                              value={type.leave_type}
                            >
                              {type.leave_type}
                            </option>

                          )
                        )

                      )}

                    </select>

                  </div>

                  {/* DATES */}

                  <div className="leave-form-row">

                    <div className="leave-form-group">

                      <label>
                        Start Date
                      </label>

                      <input
                        type="date"
                        name="start_date"
                        value={
                          formData.start_date
                        }
                        onChange={
                          handleFormChange
                        }
                        required
                      />

                    </div>

                    <div className="leave-form-group">

                      <label>
                        End Date
                      </label>

                      <input
                        type="date"
                        name="end_date"
                        value={
                          formData.end_date
                        }
                        onChange={
                          handleFormChange
                        }
                        required
                      />

                    </div>

                  </div>

                  {/* REASON */}

                  <div className="leave-form-group">

                    <label>
                      Reason
                    </label>

                    <textarea
                      name="reason"
                      value={
                        formData.reason
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Enter reason for leave..."
                      rows="4"
                    />

                  </div>

                </div>

                {/* FOOTER */}

                <div className="leave-add-footer">

                  <button
                    type="button"
                    className="modal-close-btn"
                    disabled={saving}
                    onClick={() =>
                      setShowAddModal(false)
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="modal-action approve"
                    disabled={
                      saving ||
                      employees.length === 0 ||
                      leaveTypes.length === 0
                    }
                  >

                    {saving ? (

                      <>
                        <FaSyncAlt className="loading-icon" />
                        Saving...
                      </>

                    ) : (

                      <>
                        <FaCheck />
                        Create Leave
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

export default Leave;