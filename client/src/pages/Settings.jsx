import React, { useEffect, useState } from "react";

import {
  FiSettings,
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiSave,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiBell,
  FiInfo,
  FiDatabase,
  FiCalendar,
  FiClock,
  FiSearch,
  FiSun,
  FiChevronDown,
  FiChevronRight,
  FiHome,
  FiMonitor,
  FiGlobe,
  FiMapPin,
  FiUpload,
  FiTrash2,
  FiDollarSign,
  FiLanguages,
  FiRefreshCw,
  FiUsers,
  FiList,
  FiHelpCircle,
  FiActivity,
} from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import logo from "../assets/images/logo.png";

import "../styles/Settings.css";

import { buildApiUrl } from "../config/api";
import { getAuthHeaders } from "../utils/auth";


const Settings = () => {

  /* =====================================================
     USER INFORMATION
     ===================================================== */

  const [user, setUser] = useState({
    id: "",
    username: "",
    email: "",
    role: "",
    employee_id: "",
  });


  /* =====================================================
     PASSWORD
     ===================================================== */

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });


  /* =====================================================
     SHOW / HIDE PASSWORD
     ===================================================== */

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);


  /* =====================================================
     STATUS
     ===================================================== */

  const [loading, setLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");


  /* =====================================================
     ACTIVE SETTINGS TAB
     ===================================================== */

  const [activeTab, setActiveTab] = useState("general");


  /* =====================================================
     GENERAL SETTINGS STATE
     ===================================================== */

  const [generalSettings, setGeneralSettings] = useState({
    organizationName: "Vanuatu Electoral Office",
    systemName: "VEO Staff Monitoring Management System",
    address: "Port Vila, Shefa Province, Vanuatu",
    timeZone: "Pacific/Efate (UTC+11:00)",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour (AM/PM)",
    currency: "Vanuatu Vatu (VUV)",
    language: "English",
    startTime: "08:00 AM",
    endTime: "04:30 PM",
    gracePeriod: "15 Minutes",
    lateThreshold: "15 Minutes",
    leaveYearStart: "1 January",
  });


  /* =====================================================
     WORKING DAYS
     ===================================================== */

  const [workingDays, setWorkingDays] = useState({
    Mon: true,
    Tue: true,
    Wed: true,
    Thu: true,
    Fri: true,
    Sat: false,
    Sun: false,
  });


  /* =====================================================
     LOAD USER FROM LOCAL STORAGE
     ===================================================== */

  useEffect(() => {
    try {

      const storedUser = localStorage.getItem("user");

      if (storedUser) {

        const parsedUser = JSON.parse(storedUser);

        setUser({
          id: parsedUser.id || "",
          username: parsedUser.username || "",
          email: parsedUser.email || "",
          role: parsedUser.role || "",
          employee_id: parsedUser.employee_id || "",
        });
      }

    } catch (error) {

      console.error(
        "Unable to load user information:",
        error
      );

    }
  }, []);


  /* =====================================================
     HANDLE PASSWORD INPUT
     ===================================================== */

  const handlePasswordChange = (e) => {

    const { name, value } = e.target;

    setPasswordData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };


  /* =====================================================
     PASSWORD VALIDATION
     ===================================================== */

  const validatePassword = () => {

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordData;

    if (!currentPassword) {
      return "Please enter your current password.";
    }

    if (!newPassword) {
      return "Please enter your new password.";
    }

    if (!confirmPassword) {
      return "Please confirm your new password.";
    }

    if (newPassword.length < 8) {
      return "New password must be at least 8 characters long.";
    }

    if (newPassword !== confirmPassword) {
      return "New password and confirm password do not match.";
    }

    if (currentPassword === newPassword) {
      return "Your new password must be different from your current password.";
    }

    return "";
  };


  /* =====================================================
     CHANGE PASSWORD
     ===================================================== */

  const handleChangePassword = async (e) => {

    e.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    const validationError = validatePassword();

    if (validationError) {

      setErrorMessage(validationError);
      return;
    }

    try {

      setLoading(true);

      const headers = getAuthHeaders();

      const response = await fetch(
        buildApiUrl("/auth/change-password"),
        {
          method: "PUT",

          headers: {
            ...headers,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            currentPassword:
              passwordData.currentPassword,

            newPassword:
              passwordData.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
            "Unable to update password."
        );
      }

      setSuccessMessage(
        data.message ||
          "Password updated successfully."
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

    } catch (error) {

      console.error(
        "Change password error:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to update password. Please try again."
      );

    } finally {

      setLoading(false);
    }
  };


  /* =====================================================
     PASSWORD STRENGTH
     ===================================================== */

  const getPasswordStrength = () => {

    const password = passwordData.newPassword;

    if (!password) {
      return "";
    }

    if (password.length < 8) {
      return "Weak";
    }

    let strength = 0;

    if (/[A-Z]/.test(password)) {
      strength++;
    }

    if (/[a-z]/.test(password)) {
      strength++;
    }

    if (/[0-9]/.test(password)) {
      strength++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      strength++;
    }

    if (password.length >= 12) {
      strength++;
    }

    if (strength <= 2) {
      return "Weak";
    }

    if (strength === 3) {
      return "Medium";
    }

    return "Strong";
  };


  const passwordStrength =
    getPasswordStrength();


  /* =====================================================
     FORMAT ROLE
     ===================================================== */

  const formatRole = (role) => {

    if (!role) {
      return "Not available";
    }

    return role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  /* =====================================================
     HANDLE TAB CHANGE
     ===================================================== */

  const handleTabChange = (tab) => {

    setActiveTab(tab);

    setSuccessMessage("");
    setErrorMessage("");
  };


  /* =====================================================
     WORKING DAY TOGGLE
     ===================================================== */

  const toggleWorkingDay = (day) => {

    setWorkingDays((previous) => ({
      ...previous,
      [day]: !previous[day],
    }));
  };


  /* =====================================================
     HANDLE GENERAL SETTINGS CHANGE
     ===================================================== */

  const handleGeneralChange = (field, value) => {

    setGeneralSettings((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };


  /* =====================================================
     RESET GENERAL SETTINGS
     ===================================================== */

  const handleResetSettings = () => {

    setGeneralSettings({
      organizationName: "Vanuatu Electoral Office",
      systemName: "VEO Staff Monitoring Management System",
      address: "Port Vila, Shefa Province, Vanuatu",
      timeZone: "Pacific/Efate (UTC+11:00)",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12-hour (AM/PM)",
      currency: "Vanuatu Vatu (VUV)",
      language: "English",
      startTime: "08:00 AM",
      endTime: "04:30 PM",
      gracePeriod: "15 Minutes",
      lateThreshold: "15 Minutes",
      leaveYearStart: "1 January",
    });

    setWorkingDays({
      Mon: true,
      Tue: true,
      Wed: true,
      Thu: true,
      Fri: true,
      Sat: false,
      Sun: false,
    });

    setSuccessMessage(
      "Settings have been reset to the default values."
    );

    setErrorMessage("");
  };


  /* =====================================================
     SAVE GENERAL SETTINGS
     ===================================================== */

  const handleSaveSettings = () => {

    setSuccessMessage(
      "Settings saved successfully."
    );

    setErrorMessage("");
  };


  /* =====================================================
     RETURN
     ===================================================== */

  return (

    <div className="settings-page">

      {/* =================================================
          EXISTING VEO SIDEBAR
          ================================================= */}

      <Sidebar />


      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <main className="settings-main">

        {/* =================================================
            TOP BAR
            ================================================= */}

        <div className="settings-topbar">

          <div className="settings-topbar-spacer"></div>

          <div className="settings-topbar-right">

            <div className="settings-search">

              <FiSearch />

              <input
                type="text"
                placeholder="Search..."
              />

            </div>


            <button
              type="button"
              className="topbar-action"
              title="Notifications"
            >

              <FiBell />

              <span className="notification-badge">
                3
              </span>

            </button>


            <button
              type="button"
              className="topbar-action"
              title="Theme"
            >
              <FiSun />
            </button>


            <div className="topbar-divider"></div>


            <div className="settings-user-profile">

              <div className="settings-user-avatar">
                <FiUser />
              </div>

              <div className="settings-user-details">

                <strong>
                  {user.username || "Admin User"}
                </strong>

                <span>
                  {formatRole(user.role) ||
                    "System Administrator"}
                </span>

              </div>

              <FiChevronDown className="user-chevron" />

            </div>

          </div>

        </div>


        {/* =================================================
            BREADCRUMB
            ================================================= */}

        <div className="settings-breadcrumb">

          <FiHome />

          <span>Home</span>

          <FiChevronRight />

          <strong>Settings</strong>

        </div>


        <div className="settings-content">


          {/* =================================================
              SETTINGS HEADER
              ================================================= */}

          <header className="settings-header">

            <div className="settings-title">

              <div className="settings-title-icon">
                <FiSettings />
              </div>

              <div>

                <h1>
                  Settings Center
                </h1>

                <p>
                  Manage your account, security and system preferences
                </p>

              </div>

            </div>

          </header>


          {/* =================================================
              STATUS CARDS
              ================================================= */}

          <section className="settings-overview">


            {/* ACCOUNT STATUS */}

            <div className="overview-card">

              <div className="overview-icon account-icon">
                <FiUser />
              </div>

              <div className="overview-info">

                <span className="overview-label">
                  Account Status
                </span>

                <strong>
                  Active
                </strong>

                <small>
                  All systems operational
                </small>

              </div>

            </div>


            {/* LAST LOGIN */}

            <div className="overview-card">

              <div className="overview-icon login-icon">
                <FiCalendar />
              </div>

              <div className="overview-info">

                <span className="overview-label">
                  Last Login
                </span>

                <strong>
                  Today, 22 Sept 2026
                </strong>

                <small>
                  User authenticated
                </small>

              </div>

            </div>


            {/* SECURITY */}

            <div className="overview-card">

              <div className="overview-icon security-icon">
                <FiShield />
              </div>

              <div className="overview-info">

                <span className="overview-label">
                  Security Level
                </span>

                <strong>
                  High
                </strong>

                <div className="security-meter">

                  <span className="meter-segment active"></span>
                  <span className="meter-segment active"></span>
                  <span className="meter-segment active"></span>
                  <span className="meter-segment active"></span>
                  <span className="meter-segment"></span>

                  <em>
                    2FA Ready
                  </em>

                </div>

              </div>

            </div>


            {/* VERSION */}

            <div className="overview-card">

              <div className="overview-icon version-icon">
                <FiActivity />
              </div>

              <div className="overview-info">

                <span className="overview-label">
                  System Version
                </span>

                <strong>
                  v1.0.0
                </strong>

                <small>
                  Updated: 20 Sept 2026
                </small>

              </div>

            </div>

          </section>


          {/* =================================================
              SUCCESS MESSAGE
              ================================================= */}

          {successMessage && (

            <div className="settings-success">

              <FiCheckCircle />

              <span>
                {successMessage}
              </span>

            </div>

          )}


          {/* =================================================
              ERROR MESSAGE
              ================================================= */}

          {errorMessage && (

            <div className="settings-error">

              <FiAlertCircle />

              <span>
                {errorMessage}
              </span>

            </div>

          )}


          {/* =================================================
              SETTINGS LAYOUT
              ================================================= */}

          <div className="settings-layout">


            {/* =================================================
                LEFT SETTINGS MENU
                ================================================= */}

            <aside className="settings-nav">


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "general"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("general")
                }
              >

                <FiSettings />

                <div>

                  <strong>
                    General
                  </strong>

                  <span>
                    System preferences
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "account"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("account")
                }
              >

                <FiUser />

                <div>

                  <strong>
                    My Account
                  </strong>

                  <span>
                    Profile & personal info
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "security"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("security")
                }
              >

                <FiShield />

                <div>

                  <strong>
                    Security & Privacy
                  </strong>

                  <span>
                    Password & access
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "notifications"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("notifications")
                }
              >

                <FiBell />

                <div>

                  <strong>
                    Notifications
                  </strong>

                  <span>
                    Alerts & reminders
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "system"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("system")
                }
              >

                <FiUsers />

                <div>

                  <strong>
                    System Administration
                  </strong>

                  <span>
                    User & system settings
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "attendance"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("attendance")
                }
              >

                <FiClock />

                <div>

                  <strong>
                    Attendance Settings
                  </strong>

                  <span>
                    Check-in/out rules
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "leave"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("leave")
                }
              >

                <FiCalendar />

                <div>

                  <strong>
                    Leave Settings
                  </strong>

                  <span>
                    Leave configurations
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "activity"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("activity")
                }
              >

                <FiList />

                <div>

                  <strong>
                    Activity Logs
                  </strong>

                  <span>
                    System audit trail
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "backup"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("backup")
                }
              >

                <FiDatabase />

                <div>

                  <strong>
                    Backup & Recovery
                  </strong>

                  <span>
                    Data management
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "about"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("about")
                }
              >

                <FiInfo />

                <div>

                  <strong>
                    About System
                  </strong>

                  <span>
                    Version & information
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>


              <button
                type="button"
                className={`settings-nav-item ${
                  activeTab === "help"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleTabChange("help")
                }
              >

                <FiHelpCircle />

                <div>

                  <strong>
                    Help & Support
                  </strong>

                  <span>
                    Guides & contact
                  </span>

                </div>

                <FiChevronRight className="nav-arrow" />

              </button>

            </aside>


            {/* =================================================
                SETTINGS BODY
                ================================================= */}

            <div className="settings-body">


              {/* =================================================
                  GENERAL
                  ================================================= */}

              {activeTab === "general" && (

                <div className="general-settings-panel">


                  {/* PANEL HEADER */}

                  <div className="general-panel-header">

                    <div className="general-panel-title">

                      <div className="general-panel-icon">
                        <FiSettings />
                      </div>

                      <div>

                        <h2>
                          General Settings
                        </h2>

                        <p>
                          Configure organization and system preferences
                        </p>

                      </div>

                    </div>


                    <div className="general-actions">

                      <button
                        type="button"
                        className="reset-button"
                        onClick={handleResetSettings}
                      >

                        <FiRefreshCw />

                        Reset

                      </button>


                      <button
                        type="button"
                        className="save-button"
                        onClick={handleSaveSettings}
                      >

                        <FiSave />

                        Save Changes

                      </button>

                    </div>

                  </div>


                  {/* =================================================
                      TOP TWO BOXES
                      ================================================= */}

                  <div className="general-grid">


                    {/* ORGANIZATION INFORMATION */}

                    <section className="settings-box organization-box">

                      <div className="box-heading">

                        <div className="box-heading-icon">
                          <FiUsers />
                        </div>

                        <div>

                          <h3>
                            Organization Information
                          </h3>

                          <p>
                            Basic organization details
                          </p>

                        </div>

                      </div>


                      <div className="field-full">

                        <label>
                          Organization Name
                        </label>

                        <div className="visual-input">

                          <FiUsers />

                          <input
                            type="text"
                            value={
                              generalSettings.organizationName
                            }
                            onChange={(e) =>
                              handleGeneralChange(
                                "organizationName",
                                e.target.value
                              )
                            }
                          />

                        </div>

                      </div>


                      <div className="field-full">

                        <label>
                          System Name
                        </label>

                        <div className="visual-input">

                          <FiMonitor />

                          <input
                            type="text"
                            value={
                              generalSettings.systemName
                            }
                            onChange={(e) =>
                              handleGeneralChange(
                                "systemName",
                                e.target.value
                              )
                            }
                          />

                        </div>

                      </div>


                      <div className="organization-bottom">


                        <div className="address-field">

                          <label>
                            Organization Address
                          </label>

                          <div className="address-box">

                            <FiMapPin />

                            <span>
                              {generalSettings.address}
                            </span>

                          </div>

                        </div>


                        <div className="logo-field">

                          <label>
                            Logo
                          </label>

                          <div className="logo-controls">

                            <img
                              src={logo}
                              alt="VEO Logo"
                              className="organization-logo"
                            />

                            <div className="logo-buttons">

                              <button
                                type="button"
                                className="change-logo-button"
                              >

                                <FiUpload />

                                Change Logo

                              </button>

                              <button
                                type="button"
                                className="remove-logo-button"
                              >

                                <FiTrash2 />

                                Remove

                              </button>

                            </div>

                          </div>

                          <small>
                            Recommended size: 200x200px, PNG or JPG
                          </small>

                        </div>

                      </div>

                    </section>


                    {/* REGIONAL SETTINGS */}

                    <section className="settings-box">

                      <div className="box-heading">

                        <div className="box-heading-icon">
                          <FiGlobe />
                        </div>

                        <div>

                          <h3>
                            Regional & Display Settings
                          </h3>

                          <p>
                            Language, time and format preferences
                          </p>

                        </div>

                      </div>


                      <div className="two-column-fields">


                        <div className="field-full">

                          <label>
                            Time Zone
                          </label>

                          <div className="visual-select">

                            <FiGlobe />

                            <select
                              value={
                                generalSettings.timeZone
                              }
                              onChange={(e) =>
                                handleGeneralChange(
                                  "timeZone",
                                  e.target.value
                                )
                              }
                            >

                              <option>
                                Pacific/Efate (UTC+11:00)
                              </option>

                            </select>

                            <FiChevronDown />

                          </div>

                        </div>


                        <div className="field-full">

                          <label>
                            Date Format
                          </label>

                          <div className="visual-select">

                            <FiCalendar />

                            <select
                              value={
                                generalSettings.dateFormat
                              }
                              onChange={(e) =>
                                handleGeneralChange(
                                  "dateFormat",
                                  e.target.value
                                )
                              }
                            >

                              <option>
                                DD/MM/YYYY (22/09/2026)
                              </option>

                              <option>
                                DD/MM/YYYY
                              </option>

                            </select>

                            <FiChevronDown />

                          </div>

                        </div>


                        <div className="field-full">

                          <label>
                            Time Format
                          </label>

                          <div className="visual-select">

                            <FiClock />

                            <select
                              value={
                                generalSettings.timeFormat
                              }
                              onChange={(e) =>
                                handleGeneralChange(
                                  "timeFormat",
                                  e.target.value
                                )
                              }
                            >

                              <option>
                                12-hour (AM/PM)
                              </option>

                              <option>
                                24-hour
                              </option>

                            </select>

                            <FiChevronDown />

                          </div>

                        </div>


                        <div className="field-full">

                          <label>
                            Currency Format
                          </label>

                          <div className="visual-select">

                            <FiDollarSign />

                            <select
                              value={
                                generalSettings.currency
                              }
                              onChange={(e) =>
                                handleGeneralChange(
                                  "currency",
                                  e.target.value
                                )
                              }
                            >

                              <option>
                                Vanuatu Vatu (VUV)
                              </option>

                            </select>

                            <FiChevronDown />

                          </div>

                        </div>


                        <div className="field-full">

                          <label>
                            Default Language
                          </label>

                          <div className="visual-select">

                            <FiLanguages />

                            <select
                              value={
                                generalSettings.language
                              }
                              onChange={(e) =>
                                handleGeneralChange(
                                  "language",
                                  e.target.value
                                )
                              }
                            >

                              <option>
                                🇬🇧 English
                              </option>

                            </select>

                            <FiChevronDown />

                          </div>

                        </div>

                      </div>

                    </section>


                    {/* OFFICE HOURS */}

                    <section className="settings-box">

                      <div className="box-heading">

                        <div className="box-heading-icon">
                          <FiClock />
                        </div>

                        <div>

                          <h3>
                            Office Working Hours
                          </h3>

                          <p>
                            Default office schedule
                          </p>

                        </div>

                      </div>


                      <div className="working-hours-layout">


                        <div className="working-time">

                          <div className="time-fields">

                            <div className="field-full">

                              <label>
                                Start Time
                              </label>

                              <div className="visual-input">

                                <FiClock />

                                <input
                                  type="text"
                                  value={
                                    generalSettings.startTime
                                  }
                                  onChange={(e) =>
                                    handleGeneralChange(
                                      "startTime",
                                      e.target.value
                                    )
                                  }
                                />

                                <FiChevronDown />

                              </div>

                            </div>


                            <div className="field-full">

                              <label>
                                End Time
                              </label>

                              <div className="visual-input">

                                <FiClock />

                                <input
                                  type="text"
                                  value={
                                    generalSettings.endTime
                                  }
                                  onChange={(e) =>
                                    handleGeneralChange(
                                      "endTime",
                                      e.target.value
                                    )
                                  }
                                />

                              </div>

                            </div>

                          </div>

                        </div>


                        <div className="working-days">

                          <label>
                            Working Days
                          </label>

                          <div className="day-buttons">

                            {Object.keys(workingDays).map(
                              (day) => (

                                <button
                                  key={day}
                                  type="button"
                                  className={
                                    workingDays[day]
                                      ? "day-button active"
                                      : "day-button"
                                  }
                                  onClick={() =>
                                    toggleWorkingDay(day)
                                  }
                                >

                                  {workingDays[day] && "✓ "}
                                  {day}

                                </button>

                              )
                            )}

                          </div>

                        </div>

                      </div>

                    </section>


                    {/* ATTENDANCE AND LEAVE */}

                    <section className="settings-box">

                      <div className="box-heading">

                        <div className="box-heading-icon">
                          <FiCalendar />
                        </div>

                        <div>

                          <h3>
                            Attendance & Leave Rules
                          </h3>

                          <p>
                            Default rules and thresholds
                          </p>

                        </div>

                      </div>


                      <div className="attendance-layout">


                        <div className="attendance-fields">

                          <div className="two-column-fields">


                            <div className="field-full">

                              <label>
                                Attendance Grace Period
                              </label>

                              <div className="visual-select">

                                <FiClock />

                                <select
                                  value={
                                    generalSettings.gracePeriod
                                  }
                                  onChange={(e) =>
                                    handleGeneralChange(
                                      "gracePeriod",
                                      e.target.value
                                    )
                                  }
                                >

                                  <option>
                                    15 Minutes
                                  </option>

                                  <option>
                                    10 Minutes
                                  </option>

                                  <option>
                                    20 Minutes
                                  </option>

                                </select>

                                <FiChevronDown />

                              </div>

                            </div>


                            <div className="field-full">

                              <label>
                                Late Arrival Threshold
                              </label>

                              <div className="visual-select">

                                <FiClock />

                                <select
                                  value={
                                    generalSettings.lateThreshold
                                  }
                                  onChange={(e) =>
                                    handleGeneralChange(
                                      "lateThreshold",
                                      e.target.value
                                    )
                                  }
                                >

                                  <option>
                                    15 Minutes
                                  </option>

                                  <option>
                                    10 Minutes
                                  </option>

                                  <option>
                                    30 Minutes
                                  </option>

                                </select>

                                <FiChevronDown />

                              </div>

                            </div>


                            <div className="field-full">

                              <label>
                                Leave Year Start
                              </label>

                              <div className="visual-select">

                                <FiCalendar />

                                <select
                                  value={
                                    generalSettings.leaveYearStart
                                  }
                                  onChange={(e) =>
                                    handleGeneralChange(
                                      "leaveYearStart",
                                      e.target.value
                                    )
                                  }
                                >

                                  <option>
                                    1 January
                                  </option>

                                  <option>
                                    1 July
                                  </option>

                                </select>

                                <FiChevronDown />

                              </div>

                            </div>

                          </div>

                        </div>


                        <div className="note-card">

                          <div className="note-icon">
                            <FiInfo />
                          </div>

                          <div>

                            <h6>
                              Note
                            </h6>

                            <p>
                              These settings will apply to all employees in the system.
                            </p>

                            <p>
                              Changes will take effect immediately after saving.
                            </p>

                          </div>

                        </div>

                      </div>

                    </section>

                  </div>

                </div>

              )}


              {/* =================================================
                  ACCOUNT
                  ================================================= */}

              {activeTab === "account" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiUser />
                    </div>

                    <div>

                      <h2>
                        My Account
                      </h2>

                      <p>
                        Profile and personal information
                      </p>

                    </div>

                  </div>


                  <div className="settings-form">

                    <div className="settings-field">

                      <label>
                        Username
                      </label>

                      <div className="settings-input-wrapper">

                        <FiUser />

                        <input
                          type="text"
                          value={
                            user.username ||
                            "Not available"
                          }
                          disabled
                        />

                      </div>

                    </div>


                    <div className="settings-field">

                      <label>
                        Email Address
                      </label>

                      <div className="settings-input-wrapper">

                        <FiUser />

                        <input
                          type="email"
                          value={
                            user.email ||
                            "Not available"
                          }
                          disabled
                        />

                      </div>

                    </div>


                    <div className="settings-field">

                      <label>
                        Employee ID
                      </label>

                      <div className="settings-input-wrapper">

                        <FiUser />

                        <input
                          type="text"
                          value={
                            user.employee_id ||
                            "Not available"
                          }
                          disabled
                        />

                      </div>

                    </div>


                    <div className="settings-field">

                      <label>
                        System Role
                      </label>

                      <div className="settings-input-wrapper">

                        <FiShield />

                        <input
                          type="text"
                          value={formatRole(user.role)}
                          disabled
                        />

                      </div>

                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  SECURITY
                  ================================================= */}

              {activeTab === "security" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiLock />
                    </div>

                    <div>

                      <h2>
                        Security & Privacy
                      </h2>

                      <p>
                        Manage your password and account security
                      </p>

                    </div>

                  </div>


                  <form
                    className="settings-form"
                    onSubmit={handleChangePassword}
                  >


                    <div className="settings-field">

                      <label htmlFor="currentPassword">
                        Current Password
                      </label>

                      <div className="settings-input-wrapper">

                        <FiLock />

                        <input
                          id="currentPassword"
                          name="currentPassword"
                          type={
                            showCurrentPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordData.currentPassword
                          }
                          onChange={
                            handlePasswordChange
                          }
                          placeholder="Enter current password"
                          autoComplete="current-password"
                        />

                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowCurrentPassword(
                              (previous) =>
                                !previous
                            )
                          }
                          aria-label={
                            showCurrentPassword
                              ? "Hide current password"
                              : "Show current password"
                          }
                        >

                          {showCurrentPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )}

                        </button>

                      </div>

                    </div>


                    <div className="settings-field">

                      <label htmlFor="newPassword">
                        New Password
                      </label>

                      <div className="settings-input-wrapper">

                        <FiLock />

                        <input
                          id="newPassword"
                          name="newPassword"
                          type={
                            showNewPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordData.newPassword
                          }
                          onChange={
                            handlePasswordChange
                          }
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowNewPassword(
                              (previous) =>
                                !previous
                            )
                          }
                          aria-label={
                            showNewPassword
                              ? "Hide new password"
                              : "Show new password"
                          }
                        >

                          {showNewPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )}

                        </button>

                      </div>


                      {passwordData.newPassword && (

                        <div className="password-strength">

                          <span>
                            Password strength:
                          </span>

                          <strong
                            className={`strength-${passwordStrength.toLowerCase()}`}
                          >
                            {passwordStrength}
                          </strong>

                        </div>

                      )}


                      <small className="field-help">
                        Use at least 8 characters.
                        A stronger password should
                        include uppercase letters,
                        lowercase letters, numbers
                        and symbols.
                      </small>

                    </div>


                    <div className="settings-field">

                      <label htmlFor="confirmPassword">
                        Confirm New Password
                      </label>

                      <div className="settings-input-wrapper">

                        <FiLock />

                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          value={
                            passwordData.confirmPassword
                          }
                          onChange={
                            handlePasswordChange
                          }
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() =>
                            setShowConfirmPassword(
                              (previous) =>
                                !previous
                            )
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >

                          {showConfirmPassword ? (
                            <FiEyeOff />
                          ) : (
                            <FiEye />
                          )}

                        </button>

                      </div>


                      {passwordData.confirmPassword && (

                        <div
                          className={
                            passwordData.newPassword ===
                            passwordData.confirmPassword
                              ? "password-match"
                              : "password-not-match"
                          }
                        >

                          {passwordData.newPassword ===
                          passwordData.confirmPassword
                            ? "✓ Passwords match"
                            : "✕ Passwords do not match"}

                        </div>

                      )}

                    </div>


                    <button
                      type="submit"
                      className="save-password-button"
                      disabled={loading}
                    >

                      {loading ? (

                        <>
                          <span className="button-spinner"></span>
                          Updating Password...
                        </>

                      ) : (

                        <>
                          <FiSave />
                          Change Password
                        </>

                      )}

                    </button>

                  </form>


                  <section className="security-information">

                    <div className="security-icon">
                      <FiShield />
                    </div>

                    <div>

                      <h3>
                        Password Security
                      </h3>

                      <p>
                        Your password is securely stored
                        using bcrypt on the server.
                      </p>

                    </div>

                  </section>

                </div>

              )}


              {/* =================================================
                  NOTIFICATIONS
                  ================================================= */}

              {activeTab === "notifications" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiBell />
                    </div>

                    <div>

                      <h2>
                        Notifications
                      </h2>

                      <p>
                        Alerts and reminders
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiBell />
                      <div>
                        <strong>
                          System Notifications
                        </strong>
                        <span>
                          Enabled
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiCalendar />
                      <div>
                        <strong>
                          Leave Notifications
                        </strong>
                        <span>
                          Enabled
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiClock />
                      <div>
                        <strong>
                          Attendance Alerts
                        </strong>
                        <span>
                          Enabled
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  ATTENDANCE
                  ================================================= */}

              {activeTab === "attendance" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiClock />
                    </div>

                    <div>

                      <h2>
                        Attendance Settings
                      </h2>

                      <p>
                        Check-in/out rules and attendance configuration
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiClock />
                      <div>
                        <strong>
                          Work Start Time
                        </strong>
                        <span>
                          08:00 AM
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiClock />
                      <div>
                        <strong>
                          Work End Time
                        </strong>
                        <span>
                          04:30 PM
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiActivity />
                      <div>
                        <strong>
                          Attendance Status
                        </strong>
                        <span>
                          Present / Late / Absent
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  LEAVE
                  ================================================= */}

              {activeTab === "leave" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiCalendar />
                    </div>

                    <div>

                      <h2>
                        Leave Settings
                      </h2>

                      <p>
                        Leave configurations and policies
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiCalendar />
                      <div>
                        <strong>
                          Annual Leave
                        </strong>
                        <span>
                          Available
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiCalendar />
                      <div>
                        <strong>
                          Sick Leave
                        </strong>
                        <span>
                          Available
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiCalendar />
                      <div>
                        <strong>
                          Other Leave
                        </strong>
                        <span>
                          Available
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  SYSTEM ADMINISTRATION
                  ================================================= */}

              {activeTab === "system" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiUsers />
                    </div>

                    <div>

                      <h2>
                        System Administration
                      </h2>

                      <p>
                        User and system administration settings
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiUsers />
                      <div>
                        <strong>
                          User Management
                        </strong>
                        <span>
                          Administrator access
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiShield />
                      <div>
                        <strong>
                          Access Control
                        </strong>
                        <span>
                          Role-based permissions
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  ACTIVITY
                  ================================================= */}

              {activeTab === "activity" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiList />
                    </div>

                    <div>

                      <h2>
                        Activity Logs
                      </h2>

                      <p>
                        System audit trail
                      </p>

                    </div>

                  </div>

                  <div className="empty-settings-state">

                    <FiList />

                    <h3>
                      Activity Logs
                    </h3>

                    <p>
                      System activity and audit information can be viewed here.
                    </p>

                  </div>

                </div>

              )}


              {/* =================================================
                  BACKUP
                  ================================================= */}

              {activeTab === "backup" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiDatabase />
                    </div>

                    <div>

                      <h2>
                        Backup & Recovery
                      </h2>

                      <p>
                        Data management
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiDatabase />
                      <div>
                        <strong>
                          Database
                        </strong>
                        <span>
                          PostgreSQL
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiDatabase />
                      <div>
                        <strong>
                          Database Name
                        </strong>
                        <span>
                          staff_monitor
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  ABOUT
                  ================================================= */}

              {activeTab === "about" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiInfo />
                    </div>

                    <div>

                      <h2>
                        About System
                      </h2>

                      <p>
                        Staff Monitoring System information
                      </p>

                    </div>

                  </div>

                  <div className="simple-settings-grid">

                    <div className="simple-setting-card">
                      <FiUsers />
                      <div>
                        <strong>
                          Organization
                        </strong>
                        <span>
                          Vanuatu Electoral Office
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiMonitor />
                      <div>
                        <strong>
                          Application
                        </strong>
                        <span>
                          VEO Staff Monitoring Management System
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiActivity />
                      <div>
                        <strong>
                          Version
                        </strong>
                        <span>
                          v1.0.0
                        </span>
                      </div>
                    </div>

                    <div className="simple-setting-card">
                      <FiDatabase />
                      <div>
                        <strong>
                          Technology
                        </strong>
                        <span>
                          React + Express + PostgreSQL
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  HELP
                  ================================================= */}

              {activeTab === "help" && (

                <div className="settings-panel">

                  <div className="settings-panel-header">

                    <div className="settings-panel-icon">
                      <FiHelpCircle />
                    </div>

                    <div>

                      <h2>
                        Help & Support
                      </h2>

                      <p>
                        Guides and contact information
                      </p>

                    </div>

                  </div>

                  <div className="empty-settings-state">

                    <FiHelpCircle />

                    <h3>
                      Help & Support
                    </h3>

                    <p>
                      Contact the VEO IT Section for technical support.
                    </p>

                  </div>

                </div>

              )}

            </div>

          </div>


          {/* =================================================
              FOOTER
              ================================================= */}

          <footer className="settings-footer">

            <span>
              © 2026 Vanuatu Electoral Office. All rights reserved.
              &nbsp; | &nbsp;
              VEO Staff Monitoring System
            </span>

            <div>

              <a href="#privacy">
                Privacy
              </a>

              <span>|</span>

              <a href="#terms">
                Terms
              </a>

              <span>|</span>

              <a href="#system-info">
                System Info
              </a>

            </div>

          </footer>

        </div>

      </main>

    </div>
  );
};


export default Settings;