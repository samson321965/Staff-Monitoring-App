import React, { useEffect, useState } from "react";
import {
  FiSettings,
  FiUser,
  FiBell,
  FiShield,
  FiDatabase,
  FiGlobe,
  FiSave,
  FiRefreshCw,
  FiLock,
  FiMail,
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import Sidebar from "../components/Sidebar";
import "../styles/Settings.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Settings = () => {
  /* =====================================================
     SETTINGS STATE
     ===================================================== */

  const [activeSection, setActiveSection] = useState("general");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");


  /* =====================================================
     GENERAL SETTINGS
     ===================================================== */

  const [generalSettings, setGeneralSettings] = useState({
    systemName: "Staff Monitor",
    organization: "Vanuatu Electoral Office",
    language: "English",
    timezone: "Pacific/Efate",
    dateFormat: "DD MMM YYYY",
    timeFormat: "12-hour",
  });


  /* =====================================================
     NOTIFICATION SETTINGS
     ===================================================== */

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    attendanceAlerts: true,
    leaveAlerts: true,
    lateAlerts: true,
    systemNotifications: true,
  });


  /* =====================================================
     SECURITY SETTINGS
     ===================================================== */

  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: "30",
    passwordExpiry: "90",
    requireStrongPassword: true,
    loginNotifications: true,
    twoFactorAuthentication: false,
  });


  /* =====================================================
     ATTENDANCE SETTINGS
     ===================================================== */

  const [attendanceSettings, setAttendanceSettings] = useState({
    workStartTime: "08:00",
    workEndTime: "16:30",
    lateAfter: "08:15",
    minimumWorkingHours: "8",
    allowManualAttendance: true,
    requireCheckOut: true,
  });


  /* =====================================================
     LOAD SETTINGS FROM BACKEND
     ===================================================== */

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/settings`
      );

      if (!response.ok) {
        throw new Error("Unable to load settings.");
      }

      const data = await response.json();

      if (data.general) {
        setGeneralSettings((previous) => ({
          ...previous,
          ...data.general,
        }));
      }

      if (data.notifications) {
        setNotificationSettings((previous) => ({
          ...previous,
          ...data.notifications,
        }));
      }

      if (data.security) {
        setSecuritySettings((previous) => ({
          ...previous,
          ...data.security,
        }));
      }

      if (data.attendance) {
        setAttendanceSettings((previous) => ({
          ...previous,
          ...data.attendance,
        }));
      }
    } catch (err) {
      console.error("Settings loading error:", err);

      /*
       * The page can still work without the backend.
       * Once PostgreSQL/API is connected, this will
       * automatically load the saved settings.
       */
    } finally {
      setLoading(false);
    }
  };


  /* =====================================================
     LOAD SETTINGS WHEN PAGE OPENS
     ===================================================== */

  useEffect(() => {
    loadSettings();
  }, []);


  /* =====================================================
     UPDATE FUNCTIONS
     ===================================================== */

  const updateGeneral = (field, value) => {
    setGeneralSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const updateNotifications = (field, value) => {
    setNotificationSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const updateSecurity = (field, value) => {
    setSecuritySettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  const updateAttendance = (field, value) => {
    setAttendanceSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  };


  /* =====================================================
     SAVE SETTINGS
     ===================================================== */

  const saveSettings = async () => {
    try {
      setLoading(true);

      setMessage("");

      setError("");

      const settings = {
        general: generalSettings,
        notifications: notificationSettings,
        security: securitySettings,
        attendance: attendanceSettings,
      };

      const response = await fetch(
        `${API_URL}/settings`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(settings),
        }
      );

      /*
       * If backend is not created yet, we still show
       * the settings locally.
       */

      if (!response.ok) {
        throw new Error("Unable to save settings.");
      }

      setMessage("Settings saved successfully.");

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Settings save error:", err);

      /*
       * Temporary local success message.
       * Remove this fallback when your API is ready.
       */

      setMessage(
        "Settings updated locally. Connect the Settings API to save them permanently."
      );

      setTimeout(() => {
        setMessage("");
      }, 5000);
    } finally {
      setLoading(false);
    }
  };


  /* =====================================================
     RESET SETTINGS
     ===================================================== */

  const resetSettings = () => {
    setGeneralSettings({
      systemName: "Staff Monitor",
      organization: "Vanuatu Electoral Office",
      language: "English",
      timezone: "Pacific/Efate",
      dateFormat: "DD MMM YYYY",
      timeFormat: "12-hour",
    });

    setNotificationSettings({
      emailNotifications: true,
      attendanceAlerts: true,
      leaveAlerts: true,
      lateAlerts: true,
      systemNotifications: true,
    });

    setSecuritySettings({
      sessionTimeout: "30",
      passwordExpiry: "90",
      requireStrongPassword: true,
      loginNotifications: true,
      twoFactorAuthentication: false,
    });

    setAttendanceSettings({
      workStartTime: "08:00",
      workEndTime: "16:30",
      lateAfter: "08:15",
      minimumWorkingHours: "8",
      allowManualAttendance: true,
      requireCheckOut: true,
    });

    setMessage("Settings have been reset.");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };


  return (
    <div className="settings-page">

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <Sidebar />


      {/* =================================================
          MAIN CONTENT
          ================================================= */}

      <main className="settings-main">

        <div className="settings-content">

          {/* =================================================
              HEADER
              ================================================= */}

          <header className="settings-header">

            <div className="settings-title">

              <div className="settings-title-icon">
                <FiSettings />
              </div>

              <div>

                <h1>Settings</h1>

                <p>
                  Manage system preferences, security and attendance settings
                </p>

              </div>

            </div>


            <div className="settings-header-actions">

              <button
                className="reset-button"
                onClick={resetSettings}
              >
                <FiRefreshCw />
                Reset
              </button>


              <button
                className="save-button"
                onClick={saveSettings}
                disabled={loading}
              >

                {loading ? (
                  <>
                    <FiRefreshCw className="spin-icon" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Save Changes
                  </>
                )}

              </button>

            </div>

          </header>


          {/* =================================================
              SUCCESS MESSAGE
              ================================================= */}

          {message && (
            <div className="settings-message success">

              <FiCheckCircle />

              <span>
                {message}
              </span>

            </div>
          )}


          {/* =================================================
              ERROR MESSAGE
              ================================================= */}

          {error && (
            <div className="settings-message error">

              <FiAlertCircle />

              <span>
                {error}
              </span>

            </div>
          )}


          {/* =================================================
              SETTINGS LAYOUT
              ================================================= */}

          <div className="settings-layout">


            {/* =================================================
                SETTINGS NAVIGATION
                ================================================= */}

            <aside className="settings-navigation">

              <button
                className={
                  activeSection === "general"
                    ? "settings-nav-item active"
                    : "settings-nav-item"
                }
                onClick={() => setActiveSection("general")}
              >

                <FiGlobe />

                <div>
                  <strong>General</strong>
                  <span>System preferences</span>
                </div>

              </button>


              <button
                className={
                  activeSection === "attendance"
                    ? "settings-nav-item active"
                    : "settings-nav-item"
                }
                onClick={() => setActiveSection("attendance")}
              >

                <FiCalendar />

                <div>
                  <strong>Attendance</strong>
                  <span>Working hours & rules</span>
                </div>

              </button>


              <button
                className={
                  activeSection === "notifications"
                    ? "settings-nav-item active"
                    : "settings-nav-item"
                }
                onClick={() => setActiveSection("notifications")}
              >

                <FiBell />

                <div>
                  <strong>Notifications</strong>
                  <span>Alerts & messages</span>
                </div>

              </button>


              <button
                className={
                  activeSection === "security"
                    ? "settings-nav-item active"
                    : "settings-nav-item"
                }
                onClick={() => setActiveSection("security")}
              >

                <FiShield />

                <div>
                  <strong>Security</strong>
                  <span>Access & protection</span>
                </div>

              </button>


              <button
                className={
                  activeSection === "database"
                    ? "settings-nav-item active"
                    : "settings-nav-item"
                }
                onClick={() => setActiveSection("database")}
              >

                <FiDatabase />

                <div>
                  <strong>Database</strong>
                  <span>Database information</span>
                </div>

              </button>

            </aside>


            {/* =================================================
                SETTINGS CONTENT
                ================================================= */}

            <section className="settings-card">


              {/* =================================================
                  GENERAL SETTINGS
                  ================================================= */}

              {activeSection === "general" && (

                <div className="settings-section">

                  <div className="section-heading">

                    <div className="section-heading-icon">
                      <FiGlobe />
                    </div>

                    <div>

                      <h2>General Settings</h2>

                      <p>
                        Configure the basic information and appearance
                        of your Staff Monitoring System.
                      </p>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="settings-form-grid">


                    <div className="form-group">

                      <label>
                        System Name
                      </label>

                      <input
                        type="text"
                        value={generalSettings.systemName}
                        onChange={(e) =>
                          updateGeneral(
                            "systemName",
                            e.target.value
                          )
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Organization
                      </label>

                      <input
                        type="text"
                        value={generalSettings.organization}
                        onChange={(e) =>
                          updateGeneral(
                            "organization",
                            e.target.value
                          )
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Language
                      </label>

                      <select
                        value={generalSettings.language}
                        onChange={(e) =>
                          updateGeneral(
                            "language",
                            e.target.value
                          )
                        }
                      >

                        <option value="English">
                          English
                        </option>

                        <option value="Bislama">
                          Bislama
                        </option>

                        <option value="French">
                          French
                        </option>

                      </select>

                    </div>


                    <div className="form-group">

                      <label>
                        Time Zone
                      </label>

                      <select
                        value={generalSettings.timezone}
                        onChange={(e) =>
                          updateGeneral(
                            "timezone",
                            e.target.value
                          )
                        }
                      >

                        <option value="Pacific/Efate">
                          Pacific/Efate (Vanuatu)
                        </option>

                        <option value="Pacific/Guadalcanal">
                          Pacific/Guadalcanal
                        </option>

                        <option value="Pacific/Auckland">
                          Pacific/Auckland
                        </option>

                      </select>

                    </div>


                    <div className="form-group">

                      <label>
                        Date Format
                      </label>

                      <select
                        value={generalSettings.dateFormat}
                        onChange={(e) =>
                          updateGeneral(
                            "dateFormat",
                            e.target.value
                          )
                        }
                      >

                        <option value="DD MMM YYYY">
                          DD MMM YYYY
                        </option>

                        <option value="DD/MM/YYYY">
                          DD/MM/YYYY
                        </option>

                        <option value="MM/DD/YYYY">
                          MM/DD/YYYY
                        </option>

                        <option value="YYYY-MM-DD">
                          YYYY-MM-DD
                        </option>

                      </select>

                    </div>


                    <div className="form-group">

                      <label>
                        Time Format
                      </label>

                      <select
                        value={generalSettings.timeFormat}
                        onChange={(e) =>
                          updateGeneral(
                            "timeFormat",
                            e.target.value
                          )
                        }
                      >

                        <option value="12-hour">
                          12-hour
                        </option>

                        <option value="24-hour">
                          24-hour
                        </option>

                      </select>

                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  ATTENDANCE SETTINGS
                  ================================================= */}

              {activeSection === "attendance" && (

                <div className="settings-section">

                  <div className="section-heading">

                    <div className="section-heading-icon">
                      <FiCalendar />
                    </div>

                    <div>

                      <h2>Attendance Settings</h2>

                      <p>
                        Configure working hours and attendance rules.
                      </p>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="settings-form-grid">


                    <div className="form-group">

                      <label>
                        <FiClock />
                        Work Start Time
                      </label>

                      <input
                        type="time"
                        value={attendanceSettings.workStartTime}
                        onChange={(e) =>
                          updateAttendance(
                            "workStartTime",
                            e.target.value
                          )
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        <FiClock />
                        Work End Time
                      </label>

                      <input
                        type="time"
                        value={attendanceSettings.workEndTime}
                        onChange={(e) =>
                          updateAttendance(
                            "workEndTime",
                            e.target.value
                          )
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        <FiClock />
                        Mark Late After
                      </label>

                      <input
                        type="time"
                        value={attendanceSettings.lateAfter}
                        onChange={(e) =>
                          updateAttendance(
                            "lateAfter",
                            e.target.value
                          )
                        }
                      />

                    </div>


                    <div className="form-group">

                      <label>
                        Minimum Working Hours
                      </label>

                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={
                          attendanceSettings.minimumWorkingHours
                        }
                        onChange={(e) =>
                          updateAttendance(
                            "minimumWorkingHours",
                            e.target.value
                          )
                        }
                      />

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="toggle-list">

                    <div className="toggle-item">

                      <div>

                        <strong>
                          Allow Manual Attendance
                        </strong>

                        <span>
                          Allow administrators to manually
                          add or correct attendance records.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            attendanceSettings.allowManualAttendance
                          }
                          onChange={(e) =>
                            updateAttendance(
                              "allowManualAttendance",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Require Check Out
                        </strong>

                        <span>
                          Require employees to record their
                          check-out time.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            attendanceSettings.requireCheckOut
                          }
                          onChange={(e) =>
                            updateAttendance(
                              "requireCheckOut",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  NOTIFICATION SETTINGS
                  ================================================= */}

              {activeSection === "notifications" && (

                <div className="settings-section">

                  <div className="section-heading">

                    <div className="section-heading-icon">
                      <FiBell />
                    </div>

                    <div>

                      <h2>Notification Settings</h2>

                      <p>
                        Choose which notifications the system should send.
                      </p>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="toggle-list">

                    <div className="toggle-item">

                      <div>

                        <strong>
                          Email Notifications
                        </strong>

                        <span>
                          Receive important system notifications
                          through email.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            notificationSettings.emailNotifications
                          }
                          onChange={(e) =>
                            updateNotifications(
                              "emailNotifications",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Attendance Alerts
                        </strong>

                        <span>
                          Receive notifications about attendance
                          problems.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            notificationSettings.attendanceAlerts
                          }
                          onChange={(e) =>
                            updateNotifications(
                              "attendanceAlerts",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Leave Alerts
                        </strong>

                        <span>
                          Receive notifications when leave
                          requests are submitted.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            notificationSettings.leaveAlerts
                          }
                          onChange={(e) =>
                            updateNotifications(
                              "leaveAlerts",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Late Attendance Alerts
                        </strong>

                        <span>
                          Notify administrators when employees
                          arrive late.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            notificationSettings.lateAlerts
                          }
                          onChange={(e) =>
                            updateNotifications(
                              "lateAlerts",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          System Notifications
                        </strong>

                        <span>
                          Receive important application and
                          maintenance notifications.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            notificationSettings.systemNotifications
                          }
                          onChange={(e) =>
                            updateNotifications(
                              "systemNotifications",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  SECURITY SETTINGS
                  ================================================= */}

              {activeSection === "security" && (

                <div className="settings-section">

                  <div className="section-heading">

                    <div className="section-heading-icon">
                      <FiShield />
                    </div>

                    <div>

                      <h2>Security Settings</h2>

                      <p>
                        Manage login security and account protection.
                      </p>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="settings-form-grid">


                    <div className="form-group">

                      <label>
                        <FiLock />
                        Session Timeout
                      </label>

                      <select
                        value={
                          securitySettings.sessionTimeout
                        }
                        onChange={(e) =>
                          updateSecurity(
                            "sessionTimeout",
                            e.target.value
                          )
                        }
                      >

                        <option value="15">
                          15 minutes
                        </option>

                        <option value="30">
                          30 minutes
                        </option>

                        <option value="60">
                          1 hour
                        </option>

                        <option value="120">
                          2 hours
                        </option>

                      </select>

                    </div>


                    <div className="form-group">

                      <label>
                        Password Expiry
                      </label>

                      <select
                        value={
                          securitySettings.passwordExpiry
                        }
                        onChange={(e) =>
                          updateSecurity(
                            "passwordExpiry",
                            e.target.value
                          )
                        }
                      >

                        <option value="30">
                          30 days
                        </option>

                        <option value="60">
                          60 days
                        </option>

                        <option value="90">
                          90 days
                        </option>

                        <option value="never">
                          Never
                        </option>

                      </select>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="toggle-list">

                    <div className="toggle-item">

                      <div>

                        <strong>
                          Require Strong Password
                        </strong>

                        <span>
                          Require users to create secure passwords.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            securitySettings.requireStrongPassword
                          }
                          onChange={(e) =>
                            updateSecurity(
                              "requireStrongPassword",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Login Notifications
                        </strong>

                        <span>
                          Notify administrators about account
                          login activity.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            securitySettings.loginNotifications
                          }
                          onChange={(e) =>
                            updateSecurity(
                              "loginNotifications",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>


                    <div className="toggle-item">

                      <div>

                        <strong>
                          Two-Factor Authentication
                        </strong>

                        <span>
                          Add an additional verification step
                          when users sign in.
                        </span>

                      </div>

                      <label className="switch">

                        <input
                          type="checkbox"
                          checked={
                            securitySettings.twoFactorAuthentication
                          }
                          onChange={(e) =>
                            updateSecurity(
                              "twoFactorAuthentication",
                              e.target.checked
                            )
                          }
                        />

                        <span className="slider"></span>

                      </label>

                    </div>

                  </div>


                  <div className="security-note">

                    <FiShield />

                    <div>

                      <strong>
                        Security Recommendation
                      </strong>

                      <p>
                        We recommend enabling strong passwords,
                        login notifications and two-factor
                        authentication for administrator accounts.
                      </p>

                    </div>

                  </div>

                </div>

              )}


              {/* =================================================
                  DATABASE
                  ================================================= */}

              {activeSection === "database" && (

                <div className="settings-section">

                  <div className="section-heading">

                    <div className="section-heading-icon">
                      <FiDatabase />
                    </div>

                    <div>

                      <h2>Database</h2>

                      <p>
                        View information about the Staff Monitor
                        PostgreSQL database.
                      </p>

                    </div>

                  </div>


                  <div className="settings-divider"></div>


                  <div className="database-status">

                    <div className="database-status-icon">
                      <FiDatabase />
                    </div>

                    <div>

                      <strong>
                        PostgreSQL Database
                      </strong>

                      <span>
                        Database connection is managed by the
                        backend server.
                      </span>

                    </div>

                    <div className="connection-status">

                      <span></span>

                      Connected

                    </div>

                  </div>


                  <div className="database-info-grid">

                    <div className="database-info-card">

                      <span>
                        Database Type
                      </span>

                      <strong>
                        PostgreSQL
                      </strong>

                    </div>


                    <div className="database-info-card">

                      <span>
                        Database Name
                      </span>

                      <strong>
                        staff_monitor
                      </strong>

                    </div>


                    <div className="database-info-card">

                      <span>
                        Application
                      </span>

                      <strong>
                        Staff Monitoring System
                      </strong>

                    </div>


                    <div className="database-info-card">

                      <span>
                        API
                      </span>

                      <strong>
                        Node.js / Express
                      </strong>

                    </div>

                  </div>


                  <div className="database-warning">

                    <FiAlertCircle />

                    <div>

                      <strong>
                        Important
                      </strong>

                      <p>
                        PostgreSQL credentials should never be stored
                        directly inside React files. Keep your database
                        password and connection details inside the
                        backend environment variables.
                      </p>

                    </div>

                  </div>

                </div>

              )}

            </section>

          </div>

        </div>

      </main>

    </div>
  );
};

export default Settings;