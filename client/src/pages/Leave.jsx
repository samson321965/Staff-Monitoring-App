import React, { useEffect, useMemo, useState } from "react";

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

// ======================================================
// API URL
// ======================================================

// Remove trailing slash from buildApiUrl()
// so we never create /api//leaves
const API_URL = buildApiUrl().replace(/\/+$/, "");
const LEAVES_URL = `${API_URL}/leaves`;

console.log("Leave API URL:", LEAVES_URL);

// ======================================================
// LEAVE TYPES
// ======================================================

const LEAVE_TYPES = [
  "Annual Leave",
  "Medical Leave",
  "Sabbatical Leave",
  "Secondment",
  "Study Leave",
];

// ======================================================
// EMPTY FORM
// ======================================================

const EMPTY_FORM = {
  employee_id: "",
  leave_type: "Annual Leave",

  work_location: "",
  supervisor_name: "",

  start_date: "",
  end_date: "",
  total_working_days: 0,

  travel_claim: false,

  medical_certificate_status: "Attached",

  requested_duration_months: "",
  purpose_justification: "",

  funding_arrangement: "",
  funding_explanation: "",

  study_program: "",
  institution: "",
  study_location: "",
  payroll_no: "",
  bonding_agreement: false,

  reason: "",
};

// ======================================================
// FORMAT DATE
// ======================================================

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ======================================================
// CALCULATE WORKING DAYS
// ======================================================

const calculateWorkingDays = (start, end) => {
  if (!start || !end) return 0;

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();

    if (day !== 0 && day !== 6) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
};

// ======================================================
// LEAVE COMPONENT
// ======================================================

const Leave = () => {
  // ====================================================
  // FILTER STATES
  // ====================================================

  const [searchTerm, setSearchTerm] = useState("");
  const [department, setDepartment] =
    useState("All Departments");
  const [leaveType, setLeaveType] =
    useState("All Types");
  const [status, setStatus] =
    useState("All Status");
  const [dateFilter, setDateFilter] =
    useState("All Dates");

  // ====================================================
  // DATA STATES
  // ====================================================

  const [leaveData, setLeaveData] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [selectedLeave, setSelectedLeave] =
    useState(null);

  // ====================================================
  // MODAL / FORM STATES
  // ====================================================

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [formData, setFormData] =
    useState(EMPTY_FORM);

  // ====================================================
  // LOADING STATES
  // ====================================================

  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);

  // ====================================================
  // MESSAGE STATES
  // ====================================================

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  // ====================================================
  // LOAD LEAVE REQUESTS
  // ====================================================

  const loadLeaves = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "Loading leave requests from:",
        LEAVES_URL
      );

      const response = await fetch(LEAVES_URL, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      console.log(
        "Leaves API status:",
        response.status
      );

      const responseText = await response.text();

      console.log(
        "Leaves API response:",
        responseText
      );

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch (parseError) {
        console.error(
          "Leave API JSON parse error:",
          parseError
        );

        throw new Error(
          `Leave API returned invalid JSON. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Unable to load leave requests. HTTP ${response.status}`
        );
      }

      if (!Array.isArray(data)) {
        console.error(
          "Expected leave API to return an array:",
          data
        );

        throw new Error(
          "Leave API did not return a list of leave applications."
        );
      }

      setLeaveData(data);
    } catch (err) {
      console.error(
        "Load leaves error:",
        err
      );

      setError(
        err.message ||
          "Unable to connect to the Leave API."
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // LOAD EMPLOYEES
  // ====================================================

  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);

      setError("");

      const employeesUrl =
        `${LEAVES_URL}/employees`;

      console.log(
        "Loading employees from:",
        employeesUrl
      );

      const response = await fetch(
        employeesUrl,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      console.log(
        "Employees API status:",
        response.status
      );

      const responseText =
        await response.text();

      console.log(
        "Employees API response:",
        responseText
      );

      let data = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch (parseError) {
        console.error(
          "Employees API JSON parse error:",
          parseError
        );

        throw new Error(
          `Employees API returned invalid JSON. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `Unable to load employees. HTTP ${response.status}`
        );
      }

      if (!Array.isArray(data)) {
        console.error(
          "Expected employees API to return an array:",
          data
        );

        throw new Error(
          "Employees API did not return a list of employees."
        );
      }

      setEmployees(data);
    } catch (err) {
      console.error(
        "Load employees error:",
        err
      );

      setError(
        err.message ||
          "Unable to load employees for the leave form."
      );
    } finally {
      setEmployeesLoading(false);
    }
  };

  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    loadLeaves();
    loadEmployees();
  }, []);

  // ====================================================
  // EMPLOYEE CHANGE
  // ====================================================

  const handleEmployeeChange = (event) => {
    const employeeId =
      event.target.value;

    const selectedEmployee =
      employees.find(
        (employee) =>
          String(employee.id) ===
          String(employeeId)
      );

    setFormData((current) => ({
      ...current,

      employee_id: employeeId,

      work_location:
        selectedEmployee?.workLocation || "",

      supervisor_name:
        selectedEmployee?.supervisor || "",
    }));
  };

  // ====================================================
  // FORM CHANGE
  // ====================================================

  const handleFormChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((current) => ({
      ...current,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // ====================================================
  // DATE CHANGE
  // ====================================================

  const handleDateChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      updated.total_working_days =
        calculateWorkingDays(
          updated.start_date,
          updated.end_date
        );

      return updated;
    });
  };

  // ====================================================
  // OPEN ADD FORM
  // ====================================================

  const handleAddLeave = () => {
    setError("");
    setSuccessMessage("");

    setFormData({
      ...EMPTY_FORM,
      leave_type: "Annual Leave",
    });

    setShowAddModal(true);
  };

  // ====================================================
  // CLOSE ADD FORM
  // ====================================================

  const closeAddModal = () => {
    if (saving) return;

    setShowAddModal(false);
    setFormData({
      ...EMPTY_FORM,
    });
  };

  // ====================================================
  // SUBMIT LEAVE FORM
  // ====================================================

  const handleSubmitLeave = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    // -----------------------------------------------
    // Employee validation
    // -----------------------------------------------

    if (!formData.employee_id) {
      setError(
        "Please select an employee."
      );
      return;
    }

    // -----------------------------------------------
    // Date validation
    // -----------------------------------------------

    if (
      !formData.start_date ||
      !formData.end_date
    ) {
      setError(
        "Please enter the start date and end date."
      );
      return;
    }

    if (
      new Date(
        `${formData.end_date}T00:00:00`
      ) <
      new Date(
        `${formData.start_date}T00:00:00`
      )
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    // -----------------------------------------------
    // Sabbatical validation
    // -----------------------------------------------

    if (
      formData.leave_type ===
      "Sabbatical Leave"
    ) {
      if (
        !formData.purpose_justification.trim()
      ) {
        setError(
          "Please enter the purpose / justification."
        );
        return;
      }
    }

    // -----------------------------------------------
    // Secondment validation
    // -----------------------------------------------

    if (
      formData.leave_type ===
        "Secondment" ||
      formData.leave_type ===
        "Study Leave"
    ) {
      if (
        !formData.purpose_justification.trim()
      ) {
        setError(
          "Please enter the purpose / justification."
        );
        return;
      }
    }

    // -----------------------------------------------
    // Study leave validation
    // -----------------------------------------------

    if (
      formData.leave_type ===
      "Study Leave"
    ) {
      if (
        !formData.study_program.trim()
      ) {
        setError(
          "Please enter the study program."
        );
        return;
      }

      if (
        !formData.institution.trim()
      ) {
        setError(
          "Please enter the institution / university."
        );
        return;
      }
    }

    // =================================================
    // SAVE
    // =================================================

    try {
      setSaving(true);

      const payload = {
        ...formData,

        total_working_days:
          calculateWorkingDays(
            formData.start_date,
            formData.end_date
          ),
      };

      console.log(
        "Submitting leave:",
        payload
      );

      const response = await fetch(
        LEAVES_URL,
        {
          method: "POST",

          headers: {
            ...getAuthHeaders(),
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      console.log(
        "Create leave response:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to create leave request."
        );
      }

      setSuccessMessage(
        data.message ||
          "Leave request created successfully."
      );

      setShowAddModal(false);

      setFormData({
        ...EMPTY_FORM,
      });

      await loadLeaves();
    } catch (err) {
      console.error(
        "Create leave error:",
        err
      );

      setError(
        err.message ||
          "Unable to save the leave request."
      );
    } finally {
      setSaving(false);
    }
  };

  // ====================================================
  // APPROVE
  // ====================================================

  const handleApprove = async (id) => {
    if (
      !window.confirm(
        "Approve this leave request?"
      )
    ) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${LEAVES_URL}/${id}/approve`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to approve leave request."
        );
      }

      setSuccessMessage(
        data.message ||
          "Leave request approved successfully."
      );

      await loadLeaves();

      if (
        selectedLeave?.id === id
      ) {
        setSelectedLeave(null);
      }
    } catch (err) {
      console.error(
        "Approve leave error:",
        err
      );

      setError(
        err.message ||
          "Unable to approve leave request."
      );
    }
  };

  // ====================================================
  // REJECT
  // ====================================================

  const handleReject = async (id) => {
    if (
      !window.confirm(
        "Reject this leave request?"
      )
    ) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${LEAVES_URL}/${id}/reject`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to reject leave request."
        );
      }

      setSuccessMessage(
        data.message ||
          "Leave request rejected successfully."
      );

      await loadLeaves();

      if (
        selectedLeave?.id === id
      ) {
        setSelectedLeave(null);
      }
    } catch (err) {
      console.error(
        "Reject leave error:",
        err
      );

      setError(
        err.message ||
          "Unable to reject leave request."
      );
    }
  };

  // ====================================================
  // DELETE
  // ====================================================

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this leave application?"
      )
    ) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${LEAVES_URL}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to delete leave request."
        );
      }

      setSuccessMessage(
        data.message ||
          "Leave request deleted successfully."
      );

      await loadLeaves();

      if (
        selectedLeave?.id === id
      ) {
        setSelectedLeave(null);
      }
    } catch (err) {
      console.error(
        "Delete leave error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete leave request."
      );
    }
  };

  // ====================================================
  // DEPARTMENTS
  // ====================================================

  const departments = useMemo(() => {
    const values = leaveData
      .map(
        (item) =>
          item.department
      )
      .filter(Boolean);

    return [
      ...new Set(values),
    ].sort();
  }, [leaveData]);

  // ====================================================
  // FILTER DATA
  // ====================================================

  const filteredData = useMemo(() => {
    const search =
      searchTerm
        .toLowerCase()
        .trim();

    const now = new Date();

    return leaveData.filter(
      (item) => {
        const employeeName =
          item.employee || "";

        const employeeId =
          item.employeeId || "";

        const searchMatch =
          !search ||
          employeeName
            .toLowerCase()
            .includes(search) ||
          employeeId
            .toLowerCase()
            .includes(search);

        const departmentMatch =
          department ===
            "All Departments" ||
          item.department ===
            department;

        const leaveTypeMatch =
          leaveType ===
            "All Types" ||
          item.leaveType ===
            leaveType;

        const statusMatch =
          status === "All Status" ||
          item.status === status;

        let dateMatch = true;

        if (
          dateFilter !==
          "All Dates"
        ) {
          const start =
            new Date(
              `${item.startDate}T00:00:00`
            );

          const end =
            new Date(
              `${item.endDate}T23:59:59`
            );

          if (
            !Number.isNaN(
              start.getTime()
            )
          ) {
            // -----------------------------------------
            // TODAY
            // -----------------------------------------

            if (
              dateFilter === "Today"
            ) {
              dateMatch =
                now >= start &&
                now <= end;
            }

            // -----------------------------------------
            // THIS WEEK
            // -----------------------------------------

            if (
              dateFilter ===
              "This Week"
            ) {
              const weekStart =
                new Date(now);

              const day =
                weekStart.getDay();

              const diff =
                day === 0
                  ? -6
                  : 1 - day;

              weekStart.setDate(
                weekStart.getDate() +
                  diff
              );

              weekStart.setHours(
                0,
                0,
                0,
                0
              );

              const weekEnd =
                new Date(
                  weekStart
                );

              weekEnd.setDate(
                weekEnd.getDate() +
                  6
              );

              weekEnd.setHours(
                23,
                59,
                59,
                999
              );

              dateMatch =
                start <= weekEnd &&
                end >= weekStart;
            }

            // -----------------------------------------
            // THIS MONTH
            // -----------------------------------------

            if (
              dateFilter ===
              "This Month"
            ) {
              const monthStart =
                new Date(
                  now.getFullYear(),
                  now.getMonth(),
                  1
                );

              const monthEnd =
                new Date(
                  now.getFullYear(),
                  now.getMonth() +
                    1,
                  0,
                  23,
                  59,
                  59,
                  999
                );

              dateMatch =
                start <= monthEnd &&
                end >= monthStart;
            }
          }
        }

        return (
          searchMatch &&
          departmentMatch &&
          leaveTypeMatch &&
          statusMatch &&
          dateMatch
        );
      }
    );
  }, [
    leaveData,
    searchTerm,
    department,
    leaveType,
    status,
    dateFilter,
  ]);

  // ====================================================
  // STATISTICS
  // ====================================================

  const totalApplications =
    leaveData.length;

  const approved =
    leaveData.filter(
      (item) =>
        item.status ===
        "Approved"
    ).length;

  const pending =
    leaveData.filter(
      (item) =>
        item.status ===
        "Pending"
    ).length;

  const rejected =
    leaveData.filter(
      (item) =>
        item.status ===
        "Rejected"
    ).length;

  const totalLeaveDays =
    leaveData.reduce(
      (total, item) =>
        total +
        Number(
          item.days || 0
        ),
      0
    );

  // ====================================================
  // RENDER FORM FIELDS
  // ====================================================

  const renderFormFields = () => {
    const selectedEmployee =
      employees.find(
        (employee) =>
          String(
            employee.id
          ) ===
          String(
            formData.employee_id
          )
      );

    return (
      <>
        {/* ==============================================
            EMPLOYEE INFORMATION
        ============================================== */}

        <div className="leave-form-section">
          <div className="leave-form-section-title">
            <FaFileAlt />

            <div>
              <h3>
                Employee Information
              </h3>

              <p>
                Information from the
                Staff Monitoring
                employee database.
              </p>
            </div>
          </div>

          <div className="leave-form-grid">
            <div className="leave-form-field field-full">
              <label>
                Employee{" "}
                <span>*</span>
              </label>

              <select
                name="employee_id"
                value={
                  formData.employee_id
                }
                onChange={
                  handleEmployeeChange
                }
                disabled={
                  employeesLoading ||
                  saving
                }
                required
              >
                <option value="">
                  {employeesLoading
                    ? "Loading employees..."
                    : "Select employee"}
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
                      {employee.employee}{" "}
                      —{" "}
                      {
                        employee.employeeId
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="leave-form-field">
              <label>
                Position / Job Title
              </label>

              <input
                type="text"
                value={
                  selectedEmployee?.positionTitle ||
                  ""
                }
                placeholder="Position / Job Title"
                readOnly
              />
            </div>

            <div className="leave-form-field">
              <label>
                Department / Section
              </label>

              <input
                type="text"
                value={
                  selectedEmployee
                    ? [
                        selectedEmployee.department,
                        selectedEmployee.section,
                      ]
                        .filter(Boolean)
                        .join(" / ")
                    : ""
                }
                placeholder="Department / Section"
                readOnly
              />
            </div>

            <div className="leave-form-field">
              <label>
                Work Location (Province / HQ)
              </label>

              <input
                type="text"
                name="work_location"
                value={
                  formData.work_location
                }
                onChange={
                  handleFormChange
                }
                placeholder="Province / HQ"
                disabled={saving}
              />
            </div>

            <div className="leave-form-field">
              <label>
                Supervisor
              </label>

              <input
                type="text"
                name="supervisor_name"
                value={
                  formData.supervisor_name
                }
                onChange={
                  handleFormChange
                }
                placeholder="Supervisor"
                disabled={saving}
              />
            </div>

            <div className="leave-form-field">
              <label>
                Date of Request
              </label>

              <input
                type="date"
                value={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                readOnly
              />
            </div>
          </div>
        </div>

        {/* ==============================================
            LEAVE DETAILS
        ============================================== */}

        <div className="leave-form-section">
          <div className="leave-form-section-title">
            <FaCalendarAlt />

            <div>
              <h3>
                Leave Details
              </h3>

              <p>
                Select the official
                VEO leave application
                form type.
              </p>
            </div>
          </div>

          <div className="leave-form-grid">
            <div className="leave-form-field field-full">
              <label>
                Type of Leave{" "}
                <span>*</span>
              </label>

              <select
                name="leave_type"
                value={
                  formData.leave_type
                }
                onChange={
                  handleFormChange
                }
                disabled={saving}
                required
              >
                {LEAVE_TYPES.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="leave-form-field">
              <label>
                Start Date{" "}
                <span>*</span>
              </label>

              <input
                type="date"
                name="start_date"
                value={
                  formData.start_date
                }
                onChange={
                  handleDateChange
                }
                disabled={saving}
                required
              />
            </div>

            <div className="leave-form-field">
              <label>
                End Date{" "}
                <span>*</span>
              </label>

              <input
                type="date"
                name="end_date"
                value={
                  formData.end_date
                }
                onChange={
                  handleDateChange
                }
                disabled={saving}
                required
              />
            </div>

            <div className="leave-form-field">
              <label>
                Total Working Days Requested
              </label>

              <input
                type="number"
                value={
                  formData.total_working_days
                }
                readOnly
              />

              <small>
                Calculated Monday–Friday
                only.
              </small>
            </div>
          </div>
        </div>

        {/* ==============================================
            ANNUAL LEAVE
        ============================================== */}

        {formData.leave_type ===
          "Annual Leave" && (
          <div className="leave-form-section">
            <div className="leave-form-section-title">
              <FaCalendarAlt />

              <div>
                <h3>
                  Annual Leave Travel Claim
                </h3>

                <p>
                  Form No. 14 — select
                  whether travel
                  reimbursement is
                  requested.
                </p>
              </div>
            </div>

            <label className="leave-radio-card">
              <input
                type="checkbox"
                name="travel_claim"
                checked={
                  formData.travel_claim
                }
                onChange={
                  handleFormChange
                }
                disabled={saving}
              />

              <span>
                I am requesting Annual
                Leave Travel
                reimbursement (75% of
                eligible travel cost).
              </span>
            </label>

            <p className="leave-form-note">
              If not selected, the
              application records that
              no travel reimbursement is
              requested.
            </p>
          </div>
        )}

        {/* ==============================================
            MEDICAL LEAVE
        ============================================== */}

        {formData.leave_type ===
          "Medical Leave" && (
          <div className="leave-form-section">
            <div className="leave-form-section-title">
              <FaFileAlt />

              <div>
                <h3>
                  Medical Leave
                  Certification
                </h3>

                <p>
                  Form No. 17 — medical
                  certificate information.
                </p>
              </div>
            </div>

            <div className="leave-radio-group">
              <label className="leave-radio-card">
                <input
                  type="radio"
                  name="medical_certificate_status"
                  value="Attached"
                  checked={
                    formData.medical_certificate_status ===
                    "Attached"
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={saving}
                />

                <span>
                  Medical certificate
                  attached
                </span>
              </label>

              <label className="leave-radio-card">
                <input
                  type="radio"
                  name="medical_certificate_status"
                  value="Will be submitted within 3 working days"
                  checked={
                    formData.medical_certificate_status ===
                    "Will be submitted within 3 working days"
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={saving}
                />

                <span>
                  Will be submitted within
                  three (3) working days
                </span>
              </label>
            </div>

            <div className="leave-form-note">
              Staff should notify their
              supervisor within 24 hours
              of absence.
            </div>
          </div>
        )}

        {/* ==============================================
            SABBATICAL / SECONDMENT / STUDY
        ============================================== */}

        {(formData.leave_type ===
          "Sabbatical Leave" ||
          formData.leave_type ===
            "Secondment" ||
          formData.leave_type ===
            "Study Leave") && (
          <div className="leave-form-section">
            <div className="leave-form-section-title">
              <FaFileAlt />

              <div>
                <h3>
                  {
                    formData.leave_type
                  }{" "}
                  Application
                </h3>

                <p>
                  Form No. 15 —
                  application details and
                  recommendation
                  information.
                </p>
              </div>
            </div>

            <div className="leave-form-grid">
              <div className="leave-form-field">
                <label>
                  Total Period Requested
                  (months)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.5"
                  name="requested_duration_months"
                  value={
                    formData.requested_duration_months
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="e.g. 6"
                  disabled={saving}
                />
              </div>

              <div className="leave-form-field field-full">
                <label>
                  Purpose / Justification{" "}
                  <span>*</span>
                </label>

                <textarea
                  name="purpose_justification"
                  value={
                    formData.purpose_justification
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Enter the purpose / justification..."
                  rows="4"
                  disabled={saving}
                  required
                />
              </div>

              {(formData.leave_type ===
                "Secondment" ||
                formData.leave_type ===
                  "Study Leave") && (
                <div className="leave-form-field field-full">
                  <label>
                    Funding / Salary
                    Arrangement
                  </label>

                  <select
                    name="funding_arrangement"
                    value={
                      formData.funding_arrangement
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={saving}
                  >
                    <option value="">
                      Select arrangement
                    </option>

                    <option value="Salary paid by Electoral Office">
                      Salary paid by
                      Electoral Office
                    </option>

                    <option value="Salary paid by Host Institution">
                      Salary paid by Host
                      Institution
                    </option>

                    <option value="Shared arrangement">
                      Shared arrangement
                    </option>
                  </select>
                </div>
              )}

              {formData.funding_arrangement ===
                "Shared arrangement" && (
                <div className="leave-form-field field-full">
                  <label>
                    Funding Explanation
                  </label>

                  <textarea
                    name="funding_explanation"
                    value={
                      formData.funding_explanation
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Explain the shared arrangement..."
                    rows="3"
                    disabled={saving}
                  />
                </div>
              )}
            </div>

            {/* ==========================================
                STUDY LEAVE DETAILS
            ========================================== */}

            {formData.leave_type ===
              "Study Leave" && (
              <>
                <div className="leave-subsection-title">
                  Study Details — Form
                  No. 16
                </div>

                <div className="leave-form-grid">
                  <div className="leave-form-field">
                    <label>
                      Payroll No.
                    </label>

                    <input
                      type="text"
                      name="payroll_no"
                      value={
                        formData.payroll_no
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Payroll number"
                      disabled={saving}
                    />
                  </div>

                  <div className="leave-form-field">
                    <label>
                      Study Program
                    </label>

                    <input
                      type="text"
                      name="study_program"
                      value={
                        formData.study_program
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Program / course"
                      disabled={saving}
                    />
                  </div>

                  <div className="leave-form-field">
                    <label>
                      Institution /
                      University
                    </label>

                    <input
                      type="text"
                      name="institution"
                      value={
                        formData.institution
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Institution / University"
                      disabled={saving}
                    />
                  </div>

                  <div className="leave-form-field">
                    <label>
                      Study Location
                    </label>

                    <input
                      type="text"
                      name="study_location"
                      value={
                        formData.study_location
                      }
                      onChange={
                        handleFormChange
                      }
                      placeholder="Location"
                      disabled={saving}
                    />
                  </div>
                </div>

                <label className="leave-radio-card bonding-card">
                  <input
                    type="checkbox"
                    name="bonding_agreement"
                    checked={
                      formData.bonding_agreement
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={saving}
                  />

                  <span>
                    I acknowledge the
                    Study Leave Bonding
                    Agreement and
                    understand the
                    return-to-duty and
                    bonded-service
                    conditions in Form No.
                    16.
                  </span>
                </label>
              </>
            )}
          </div>
        )}

        {/* ==============================================
            EMPLOYEE DECLARATION
        ============================================== */}

        <div className="leave-form-section">
          <div className="leave-form-section-title">
            <FaCheckCircle />

            <div>
              <h3>
                Employee Declaration
              </h3>

              <p>
                The employee confirms
                that the information
                provided is true and
                accurate.
              </p>
            </div>
          </div>

          <div className="leave-form-note">
            Submitting this digital
            application records the
            employee's declaration for
            the selected VEO leave form.
          </div>

          <div className="leave-form-field field-full">
            <label>
              Additional Comments /
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
              placeholder="Optional comments..."
              rows="3"
              disabled={saving}
            />
          </div>
        </div>
      </>
    );
  };

  // ====================================================
  // RETURN
  // ====================================================

  return (
    <div className="leave-layout">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <div className="leave-sidebar">
        <Sidebar />
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="leave-page">
        <div className="leave-content">

          {/* =============================================
              HEADER
          ============================================= */}

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
                  applications and
                  requests
                </p>
              </div>
            </div>

            <div className="leave-header-actions">

              <button
                type="button"
                className="refresh-btn"
                onClick={loadLeaves}
                disabled={loading}
              >
                <FaSyncAlt />

                <span>
                  {loading
                    ? "Loading..."
                    : "Refresh"}
                </span>
              </button>

              <button
                type="button"
                className="add-leave-btn"
                onClick={
                  handleAddLeave
                }
              >
                <FaPlus />

                <span>
                  Add Leave
                </span>
              </button>

            </div>
          </div>

          {/* =============================================
              ERROR MESSAGE
          ============================================= */}

          {error && (
            <div className="leave-alert error">

              <FaTimesCircle />

              <span>
                {error}
              </span>

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

          {/* =============================================
              SUCCESS MESSAGE
          ============================================= */}

          {successMessage && (
            <div className="leave-alert success">

              <FaCheckCircle />

              <span>
                {successMessage}
              </span>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage("")
                }
              >
                <FaTimes />
              </button>

            </div>
          )}

          {/* =============================================
              STATISTICS
          ============================================= */}

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
                <span>
                  Approved
                </span>

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
                <span>
                  Pending
                </span>

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
                <span>
                  Rejected
                </span>

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

          {/* =============================================
              TABLE
          ============================================= */}

          <div className="leave-table-container">

            {/* FILTERS */}

            <div className="leave-filters">

              <div className="filter-select">
                <FaCalendarAlt />

                <select
                  value={
                    dateFilter
                  }
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
                  value={
                    department
                  }
                  onChange={(event) =>
                    setDepartment(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All Departments
                  </option>

                  {departments.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>

                <FaChevronDown />
              </div>

              <div className="filter-select">

                <select
                  value={
                    leaveType
                  }
                  onChange={(event) =>
                    setLeaveType(
                      event.target.value
                    )
                  }
                >
                  <option>
                    All Types
                  </option>

                  {LEAVE_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

                <FaChevronDown />
              </div>

              <div className="filter-select">

                <select
                  value={
                    status
                  }
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
                  value={
                    searchTerm
                  }
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
                    <th>
                      Employee
                    </th>

                    <th>
                      Department
                    </th>

                    <th>
                      Leave Type
                    </th>

                    <th>
                      Start Date
                    </th>

                    <th>
                      End Date
                    </th>

                    <th>
                      Days
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

                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="no-data"
                      >
                        Loading leave
                        requests...
                      </td>
                    </tr>

                  ) : filteredData.length ===
                    0 ? (

                    <tr>
                      <td
                        colSpan="8"
                        className="no-data"
                      >
                        No leave
                        applications
                        found.
                      </td>
                    </tr>

                  ) : (

                    filteredData.map(
                      (leave) => (
                        <tr
                          key={
                            leave.id
                          }
                        >

                          {/* EMPLOYEE */}

                          <td>
                            <div className="employee-cell">

                              <div className="employee-avatar">
                                {(
                                  leave.employee ||
                                  "?"
                                ).charAt(0)}
                              </div>

                              <div className="employee-details">

                                <strong>
                                  {
                                    leave.employee
                                  }
                                </strong>

                                <span>
                                  {
                                    leave.employeeId
                                  }
                                </span>

                              </div>

                            </div>
                          </td>

                          {/* DEPARTMENT */}

                          <td>
                            {
                              leave.department ||
                              "-"
                            }
                          </td>

                          {/* LEAVE TYPE */}

                          <td>

                            <span
                              className={`leave-type ${String(
                                leave.leaveType ||
                                  ""
                              )
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "-"
                                )}`}
                            >
                              {
                                leave.leaveType
                              }
                            </span>

                          </td>

                          {/* START */}

                          <td>
                            {formatDate(
                              leave.startDate
                            )}
                          </td>

                          {/* END */}

                          <td>
                            {formatDate(
                              leave.endDate
                            )}
                          </td>

                          {/* DAYS */}

                          <td>
                            <strong className="days-number">
                              {
                                leave.days
                              }
                            </strong>
                          </td>

                          {/* STATUS */}

                          <td>

                            <span
                              className={`status-badge ${String(
                                leave.status ||
                                  ""
                              ).toLowerCase()}`}
                            >
                              {
                                leave.status
                              }
                            </span>

                          </td>

                          {/* ACTIONS */}

                          <td>

                            <div className="action-buttons">

                              {/* VIEW */}

                              <button
                                type="button"
                                className="action-btn view-btn"
                                onClick={() =>
                                  setSelectedLeave(
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

                              {/* APPROVE / REJECT */}

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

                              {/* DELETE */}

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
                  )}

                </tbody>
              </table>

            </div>

            {/* FOOTER */}

            <div className="leave-table-footer">
              <span>
                Showing{" "}
                {
                  filteredData.length
                }{" "}
                of{" "}
                {
                  leaveData.length
                }{" "}
                applications
              </span>
            </div>

          </div>
        </div>

        {/* =================================================
            ADD LEAVE MODAL
        ================================================= */}

        {showAddModal && (
          <div
            className="leave-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                  event.currentTarget &&
                !saving
              ) {
                closeAddModal();
              }
            }}
          >

            <div className="leave-form-modal">

              {/* MODAL HEADER */}

              <div className="leave-modal-header">

                <div className="leave-modal-title">

                  <div className="leave-modal-icon">
                    <FaCalendarAlt />
                  </div>

                  <div>

                    <h2>
                      Add Leave
                      Application
                    </h2>

                    <p>
                      VEO Staff Leave
                      Application
                    </p>

                  </div>
                </div>

                <button
                  type="button"
                  className="leave-modal-close"
                  onClick={
                    closeAddModal
                  }
                  disabled={saving}
                >
                  <FaTimes />
                </button>

              </div>

              {/* FORM */}

              <form
                className="leave-form-body"
                onSubmit={
                  handleSubmitLeave
                }
              >

                {renderFormFields()}

                {/* FORM FOOTER */}

                <div className="leave-form-footer">

                  <button
                    type="button"
                    className="modal-close-btn"
                    onClick={
                      closeAddModal
                    }
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="modal-action approve"
                    disabled={saving}
                  >

                    <FaCheck />

                    {saving
                      ? "Saving..."
                      : "Submit Leave Application"}

                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

        {/* =================================================
            DETAILS MODAL
        ================================================= */}

        {selectedLeave && (
          <div
            className="leave-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedLeave(
                  null
                );
              }
            }}
          >

            <div className="leave-details-modal">

              {/* HEADER */}

              <div className="leave-modal-header">

                <div className="leave-modal-title">

                  <div className="leave-modal-icon">
                    <FaFileAlt />
                  </div>

                  <div>

                    <h2>
                      Leave Application
                    </h2>

                    <p>
                      Application #
                      {String(
                        selectedLeave.id
                      ).padStart(
                        4,
                        "0"
                      )}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="leave-modal-close"
                  onClick={() =>
                    setSelectedLeave(
                      null
                    )
                  }
                >
                  <FaTimes />
                </button>

              </div>

              {/* BODY */}

              <div className="leave-modal-body">

                {/* PROFILE */}

                <div className="leave-profile-card">

                  <div className="leave-profile-avatar">
                    {(
                      selectedLeave.employee ||
                      "?"
                    ).charAt(0)}
                  </div>

                  <div className="leave-profile-info">

                    <h3>
                      {
                        selectedLeave.employee
                      }
                    </h3>

                    <span>
                      {
                        selectedLeave.employeeId
                      }
                    </span>

                    <small>
                      {
                        selectedLeave.department ||
                        "Department not available"
                      }
                    </small>

                  </div>

                  <span
                    className={`modal-status-badge ${String(
                      selectedLeave.status ||
                        ""
                    ).toLowerCase()}`}
                  >
                    {
                      selectedLeave.status
                    }
                  </span>

                </div>

                {/* DETAILS */}

                <div className="leave-detail-grid">

                  <div className="leave-detail-item">
                    <span>
                      Leave Type
                    </span>

                    <strong>
                      {
                        selectedLeave.leaveType
                      }
                    </strong>
                  </div>

                  <div className="leave-detail-item">
                    <span>
                      Total Days
                    </span>

                    <strong>
                      {
                        selectedLeave.days
                      }{" "}
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
                      {formatDate(
                        selectedLeave.startDate
                      )}
                    </strong>
                  </div>

                  <div className="leave-detail-item">
                    <span>
                      End Date
                    </span>

                    <strong>
                      {formatDate(
                        selectedLeave.endDate
                      )}
                    </strong>
                  </div>

                </div>

                {/* EXTRA DETAILS */}

                {(selectedLeave.reason ||
                  selectedLeave.purposeJustification ||
                  selectedLeave.travelClaim !==
                    undefined) && (

                  <div className="leave-detail-extra">

                    {selectedLeave.travelClaim !==
                      undefined && (
                      <div>

                        <span>
                          Annual Leave
                          Travel Claim
                        </span>

                        <strong>
                          {selectedLeave.travelClaim
                            ? "Requested"
                            : "Not Requested"}
                        </strong>

                      </div>
                    )}

                    {selectedLeave.medicalCertificateStatus && (
                      <div>

                        <span>
                          Medical
                          Certificate
                        </span>

                        <strong>
                          {
                            selectedLeave.medicalCertificateStatus
                          }
                        </strong>

                      </div>
                    )}

                    {(selectedLeave.reason ||
                      selectedLeave.purposeJustification) && (

                      <div className="detail-full">

                        <span>
                          Purpose / Reason
                        </span>

                        <strong>
                          {
                            selectedLeave.purposeJustification ||
                            selectedLeave.reason
                          }
                        </strong>

                      </div>
                    )}

                  </div>
                )}

              </div>

              {/* FOOTER */}

              <div className="leave-modal-footer">

                <span>
                  Created{" "}
                  {selectedLeave.createdAt
                    ? formatDate(
                        String(
                          selectedLeave.createdAt
                        ).split(
                          "T"
                        )[0]
                      )
                    : ""}
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
                    onClick={() =>
                      setSelectedLeave(
                        null
                      )
                    }
                  >
                    Close
                  </button>

                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default Leave;

