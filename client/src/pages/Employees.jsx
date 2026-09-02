import React, { useEffect, useState } from "react";

import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUserClock,
  FaSearch,
  FaEye,
  FaEdit,
  FaTrash,
  FaPlus,
  FaSyncAlt,
  FaTimes,
  FaSave,
} from "react-icons/fa";

import Sidebar from "../components/Sidebar";
import "../styles/Employees.css";

// ============================================================
// API URLS
// ============================================================

const API_URL = "http://localhost:5000/api/employees";

const DEPARTMENTS_API_URL =
  "http://localhost:5000/api/departments";

const POSITIONS_API_URL =
  "http://localhost:5000/api/positions";

// ============================================================
// EMPLOYEES COMPONENT
// ============================================================

function Employees() {
  // ==========================================================
  // STATE
  // ==========================================================

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // MODALS
  const [showEmployeeForm, setShowEmployeeForm] =
    useState(false);

  const [showEmployeeDetails, setShowEmployeeDetails] =
    useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  // EDIT MODE
  const [editingEmployee, setEditingEmployee] =
    useState(null);

  // FORM STATES
  const [formLoading, setFormLoading] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [formSuccess, setFormSuccess] =
    useState("");

  // ==========================================================
  // EMPLOYEE FORM
  // ==========================================================

  const initialFormData = {
    employee_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    department_id: "",
    position_id: "",
    status: "Active",
    date_joined: new Date()
      .toISOString()
      .split("T")[0],
  };

  const [formData, setFormData] =
    useState(initialFormData);

  // ==========================================================
  // GET JWT TOKEN
  // ==========================================================

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error(
        "Authentication token not found. Please login again."
      );
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // ==========================================================
  // FETCH EMPLOYEES
  // ==========================================================

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const data = await response
        .json()
        .catch(() => ({}));

      console.log(
        "Employee API response:",
        response.status,
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch employees"
        );
      }

      const formattedEmployees = data.map(
        (employee) => ({
          id: employee.id,

          employee_id:
            employee.employee_id,

          name: `${employee.first_name || ""} ${
            employee.last_name || ""
          }`.trim(),

          first_name:
            employee.first_name || "",

          last_name:
            employee.last_name || "",

          email:
            employee.email || "",

          department:
            employee.department_name ||
            "No Department",

          position:
            employee.position_name ||
            "No Position",

          phone:
            employee.phone || "",

          status:
            employee.status || "Inactive",

          date_joined:
            employee.date_joined || "",

          department_id:
            employee.department_id || "",

          position_id:
            employee.position_id || "",
        })
      );

      setEmployees(formattedEmployees);
    } catch (err) {
      console.error(
        "Error loading employees:",
        err
      );

      setError(
        err.message ||
          "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // FETCH DEPARTMENTS
  // ==========================================================

  const fetchDepartments = async () => {
    try {
      const response = await fetch(
        DEPARTMENTS_API_URL,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load departments"
        );
      }

      console.log(
        "Departments:",
        data
      );

      setDepartments(data);
    } catch (err) {
      console.error(
        "Error loading departments:",
        err
      );
    }
  };

  // ==========================================================
  // FETCH POSITIONS
  // ==========================================================

  const fetchPositions = async () => {
    try {
      const response = await fetch(
        POSITIONS_API_URL,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load positions"
        );
      }

      console.log(
        "Positions:",
        data
      );

      setPositions(data);
    } catch (err) {
      console.error(
        "Error loading positions:",
        err
      );
    }
  };

  // ==========================================================
  // GENERATE NEXT EMPLOYEE ID
  // ==========================================================

  const generateNextEmployeeId = (
    employeeList
  ) => {
    if (
      !employeeList ||
      employeeList.length === 0
    ) {
      return "EMP001";
    }

    let highestNumber = 0;

    employeeList.forEach((employee) => {
      const employeeId =
        employee.employee_id || "";

      // Extract numbers from IDs like:
      // EMP001
      // EMP002
      // EMP-003
      const numbers =
        employeeId.toString().match(/\d+/g);

      if (numbers) {
        const number = parseInt(
          numbers.join(""),
          10
        );

        if (number > highestNumber) {
          highestNumber = number;
        }
      }
    });

    const nextNumber =
      highestNumber + 1;

    return `EMP${String(
      nextNumber
    ).padStart(3, "0")}`;
  };

  // ==========================================================
  // LOAD DATA WHEN PAGE OPENS
  // ==========================================================

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchPositions();
  }, []);

  // ==========================================================
  // SEARCH / FILTER EMPLOYEES
  // ==========================================================

  const filteredEmployees =
    employees.filter((employee) =>
      Object.values(employee)
        .join(" ")
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

  // ==========================================================
  // EMPLOYEE STATISTICS
  // ==========================================================

  const totalEmployees =
    employees.length;

  const activeEmployees =
    employees.filter(
      (employee) =>
        employee.status === "Active"
    ).length;

  const employeesOnLeave =
    employees.filter(
      (employee) =>
        employee.status === "On Leave"
    ).length;

  const inactiveEmployees =
    employees.filter(
      (employee) =>
        employee.status === "Inactive"
    ).length;

  // ==========================================================
  // HANDLE FORM CHANGE
  // ==========================================================

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  // ==========================================================
  // OPEN ADD EMPLOYEE FORM
  // ==========================================================

  const addEmployee = () => {
    const nextEmployeeId =
      generateNextEmployeeId(
        employees
      );

    setEditingEmployee(null);

    setFormData({
      ...initialFormData,
      employee_id: nextEmployeeId,
    });

    setFormError("");
    setFormSuccess("");

    setShowEmployeeForm(true);
  };

  // ==========================================================
  // OPEN EDIT EMPLOYEE FORM
  // ==========================================================

  const editEmployee = async (
    employee
  ) => {
    try {
      setFormError("");
      setFormSuccess("");

      const response = await fetch(
        `${API_URL}/${employee.id}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to get employee details"
        );
      }

      setEditingEmployee(data);

      setFormData({
        employee_id:
          data.employee_id || "",

        first_name:
          data.first_name || "",

        last_name:
          data.last_name || "",

        email:
          data.email || "",

        phone:
          data.phone || "",

        department_id:
          data.department_id
            ? String(
                data.department_id
              )
            : "",

        position_id:
          data.position_id
            ? String(
                data.position_id
              )
            : "",

        status:
          data.status || "Active",

        date_joined:
          data.date_joined
            ? data.date_joined
                .toString()
                .split("T")[0]
            : "",
      });

      setShowEmployeeForm(true);
    } catch (err) {
      console.error(
        "Error loading employee:",
        err
      );

      alert(
        err.message ||
          "Failed to load employee details."
      );
    }
  };

  // ==========================================================
  // CLOSE EMPLOYEE FORM
  // ==========================================================

  const closeEmployeeForm = () => {
    if (formLoading) return;

    setShowEmployeeForm(false);

    setEditingEmployee(null);

    setFormData(
      initialFormData
    );

    setFormError("");
    setFormSuccess("");
  };

  // ==========================================================
  // SUBMIT EMPLOYEE FORM
  // ==========================================================

  const handleEmployeeSubmit =
    async (event) => {
      event.preventDefault();

      try {
        setFormLoading(true);
        setFormError("");
        setFormSuccess("");

        // VALIDATION
        if (
          !formData.employee_id ||
          !formData.first_name ||
          !formData.last_name ||
          !formData.department_id ||
          !formData.position_id ||
          !formData.date_joined
        ) {
          throw new Error(
            "Please fill in all required fields."
          );
        }

        const employeeData = {
          employee_id:
            formData.employee_id,

          first_name:
            formData.first_name,

          last_name:
            formData.last_name,

          email:
            formData.email || null,

          phone:
            formData.phone || null,

          department_id:
            Number(
              formData.department_id
            ),

          position_id:
            Number(
              formData.position_id
            ),

          status:
            formData.status,

          date_joined:
            formData.date_joined,
        };

        let url = API_URL;

        let method = "POST";

        // EDIT EMPLOYEE
        if (editingEmployee) {
          url =
            `${API_URL}/${editingEmployee.id}`;

          method = "PUT";
        }

        const response = await fetch(
          url,
          {
            method,
            headers:
              getAuthHeaders(),

            body: JSON.stringify(
              employeeData
            ),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        console.log(
          "Employee form response:",
          response.status,
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to save employee"
          );
        }

        setFormSuccess(
          editingEmployee
            ? "Employee updated successfully!"
            : "Employee added successfully!"
        );

        // REFRESH EMPLOYEES
        await fetchEmployees();

        // CLOSE FORM AFTER SUCCESS
        setTimeout(() => {
          closeEmployeeForm();
        }, 1200);
      } catch (err) {
        console.error(
          "Employee form error:",
          err
        );

        setFormError(
          err.message ||
            "Failed to save employee."
        );
      } finally {
        setFormLoading(false);
      }
    };

  // ==========================================================
  // DELETE EMPLOYEE
  // ==========================================================

  const deleteEmployee = async (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this employee?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete employee"
        );
      }

      setEmployees(
        (currentEmployees) =>
          currentEmployees.filter(
            (employee) =>
              employee.id !== id
          )
      );

      alert(
        "Employee deleted successfully."
      );
    } catch (err) {
      console.error(
        "Error deleting employee:",
        err
      );

      alert(
        err.message ||
          "Failed to delete employee."
      );
    }
  };

  // ==========================================================
  // VIEW EMPLOYEE
  // ==========================================================

  const viewEmployee = (
    employee
  ) => {
    setSelectedEmployee(
      employee
    );

    setShowEmployeeDetails(
      true
    );
  };

  // ==========================================================
  // CLOSE DETAILS MODAL
  // ==========================================================

  const closeEmployeeDetails =
    () => {
      setShowEmployeeDetails(
        false
      );

      setSelectedEmployee(
        null
      );
    };

  // ==========================================================
  // RETURN
  // ==========================================================

  return (
    <div className="employees-layout">

      {/* SIDEBAR */}
      <div className="employees-sidebar">
        <Sidebar />
      </div>

      {/* MAIN PAGE */}
      <div className="employees-page">

        <div className="employees-content">

          {/* HEADER */}
          <div className="employees-header">

            <div className="employees-title-section">

              <div className="employees-title-icon">
                <FaUsers />
              </div>

              <div className="employees-title-text">

                <h1>
                  Employees Management
                </h1>

                <p>
                  Manage and monitor all
                  employees in your
                  organization.
                </p>

              </div>

            </div>

            <div className="employees-header-actions">

              <button
                className="refresh-employees-btn"
                onClick={fetchEmployees}
                disabled={loading}
              >
                <FaSyncAlt
                  className={
                    loading
                      ? "employees-spin"
                      : ""
                  }
                />

                {loading
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                className="add-employee-btn"
                onClick={addEmployee}
              >
                <FaPlus />
                Add Employee
              </button>

            </div>

          </div>

          {/* STATISTICS */}
          <div className="employees-statistics">

            <div className="employees-stat-card total-employee-card">

              <div className="employees-stat-icon">
                <FaUsers />
              </div>

              <div className="employees-stat-info">

                <span>
                  Total Employees
                </span>

                <strong>
                  {totalEmployees}
                </strong>

                <small>
                  All employees
                </small>

              </div>

            </div>

            <div className="employees-stat-card active-employee-card">

              <div className="employees-stat-icon">
                <FaUserCheck />
              </div>

              <div className="employees-stat-info">

                <span>
                  Active Employees
                </span>

                <strong>
                  {activeEmployees}
                </strong>

                <small>
                  Currently active
                </small>

              </div>

            </div>

            <div className="employees-stat-card leave-employee-card">

              <div className="employees-stat-icon">
                <FaUserClock />
              </div>

              <div className="employees-stat-info">

                <span>
                  On Leave
                </span>

                <strong>
                  {employeesOnLeave}
                </strong>

                <small>
                  Currently on leave
                </small>

              </div>

            </div>

            <div className="employees-stat-card inactive-employee-card">

              <div className="employees-stat-icon">
                <FaUserTimes />
              </div>

              <div className="employees-stat-info">

                <span>
                  Inactive
                </span>

                <strong>
                  {inactiveEmployees}
                </strong>

                <small>
                  Inactive employees
                </small>

              </div>

            </div>

          </div>

          {/* ERROR */}
          {error && (
            <div className="employees-error">
              {error}
            </div>
          )}

          {/* TABLE */}
          <div className="employees-table-container">

            {/* FILTER BAR */}
            <div className="employees-filters">

              <div className="employees-filter-title">

                <strong>
                  Employee List
                </strong>

                <span>
                  {filteredEmployees.length}{" "}
                  employee
                  {filteredEmployees.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  found
                </span>

              </div>

              <div className="employees-search">

                <FaSearch />

                <input
                  type="text"
                  placeholder="Search employees..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

            {/* TABLE WRAPPER */}
            <div className="employees-table-wrapper">

              <table className="employees-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="employees-no-data"
                      >
                        Loading employees...
                      </td>
                    </tr>
                  ) : filteredEmployees.length >
                    0 ? (

                    filteredEmployees.map(
                      (employee) => (
                        <tr
                          key={employee.id}
                        >

                          <td>
                            <span className="employee-id">
                              {employee.employee_id ||
                                employee.id}
                            </span>
                          </td>

                          <td>

                            <div className="employee-cell">

                              <div className="employee-avatar">
                                {employee.name
                                  ? employee.name
                                      .charAt(0)
                                      .toUpperCase()
                                  : "?"}
                              </div>

                              <div className="employee-details">

                                <strong>
                                  {employee.name}
                                </strong>

                                <span>
                                  {employee.email ||
                                    "No email"}
                                </span>

                              </div>

                            </div>

                          </td>

                          <td>
                            {employee.department}
                          </td>

                          <td>
                            {employee.position}
                          </td>

                          <td>
                            {employee.phone ||
                              "N/A"}
                          </td>

                          <td>

                            <span
                              className={`employee-status ${
                                (
                                  employee.status ||
                                  "Inactive"
                                )
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )
                              }`}
                            >
                              {employee.status}
                            </span>

                          </td>

                          <td>

                            <div className="employee-action-buttons">

                              {/* VIEW */}
                              <button
                                className="employee-action-btn view-btn"
                                title="View Employee"
                                onClick={() =>
                                  viewEmployee(
                                    employee
                                  )
                                }
                              >
                                <FaEye />
                                <span>
                                  View
                                </span>
                              </button>

                              {/* EDIT */}
                              <button
                                className="employee-action-btn edit-btn"
                                title="Edit Employee"
                                onClick={() =>
                                  editEmployee(
                                    employee
                                  )
                                }
                              >
                                <FaEdit />
                                <span>
                                  Edit
                                </span>
                              </button>

                              {/* DELETE */}
                              <button
                                className="employee-action-btn delete-btn"
                                title="Delete Employee"
                                onClick={() =>
                                  deleteEmployee(
                                    employee.id
                                  )
                                }
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
                        colSpan="7"
                        className="employees-no-data"
                      >
                        {search
                          ? "No employees match your search."
                          : "No employees found."}
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            {/* TABLE FOOTER */}
            <div className="employees-table-footer">

              <span>
                Showing{" "}
                {filteredEmployees.length} of{" "}
                {employees.length} employees
              </span>

              <div className="employees-pagination">

                <button disabled>
                  1
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          ADD / EDIT EMPLOYEE MODAL
          ====================================================== */}

      {showEmployeeForm && (

        <div className="employees-modal-overlay">

          <div className="employee-form-modal">

            {/* MODAL HEADER */}
            <div className="employee-modal-header">

              <div className="employee-modal-title">

                <div className="employee-modal-icon">
                  <FaUsers />
                </div>

                <div>

                  <h2>
                    {editingEmployee
                      ? "Edit Employee"
                      : "Add Employee"}
                  </h2>

                  <p>
                    {editingEmployee
                      ? "Update employee information."
                      : "Enter employee information below."}
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="employee-modal-close"
                onClick={
                  closeEmployeeForm
                }
                disabled={
                  formLoading
                }
              >
                <FaTimes />
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={
                handleEmployeeSubmit
              }
            >

              <div className="employee-form-body">

                {/* FORM ERROR */}
                {formError && (
                  <div className="employee-form-error">
                    {formError}
                  </div>
                )}

                {/* FORM SUCCESS */}
                {formSuccess && (
                  <div className="employee-form-success">
                    {formSuccess}
                  </div>
                )}

                {/* EMPLOYEE ID */}
                <div className="employee-form-group">

                  <label>
                    Employee ID
                  </label>

                  <input
                    type="text"
                    name="employee_id"
                    value={
                      formData.employee_id
                    }
                    readOnly
                    title="Employee ID is automatically generated"
                  />

                  <small className="employee-auto-id-text">
                    Automatically generated
                    employee ID
                  </small>

                </div>

                {/* NAME ROW */}
                <div className="employee-form-row">

                  <div className="employee-form-group">

                    <label>
                      First Name *
                    </label>

                    <input
                      type="text"
                      name="first_name"
                      placeholder="Enter first name"
                      value={
                        formData.first_name
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Last Name *
                    </label>

                    <input
                      type="text"
                      name="last_name"
                      placeholder="Enter last name"
                      value={
                        formData.last_name
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />

                  </div>

                </div>

                {/* EMAIL / PHONE */}
                <div className="employee-form-row">

                  <div className="employee-form-group">

                    <label>
                      Email
                    </label>

                    <input
                      type="email"
                      name="email"
                      placeholder="Enter email"
                      value={
                        formData.email
                      }
                      onChange={
                        handleFormChange
                      }
                    />

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Phone
                    </label>

                    <input
                      type="text"
                      name="phone"
                      placeholder="Enter phone number"
                      value={
                        formData.phone
                      }
                      onChange={
                        handleFormChange
                      }
                    />

                  </div>

                </div>

                {/* DEPARTMENT */}
                <div className="employee-form-group">

                  <label>
                    Department *
                  </label>

                  <select
                    name="department_id"
                    value={
                      formData.department_id
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  >

                    <option value="">
                      Select Department
                    </option>

                    {departments.map(
                      (department) => (

                        <option
                          key={
                            department.id
                          }
                          value={
                            department.id
                          }
                        >
                          ID {department.id} -{" "}
                          {department.department_name}
                        </option>

                      )
                    )}

                  </select>

                </div>

                {/* POSITION */}
                <div className="employee-form-group">

                  <label>
                    Position *
                  </label>

                  <select
                    name="position_id"
                    value={
                      formData.position_id
                    }
                    onChange={
                      handleFormChange
                    }
                    required
                  >

                    <option value="">
                      Select Position
                    </option>

                    {positions.map(
                      (position) => (

                        <option
                          key={
                            position.id
                          }
                          value={
                            position.id
                          }
                        >
                          ID {position.id} -{" "}
                          {position.position_name}
                        </option>

                      )
                    )}

                  </select>

                </div>

                {/* STATUS / DATE */}
                <div className="employee-form-row">

                  <div className="employee-form-group">

                    <label>
                      Status *
                    </label>

                    <select
                      name="status"
                      value={
                        formData.status
                      }
                      onChange={
                        handleFormChange
                      }
                    >
                      <option value="Active">
                        Active
                      </option>

                      <option value="On Leave">
                        On Leave
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>

                    </select>

                  </div>

                  <div className="employee-form-group">

                    <label>
                      Date Joined *
                    </label>

                    <input
                      type="date"
                      name="date_joined"
                      value={
                        formData.date_joined
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />

                  </div>

                </div>

              </div>

              {/* FORM FOOTER */}
              <div className="employee-modal-footer">

                <span>
                  Fields marked * are
                  required
                </span>

                <div className="employee-form-actions">

                  <button
                    type="button"
                    className="employee-modal-cancel-btn"
                    onClick={
                      closeEmployeeForm
                    }
                    disabled={
                      formLoading
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="employee-save-btn"
                    disabled={
                      formLoading
                    }
                  >
                    <FaSave />

                    {formLoading
                      ? "Saving..."
                      : editingEmployee
                      ? "Update Employee"
                      : "Save Employee"}
                  </button>

                </div>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* ======================================================
          EMPLOYEE DETAILS MODAL
          ====================================================== */}

      {showEmployeeDetails &&
        selectedEmployee && (

          <div className="employees-modal-overlay">

            <div className="employee-details-modal">

              {/* HEADER */}
              <div className="employee-modal-header">

                <div className="employee-modal-title">

                  <div className="employee-modal-icon">
                    <FaUsers />
                  </div>

                  <div>

                    <h2>
                      Employee Details
                    </h2>

                    <p>
                      View employee
                      information.
                    </p>

                  </div>

                </div>

                <button
                  className="employee-modal-close"
                  onClick={
                    closeEmployeeDetails
                  }
                >
                  <FaTimes />
                </button>

              </div>

              {/* BODY */}
              <div className="employee-modal-body">

                <div className="employee-profile-card">

                  <div className="employee-profile-avatar">

                    {selectedEmployee.name
                      ? selectedEmployee.name
                          .charAt(0)
                          .toUpperCase()
                      : "?"}

                  </div>

                  <div className="employee-profile-info">

                    <h3>
                      {selectedEmployee.name}
                    </h3>

                    <span>
                      {selectedEmployee.email ||
                        "No email"}
                    </span>

                    <small>
                      {
                        selectedEmployee.employee_id
                      }
                    </small>

                  </div>

                  <span
                    className={`employee-modal-status ${
                      (
                        selectedEmployee.status ||
                        "Inactive"
                      )
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "-"
                        )
                    }`}
                  >
                    {
                      selectedEmployee.status
                    }
                  </span>

                </div>

                <div className="employee-detail-grid">

                  <div className="employee-detail-item">
                    <span>
                      Employee ID
                    </span>
                    <strong>
                      {
                        selectedEmployee.employee_id
                      }
                    </strong>
                  </div>

                  <div className="employee-detail-item">
                    <span>
                      Department
                    </span>
                    <strong>
                      {
                        selectedEmployee.department
                      }
                    </strong>
                  </div>

                  <div className="employee-detail-item">
                    <span>
                      Position
                    </span>
                    <strong>
                      {
                        selectedEmployee.position
                      }
                    </strong>
                  </div>

                  <div className="employee-detail-item">
                    <span>
                      Phone
                    </span>
                    <strong>
                      {selectedEmployee.phone ||
                        "N/A"}
                    </strong>
                  </div>

                  <div className="employee-detail-item">
                    <span>
                      Date Joined
                    </span>
                    <strong>
                      {selectedEmployee.date_joined
                        ? new Date(
                            selectedEmployee.date_joined
                          ).toLocaleDateString()
                        : "N/A"}
                    </strong>
                  </div>

                  <div className="employee-detail-item">
                    <span>
                      Status
                    </span>
                    <strong>
                      {
                        selectedEmployee.status
                      }
                    </strong>
                  </div>

                </div>

              </div>

              {/* FOOTER */}
              <div className="employee-modal-footer">

                <span>
                  Employee information
                </span>

                <button
                  className="employee-modal-close-btn"
                  onClick={
                    closeEmployeeDetails
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

// ============================================================
// EXPORT
// ============================================================

export default Employees;