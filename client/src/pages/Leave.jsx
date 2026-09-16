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
    leave_type: "Annual Leave",
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
        throw new Error(
          "Failed to fetch leave applications"
        );
      }

      const data = await response.json();

      setLeaveData(data);

    } catch (err) {
      console.error(
        "Error fetching leave data:",
        err
      );

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
      const response = await fetch(buildApiUrl("/employees"), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          "Failed to fetch employees"
        );
      }

      const data = await response.json();

      setEmployees(data);

    } catch (err) {
      console.error(
        "Error fetching employees:",
        err
      );
    }
  };


  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    fetchLeaveData();
    fetchEmployees();
  }, []);


  /* =====================================================
     STATISTICS
  ===================================================== */

  const totalApplications =
    leaveData.length;

  const approved =
    leaveData.filter(
      (item) =>
        item.status === "Approved"
    ).length;

  const pending =
    leaveData.filter(
      (item) =>
        item.status === "Pending"
    ).length;

  const rejected =
    leaveData.filter(
      (item) =>
        item.status === "Rejected"
    ).length;

  const totalLeaveDays =
    leaveData.reduce(
      (total, item) =>
        total + Number(item.days || 0),
      0
    );


  /* =====================================================
     DATE FILTER
  ===================================================== */

  const isDateMatch = (item) => {
    if (dateFilter === "All Dates") {
      return true;
    }

    const startDate = new Date(
      item.startDate
    );

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (dateFilter === "Today") {
      return (
        startDate.toDateString() ===
        today.toDateString()
      );
    }

    if (dateFilter === "This Week") {
      const weekStart =
        new Date(today);

      weekStart.setDate(
        today.getDate() -
          today.getDay()
      );

      const weekEnd =
        new Date(weekStart);

      weekEnd.setDate(
        weekStart.getDate() + 6
      );

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

  const filteredData =
    leaveData.filter((item) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim();

      const employeeName =
        String(
          item.employee || ""
        ).toLowerCase();

      const employeeId =
        String(
          item.employeeId || ""
        ).toLowerCase();

      const searchMatch =
        !search ||
        employeeName.includes(search) ||
        employeeId.includes(search);

      const departmentMatch =
        department ===
          "All Departments" ||
        item.department ===
          department;

      const leaveTypeMatch =
        leaveType === "All Types" ||
        item.leaveType ===
          leaveType;

      const statusMatch =
        status === "All Status" ||
        item.status === status;

      const dateMatch =
        isDateMatch(item);

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
  };


  /* =====================================================
     ADD LEAVE BUTTON
  ===================================================== */

  const handleAddLeave = () => {
    setFormData({
      employee_id: "",
      leave_type: "Annual Leave",
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
    const { name, value } =
      event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };


  /* =====================================================
     CREATE LEAVE
  ===================================================== */

  const handleSubmitLeave = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.employee_id ||
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

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        API_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            formData
          ),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to create leave request"
        );
      }

      setShowAddModal(false);

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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data =
        await response.json();

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
    const confirmed =
      window.confirm(
        "Are you sure you want to approve this leave application?"
      );

    if (!confirmed) {
      return;
    }

    await updateLeaveStatus(
      id,
      "Approved"
    );

    if (
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
    const confirmed =
      window.confirm(
        "Are you sure you want to reject this leave application?"
      );

    if (!confirmed) {
      return;
    }

    await updateLeaveStatus(
      id,
      "Rejected"
    );

    if (
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
    const confirmed =
      window.confirm(
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
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete leave application"
        );
      }

      setLeaveData(
        (currentData) =>
          currentData.filter(
            (item) =>
              item.id !== id
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


              <div className="filter-select">

                <select
                  value={leaveType}
                  onChange={(event) =>
                    setLeaveType(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All Types
                  </option>

                  <option>
                    Annual Leave
                  </option>

                  <option>
                    Sick Leave
                  </option>

                  <option>
                    Family Leave
                  </option>

                  <option>
                    Other Leave
                  </option>
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
                      (leave) => (

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
                                  {leave.employeeId}
                                </span>

                              </div>

                            </div>

                          </td>


                          <td>
                            {leave.department ||
                              "No Department"}
                          </td>


                          <td>

                            <span
                              className={`leave-type ${String(
                                leave.leaveType
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {leave.leaveType}
                            </span>

                          </td>


                          <td>
                            {leave.startDate}
                          </td>


                          <td>
                            {leave.endDate}
                          </td>


                          <td>
                            <strong className="days-number">
                              {leave.days}
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

                      )
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
            onClick={
              closeLeaveDetails
            }
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
                      {selectedLeave.employeeId}
                    </span>

                    <small>
                      {selectedLeave.department ||
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
                      {selectedLeave.leaveType}
                    </strong>
                  </div>


                  <div className="leave-detail-item">
                    <span>
                      Total Days
                    </span>

                    <strong>
                      {selectedLeave.days}{" "}
                      {Number(
                        selectedLeave.days
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
                      {selectedLeave.startDate}
                    </strong>
                  </div>


                  <div className="leave-detail-item">
                    <span>
                      End Date
                    </span>

                    <strong>
                      {selectedLeave.endDate}
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
                        {selectedLeave.startDate}
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
                        {selectedLeave.endDate}
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
                        Select Employee
                      </option>

                      {employees.map(
                        (employee) => (

                          <option
                            key={employee.id}
                            value={employee.id}
                          >
                            {employee.employee}
                            {" - "}
                            {employee.employeeId}
                          </option>

                        )
                      )}

                    </select>

                  </div>


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
                    >

                      <option>
                        Annual Leave
                      </option>

                      <option>
                        Sick Leave
                      </option>

                      <option>
                        Family Leave
                      </option>

                      <option>
                        Other Leave
                      </option>

                    </select>

                  </div>


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
                    disabled={saving}
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