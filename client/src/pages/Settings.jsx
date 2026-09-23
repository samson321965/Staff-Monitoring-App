import React, { useEffect, useRef, useState } from "react";

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
  FiRefreshCw,
  FiUsers,
  FiList,
  FiHelpCircle,
  FiActivity,
  FiPlus,
  FiDownload,
  FiMail,
  FiExternalLink,
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

  const [searchTerm, setSearchTerm] = useState("");

  const [brightMode, setBrightMode] = useState(() =>
    localStorage.getItem("settings-bright-mode") === "true"
  );

  const [logoPreview, setLogoPreview] = useState(() =>
    localStorage.getItem("settings-logo") || logo
  );

  const logoInputRef = useRef(null);
  const backupInputRef = useRef(null);

  const [attendanceSettings, setAttendanceSettings] = useState(() => {
    try {
      const savedSettings = JSON.parse(
        localStorage.getItem("settings-attendance") || "null"
      );

      return {
        startTime: savedSettings?.startTime || "08:00",
        endTime: savedSettings?.endTime || "16:30",
        statuses: {
          present: savedSettings?.statuses?.present ?? true,
          late: savedSettings?.statuses?.late ?? true,
          absent: savedSettings?.statuses?.absent ?? true,
        },
      };
    } catch {
      return {
        startTime: "08:00",
        endTime: "16:30",
        statuses: { present: true, late: true, absent: true },
      };
    }
  });

  const [leaveSettings, setLeaveSettings] = useState(() => {
    try {
      const savedSettings = JSON.parse(
        localStorage.getItem("settings-leave") || "null"
      );

      return {
        annual: savedSettings?.annual ?? true,
        medical: savedSettings?.medical ?? true,
        other: savedSettings?.other ?? true,
      };
    } catch {
      return { annual: true, medical: true, other: true };
    }
  });

  const [backupMessage, setBackupMessage] = useState("");

  const [administrationView, setAdministrationView] = useState("users");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    roleId: "",
    employeeId: "",
  });

  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const savedSettings = JSON.parse(
        localStorage.getItem("settings-notifications") || "null"
      );

      return {
        system: savedSettings?.system ?? true,
        leave: savedSettings?.leave ?? true,
        attendance: savedSettings?.attendance ?? true,
      };
    } catch {
      return {
        system: true,
        leave: true,
        attendance: true,
      };
    }
  });


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

  useEffect(() => {
    localStorage.setItem("settings-bright-mode", String(brightMode));
  }, [brightMode]);

  useEffect(() => {
    localStorage.setItem(
      "settings-notifications",
      JSON.stringify(notificationSettings)
    );
  }, [notificationSettings]);

  useEffect(() => {
    localStorage.setItem(
      "settings-attendance",
      JSON.stringify(attendanceSettings)
    );
  }, [attendanceSettings]);

  useEffect(() => {
    localStorage.setItem("settings-leave", JSON.stringify(leaveSettings));
  }, [leaveSettings]);

  useEffect(() => {
    if (activeTab === "system") {
      loadAdministrationData();
    }
  }, [activeTab]);


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

  const toggleNotification = (setting) => {
    setNotificationSettings((current) => ({
      ...current,
      [setting]: !current[setting],
    }));
  };

  const updateAttendanceTime = (field, value) => {
    setAttendanceSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleAttendanceStatus = (status) => {
    setAttendanceSettings((current) => ({
      ...current,
      statuses: {
        ...current.statuses,
        [status]: !current.statuses[status],
      },
    }));
  };

  const toggleLeaveSetting = (setting) => {
    setLeaveSettings((current) => ({
      ...current,
      [setting]: !current[setting],
    }));
  };

  const createSettingsBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      generalSettings,
      workingDays,
      notificationSettings,
      attendanceSettings,
      leaveSettings,
      brightMode,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `staff-monitor-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("Settings backup downloaded.");
  };

  const restoreSettingsBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (backup.generalSettings) setGeneralSettings(backup.generalSettings);
        if (backup.workingDays) setWorkingDays(backup.workingDays);
        if (backup.notificationSettings) setNotificationSettings(backup.notificationSettings);
        if (backup.attendanceSettings) setAttendanceSettings(backup.attendanceSettings);
        if (backup.leaveSettings) setLeaveSettings(backup.leaveSettings);
        if (typeof backup.brightMode === "boolean") setBrightMode(backup.brightMode);
        setBackupMessage("Settings restored successfully.");
      } catch {
        setBackupMessage("That backup file is not valid.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const loadAdministrationData = async () => {
    try {
      setAdminLoading(true);
      const headers = getAuthHeaders();
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(buildApiUrl("/administration/users"), { headers }),
        fetch(buildApiUrl("/administration/access-control"), { headers }),
      ]);

      const usersData = await usersResponse.json();
      const rolesData = await rolesResponse.json();

      if (!usersResponse.ok) throw new Error(usersData.message || "Unable to load users.");
      if (!rolesResponse.ok) throw new Error(rolesData.message || "Unable to load access control.");

      setAdminUsers(usersData);
      setAdminRoles(rolesData);
      setNewUser((current) => ({
        ...current,
        roleId: current.roleId || String(rolesData[0]?.id || ""),
      }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to load administration data.");
    } finally {
      setAdminLoading(false);
    }
  };

  const createAdminUser = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(buildApiUrl("/administration/users"), {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unable to create user.");

      setSuccessMessage(data.message);
      setShowCreateUser(false);
      setNewUser({ username: "", email: "", password: "", roleId: String(adminRoles[0]?.id || ""), employeeId: "" });
      await loadAdministrationData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to create user.");
    }
  };

  const toggleUserStatus = async (userRecord) => {
    try {
      const response = await fetch(buildApiUrl(`/administration/users/${userRecord.id}/status`), {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !userRecord.isActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update user status.");
      await loadAdministrationData();
    } catch (error) {
      setErrorMessage(error.message || "Unable to update user status.");
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      setErrorMessage("Please choose a PNG, JPG, or other image file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const preview = String(reader.result);
      setLogoPreview(preview);
      localStorage.setItem("settings-logo", preview);
      setSuccessMessage("Logo updated successfully.");
      setErrorMessage("");
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(logo);
    localStorage.removeItem("settings-logo");
    setSuccessMessage("Logo restored to the default.");
    setErrorMessage("");
  };

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") {
      return;
    }

    const value = searchTerm.trim().toLowerCase();
    const matchingTab = [
      ["general", ["general", "organization", "display", "language"]],
      ["account", ["account", "profile", "personal"]],
      ["security", ["security", "password", "privacy"]],
      ["notifications", ["notification", "alert", "reminder"]],
      ["administration", ["administration", "system", "user"]],
      ["attendance", ["attendance", "check-in", "working"]],
      ["leave", ["leave", "holiday"]],
      ["activity", ["activity", "log", "audit"]],
    ].find(([, terms]) => terms.some((term) => value.includes(term)));

    if (matchingTab) {
      handleTabChange(matchingTab[0]);
    } else if (value) {
      setErrorMessage("No matching Settings section found.");
    }
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

    <div className={`settings-page ${brightMode ? "bright-mode" : ""}`}>

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
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                aria-label="Search settings"
              />

            </div>


            <button
              type="button"
              className="topbar-action"
              title="Notifications"
              onClick={() => handleTabChange("notifications")}
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
              onClick={() => setBrightMode((previous) => !previous)}
            >
              <FiSun />
            </button>


            <div className="topbar-divider"></div>


            <button
              type="button"
              className="settings-user-profile"
              onClick={() => handleTabChange("account")}
              title="View profile"
            >

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

            </button>

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
                              src={logoPreview}
                              alt="VEO Logo"
                              className="organization-logo"
                            />

                            <div className="logo-buttons">

                              <button
                                type="button"
                                className="change-logo-button"
                                onClick={() => logoInputRef.current?.click()}
                              >

                                <FiUpload />

                                Change Logo

                              </button>

                              <button
                                type="button"
                                className="remove-logo-button"
                                onClick={handleRemoveLogo}
                              >

                                <FiTrash2 />

                                Remove

                              </button>

                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="logo-file-input"
                                onChange={handleLogoChange}
                              />

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

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${
                        notificationSettings.system ? "enabled" : "disabled"
                      }`}
                      onClick={() => toggleNotification("system")}
                      aria-pressed={notificationSettings.system}
                    >
                      <FiBell />
                      <div>
                        <strong>
                          System Notifications
                        </strong>
                        <span>
                          {notificationSettings.system ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true">
                        <span />
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${
                        notificationSettings.leave ? "enabled" : "disabled"
                      }`}
                      onClick={() => toggleNotification("leave")}
                      aria-pressed={notificationSettings.leave}
                    >
                      <FiCalendar />
                      <div>
                        <strong>
                          Leave Notifications
                        </strong>
                        <span>
                          {notificationSettings.leave ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true">
                        <span />
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${
                        notificationSettings.attendance ? "enabled" : "disabled"
                      }`}
                      onClick={() => toggleNotification("attendance")}
                      aria-pressed={notificationSettings.attendance}
                    >
                      <FiClock />
                      <div>
                        <strong>
                          Attendance Alerts
                        </strong>
                        <span>
                          {notificationSettings.attendance ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true">
                        <span />
                      </span>
                    </button>

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

                    <label className="simple-setting-card attendance-time-card">
                      <FiClock />
                      <div>
                        <strong>
                          Work Start Time
                        </strong>
                        <span>
                          Daily check-in begins
                        </span>
                      </div>
                      <input
                        type="time"
                        value={attendanceSettings.startTime}
                        onChange={(event) => updateAttendanceTime("startTime", event.target.value)}
                        aria-label="Work Start Time"
                      />
                    </label>

                    <label className="simple-setting-card attendance-time-card">
                      <FiClock />
                      <div>
                        <strong>
                          Work End Time
                        </strong>
                        <span>
                          Daily check-out closes
                        </span>
                      </div>
                      <input
                        type="time"
                        value={attendanceSettings.endTime}
                        min={attendanceSettings.startTime}
                        onChange={(event) => updateAttendanceTime("endTime", event.target.value)}
                        aria-label="Work End Time"
                      />
                    </label>

                    <div className="simple-setting-card attendance-status-card">
                      <FiActivity />
                      <div>
                        <strong>
                          Attendance Status
                        </strong>
                        <span>
                          Choose statuses used by attendance records
                        </span>
                        <div className="attendance-status-buttons">
                          {[
                            ["present", "Present"],
                            ["late", "Late"],
                            ["absent", "Absent"],
                          ].map(([status, label]) => (
                            <button
                              key={status}
                              type="button"
                              className={attendanceSettings.statuses[status] ? "active" : ""}
                              onClick={() => toggleAttendanceStatus(status)}
                              aria-pressed={attendanceSettings.statuses[status]}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
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

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${leaveSettings.annual ? "enabled" : "disabled"}`}
                      onClick={() => toggleLeaveSetting("annual")}
                      aria-pressed={leaveSettings.annual}
                    >
                      <FiCalendar />
                      <div>
                        <strong>
                          Annual Leave
                        </strong>
                        <span>
                          {leaveSettings.annual ? "Available" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true"><span /></span>
                    </button>

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${leaveSettings.medical ? "enabled" : "disabled"}`}
                      onClick={() => toggleLeaveSetting("medical")}
                      aria-pressed={leaveSettings.medical}
                    >
                      <FiCalendar />
                      <div>
                        <strong>
                          Sick Leave
                        </strong>
                        <span>
                          {leaveSettings.medical ? "Available" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true"><span /></span>
                    </button>

                    <button
                      type="button"
                      className={`simple-setting-card notification-setting-card ${leaveSettings.other ? "enabled" : "disabled"}`}
                      onClick={() => toggleLeaveSetting("other")}
                      aria-pressed={leaveSettings.other}
                    >
                      <FiCalendar />
                      <div>
                        <strong>
                          Other Leave
                        </strong>
                        <span>
                          {leaveSettings.other ? "Available" : "Disabled"}
                        </span>
                      </div>
                      <span className="notification-toggle" aria-hidden="true"><span /></span>
                    </button>

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

                  <div className="admin-view-switcher">
                    <button
                      type="button"
                      className={administrationView === "users" ? "active" : ""}
                      onClick={() => setAdministrationView("users")}
                    >
                      <FiUsers />
                      User Management
                    </button>
                    <button
                      type="button"
                      className={administrationView === "access" ? "active" : ""}
                      onClick={() => setAdministrationView("access")}
                    >
                      <FiShield />
                      Access Control
                    </button>
                  </div>

                  {administrationView === "users" && (
                    <section className="admin-management-section">
                      <div className="admin-section-heading">
                        <div>
                          <h3>Users</h3>
                          <p>Manage administrator accounts and access status.</p>
                        </div>
                        <button type="button" className="admin-primary-button" onClick={() => setShowCreateUser((current) => !current)}>
                          <FiPlus />
                          Create User
                        </button>
                      </div>

                      {showCreateUser && (
                        <form className="admin-create-form" onSubmit={createAdminUser}>
                          <input placeholder="Username" value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} required />
                          <input type="email" placeholder="Email address" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} required />
                          <input type="password" placeholder="Temporary password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} minLength="8" required />
                          <select value={newUser.roleId} onChange={(event) => setNewUser({ ...newUser, roleId: event.target.value })} required>
                            <option value="">Select role</option>
                            {adminRoles.map((role) => <option key={role.id} value={role.id}>{role.role}</option>)}
                          </select>
                          <input placeholder="Employee ID (optional)" value={newUser.employeeId} onChange={(event) => setNewUser({ ...newUser, employeeId: event.target.value })} />
                          <button type="submit" className="admin-primary-button">Create Account</button>
                        </form>
                      )}

                      {adminLoading ? <p className="admin-muted-text">Loading users...</p> : (
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                              {adminUsers.map((userRecord) => (
                                <tr key={userRecord.id}>
                                  <td><strong>{userRecord.username}</strong><span>{userRecord.email}</span></td>
                                  <td>{userRecord.role}</td>
                                  <td><span className={`admin-status ${userRecord.isActive ? "active" : "inactive"}`}>{userRecord.isActive ? "Active" : "Disabled"}</span></td>
                                  <td><button type="button" className="admin-text-button" onClick={() => toggleUserStatus(userRecord)}>{userRecord.isActive ? "Disable" : "Enable"}</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}

                  {administrationView === "access" && (
                    <section className="admin-management-section">
                      <div className="admin-section-heading"><div><h3>Access Control</h3><p>Review permissions assigned to each system role.</p></div></div>
                      <div className="admin-role-grid">
                        {adminRoles.map((role) => (
                          <article className="admin-role-card" key={role.id}>
                            <div><FiShield /><strong>{role.role}</strong></div>
                            <p>{role.description || "Configured system role"}</p>
                            <span>{role.permissionCount} permissions</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

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

                    <div className="backup-actions">
                      <button type="button" className="admin-primary-button" onClick={createSettingsBackup}>
                        <FiDownload />
                        Download Backup
                      </button>
                      <button type="button" className="admin-view-switcher-button" onClick={() => backupInputRef.current?.click()}>
                        <FiUpload />
                        Restore Backup
                      </button>
                      <input ref={backupInputRef} type="file" accept="application/json" className="logo-file-input" onChange={restoreSettingsBackup} />
                      {backupMessage && <span className="backup-message">{backupMessage}</span>}
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

                  <div className="support-grid">
                    <button type="button" className="support-card" onClick={() => window.location.href = "mailto:it@veo.gov.vu?subject=Staff%20Monitoring%20System%20Support"}>
                      <FiMail />
                      <span><strong>Email IT Support</strong><small>Contact the VEO IT Section</small></span>
                      <FiExternalLink />
                    </button>
                    <button type="button" className="support-card" onClick={() => window.open("https://www.veo.gov.vu", "_blank", "noopener,noreferrer")}>
                      <FiExternalLink />
                      <span><strong>Open VEO Support Portal</strong><small>Visit the official support website</small></span>
                      <FiExternalLink />
                    </button>
                  </div>

                  <div className="support-faq">
                    <h3>Quick Help</h3>
                    <details><summary>How do I change my password?</summary><p>Open Security & Privacy, enter your current password, then choose a new password of at least eight characters.</p></details>
                    <details><summary>Where can I manage users?</summary><p>Open System Administration, then choose User Management or Access Control.</p></details>
                    <details><summary>How do I keep a copy of settings?</summary><p>Open Backup & Recovery and download a JSON backup of your current preferences.</p></details>
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